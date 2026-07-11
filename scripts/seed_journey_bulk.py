#!/usr/bin/env python3
"""Seed a large synthetic dataset for journey analytics testing."""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.core.database import create_all_tables, _async_session_factory
from src.services.demo.seed import seed_demo_account
from src.services.demo.seed_journey_bulk import BULK_SLUG_PREFIX, seed_journey_analytics_bulk


async def main(count: int, reset: bool, seed: int, include_demo: bool) -> None:
    await create_all_tables()
    async with _async_session_factory() as session:
        if include_demo:
            await seed_demo_account(session, reset=reset)

        result = await seed_journey_analytics_bulk(
            session,
            count=count,
            reset=reset,
            seed=seed,
        )

    base = "http://localhost:3000"
    print()
    print("✅ Journey analytics bulk seed complete")
    print(f"   Created:  {result['created']} orgs")
    print(f"   Total:    {result['total']} bulk orgs (prefix: {BULK_SLUG_PREFIX})")
    print()
    print("Open admin journey analytics:")
    print(f"   {base}/admin/journey")
    print(f"   {base}/admin/onboarding")
    print(f"   {base}/admin/pilot")
    print()
    print("API:")
    print("   GET /api/v1/admin/journey-analytics?period_days=120")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed bulk journey analytics data")
    parser.add_argument("--count", type=int, default=120, help="Target bulk org count")
    parser.add_argument("--reset", action="store_true", help="Delete existing bulk seed orgs first")
    parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducible distribution")
    parser.add_argument(
        "--no-demo",
        action="store_true",
        help="Skip refreshing the main demo account",
    )
    args = parser.parse_args()
    asyncio.run(
        main(
            count=args.count,
            reset=args.reset,
            seed=args.seed,
            include_demo=not args.no_demo,
        )
    )
