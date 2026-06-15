"""Webhook idempotency helpers."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.integration import WebhookEvent, WebhookProvider


async def is_webhook_processed(
    session: AsyncSession,
    provider: WebhookProvider,
    external_id: str,
) -> bool:
    stmt = select(WebhookEvent).where(
        WebhookEvent.provider == provider,
        WebhookEvent.external_id == external_id,
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None


async def record_webhook_event(
    session: AsyncSession,
    provider: WebhookProvider,
    external_id: str,
    org_id: str | None,
    success: bool = True,
    error_message: str | None = None,
) -> WebhookEvent:
    event = WebhookEvent(
        provider=provider,
        external_id=external_id,
        org_id=org_id,
        processed_at=datetime.utcnow(),
        success=success,
        error_message=error_message,
    )
    session.add(event)
    await session.flush()
    return event
