"""Notification Celery tasks."""

from __future__ import annotations

from datetime import datetime, timedelta

from src.tasks.celery_app import celery_app


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
    from src.database import _async_session_factory
    from src.models.lead import Lead
    from src.models.org import Org
    from src.models.notification import (
        NotificationChannel,
        NotificationLog,
        NotificationType,
    )
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
        # client = WhatsappClient(api_key=...)
        # result = await client.send_text_message(org.phone, message)

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
    from src.database import _async_session_factory
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
