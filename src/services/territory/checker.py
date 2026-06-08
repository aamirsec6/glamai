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

    async def partition_keywords(
        self,
        org_id: str,
        territory_id: str,
        city: str,
        category: str,
        db: AsyncSession,
    ) -> list[str]:
        """Assign keyword niches to a new org within a territory.

        When multiple non-exclusive clients exist in the same area,
        this partitions the keyword space so each client targets
        different search terms:
        - Client A: "best interior designer Bangalore" + "3BHK interior"
        - Client B: "modular kitchen Bangalore" + "office interior"
        - Client C: "luxury interior design" + "villa interior"

        Returns list of assigned keywords.
        """
        # 1. Find all keyword niches already assigned in this territory
        stmt = select(KeywordNiche).where(
            and_(
                KeywordNiche.territory_id == territory_id,
                KeywordNiche.status == TerritoryStatus.ACTIVE,
            )
        )
        result = await db.execute(stmt)
        existing_niches = result.scalars().all()

        assigned_keywords = {n.keyword for n in existing_niches}

        # 2. Get the full keyword pool for this category
        available_keywords = self._get_keyword_pool(category, city)

        # 3. Filter out already-assigned keywords
        free_keywords = [kw for kw in available_keywords if kw not in assigned_keywords]

        if not free_keywords:
            logger.warning(
                "no_free_keywords",
                org_id=org_id,
                territory_id=territory_id,
            )
            return []

        # 4. Assign up to 4 primary keywords to the new org
        # (clients should focus on a few keywords, not spread thin)
        primary_count = min(4, len(free_keywords))
        assigned = free_keywords[:primary_count]

        # 5. Save to DB
        for keyword in assigned:
            niche = KeywordNiche(
                org_id=org_id,
                territory_id=territory_id,
                keyword=keyword,
                is_primary=True,
                status=TerritoryStatus.ACTIVE,
            )
            db.add(niche)

        logger.info(
            "keywords_partitioned",
            org_id=org_id,
            assigned=assigned,
            existing_clients=len(existing_niches),
        )

        return assigned

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
        city_lower = city.lower()

        pools = {
            "interior_design": [
                f"interior designer in {city_lower}",
                f"best interior designer {city_lower}",
                f"interior design company {city_lower}",
                f"home interior design {city_lower}",
                f"modular kitchen design {city_lower}",
                f"wardrobe design {city_lower}",
                f"3bhk interior design",
                f"2bhk interior design",
                f"office interior design {city_lower}",
                f"home renovation {city_lower}",
                f"luxury interior design {city_lower}",
                f"affordable interior designer {city_lower}",
                f"villa interior design",
                f"apartment interior design {city_lower}",
                f"modern interior designer",
                f"contemporary interior design",
                f"false ceiling design {city_lower}",
                f"pooja room design",
                f"kids room design",
            ],
            "dentist": [
                f"dentist in {city_lower}",
                f"best dentist {city_lower}",
                f"dental clinic {city_lower}",
                f"dental implants {city_lower}",
                f"root canal treatment {city_lower}",
                f"braces treatment {city_lower}",
                f"cosmetic dentistry {city_lower}",
                f"kids dentist {city_lower}",
                f"teeth whitening {city_lower}",
                f"orthodontist {city_lower}",
            ],
            "salon": [
                f"salon in {city_lower}",
                f"beauty salon {city_lower}",
                f"hair salon {city_lower}",
                f"bridal makeup {city_lower}",
                f"hair spa {city_lower}",
                f"facial treatment {city_lower}",
                f"nail salon {city_lower}",
                f"best salon {city_lower}",
                f"mens salon {city_lower}",
                f"salon near me",
            ],
        }

        return pools.get(category, [f"business in {city_lower}"])


from datetime import datetime  # noqa: E402 — needed for release_territory
