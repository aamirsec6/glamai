"""Celery tasks for content agent orchestration."""

from __future__ import annotations

from src.workers.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3)
def run_content_agents_for_org(
    self,
    org_id: str,
    generate_posts: bool = True,
    post_count: int = 4,
    optimize_profile: bool = True,
    auto_reply_reviews: bool = True,
    include_analysis: bool = True,
    schedule_posts: bool = True,
) -> dict:
    import asyncio

    return asyncio.run(
        _run_content_agents_for_org(
            org_id,
            generate_posts=generate_posts,
            post_count=post_count,
            optimize_profile=optimize_profile,
            auto_reply_reviews=auto_reply_reviews,
            include_analysis=include_analysis,
            schedule_posts=schedule_posts,
        )
    )


async def _run_content_agents_for_org(org_id: str, **kwargs) -> dict:
    from src.core.database import _async_session_factory
    from src.services.agents import ContentAgentsOrchestrator

    async with _async_session_factory() as session:
        orchestrator = ContentAgentsOrchestrator(session)
        result = await orchestrator.run(org_id, **kwargs)
        await session.commit()
        return result.to_dict()


@celery_app.task(bind=True, max_retries=3)
def run_content_agents_all_orgs(self) -> dict:
    import asyncio

    return asyncio.run(_run_content_agents_all_orgs())


async def _run_content_agents_all_orgs() -> dict:
    from sqlalchemy import select

    from src.core.database import _async_session_factory
    from src.models.org import OnboardingStatus, Org
    from src.services.agents import ContentAgentsOrchestrator

    async with _async_session_factory() as session:
        orgs = (
            await session.execute(
                select(Org).where(
                    Org.is_active == True,  # noqa: E712
                    Org.onboarding_status.in_(
                        [
                            OnboardingStatus.ACTIVE,
                            OnboardingStatus.ONBOARDING_COMPLETE,
                            OnboardingStatus.GBP_CONNECTED,
                        ]
                    ),
                )
            )
        ).scalars().all()

        total_posts = 0
        total_replies = 0
        processed = 0

        for org in orgs:
            orchestrator = ContentAgentsOrchestrator(session)
            try:
                result = await orchestrator.run(org.id)
                total_posts += result.posts.get("posts_created", 0)
                total_replies += result.reviews.get("replied", 0)
                processed += 1
            except Exception:
                continue

        await session.commit()
        return {
            "orgs_processed": processed,
            "total_posts_created": total_posts,
            "total_review_replies": total_replies,
        }
