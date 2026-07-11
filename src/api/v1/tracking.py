"""Client-side user journey event tracking."""

from __future__ import annotations

import json
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.models.journey import UserJourneyEvent

router = APIRouter()


@router.post("/v1/track", status_code=204)
async def track_event(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Track a user journey event from the client dashboard."""
    try:
        body = await request.json()
    except Exception:
        return

    org_id = body.get("org_id")
    session_id = body.get("session_id")
    event_type = body.get("event_type", "page_view")

    if not org_id or not session_id:
        return

    page = body.get("page", "")
    element = body.get("element", "")
    description = body.get("description") or f"{event_type}: {page}"
    if element:
        description += f" ({element})"

    metadata = body.get("metadata", {})
    metadata_json = json.dumps(metadata) if metadata else None

    event = UserJourneyEvent(
        id=str(uuid4()),
        org_id=org_id,
        session_id=session_id,
        event_type=event_type,
        page=page,
        element=element,
        description=description[:500],
        metadata_json=metadata_json,
        created_at=datetime.utcnow(),
    )
    db.add(event)
    await db.commit()
