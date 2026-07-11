"""Admin quick actions for client accounts."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.integrations.base import ConnectorResource, ConnectorStatus
from src.integrations.registry import ConnectorRegistry
from src.models.notification import (
    NotificationChannel,
    NotificationLog,
    NotificationType,
    OnboardingEvent,
)
from src.models.org import OnboardingStatus, Org
from src.services.tenant.audit import log_tenant_event


async def _last_paused_from_status(session: AsyncSession, org_id: str) -> str:
    result = await session.execute(
        select(OnboardingEvent)
        .where(
            OnboardingEvent.org_id == org_id,
            OnboardingEvent.event_type == "account_paused",
        )
        .order_by(OnboardingEvent.created_at.desc())
        .limit(1)
    )
    event = result.scalar_one_or_none()
    if event and event.event_data:
        try:
            data = json.loads(event.event_data)
            return data.get("from_status", OnboardingStatus.ACTIVE.value)
        except json.JSONDecodeError:
            pass
    return OnboardingStatus.ACTIVE.value


async def pause_org(session: AsyncSession, org_id: str) -> dict[str, Any]:
    org = await session.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if org.onboarding_status == OnboardingStatus.PAUSED:
        return {"status": "already_paused", "org": org.to_dict()}

    prev_status = org.onboarding_status.value
    org.onboarding_status = OnboardingStatus.PAUSED
    org.is_active = False
    org.updated_at = datetime.utcnow()
    session.add(org)
    await log_tenant_event(
        session,
        org_id,
        "account_paused",
        {"from_status": prev_status, "by": "admin"},
    )
    await session.commit()
    await session.refresh(org)
    return {"status": "paused", "org": org.to_dict(), "previous_status": prev_status}


async def resume_org(session: AsyncSession, org_id: str) -> dict[str, Any]:
    org = await session.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if org.onboarding_status != OnboardingStatus.PAUSED:
        raise HTTPException(status_code=400, detail="Account is not paused")

    restore = await _last_paused_from_status(session, org_id)
    try:
        new_status = OnboardingStatus(restore)
    except ValueError:
        new_status = OnboardingStatus.ACTIVE

    org.onboarding_status = new_status
    org.is_active = new_status in (
        OnboardingStatus.ACTIVE,
        OnboardingStatus.ONBOARDING_COMPLETE,
    )
    org.updated_at = datetime.utcnow()
    session.add(org)
    await log_tenant_event(
        session,
        org_id,
        "account_resumed",
        {"restored_status": new_status.value, "by": "admin"},
    )
    await session.commit()
    await session.refresh(org)
    return {"status": "resumed", "org": org.to_dict(), "restored_status": new_status.value}


async def send_org_message(
    session: AsyncSession,
    org_id: str,
    message: str,
    *,
    channel: str = "whatsapp",
) -> dict[str, Any]:
    org = await session.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    text = message.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    recipient = (org.whatsapp_number or org.phone or "").strip().lstrip("+")
    if not recipient:
        raise HTTPException(status_code=400, detail="No phone or WhatsApp number on file")

    sent = False
    delivery_note = "logged_only"
    external_id: str | None = None

    registry = ConnectorRegistry(session)
    try:
        wa = registry.whatsapp()
        health = await wa.health(org_id)
        if health.status == ConnectorStatus.READY:
            result = await wa.push(
                org_id,
                ConnectorResource.MESSAGE,
                {"to_phone": recipient, "message": text},
            )
            if result.ok:
                sent = True
                delivery_note = "whatsapp_sent"
                external_id = str(result.data.get("message_id", ""))
            else:
                delivery_note = result.error or "whatsapp_failed"
        else:
            delivery_note = "whatsapp_not_configured"
        await wa.close()
    except Exception as exc:
        delivery_note = f"error:{exc}"

    log = NotificationLog(
        org_id=org_id,
        channel=NotificationChannel.WHATSAPP,
        notification_type=NotificationType.SYSTEM,
        recipient=recipient,
        subject="Admin message",
        body=text,
        metadata_json=json.dumps({"channel": channel, "by": "admin", "note": delivery_note}),
        sent=sent,
        delivered=sent,
        sent_at=datetime.utcnow() if sent else None,
    )
    session.add(log)
    await log_tenant_event(
        session,
        org_id,
        "admin_message_sent",
        {"recipient": recipient, "sent": sent, "delivery_note": delivery_note},
    )
    await session.commit()

    return {
        "status": "sent" if sent else "queued",
        "sent": sent,
        "delivery_note": delivery_note,
        "recipient": recipient,
        "notification_id": log.id,
        "external_id": external_id,
    }
