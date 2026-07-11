"""Marketing Celery tasks."""

from __future__ import annotations

from src.workers.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3)
def run_repeat_sale_campaigns(self) -> dict:
    import asyncio

    return asyncio.run(_run_repeat_sale_campaigns())


async def _run_repeat_sale_campaigns() -> dict:
    from sqlalchemy import select

    from src.core.database import _async_session_factory
    from src.application.marketing import MarketingFacade
    from src.models.org import Org

    async with _async_session_factory() as session:
        orgs = (await session.execute(select(Org).where(Org.is_active == True))).scalars().all()  # noqa: E712
        total_sent = 0
        for org in orgs:
            facade = MarketingFacade(session)
            try:
                result = await facade.run_repeat_sale(org.id)
                total_sent += result.get("sent", 0)
            finally:
                await facade.close()
        await session.commit()
        return {"orgs": len(orgs), "total_sent": total_sent}


@celery_app.task(bind=True, max_retries=3)
def run_stale_lead_reminders(self) -> dict:
    import asyncio

    return asyncio.run(_run_stale_lead_reminders())


async def _run_stale_lead_reminders() -> dict:
    from sqlalchemy import select

    from src.core.database import _async_session_factory
    from src.application.marketing import MarketingFacade
    from src.models.campaign import CampaignType
    from src.models.org import Org

    async with _async_session_factory() as session:
        orgs = (await session.execute(select(Org).where(Org.is_active == True))).scalars().all()  # noqa: E712
        total_sent = 0
        for org in orgs:
            facade = MarketingFacade(session)
            try:
                result = await facade.create_and_launch(
                    org.id,
                    "Stale lead reminder",
                    CampaignType.STALE_LEAD.value,
                )
                total_sent += result.get("sent", 0)
            finally:
                await facade.close()
        await session.commit()
        return {"orgs": len(orgs), "total_sent": total_sent}


@celery_app.task(bind=True, max_retries=3)
def launch_campaign(self, campaign_id: str) -> dict:
    import asyncio

    return asyncio.run(_launch_campaign(campaign_id))


async def _launch_campaign(campaign_id: str) -> dict:
    from src.core.database import _async_session_factory
    from src.services.marketing.campaign_engine import CampaignEngine

    async with _async_session_factory() as session:
        engine = CampaignEngine(session)
        try:
            result = await engine.launch_campaign(campaign_id)
        finally:
            await engine.close()
        await session.commit()
        return result
