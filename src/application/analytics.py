"""Analytics facade — tenant analysis and reports."""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.integrations.base import ConnectorResource
from src.integrations.registry import ConnectorRegistry
from src.analytics.analysis import AnalysisEngine, TenantAnalysis
from src.analytics.insights import AdvancedInsightEngine
from src.models.org import Org
from src.services.reports.generator import ReportGenerator


class AnalyticsFacade:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.analysis = AnalysisEngine(session)
        self.insights = AdvancedInsightEngine(session)
        self.registry = ConnectorRegistry(session)

    async def close(self) -> None:
        await self.registry.close()

    async def analyze_tenant(
        self,
        org_id: str,
        period_days: int = 30,
        include_narrative: bool = False,
    ) -> dict[str, Any]:
        tenant_analysis = await self.analysis.analyze(org_id, period_days)

        if include_narrative:
            anthropic = self.registry.anthropic()
            try:
                snap_dict = asdict(tenant_analysis.snapshot)
                pull = await anthropic.pull(
                    org_id,
                    ConnectorResource.REPORT_NARRATIVE,
                    snapshot=snap_dict,
                )
                if pull.ok:
                    tenant_analysis.narrative = pull.data.get("narrative")
            finally:
                await self.registry.close()

        return self._serialize(tenant_analysis)

    async def get_advanced_insights(
        self,
        org_id: str,
        period_days: int = 30,
        include_ai_narrative: bool = False,
    ) -> dict[str, Any]:
        advanced = await self.insights.analyze(
            org_id, period_days, include_ai_narrative=include_ai_narrative
        )
        return advanced.to_dict()

    async def generate_monthly_report(
        self,
        org_id: str,
        month: int | None = None,
        year: int | None = None,
        include_narrative: bool = True,
    ) -> dict[str, Any]:
        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        now = datetime.utcnow()
        report_month = month or (12 if now.month == 1 else now.month - 1)
        report_year = year or (now.year - 1 if now.month == 1 else now.year)

        generator = ReportGenerator()
        report = await generator.generate_report(org, report_month, report_year, self.session)

        narrative = None
        if include_narrative:
            analysis = await self.analyze_tenant(org_id, include_narrative=True)
            narrative = analysis.get("narrative")

        await self.session.flush()
        result = report.to_dict()
        if narrative:
            result["ai_narrative"] = narrative
        return {"status": "ok", "data": result}

    @staticmethod
    def _serialize(analysis: TenantAnalysis) -> dict[str, Any]:
        return {
            "snapshot": asdict(analysis.snapshot),
            "scores": analysis.scores,
            "trends": analysis.trends,
            "anomalies": analysis.anomalies,
            "recommendations": analysis.recommendations,
            "guarantee_progress": analysis.guarantee_progress,
            "narrative": analysis.narrative,
        }
