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
from src.models.notification import OnboardingEvent
from src.services.tenant.audit import log_tenant_event
from src.models.org import (
    BusinessCategory,
    ExclusivityTier,
    OnboardingStatus,
    Org,
    PlanTier,
)
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
    clerk_user_id: str | None = None
    clerk_email: str | None = None


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
    state: str | None = None
    pincode: str | None = None


class GeocodeSchema(BaseModel):
    address: str | None = None
    save: bool = True


_ONBOARDING_ORDER = [
    OnboardingStatus.CREATED,
    OnboardingStatus.GBP_CONNECTED,
    OnboardingStatus.WHATSAPP_CONNECTED,
    OnboardingStatus.TERRITORY_SET,
    OnboardingStatus.ONBOARDING_COMPLETE,
    OnboardingStatus.ACTIVE,
]

# WhatsApp is optional — may skip whatsapp_connected in the sequence
_SKIPPABLE = {OnboardingStatus.WHATSAPP_CONNECTED}


def _validate_onboarding_transition(
    current: OnboardingStatus, new: OnboardingStatus
) -> None:
    """Prevent skipping required onboarding steps (WhatsApp is skippable)."""
    if new in (OnboardingStatus.PAUSED, OnboardingStatus.CHURNED):
        return
    try:
        cur_idx = _ONBOARDING_ORDER.index(current)
        new_idx = _ONBOARDING_ORDER.index(new)
    except ValueError:
        return
    if new_idx <= cur_idx + 1:
        return
    # Allow jumping over skippable steps only
    skipped = set(_ONBOARDING_ORDER[cur_idx + 1 : new_idx])
    if skipped and skipped.issubset(_SKIPPABLE):
        return
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
    slug = (
        data.name.lower()
        .replace(" ", "-")
        .replace(".", "")
        .replace(",", "")
        + "-"
        + str(uuid4())[:8]
    )

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

    event = OnboardingEvent(
        org_id=org.id,
        event_type="signup",
        event_data=json.dumps({"category": data.category.value}),
    )
    db.add(event)

    member_error: str | None = None
    if data.clerk_user_id:
        from src.models.member import OrgMember, OrgMemberRole

        try:
            existing_m = (
                await db.execute(
                    select(OrgMember).where(
                        OrgMember.clerk_user_id == data.clerk_user_id,
                        OrgMember.org_id == org.id,
                    )
                )
            ).scalar_one_or_none()
            if not existing_m:
                db.add(
                    OrgMember(
                        id=str(uuid4()),
                        clerk_user_id=data.clerk_user_id,
                        org_id=org.id,
                        role=OrgMemberRole.OWNER,
                        email=data.clerk_email or data.email,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                )
        except Exception as e:
            member_error = str(e)

    await db.commit()
    await db.refresh(org)

    payload: dict[str, Any] = {
        "data": org.to_dict(),
        "message": "Organization created. Continue onboarding.",
        "next_steps": [
            "Connect Google Business Profile",
            "Confirm location and keywords",
            "Optionally add WhatsApp",
        ],
    }
    if member_error:
        payload["member_link_error"] = member_error
    return payload


@router.get("/mine", response_model=dict)
async def list_my_orgs(
    clerk_user_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """List orgs linked to a Clerk user (multi-tenant switcher)."""
    from src.models.member import OrgMember

    rows = (
        await db.execute(select(OrgMember).where(OrgMember.clerk_user_id == clerk_user_id))
    ).scalars().all()
    orgs_out = []
    for m in rows:
        if not m.org_id:
            continue
        org = await db.get(Org, m.org_id)
        if not org or not org.is_active:
            continue
        orgs_out.append(
            {
                **org.to_dict(),
                "role": m.role.value,
            }
        )
    return {"data": orgs_out}


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


@router.post("/{org_id}/geocode", response_model=dict)
async def geocode_org(
    org_id: str,
    body: GeocodeSchema,
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Geocode org address (or provided address) and optionally save lat/lng."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    address = body.address or org.address
    if not address:
        raise HTTPException(status_code=400, detail="Address is required to geocode")

    from src.integrations.base import ConnectorResource
    from src.integrations.google_places import GooglePlacesConnector

    places = GooglePlacesConnector(db)
    try:
        result = await places.pull(org_id, ConnectorResource.GEOCODE, address=address)
    finally:
        await places.close()

    if not result.ok:
        raise HTTPException(
            status_code=502,
            detail=result.error or "Geocode failed",
        )

    lat = result.data["latitude"]
    lng = result.data["longitude"]
    formatted = result.data.get("formatted_address")

    if body.save:
        org.latitude = lat
        org.longitude = lng
        if formatted:
            org.address = formatted
        org.updated_at = datetime.utcnow()
        db.add(org)
        await db.commit()
        await db.refresh(org)

    return {
        "data": {
            "latitude": lat,
            "longitude": lng,
            "formatted_address": formatted,
            "saved": body.save,
        }
    }


@router.get("/{org_id}/setup", response_model=dict)
async def get_org_setup(
    org_id: str,
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Setup readiness checklist for client onboarding."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    from src.models.integration import IntegrationProvider, OrgIntegration, OrgSettings
    from src.models.territory import KeywordNiche, Territory, TerritoryStatus

    territory = (
        await db.execute(
            select(Territory).where(
                Territory.org_id == org_id,
                Territory.status == TerritoryStatus.ACTIVE,
            )
        )
    ).scalar_one_or_none()
    niche_count = len(
        (
            await db.execute(
                select(KeywordNiche).where(
                    KeywordNiche.org_id == org_id,
                    KeywordNiche.status == TerritoryStatus.ACTIVE,
                )
            )
        ).scalars().all()
    )
    settings_row = (
        await db.execute(select(OrgSettings).where(OrgSettings.org_id == org_id))
    ).scalar_one_or_none()
    integration = (
        await db.execute(
            select(OrgIntegration).where(
                OrgIntegration.org_id == org_id,
                OrgIntegration.provider == IntegrationProvider.GOOGLE_GBP,
            )
        )
    ).scalar_one_or_none()

    business_profile = bool(org.name and org.email and org.phone and org.address and org.category)
    gbp_connected = bool(org.gbp_place_id and integration)
    location = org.latitude is not None and org.longitude is not None
    territory_ok = territory is not None
    keywords_ok = niche_count > 0
    whatsapp = bool(org.whatsapp_number)
    settings_ok = settings_row is not None
    ready = gbp_connected and location and territory_ok and keywords_ok

    checklist = {
        "business_profile": {"done": business_profile, "required": True},
        "gbp_connected": {"done": gbp_connected, "required": True},
        "location": {"done": location, "required": True},
        "territory": {"done": territory_ok, "required": True},
        "keywords": {"done": keywords_ok, "required": True},
        "whatsapp": {"done": whatsapp, "required": False},
        "settings": {"done": settings_ok, "required": False},
    }
    missing = [k for k, v in checklist.items() if v["required"] and not v["done"]]

    return {
        "data": {
            "org_id": org_id,
            "onboarding_status": org.onboarding_status.value,
            "is_complete": org.is_fully_onboarded,
            "ready_for_agents": ready and org.is_fully_onboarded,
            "checklist": checklist,
            "missing_required": missing,
            "keyword_count": niche_count,
            "next_path": "/client/onboarding" if missing or not org.is_fully_onboarded else None,
        }
    }


@router.post("/{org_id}/complete-onboarding", response_model=dict)
async def complete_onboarding(
    org_id: str,
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Finalize onboarding: OrgSettings, status active, enqueue geo bootstrap."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    from src.models.integration import IntegrationProvider, OrgIntegration, OrgSettings
    from src.models.territory import KeywordNiche, Territory, TerritoryStatus

    integration = (
        await db.execute(
            select(OrgIntegration).where(
                OrgIntegration.org_id == org_id,
                OrgIntegration.provider == IntegrationProvider.GOOGLE_GBP,
            )
        )
    ).scalar_one_or_none()
    if not org.gbp_place_id or not integration:
        raise HTTPException(status_code=400, detail="Connect Google Business Profile first")
    if org.latitude is None or org.longitude is None:
        raise HTTPException(status_code=400, detail="Set location (geocode) first")

    territory = (
        await db.execute(
            select(Territory).where(
                Territory.org_id == org_id,
                Territory.status == TerritoryStatus.ACTIVE,
            )
        )
    ).scalar_one_or_none()
    if not territory:
        raise HTTPException(status_code=400, detail="Claim a territory first")

    niches = (
        await db.execute(
            select(KeywordNiche).where(
                KeywordNiche.org_id == org_id,
                KeywordNiche.status == TerritoryStatus.ACTIVE,
            )
        )
    ).scalars().all()
    if not niches:
        raise HTTPException(status_code=400, detail="Keyword niches required")

    settings_row = (
        await db.execute(select(OrgSettings).where(OrgSettings.org_id == org_id))
    ).scalar_one_or_none()
    if not settings_row:
        db.add(
            OrgSettings(
                org_id=org_id,
                timezone="Asia/Kolkata",
                notify_new_leads=True,
                notify_monthly_reports=True,
            )
        )

    # Advance status without illegal jumps (WhatsApp may be skipped)
    target_sequence = [
        OnboardingStatus.TERRITORY_SET,
        OnboardingStatus.ONBOARDING_COMPLETE,
        OnboardingStatus.ACTIVE,
    ]
    for target in target_sequence:
        try:
            cur_idx = _ONBOARDING_ORDER.index(org.onboarding_status)
            tgt_idx = _ONBOARDING_ORDER.index(target)
        except ValueError:
            continue
        if tgt_idx <= cur_idx:
            continue
        _validate_onboarding_transition(org.onboarding_status, target)
        org.onboarding_status = target

    org.onboarding_completed_at = datetime.utcnow()
    org.updated_at = datetime.utcnow()
    db.add(org)
    db.add(
        OnboardingEvent(
            org_id=org_id,
            event_type="onboarding_complete",
            event_data=json.dumps({"status": org.onboarding_status.value}),
        )
    )
    await db.commit()
    await db.refresh(org)

    geo_task_id: str | None = None
    try:
        from src.workers.geo_tasks import run_geo_agent_for_org

        task = run_geo_agent_for_org.delay(org_id)
        geo_task_id = task.id
    except Exception:
        geo_task_id = None

    return {
        "data": org.to_dict(),
        "message": "Onboarding complete",
        "geo_task_id": geo_task_id,
    }


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
