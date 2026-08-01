"""Content agents API — run GBP posts, profile, reviews, and analysis."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.deps import assert_tenant_access
from src.core.database import get_db
from src.services.agents import ContentAgentsOrchestrator

logger = structlog.get_logger(__name__)
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


class RunSeoAgentBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    org_id: str
    execute_actions: bool = True
    async_mode: bool = Field(default=False, alias="async")


class RunGeoAgentBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    org_id: str
    async_mode: bool = Field(default=False, alias="async")


@router.post("/seo/run")
async def run_seo_agent(
    body: RunSeoAgentBody,
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Run SEO agent: rank tracking, gap analysis, and targeted GBP actions."""
    assert_tenant_access(body.org_id, x_org_id, x_admin_secret)

    if body.async_mode:
        from src.workers.seo_tasks import run_seo_agent_for_org

        task = run_seo_agent_for_org.delay(body.org_id, body.execute_actions)
        return {"message": "SEO agent queued", "task_id": task.id}

    from src.services.agents.seo_orchestrator import SeoAgentOrchestrator

    orchestrator = SeoAgentOrchestrator(db)
    result = await orchestrator.run(body.org_id, execute_actions=body.execute_actions)
    await db.commit()

    if result.errors and result.errors == ["org_not_found"]:
        raise HTTPException(status_code=404, detail="Organization not found")

    return {"data": result.to_dict()}


@router.get("/seo/scorecard")
async def get_seo_scorecard(
    org_id: str = Query(...),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Path to Top 3 scorecard for an organization."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)

    from src.services.agents.seo_orchestrator import SeoAgentOrchestrator

    orchestrator = SeoAgentOrchestrator(db)
    scorecard = await orchestrator.get_scorecard(org_id)
    return {"data": scorecard}


@router.post("/geo/run")
async def run_geo_agent(
    body: RunGeoAgentBody,
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Run geo agent: geocode, sync competitors, assign keyword niches."""
    assert_tenant_access(body.org_id, x_org_id, x_admin_secret)

    if body.async_mode:
        from src.workers.geo_tasks import run_geo_agent_for_org

        task = run_geo_agent_for_org.delay(body.org_id)
        return {"message": "Geo agent queued", "task_id": task.id}

    from src.services.agents.geo_orchestrator import GeoLocalAgentOrchestrator

    orchestrator = GeoLocalAgentOrchestrator(db)
    result = await orchestrator.run(body.org_id)
    await db.commit()

    if result.errors and result.errors == ["org_not_found"]:
        raise HTTPException(status_code=404, detail="Organization not found")

    return {"data": result.to_dict()}


class RunGrowthAgentsBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    org_id: str
    async_mode: bool = Field(default=False, alias="async")
    execute_seo_actions: bool = True


@router.post("/growth/run")
async def run_growth_agents(
    body: RunGrowthAgentsBody,
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Run full growth pipeline: geo → SEO → content → review requests."""
    assert_tenant_access(body.org_id, x_org_id, x_admin_secret)

    if body.async_mode:
        from src.workers.growth_tasks import run_growth_agents_for_org

        task = run_growth_agents_for_org.delay(body.org_id)
        return {"message": "Growth agents queued", "task_id": task.id}

    from src.services.agents.growth_orchestrator import GrowthOrchestrator

    orchestrator = GrowthOrchestrator(db)
    result = await orchestrator.run(
        body.org_id,
        execute_seo_actions=body.execute_seo_actions,
    )

    if result.errors and result.errors == ["org_not_found"]:
        await db.rollback()
        raise HTTPException(status_code=404, detail="Organization not found")

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("growth_commit_failed", org_id=body.org_id)
        result.errors.append("db_commit_failed")
    else:
        from src.services.tenant.audit import log_tenant_event

        # Persist audit on a fresh transaction after successful pipeline commit
        try:
            await log_tenant_event(
                db,
                body.org_id,
                "growth_pipeline_run",
                {
                    "summary": result.to_dict().get("summary"),
                    "error_count": len(result.errors),
                    "errors": result.errors[:5],
                },
            )
            await db.commit()
        except Exception:
            await db.rollback()
            logger.warning("growth_audit_failed", org_id=body.org_id)

    return {"data": result.to_dict()}


@router.get("/growth/last-run")
async def get_last_growth_run(
    org_id: str = Query(...),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
):
    """Return the last growth pipeline result for an org (Redis / memory)."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)

    from src.services.agents.run_store import load_growth_run

    data = await load_growth_run(org_id)
    if not data:
        return {"data": None, "message": "No growth run recorded yet"}
    return {"data": data}
