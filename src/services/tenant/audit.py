"""Tenant-scoped audit events for admin visibility."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.notification import OnboardingEvent


async def log_tenant_event(
    db: AsyncSession,
    org_id: str,
    event_type: str,
    event_data: dict[str, Any] | None = None,
) -> None:
    """Record a tenant lifecycle event visible in the admin portal."""
    payload = json.dumps(event_data) if event_data else None
    db.add(
        OnboardingEvent(
            org_id=org_id,
            event_type=event_type,
            event_data=payload,
        )
    )
