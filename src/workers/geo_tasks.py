"""Celery tasks for geo / local agent."""

from __future__ import annotations

import asyncio

import structlog
from sqlalchemy import select

from src.models.org import OnboardingStatus, Org
from src.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(bind=True, max_retries=3)
def run_geo_agent_for_org(self, org_id: str):
    """Run geo agent for a single org."""
    return asyncio.run(_run_geo(org_id))


@celery_app.task(bind=True, max_retries=3)
def run_geo_agents_all_orgs(self):
    """Run geo agent for all active orgs."""
    return asyncio.run(_run_geo_all())


async def _run_geo(org_id: str) -> dict:
    from src.core.database import _async_session_factory
    from src.services.agents.geo_orchestrator import GeoLocalAgentOrchestrator

    async with _async_session_factory() as session:
        orchestrator = GeoLocalAgentOrchestrator(session)
        result = await orchestrator.run(org_id)
        await session.commit()
        return result.to_dict()


async def _run_geo_all() -> dict:
    from src.core.database import _async_session_factory
    from src.services.agents.geo_orchestrator import GeoLocalAgentOrchestrator

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
        orchestrator = GeoLocalAgentOrchestrator(session)
        results = []
        for org in orgs:
            try:
                r = await orchestrator.run(org.id)
                results.append({"org_id": org.id, "status": "ok", "keywords": r.geo_brief.get("keywords_assigned", [])})
            except Exception as e:
                logger.exception("geo_agent_org_failed", org_id=org.id)
                results.append({"org_id": org.id, "status": "error", "error": str(e)})
        await session.commit()
        return {"processed": len(results), "results": results}
