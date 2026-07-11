"""Admin analytics facade — orchestrates analytics engines for admin API routes."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.analytics.insights.onboarding_funnel import OnboardingFunnelEngine
from src.analytics.insights.platform import PlatformIntelligenceEngine


class AdminFacade:
    """Single entry point for admin dashboard analytics."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def onboarding_funnel(self, period_days: int = 90) -> list[dict[str, Any]]:
        engine = OnboardingFunnelEngine(self._db)
        result = await engine.analyze(period_days=period_days)
        return result["funnel_steps"]

    async def journey_analytics(self, period_days: int = 90) -> dict[str, Any]:
        engine = OnboardingFunnelEngine(self._db)
        return await engine.analyze(period_days=period_days)

    async def platform_intelligence(self, cohort_months: int = 6) -> dict[str, Any]:
        engine = PlatformIntelligenceEngine(self._db)
        return await engine.analyze(cohort_months=cohort_months)
