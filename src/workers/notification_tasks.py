"""Notification Celery tasks."""

from __future__ import annotations

from datetime import datetime, timedelta

from src.workers.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3)
def send_lead_notification(
    self,
    org_id: str,
    lead_id: str,
    lead_summary: str,
) -> dict:
    """Send a new lead notification to the designer via WhatsApp."""
    import asyncio

    return asyncio.run(_send_lead_notification(org_id, lead_id, lead_summary))


async def _send_lead_notification(
    org_id: str,
    lead_id: str,
    lead_summary: str,
) -> dict:
    """Async implementation."""
    from src.core.config import get_settings
    from src.core.database import _async_session_factory
    from src.models.lead import Lead
    from src.models.notification import (
        NotificationChannel,
        NotificationLog,
        NotificationType,
    )
    from src.models.org import Org
    from src.services.whatsapp.client import WhatsappClient
    from src.services.whatsapp.templates import get_lead_notification_message

    async with _async_session_factory() as session:
        org = await session.get(Org, org_id)
        lead = await session.get(Lead, lead_id)

        if not org or not lead:
            return {"status": "org_or_lead_not_found"}

        message = get_lead_notification_message(
            lead_name=lead.contact_name,
            lead_phone=lead.contact_phone,
            summary=lead_summary,
            budget=lead.budget_range.value if lead.budget_range else "unknown",
            location=lead.location_area or "unknown",
        )

        # In production: send via WhatsappClient
        settings = get_settings()
        if settings.whatsapp_api_key or settings.whatsapp_360dialog_api_key:
            client = WhatsappClient(
                api_key=settings.whatsapp_api_key or settings.whatsapp_360dialog_api_key,
                base_url=settings.whatsapp_base_url,
            )
            if org.phone:
                await client.send_text_message(to_phone=org.phone, message=message)
            await client.close()

        # Log the notification
        log = NotificationLog(
            org_id=org_id,
            lead_id=lead_id,
            channel=NotificationChannel.WHATSAPP,
            notification_type=NotificationType.NEW_LEAD,
            recipient=org.phone or "",
            body=message,
            sent=True,
            sent_at=datetime.utcnow(),
        )
        session.add(log)
        await session.commit()

        return {"status": "sent", "recipient": org.phone}


@celery_app.task(bind=True, max_retries=3)
def send_monthly_report(
    self,
    org_id: str,
    report_id: str,
) -> dict:
    """Send a monthly report to the client via WhatsApp."""
    import asyncio

    return asyncio.run(_send_monthly_report(org_id, report_id))


async def _send_monthly_report(
    org_id: str,
    report_id: str,
) -> dict:
    """Async implementation."""
    from src.core.database import _async_session_factory
    from src.models.org import Org
    from src.models.report import MonthlyReport, ReportStatus
    from src.models.notification import (
        NotificationChannel,
        NotificationLog,
        NotificationType,
    )

    async with _async_session_factory() as session:
        org = await session.get(Org, org_id)
        report = await session.get(MonthlyReport, report_id)

        if not org or not report:
            return {"status": "org_or_report_not_found"}

        # In production: send PDF via WhatsApp
        # client = WhatsappClient(api_key=...)
        # result = await client.send_text_message(org.phone, message)

        report.status = ReportStatus.DELIVERED
        report.delivered_via = "whatsapp"
        report.delivered_at = datetime.utcnow()
        session.add(report)

        log = NotificationLog(
            org_id=org_id,
            channel=NotificationChannel.WHATSAPP,
            notification_type=NotificationType.MONTHLY_REPORT,
            recipient=org.phone or "",
            body=f"Monthly report for {report.period_label}",
            sent=True,
            sent_at=datetime.utcnow(),
        )
        session.add(log)
        await session.commit()

        return {"status": "delivered", "period": report.period_label}


@celery_app.task(bind=True, max_retries=3)
def check_onboarding_reminders(self) -> dict:
    """Remind orgs stuck in onboarding."""
    import asyncio

    return asyncio.run(_check_onboarding_reminders())


async def _check_onboarding_reminders() -> dict:
    import structlog
    from sqlalchemy import select

    from src.core.database import _async_session_factory
    from src.models.notification import NotificationChannel, NotificationLog, NotificationType
    from src.models.org import OnboardingStatus, Org

    logger = structlog.get_logger(__name__)
    reminded = 0
    cutoff = datetime.utcnow() - timedelta(days=3)

    async with _async_session_factory() as session:
        stmt = select(Org).where(
            Org.onboarding_status.notin_(
                [OnboardingStatus.ACTIVE, OnboardingStatus.ONBOARDING_COMPLETE, OnboardingStatus.CHURNED]
            ),
            Org.is_active == True,  # noqa: E712
            Org.created_at <= cutoff,
        )
        result = await session.execute(stmt)
        orgs = result.scalars().all()

        for org in orgs:
            log = NotificationLog(
                org_id=org.id,
                channel=NotificationChannel.IN_APP,
                notification_type=NotificationType.ONBOARDING_REMINDER,
                recipient=org.email,
                body=f"Complete your GlamAI setup — currently at {org.onboarding_status.value}",
                sent=True,
                sent_at=datetime.utcnow(),
            )
            session.add(log)
            reminded += 1
            logger.info("onboarding_reminder_sent", org_id=org.id)

        await session.commit()

    return {"reminded": reminded}


@celery_app.task(bind=True, max_retries=3)
def check_territory_conflicts(self) -> dict:
    """Check for new territory conflicts among active orgs."""
    import asyncio

    return asyncio.run(_check_territory_conflicts())


async def _check_territory_conflicts() -> dict:
    import structlog
    from sqlalchemy import select

    from src.core.database import _async_session_factory
    from src.models.org import Org
    from src.models.territory import Territory, TerritoryStatus
    from src.services.territory.checker import TerritoryChecker

    logger = structlog.get_logger(__name__)
    conflicts = 0

    async with _async_session_factory() as session:
        stmt = select(Territory).where(Territory.status == TerritoryStatus.ACTIVE)
        result = await session.execute(stmt)
        territories = result.scalars().all()
        checker = TerritoryChecker()

        for territory in territories:
            org = await session.get(Org, territory.org_id)
            if not org or org.latitude is None or org.longitude is None:
                continue
            check = await checker.check_conflict(
                new_org=org,
                latitude=territory.center_latitude,
                longitude=territory.center_longitude,
                db=session,
            )
            if check.get("has_conflict"):
                conflicts += 1
                logger.warning("territory_conflict_detected", org_id=org.id)

    return {"conflicts_found": conflicts}

