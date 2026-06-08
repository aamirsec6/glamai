"""GBP-related Celery tasks."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, select

from src.tasks.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3)
def publish_scheduled_posts(self) -> dict:
    """Publish GBP posts that are scheduled for now or earlier.

    Runs every 15 minutes.
    """
    import asyncio

    return asyncio.run(_publish_scheduled_posts())


async def _publish_scheduled_posts() -> dict:
    """Async implementation."""
    from src.database import _async_session_factory
    from src.models.gbp import GbpPost, GbpPostStatus

    async with _async_session_factory() as session:
        now = datetime.utcnow()

        # Find posts scheduled for now or earlier
        stmt = select(GbpPost).where(
            and_(
                GbpPost.status == GbpPostStatus.SCHEDULED,
                GbpPost.scheduled_at <= now,
            )
        )
        result = await session.execute(stmt)
        posts = result.scalars().all()

        published = 0
        failed = 0

        for post in posts:
            try:
                # In production: call GbpClient.create_post()
                # For now, mark as published
                post.status = GbpPostStatus.PUBLISHED
                post.published_at = now
                session.add(post)
                published += 1
            except Exception:
                post.status = GbpPostStatus.FAILED
                session.add(post)
                failed += 1

        await session.commit()

        return {"published": published, "failed": failed, "total": len(posts)}


@celery_app.task(bind=True, max_retries=3)
def generate_weekly_posts(self) -> dict:
    """Generate 4 new GBP posts for each active org.

    Runs every Monday at 9 AM IST.
    """
    import asyncio

    return asyncio.run(_generate_weekly_posts())


async def _generate_weekly_posts() -> dict:
    """Async implementation."""
    from src.database import _async_session_factory
    from src.models.org import OnboardingStatus, Org
    from src.services.gbp.optimizer import GbpPostGenerator

    async with _async_session_factory() as session:
        # Get all active orgs
        stmt = select(Org).where(
            Org.onboarding_status.in_(
                [OnboardingStatus.ACTIVE, OnboardingStatus.ONBOARDING_COMPLETE]
            ),
            Org.is_active == True,  # noqa: E712
        )
        result = await session.execute(stmt)
        orgs = result.scalars().all()

        generator = GbpPostGenerator()
        total_posts = 0

        now = datetime.utcnow()
        for org in orgs:
            try:
                posts = await generator.generate_monthly_posts(
                    org=org,
                    month=now.month,
                    year=now.year,
                )
                total_posts += len(posts)
            except Exception as e:
                # Log but don't fail the entire batch
                print(f"Failed to generate posts for {org.id}: {e}")
                continue

        return {"orgs_processed": len(orgs), "total_posts_generated": total_posts}


@celery_app.task(bind=True, max_retries=3)
def sync_gbp_insights(self) -> dict:
    """Sync Google Business Profile insights for all active orgs.

    Runs daily at 6 AM IST.
    """
    import asyncio

    return asyncio.run(_sync_gbp_insights())


async def _sync_gbp_insights() -> dict:
    """Async implementation."""
    from src.database import _async_session_factory
    from src.models.org import OnboardingStatus, Org

    async with _async_session_factory() as session:
        stmt = select(Org).where(
            Org.onboarding_status.in_(
                [OnboardingStatus.ACTIVE, OnboardingStatus.ONBOARDING_COMPLETE]
            ),
            Org.gbp_place_id.isnot(None),  # noqa: E711
            Org.is_active == True,  # noqa: E712
        )
        result = await session.execute(stmt)
        orgs = result.scalars().all()

        synced = 0
        for org in orgs:
            try:
                # In production: call GbpClient.get_insights()
                # Store in GbpInsights table
                synced += 1
            except Exception:
                continue

        return {"orgs_synced": synced, "total_orgs": len(orgs)}
