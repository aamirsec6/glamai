#!/usr/bin/env python3
"""Seed a demo account with realistic leads, GBP data, reviews, and reports."""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.core.database import create_all_tables, _async_session_factory
from src.services.demo import DEMO_NAME, DEMO_SLUG, seed_demo_account


async def main(reset: bool) -> None:
    await create_all_tables()
    async with _async_session_factory() as session:
        org_id = await seed_demo_account(session, reset=reset)

    base = "http://localhost:3000"
    print()
    print("✅ Demo account ready")
    print(f"   Org:     {DEMO_NAME}")
    print(f"   Slug:    {DEMO_SLUG}")
    print(f"   Org ID:  {org_id}")
    print()
    print("Open the client dashboard:")
    print(f"   {base}/client?org={org_id}")
    print(f"   {base}/client/gbp?org={org_id}")
    print(f"   {base}/client/leads?org={org_id}")
    print(f"   {base}/client/ai?org={org_id}")
    print()
    print("Admin view:")
    print(f"   {base}/admin/clients/{org_id}")
    print()
    print("Run AI analysis + content generation:")
    print(f"   make demo-agents ORG_ID={org_id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed GlamAI demo account")
    parser.add_argument("--reset", action="store_true", help="Delete and recreate demo org")
    args = parser.parse_args()
    asyncio.run(main(args.reset))
