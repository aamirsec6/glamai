"""Platform-wide cohort analysis for admin."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.lead import Lead, LeadSource, LeadStatus
from src.models.org import OnboardingStatus, Org, PlanTier


class PlatformCohortModel:
    """Group orgs and leads into cohorts and track outcomes over time."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def analyze(self, months: int = 6) -> dict[str, Any]:
        since = datetime.utcnow() - timedelta(days=months * 31)

        orgs = (await self.session.execute(select(Org))).scalars().all()
        leads = (
            await self.session.execute(select(Lead).where(Lead.created_at >= since))
        ).scalars().all()

        return {
            "org_cohorts": self._org_cohorts(orgs),
            "lead_cohorts_by_month": self._lead_cohorts_by_month(leads),
            "lead_cohorts_by_source": self._lead_cohorts_by_source(leads),
            "plan_cohorts": self._plan_cohorts(orgs),
        }

    def _org_cohorts(self, orgs: list[Org]) -> list[dict[str, Any]]:
        buckets: dict[str, list[Org]] = defaultdict(list)
        for org in orgs:
            key = org.created_at.strftime("%Y-%m") if org.created_at else "unknown"
            buckets[key].append(org)

        cohorts = []
        for month in sorted(buckets.keys()):
            group = buckets[month]
            active = sum(1 for o in group if o.is_active and o.onboarding_status != OnboardingStatus.CHURNED)
            retained_pct = round((active / len(group)) * 100, 1) if group else 0
            mrr = sum(o.billing_amount_paise for o in group if o.is_active) / 100
            leads_total = sum(o.guarantee_leads_generated or 0 for o in group)
            cohorts.append(
                {
                    "cohort": month,
                    "orgs_signed_up": len(group),
                    "still_active": active,
                    "retention_pct": retained_pct,
                    "mrr_inr": round(mrr),
                    "total_leads_generated": leads_total,
                    "avg_leads_per_org": round(leads_total / len(group), 1) if group else 0,
                }
            )
        return cohorts

    def _lead_cohorts_by_month(self, leads: list[Lead]) -> list[dict[str, Any]]:
        buckets: dict[str, list[Lead]] = defaultdict(list)
        for lead in leads:
            key = lead.created_at.strftime("%Y-%m")
            buckets[key].append(lead)

        cohorts = []
        for month in sorted(buckets.keys()):
            group = buckets[month]
            won = sum(1 for l in group if l.status == LeadStatus.WON)
            lost = sum(1 for l in group if l.status == LeadStatus.LOST)
            closed = won + lost
            cohorts.append(
                {
                    "cohort": month,
                    "leads": len(group),
                    "won": won,
                    "lost": lost,
                    "win_rate_pct": round((won / closed) * 100, 1) if closed else 0,
                    "still_open": len(group) - closed,
                }
            )
        return cohorts

    def _lead_cohorts_by_source(self, leads: list[Lead]) -> list[dict[str, Any]]:
        buckets: dict[str, list[Lead]] = defaultdict(list)
        for lead in leads:
            buckets[lead.source.value].append(lead)

        cohorts = []
        for source in sorted(buckets.keys()):
            group = buckets[source]
            won = sum(1 for l in group if l.status == LeadStatus.WON)
            closed = won + sum(1 for l in group if l.status == LeadStatus.LOST)
            cohorts.append(
                {
                    "cohort": source,
                    "leads": len(group),
                    "won": won,
                    "win_rate_pct": round((won / closed) * 100, 1) if closed else 0,
                }
            )
        cohorts.sort(key=lambda c: c["win_rate_pct"], reverse=True)
        return cohorts

    def _plan_cohorts(self, orgs: list[Org]) -> list[dict[str, Any]]:
        buckets: dict[str, list[Org]] = defaultdict(list)
        for org in orgs:
            buckets[org.plan.value].append(org)

        cohorts = []
        for plan in [PlanTier.STARTER, PlanTier.GROWTH, PlanTier.ENTERPRISE, PlanTier.FREE]:
            group = buckets.get(plan.value, [])
            if not group:
                continue
            active = sum(1 for o in group if o.is_active)
            cohorts.append(
                {
                    "cohort": plan.value,
                    "orgs": len(group),
                    "active": active,
                    "retention_pct": round((active / len(group)) * 100, 1),
                    "avg_mrr_inr": round(
                        sum(o.billing_amount_paise for o in group) / len(group) / 100
                    ),
                }
            )
        return cohorts
