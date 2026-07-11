"""Bulk synthetic data for journey analytics / admin funnel testing."""

from __future__ import annotations

import json
import random
from datetime import datetime, timedelta
from uuid import uuid4

import structlog
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.gbp import GbpInsights
from src.models.journey import JourneyEventType, UserJourneyEvent
from src.models.lead import BudgetRange, Lead, LeadScope, LeadSource, LeadStatus
from src.models.notification import OnboardingEvent
from src.models.org import BusinessCategory, OnboardingStatus, Org, PlanTier
from src.models.territory import Territory, TerritoryStatus

logger = structlog.get_logger(__name__)

BULK_SLUG_PREFIX = "seed-journey-"

CITIES = [
    ("Bangalore", "Karnataka", "560038", 12.97, 77.59),
    ("Mumbai", "Maharashtra", "400001", 19.07, 72.87),
    ("Delhi", "Delhi", "110001", 28.61, 77.20),
    ("Hyderabad", "Telangana", "500001", 17.38, 78.48),
    ("Pune", "Maharashtra", "411001", 18.52, 73.85),
    ("Chennai", "Tamil Nadu", "600001", 13.08, 80.27),
]

CATEGORIES = [
    BusinessCategory.INTERIOR_DESIGN,
    BusinessCategory.DENTIST,
    BusinessCategory.SALON,
    BusinessCategory.ARCHITECT,
    BusinessCategory.RESTAURANT,
]

PLANS = [PlanTier.STARTER, PlanTier.GROWTH, PlanTier.ENTERPRISE]
PLAN_BILLING = {
    PlanTier.STARTER: 199900,
    PlanTier.GROWTH: 499900,
    PlanTier.ENTERPRISE: 799900,
}

# Target distribution across final reached stage (sums to ~1.0)
STAGE_WEIGHTS: list[tuple[str, float]] = [
    ("created", 0.14),
    ("gbp_connected", 0.11),
    ("whatsapp_connected", 0.10),
    ("territory_set", 0.09),
    ("onboarding_complete", 0.08),
    ("first_lead", 0.12),
    ("active", 0.36),
]

STAGE_ORDER = [
    "signup",
    "gbp_connected",
    "whatsapp_connected",
    "territory_set",
    "onboarding_complete",
    "first_lead",
    "active",
]

STATUS_FOR_STAGE = {
    "created": OnboardingStatus.CREATED,
    "gbp_connected": OnboardingStatus.GBP_CONNECTED,
    "whatsapp_connected": OnboardingStatus.WHATSAPP_CONNECTED,
    "territory_set": OnboardingStatus.TERRITORY_SET,
    "onboarding_complete": OnboardingStatus.ONBOARDING_COMPLETE,
    "first_lead": OnboardingStatus.ACTIVE,
    "active": OnboardingStatus.ACTIVE,
}

FRICTION_ERRORS: dict[str, list[tuple[str, str]]] = {
    "gbp_connected": [
        ("error", "/client/onboarding", "gbp_oauth", "Google OAuth timeout after 30s"),
        ("error", "/client/onboarding", "gbp_oauth", "User cancelled Google consent"),
        ("error", "/client/onboarding", "gbp_oauth", "Permission denied for GBP scope"),
    ],
    "whatsapp_connected": [
        ("error", "/client/onboarding", "whatsapp_verify", "OTP not received"),
        ("error", "/client/onboarding", "whatsapp_verify", "Invalid verification code"),
        ("error", "/client/onboarding", "whatsapp_verify", "Number already registered"),
    ],
    "territory_set": [
        ("error", "/client/onboarding", "territory", "Territory conflict in 5km radius"),
        ("error", "/client/onboarding", "territory", "Pincode not serviceable"),
    ],
}

BUSINESS_PREFIXES = [
    "Studio", "Design", "Atelier", "Spaces", "Nova", "Elite", "Craft", "Luxe",
    "Urban", "Prime", "Aura", "Nest", "Form", "Axis", "Hue",
]


def _pick_stage(rng: random.Random) -> str:
    roll = rng.random()
    cumulative = 0.0
    for stage, weight in STAGE_WEIGHTS:
        cumulative += weight
        if roll <= cumulative:
            return stage
    return "active"


def _stage_index(stage: str) -> int:
    mapping = {
        "created": 0,
        "gbp_connected": 1,
        "whatsapp_connected": 2,
        "territory_set": 3,
        "onboarding_complete": 4,
        "first_lead": 5,
        "active": 6,
    }
    return mapping.get(stage, 0)


async def _purge_bulk_orgs(session: AsyncSession) -> int:
    from src.models.lead import WhatsappConversation

    orgs = (
        await session.execute(select(Org).where(Org.slug.like(f"{BULK_SLUG_PREFIX}%")))
    ).scalars().all()
    if not orgs:
        return 0

    org_ids = [o.id for o in orgs]
    for model, col in [
        (WhatsappConversation, WhatsappConversation.org_id),
        (UserJourneyEvent, UserJourneyEvent.org_id),
        (Lead, Lead.org_id),
        (GbpInsights, GbpInsights.org_id),
        (OnboardingEvent, OnboardingEvent.org_id),
        (Territory, Territory.org_id),
    ]:
        await session.execute(delete(model).where(col.in_(org_ids)))

    for org in orgs:
        await session.delete(org)
    await session.flush()
    return len(orgs)


async def seed_journey_analytics_bulk(
    session: AsyncSession,
    *,
    count: int = 120,
    reset: bool = False,
    seed: int = 42,
) -> dict[str, int]:
    """Seed many orgs across funnel stages for admin journey analytics."""
    if reset:
        removed = await _purge_bulk_orgs(session)
        logger.info("bulk_journey_purged", count=removed)

    existing = (
        await session.execute(
            select(func.count())
            .select_from(Org)
            .where(Org.slug.like(f"{BULK_SLUG_PREFIX}%"))
        )
    ).scalar() or 0

    if existing >= count:
        logger.info("bulk_journey_exists", count=existing)
        return {"created": 0, "total": existing}

    rng = random.Random(seed)
    now = datetime.utcnow()
    to_create = count - existing
    created = 0

    for i in range(to_create):
        idx = existing + i + 1
        final_stage = _pick_stage(rng)
        stage_idx = _stage_index(final_stage)

        city, state, pincode, lat, lon = rng.choice(CITIES)
        category = rng.choice(CATEGORIES)
        plan = rng.choices(PLANS, weights=[0.5, 0.35, 0.15], k=1)[0]
        prefix = rng.choice(BUSINESS_PREFIXES)
        area = rng.choice(
            ["Indiranagar", "Koramangala", "Whitefield", "HSR", "Jayanagar", "Andheri", "Bandra", "Powai"]
        )
        name = f"{prefix} {area} #{idx}"
        slug = f"{BULK_SLUG_PREFIX}{idx:04d}"

        signup_days_ago = rng.randint(3, 120)
        signup_at = now - timedelta(days=signup_days_ago, hours=rng.randint(0, 23))

        org = Org(
            name=name,
            slug=slug,
            category=category,
            email=f"hello+{idx}@journey-seed.demo",
            phone=f"9198{rng.randint(10000000, 99999999)}",
            address=f"{rng.randint(1, 999)} Main Road, {area}",
            city=city,
            state=state,
            pincode=pincode,
            latitude=lat + rng.uniform(-0.05, 0.05),
            longitude=lon + rng.uniform(-0.05, 0.05),
            plan=plan,
            billing_amount_paise=PLAN_BILLING[plan],
            onboarding_status=STATUS_FOR_STAGE[final_stage],
            onboarding_started_at=signup_at,
            is_active=final_stage in ("first_lead", "active"),
            created_at=signup_at,
            updated_at=now - timedelta(days=rng.randint(0, 5)),
        )

        if stage_idx >= 1:
            org.gbp_place_id = f"ChIJ_bulk_{uuid4().hex[:12]}"
            org.gbp_name = name
            org.gbp_status = "connected"
            sync_days = rng.randint(0, 14 if stage_idx > 1 else 30)
            org.gbp_last_synced_at = now - timedelta(days=sync_days)

        if stage_idx >= 2:
            org.whatsapp_number = org.phone
            org.whatsapp_verified = True
            org.whatsapp_connected_at = signup_at + timedelta(hours=rng.randint(4, 72))

        if stage_idx >= 4:
            org.onboarding_completed_at = signup_at + timedelta(days=rng.randint(2, 10))

        if stage_idx >= 5:
            lead_count = rng.randint(1, 8)
            org.guarantee_leads_generated = lead_count
            org.guarantee_start_date = signup_at + timedelta(days=rng.randint(5, 20))

        if stage_idx >= 6:
            org.guarantee_leads_generated = rng.randint(5, 25)
            org.guarantee_gbp_posts_delivered = rng.randint(2, 8)
            org.guarantee_reviews_collected = rng.randint(1, 12)

        session.add(org)
        await session.flush()

        # Onboarding event timeline
        cursor = signup_at
        events_to_emit = STAGE_ORDER[: stage_idx + 1]
        if final_stage == "created":
            events_to_emit = ["signup"]

        for step in events_to_emit:
            if step == "signup":
                ts = signup_at
            else:
                hours = rng.randint(2, 48) if step != "first_lead" else rng.randint(24, 120)
                cursor = cursor + timedelta(hours=hours)
                ts = cursor
            session.add(
                OnboardingEvent(
                    org_id=org.id,
                    event_type=step,
                    event_data=json.dumps({"seed": True, "bulk": True}),
                    created_at=ts,
                )
            )

        # Territory
        if stage_idx >= 3:
            session.add(
                Territory(
                    org_id=org.id,
                    center_latitude=org.latitude or lat,
                    center_longitude=org.longitude or lon,
                    radius_km=5.0,
                    city=city,
                    category=category.value,
                    is_exclusive=plan == PlanTier.ENTERPRISE,
                    status=TerritoryStatus.ACTIVE,
                )
            )

        # GBP insights for connected orgs
        if stage_idx >= 1:
            period_end = now - timedelta(days=rng.randint(0, 7))
            period_start = period_end - timedelta(days=30)
            session.add(
                GbpInsights(
                    org_id=org.id,
                    period_start=period_start,
                    period_end=period_end,
                    recorded_at=period_end,
                    total_views=rng.randint(50, 3500),
                    search_views=rng.randint(20, 1200),
                    maps_views=rng.randint(30, 2300),
                    website_clicks=rng.randint(5, 180),
                    calls=rng.randint(2, 90),
                    direction_requests=rng.randint(3, 120),
                )
            )

        # Leads
        if stage_idx >= 5:
            n_leads = org.guarantee_leads_generated or rng.randint(1, 5)
            for li in range(n_leads):
                session.add(
                    Lead(
                        org_id=org.id,
                        source=rng.choice(list(LeadSource)),
                        contact_name=f"Lead {li + 1} {area}",
                        contact_phone=f"9197{rng.randint(10000000, 99999999)}",
                        status=rng.choice(
                            [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUOTED, LeadStatus.WON]
                        ),
                        scope=rng.choice(list(LeadScope)),
                        budget_range=rng.choice(list(BudgetRange)),
                        ai_qualification_score=round(rng.uniform(0.4, 0.95), 2),
                        created_at=signup_at + timedelta(days=rng.randint(5, max(6, signup_days_ago - 1))),
                    )
                )

        # Journey friction for stuck orgs (didn't progress past current stage)
        stuck_stages = {
            "created": "gbp_connected",
            "gbp_connected": "whatsapp_connected",
            "whatsapp_connected": "territory_set",
            "territory_set": "onboarding_complete",
        }
        if final_stage in stuck_stages:
            friction_stage = stuck_stages[final_stage]
            errors = FRICTION_ERRORS.get(friction_stage, FRICTION_ERRORS["gbp_connected"])
            for _ in range(rng.randint(1, 3)):
                etype, page, step, desc = rng.choice(errors)
                session.add(
                    UserJourneyEvent(
                        org_id=org.id,
                        session_id=f"bulk-{uuid4().hex[:8]}",
                        event_type=etype,
                        page=page,
                        element=step,
                        description=desc,
                        metadata_json=json.dumps({"step": friction_stage, "seed": True}),
                        created_at=now - timedelta(days=rng.randint(1, min(signup_days_ago, 30))),
                    )
                )

        # Normal journey page views for progressed orgs
        if stage_idx >= 2:
            for page in ["/client/onboarding", "/client", "/client/insights"]:
                session.add(
                    UserJourneyEvent(
                        org_id=org.id,
                        session_id=f"bulk-{uuid4().hex[:8]}",
                        event_type=JourneyEventType.PAGE_VIEW.value,
                        page=page,
                        description=f"page_view: {page}",
                        created_at=signup_at + timedelta(days=rng.randint(1, signup_days_ago)),
                    )
                )

        created += 1
        if created % 25 == 0:
            await session.flush()

    await session.commit()
    total = existing + created
    logger.info("bulk_journey_seeded", created=created, total=total)
    return {"created": created, "total": total, "purged": 0}
