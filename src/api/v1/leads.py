"""Lead API routes."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.lead import Lead, LeadStatus, WhatsappConversation

router = APIRouter(prefix="/v1/leads", tags=["Leads"])


@router.get("/")
async def list_leads(
    org_id: str = Query(..., description="Organization ID"),
    status: str | None = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List leads for an organization."""
    query = select(Lead).where(Lead.org_id == org_id)

    if status:
        try:
            status_enum = LeadStatus(status)
            query = query.where(Lead.status == status_enum)
        except ValueError:
            pass

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Lead.created_at.desc()).offset(offset).limit(page_size)

    # Count total
    count_query = select(Lead).where(Lead.org_id == org_id)
    if status:
        count_query = count_query.where(Lead.status == LeadStatus(status))

    result = await db.execute(query)
    leads = result.scalars().all()

    count_result = await db.execute(count_query)
    total = len(count_result.scalars().all())

    return {
        "data": [lead.to_dict() for lead in leads],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "pages": (total + page_size - 1) // page_size,
        },
    }


@router.get("/{lead_id}")
async def get_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single lead with conversation history."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Get conversation history
    conv_stmt = (
        select(WhatsappConversation)
        .where(WhatsappConversation.lead_id == lead_id)
        .order_by(WhatsappConversation.sent_at.asc())
    )
    conv_result = await db.execute(conv_stmt)
    conversations = conv_result.scalars().all()

    return {
        "data": {
            **lead.to_dict(),
            "conversations": [
                {
                    "id": c.id,
                    "direction": c.direction.value,
                    "sender": c.sender.value,
                    "text": c.message_text,
                    "type": c.message_type,
                    "delivered": c.delivered,
                    "read": c.read,
                    "sent_at": c.sent_at.isoformat() if c.sent_at else None,
                }
                for c in conversations
            ],
        }
    }


@router.patch("/{lead_id}")
async def update_lead(
    lead_id: str,
    status: str | None = None,
    assigned_to: str | None = None,
    won_value_inr: float | None = None,
    lost_reason: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Update lead status or assignment."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if status:
        try:
            lead.status = LeadStatus(status)
            lead.status_changed_at = datetime.utcnow()
            lead.last_contact_at = datetime.utcnow()
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    if assigned_to is not None:
        lead.assigned_to = assigned_to

    if won_value_inr is not None:
        lead.won_value_paise = int(won_value_inr * 100)
        lead.status = LeadStatus.WON

    if lost_reason is not None:
        lead.lost_reason = lost_reason
        lead.status = LeadStatus.LOST

    lead.updated_at = datetime.utcnow()
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    return {"data": lead.to_dict()}
