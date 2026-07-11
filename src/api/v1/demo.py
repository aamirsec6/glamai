"""Demo endpoints — seed account and run analysis/content agents."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import get_db
from src.models.org import Org
from src.services.demo import DEMO_SLUG, seed_demo_account
from src.services.agents import ContentAgentsOrchestrator


def _block_in_production() -> None:
    if get_settings().app_env == "production":
        raise HTTPException(status_code=404, detail="Not found")


router = APIRouter(
    prefix="/v1/demo",
    tags=["Demo"],
    dependencies=[Depends(_block_in_production)],
)


class RunAgentsBody(BaseModel):
    org_id: str | None = None
    period_days: int = Field(default=30, ge=1, le=365)
    include_narrative: bool = True
    generate_posts: bool = True
    post_count: int = Field(default=4, ge=1, le=4)
    optimize_profile: bool = True
    auto_reply_reviews: bool = True
    schedule_posts: bool = True


@router.post("/seed")
async def seed_demo(
    reset: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """Create demo org with sample leads, GBP data, reviews, and a report."""
    org_id = await seed_demo_account(db, reset=reset)
    return {
        "message": "Demo account ready",
        "org_id": org_id,
        "slug": DEMO_SLUG,
        "client_url": f"/client?org={org_id}",
        "ai_url": f"/client/ai?org={org_id}",
    }


@router.get("/account")
async def get_demo_account(db: AsyncSession = Depends(get_db)):
    """Return demo org id if it exists."""
    org = (
        await db.execute(select(Org).where(Org.slug == DEMO_SLUG))
    ).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Demo account not seeded yet")
    return {
        "data": {
            "org_id": org.id,
            "name": org.name,
            "slug": org.slug,
            "client_url": f"/client?org={org.id}",
        }
    }


@router.post("/run-agents")
async def run_demo_agents(
    body: RunAgentsBody,
    db: AsyncSession = Depends(get_db),
):
    """Run all content agents: posts, profile, reviews, and analysis."""
    org_id = body.org_id
    if not org_id:
        org = (
            await db.execute(select(Org).where(Org.slug == DEMO_SLUG))
        ).scalar_one_or_none()
        if not org:
            org_id = await seed_demo_account(db)
        else:
            org_id = org.id

    orchestrator = ContentAgentsOrchestrator(db)
    result = await orchestrator.run(
        org_id,
        generate_posts=body.generate_posts,
        post_count=body.post_count,
        optimize_profile=body.optimize_profile,
        auto_reply_reviews=body.auto_reply_reviews,
        include_analysis=body.include_narrative,
        schedule_posts=body.schedule_posts,
    )
    await db.commit()

    if result.errors and result.errors == ["org_not_found"]:
        raise HTTPException(status_code=404, detail="Organization not found")

    return {"data": result.to_dict()}
