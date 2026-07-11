"""Lead funnel and pipeline analytics."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.analytics.insights.types import FunnelStage, LeadFunnelInsights
from src.models.lead import BudgetRange, Lead, LeadStatus

BUDGET_MIDPOINT_INR: dict[BudgetRange, int] = {
    BudgetRange.UNDER_3L: 200_000,
    BudgetRange.FROM_3L_5L: 400_000,
    BudgetRange.FROM_5L_10L: 750_000,
    BudgetRange.FROM_10L_20L: 1_500_000,
    BudgetRange.FROM_20L_50L: 3_500_000,
    BudgetRange.ABOVE_50L: 7_500_000,
    BudgetRange.UNKNOWN: 500_000,
}

FUNNEL_ORDER = [
    LeadStatus.NEW,
    LeadStatus.CONTACTED,
    LeadStatus.QUOTED,
    LeadStatus.NEGOTIATION,
    LeadStatus.WON,
]


class LeadFunnelModel:
    """Conversion funnel, source attribution, and pipeline value."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def analyze(self, org_id: str, period_days: int = 30) -> LeadFunnelInsights:
        since = datetime.utcnow() - timedelta(days=period_days)
        leads = (
            await self.session.execute(
                select(Lead).where(and_(Lead.org_id == org_id, Lead.created_at >= since))
            )
        ).scalars().all()

        insights = LeadFunnelInsights()
        if not leads:
            return insights

        status_counts: dict[str, int] = {}
        for lead in leads:
            key = lead.status.value
            status_counts[key] = status_counts.get(key, 0) + 1

        active_pipeline = [
            LeadStatus.NEW,
            LeadStatus.CONTACTED,
            LeadStatus.QUOTED,
            LeadStatus.NEGOTIATION,
        ]
        prev_count: int | None = None
        max_drop_pct = -1.0
        drop_stage: str | None = None

        for status in FUNNEL_ORDER:
            count = status_counts.get(status.value, 0)
            conv = None
            if prev_count is not None and prev_count > 0:
                conv = round((count / prev_count) * 100, 1)
                drop_pct = 100 - conv
                if drop_pct > max_drop_pct and status != LeadStatus.WON:
                    max_drop_pct = drop_pct
                    drop_stage = status.value
            insights.stages.append(
                FunnelStage(stage=status.value, count=count, conversion_from_previous_pct=conv)
            )
            prev_count = count

        closed = status_counts.get(LeadStatus.WON.value, 0) + status_counts.get(
            LeadStatus.LOST.value, 0
        )
        insights.overall_win_rate_pct = round(
            (status_counts.get(LeadStatus.WON.value, 0) / closed) * 100, 1
        ) if closed else 0.0

        won_leads = [l for l in leads if l.status == LeadStatus.WON]
        if won_leads:
            days = [
                (l.status_changed_at - l.created_at).days
                for l in won_leads
                if l.status_changed_at and l.created_at
            ]
            insights.avg_days_to_close = round(sum(days) / len(days), 1) if days else None

        open_leads = [l for l in leads if l.status in active_pipeline]
        insights.pipeline_value_inr = sum(
            BUDGET_MIDPOINT_INR.get(l.budget_range, 500_000) for l in open_leads
        )
        insights.qualified_leads = sum(1 for l in leads if l.is_qualified)
        insights.drop_off_stage = drop_stage

        for lead in leads:
            src = lead.source.value
            if src not in insights.source_attribution:
                insights.source_attribution[src] = {"total": 0, "won": 0, "win_rate_pct": 0.0}
            insights.source_attribution[src]["total"] += 1
            if lead.status == LeadStatus.WON:
                insights.source_attribution[src]["won"] += 1

        for src, data in insights.source_attribution.items():
            data["win_rate_pct"] = round((data["won"] / data["total"]) * 100, 1) if data["total"] else 0.0

        win_score = min(100, insights.overall_win_rate_pct * 2)
        qual_score = min(100, (insights.qualified_leads / max(len(leads), 1)) * 100)
        pipeline_score = min(100, insights.pipeline_value_inr / 50_000)
        insights.health_score = round((win_score + qual_score + pipeline_score) / 3, 1)

        return insights
