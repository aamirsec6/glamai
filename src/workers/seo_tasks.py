"""Celery tasks for SEO agent and rank tracking."""

from __future__ import annotations

import asyncio

import structlog
from sqlalchemy import select

from src.models.org import OnboardingStatus, Org
from src.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(bind=True, max_retries=3)
def run_seo_agent_for_org(self, org_id: str, execute_actions: bool = True):
    """Run SEO agent for a single org."""
    return asyncio.run(_run_seo(org_id, execute_actions))


@celery_app.task(bind=True, max_retries=3)
def track_rankings_all_orgs(self):
    """Track keyword rankings for all active orgs."""
    return asyncio.run(_track_all())


async def _run_seo(org_id: str, execute_actions: bool) -> dict:
    from src.core.database import _async_session_factory
    from src.services.agents.seo_orchestrator import SeoAgentOrchestrator

    async with _async_session_factory() as session:
        orchestrator = SeoAgentOrchestrator(session)
        result = await orchestrator.run(org_id, execute_actions=execute_actions)
        await session.commit()
        return result.to_dict()


async def _track_all() -> dict:
    from src.core.database import _async_session_factory
    from src.services.agents.seo_orchestrator import SeoAgentOrchestrator

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
        results = []
        orchestrator = SeoAgentOrchestrator(session)
        for org in orgs:
            try:
                await orchestrator.run(org.id, execute_actions=False)
                results.append({"org_id": org.id, "status": "ok"})
            except Exception as e:
                logger.exception("seo_agent_org_failed", org_id=org.id)
                results.append({"org_id": org.id, "status": "error", "error": str(e)})
        await session.commit()
        return {"processed": len(results), "results": results}
