"""Run GBP sync via GbpFacade."""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from src.core.database import _async_session_factory
from src.application.gbp import GbpFacade
from src.models.org import Org


async def run(org_id: str | None, insights_only: bool, competitors_only: bool) -> None:
    async with _async_session_factory() as session:
        if org_id:
            org_ids = [org_id]
        else:
            result = await session.execute(
                select(Org.id).where(Org.is_active == True)  # noqa: E712
            )
            org_ids = [row[0] for row in result.all()]

        facade = GbpFacade(session)
        for oid in org_ids:
            print(f"Syncing org {oid}...")
            if insights_only:
                out = await facade.sync(oid, resources=["insights"])
            elif competitors_only:
                out = await facade.sync(oid, resources=["competitors"])
            else:
                out = await facade.sync(oid)
            print(f"  → {out}")
        await facade.close()
        await session.commit()
    print("Done.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync GBP data for GlamAI orgs")
    parser.add_argument("--org-id", help="Single org UUID")
    parser.add_argument("--insights-only", action="store_true")
    parser.add_argument("--competitors-only", action="store_true")
    args = parser.parse_args()
    asyncio.run(run(args.org_id, args.insights_only, args.competitors_only))


if __name__ == "__main__":
    main()
