"""Seed demo data for development."""

import asyncio
import sys
from datetime import datetime, timedelta

sys.path.insert(0, "/home/ubuntu/glamai")

from src.database import _async_session_factory
from src.models.lead import (
    BudgetRange,
    Lead,
    LeadSource,
    LeadStatus,
    LeadScope,
)
from src.models.org import (
    BusinessCategory,
    ExclusivityTier,
    OnboardingStatus,
    Org,
    PlanTier,
)


async def main():
    async with _async_session_factory() as session:
        # Create demo org
        org = Org(
            name="Design Studio Bangalore",
            slug="design-studio-bangalore-demo",
            category=BusinessCategory.INTERIOR_DESIGN,
            email="hello@designstudio.demo",
            phone="919876543210",
            address="123, 1st Main, Indiranagar",
            city="Bangalore",
            state="Karnataka",
            pincode="560038",
            latitude=12.9784,
            longitude=77.6408,
            plan=PlanTier.GROWTH,
            exclusivity=ExclusivityTier.STANDARD,
            billing_amount_paise=499900,
            onboarding_status=OnboardingStatus.ACTIVE,
            onboarding_started_at=datetime.utcnow() - timedelta(days=30),
            onboarding_completed_at=datetime.utcnow() - timedelta(days=25),
            whatsapp_number="919876543210",
            whatsapp_verified=True,
            gbp_place_id="ChIJdemo_place_id",
            gbp_name="Design Studio Bangalore",
            gbp_status="VERIFIED",
            guarantee_start_date=datetime.utcnow() - timedelta(days=25),
        )
        session.add(org)
        await session.flush()

        # Create demo leads
        demo_leads = [
            {
                "contact_name": "Rahul Sharma",
                "contact_phone": "919876543211",
                "source": LeadSource.WHATSAPP,
                "status": LeadStatus.CONTACTED,
                "scope": LeadScope.FULL_HOME,
                "budget_range": BudgetRange.FROM_10L_20L,
                "timeline": "3 months",
                "location_area": "Whitefield",
                "property_type": "3BHK",
                "ai_qualification_score": 0.85,
                "ai_summary": "Scope: Full Home | Budget: ₹10-20L | Timeline: 3 months | Location: Whitefield",
            },
            {
                "contact_name": "Priya Patel",
                "contact_phone": "919876543212",
                "source": LeadSource.GBP,
                "status": LeadStatus.QUOTED,
                "scope": LeadScope.KITCHEN,
                "budget_range": BudgetRange.FROM_3L_5L,
                "timeline": "6 weeks",
                "location_area": "Koramangala",
                "property_type": "2BHK",
                "ai_qualification_score": 0.70,
                "ai_summary": "Scope: Kitchen | Budget: ₹3-5L | Timeline: 6 weeks | Location: Koramangala",
            },
            {
                "contact_name": "Amit Kumar",
                "contact_phone": "919876543213",
                "source": LeadSource.WHATSAPP,
                "status": LeadStatus.WON,
                "scope": LeadScope.FULL_HOME,
                "budget_range": BudgetRange.FROM_5L_10L,
                "timeline": "2 months",
                "location_area": "Indiranagar",
                "property_type": "2BHK",
                "ai_qualification_score": 0.95,
                "ai_summary": "Scope: Full Home | Budget: ₹5-10L | Timeline: 2 months | Location: Indiranagar",
                "won_value_paise": 7500000,  # ₹7.5L
            },
            {
                "contact_name": "Sneha Reddy",
                "contact_phone": "919876543214",
                "source": LeadSource.WHATSAPP,
                "status": LeadStatus.NEW,
                "scope": LeadScope.OFFICE,
                "budget_range": BudgetRange.UNKNOWN,
                "timeline": None,
                "location_area": "HSR Layout",
                "property_type": None,
                "ai_qualification_score": 0.20,
                "ai_summary": "New lead — qualification in progress",
            },
            {
                "contact_name": "Vikram Singh",
                "contact_phone": "919876543215",
                "source": LeadSource.GBP_CALL,
                "status": LeadStatus.LOST,
                "scope": LeadScope.LIVING_ROOM,
                "budget_range": BudgetRange.FROM_3L_5L,
                "timeline": "1 month",
                "location_area": "JP Nagar",
                "property_type": "3BHK",
                "ai_qualification_score": 0.60,
                "ai_summary": "Scope: Living Room | Budget: ₹3-5L | Timeline: 1 month | Location: JP Nagar",
                "lost_reason": "Went with a local contractor",
            },
        ]

        for lead_data in demo_leads:
            lead = Lead(
                org_id=org.id,
                created_at=datetime.utcnow() - timedelta(days=demo_leads.index(lead_data) * 3),
                **lead_data,
            )
            session.add(lead)

        await session.commit()
        print(f"✅ Seeded demo data:")
        print(f"   Org: {org.name} ({org.id})")
        print(f"   Leads: {len(demo_leads)}")
        print(f"   Won: 1 | Contacted: 1 | Quoted: 1 | New: 1 | Lost: 1")


if __name__ == "__main__":
    asyncio.run(main())
