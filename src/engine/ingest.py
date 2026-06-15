"""Persist connector pull results into tenant models."""

from __future__ import annotations

from datetime import datetime
from typing import Any

import structlog
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.connectors.base import ConnectorProvider, ConnectorResource, PullResult, PushResult
from src.models.gbp import GbpCompetitor, GbpInsights, GbpPost, GbpPostStatus, GbpPostType, GbpProfileSnapshot
from src.models.org import Org
from src.models.review import GbpReview, ReviewReplyStatus

logger = structlog.get_logger(__name__)

RATING_MAP = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}


class IngestEngine:
    """Maps normalized connector payloads to DB rows."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def ingest_pull(self, result: PullResult) -> dict[str, Any]:
        if not result.ok:
            return {"status": "skipped", "error": result.error}

        if result.provider == ConnectorProvider.GOOGLE_GBP:
            if result.resource == ConnectorResource.INSIGHTS:
                return await self._ingest_insights(result)
            if result.resource == ConnectorResource.REVIEWS:
                return await self._ingest_reviews(result)
            if result.resource == ConnectorResource.LOCATIONS:
                return await self._ingest_profile_from_locations(result)
        if result.provider == ConnectorProvider.GOOGLE_PLACES:
            if result.resource == ConnectorResource.COMPETITORS:
                return await self._ingest_competitors(result)

        return {"status": "unsupported", "resource": result.resource.value}

    async def ingest_push_post(
        self,
        org_id: str,
        post_id: str,
        push: PushResult,
    ) -> dict[str, Any]:
        post = await self.session.get(GbpPost, post_id)
        if not post:
            return {"status": "post_not_found"}

        if push.ok:
            post.status = GbpPostStatus.PUBLISHED
            post.published_at = datetime.utcnow()
            post.google_post_id = push.data.get("google_post_id", "")
            post.updated_at = datetime.utcnow()
        else:
            post.status = GbpPostStatus.FAILED
            post.updated_at = datetime.utcnow()

        self.session.add(post)
        await self.session.flush()
        return {
            "status": "ok" if push.ok else "error",
            "post_id": post_id,
            "error": push.error,
        }

    async def ingest_generated_posts(
        self,
        org_id: str,
        posts: list[dict[str, Any]],
    ) -> dict[str, Any]:
        from src.models.gbp import GbpPostType

        created = 0
        for p in posts:
            post_type_key = p.get("post_type", "standard")
            try:
                post_type = GbpPostType(post_type_key)
            except ValueError:
                post_type = GbpPostType.STANDARD
            self.session.add(
                GbpPost(
                    org_id=org_id,
                    title=p.get("title"),
                    content=p.get("content", ""),
                    post_type=post_type,
                    keyword_target=p.get("keyword_target"),
                    status=GbpPostStatus.DRAFT,
                    ai_generated=True,
                )
            )
            created += 1
        await self.session.flush()
        return {"status": "ok", "posts_created": created}

    async def _ingest_insights(self, result: PullResult) -> dict[str, Any]:
        org_id = result.org_id
        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        raw = result.data.get("raw_insights", {})
        reviews = result.data.get("reviews", [])
        period_start = datetime.fromisoformat(result.data["period_start"])
        period_end = datetime.fromisoformat(result.data["period_end"])

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

        rating_map = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}
        numeric = []
        for r in reviews:
            star = r.get("starRating", "")
            if star in rating_map:
                numeric.append(rating_map[star])
        if reviews:
            insight.review_count = len(reviews)
            if numeric:
                insight.avg_rating = round(sum(numeric) / len(numeric), 1)

        self.session.add(insight)
        org.gbp_last_synced_at = datetime.utcnow()
        org.updated_at = datetime.utcnow()
        self.session.add(org)
        await self.session.flush()

        logger.info("ingest_insights", org_id=org_id, insights_id=insight.id)
        return {"status": "ok", "insights_id": insight.id}

    async def _ingest_competitors(self, result: PullResult) -> dict[str, Any]:
        org_id = result.org_id
        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        await self.session.execute(
            delete(GbpCompetitor).where(GbpCompetitor.org_id == org_id)
        )

        count = 0
        for c in result.data.get("competitors", []):
            self.session.add(
                GbpCompetitor(
                    org_id=org_id,
                    name=c["name"],
                    gbp_place_id=c.get("gbp_place_id"),
                    category=c.get("category", ""),
                    city=c.get("city", org.city),
                    latitude=c.get("latitude"),
                    longitude=c.get("longitude"),
                    distance_km=c.get("distance_km"),
                    review_count=c.get("review_count"),
                    avg_rating=c.get("avg_rating"),
                    last_checked_at=datetime.utcnow(),
                )
            )
            count += 1

        org.gbp_last_synced_at = datetime.utcnow()
        self.session.add(org)
        await self.session.flush()

        logger.info("ingest_competitors", org_id=org_id, count=count)
        return {"status": "ok", "count": count}

    async def _ingest_reviews(self, result: PullResult) -> dict[str, Any]:
        org_id = result.org_id
        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        reviews = result.data.get("reviews", [])
        created = 0
        updated = 0

        for raw in reviews:
            google_id = raw.get("name") or raw.get("reviewId", "")
            if not google_id:
                continue

            from sqlalchemy import select

            stmt = select(GbpReview).where(
                GbpReview.org_id == org_id,
                GbpReview.google_review_id == google_id,
            )
            existing = (await self.session.execute(stmt)).scalar_one_or_none()

            star = RATING_MAP.get(raw.get("starRating", ""), 0)
            comment = raw.get("comment")
            reviewer = raw.get("reviewer", {})
            reviewer_name = reviewer.get("displayName") if isinstance(reviewer, dict) else None
            create_time = raw.get("createTime") or raw.get("updateTime")
            review_at = None
            if create_time:
                try:
                    review_at = datetime.fromisoformat(create_time.replace("Z", "+00:00")).replace(tzinfo=None)
                except ValueError:
                    review_at = None

            if existing:
                existing.comment = comment or existing.comment
                existing.star_rating = star or existing.star_rating
                existing.updated_at = datetime.utcnow()
                updated += 1
            else:
                self.session.add(
                    GbpReview(
                        org_id=org_id,
                        google_review_id=google_id,
                        reviewer_name=reviewer_name,
                        star_rating=star,
                        comment=comment,
                        reply_status=ReviewReplyStatus.PENDING,
                        review_created_at=review_at,
                    )
                )
                created += 1

        await self.session.flush()
        logger.info("ingest_reviews", org_id=org_id, created=created, updated=updated)
        return {"status": "ok", "created": created, "updated": updated}

    async def _ingest_profile_from_locations(self, result: PullResult) -> dict[str, Any]:
        org_id = result.org_id
        locations = result.data.get("locations", [])
        if not locations:
            return {"status": "no_locations"}

        loc = locations[0]
        from sqlalchemy import select

        stmt = select(GbpProfileSnapshot).where(GbpProfileSnapshot.org_id == org_id)
        snapshot = (await self.session.execute(stmt)).scalar_one_or_none()
        if not snapshot:
            snapshot = GbpProfileSnapshot(org_id=org_id)

        snapshot.title = loc.get("title") or loc.get("locationName")
        snapshot.description = loc.get("profile", {}).get("description") or loc.get("description")
        snapshot.synced_at = datetime.utcnow()
        snapshot.updated_at = datetime.utcnow()
        self.session.add(snapshot)
        await self.session.flush()
        return {"status": "ok", "profile_id": snapshot.id}
