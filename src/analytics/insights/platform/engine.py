"""Platform intelligence orchestrator for admin."""

from __future__ import annotations

from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.analytics.insights.platform.churn import ChurnPredictionModel
from src.analytics.insights.platform.cohort import PlatformCohortModel

logger = structlog.get_logger(__name__)


class PlatformIntelligenceEngine:
    """Cohort analysis + churn prediction across all GlamAI clients."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.cohorts = PlatformCohortModel(session)
        self.churn = ChurnPredictionModel(session)

    async def analyze(self, cohort_months: int = 6) -> dict[str, Any]:
        cohort_data = await self.cohorts.analyze(months=cohort_months)
        churn_data = await self.churn.analyze()

        insights = self._build_insights(cohort_data, churn_data)

        logger.info(
            "platform_intelligence_complete",
            at_risk=churn_data["summary"]["at_risk"],
            cohorts=len(cohort_data["org_cohorts"]),
        )

        return {
            "cohorts": cohort_data,
            "churn": churn_data,
            "insights": insights,
        }

    def _build_insights(
        self,
        cohorts: dict[str, Any],
        churn: dict[str, Any],
    ) -> list[str]:
        lines: list[str] = []

        org_cohorts = cohorts.get("org_cohorts", [])
        if org_cohorts:
            best = max(org_cohorts, key=lambda c: c.get("retention_pct", 0))
            lines.append(
                f"Best signup cohort: {best['cohort']} "
                f"({best['retention_pct']}% still active)."
            )

        source_cohorts = cohorts.get("lead_cohorts_by_source", [])
        if source_cohorts:
            top = source_cohorts[0]
            lines.append(
                f"Top lead source: {top['cohort'].replace('_', ' ')} "
                f"({top['win_rate_pct']}% win rate)."
            )

        summary = churn.get("summary", {})
        if summary.get("at_risk", 0) > 0:
            lines.append(
                f"{summary['at_risk']} client(s) at churn risk — "
                "prioritize retention outreach."
            )
        else:
            lines.append("No clients currently flagged at high churn risk.")

        if summary.get("platform_churn_rate_pct", 0) > 0:
            lines.append(
                f"Platform churn rate: {summary['platform_churn_rate_pct']}%."
            )

        return lines
