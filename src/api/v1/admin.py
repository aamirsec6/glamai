"""Admin analytics API routes.

Provides the backend for the admin dashboard showing:
- Onboarding funnel
- Active orgs metrics
- Revenue metrics
- Territory overview
"""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.lead import Lead, LeadSource, LeadStatus
from src.models.notification import OnboardingEvent
from src.models.org import OnboardingStatus, Org, PlanTier
from src.models.report import MonthlyReport
from src.models.territory import Territory, TerritoryStatus

router = APIRouter(prefix="/v1/admin", tags=["Admin"])


@router.get("/dashboard")
async def admin_dashboard(
    db: AsyncSession = Depends(get_db),
):
    """Admin dashboard with key metrics."""
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)

    # ── Org Metrics ─────────────────────────────────────────
    org_stmt = select(Org)
    org_result = await db.execute(org_stmt)
    all_orgs = org_result.scalars().all()

    total_orgs = len(all_orgs)
    active_orgs = sum(1 for o in all_orgs if o.is_active)
    onboarding_complete = sum(
        1 for o in all_orgs
        if o.onboarding_status in (OnboardingStatus.ACTIVE, OnboardingStatus.ONBOARDING_COMPLETE)
    )

    orgs_by_plan = {}
    for plan in PlanTier:
        orgs_by_plan[plan.value] = sum(1 for o in all_orgs if o.plan == plan)

    orgs_by_category = {}
    from src.models.org import BusinessCategory
    for cat in BusinessCategory:
        orgs_by_category[cat.value] = sum(1 for o in all_orgs if o.category == cat)

    orgs_by_city = {}
    for org in all_orgs:
        orgs_by_city[org.city] = orgs_by_city.get(org.city, 0) + 1

    # ── Lead Metrics ────────────────────────────────────────
    lead_stmt = select(Lead)
    lead_result = await db.execute(lead_stmt)
    all_leads = lead_result.scalars().all()

    total_leads = len(all_leads)
    leads_last_30d = sum(1 for l in all_leads if l.created_at >= thirty_days_ago)

    won_leads = [l for l in all_leads if l.status == LeadStatus.WON]
    lost_leads = [l for l in all_leads if l.status == LeadStatus.LOST]

    total_revenue_paise = sum(l.won_value_paise or 0 for l in won_leads)
    conversion_rate = (len(won_leads) / total_leads * 100) if total_leads > 0 else 0

    leads_by_source = {}
    for source in LeadSource:
        leads_by_source[source.value] = sum(1 for l in all_leads if l.source == source)

    # ── Onboarding Funnel ───────────────────────────────────
    funnel = {}
    for status in OnboardingStatus:
        funnel[status.value] = sum(
            1 for o in all_orgs
            if o.onboarding_status == status
        )

    # ── Revenue ─────────────────────────────────────────────
    total_mrr_paise = sum(o.billing_amount_paise for o in all_orgs if o.is_active)

    # ── Territory ───────────────────────────────────────────
    territory_stmt = select(Territory).where(
        Territory.status == TerritoryStatus.ACTIVE
    )
    territory_result = await db.execute(territory_stmt)
    active_territories = territory_result.scalars().all()

    territories_by_city = {}
    for t in active_territories:
        territories_by_city[t.city] = territories_by_city.get(t.city, 0) + 1

    return {
        "data": {
            "orgs": {
                "total": total_orgs,
                "active": active_orgs,
                "onboarding_complete": onboarding_complete,
                "by_plan": orgs_by_plan,
                "by_category": orgs_by_category,
                "by_city": orgs_by_city,
            },
            "leads": {
                "total": total_leads,
                "last_30d": leads_last_30d,
                "won": len(won_leads),
                "lost": len(lost_leads),
                "conversion_rate": round(conversion_rate, 1),
                "by_source": leads_by_source,
            },
            "revenue": {
                "total_mrr_inr": total_mrr_paise / 100,
                "total_revenue_inr": total_revenue_paise / 100,
                "avg_revenue_per_client": (
                    (total_revenue_paise / len(won_leads) / 100) if won_leads else 0
                ),
            },
            "onboarding_funnel": funnel,
            "territories": {
                "active": len(active_territories),
                "by_city": territories_by_city,
            },
        }
    }


@router.get("/orgs")
async def admin_list_orgs(
    status: str | None = Query(None),
    plan: str | None = Query(None),
    city: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all organizations with filters (admin view)."""
    query = select(Org)

    if status:
        try:
            query = query.where(Org.onboarding_status == OnboardingStatus(status))
        except ValueError:
            pass

    if plan:
        try:
            query = query.where(Org.plan == PlanTier(plan))
        except ValueError:
            pass

    if city:
        query = query.where(Org.city == city)

    # Count
    count_result = await db.execute(query)
    total = len(count_result.scalars().all())

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(Org.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    orgs = result.scalars().all()

    return {
        "data": [o.to_dict() for o in orgs],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
        },
    }


@router.get("/orgs/{org_id}")
async def admin_get_org_detail(
    org_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed org info including health score."""
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Calculate health score
    health_score = calculate_org_health(org, db)

    # Recent onboarding events
    event_stmt = (
        select(OnboardingEvent)
        .where(OnboardingEvent.org_id == org_id)
        .order_by(OnboardingEvent.created_at.desc())
        .limit(10)
    )
    event_result = await db.execute(event_stmt)
    events = event_result.scalars().all()

    return {
        "data": {
            "org": org.to_dict(),
            "health_score": health_score,
            "onboarding_events": [
                {
                    "type": e.event_type,
                    "data": e.event_data,
                    "created_at": e.created_at.isoformat(),
                }
                for e in events
            ],
        }
    }


@router.get("/funnel")
async def onboarding_funnel(
    db: AsyncSession = Depends(get_db),
):
    """Detailed onboarding funnel with conversion rates."""
    stmt = select(OnboardingEvent).order_by(OnboardingEvent.created_at.desc())
    result = await db.execute(stmt)
    events = result.scalars().all()

    # Count by event type
    event_counts: dict[str, int] = {}
    for event in events:
        event_counts[event.event_type] = event_counts.get(event.event_type, 0) + 1

    # Calculate conversion rates between steps
    steps = [
        "signup",
        "gbp_connected",
        "whatsapp_connected",
        "territory_set",
        "onboarding_complete",
        "first_lead",
    ]

    funnel_data = []
    for i, step in enumerate(steps):
        count = event_counts.get(step, 0)
        prev_count = event_counts.get(steps[i - 1], count) if i > 0 else count
        conversion = (count / prev_count * 100) if prev_count > 0 else 100

        funnel_data.append({
            "step": step,
            "count": count,
            "conversion_from_previous": round(conversion, 1),
        })

    return {"data": funnel_data}


def calculate_org_health(org: Org, db: AsyncSession) -> dict[str, Any]:
    """Calculate a health score for an organization.

    Score based on:
    - Onboarding completion (30%)
    - Lead activity (30%)
    - GBP activity (20%)
    - Plan tier (20%)
    """
    score = 0
    reasons = []

    # Onboarding (30 points)
    if org.onboarding_status == OnboardingStatus.ACTIVE:
        score += 30
    elif org.onboarding_status == OnboardingStatus.ONBOARDING_COMPLETE:
        score += 25
    elif org.onboarding_status in (
        OnboardingStatus.TERRITORY_SET,
        OnboardingStatus.WHATSAPP_CONNECTED,
        OnboardingStatus.GBP_CONNECTED,
    ):
        score += 15
    else:
        reasons.append("Onboarding incomplete")

    # Plan tier (20 points)
    if org.plan == PlanTier.ENTERPRISE:
        score += 20
    elif org.plan == PlanTier.GROWTH:
        score += 15
    elif org.plan == PlanTier.STARTER:
        score += 10
    else:
        reasons.append("On free plan")

    # Lead activity (30 points) — simplified
    if org.guarantee_leads_generated > 20:
        score += 30
    elif org.guarantee_leads_generated > 10:
        score += 20
    elif org.guarantee_leads_generated > 0:
        score += 10
    else:
        reasons.append("No leads generated")

    # GBP activity (20 points) — simplified
    if org.guarantee_gbp_posts_delivered >= 4:
        score += 20
    elif org.guarantee_gbp_posts_delivered > 0:
        score += 10
    else:
        reasons.append("No GBP posts delivered")

    # Status label
    if score >= 80:
        label = "healthy"
    elif score >= 50:
        label = "needs_attention"
    else:
        label = "at_risk"

    return {
        "score": score,
        "max_score": 100,
        "label": label,
        "reasons": reasons,
    }
