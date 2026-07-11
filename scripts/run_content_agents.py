#!/usr/bin/env python3
"""Run all content agents for an org: posts, profile, reviews, analysis."""

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from src.core.database import _async_session_factory
from src.models.org import Org
from src.services.agents import ContentAgentsOrchestrator
from src.services.demo import DEMO_SLUG
from src.services.demo.seed import seed_demo_account


async def resolve_org_id(explicit: str | None) -> str:
    if explicit:
        return explicit
    async with _async_session_factory() as session:
        org = (
            await session.execute(select(Org).where(Org.slug == DEMO_SLUG))
        ).scalar_one_or_none()
        if org:
            return org.id
    async with _async_session_factory() as session:
        return await seed_demo_account(session)


async def main(
    org_id: str | None,
    posts: int,
    *,
    no_profile: bool,
    no_reviews: bool,
    no_analysis: bool,
    no_schedule: bool,
) -> None:
    resolved = await resolve_org_id(org_id)
    async with _async_session_factory() as session:
        orchestrator = ContentAgentsOrchestrator(session)
        result = await orchestrator.run(
            resolved,
            generate_posts=True,
            post_count=posts,
            optimize_profile=not no_profile,
            auto_reply_reviews=not no_reviews,
            include_analysis=not no_analysis,
            schedule_posts=not no_schedule,
        )
        await session.commit()
        data = result.to_dict()

    print(json.dumps(data, indent=2, default=str))
    summary = data.get("summary", {})
    print()
    print("✅ Content agents complete")
    print(f"   Posts created: {summary.get('posts_created', 0)}")
    print(f"   Posts scheduled: {data.get('posts', {}).get('posts_scheduled', 0)}")
    print(f"   Reviews replied: {summary.get('reviews_replied', 0)}")
    print(f"   Profile optimized: {summary.get('profile_optimized', False)}")
    print(f"   Analysis score: {summary.get('analysis_score', '—')}")
    if data.get("errors"):
        print(f"   Errors: {', '.join(data['errors'])}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run content agents for an org")
    parser.add_argument("--org-id", default=None, help="Org UUID (defaults to demo org)")
    parser.add_argument("--posts", type=int, default=4, help="GBP posts to generate (1-4)")
    parser.add_argument("--no-profile", action="store_true", help="Skip profile optimization")
    parser.add_argument("--no-reviews", action="store_true", help="Skip review auto-replies")
    parser.add_argument("--no-analysis", action="store_true", help="Skip business analysis")
    parser.add_argument("--no-schedule", action="store_true", help="Skip scheduling drafts")
    args = parser.parse_args()
    asyncio.run(
        main(
            args.org_id,
            args.posts,
            no_profile=args.no_profile,
            no_reviews=args.no_reviews,
            no_analysis=args.no_analysis,
            no_schedule=args.no_schedule,
        )
    )
