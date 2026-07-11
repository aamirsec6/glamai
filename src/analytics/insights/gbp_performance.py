"""GBP engagement and content performance analytics."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.analytics.insights.types import GbpPerformanceInsights
from src.models.gbp import GbpInsights, GbpPost, GbpPostStatus


class GbpPerformanceModel:
    """Engagement rates, trends, and content cadence scoring."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def analyze(self, org_id: str, period_days: int = 30) -> GbpPerformanceInsights:
        insights = GbpPerformanceInsights()
        since = datetime.utcnow() - timedelta(days=period_days)

        periods = (
            await self.session.execute(
                select(GbpInsights)
                .where(GbpInsights.org_id == org_id)
                .order_by(GbpInsights.period_end.desc())
                .limit(3)
            )
        ).scalars().all()

        if not periods:
            return insights

        curr = periods[0]
        total_actions = curr.calls + curr.website_clicks + curr.direction_requests
        if curr.total_views:
            insights.engagement_rate_pct = round((total_actions / curr.total_views) * 100, 2)
            insights.call_rate_pct = round((curr.calls / curr.total_views) * 100, 2)
            insights.click_through_rate_pct = round(
                (curr.website_clicks / curr.total_views) * 100, 2
            )
            insights.maps_share_pct = round((curr.maps_views / curr.total_views) * 100, 1)

        if len(periods) >= 2:
            prev = periods[1]
            if prev.total_views:
                insights.views_trend_pct = round(
                    ((curr.total_views - prev.total_views) / prev.total_views) * 100, 1
                )
            prev_actions = prev.calls + prev.website_clicks + prev.direction_requests
            if prev_actions:
                insights.actions_trend_pct = round(
                    ((total_actions - prev_actions) / prev_actions) * 100, 1
                )
            if prev.review_count and curr.review_count:
                insights.review_velocity = round(curr.review_count - prev.review_count, 1)

        pub_stmt = select(func.count()).select_from(GbpPost).where(
            and_(
                GbpPost.org_id == org_id,
                GbpPost.status == GbpPostStatus.PUBLISHED,
                GbpPost.published_at >= since,
            )
        )
        published = (await self.session.execute(pub_stmt)).scalar() or 0
        target_monthly = 4
        insights.content_cadence_score = round(min(100, (published / target_monthly) * 100), 1)

        eng_score = min(100, insights.engagement_rate_pct * 15)
        trend_score = 50.0
        if insights.views_trend_pct is not None:
            trend_score = min(100, max(0, 50 + insights.views_trend_pct))
        cadence_score = insights.content_cadence_score
        insights.health_score = round((eng_score + trend_score + cadence_score) / 3, 1)

        return insights
