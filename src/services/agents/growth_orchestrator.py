"""Growth orchestrator — geo → SEO → content pipeline with explicit handoffs."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.models.org import Org
from src.services.agents.content_orchestrator import ContentAgentsOrchestrator
from src.services.agents.geo_orchestrator import GeoLocalAgentOrchestrator
from src.services.agents.handoff import GrowthHandoff
from src.services.agents.run_store import save_growth_run
from src.services.agents.seo_orchestrator import SeoAgentOrchestrator
from src.services.seo.keyword_planner import KeywordPlanner

logger = structlog.get_logger(__name__)


@dataclass
class GrowthAgentResult:
    org_id: str
    org_name: str
    geo: dict[str, Any] = field(default_factory=dict)
    seo: dict[str, Any] = field(default_factory=dict)
    content: dict[str, Any] = field(default_factory=dict)
    reviews: dict[str, Any] = field(default_factory=dict)
    handoff: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "org_id": self.org_id,
            "org_name": self.org_name,
            "geo": self.geo,
            "seo": self.seo,
            "content": self.content,
            "reviews": self.reviews,
            "handoff": self.handoff,
            "errors": self.errors,
            "summary": {
                "keywords_assigned": len(
                    self.geo.get("geo_brief", {}).get("keywords_assigned", [])
                    or self.handoff.get("priority_keywords", [])
                ),
                "in_top3": self.seo.get("scorecard", {}).get("summary", {}).get("in_top3", 0),
                "posts_created": self.content.get("summary", {}).get("posts_created", 0),
                "reviews_replied": self.content.get("summary", {}).get("reviews_replied", 0),
                "review_requests_sent": self.reviews.get("requests_sent", 0),
            },
        }


class GrowthOrchestrator:
    """Run the coordinated cast: Scout → Sage → Spark/Ruby (+ analysis Cleo)."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_settings()

    async def run(
        self,
        org_id: str,
        *,
        run_geo: bool = True,
        run_seo: bool = True,
        run_content: bool = True,
        execute_seo_actions: bool = True,
        content_post_count: int = 4,
        run_review_requests: bool = True,
    ) -> GrowthAgentResult:
        org = await self.session.get(Org, org_id)
        if not org:
            return GrowthAgentResult(org_id=org_id, org_name="", errors=["org_not_found"])

        result = GrowthAgentResult(org_id=org_id, org_name=org.name)
        handoff = GrowthHandoff()

        # ── 1. Geo (Scout) ───────────────────────────────────
        if run_geo and self.settings.feature_geo_agent:
            try:
                geo = GeoLocalAgentOrchestrator(self.session)
                geo_result = await geo.run(org_id)
                result.geo = geo_result.to_dict()
                result.errors.extend(geo_result.errors)
                brief = result.geo.get("geo_brief") or {}
                handoff.geo_brief = brief
                assigned = brief.get("priority_keywords") or brief.get("keywords_assigned") or []
                if isinstance(assigned, list):
                    handoff.priority_keywords = [str(k) for k in assigned if k]
            except Exception as e:
                logger.exception("growth_geo_failed", org_id=org_id)
                result.errors.append(f"geo: {e}")

        # Always refresh keyword list from niches (Geo may have just written them)
        try:
            planner = KeywordPlanner(self.session)
            niche_keywords = await planner.get_priority_keywords(org_id, limit=6)
            if niche_keywords:
                handoff.priority_keywords = list(
                    dict.fromkeys([*handoff.priority_keywords, *niche_keywords])
                )
        except Exception as e:
            result.errors.append(f"keywords: {e}")

        # ── 2. SEO (Sage) ────────────────────────────────────
        # Profile actions may execute; targeted posts are owned by Content to avoid doubles.
        if run_seo and self.settings.feature_seo_agent:
            try:
                seo = SeoAgentOrchestrator(self.session)
                seo_result = await seo.run(
                    org_id,
                    execute_actions=execute_seo_actions,
                    execute_posts=False,
                )
                result.seo = seo_result.to_dict()
                result.errors.extend(seo_result.errors)
                handoff.seo_actions = list(seo_result.actions_planned or [])
                handoff.ranking_summary = {
                    "status": (seo_result.rankings or {}).get("status"),
                    "count": len((seo_result.rankings or {}).get("rankings") or []),
                    "in_top3": (seo_result.scorecard or {})
                    .get("summary", {})
                    .get("in_top3"),
                }
            except Exception as e:
                logger.exception("growth_seo_failed", org_id=org_id)
                result.errors.append(f"seo: {e}")

        # ── 3. Content (Spark) + Review replies (Ruby) + Insights (Cleo) ──
        if run_content and self.settings.feature_content_generator:
            try:
                content = ContentAgentsOrchestrator(self.session)
                content_result = await content.run(
                    org_id,
                    generate_posts=True,
                    post_count=content_post_count,
                    optimize_profile=handoff.needs_profile_refresh()
                    or execute_seo_actions,
                    auto_reply_reviews=True,
                    include_analysis=True,
                    schedule_posts=True,
                    priority_keywords=handoff.targeted_post_keywords(),
                    seo_actions=handoff.seo_actions,
                )
                result.content = content_result.to_dict()
                result.errors.extend(content_result.errors)
            except Exception as e:
                logger.exception("growth_content_failed", org_id=org_id)
                result.errors.append(f"content: {e}")

        # ── 4. Review requests for recent WON leads (Ruby outbound) ──
        if run_review_requests and self.settings.feature_review_engine:
            try:
                content = ContentAgentsOrchestrator(self.session)
                result.reviews = await content.send_pending_review_requests(org_id)
            except Exception as e:
                logger.exception("growth_review_requests_failed", org_id=org_id)
                result.errors.append(f"review_requests: {e}")

        result.handoff = handoff.to_dict()

        try:
            await save_growth_run(org_id, result.to_dict())
        except Exception:
            logger.warning("growth_run_save_skipped", org_id=org_id)

        logger.info(
            "growth_pipeline_complete",
            org_id=org_id,
            errors=len(result.errors),
            keywords=len(handoff.priority_keywords),
            posts=result.content.get("summary", {}).get("posts_created", 0),
        )
        return result
