#!/usr/bin/env python3
"""Search + link a bakery from Google Places and extract public data."""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.application.gbp import GbpFacade
from src.core.config import get_settings
from src.core.database import _async_session_factory
from src.models.org import Org


async def main(org_id: str, query: str) -> int:
    settings = get_settings()
    key = (settings.google_places_api_key or "").strip()
    if not key or key.startswith("your-"):
        print("❌ GOOGLE_PLACES_API_KEY is missing in .env")
        print("   Google Cloud → APIs & Services → Credentials → Create API key")
        print("   Enable Places API (New), paste key into .env, restart API")
        return 1

    async with _async_session_factory() as session:
        org = await session.get(Org, org_id)
        if not org:
            print(f"❌ Org not found: {org_id}")
            return 1

        facade = GbpFacade(session)
        try:
            search = await facade.search_places(org_id, query)
            if search.get("status") != "ok":
                print("❌ Search failed:", search)
                return 1
            results = search.get("results") or []
            if not results:
                print("❌ No places found for:", query)
                return 1

            print(f"Found {len(results)} matches:")
            for i, r in enumerate(results):
                print(
                    f"  [{i}] {r.get('name')} — {r.get('address')} "
                    f"(★ {r.get('rating')} / {r.get('review_count')} reviews)"
                )

            pick = results[0]
            print(f"\nLinking top match: {pick.get('name')} ({pick.get('place_id')})")
            linked = await facade.link_from_places(org_id, pick["place_id"])
            await session.commit()
            print("✅ Linked:", linked)
            return 0 if linked.get("status") == "ok" else 1
        finally:
            await facade.close()


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--org-id", required=True)
    p.add_argument("--query", required=True)
    args = p.parse_args()
    raise SystemExit(asyncio.run(main(args.org_id, args.query)))
