"""Territory conflict detection and keyword niche management.

Implements the exclusivity system that prevents competing businesses
in the same area from undermining each other's rankings.
"""

from __future__ import annotations

import json
from math import asin, cos, radians, sin, sqrt
from typing import Any

import structlog
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.org import BusinessCategory, ExclusivityTier, Org
from src.models.territory import KeywordNiche, Territory, TerritoryStatus

logger = structlog.get_logger(__name__)


class TerritoryChecker:
    """Checks for territory conflicts and manages keyword niches.

    This is the core of the conflict resolution system. It ensures that:
    1. Exclusive clients don't have competing GlamAI clients in their radius
    2. Non-exclusive clients have partitioned keyword niches
    3. New clients are warned about existing clients in their area
    """

    # ── Conflict Check ────────────────────────────────────────

    async def check_conflict(
        self,
        new_org: Org,
        latitude: float,
        longitude: float,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Check if a new org would conflict with existing clients.

        Returns a conflict report with:
        - has_conflict: bool
        - conflicting_orgs: list of conflicting orgs
        - resolution: recommended action
        """
        # Get radius for this category
        radius_km = new_org.territory_radius_km

        # Find all active territories in the same city + category
        stmt = select(Territory).where(
            and_(
                Territory.city == new_org.city,
                Territory.category == new_org.category.value,
                Territory.status == TerritoryStatus.ACTIVE,
            )
        )
        result = await db.execute(stmt)
        existing_territories = result.scalars().all()

        conflicts = []
        for territory in existing_territories:
            # Get the org for this territory
            org_stmt = select(Org).where(Org.id == territory.org_id)
            org_result = await db.execute(org_stmt)
            existing_org = org_result.scalar_one_or_none()

            if not existing_org or existing_org.id == new_org.id:
                continue

            # Check if territories overlap
            if territory.contains_point(latitude, longitude):
                conflicts.append({
                    "org_id": existing_org.id,
                    "org_name": existing_org.name,
                    "exclusivity": existing_org.exclusivity.value,
                    "distance_km": self._haversine(
                        latitude, longitude,
                        territory.center_latitude, territory.center_longitude,
                    ),
                    "territory_id": territory.id,
                })

        # Determine resolution
        if not conflicts:
            return {
                "has_conflict": False,
                "conflicting_orgs": [],
                "resolution": "ok",
                "message": "No conflicts detected. Safe to onboard.",
            }

        # Check if any conflicting org is exclusive
        exclusive_conflicts = [
            c for c in conflicts
            if c["exclusivity"] == ExclusivityTier.EXCLUSIVE.value
        ]

        if exclusive_conflicts:
            return {
                "has_conflict": True,
                "conflicting_orgs": conflicts,
                "resolution": "decline",
                "message": (
                    f"Cannot onboard: exclusive client(s) exist in this area: "
                    f"{', '.join(c['org_name'] for c in exclusive_conflicts)}. "
                    f"Offer a different location or wait for exclusivity to expire."
                ),
            }

        # All conflicts are standard tier → can onboard with keyword partitioning
        return {
            "has_conflict": True,
            "conflicting_orgs": conflicts,
            "resolve_with_keyword_niches": True,
            "resolution": "partition_keywords",
            "message": (
                f"Existing non-exclusive client(s) in area: "
                f"{', '.join(c['org_name'] for c in conflicts)}. "
                f"Can onboard with keyword niche partitioning."
            ),
        }

    # ── Keyword Niche Management ──────────────────────────────

    async def assign_keyword_niches(
        self,
        org_id: str,
        territory_id: str,
        city: str,
        category: str,
        db: AsyncSession,
        *,
        exclude_territory_ids: list[str] | None = None,
        primary_count: int = 4,
    ) -> list[str]:
        """Persist keyword niches for an org; optionally avoid competitors' keywords."""
        taken: set[str] = set()
        if exclude_territory_ids:
            stmt = select(KeywordNiche).where(
                and_(
                    KeywordNiche.territory_id.in_(exclude_territory_ids),
                    KeywordNiche.status == TerritoryStatus.ACTIVE,
                )
            )
            existing = (await db.execute(stmt)).scalars().all()
            taken = {n.keyword for n in existing}

        pool = self._get_keyword_pool(category, city)
        free = [kw for kw in pool if kw not in taken] or pool
        assigned = free[: min(primary_count, len(free))]

        for keyword in assigned:
            db.add(
                KeywordNiche(
                    org_id=org_id,
                    territory_id=territory_id,
                    keyword=keyword,
                    is_primary=True,
                    status=TerritoryStatus.ACTIVE,
                )
            )

        logger.info(
            "keywords_assigned",
            org_id=org_id,
            territory_id=territory_id,
            assigned=assigned,
            excluded=len(taken),
        )
        return assigned

    async def partition_keywords(
        self,
        org_id: str,
        territory_id: str,
        city: str,
        category: str,
        db: AsyncSession,
    ) -> list[str]:
        """Assign keyword niches excluding keywords already used on this territory."""
        return await self.assign_keyword_niches(
            org_id=org_id,
            territory_id=territory_id,
            city=city,
            category=category,
            db=db,
            exclude_territory_ids=[territory_id],
        )

    async def get_competitor_niches(
        self,
        territory_id: str,
        db: AsyncSession,
    ) -> dict[str, list[str]]:
        """Get the keyword map for all clients in a territory.

        Returns: {org_id: [keywords]}
        """
        stmt = select(KeywordNiche).where(
            KeywordNiche.territory_id == territory_id
        )
        result = await db.execute(stmt)
        niches = result.scalars().all()

        niches_by_org: dict[str, list[str]] = {}
        for niche in niches:
            if niche.org_id not in niches_by_org:
                niches_by_org[niche.org_id] = []
            niches_by_org[niche.org_id].append(niche.keyword)

        return niches_by_org

    # ── Territory Release (Client Churn) ──────────────────────

    async def release_territory(
        self,
        org_id: str,
        db: AsyncSession,
    ) -> None:
        """Release territory when a client churns.

        Frees up:
        - Territory assignment
        - Keyword niches
        """
        # Release territories
        stmt = select(Territory).where(Territory.org_id == org_id)
        result = await db.execute(stmt)
        territories = result.scalars().all()

        for territory in territories:
            territory.status = TerritoryStatus.RELEASED
            territory.released_at = datetime.utcnow()
            db.add(territory)

        # Release keyword niches
        niche_stmt = select(KeywordNiche).where(KeywordNiche.org_id == org_id)
        niche_result = await db.execute(niche_stmt)
        niches = niche_result.scalars().all()

        for niche in niches:
            niche.status = TerritoryStatus.RELEASED
            db.add(niche)

        logger.info("territory_released", org_id=org_id)

    # ── Utility ────────────────────────────────────────────────

    @staticmethod
    def _haversine(
        lat1: float, lng1: float,
        lat2: float, lng2: float,
    ) -> float:
        """Calculate distance between two points in km."""
        lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
        return round(6371 * 2 * asin(sqrt(a)), 2)

    @staticmethod
    def _get_keyword_pool(category: str, city: str) -> list[str]:
        """Get the full keyword pool for a category + city."""
        from src.services.verticals import get_vertical

        vertical = get_vertical(category)
        return vertical.keyword_pool(city)


from datetime import datetime  # noqa: E402 — needed for release_territory
