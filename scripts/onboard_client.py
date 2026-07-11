"""CLI onboarding wrapper for manual tenant setup."""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.core.database import _async_session_factory
from src.models.notification import OnboardingEvent
from src.models.org import BusinessCategory, OnboardingStatus, Org, PlanTier
from src.services.territory.checker import TerritoryChecker


async def onboard(
    name: str,
    email: str,
    phone: str,
    address: str,
    city: str,
    category: str,
    latitude: float,
    longitude: float,
    whatsapp_number: str | None = None,
) -> str:
    async with _async_session_factory() as session:
        slug = name.lower().replace(" ", "-")[:40]
        org = Org(
            name=name,
            slug=f"{slug}-{phone[-4:]}",
            category=BusinessCategory(category),
            email=email,
            phone=phone.lstrip("+"),
            address=address,
            city=city,
            state="Karnataka",
            pincode="560038",
            latitude=latitude,
            longitude=longitude,
            plan=PlanTier.STARTER,
            onboarding_status=OnboardingStatus.CREATED,
            whatsapp_number=whatsapp_number.lstrip("+") if whatsapp_number else None,
        )
        session.add(org)
        await session.flush()

        session.add(OnboardingEvent(org_id=org.id, event_type="signup"))

        checker = TerritoryChecker()
        conflict = await checker.check_conflict(org, latitude, longitude, session)
        if conflict.get("has_conflict"):
            print(f"⚠️  Territory conflict detected: {conflict.get('conflicting_orgs')}")

        await session.commit()
        print(f"✅ Org created: {org.id}")
        print(f"   Next: connect GBP → /api/v1/gbp/oauth/start?org_id={org.id}")
        return org.id


def main():
    parser = argparse.ArgumentParser(description="Onboard a GlamAI client")
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--phone", required=True)
    parser.add_argument("--address", required=True)
    parser.add_argument("--city", default="Bangalore")
    parser.add_argument("--category", default="interior_design")
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lng", type=float, required=True)
    parser.add_argument("--whatsapp", default=None)
    args = parser.parse_args()

    asyncio.run(
        onboard(
            name=args.name,
            email=args.email,
            phone=args.phone,
            address=args.address,
            city=args.city,
            category=args.category,
            latitude=args.lat,
            longitude=args.lng,
            whatsapp_number=args.whatsapp,
        )
    )


if __name__ == "__main__":
    main()
