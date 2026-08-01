"""Marketing content agents — GBP posts, profile, reviews, analysis."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.analytics import AnalyticsFacade
from src.application.gbp import GbpFacade
from src.application.reviews import ReviewsFacade
from src.core.config import get_settings
from src.models.gbp import GbpPost, GbpPostStatus, GbpProfileSnapshot
from src.models.lead import Lead, LeadStatus
from src.models.org import Org
from src.models.review import ReviewRequest
from src.services.gbp.image_post_generator import ImagePostGenerator
from src.services.gbp.optimizer import GbpPostGenerator
from src.services.gbp.profile_optimizer import GbpProfileOptimizer
from src.services.seo.keyword_planner import KeywordPlanner

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
                "keywords_used": self.posts.get("keywords_used", []),
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
        priority_keywords: list[str] | None = None,
        seo_actions: list[dict[str, Any]] | None = None,
    ) -> ContentAgentResult:
        org = await self.session.get(Org, org_id)
        if not org:
            return ContentAgentResult(org_id=org_id, org_name="", errors=["org_not_found"])

        result = ContentAgentResult(org_id=org_id, org_name=org.name)

        keywords = await self._resolve_keywords(org_id, priority_keywords)

        if generate_posts and self.settings.feature_content_generator:
            try:
                async with self.session.begin_nested():
                    result.posts = await self._generate_posts(
                        org,
                        post_count=post_count,
                        schedule=schedule_posts,
                        keywords=keywords,
                        seo_actions=seo_actions or [],
                    )
            except Exception as e:
                logger.exception("agent_posts_failed", org_id=org_id)
                result.errors.append(f"posts: {e}")

        if optimize_profile and self.settings.feature_content_generator:
            try:
                async with self.session.begin_nested():
                    result.profile = await self._optimize_profile(org_id)
            except Exception as e:
                logger.exception("agent_profile_failed", org_id=org_id)
                result.errors.append(f"profile: {e}")

        if auto_reply_reviews and self.settings.feature_review_engine:
            try:
                async with self.session.begin_nested():
                    result.reviews = await self._auto_reply_reviews(org_id)
            except Exception as e:
                logger.exception("agent_reviews_failed", org_id=org_id)
                result.errors.append(f"reviews: {e}")

        if include_analysis:
            try:
                async with self.session.begin_nested():
                    result.analysis = await self._run_analysis(org_id)
            except Exception as e:
                logger.exception("agent_analysis_failed", org_id=org_id)
                result.errors.append(f"analysis: {e}")

        logger.info(
            "content_agents_complete",
            org_id=org_id,
            posts=result.posts.get("posts_created", 0),
            reviews=result.reviews.get("replied", 0),
            keywords=keywords[:4],
            errors=len(result.errors),
        )
        return result

    async def _resolve_keywords(
        self,
        org_id: str,
        priority_keywords: list[str] | None,
    ) -> list[str]:
        if priority_keywords:
            cleaned = [k for k in priority_keywords if k]
            if cleaned:
                return list(dict.fromkeys(cleaned))[:8]

        planner = KeywordPlanner(self.session)
        niche = await planner.get_tracked_keywords(org_id, limit=8)
        if niche:
            return niche

        org = await self.session.get(Org, org_id)
        if not org:
            return []
        return GbpPostGenerator()._get_keywords_for_org(org)

    async def _generate_posts(
        self,
        org: Org,
        *,
        post_count: int,
        schedule: bool,
        keywords: list[str],
        seo_actions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        generator = GbpPostGenerator()
        image_gen = ImagePostGenerator()
        post_types = ["portfolio_showcase", "tip_educational", "testimonial", "seasonal"]

        # Bias first slots toward SEO-targeted keywords
        seo_kw = [
            str(a["keyword"])
            for a in seo_actions
            if a.get("type") == "targeted_post" and a.get("keyword")
        ]
        ordered = list(dict.fromkeys([*seo_kw, *keywords])) or generator._get_keywords_for_org(org)

        drafts: list[dict[str, Any]] = []
        for i in range(min(post_count, len(post_types))):
            keyword = ordered[i % len(ordered)]
            if i == 0:
                draft = await image_gen.generate_image_post(
                    org=org,
                    post_type=post_types[i],
                    target_keyword=keyword,
                )
            else:
                draft = await generator.generate_post(
                    org=org,
                    post_type=post_types[i],
                    target_keyword=keyword,
                )
                draft["post_type"] = "standard"
            draft["target_keyword"] = keyword
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
            "keywords_used": ordered[:post_count],
            "drafts": drafts,
        }

    async def send_pending_review_requests(
        self,
        org_id: str,
        *,
        limit: int = 5,
    ) -> dict[str, Any]:
        """Send WhatsApp review requests for WON leads not yet asked."""
        if not self.settings.feature_review_engine:
            return {"status": "feature_disabled", "requests_sent": 0}

        already = (
            await self.session.execute(
                select(ReviewRequest.lead_id).where(ReviewRequest.org_id == org_id)
            )
        ).scalars().all()
        already_ids = {lid for lid in already if lid}

        stmt = (
            select(Lead)
            .where(
                Lead.org_id == org_id,
                Lead.status == LeadStatus.WON,
            )
            .order_by(Lead.updated_at.desc())
            .limit(limit * 3)
        )
        leads = (await self.session.execute(stmt)).scalars().all()
        candidates = [lead for lead in leads if lead.id not in already_ids][:limit]

        if not candidates:
            return {"status": "ok", "requests_sent": 0, "candidates": 0}

        from src.services.reviews.engine import ReviewEngine

        engine = ReviewEngine(self.session)
        sent = 0
        details: list[dict[str, Any]] = []
        try:
            for lead in candidates:
                outcome = await engine.send_review_request(org_id, lead.id)
                details.append({"lead_id": lead.id, **outcome})
                if outcome.get("status") == "ok" or outcome.get("sent"):
                    sent += 1
        finally:
            await engine.close()

        return {
            "status": "ok",
            "requests_sent": sent,
            "candidates": len(candidates),
            "details": details,
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
