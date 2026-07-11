"""Advanced business insights orchestrator."""

from __future__ import annotations

import json
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.integrations.anthropic import AnthropicConnector
from src.analytics.insights.competitive import CompetitiveBenchmarkModel
from src.analytics.insights.forecasting import BusinessForecastModel
from src.analytics.insights.gbp_performance import GbpPerformanceModel
from src.analytics.insights.lead_funnel import LeadFunnelModel
from src.analytics.insights.opportunities import OpportunityScoringModel
from src.analytics.insights.seo_health import LocalSeoHealthModel
from src.analytics.insights.types import AdvancedBusinessInsights
from src.models.org import Org

logger = structlog.get_logger(__name__)


class AdvancedInsightEngine:
    """Run all analytical models and produce unified business intelligence."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.lead_funnel = LeadFunnelModel(session)
        self.gbp_performance = GbpPerformanceModel(session)
        self.competitive = CompetitiveBenchmarkModel(session)
        self.forecast = BusinessForecastModel(session)
        self.seo_health = LocalSeoHealthModel(session)
        self.opportunities = OpportunityScoringModel()

    async def analyze(
        self,
        org_id: str,
        period_days: int = 30,
        *,
        include_ai_narrative: bool = False,
    ) -> AdvancedBusinessInsights:
        org = await self.session.get(Org, org_id)
        if not org:
            raise ValueError("org_not_found")

        funnel = await self.lead_funnel.analyze(org_id, period_days)
        gbp = await self.gbp_performance.analyze(org_id, period_days)
        competitive = await self.competitive.analyze(org_id)
        forecast = await self.forecast.analyze(
            org_id,
            period_days,
            funnel_win_rate_pct=funnel.overall_win_rate_pct,
            pipeline_value_inr=funnel.pipeline_value_inr,
        )
        seo = await self.seo_health.analyze(org_id)
        opps = self.opportunities.score(
            funnel=funnel,
            gbp=gbp,
            competitive=competitive,
            forecast=forecast,
            seo=seo,
        )

        health_scores = [
            funnel.health_score,
            gbp.health_score,
            competitive.health_score,
            seo.health_score,
        ]
        business_health = round(sum(health_scores) / len(health_scores), 1)

        summary = self._build_executive_summary(
            org_name=org.name,
            funnel=funnel,
            gbp=gbp,
            competitive=competitive,
            forecast=forecast,
            seo=seo,
            business_health=business_health,
        )

        result = AdvancedBusinessInsights(
            org_id=org_id,
            org_name=org.name,
            period_days=period_days,
            business_health_score=business_health,
            lead_funnel=funnel,
            gbp_performance=gbp,
            competitive=competitive,
            forecast=forecast,
            seo_health=seo,
            opportunities=opps,
            executive_summary=summary,
        )

        if include_ai_narrative:
            result.ai_narrative = await self._generate_ai_narrative(result)

        logger.info(
            "advanced_insights_complete",
            org_id=org_id,
            health=business_health,
            opportunities=len(opps),
        )
        return result

    def _build_executive_summary(
        self,
        *,
        org_name: str,
        funnel,
        gbp,
        competitive,
        forecast,
        seo,
        business_health: float,
    ) -> list[str]:
        lines = [
            f"{org_name} business health score: {business_health}/100.",
            f"Pipeline value: ₹{funnel.pipeline_value_inr:,} across open leads "
            f"({funnel.overall_win_rate_pct}% win rate).",
        ]
        if gbp.views_trend_pct is not None:
            direction = "up" if gbp.views_trend_pct >= 0 else "down"
            lines.append(
                f"GBP views are {direction} {abs(gbp.views_trend_pct):.1f}% vs last period "
                f"({gbp.engagement_rate_pct}% engagement rate)."
            )
        lines.append(
            f"Competitive position: {competitive.competitive_position} "
            f"({competitive.keywords_top3} keywords in top 3)."
        )
        lines.append(
            f"30-day forecast: ~{forecast.projected_leads_next_30d} leads, "
            f"₹{forecast.projected_revenue_inr:,} projected revenue "
            f"({forecast.confidence} confidence)."
        )
        if seo.keyword_gaps:
            lines.append(f"SEO gaps: missing {len(seo.keyword_gaps)} high-intent keywords.")
        return lines

    async def _generate_ai_narrative(self, insights: AdvancedBusinessInsights) -> str | None:
        llm = AnthropicConnector()
        payload = insights.to_dict()
        payload.pop("ai_narrative", None)

        system = (
            "You are a senior growth consultant for local interior design businesses in India. "
            "Write a concise executive briefing (4-6 sentences) with specific numbers from the data. "
            "Be actionable and direct. No bullet points."
        )
        user = f"Business insights JSON:\n{json.dumps(payload, default=str)[:6000]}"

        try:
            return await llm.complete(system, user, max_tokens=400)
        except Exception as e:
            logger.warning("insights_narrative_failed", error=str(e))
            return None
