"""Notification log API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.notification import NotificationLog

router = APIRouter(prefix="/v1/notifications", tags=["Notifications"])


@router.get("/")
async def list_notifications(
    org_id: str = Query(..., description="Organization ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List notification logs for an organization."""
    offset = (page - 1) * page_size
    stmt = (
        select(NotificationLog)
        .where(NotificationLog.org_id == org_id)
        .order_by(NotificationLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    logs = result.scalars().all()

    count_stmt = select(NotificationLog).where(NotificationLog.org_id == org_id)
    count_result = await db.execute(count_stmt)
    total = len(count_result.scalars().all())

    return {
        "data": [log.to_dict() for log in logs],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "pages": (total + page_size - 1) // page_size if page_size else 0,
        },
    }
