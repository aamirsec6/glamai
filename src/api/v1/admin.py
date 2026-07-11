"""Admin analytics API routes.

Provides the backend for the admin dashboard showing:
- Onboarding funnel
- Active orgs metrics
- Revenue metrics
- Territory overview
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.deps import verify_admin_secret
from src.core.database import get_db
from src.models.gbp import GbpInsights, GbpPost, GbpPostStatus
from src.models.journey import UserJourneyEvent
from src.models.lead import Lead, LeadSource, LeadStatus
from src.models.notification import OnboardingEvent
from src.models.org import OnboardingStatus, Org, PlanTier
from src.models.report import MonthlyReport
from src.models.territory import Territory, TerritoryStatus

router = APIRouter(
    prefix="/v1/admin",
    tags=["Admin"],
    dependencies=[Depends(verify_admin_secret)],
)


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
    """Get detailed org info including health score and tenant stats."""
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    health_score = calculate_org_health(org, db)

    event_stmt = (
        select(OnboardingEvent)
        .where(OnboardingEvent.org_id == org_id)
        .order_by(OnboardingEvent.created_at.desc())
        .limit(20)
    )
    event_result = await db.execute(event_stmt)
    events = event_result.scalars().all()

    lead_result = await db.execute(select(Lead).where(Lead.org_id == org_id))
    leads = lead_result.scalars().all()

    post_result = await db.execute(select(GbpPost).where(GbpPost.org_id == org_id))
    posts = post_result.scalars().all()

    territory_result = await db.execute(
        select(Territory).where(Territory.org_id == org_id)
    )
    territories = territory_result.scalars().all()

    insights_result = await db.execute(
        select(GbpInsights)
        .where(GbpInsights.org_id == org_id)
        .order_by(GbpInsights.period_start.desc())
        .limit(1)
    )
    latest_insights = insights_result.scalars().first()

    return {
        "data": {
            "org": org.to_dict(),
            "health_score": health_score,
            "stats": {
                "leads_total": len(leads),
                "leads_won": sum(1 for l in leads if l.status == LeadStatus.WON),
                "gbp_posts_total": len(posts),
                "gbp_posts_published": sum(
                    1 for p in posts if p.status == GbpPostStatus.PUBLISHED
                ),
                "gbp_connected": bool(org.gbp_place_id),
                "whatsapp_connected": bool(org.whatsapp_number and org.whatsapp_verified),
                "territory_claimed": len(territories) > 0,
                "last_gbp_sync": (
                    org.gbp_last_synced_at.isoformat() if org.gbp_last_synced_at else None
                ),
                "latest_insights_views": (
                    latest_insights.total_views if latest_insights else None
                ),
            },
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


@router.get("/orgs/{org_id}/activity")
async def admin_org_activity(
    org_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Tenant activity feed for admin (onboarding + lifecycle events)."""
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    event_result = await db.execute(
        select(OnboardingEvent)
        .where(OnboardingEvent.org_id == org_id)
        .order_by(OnboardingEvent.created_at.desc())
        .limit(limit)
    )
    events = event_result.scalars().all()

    return {
        "data": {
            "org_id": org_id,
            "org_name": org.name,
            "events": [
                {
                    "id": e.id,
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
    period_days: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Detailed onboarding funnel with conversion rates."""
    from src.application.admin import AdminFacade

    facade = AdminFacade(db)
    return {"data": await facade.onboarding_funnel(period_days=period_days)}


@router.get("/journey-analytics")
async def journey_analytics(
    period_days: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Blinkit-style journey metrics, funnel deep dive, and root-cause insights."""
    from src.application.admin import AdminFacade

    facade = AdminFacade(db)
    return {"data": await facade.journey_analytics(period_days=period_days)}


@router.get("/orgs/{org_id}/journey")
async def get_org_journey(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
):
    """Get user journey events for a specific org, grouped by session."""
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    stmt = (
        select(UserJourneyEvent)
        .where(UserJourneyEvent.org_id == org_id)
        .order_by(UserJourneyEvent.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    events = result.scalars().all()

    sessions: dict[str, list[dict[str, Any]]] = {}
    for event in events:
        if event.session_id not in sessions:
            sessions[event.session_id] = []
        sessions[event.session_id].append({
            "id": event.id,
            "event_type": event.event_type,
            "page": event.page,
            "element": event.element,
            "description": event.description,
            "metadata": json.loads(event.metadata_json) if event.metadata_json else {},
            "created_at": event.created_at.isoformat(),
        })

    session_list = [
        {
            "session_id": sid,
            "org_id": org_id,
            "org_name": org.name,
            "started_at": events_in_session[-1]["created_at"] if events_in_session else None,
            "last_activity_at": events_in_session[0]["created_at"] if events_in_session else None,
            "events": events_in_session,
            "total_events": len(events_in_session),
            "pages_visited": list({e["page"] for e in events_in_session if e["page"]}),
            "errors_count": sum(1 for e in events_in_session if e["event_type"] == "error"),
            "completed_actions": [
                e["description"]
                for e in events_in_session
                if e["event_type"] in ("form_submit", "onboarding_step", "lead_created")
            ],
        }
        for sid, events_in_session in sessions.items()
    ]
    session_list.sort(key=lambda s: s.get("last_activity_at") or "", reverse=True)

    return {"data": session_list}


@router.get("/workflows/insights")
async def workflow_insights(db: AsyncSession = Depends(get_db)):
    """AI-powered workflow insights for the admin dashboard."""
    from src.services.admin.workflow_insights import build_workflow_insights

    return {"data": await build_workflow_insights(db)}


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


@router.get("/intelligence")
async def platform_intelligence(
    cohort_months: int = Query(6, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
):
    """Cohort analysis and churn prediction across all GlamAI clients."""
    from src.application.admin import AdminFacade

    facade = AdminFacade(db)
    return {"data": await facade.platform_intelligence(cohort_months=cohort_months)}


@router.get("/pilot-status")
async def admin_pilot_status(
    period_days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Live pilot health per org — GBP, WhatsApp, sync freshness, leads, analysis."""
    from src.services.admin.pilot_status import PilotStatusService

    service = PilotStatusService(db)
    return {"data": await service.build_all(period_days=period_days)}


class AdminMessageBody(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    channel: str = Field(default="whatsapp")


@router.post("/orgs/{org_id}/pause")
async def admin_pause_org(org_id: str, db: AsyncSession = Depends(get_db)):
    """Pause a client account (admin quick action)."""
    from src.services.admin.org_actions import pause_org

    return {"data": await pause_org(db, org_id)}


@router.post("/orgs/{org_id}/resume")
async def admin_resume_org(org_id: str, db: AsyncSession = Depends(get_db)):
    """Resume a paused client account."""
    from src.services.admin.org_actions import resume_org

    return {"data": await resume_org(db, org_id)}


@router.post("/orgs/{org_id}/message")
async def admin_send_org_message(
    org_id: str,
    body: AdminMessageBody,
    db: AsyncSession = Depends(get_db),
):
    """Send WhatsApp (or log) message to client from admin."""
    from src.services.admin.org_actions import send_org_message

    return {"data": await send_org_message(db, org_id, body.message, channel=body.channel)}


def _integration_status(configured: bool, label: str = "configured") -> str:
    return label if configured else "not_configured"


@router.get("/settings")
async def admin_settings():
    """Platform configuration overview for the admin settings page (no secrets)."""
    from src.core.config import get_settings

    s = get_settings()
    wa_key = s.whatsapp_api_key or s.whatsapp_360dialog_api_key

    return {
        "data": {
            "environment": s.app_env,
            "app_base_url": s.app_base_url,
            "database": {
                "url_host": s.database_url.split("@")[-1] if "@" in s.database_url else "local",
                "pool_size": s.database_pool_size,
            },
            "integrations": {
                "clerk": {
                    "status": "dashboard_env",
                    "note": "Configured in dashboard/.env (NEXT_PUBLIC_CLERK_*)",
                },
                "google_gbp": {
                    "status": _integration_status(bool(s.google_client_id and s.google_client_secret)),
                    "oauth_redirect": s.google_redirect_uri,
                    "places_api": _integration_status(bool(s.google_places_api_key)),
                },
                "whatsapp": {
                    "status": _integration_status(bool(wa_key)),
                    "provider": s.whatsapp_provider,
                    "phone_number_id": bool(s.whatsapp_phone_number_id),
                },
                "llm": {
                    "provider": s.llm_provider,
                    "status": _integration_status(
                        s.llm_provider == "ollama" or bool(s.anthropic_api_key)
                    ),
                    "model": s.anthropic_model if s.llm_provider == "anthropic" else s.ollama_model,
                    "ollama_url": s.ollama_base_url if s.llm_provider == "ollama" else None,
                },
                "email_resend": {
                    "status": _integration_status(bool(s.resend_api_key)),
                    "from_email": s.resend_from_email,
                },
                "redis": {
                    "status": _integration_status(bool(s.redis_url)),
                    "url": s.redis_url.split("@")[-1] if "@" in s.redis_url else s.redis_url,
                },
                "admin_api_secret": {
                    "status": _integration_status(bool(s.admin_api_secret)),
                },
                "encryption_key": {
                    "status": _integration_status(bool(s.encryption_key)),
                },
            },
            "feature_flags": {
                "review_engine": s.feature_review_engine,
                "reengagement": s.feature_reengagement,
                "content_generator": s.feature_content_generator,
                "multi_city": s.feature_multi_city,
                "multi_vertical": s.feature_multi_vertical,
            },
            "territory_defaults_km": s.territory_radius_for_category,
            "pricing_inr": {
                "starter": s.price_starter_paise / 100,
                "growth": s.price_growth_paise / 100,
                "enterprise": s.price_enterprise_paise / 100,
            },
            "guarantees": {
                "gbp_posts_per_month": s.guarantee_gbp_posts_per_month,
                "whatsapp_response_seconds": s.guarantee_whatsapp_response_seconds,
                "review_target": s.guarantee_review_target,
                "review_period_days": s.guarantee_review_period_days,
                "leads_starter": s.guarantee_leads_target_starter,
                "leads_growth": s.guarantee_leads_target_growth,
                "leads_enterprise": s.guarantee_leads_target_enterprise,
            },
            "marketing_agent": {
                "campaign_repeat_sale_days": s.campaign_repeat_sale_days,
                "campaign_stale_lead_days": s.campaign_stale_lead_days,
                "review_request_delay_hours": s.review_request_delay_hours,
            },
            "note": "Feature flags and pricing are loaded from server .env. Change values there and restart the API.",
        }
    }
