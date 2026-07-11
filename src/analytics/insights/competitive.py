"""Competitive benchmarking vs local competitors."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.analytics.insights.types import CompetitiveInsights
from src.models.gbp import GbpCompetitor, GbpInsights, GbpRanking


class CompetitiveBenchmarkModel:
    """Rating, review, and keyword position vs competitors."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def analyze(self, org_id: str) -> CompetitiveInsights:
        insights = CompetitiveInsights()

        latest_insights = (
            await self.session.execute(
                select(GbpInsights)
                .where(GbpInsights.org_id == org_id)
                .order_by(GbpInsights.period_end.desc())
                .limit(1)
            )
        ).scalar_one_or_none()

        if latest_insights:
            insights.your_rating = latest_insights.avg_rating
            insights.your_reviews = latest_insights.review_count

        competitors = (
            await self.session.execute(
                select(GbpCompetitor).where(GbpCompetitor.org_id == org_id)
            )
        ).scalars().all()

        if competitors:
            ratings = [c.avg_rating for c in competitors if c.avg_rating is not None]
            reviews = [c.review_count for c in competitors if c.review_count is not None]
            if ratings:
                insights.competitor_avg_rating = round(sum(ratings) / len(ratings), 2)
                if insights.your_rating is not None:
                    insights.rating_gap = round(insights.your_rating - insights.competitor_avg_rating, 2)
            if reviews:
                insights.competitor_avg_reviews = round(sum(reviews) / len(reviews), 1)
                if insights.your_reviews is not None:
                    insights.review_gap = round(insights.your_reviews - insights.competitor_avg_reviews, 1)

        rankings = (
            await self.session.execute(
                select(GbpRanking).where(GbpRanking.org_id == org_id)
            )
        ).scalars().all()

        for r in rankings:
            if r.position is None or r.position > 20:
                insights.keywords_weak += 1
            elif r.position <= 3:
                insights.keywords_top3 += 1
            elif r.position <= 10:
                insights.keywords_top10 += 1
            else:
                insights.keywords_weak += 1

        if insights.rating_gap is not None and insights.rating_gap >= 0.2:
            position = "leading"
        elif insights.keywords_top3 >= 2:
            position = "competitive"
        elif insights.keywords_weak >= 2:
            position = "behind"
        else:
            position = "average"
        insights.competitive_position = position

        rating_score = 50.0
        if insights.rating_gap is not None:
            rating_score = min(100, max(0, 50 + insights.rating_gap * 30))
        keyword_score = min(100, insights.keywords_top3 * 25 + insights.keywords_top10 * 10)
        review_score = 50.0
        if insights.review_gap is not None:
            review_score = min(100, max(0, 50 + insights.review_gap / 2))
        insights.health_score = round((rating_score + keyword_score + review_score) / 3, 1)

        return insights
