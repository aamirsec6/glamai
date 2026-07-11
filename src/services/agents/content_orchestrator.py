"""Marketing content agents — GBP posts, profile, reviews, analysis."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.application.analytics import AnalyticsFacade
from src.application.gbp import GbpFacade
from src.application.reviews import ReviewsFacade
from src.models.gbp import GbpPost, GbpPostStatus, GbpProfileSnapshot
from src.models.org import Org
from src.services.gbp.image_post_generator import ImagePostGenerator
from src.services.gbp.optimizer import GbpPostGenerator
from src.services.gbp.profile_optimizer import GbpProfileOptimizer

logger = structlog.get_logger(__name__)


@dataclass
class ContentAgentResult:
    org_id: str
    org_name: str
    posts: dict[str, Any] = field(default_factory=dict)
    profile: dict[str, Any] = field(default_factory=dict)
    reviews: dict[str, Any] = field(default_factory=dict)
    analysis: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "org_id": self.org_id,
            "org_name": self.org_name,
            "posts": self.posts,
            "profile": self.profile,
            "reviews": self.reviews,
            "analysis": self.analysis,
            "errors": self.errors,
            "summary": {
                "posts_created": self.posts.get("posts_created", 0),
                "posts_scheduled": self.posts.get("posts_scheduled", 0),
                "reviews_replied": self.reviews.get("replied", 0),
                "profile_optimized": self.profile.get("status") == "ok",
                "analysis_score": (self.analysis.get("scores") or {}).get("overall"),
            },
        }


class ContentAgentsOrchestrator:
    """Run all AI content agents for one org in a single pass."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_settings()

    async def run(
        self,
        org_id: str,
        *,
        generate_posts: bool = True,
        post_count: int = 4,
        optimize_profile: bool = True,
        auto_reply_reviews: bool = True,
        include_analysis: bool = True,
        schedule_posts: bool = True,
    ) -> ContentAgentResult:
        org = await self.session.get(Org, org_id)
        if not org:
            return ContentAgentResult(org_id=org_id, org_name="", errors=["org_not_found"])

        result = ContentAgentResult(org_id=org_id, org_name=org.name)

        if generate_posts and self.settings.feature_content_generator:
            try:
                result.posts = await self._generate_posts(
                    org, post_count=post_count, schedule=schedule_posts
                )
            except Exception as e:
                logger.exception("agent_posts_failed", org_id=org_id)
                result.errors.append(f"posts: {e}")

        if optimize_profile and self.settings.feature_content_generator:
            try:
                result.profile = await self._optimize_profile(org_id)
            except Exception as e:
                logger.exception("agent_profile_failed", org_id=org_id)
                result.errors.append(f"profile: {e}")

        if auto_reply_reviews and self.settings.feature_review_engine:
            try:
                result.reviews = await self._auto_reply_reviews(org_id)
            except Exception as e:
                logger.exception("agent_reviews_failed", org_id=org_id)
                result.errors.append(f"reviews: {e}")

        if include_analysis:
            try:
                result.analysis = await self._run_analysis(org_id)
            except Exception as e:
                logger.exception("agent_analysis_failed", org_id=org_id)
                result.errors.append(f"analysis: {e}")

        logger.info(
            "content_agents_complete",
            org_id=org_id,
            posts=result.posts.get("posts_created", 0),
            reviews=result.reviews.get("replied", 0),
            errors=len(result.errors),
        )
        return result

    async def _generate_posts(
        self,
        org: Org,
        *,
        post_count: int,
        schedule: bool,
    ) -> dict[str, Any]:
        generator = GbpPostGenerator()
        image_gen = ImagePostGenerator()
        post_types = ["portfolio_showcase", "tip_educational", "testimonial", "seasonal"]
        keywords = generator._get_keywords_for_org(org)

        drafts: list[dict[str, Any]] = []
        for i in range(min(post_count, len(post_types))):
            if i == 0:
                draft = await image_gen.generate_image_post(
                    org=org,
                    post_type=post_types[i],
                    target_keyword=keywords[i % len(keywords)],
                )
            else:
                draft = await generator.generate_post(
                    org=org,
                    post_type=post_types[i],
                    target_keyword=keywords[i % len(keywords)],
                )
                draft["post_type"] = "standard"
            drafts.append(draft)

        gbp = GbpFacade(self.session)
        try:
            ingest = await gbp.ingest.ingest_generated_posts(org.id, drafts)
        finally:
            await gbp.close()

        scheduled = 0
        if schedule and ingest.get("posts_created", 0) > 0:
            scheduled = await self._schedule_new_drafts(org.id, ingest["posts_created"])

        org.guarantee_gbp_posts_delivered = (org.guarantee_gbp_posts_delivered or 0) + ingest.get(
            "posts_created", 0
        )
        self.session.add(org)

        return {
            "posts_created": ingest.get("posts_created", 0),
            "posts_scheduled": scheduled,
            "drafts": drafts,
        }

    async def _schedule_new_drafts(self, org_id: str, count: int) -> int:
        stmt = (
            select(GbpPost)
            .where(GbpPost.org_id == org_id, GbpPost.status == GbpPostStatus.DRAFT)
            .order_by(GbpPost.created_at.desc())
            .limit(count)
        )
        posts = (await self.session.execute(stmt)).scalars().all()
        now = datetime.utcnow()
        for i, post in enumerate(reversed(posts)):
            post.scheduled_at = now + timedelta(days=7 * i + 1)
            post.status = GbpPostStatus.SCHEDULED
            self.session.add(post)
        await self.session.flush()
        return len(posts)

    async def _ensure_profile_snapshot(self, org: Org) -> GbpProfileSnapshot:
        stmt = select(GbpProfileSnapshot).where(GbpProfileSnapshot.org_id == org.id)
        snapshot = (await self.session.execute(stmt)).scalar_one_or_none()
        if snapshot:
            return snapshot

        snapshot = GbpProfileSnapshot(
            org_id=org.id,
            title=org.name,
            description=org.description
            or f"{org.name} — {org.category.value.replace('_', ' ')} in {org.city}, India.",
        )
        self.session.add(snapshot)
        await self.session.flush()
        return snapshot

    async def _optimize_profile(self, org_id: str) -> dict[str, Any]:
        org = await self.session.get(Org, org_id)
        if org:
            await self._ensure_profile_snapshot(org)

        optimizer = GbpProfileOptimizer(self.session)
        try:
            return await optimizer.optimize_profile(org_id)
        finally:
            await optimizer.close()

    async def _auto_reply_reviews(self, org_id: str) -> dict[str, Any]:
        facade = ReviewsFacade(self.session)
        try:
            return await facade.auto_reply(org_id)
        finally:
            await facade.close()

    async def _run_analysis(self, org_id: str) -> dict[str, Any]:
        facade = AnalyticsFacade(self.session)
        try:
            basic = await facade.analyze_tenant(org_id, period_days=30, include_narrative=True)
            advanced = await facade.get_advanced_insights(org_id, period_days=30)
            return {**basic, "advanced": advanced}
        finally:
            await facade.close()
