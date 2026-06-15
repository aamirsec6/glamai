"""GBP-related Celery tasks — delegate to GbpFacade."""

from __future__ import annotations

from datetime import datetime

import structlog
from sqlalchemy import and_, select

from src.tasks.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(bind=True, max_retries=3)
def publish_scheduled_posts(self) -> dict:
    import asyncio

    return asyncio.run(_publish_scheduled_posts())


async def _publish_scheduled_posts() -> dict:
    from src.database import _async_session_factory
    from src.facades.gbp import GbpFacade
    from src.models.gbp import GbpPost, GbpPostStatus

    published = 0
    failed = 0

    async with _async_session_factory() as session:
        now = datetime.utcnow()
        stmt = select(GbpPost).where(
            and_(
                GbpPost.status == GbpPostStatus.SCHEDULED,
                GbpPost.scheduled_at <= now,
            )
        )
        posts = (await session.execute(stmt)).scalars().all()

        facade = GbpFacade(session)
        for post in posts:
            result = await facade.publish_post(post.id)
            if result.get("status") == "ok":
                published += 1
            else:
                failed += 1
        await facade.close()
        await session.commit()

    return {"published": published, "failed": failed, "total": published + failed}


@celery_app.task(bind=True, max_retries=3)
def generate_weekly_posts(self) -> dict:
    import asyncio

    return asyncio.run(_generate_weekly_posts())


async def _generate_weekly_posts() -> dict:
    from src.database import _async_session_factory
    from src.facades.gbp import GbpFacade
    from src.models.org import OnboardingStatus, Org

    async with _async_session_factory() as session:
        orgs = (
            await session.execute(
                select(Org).where(
                    Org.onboarding_status.in_(
                        [
                            OnboardingStatus.ACTIVE,
                            OnboardingStatus.ONBOARDING_COMPLETE,
                            OnboardingStatus.GBP_CONNECTED,
                        ]
                    ),
                    Org.is_active == True,  # noqa: E712
                )
            )
        ).scalars().all()

        facade = GbpFacade(session)
        total = 0
        for org in orgs:
            try:
                result = await facade.generate_drafts(org.id)
                total += result.get("posts_created", 0)
            except Exception as e:
                logger.error("gbp_generate_failed", org_id=org.id, error=str(e))
        await facade.close()
        await session.commit()
        return {"orgs_processed": len(orgs), "total_posts_generated": total}


@celery_app.task(bind=True, max_retries=3)
def sync_gbp_insights(self) -> dict:
    import asyncio

    return asyncio.run(_sync_gbp_insights())


async def _sync_gbp_insights() -> dict:
    return await _sync_orgs(resources=["insights"])


@celery_app.task(bind=True, max_retries=3)
def sync_gbp_competitors(self) -> dict:
    import asyncio

    return asyncio.run(_sync_gbp_competitors())


async def _sync_gbp_competitors() -> dict:
    return await _sync_orgs(resources=["competitors"])


async def _sync_orgs(resources: list[str]) -> dict:
    from src.database import _async_session_factory
    from src.facades.gbp import GbpFacade
    from src.models.org import OnboardingStatus, Org

    synced = 0
    async with _async_session_factory() as session:
        orgs = (
            await session.execute(
                select(Org).where(
                    Org.onboarding_status.in_(
                        [
                            OnboardingStatus.ACTIVE,
                            OnboardingStatus.ONBOARDING_COMPLETE,
                            OnboardingStatus.GBP_CONNECTED,
                        ]
                    ),
                    Org.gbp_place_id.isnot(None),  # noqa: E711
                    Org.is_active == True,  # noqa: E712
                )
            )
        ).scalars().all()

        facade = GbpFacade(session)
        for org in orgs:
            try:
                await facade.sync(org.id, resources=resources)
                synced += 1
            except Exception as e:
                logger.error("gbp_sync_failed", org_id=org.id, error=str(e))
        await facade.close()
        await session.commit()

    return {"orgs_synced": synced, "total_orgs": len(orgs)}


@celery_app.task(bind=True, max_retries=3)
def sync_gbp_for_org(self, org_id: str) -> dict:
    import asyncio

    return asyncio.run(_sync_gbp_for_org(org_id))


async def _sync_gbp_for_org(org_id: str) -> dict:
    from src.database import _async_session_factory
    from src.facades.gbp import GbpFacade

    async with _async_session_factory() as session:
        facade = GbpFacade(session)
        result = await facade.sync(org_id)
        await facade.close()
        await session.commit()
        return result


@celery_app.task(bind=True, max_retries=3)
def generate_posts_for_org(self, org_id: str) -> dict:
    import asyncio

    return asyncio.run(_generate_posts_for_org(org_id))


async def _generate_posts_for_org(org_id: str) -> dict:
    from src.database import _async_session_factory
    from src.facades.gbp import GbpFacade

    async with _async_session_factory() as session:
        facade = GbpFacade(session)
        result = await facade.generate_drafts(org_id)
        await facade.close()
        await session.commit()
        return result


@celery_app.task(bind=True, max_retries=3)
def publish_post_by_id(self, post_id: str) -> dict:
    import asyncio

    return asyncio.run(_publish_post_by_id(post_id))


async def _publish_post_by_id(post_id: str) -> dict:
    from src.database import _async_session_factory
    from src.facades.gbp import GbpFacade

    async with _async_session_factory() as session:
        facade = GbpFacade(session)
        result = await facade.publish_post(post_id)
        await facade.close()
        await session.commit()
        return result


@celery_app.task(bind=True, max_retries=3)
def refresh_expiring_gbp_tokens(self) -> dict:
    import asyncio

    return asyncio.run(_refresh_expiring_gbp_tokens())


async def _refresh_expiring_gbp_tokens() -> dict:
    from datetime import timedelta

    from src.database import _async_session_factory
    from src.models.integration import IntegrationProvider, OrgIntegration
    from src.services.gbp.token_manager import GbpTokenManager

    refreshed = 0
    async with _async_session_factory() as session:
        threshold = datetime.utcnow() + timedelta(hours=24)
        integrations = (
            await session.execute(
                select(OrgIntegration).where(
                    OrgIntegration.provider == IntegrationProvider.GOOGLE_GBP,
                    OrgIntegration.expires_at.isnot(None),  # noqa: E711
                    OrgIntegration.expires_at <= threshold,
                )
            )
        ).scalars().all()

        token_mgr = GbpTokenManager(session)
        for integration in integrations:
            try:
                await token_mgr._refresh(integration)
                refreshed += 1
            except Exception as e:
                logger.error("token_refresh_failed", org_id=integration.org_id, error=str(e))
        await token_mgr.close()
        await session.commit()

    return {"refreshed": refreshed}


@celery_app.task(bind=True, max_retries=3)
def optimize_all_profiles(self) -> dict:
    import asyncio

    return asyncio.run(_optimize_all_profiles())


async def _optimize_all_profiles() -> dict:
    from src.config import get_settings
    from src.database import _async_session_factory
    from src.facades.gbp import GbpFacade
    from src.models.org import Org

    if not get_settings().feature_content_generator:
        return {"status": "feature_disabled"}

    optimized = 0
    async with _async_session_factory() as session:
        orgs = (
            await session.execute(
                select(Org).where(Org.gbp_place_id.isnot(None), Org.is_active == True)  # noqa: E712
            )
        ).scalars().all()
        for org in orgs:
            facade = GbpFacade(session)
            try:
                await facade.sync_profile(org.id)
                result = await facade.optimize_profile(org.id)
                if result.get("status") == "ok":
                    optimized += 1
            finally:
                await facade.close()
        await session.commit()
    return {"optimized": optimized}
