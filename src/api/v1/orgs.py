"""Organization API routes."""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select as sqlmodel_select

from src.core.database import get_db
from src.models.lead import Lead, LeadStatus
from src.models.notification import NotificationLog, OnboardingEvent
from src.services.tenant.audit import log_tenant_event
from src.models.org import (
    BusinessCategory,
    ExclusivityTier,
    OnboardingStatus,
    Org,
    PlanTier,
)
from src.models.territory import Territory
from src.services.territory.checker import TerritoryChecker
from src.core.deps import assert_tenant_access

router = APIRouter(prefix="/v1/orgs", tags=["Organizations"])


# ── Pydantic Schemas (inline for MVP) ────────────────────────

from pydantic import BaseModel


class OrgCreateSchema(BaseModel):
    name: str
    category: BusinessCategory
    email: str
    phone: str
    address: str
    city: str = "Bangalore"
    state: str = "Karnataka"
    pincode: str = ""
    website: str | None = None
    plan: PlanTier = PlanTier.STARTER
    exclusivity: ExclusivityTier = ExclusivityTier.STANDARD


class OrgUpdateSchema(BaseModel):
    name: str | None = None
    phone: str | None = None
    website: str | None = None
    plan: PlanTier | None = None
    onboarding_status: OnboardingStatus | None = None
    notes: str | None = None
    whatsapp_number: str | None = None
    whatsapp_verified: bool | None = None
    latitude: float | None = None
    longitude: float | None = None
    address: str | None = None
    city: str | None = None


_ONBOARDING_ORDER = [
    OnboardingStatus.CREATED,
    OnboardingStatus.GBP_CONNECTED,
    OnboardingStatus.WHATSAPP_CONNECTED,
    OnboardingStatus.TERRITORY_SET,
    OnboardingStatus.ONBOARDING_COMPLETE,
    OnboardingStatus.ACTIVE,
]


def _validate_onboarding_transition(
    current: OnboardingStatus, new: OnboardingStatus
) -> None:
    """Prevent skipping onboarding steps."""
    if new in (OnboardingStatus.PAUSED, OnboardingStatus.CHURNED):
        return
    try:
        cur_idx = _ONBOARDING_ORDER.index(current)
        new_idx = _ONBOARDING_ORDER.index(new)
    except ValueError:
        return
    if new_idx > cur_idx + 1:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot skip onboarding from {current.value} to {new.value}",
        )


class OrgDetailSchema(BaseModel):
    id: str
    name: str
    slug: str
    category: str
    city: str
    plan: str
    exclusivity: str
    onboarding_status: str
    is_active: bool
    billing_amount_inr: float
    whatsapp_number: str | None = None
    whatsapp_verified: bool
    gbp_place_id: str | None = None
    guarantee_leads_generated: int = 0
    created_at: str | None = None


# ── Routes ────────────────────────────────────────────────────

@router.post("/", response_model=dict, status_code=201)
async def create_org(
    data: OrgCreateSchema,
    db: AsyncSession = Depends(get_db),
):
    """Create a new organization (client onboarding)."""
    # Check for territory conflicts if location provided
    if data.category and data.city:
        checker = TerritoryChecker()
        # We need lat/lng for conflict check — skip if not available
        # Conflict check happens during full onboarding

    # Generate slug
    slug = (
        data.name.lower()
        .replace(" ", "-")
        .replace(".", "")
        .replace(",", "")
        + "-"
        + str(uuid4())[:8]
    )

    # Map plan to price
    price_map = {
        PlanTier.FREE: 0,
        PlanTier.STARTER: 199900,
        PlanTier.GROWTH: 499900,
        PlanTier.ENTERPRISE: 799900,
    }

    org = Org(
        name=data.name,
        slug=slug,
        category=data.category,
        email=data.email,
        phone=data.phone,
        address=data.address,
        city=data.city,
        state=data.state,
        pincode=data.pincode,
        website=data.website,
        plan=data.plan,
        exclusivity=data.exclusivity,
        billing_amount_paise=price_map[data.plan],
        onboarding_status=OnboardingStatus.CREATED,
        onboarding_started_at=datetime.utcnow(),
    )

    db.add(org)
    await db.flush()

    # Track onboarding event
    event = OnboardingEvent(
        org_id=org.id,
        event_type="signup",
        event_data=json.dumps({"category": data.category.value}),
    )
    db.add(event)

    await db.commit()
    await db.refresh(org)

    return {
        "data": org.to_dict(),
        "message": "Organization created. Continue onboarding.",
        "next_steps": [
            "Connect Google Business Profile",
            "Connect WhatsApp number",
            "Set territory/exclusivity",
        ],
    }


@router.get("/{org_id}", response_model=dict)
async def get_org(
    org_id: str,
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Get organization details."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return {"data": org.to_dict()}


@router.patch("/{org_id}", response_model=dict)
async def update_org(
    org_id: str,
    data: OrgUpdateSchema,
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Update organization details."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = data.model_dump(exclude_unset=True)
    prev_status = org.onboarding_status
    if "onboarding_status" in update_data and update_data["onboarding_status"] is not None:
        _validate_onboarding_transition(org.onboarding_status, update_data["onboarding_status"])
        if update_data["onboarding_status"] in (
            OnboardingStatus.ONBOARDING_COMPLETE,
            OnboardingStatus.ACTIVE,
        ):
            org.onboarding_completed_at = datetime.utcnow()

    if "whatsapp_number" in update_data and update_data["whatsapp_number"]:
        update_data["whatsapp_number"] = update_data["whatsapp_number"].strip().lstrip("+")
        org.whatsapp_connected_at = datetime.utcnow()

    for key, value in update_data.items():
        if value is not None:
            setattr(org, key, value)

    org.updated_at = datetime.utcnow()
    db.add(org)

    if (
        "onboarding_status" in update_data
        and update_data["onboarding_status"] is not None
        and org.onboarding_status != prev_status
    ):
        await log_tenant_event(
            db,
            org_id,
            org.onboarding_status.value,
            {"from": prev_status.value},
        )

    await db.commit()
    await db.refresh(org)

    return {"data": org.to_dict()}


@router.get("/{org_id}/dashboard", response_model=dict)
async def get_org_dashboard(
    org_id: str,
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Get organization dashboard data (leads, GBP, reports summary)."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    from dataclasses import asdict

    from src.analytics.analysis import AnalysisEngine

    period_days = 30
    since = datetime.utcnow() - timedelta(days=period_days)

    # Lead summary (rolling 30-day window for live metrics)
    lead_stmt = (
        select(Lead)
        .where(Lead.org_id == org_id, Lead.created_at >= since)
        .order_by(Lead.created_at.desc())
        .limit(10)
    )
    lead_result = await db.execute(lead_stmt)
    recent_leads = lead_result.scalars().all()

    period_leads_stmt = select(Lead).where(Lead.org_id == org_id, Lead.created_at >= since)
    period_leads = (await db.execute(period_leads_stmt)).scalars().all()

    leads_by_status = {}
    for status in LeadStatus:
        leads_by_status[status.value] = sum(
            1 for l in period_leads if l.status == status
        )

    analysis_engine = AnalysisEngine(db)
    tenant_analysis = await analysis_engine.analyze(org_id, period_days=period_days)
    snapshot = asdict(tenant_analysis.snapshot)

    return {
        "data": {
            "org": org.to_dict(),
            "leads": {
                "total": len(period_leads),
                "period_days": period_days,
                "by_status": leads_by_status,
                "recent": [l.to_dict() for l in recent_leads[:5]],
            },
            "gbp": {
                "connected": bool(org.gbp_place_id),
                "last_synced_at": snapshot.get("last_synced_at"),
                "total_views": snapshot.get("gbp_total_views", 0),
                "website_clicks": snapshot.get("gbp_website_clicks", 0),
                "calls": snapshot.get("gbp_calls", 0),
                "direction_requests": snapshot.get("gbp_direction_requests", 0),
                "avg_rating": snapshot.get("gbp_avg_rating"),
                "review_count": snapshot.get("gbp_review_count"),
            },
            "analytics": {
                "scores": tenant_analysis.scores,
                "trends": tenant_analysis.trends,
                "recommendations": tenant_analysis.recommendations[:5],
                "anomalies": tenant_analysis.anomalies[:3],
            },
            "guarantee": {
                "leads_generated": len(period_leads),
                "posts_delivered": org.guarantee_gbp_posts_delivered,
                "reviews_collected": org.guarantee_reviews_collected,
            },
            "onboarding": {
                "status": org.onboarding_status.value,
                "is_complete": org.is_fully_onboarded,
            },
        }
    }
