"""Report and notification Celery tasks."""

from __future__ import annotations

from datetime import datetime, timedelta

from src.tasks.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3)
def generate_monthly_reports(self) -> dict:
    """Generate monthly value reports for all active orgs.

    Runs on the 1st of every month at 8 AM IST.
    """
    import asyncio

    return asyncio.run(_generate_monthly_reports())


async def _generate_monthly_reports() -> dict:
    """Async implementation."""
    from src.database import _async_session_factory
    from src.models.org import OnboardingStatus, Org
    from src.models.report import ReportStatus
    from src.services.reports.generator import ReportGenerator

    async with _async_session_factory() as session:
        stmt = select(Org).where(
            Org.onboarding_status.in_(
                [OnboardingStatus.ACTIVE, OnboardingStatus.ONBOARDING_COMPLETE]
            ),
            Org.is_active == True,  # noqa: E712
        )
        result = await session.execute(stmt)
        orgs = result.scalars().all()

        # Previous month
        now = datetime.utcnow()
        if now.month == 1:
            report_month = 12
            report_year = now.year - 1
        else:
            report_month = now.month - 1
            report_year = now.year

        generator = ReportGenerator()
        generated = 0
        failed = 0

        for org in orgs:
            try:
                report = await generator.generate_report(
                    org=org,
                    month=report_month,
                    year=report_year,
                    db=session,
                )
                generated += 1
            except Exception as e:
                failed += 1
                print(f"Failed to generate report for {org.id}: {e}")
                continue

        await session.commit()

        return {
            "generated": generated,
            "failed": failed,
            "period": f"{report_month}/{report_year}",
        }


@celery_app.task(bind=True, max_retries=3)
def check_onboarding_reminders(self) -> dict:
    """Check for orgs stuck in onboarding and send reminders.

    Runs daily at 10 AM IST.
    """
    import asyncio

    return asyncio.run(_check_onboarding_reminders())


async def _check_onboarding_reminders() -> dict:
    """Async implementation."""
    from src.database import _async_session_factory
    from src.models.org import OnboardingStatus, Org

    async with _async_session_factory() as session:
        # Find orgs that signed up but haven't completed onboarding in 3 days
        three_days_ago = datetime.utcnow() - timedelta(days=3)

        stmt = select(Org).where(
            Org.onboarding_status == OnboardingStatus.CREATED,
            Org.created_at < three_days_ago,
            Org.is_active == True,  # noqa: E712
        )
        result = await session.execute(stmt)
        stuck_orgs = result.scalars().all()

        reminded = 0
        for org in stuck_orgs:
            try:
                # In production: send WhatsApp reminder
                # await whatsapp_client.send_text_message(org.phone, "...")
                reminded += 1
            except Exception:
                continue

        return {"reminded": reminded, "total_stuck": len(stuck_orgs)}


@celery_app.task(bind=True, max_retries=3)
def check_territory_conflicts(self) -> dict:
    """Check for territory conflicts that may have arisen.

    Runs daily at 7 AM IST.
    """
    import asyncio

    return asyncio.run(_check_territory_conflicts())


async def _check_territory_conflicts() -> dict:
    """Async implementation."""
    from src.database import _async_session_factory
    from src.models.territory import Territory, TerritoryStatus
    from src.services.territory.checker import TerritoryChecker

    async with _async_session_factory() as session:
        stmt = select(Territory).where(
            Territory.status == TerritoryStatus.ACTIVE
        )
        result = await session.execute(stmt)
        territories = result.scalars().all()

        checker = TerritoryChecker()
        conflicts_found = 0

        # Check each territory against others
        for i, t1 in enumerate(territories):
            for t2 in territories[i + 1:]:
                if t1.city == t2.city and t1.category == t2.category:
                    if t1.overlaps_with(t2):
                        # Check if both are exclusive
                        from src.models.org import ExclusivityTier

                        org1 = await session.get(type(t1.org_id), t1.org_id)
                        org2 = await session.get(type(t2.org_id), t2.org_id)

                        if org1 and org2:
                            if (
                                org1.exclusivity == ExclusivityTier.EXCLUSIVE
                                or org2.exclusivity == ExclusivityTier.EXCLUSIVE
                            ):
                                conflicts_found += 1
                                # In production: alert admin

        return {"conflicts_found": conflicts_found, "territories_checked": len(territories)}
