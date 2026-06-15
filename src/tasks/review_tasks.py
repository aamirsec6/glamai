"""Review engine Celery tasks."""

from __future__ import annotations

from src.tasks.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3)
def sync_reviews_for_org(self, org_id: str) -> dict:
    import asyncio

    return asyncio.run(_sync_reviews_for_org(org_id))


async def _sync_reviews_for_org(org_id: str) -> dict:
    from src.database import _async_session_factory
    from src.facades.reviews import ReviewsFacade

    async with _async_session_factory() as session:
        facade = ReviewsFacade(session)
        try:
            result = await facade.sync(org_id)
        finally:
            await facade.close()
        await session.commit()
        return result


@celery_app.task(bind=True, max_retries=3)
def sync_all_reviews(self) -> dict:
    import asyncio

    return asyncio.run(_sync_all_reviews())


async def _sync_all_reviews() -> dict:
    from sqlalchemy import select

    from src.database import _async_session_factory
    from src.facades.reviews import ReviewsFacade
    from src.models.org import Org

    async with _async_session_factory() as session:
        orgs = (
            await session.execute(
                select(Org).where(Org.gbp_place_id.isnot(None), Org.is_active == True)  # noqa: E712
            )
        ).scalars().all()
        synced = 0
        for org in orgs:
            facade = ReviewsFacade(session)
            try:
                await facade.sync(org.id)
                synced += 1
            finally:
                await facade.close()
        await session.commit()
        return {"synced": synced}


@celery_app.task(bind=True, max_retries=3)
def auto_reply_reviews_for_org(self, org_id: str) -> dict:
    import asyncio

    return asyncio.run(_auto_reply_reviews_for_org(org_id))


async def _auto_reply_reviews_for_org(org_id: str) -> dict:
    from src.database import _async_session_factory
    from src.facades.reviews import ReviewsFacade

    async with _async_session_factory() as session:
        facade = ReviewsFacade(session)
        try:
            result = await facade.auto_reply(org_id)
        finally:
            await facade.close()
        await session.commit()
        return result


@celery_app.task(bind=True, max_retries=3)
def auto_reply_all_reviews(self) -> dict:
    import asyncio

    return asyncio.run(_auto_reply_all_reviews())


async def _auto_reply_all_reviews() -> dict:
    from sqlalchemy import select

    from src.database import _async_session_factory
    from src.facades.reviews import ReviewsFacade
    from src.models.org import Org

    async with _async_session_factory() as session:
        orgs = (
            await session.execute(
                select(Org).where(Org.gbp_place_id.isnot(None), Org.is_active == True)  # noqa: E712
            )
        ).scalars().all()
        total_replied = 0
        for org in orgs:
            facade = ReviewsFacade(session)
            try:
                r = await facade.auto_reply(org.id)
                total_replied += r.get("replied", 0)
            finally:
                await facade.close()
        await session.commit()
        return {"replied": total_replied}


@celery_app.task(bind=True, max_retries=3)
def send_review_request(self, org_id: str, lead_id: str) -> dict:
    import asyncio

    return asyncio.run(_send_review_request(org_id, lead_id))


async def _send_review_request(org_id: str, lead_id: str) -> dict:
    from src.database import _async_session_factory
    from src.facades.reviews import ReviewsFacade

    async with _async_session_factory() as session:
        facade = ReviewsFacade(session)
        try:
            result = await facade.request_review(org_id, lead_id)
        finally:
            await facade.close()
        await session.commit()
        return result
