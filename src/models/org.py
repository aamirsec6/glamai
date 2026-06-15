"""Organization (tenant) model — the core entity in GlamAI.

Each org represents one business using GlamAI (one interior designer,
one dental clinic, etc.).
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import Column, Enum as SAEnum, Index, Text
from sqlmodel import Field, SQLModel


class BusinessCategory(str, enum.Enum):
    """Supported business categories / verticals."""

    INTERIOR_DESIGN = "interior_design"
    DENTIST = "dentist"
    SALON = "salon"
    GYM = "gym"
    ARCHITECT = "architect"
    PHOTOGRAPHER = "photographer"
    RESTAURANT = "restaurant"
    OTHER = "other"


class PlanTier(str, enum.Enum):
    """Pricing plan tiers."""

    FREE = "free"               # Trial / demo
    STARTER = "starter"         # ₹1,999/mo — Top 3 guarantee, no exclusivity
    GROWTH = "growth"           # ₹4,999/mo — Top 3 + priority, no exclusivity
    ENTERPRISE = "enterprise"   # ₹7,999/mo — Top 1 guarantee, exclusivity


class ExclusivityTier(str, enum.Enum):
    """Exclusivity level for territory management."""

    STANDARD = "standard"       # No exclusivity, keyword niches partitioned
    EXCLUSIVE = "exclusive"     # No competing org in radius


class OnboardingStatus(str, enum.Enum):
    """Tracks where the org is in the onboarding flow."""

    CREATED = "created"                     # Account created, nothing else
    GBP_CONNECTED = "gbp_connected"         # Google Business Profile linked
    WHATSAPP_CONNECTED = "whatsapp_connected"  # WhatsApp number verified
    TERRITORY_SET = "territory_set"         # Territory/exclusivity configured
    ONBOARDING_COMPLETE = "onboarding_complete"  # Fully onboarded
    ACTIVE = "active"                       # Receiving leads, generating reports
    PAUSED = "paused"                       # Temporarily paused
    CHURNED = "churned"                     # Cancelled


class Org(SQLModel, table=True):
    """A business using GlamAI.

    This is the tenant entity. All other entities (leads, GBP data, reports)
    belong to an org.
    """

    __tablename__ = "orgs"

    # ── Primary Key ──────────────────────────────────────────
    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    # ── Business Identity ────────────────────────────────────
    name: str = Field(max_length=255, index=True)
    slug: str = Field(max_length=255, unique=True, index=True)
    category: BusinessCategory = Field(
        sa_column=Column(SAEnum(BusinessCategory), index=True),
    )
    description: str | None = Field(default=None, sa_column=Column(Text))
    website: str | None = Field(default=None, max_length=500)
    email: str = Field(max_length=255, index=True)
    phone: str = Field(max_length=20)  # Business phone

    # ── Address / Location ───────────────────────────────────
    address: str = Field(max_length=500)
    city: str = Field(max_length=100, index=True)
    state: str = Field(max_length=100)
    pincode: str = Field(max_length=10)
    latitude: float | None = Field(default=None, index=True)
    longitude: float | None = Field(default=None, index=True)

    # ── Plan & Billing ───────────────────────────────────────
    plan: PlanTier = Field(
        default=PlanTier.STARTER,
        sa_column=Column(SAEnum(PlanTier), index=True),
    )
    exclusivity: ExclusivityTier = Field(
        default=ExclusivityTier.STANDARD,
        sa_column=Column(SAEnum(ExclusivityTier)),
    )
    billing_amount_paise: int = Field(default=199900)  # ₹1,999 in paise
    billing_currency: str = Field(default="INR", max_length=3)
    billing_interval: str = Field(default="monthly", max_length=20)

    # ── Onboarding ───────────────────────────────────────────
    onboarding_status: OnboardingStatus = Field(
        default=OnboardingStatus.CREATED,
        sa_column=Column(SAEnum(OnboardingStatus), index=True),
    )
    onboarding_started_at: datetime | None = Field(default=None)
    onboarding_completed_at: datetime | None = Field(default=None)

    # ── Google Business Profile ──────────────────────────────
    gbp_place_id: str | None = Field(default=None, max_length=255, index=True)
    gbp_name: str | None = Field(default=None, max_length=255)
    gbp_status: str | None = Field(default=None, max_length=50)
    gbp_last_synced_at: datetime | None = Field(default=None)

    # ── WhatsApp ─────────────────────────────────────────────
    whatsapp_number: str | None = Field(default=None, max_length=20, index=True)
    whatsapp_business_id: str | None = Field(default=None, max_length=255)
    whatsapp_verified: bool = Field(default=False)
    whatsapp_connected_at: datetime | None = Field(default=None)

    # ── Guarantee Tracking ───────────────────────────────────
    guarantee_start_date: datetime | None = Field(default=None)
    guarantee_gbp_posts_delivered: int = Field(default=0)
    guarantee_reviews_collected: int = Field(default=0)
    guarantee_leads_generated: int = Field(default=0)

    # ── Metadata ─────────────────────────────────────────────
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True, index=True)
    notes: str | None = Field(default=None, sa_column=Column(Text))

    # ── Indexes ──────────────────────────────────────────────
    __table_args__ = (
        Index("ix_orgs_category_city", "category", "city"),
        Index("ix_orgs_plan_active", "plan", "is_active"),
    )

    # ── Properties ───────────────────────────────────────────
    @property
    def billing_amount_inr(self) -> float:
        """Return billing amount in INR (rupees, not paise)."""
        return self.billing_amount_paise / 100

    @property
    def is_fully_onboarded(self) -> bool:
        """Check if org has completed onboarding."""
        return self.onboarding_status in (
            OnboardingStatus.ONBOARDING_COMPLETE,
            OnboardingStatus.ACTIVE,
        )

    @property
    def territory_radius_km(self) -> float:
        """Get the territory radius for this org's category."""
        from src.config import get_settings

        settings = get_settings()
        return settings.get_territory_radius(self.category.value)

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "category": self.category.value,
            "description": self.description,
            "website": self.website,
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "pincode": self.pincode,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "plan": self.plan.value,
            "exclusivity": self.exclusivity.value,
            "onboarding_status": self.onboarding_status.value,
            "onboarding_started_at": (
                self.onboarding_started_at.isoformat() if self.onboarding_started_at else None
            ),
            "onboarding_completed_at": (
                self.onboarding_completed_at.isoformat() if self.onboarding_completed_at else None
            ),
            "gbp_place_id": self.gbp_place_id,
            "gbp_name": self.gbp_name,
            "gbp_status": self.gbp_status,
            "gbp_last_synced_at": (
                self.gbp_last_synced_at.isoformat() if self.gbp_last_synced_at else None
            ),
            "whatsapp_number": self.whatsapp_number,
            "whatsapp_verified": self.whatsapp_verified,
            "whatsapp_connected_at": (
                self.whatsapp_connected_at.isoformat() if self.whatsapp_connected_at else None
            ),
            "is_active": self.is_active,
            "billing_amount_inr": self.billing_amount_inr,
            "billing_amount_paise": self.billing_amount_paise,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
