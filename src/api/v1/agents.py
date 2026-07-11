"""Content agents API — run GBP posts, profile, reviews, and analysis."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.deps import assert_tenant_access
from src.core.database import get_db
from src.services.agents import ContentAgentsOrchestrator

router = APIRouter(prefix="/v1/agents", tags=["Content Agents"])


class RunContentAgentsBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    org_id: str
    generate_posts: bool = True
    post_count: int = Field(default=4, ge=1, le=4)
    optimize_profile: bool = True
    auto_reply_reviews: bool = True
    include_analysis: bool = True
    schedule_posts: bool = True
    async_mode: bool = Field(default=False, alias="async")


@router.post("/content/run")
async def run_content_agents(
    body: RunContentAgentsBody,
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Run all content agents: GBP posts, profile optimization, review replies, analysis."""
    assert_tenant_access(body.org_id, x_org_id, x_admin_secret)

    if body.async_mode:
        from src.workers.agent_tasks import run_content_agents_for_org

        task = run_content_agents_for_org.delay(
            body.org_id,
            generate_posts=body.generate_posts,
            post_count=body.post_count,
            optimize_profile=body.optimize_profile,
            auto_reply_reviews=body.auto_reply_reviews,
            include_analysis=body.include_analysis,
            schedule_posts=body.schedule_posts,
        )
        return {"message": "Content agents queued", "task_id": task.id}

    orchestrator = ContentAgentsOrchestrator(db)
    result = await orchestrator.run(
        body.org_id,
        generate_posts=body.generate_posts,
        post_count=body.post_count,
        optimize_profile=body.optimize_profile,
        auto_reply_reviews=body.auto_reply_reviews,
        include_analysis=body.include_analysis,
        schedule_posts=body.schedule_posts,
    )
    await db.commit()

    if result.errors and result.errors == ["org_not_found"]:
        raise HTTPException(status_code=404, detail="Organization not found")

    return {"data": result.to_dict()}


@router.post("/content/run-all-orgs")
async def run_content_agents_all_orgs(
    async_mode: bool = Query(True, alias="async"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
):
    """Run content agents for every active org (admin / Celery)."""
    from src.core.config import get_settings

    settings = get_settings()
    if x_admin_secret != settings.admin_api_secret and settings.admin_api_secret:
        raise HTTPException(status_code=403, detail="Admin secret required")

    from src.workers.agent_tasks import run_content_agents_all_orgs as task_fn

    if async_mode:
        task = task_fn.delay()
        return {"message": "Content agents queued for all orgs", "task_id": task.id}

    import asyncio

    result = await asyncio.to_thread(task_fn)
    return {"data": result}
