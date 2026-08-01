#!/usr/bin/env python3
"""Remove seeded demo (+ optional journey bulk) so you can onboard a real GBP client."""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import select

from src.core.database import _async_session_factory
from src.models.org import Org
from src.services.demo.seed import DEMO_SLUG, delete_demo_account
from src.services.demo.seed_journey_bulk import BULK_SLUG_PREFIX


async def _clear_journey_bulk(session) -> int:
    from src.services.demo.seed import _purge_org

    stmt = select(Org).where(Org.slug.startswith(BULK_SLUG_PREFIX))
    orgs = (await session.execute(stmt)).scalars().all()
    for org in orgs:
        await _purge_org(session, org.id)
        await session.delete(org)
    await session.flush()
    return len(orgs)


async def main(*, journey_bulk: bool) -> None:
    async with _async_session_factory() as session:
        demo_deleted = await delete_demo_account(session)
        bulk_count = 0
        if journey_bulk:
            bulk_count = await _clear_journey_bulk(session)
        await session.commit()

    print("✅ Seeded data cleared")
    print(f"   Demo org ({DEMO_SLUG}): {'deleted' if demo_deleted else 'not found'}")
    if journey_bulk:
        print(f"   Journey bulk orgs removed: {bulk_count}")
    print()
    print("Next steps:")
    print("  1. Open http://localhost:3000/client/onboarding")
    print("  2. Create your client's business")
    print("  3. Connect their Google Business Profile via OAuth")
    print("  4. Clear browser localStorage key 'glamai_org_id' if the old demo still loads")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clear GlamAI/Qimma seeded demo data")
    parser.add_argument(
        "--journey-bulk",
        action="store_true",
        help="Also delete seed-journey-* bulk orgs",
    )
    args = parser.parse_args()
    asyncio.run(main(journey_bulk=args.journey_bulk))
