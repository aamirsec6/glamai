"""Google Places connector."""

from __future__ import annotations

from math import asin, cos, radians, sin, sqrt
from typing import Any

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.integrations.base import (
    ConnectorHealth,
    ConnectorProvider,
    ConnectorResource,
    ConnectorStatus,
    PullResult,
    PushResult,
)
from src.models.org import Org
from src.services.gbp.client import GbpClient

logger = structlog.get_logger(__name__)


def _category_places_types() -> dict[str, list[str]]:
    from src.services.verticals.registry import all_places_types

    return all_places_types()


CATEGORY_PLACES_TYPES: dict[str, list[str]] = _category_places_types()


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return round(r * 2 * asin(sqrt(a)), 2)


class GooglePlacesConnector:
    provider = ConnectorProvider.GOOGLE_PLACES

    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_settings()
        self._client = GbpClient(
            client_id=self.settings.google_client_id,
            client_secret=self.settings.google_client_secret,
            redirect_uri=self.settings.google_redirect_uri,
        )
        self._http = httpx.AsyncClient(timeout=30.0)

    async def close(self) -> None:
        await self._client.close()
        await self._http.aclose()

    async def health(self, org_id: str | None = None) -> ConnectorHealth:
        if not self.settings.google_places_api_key:
            return ConnectorHealth(
                provider=self.provider,
                status=ConnectorStatus.NOT_CONFIGURED,
                message="GOOGLE_PLACES_API_KEY missing",
            )
        return ConnectorHealth(
            provider=self.provider,
            status=ConnectorStatus.READY,
            message="Places API key configured",
        )

    async def pull(
        self,
        org_id: str,
        resource: ConnectorResource,
        **opts: Any,
    ) -> PullResult:
        if resource == ConnectorResource.COMPETITORS:
            return await self._pull_competitors(org_id, **opts)
        if resource == ConnectorResource.GEOCODE:
            return await self._pull_geocode(org_id, **opts)
        return PullResult(
            self.provider, resource, org_id, False, error=f"unsupported_resource:{resource}"
        )

    async def _pull_competitors(self, org_id: str, **opts: Any) -> PullResult:
        org = await self.session.get(Org, org_id)
        if not org:
            return PullResult(self.provider, ConnectorResource.COMPETITORS, org_id, False, error="org_not_found")
        if org.latitude is None or org.longitude is None:
            return PullResult(
                self.provider, ConnectorResource.COMPETITORS, org_id, False, error="missing_coordinates"
            )

        category = org.category.value if hasattr(org.category, "value") else str(org.category)
        place_types = CATEGORY_PLACES_TYPES.get(category, CATEGORY_PLACES_TYPES["other"])
        radius = int(opts.get("radius_meters", 5000))

        try:
            places = await self._client.search_competitors(
                place_api_key=self.settings.google_places_api_key,
                query=f"{category} in {org.city}",
                latitude=org.latitude,
                longitude=org.longitude,
                radius_meters=radius,
                included_types=place_types,
            )
            competitors = []
            for place in places[:15]:
                display = place.get("displayName", {})
                name = display.get("text") if isinstance(display, dict) else str(display)
                if not name:
                    continue
                lat = place.get("location", {}).get("latitude")
                lng = place.get("location", {}).get("longitude")
                distance = None
                if lat is not None and lng is not None:
                    distance = haversine_km(org.latitude, org.longitude, lat, lng)
                competitors.append(
                    {
                        "name": name,
                        "gbp_place_id": place.get("id"),
                        "category": category,
                        "city": org.city,
                        "latitude": lat,
                        "longitude": lng,
                        "distance_km": distance,
                        "review_count": place.get("userRatingCount"),
                        "avg_rating": place.get("rating"),
                    }
                )
            return PullResult(
                self.provider,
                ConnectorResource.COMPETITORS,
                org_id,
                True,
                data={"competitors": competitors},
            )
        except Exception as e:
            logger.error("places_competitors_failed", org_id=org_id, error=str(e))
            return PullResult(
                self.provider, ConnectorResource.COMPETITORS, org_id, False, error=str(e)
            )

    async def _pull_geocode(self, org_id: str, **opts: Any) -> PullResult:
        address = opts.get("address")
        if not address:
            org = await self.session.get(Org, org_id)
            address = org.address if org else None
        if not address:
            return PullResult(
                self.provider, ConnectorResource.GEOCODE, org_id, False, error="address_required"
            )

        try:
            response = await self._http.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={
                    "address": address,
                    "key": self.settings.google_places_api_key,
                },
            )
            response.raise_for_status()
            body = response.json()
            results = body.get("results", [])
            if not results:
                return PullResult(
                    self.provider, ConnectorResource.GEOCODE, org_id, False, error="no_results"
                )
            loc = results[0]["geometry"]["location"]
            return PullResult(
                self.provider,
                ConnectorResource.GEOCODE,
                org_id,
                True,
                data={
                    "latitude": loc["lat"],
                    "longitude": loc["lng"],
                    "formatted_address": results[0].get("formatted_address"),
                },
            )
        except Exception as e:
            return PullResult(
                self.provider, ConnectorResource.GEOCODE, org_id, False, error=str(e)
            )

    async def push(
        self,
        org_id: str,
        resource: ConnectorResource,
        payload: dict[str, Any],
    ) -> PushResult:
        return PushResult(
            self.provider, resource, org_id, False, error="places_connector_is_read_only"
        )
