"""Geo-local agent — geocode, competitors, keyword niche assignment."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.gbp import GbpFacade
from src.core.config import get_settings
from src.integrations.base import ConnectorResource
from src.integrations.google_places import GooglePlacesConnector
from src.models.gbp import GbpCompetitor
from src.models.org import Org
from src.models.territory import KeywordNiche, Territory, TerritoryStatus
from src.services.territory.checker import TerritoryChecker
from src.services.verticals import get_vertical

logger = structlog.get_logger(__name__)


@dataclass
class GeoBrief:
    org_id: str
    city: str
    category: str
    coordinates_ok: bool = False
    competitors_synced: int = 0
    keywords_assigned: list[str] = field(default_factory=list)
    opportunities: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "org_id": self.org_id,
            "city": self.city,
            "category": self.category,
            "coordinates_ok": self.coordinates_ok,
            "competitors_synced": self.competitors_synced,
            "keywords_assigned": self.keywords_assigned,
            "opportunities": self.opportunities,
            "errors": self.errors,
            "priority_keywords": self.keywords_assigned[:4],
        }


class GeoLocalService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.territory = TerritoryChecker()
        self.gbp = GbpFacade(session)
        self.settings = get_settings()

    async def close(self) -> None:
        await self.gbp.close()

    async def run(self, org_id: str) -> GeoBrief:
        org = await self.session.get(Org, org_id)
        if not org:
            return GeoBrief(org_id=org_id, city="", category="", errors=["org_not_found"])

        brief = GeoBrief(
            org_id=org_id,
            city=org.city or "Bangalore",
            category=org.category.value,
        )

        await self._ensure_coordinates(org, brief)
        await self._sync_competitors(org_id, brief)
        await self._assign_keyword_niches(org, brief)
        await self._load_opportunities(org_id, brief)
        return brief

    async def _ensure_coordinates(self, org: Org, brief: GeoBrief) -> None:
        if org.latitude is not None and org.longitude is not None:
            brief.coordinates_ok = True
            return

        places = GooglePlacesConnector(self.session)
        try:
            pull = await places.pull(org.id, ConnectorResource.GEOCODE, address=org.address)
            if pull.ok and pull.data.get("latitude") is not None:
                org.latitude = pull.data["latitude"]
                org.longitude = pull.data["longitude"]
                self.session.add(org)
                await self.session.flush()
                brief.coordinates_ok = True
            else:
                brief.errors.append("geocode_failed")
        except Exception as e:
            brief.errors.append(f"geocode: {e}")
        finally:
            await places.close()

    async def _sync_competitors(self, org_id: str, brief: GeoBrief) -> None:
        try:
            result = await self.gbp.sync(org_id, resources=["competitors"])
            comp = result.get("competitors")
            if isinstance(comp, dict):
                brief.competitors_synced = len(comp.get("ingested", []))
        except Exception as e:
            brief.errors.append(f"competitor_sync: {e}")

    async def _ensure_territory(self, org: Org) -> Territory | None:
        territory = (
            await self.session.execute(
                select(Territory).where(
                    Territory.org_id == org.id,
                    Territory.status == TerritoryStatus.ACTIVE,
                )
            )
        ).scalar_one_or_none()

        if territory:
            return territory

        if org.latitude is None or org.longitude is None:
            return None

        radius = self.settings.get_territory_radius(org.category.value)
        territory = Territory(
            org_id=org.id,
            center_latitude=org.latitude,
            center_longitude=org.longitude,
            radius_km=radius,
            city=org.city or "Bangalore",
            category=org.category.value,
            status=TerritoryStatus.ACTIVE,
        )
        self.session.add(territory)
        await self.session.flush()
        return territory

    async def _assign_keyword_niches(self, org: Org, brief: GeoBrief) -> None:
        existing = (
            await self.session.execute(
                select(KeywordNiche).where(
                    KeywordNiche.org_id == org.id,
                    KeywordNiche.status == TerritoryStatus.ACTIVE,
                )
            )
        ).scalars().all()

        if existing:
            brief.keywords_assigned = [n.keyword for n in existing]
            return

        territory = await self._ensure_territory(org)
        if not territory:
            vertical = get_vertical(org.category.value)
            brief.keywords_assigned = vertical.keyword_pool(org.city or "Bangalore")[:8]
            brief.errors.append("no_territory_for_niches")
            return

        assigned = await self.territory.partition_keywords(
            org.id,
            territory.id,
            org.city or "Bangalore",
            org.category.value,
            self.session,
        )
        if assigned:
            brief.keywords_assigned = assigned
            return

        vertical = get_vertical(org.category.value)
        keywords = vertical.keyword_pool(org.city or "Bangalore")[:8]
        for i, kw in enumerate(keywords):
            niche = KeywordNiche(
                id=str(uuid4()),
                org_id=org.id,
                territory_id=territory.id,
                keyword=kw,
                is_primary=i < 4,
                status=TerritoryStatus.ACTIVE,
            )
            self.session.add(niche)
        await self.session.flush()
        brief.keywords_assigned = keywords

    async def _load_opportunities(self, org_id: str, brief: GeoBrief) -> None:
        competitors = (
            await self.session.execute(
                select(GbpCompetitor).where(GbpCompetitor.org_id == org_id)
            )
        ).scalars().all()

        for comp in competitors[:5]:
            brief.opportunities.append({
                "type": "competitor",
                "name": comp.name,
                "rating": comp.avg_rating,
                "reviews": comp.review_count,
                "distance_km": comp.distance_km,
                "recommendation": (
                    f"Outrank {comp.name} with more reviews and targeted posts"
                    if comp.review_count and comp.review_count > 20
                    else "Weak competitor nearby — target shared keywords"
                ),
            })
