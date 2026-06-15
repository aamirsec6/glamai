"""Lead API routes."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import assert_tenant_access, require_org_access
from src.database import get_db
from src.models.lead import Lead, LeadSource, LeadStatus, WhatsappConversation

router = APIRouter(prefix="/v1/leads", tags=["Leads"])


class LeadCreateSchema(BaseModel):
    org_id: str
    contact_name: str
    contact_phone: str
    contact_email: str | None = None
    source: LeadSource = LeadSource.WHATSAPP
    status: LeadStatus = LeadStatus.NEW


class LeadUpdateSchema(BaseModel):
    org_id: str
    status: str | None = None
    assigned_to: str | None = None
    won_value_inr: float | None = None
    lost_reason: str | None = None


@router.post("/")
async def create_lead(
    body: LeadCreateSchema,
    db: AsyncSession = Depends(get_db),
):
    """Create a lead manually (imports, onboarding tests)."""
    lead = Lead(
        org_id=body.org_id,
        source=body.source,
        contact_name=body.contact_name,
        contact_phone=body.contact_phone.strip().lstrip("+"),
        contact_email=body.contact_email,
        status=body.status,
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return {"data": lead.to_dict(), "message": "Lead created"}


@router.get("/")
async def list_leads(
    org_id: str = Query(..., description="Organization ID"),
    status: str | None = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """List leads for an organization."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    query = select(Lead).where(Lead.org_id == org_id)

    if status:
        try:
            status_enum = LeadStatus(status)
            query = query.where(Lead.status == status_enum)
        except ValueError:
            pass

    offset = (page - 1) * page_size
    query = query.order_by(Lead.created_at.desc()).offset(offset).limit(page_size)

    count_query = select(Lead).where(Lead.org_id == org_id)
    if status:
        try:
            count_query = count_query.where(Lead.status == LeadStatus(status))
        except ValueError:
            pass

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
    org_id: str = Query(..., description="Organization ID"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single lead with conversation history."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    require_org_access(org_id, lead.org_id)

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
    body: LeadUpdateSchema,
    db: AsyncSession = Depends(get_db),
):
    """Update lead status or assignment."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    require_org_access(body.org_id, lead.org_id)

    was_won = lead.status == LeadStatus.WON
    if body.status:
        try:
            lead.status = LeadStatus(body.status)
            lead.status_changed_at = datetime.utcnow()
            lead.last_contact_at = datetime.utcnow()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}") from e

    if body.assigned_to is not None:
        lead.assigned_to = body.assigned_to

    if body.won_value_inr is not None:
        lead.won_value_paise = int(body.won_value_inr * 100)
        lead.status = LeadStatus.WON

    if body.lost_reason is not None:
        lead.lost_reason = body.lost_reason
        lead.status = LeadStatus.LOST

    lead.updated_at = datetime.utcnow()
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    if lead.status == LeadStatus.WON and not was_won:
        from src.config import get_settings

        settings = get_settings()
        if settings.feature_review_engine:
            from src.tasks.review_tasks import send_review_request

            send_review_request.delay(body.org_id, lead_id)

    return {"data": lead.to_dict()}
