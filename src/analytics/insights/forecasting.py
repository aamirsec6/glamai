"""Revenue and lead forecasting models."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.analytics.insights.lead_funnel import BUDGET_MIDPOINT_INR
from src.analytics.insights.types import ForecastInsights
from src.models.gbp import GbpInsights
from src.models.lead import Lead, LeadStatus


class BusinessForecastModel:
    """30-day projections from historical lead and GBP trends."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def analyze(
        self,
        org_id: str,
        period_days: int = 30,
        *,
        funnel_win_rate_pct: float = 0.0,
        pipeline_value_inr: int = 0,
    ) -> ForecastInsights:
        forecast = ForecastInsights()
        now = datetime.utcnow()
        since = now - timedelta(days=period_days)
        half = now - timedelta(days=period_days // 2)

        all_leads = (
            await self.session.execute(
                select(Lead).where(and_(Lead.org_id == org_id, Lead.created_at >= since))
            )
        ).scalars().all()
        recent_half = [l for l in all_leads if l.created_at >= half]
        older_half = [l for l in all_leads if l.created_at < half]

        recent_rate = len(recent_half) / max(period_days // 2, 1)
        older_rate = len(older_half) / max(period_days // 2, 1)

        if older_rate > 0:
            forecast.growth_rate_pct = round(((recent_rate - older_rate) / older_rate) * 100, 1)
        projected_daily = recent_rate if recent_half else (len(all_leads) / max(period_days, 1))
        forecast.projected_leads_next_30d = max(0, round(projected_daily * 30))

        closed = [l for l in all_leads if l.status in (LeadStatus.WON, LeadStatus.LOST)]
        won = [l for l in all_leads if l.status == LeadStatus.WON]
        win_rate = funnel_win_rate_pct or (
            round((len(won) / len(closed)) * 100, 1) if closed else 15.0
        )
        forecast.win_rate_assumption_pct = win_rate

        open_pipeline = [l for l in all_leads if l.status not in (
            LeadStatus.WON, LeadStatus.LOST, LeadStatus.DROPPED
        )]
        pipe_value = pipeline_value_inr or sum(
            BUDGET_MIDPOINT_INR.get(l.budget_range, 500_000) for l in open_pipeline
        )
        new_pipeline_value = forecast.projected_leads_next_30d * 500_000 * 0.6
        forecast.projected_revenue_inr = round(
            (pipe_value + new_pipeline_value) * (win_rate / 100)
        )

        gbp_periods = (
            await self.session.execute(
                select(GbpInsights)
                .where(GbpInsights.org_id == org_id)
                .order_by(GbpInsights.period_end.desc())
                .limit(2)
            )
        ).scalars().all()
        if gbp_periods:
            latest = gbp_periods[0]
            daily_views = latest.total_views / max(period_days, 1)
            growth = 1 + (forecast.growth_rate_pct or 0) / 100
            forecast.projected_gbp_views = round(daily_views * 30 * growth)

        data_points = len(all_leads) + len(gbp_periods)
        forecast.confidence = (
            "high" if data_points >= 15 else "medium" if data_points >= 5 else "low"
        )

        return forecast
