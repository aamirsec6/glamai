"""GBP data sync — insights, competitors, reviews, and post publishing."""

from __future__ import annotations

from datetime import datetime, timedelta
from math import asin, cos, radians, sin, sqrt
from typing import Any

import structlog
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.gbp import GbpCompetitor, GbpInsights, GbpPost, GbpPostStatus
from src.models.org import Org
from src.services.gbp.client import GbpClient
from src.services.gbp.token_manager import GbpTokenManager

logger = structlog.get_logger(__name__)

# Google Places types per GlamAI business category
CATEGORY_PLACES_TYPES: dict[str, list[str]] = {
    "interior_design": ["interior_designer"],
    "architect": ["architect"],
    "dentist": ["dentist"],
    "salon": ["beauty_salon", "hair_salon"],
    "gym": ["gym", "fitness_center"],
    "photographer": ["photographer"],
    "restaurant": ["restaurant"],
    "other": ["establishment"],
}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return round(r * 2 * asin(sqrt(a)), 2)


def _location_resource(org: Org) -> str | None:
    """Resolve GBP location resource name for API calls."""
    if not org.gbp_place_id:
        return None
    if "/" in org.gbp_place_id:
        return org.gbp_place_id
    return f"locations/{org.gbp_place_id}"


class GbpSyncService:
    """Orchestrates GBP data pulls and writes for one org."""

    def __init__(self, session: AsyncSession):
        self.session = session
        settings = get_settings()
        self.settings = settings
        self.token_mgr = GbpTokenManager(session)
        self.client = self.token_mgr.client

    async def close(self) -> None:
        await self.token_mgr.close()

    async def sync_all(self, org_id: str) -> dict[str, Any]:
        """Run full GBP sync: insights, reviews snapshot, competitors."""
        results: dict[str, Any] = {"org_id": org_id}
        results["insights"] = await self.sync_insights(org_id)
        results["competitors"] = await self.sync_competitors(org_id)
        return results

    async def sync_insights(self, org_id: str, days: int = 30) -> dict[str, Any]:
        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        location = _location_resource(org)
        access = await self.token_mgr.get_valid_access_token(org_id)
        if not access or not location:
            return {"status": "not_connected"}

        period_end = datetime.utcnow()
        period_start = period_end - timedelta(days=days)

        try:
            raw = await self.client.get_insights(access, location, days=days)
            insight = GbpInsights(
                org_id=org_id,
                period_start=period_start,
                period_end=period_end,
                recorded_at=datetime.utcnow(),
            )

            metrics = raw.get("locationMetrics", [{}])
            if metrics:
                for m in metrics[0].get("metricValues", []):
                    metric = m.get("metric", "")
                    val = int(m.get("totalValue", {}).get("value", 0))
                    if metric == "VIEWS_SEARCH":
                        insight.search_views = val
                    elif metric == "VIEWS_MAPS":
                        insight.maps_views = val
                    elif metric == "ACTIONS_WEBSITE":
                        insight.website_clicks = val
                    elif metric == "ACTIONS_PHONE":
                        insight.calls = val
                    elif metric == "ACTIONS_DIRECTIONS":
                        insight.direction_requests = val
                    elif metric == "PHOTOS_VIEWS":
                        insight.photo_views = val

            insight.total_views = insight.search_views + insight.maps_views

            # Enrich with review stats when available
            try:
                reviews = await self.client.list_reviews(access, location)
                if reviews:
                    ratings = [
                        r.get("starRating", "").replace("STAR_RATING_", "")
                        for r in reviews
                        if r.get("starRating")
                    ]
                    numeric = []
                    rating_map = {
                        "ONE": 1,
                        "TWO": 2,
                        "THREE": 3,
                        "FOUR": 4,
                        "FIVE": 5,
                    }
                    for r in reviews:
                        star = r.get("starRating", "")
                        if star in rating_map:
                            numeric.append(rating_map[star])
                    insight.review_count = len(reviews)
                    if numeric:
                        insight.avg_rating = round(sum(numeric) / len(numeric), 1)
            except Exception as e:
                logger.warning("gbp_reviews_fetch_skipped", org_id=org_id, error=str(e))

            self.session.add(insight)
            org.gbp_last_synced_at = datetime.utcnow()
            org.updated_at = datetime.utcnow()
            self.session.add(org)
            await self.session.flush()

            logger.info("gbp_insights_synced", org_id=org_id)
            return {"status": "ok", "insights_id": insight.id}
        except Exception as e:
            logger.error("gbp_insights_sync_failed", org_id=org_id, error=str(e))
            return {"status": "error", "error": str(e)}

    async def sync_competitors(self, org_id: str, radius_meters: int = 5000) -> dict[str, Any]:
        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        if org.latitude is None or org.longitude is None:
            return {"status": "missing_coordinates"}

        places_key = self.settings.google_places_api_key
        if not places_key:
            return {"status": "places_api_key_missing"}

        category = org.category.value if hasattr(org.category, "value") else str(org.category)
        place_types = CATEGORY_PLACES_TYPES.get(category, CATEGORY_PLACES_TYPES["other"])

        try:
            places = await self.client.search_competitors(
                place_api_key=places_key,
                query=f"{category} in {org.city}",
                latitude=org.latitude,
                longitude=org.longitude,
                radius_meters=radius_meters,
                included_types=place_types,
            )

            # Replace stale competitor rows on each sync
            await self.session.execute(
                delete(GbpCompetitor).where(GbpCompetitor.org_id == org_id)
            )

            synced = 0
            for place in places[:15]:
                display = place.get("displayName", {})
                name = display.get("text") if isinstance(display, dict) else str(display)
                if not name:
                    continue

                lat = place.get("location", {}).get("latitude")
                lng = place.get("location", {}).get("longitude")
                distance = None
                if lat is not None and lng is not None:
                    distance = _haversine_km(org.latitude, org.longitude, lat, lng)

                competitor = GbpCompetitor(
                    org_id=org_id,
                    name=name,
                    gbp_place_id=place.get("id"),
                    category=category,
                    city=org.city,
                    latitude=lat,
                    longitude=lng,
                    distance_km=distance,
                    review_count=place.get("userRatingCount"),
                    avg_rating=place.get("rating"),
                    last_checked_at=datetime.utcnow(),
                )
                self.session.add(competitor)
                synced += 1

            org.gbp_last_synced_at = datetime.utcnow()
            self.session.add(org)
            await self.session.flush()

            logger.info("gbp_competitors_synced", org_id=org_id, count=synced)
            return {"status": "ok", "count": synced}
        except Exception as e:
            logger.error("gbp_competitors_sync_failed", org_id=org_id, error=str(e))
            return {"status": "error", "error": str(e)}

    async def publish_post(self, post_id: str) -> dict[str, Any]:
        post = await self.session.get(GbpPost, post_id)
        if not post:
            return {"status": "post_not_found"}

        org = await self.session.get(Org, post.org_id)
        if not org:
            return {"status": "org_not_found"}

        location = _location_resource(org)
        access = await self.token_mgr.get_valid_access_token(post.org_id)
        if not access or not location:
            post.status = GbpPostStatus.FAILED
            self.session.add(post)
            await self.session.flush()
            return {"status": "not_connected"}

        try:
            result = await self.client.create_post(
                access_token=access,
                location_name=location,
                content=post.content,
                call_to_action=post.call_to_action,
                media_url=post.image_url,
            )
            now = datetime.utcnow()
            post.status = GbpPostStatus.PUBLISHED
            post.published_at = now
            post.google_post_id = result.get("name", "")
            post.updated_at = now
            self.session.add(post)
            await self.session.flush()

            logger.info("gbp_post_published", org_id=post.org_id, post_id=post.id)
            return {"status": "ok", "post_id": post.id, "google_post_id": post.google_post_id}
        except Exception as e:
            post.status = GbpPostStatus.FAILED
            post.updated_at = datetime.utcnow()
            self.session.add(post)
            await self.session.flush()
            logger.error("gbp_post_publish_failed", org_id=post.org_id, error=str(e))
            return {"status": "error", "error": str(e)}
