"""Organization API routes."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select as sqlmodel_select

from src.database import get_db
from src.models.lead import Lead, LeadStatus
from src.models.notification import NotificationLog, OnboardingEvent
from src.models.org import (
    BusinessCategory,
    ExclusivityTier,
    OnboardingStatus,
    Org,
    PlanTier,
)
from src.models.territory import Territory
from src.services.territory.checker import TerritoryChecker

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

    # Track onboarding event
    event = OnboardingEvent(
        org_id=org.id,
        event_type="signup",
        event_data=f'{"category": "{data.category.value}"}',
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
    db: AsyncSession = Depends(get_db),
):
    """Get organization details."""
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return {"data": org.to_dict()}


@router.patch("/{org_id}", response_model=dict)
async def update_org(
    org_id: str,
    data: OrgUpdateSchema,
    db: AsyncSession = Depends(get_db),
):
    """Update organization details."""
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(org, key, value)

    org.updated_at = datetime.utcnow()
    db.add(org)
    await db.commit()
    await db.refresh(org)

    return {"data": org.to_dict()}


@router.get("/{org_id}/dashboard", response_model=dict)
async def get_org_dashboard(
    org_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get organization dashboard data (leads, GBP, reports summary)."""
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Lead summary
    lead_stmt = (
        select(Lead)
        .where(Lead.org_id == org_id)
        .order_by(Lead.created_at.desc())
        .limit(10)
    )
    lead_result = await db.execute(lead_stmt)
    recent_leads = lead_result.scalars().all()

    lead_count_stmt = select(Lead).where(Lead.org_id == org_id)
    lead_count_result = await db.execute(lead_count_stmt)
    all_leads = lead_count_result.scalars().all()

    leads_by_status = {}
    for status in LeadStatus:
        leads_by_status[status.value] = sum(
            1 for l in all_leads if l.status == status
        )

    return {
        "data": {
            "org": org.to_dict(),
            "leads": {
                "total": len(all_leads),
                "by_status": leads_by_status,
                "recent": [l.to_dict() for l in recent_leads[:5]],
            },
            "guarantee": {
                "leads_generated": org.guarantee_leads_generated,
                "posts_delivered": org.guarantee_gbp_posts_delivered,
                "reviews_collected": org.guarantee_reviews_collected,
            },
            "onboarding": {
                "status": org.onboarding_status.value,
                "is_complete": org.is_fully_onboarded,
            },
        }
    }
