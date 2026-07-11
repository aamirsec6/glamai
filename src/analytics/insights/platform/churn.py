"""Churn risk scoring for GlamAI platform clients."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.gbp import GbpPost, GbpPostStatus
from src.models.lead import Lead
from src.models.org import OnboardingStatus, Org


class ChurnPredictionModel:
    """Score each org's likelihood of canceling based on activity signals."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def analyze(self) -> dict[str, Any]:
        orgs = (await self.session.execute(select(Org).order_by(Org.created_at.desc()))).scalars().all()
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)

        at_risk: list[dict[str, Any]] = []
        healthy = 0
        churned = 0

        for org in orgs:
            score, reasons = await self._score_org(org, now, thirty_days_ago, sixty_days_ago)
            risk_level = self._risk_level(score)

            if org.onboarding_status == OnboardingStatus.CHURNED or not org.is_active:
                churned += 1
            elif score < 40:
                healthy += 1
            else:
                at_risk.append(
                    {
                        "org_id": org.id,
                        "org_name": org.name,
                        "city": org.city,
                        "plan": org.plan.value,
                        "churn_risk_score": score,
                        "risk_level": risk_level,
                        "reasons": reasons,
                        "recommended_action": self._recommended_action(score, reasons),
                        "mrr_inr": org.billing_amount_inr,
                    }
                )

        at_risk.sort(key=lambda x: x["churn_risk_score"], reverse=True)

        return {
            "summary": {
                "total_orgs": len(orgs),
                "healthy": healthy,
                "at_risk": len(at_risk),
                "already_churned": churned,
                "platform_churn_rate_pct": round((churned / len(orgs)) * 100, 1) if orgs else 0,
            },
            "at_risk_clients": at_risk,
        }

    async def _score_org(
        self,
        org: Org,
        now: datetime,
        thirty_days_ago: datetime,
        sixty_days_ago: datetime,
    ) -> tuple[int, list[str]]:
        if org.onboarding_status == OnboardingStatus.CHURNED:
            return 100, ["Account marked as churned"]
        if not org.is_active:
            return 95, ["Account deactivated"]

        score = 0
        reasons: list[str] = []

        if org.onboarding_status == OnboardingStatus.PAUSED:
            score += 35
            reasons.append("Account is paused")

        if org.onboarding_status == OnboardingStatus.CREATED:
            score += 25
            reasons.append("Never finished onboarding")

        if org.gbp_place_id:
            if not org.gbp_last_synced_at:
                score += 20
                reasons.append("GBP connected but never synced")
            elif org.gbp_last_synced_at < now - timedelta(days=14):
                score += 30
                reasons.append("GBP data stale (>14 days)")
            elif org.gbp_last_synced_at < now - timedelta(days=7):
                score += 15
                reasons.append("GBP sync overdue (>7 days)")
        else:
            score += 15
            reasons.append("GBP not connected")

        recent_leads = (
            await self.session.execute(
                select(func.count())
                .select_from(Lead)
                .where(and_(Lead.org_id == org.id, Lead.created_at >= thirty_days_ago))
            )
        ).scalar() or 0

        prior_leads = (
            await self.session.execute(
                select(func.count())
                .select_from(Lead)
                .where(
                    and_(
                        Lead.org_id == org.id,
                        Lead.created_at >= sixty_days_ago,
                        Lead.created_at < thirty_days_ago,
                    )
                )
            )
        ).scalar() or 0

        if prior_leads > 0 and recent_leads < prior_leads * 0.5:
            score += 25
            reasons.append(f"Lead volume dropped ({recent_leads} vs {prior_leads} prior month)")
        elif recent_leads == 0 and org.onboarding_status == OnboardingStatus.ACTIVE:
            score += 20
            reasons.append("No leads in the last 30 days")

        posts_recent = (
            await self.session.execute(
                select(func.count())
                .select_from(GbpPost)
                .where(
                    and_(
                        GbpPost.org_id == org.id,
                        GbpPost.status == GbpPostStatus.PUBLISHED,
                        GbpPost.published_at >= thirty_days_ago,
                    )
                )
            )
        ).scalar() or 0

        if posts_recent == 0 and org.gbp_place_id:
            score += 15
            reasons.append("No GBP posts published in 30 days")

        if org.created_at and org.created_at < now - timedelta(days=45):
            if org.onboarding_status not in (
                OnboardingStatus.ACTIVE,
                OnboardingStatus.ONBOARDING_COMPLETE,
            ):
                score += 15
                reasons.append("Long-tenured but not fully active")

        return min(100, score), reasons[:4]

    @staticmethod
    def _risk_level(score: int) -> str:
        if score >= 70:
            return "high"
        if score >= 45:
            return "medium"
        if score >= 25:
            return "low"
        return "minimal"

    @staticmethod
    def _recommended_action(score: int, reasons: list[str]) -> str:
        if score >= 70:
            return "Schedule retention call within 48 hours"
        if any("Lead volume" in r for r in reasons):
            return "Run content agents and review GBP strategy"
        if any("GBP" in r for r in reasons):
            return "Trigger GBP sync and publish scheduled posts"
        if any("onboarding" in r.lower() for r in reasons):
            return "Send onboarding completion nudge"
        return "Monitor weekly and send insights report"
