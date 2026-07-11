"""Local SEO visibility and keyword gap analysis."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.analytics.insights.types import SeoHealthInsights
from src.models.gbp import GbpRanking
from src.models.org import Org

TARGET_KEYWORDS = [
    "interior designer in {city}",
    "best interior designer {city}",
    "modular kitchen {city}",
    "home interior design {city}",
    "3BHK interior design",
]


class LocalSeoHealthModel:
    """Keyword visibility index and ranking gaps."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def analyze(self, org_id: str) -> SeoHealthInsights:
        seo = SeoHealthInsights()
        org = await self.session.get(Org, org_id)
        city = org.city if org else "Bangalore"

        rankings = (
            await self.session.execute(
                select(GbpRanking).where(GbpRanking.org_id == org_id)
            )
        ).scalars().all()

        seo.keywords_tracked = len(rankings)
        positions = [r.position for r in rankings if r.position is not None and r.position > 0]

        if positions:
            seo.avg_position = round(sum(positions) / len(positions), 1)
            visibility_scores = [max(0, 21 - p) for p in positions]
            seo.visibility_index = round(
                (sum(visibility_scores) / (len(positions) * 20)) * 100, 1
            )

        tracked_kws = {r.keyword.lower() for r in rankings}
        for template in TARGET_KEYWORDS:
            kw = template.format(city=city).lower()
            if kw not in tracked_kws:
                matching = any(kw in t for t in tracked_kws)
                if not matching:
                    seo.keyword_gaps.append(template.format(city=city))

        top3 = sum(1 for p in positions if p <= 3)
        if top3 >= 2:
            seo.ranking_momentum = "strong"
        elif seo.avg_position and seo.avg_position <= 8:
            seo.ranking_momentum = "improving"
        elif seo.avg_position and seo.avg_position > 12:
            seo.ranking_momentum = "weak"
        else:
            seo.ranking_momentum = "stable"

        vis_score = seo.visibility_index
        gap_penalty = max(0, 100 - len(seo.keyword_gaps) * 15)
        pos_score = max(0, 100 - (seo.avg_position or 15) * 5)
        seo.health_score = round((vis_score + gap_penalty + pos_score) / 3, 1)

        return seo
