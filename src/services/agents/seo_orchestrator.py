"""SEO agent orchestrator — track ranks, plan actions, execute GBP improvements."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.analytics.insights.competitive import CompetitiveBenchmarkModel
from src.analytics.insights.seo_health import LocalSeoHealthModel
from src.core.config import get_settings
from src.models.org import Org
from src.services.gbp.optimizer import GbpPostGenerator
from src.services.gbp.profile_optimizer import GbpProfileOptimizer
from src.services.seo.action_planner import ActionPlanner
from src.services.seo.keyword_planner import KeywordPlanner
from src.services.seo.path_to_top3 import PathToTop3Scorecard
from src.services.seo.rank_tracker import RankTrackerService

logger = structlog.get_logger(__name__)


@dataclass
class SeoAgentResult:
    org_id: str
    org_name: str
    rankings: dict[str, Any] = field(default_factory=dict)
    seo_health: dict[str, Any] = field(default_factory=dict)
    competitive: dict[str, Any] = field(default_factory=dict)
    actions_planned: list[dict[str, Any]] = field(default_factory=list)
    actions_executed: list[dict[str, Any]] = field(default_factory=list)
    scorecard: dict[str, Any] = field(default_factory=dict)
    priority_keywords: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "org_id": self.org_id,
            "org_name": self.org_name,
            "rankings": self.rankings,
            "seo_health": self.seo_health,
            "competitive": self.competitive,
            "actions_planned": self.actions_planned,
            "actions_executed": self.actions_executed,
            "scorecard": self.scorecard,
            "priority_keywords": self.priority_keywords,
            "errors": self.errors,
        }


class SeoAgentOrchestrator:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_settings()
        self.keyword_planner = KeywordPlanner(session)
        self.rank_tracker = RankTrackerService(session)
        self.action_planner = ActionPlanner()
        self.scorecard_builder = PathToTop3Scorecard(session)
        self.seo_health = LocalSeoHealthModel(session)
        self.competitive = CompetitiveBenchmarkModel(session)

    async def run(
        self,
        org_id: str,
        execute_actions: bool = True,
        *,
        execute_posts: bool = True,
    ) -> SeoAgentResult:
        """Run SEO agent.

        When ``execute_posts`` is False (Growth pipeline), only profile
        actions run — Content owns targeted GBP posts to avoid duplicates.
        """
        org = await self.session.get(Org, org_id)
        if not org:
            return SeoAgentResult(org_id=org_id, org_name="", errors=["org_not_found"])

        result = SeoAgentResult(org_id=org_id, org_name=org.name)

        if not self.settings.feature_seo_agent:
            result.errors.append("seo_agent_disabled")
            return result

        keywords = await self.keyword_planner.get_tracked_keywords(org_id)
        priority = await self.keyword_planner.get_priority_keywords(org_id)
        result.priority_keywords = priority

        try:
            result.rankings = await self.rank_tracker.track_org(org_id, keywords)
        except Exception as e:
            logger.exception("seo_rank_track_failed", org_id=org_id)
            result.errors.append(f"rank_track: {e}")
            result.rankings = {"status": "error", "rankings": []}

        try:
            seo = await self.seo_health.analyze(org_id)
            result.seo_health = seo.to_dict()
            comp = await self.competitive.analyze(org_id)
            result.competitive = comp.to_dict()
        except Exception as e:
            logger.exception("seo_analysis_failed", org_id=org_id)
            result.errors.append(f"analysis: {e}")
            seo = await self.seo_health.analyze(org_id)

        ranking_rows = result.rankings.get("rankings") or []
        result.actions_planned = self.action_planner.plan(
            seo,
            ranking_rows,
            priority,
        )

        if execute_actions and self.settings.feature_content_generator:
            result.actions_executed = await self._execute_actions(
                org,
                result.actions_planned,
                execute_posts=execute_posts,
            )

        tracking_status = result.rankings.get("status", "ok")
        result.scorecard = await self.scorecard_builder.build(
            org_id,
            ranking_rows,
            result.actions_planned,
            tracking_status=tracking_status,
        )
        return result

    async def get_scorecard(self, org_id: str) -> dict[str, Any]:
        keywords = await self.keyword_planner.get_tracked_keywords(org_id)
        track = await self.rank_tracker.track_org(org_id, keywords) if keywords else {
            "status": "no_keywords",
            "rankings": [],
        }
        seo = await self.seo_health.analyze(org_id)
        priority = await self.keyword_planner.get_priority_keywords(org_id)
        actions = self.action_planner.plan(seo, track.get("rankings") or [], priority)
        return await self.scorecard_builder.build(
            org_id,
            track.get("rankings") or [],
            actions,
            tracking_status=track.get("status", "ok"),
        )

    async def _execute_actions(
        self,
        org: Org,
        actions: list[dict[str, Any]],
        *,
        execute_posts: bool = True,
    ) -> list[dict[str, Any]]:
        executed: list[dict[str, Any]] = []
        post_gen = GbpPostGenerator()
        profile_opt = GbpProfileOptimizer(self.session)

        for action in actions[:3]:
            try:
                if action["type"] == "targeted_post" and action.get("keyword"):
                    if not execute_posts:
                        executed.append({
                            "action": action,
                            "result": "deferred_to_content",
                            "keyword": action["keyword"],
                        })
                        continue
                    post = await post_gen.generate_post(
                        org=org,
                        post_type="tip_educational",
                        target_keyword=action["keyword"],
                    )
                    # Persist so standalone SEO runs actually ship posts
                    from src.application.gbp import GbpFacade

                    gbp = GbpFacade(self.session)
                    try:
                        ingest = await gbp.ingest.ingest_generated_posts(org.id, [post])
                    finally:
                        await gbp.close()
                    executed.append({
                        "action": action,
                        "result": "post_ingested",
                        "post": post,
                        "ingest": ingest,
                    })
                elif action["type"] in ("profile_refresh", "profile_keyword"):
                    opt = await profile_opt.optimize_profile(org.id)
                    executed.append({
                        "action": action,
                        "result": "profile_optimized",
                        "data": opt,
                    })
                    break
            except Exception as e:
                executed.append({"action": action, "result": "error", "error": str(e)})

        await profile_opt.close()
        return executed
