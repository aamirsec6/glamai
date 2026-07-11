"""Demo account seeding — realistic data for client demos."""

from __future__ import annotations

from datetime import datetime, timedelta
from uuid import uuid4

import structlog
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.gbp import (
    GbpCompetitor,
    GbpInsights,
    GbpPost,
    GbpPostStatus,
    GbpPostType,
    GbpProfileSnapshot,
    GbpRanking,
)
from src.models.lead import (
    BudgetRange,
    Lead,
    LeadScope,
    LeadSource,
    LeadStatus,
    MessageDirection,
    MessageSender,
    WhatsappConversation,
)
from src.models.campaign import MarketingCampaign
from src.models.notification import OnboardingEvent
from src.models.org import BusinessCategory, OnboardingStatus, Org, PlanTier
from src.models.report import MonthlyReport, ReportStatus
from src.models.review import GbpReview, ReviewReplyStatus

logger = structlog.get_logger(__name__)

DEMO_SLUG = "studio-indiranagar-demo"
DEMO_NAME = "Studio Indiranagar"


async def _purge_org(session: AsyncSession, org_id: str) -> None:
    """Remove child rows before deleting a demo org."""
    from src.models.member import OrgMember
    from src.models.review import ReviewRequest
    from src.models.territory import Territory

    await session.execute(delete(WhatsappConversation).where(WhatsappConversation.org_id == org_id))
    await session.execute(delete(GbpProfileSnapshot).where(GbpProfileSnapshot.org_id == org_id))
    await session.execute(delete(ReviewRequest).where(ReviewRequest.org_id == org_id))
    await session.execute(delete(Lead).where(Lead.org_id == org_id))
    for model in (
        GbpPost,
        GbpRanking,
        GbpCompetitor,
        GbpInsights,
        GbpReview,
        MonthlyReport,
        OnboardingEvent,
        MarketingCampaign,
        OrgMember,
        Territory,
    ):
        await session.execute(delete(model).where(model.org_id == org_id))


async def seed_demo_account(session: AsyncSession, *, reset: bool = False) -> str:
    """Create or refresh demo org with leads, GBP data, reviews, and a report."""
    existing = (
        await session.execute(select(Org).where(Org.slug == DEMO_SLUG))
    ).scalar_one_or_none()

    if existing and not reset:
        logger.info("demo_org_exists", org_id=existing.id)
        return existing.id

    if existing and reset:
        await _purge_org(session, existing.id)
        await session.delete(existing)
        await session.flush()

    now = datetime.utcnow()
    org = Org(
        name=DEMO_NAME,
        slug=DEMO_SLUG,
        category=BusinessCategory.INTERIOR_DESIGN,
        description="Award-winning interior design studio in Indiranagar, Bangalore.",
        website="https://studioindiranagar.example.com",
        email="hello@studioindiranagar.demo",
        phone="919876543210",
        address="100 Feet Road, Indiranagar",
        city="Bangalore",
        state="Karnataka",
        pincode="560038",
        latitude=12.9784,
        longitude=77.6408,
        plan=PlanTier.GROWTH,
        onboarding_status=OnboardingStatus.ACTIVE,
        gbp_place_id="ChIJ_demo_studio_indiranagar",
        gbp_name=DEMO_NAME,
        gbp_status="connected",
        gbp_last_synced_at=now - timedelta(hours=6),
        whatsapp_number="919876543210",
        whatsapp_verified=True,
        whatsapp_connected_at=now - timedelta(days=14),
        guarantee_start_date=now - timedelta(days=30),
        guarantee_gbp_posts_delivered=3,
        guarantee_reviews_collected=5,
        guarantee_leads_generated=8,
        is_active=True,
    )
    session.add(org)
    await session.flush()

    session.add(OnboardingEvent(org_id=org.id, event_type="signup"))
    session.add(OnboardingEvent(org_id=org.id, event_type="gbp_connected"))
    session.add(OnboardingEvent(org_id=org.id, event_type="onboarding_complete"))

    await _seed_leads(session, org.id, now)
    await _seed_gbp(session, org.id, now)
    await _seed_reviews(session, org.id, now)
    await _seed_report(session, org.id, now)

    await _seed_pilot_orgs(session, now)

    await session.commit()
    logger.info("demo_seeded", org_id=org.id, slug=DEMO_SLUG)
    return org.id


async def _seed_leads(session: AsyncSession, org_id: str, now: datetime) -> None:
    leads_spec = [
        {
            "name": "Priya Sharma",
            "phone": "919811122233",
            "status": LeadStatus.NEW,
            "scope": LeadScope.FULL_HOME,
            "budget": BudgetRange.FROM_10L_20L,
            "source": LeadSource.WHATSAPP,
            "area": "Whitefield",
            "score": 0.82,
            "summary": "3BHK full home renovation, budget ₹12–15L, wants to start in 2 months.",
            "days_ago": 1,
        },
        {
            "name": "Rahul Mehta",
            "phone": "919822233344",
            "status": LeadStatus.CONTACTED,
            "scope": LeadScope.KITCHEN,
            "budget": BudgetRange.FROM_5L_10L,
            "source": LeadSource.GBP,
            "area": "Indiranagar",
            "score": 0.75,
            "summary": "Modular kitchen for 2BHK, timeline before Diwali.",
            "days_ago": 3,
        },
        {
            "name": "Ananya Reddy",
            "phone": "919833344455",
            "status": LeadStatus.QUOTED,
            "scope": LeadScope.OFFICE,
            "budget": BudgetRange.FROM_20L_50L,
            "source": LeadSource.REFERRAL,
            "area": "Koramangala",
            "score": 0.91,
            "summary": "2000 sqft office fit-out, premium finish, decision in 2 weeks.",
            "days_ago": 7,
        },
        {
            "name": "Vikram Joshi",
            "phone": "919844455566",
            "status": LeadStatus.WON,
            "scope": LeadScope.FULL_HOME,
            "budget": BudgetRange.FROM_10L_20L,
            "source": LeadSource.WHATSAPP,
            "area": "HSR Layout",
            "score": 0.88,
            "summary": "3BHK contemporary design — project signed at ₹14L.",
            "days_ago": 14,
            "won_paise": 14_000_000,
        },
        {
            "name": "Sneha Iyer",
            "phone": "919855566677",
            "status": LeadStatus.LOST,
            "scope": LeadScope.BEDROOM,
            "budget": BudgetRange.FROM_3L_5L,
            "source": LeadSource.INSTAGRAM,
            "area": "Jayanagar",
            "score": 0.45,
            "summary": "Master bedroom only — chose competitor on price.",
            "days_ago": 10,
        },
        {
            "name": "Arjun Nair",
            "phone": "919866677788",
            "status": LeadStatus.NEGOTIATION,
            "scope": LeadScope.RENOVATION,
            "budget": BudgetRange.FROM_5L_10L,
            "source": LeadSource.WHATSAPP,
            "area": "Marathahalli",
            "score": 0.79,
            "summary": "Full home refresh, comparing two designers.",
            "days_ago": 5,
        },
    ]

    for spec in leads_spec:
        created = now - timedelta(days=spec["days_ago"])
        lead = Lead(
            org_id=org_id,
            source=spec["source"],
            contact_name=spec["name"],
            contact_phone=spec["phone"],
            status=spec["status"],
            scope=spec["scope"],
            budget_range=spec["budget"],
            timeline="2-3 months" if spec["status"] != LeadStatus.WON else "Started",
            location_area=spec["area"],
            property_type="3BHK" if spec["scope"] == LeadScope.FULL_HOME else "2BHK",
            ai_summary=spec["summary"],
            ai_qualification_score=spec["score"],
            won_value_paise=spec.get("won_paise"),
            first_contact_at=created,
            last_contact_at=created,
            created_at=created,
        )
        session.add(lead)
        await session.flush()

        if spec["source"] == LeadSource.WHATSAPP:
            _add_whatsapp_thread(session, org_id, lead.id, spec["name"], created)


def _add_whatsapp_thread(
    session: AsyncSession,
    org_id: str,
    lead_id: str,
    name: str,
    base: datetime,
) -> None:
    messages = [
        (MessageDirection.INBOUND, MessageSender.LEAD, f"Hi, I'm {name}. Looking for interior design help."),
        (MessageDirection.OUTBOUND, MessageSender.AI, "Hello! I'd love to help. What type of space are you designing?"),
        (MessageDirection.INBOUND, MessageSender.LEAD, "Full home — 3BHK in Bangalore."),
        (MessageDirection.OUTBOUND, MessageSender.AI, "Great! What's your approximate budget range?"),
        (MessageDirection.INBOUND, MessageSender.LEAD, "Around 10–15 lakhs. Can we chat this week?"),
        (MessageDirection.OUTBOUND, MessageSender.AI, "Perfect — our designer will reach out shortly with next steps."),
    ]
    for i, (direction, sender, text) in enumerate(messages):
        session.add(
            WhatsappConversation(
                org_id=org_id,
                lead_id=lead_id,
                direction=direction,
                sender=sender,
                message_text=text,
                ai_intent="inquiry" if direction == MessageDirection.INBOUND else None,
                ai_response_time_ms=1200 if sender == MessageSender.AI else None,
                sent_at=base + timedelta(minutes=i * 2),
            )
        )


async def _seed_gbp(session: AsyncSession, org_id: str, now: datetime) -> None:
    period_end = now
    period_start = now - timedelta(days=30)
    prev_start = period_start - timedelta(days=30)

    session.add(
        GbpInsights(
            org_id=org_id,
            search_views=820,
            maps_views=1240,
            total_views=2060,
            website_clicks=94,
            calls=38,
            direction_requests=52,
            photo_views=310,
            review_count=47,
            avg_rating=4.7,
            period_start=period_start,
            period_end=period_end,
        )
    )
    session.add(
        GbpInsights(
            org_id=org_id,
            search_views=690,
            maps_views=1050,
            total_views=1740,
            website_clicks=72,
            calls=29,
            direction_requests=41,
            photo_views=260,
            review_count=42,
            avg_rating=4.6,
            period_start=prev_start,
            period_end=period_start,
        )
    )

    posts = [
        (
            "3BHK Transformation in Whitefield",
            "✨ Just completed this stunning 3BHK in Whitefield! Warm wood accents, open-plan living, and a chef's kitchen.\n\nThinking about your space? Book a free consultation.\n\n#InteriorDesign #Bangalore #Whitefield",
            GbpPostStatus.PUBLISHED,
            "interior designer in Bangalore",
            18,
        ),
        (
            "Design Tip: Small Spaces",
            "💡 Use mirrors and light colours to make compact rooms feel twice the size. Our Indiranagar team does this every week.\n\n#DesignTips #BangaloreInteriors",
            GbpPostStatus.PUBLISHED,
            "best interior designer Bangalore",
            12,
        ),
        (
            "Modular Kitchen Showcase",
            "🍳 Sleek modular kitchen with quartz counters and hidden storage — delivered in 6 weeks.\n\nDM us for a quote!\n\n#ModularKitchen #HomeDesign",
            GbpPostStatus.PUBLISHED,
            "modular kitchen design Bangalore",
            8,
        ),
        (
            "Festive Home Refresh",
            "🪔 Get your home guest-ready this season! Limited consultation slots for Indiranagar & Koramangala.\n\n#HomeDecor #Bangalore",
            GbpPostStatus.DRAFT,
            "home interior design",
            0,
        ),
    ]
    for title, content, status, kw, days_ago in posts:
        published = now - timedelta(days=days_ago) if status == GbpPostStatus.PUBLISHED else None
        session.add(
            GbpPost(
                org_id=org_id,
                title=title,
                content=content,
                post_type=GbpPostType.STANDARD,
                keyword_target=kw,
                status=status,
                published_at=published,
                views=120 + days_ago * 10 if published else 0,
                clicks=8 + days_ago if published else 0,
                ai_generated=True,
            )
        )

    keywords = [
        ("interior designer in Bangalore", 4),
        ("modular kitchen Bangalore", 7),
        ("best interior designer Indiranagar", 2),
        ("3BHK interior design", 11),
    ]
    for kw, pos in keywords:
        session.add(
            GbpRanking(
                org_id=org_id,
                keyword=kw,
                position=pos,
                search_city="Bangalore",
                recorded_at=now - timedelta(days=2),
            )
        )

    competitors = [
        ("DesignCraft Interiors", 4.5, 62, 1.2),
        ("UrbanNest Studio", 4.3, 38, 2.1),
        ("Elite Home Designs", 4.6, 89, 3.4),
    ]
    for name, rating, reviews, dist in competitors:
        session.add(
            GbpCompetitor(
                org_id=org_id,
                name=name,
                category="interior_design",
                city="Bangalore",
                distance_km=dist,
                review_count=reviews,
                avg_rating=rating,
                last_checked_at=now,
            )
        )


async def _seed_reviews(session: AsyncSession, org_id: str, now: datetime) -> None:
    reviews = [
        (5, "Rajesh K.", "Outstanding work on our 3BHK! Professional team, on time and on budget.", True),
        (5, "Meera S.", "Love our new kitchen. Highly recommend Studio Indiranagar!", True),
        (4, "Karthik P.", "Great designs. Minor delays but final result was worth it.", True),
        (5, "Divya R.", "Transformed our office space beautifully.", False),
    ]
    for i, (stars, name, comment, replied) in enumerate(reviews):
        created = now - timedelta(days=5 + i * 3)
        reply = (
            f"Thank you, {name.split()[0]}! We're thrilled you chose {DEMO_NAME}."
            if replied
            else None
        )
        session.add(
            GbpReview(
                org_id=org_id,
                google_review_id=f"demo-review-{uuid4().hex[:12]}",
                reviewer_name=name,
                star_rating=stars,
                comment=comment,
                reply_text=reply,
                reply_status=ReviewReplyStatus.REPLIED if replied else ReviewReplyStatus.PENDING,
                ai_generated=bool(reply),
                review_created_at=created,
                replied_at=created + timedelta(hours=2) if replied else None,
            )
        )


async def _seed_report(session: AsyncSession, org_id: str, now: datetime) -> None:
    month = now.month if now.month > 1 else 12
    year = now.year if now.month > 1 else now.year - 1
    period_start = datetime(year, month, 1)
    period_end = (
        datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)
    )

    session.add(
        MonthlyReport(
            org_id=org_id,
            report_month=month,
            report_year=year,
            period_start=period_start,
            period_end=period_end,
            leads_total=8,
            leads_from_whatsapp=5,
            leads_from_gbp=2,
            leads_from_other=1,
            leads_won=1,
            leads_lost=1,
            leads_conversion_rate=12.5,
            total_estimated_revenue_paise=14_000_000,
            gbp_search_views=820,
            gbp_maps_views=1240,
            gbp_total_views=2060,
            gbp_website_clicks=94,
            gbp_calls=38,
            gbp_direction_requests=52,
            gbp_posts_published=3,
            avg_keyword_position=6.0,
            best_keyword_position=2,
            keywords_tracked=4,
            reviews_new=5,
            reviews_at_start=42,
            reviews_at_end=47,
            avg_rating_at_end=4.7,
            views_mom_change_pct=18.4,
            leads_mom_change_pct=33.0,
            status=ReportStatus.GENERATED,
            ai_narrative=(
                f"{DEMO_NAME} had a strong month: 8 qualified leads, 1 project won (₹14L), "
                "and GBP visibility up 18%. Top-3 ranking for 'interior designer Indiranagar'. "
                "Focus next month on publishing the draft festive post and requesting reviews from recent wins."
            ),
            generated_at=now - timedelta(days=2),
        )
    )


async def _seed_pilot_orgs(session: AsyncSession, now: datetime) -> None:
    """Extra studios for admin cohort/churn intelligence demos."""
    pilots = [
        {
            "slug": "design-hub-koramangala",
            "name": "Design Hub Koramangala",
            "plan": PlanTier.GROWTH,
            "status": OnboardingStatus.ACTIVE,
            "is_active": True,
            "created_days_ago": 90,
            "sync_days_ago": 1,
            "leads": 12,
            "posts": 4,
            "billing": 499900,
        },
        {
            "slug": "atelier-whitefield",
            "name": "Atelier Whitefield",
            "plan": PlanTier.STARTER,
            "status": OnboardingStatus.ACTIVE,
            "is_active": True,
            "created_days_ago": 60,
            "sync_days_ago": 18,
            "leads": 2,
            "posts": 0,
            "billing": 199900,
        },
        {
            "slug": "spaces-btm",
            "name": "Spaces BTM",
            "plan": PlanTier.STARTER,
            "status": OnboardingStatus.CHURNED,
            "is_active": False,
            "created_days_ago": 120,
            "sync_days_ago": 45,
            "leads": 0,
            "posts": 0,
            "billing": 199900,
        },
        {
            "slug": "nova-interiors-hsr",
            "name": "Nova Interiors HSR",
            "plan": PlanTier.ENTERPRISE,
            "status": OnboardingStatus.PAUSED,
            "is_active": True,
            "created_days_ago": 45,
            "sync_days_ago": 10,
            "leads": 1,
            "posts": 1,
            "billing": 799900,
        },
    ]

    for spec in pilots:
        exists = (
            await session.execute(select(Org).where(Org.slug == spec["slug"]))
        ).scalar_one_or_none()
        if exists:
            continue

        created = now - timedelta(days=spec["created_days_ago"])
        org = Org(
            name=spec["name"],
            slug=spec["slug"],
            category=BusinessCategory.INTERIOR_DESIGN,
            email=f"hello@{spec['slug']}.demo",
            phone="919800000000",
            address="Demo address",
            city="Bangalore",
            state="Karnataka",
            pincode="560038",
            plan=spec["plan"],
            billing_amount_paise=spec["billing"],
            onboarding_status=spec["status"],
            is_active=spec["is_active"],
            gbp_place_id=f"ChIJ_demo_{spec['slug']}",
            gbp_status="connected" if spec["is_active"] else "disconnected",
            gbp_last_synced_at=now - timedelta(days=spec["sync_days_ago"]),
            whatsapp_verified=spec["is_active"],
            guarantee_leads_generated=spec["leads"],
            guarantee_gbp_posts_delivered=spec["posts"],
            created_at=created,
            updated_at=now,
        )
        session.add(org)
        await session.flush()

        if spec["leads"] > 0:
            for i in range(min(spec["leads"], 3)):
                session.add(
                    Lead(
                        org_id=org.id,
                        source=LeadSource.WHATSAPP if i % 2 == 0 else LeadSource.GBP,
                        contact_name=f"Pilot Lead {i + 1}",
                        contact_phone=f"91987{i:07d}",
                        status=LeadStatus.NEW if i == 0 else LeadStatus.CONTACTED,
                        scope=LeadScope.FULL_HOME,
                        budget_range=BudgetRange.FROM_5L_10L,
                        ai_qualification_score=0.7,
                        created_at=now - timedelta(days=i * 5 + 2),
                    )
                )
