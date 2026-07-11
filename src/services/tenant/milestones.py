"""Tenant milestone events for funnel analytics."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.lead import Lead
from src.models.notification import OnboardingEvent
from src.services.tenant.audit import log_tenant_event


async def record_first_lead_if_needed(db: AsyncSession, org_id: str) -> None:
    """Emit first_lead onboarding event once per org."""
    existing = (
        await db.execute(
            select(func.count())
            .select_from(OnboardingEvent)
            .where(
                OnboardingEvent.org_id == org_id,
                OnboardingEvent.event_type == "first_lead",
            )
        )
    ).scalar()
    if existing:
        return

    lead_count = (
        await db.execute(
            select(func.count()).select_from(Lead).where(Lead.org_id == org_id)
        )
    ).scalar()
    if (lead_count or 0) < 1:
        return
    await log_tenant_event(db, org_id, "first_lead", {"source": "milestone"})
