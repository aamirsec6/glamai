"""Celery tasks for growth agent pipeline."""

from __future__ import annotations

import asyncio

import structlog
from sqlalchemy import select

from src.models.org import OnboardingStatus, Org
from src.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(bind=True, max_retries=3)
def run_growth_agents_for_org(self, org_id: str):
    """Run full growth pipeline for one org: geo → seo → content."""
    return asyncio.run(_run_growth(org_id))


@celery_app.task(bind=True, max_retries=3)
def run_growth_agents_all_orgs(self):
    """Weekly growth pipeline for all active orgs."""
    return asyncio.run(_run_growth_all())


async def _run_growth(org_id: str) -> dict:
    from src.core.database import _async_session_factory
    from src.services.agents.growth_orchestrator import GrowthOrchestrator

    async with _async_session_factory() as session:
        orchestrator = GrowthOrchestrator(session)
        result = await orchestrator.run(org_id)
        await session.commit()
        return result.to_dict()


async def _run_growth_all() -> dict:
    from src.core.database import _async_session_factory
    from src.services.agents.growth_orchestrator import GrowthOrchestrator

    async with _async_session_factory() as session:
        stmt = select(Org).where(
            Org.is_active == True,  # noqa: E712
            Org.onboarding_status.in_([
                OnboardingStatus.ACTIVE,
                OnboardingStatus.ONBOARDING_COMPLETE,
                OnboardingStatus.GBP_CONNECTED,
            ]),
        )
        orgs = (await session.execute(stmt)).scalars().all()
        orchestrator = GrowthOrchestrator(session)
        results = []
        for org in orgs:
            try:
                r = await orchestrator.run(org.id)
                results.append({"org_id": org.id, "status": "ok", "summary": r.to_dict().get("summary")})
            except Exception as e:
                logger.exception("growth_agent_org_failed", org_id=org.id)
                results.append({"org_id": org.id, "status": "error", "error": str(e)})
        await session.commit()
        return {"processed": len(results), "results": results}
