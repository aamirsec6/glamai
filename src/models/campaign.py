"""WhatsApp marketing campaign models."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import Column, Enum as SAEnum, Index, Text
from sqlmodel import Field, SQLModel


class CampaignType(str, enum.Enum):
    REPEAT_SALE = "repeat_sale"
    OFFER = "offer"
    REMINDER = "reminder"
    REVIEW_REQUEST = "review_request"
    STALE_LEAD = "stale_lead"


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RecipientStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    SKIPPED = "skipped"


class MarketingCampaign(SQLModel, table=True):
    """Outbound WhatsApp marketing campaign for an org."""

    __tablename__ = "marketing_campaigns"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    org_id: str = Field(foreign_key="orgs.id", index=True)
    name: str = Field(max_length=255)
    campaign_type: CampaignType = Field(
        sa_column=Column(SAEnum(CampaignType), index=True),
    )
    status: CampaignStatus = Field(
        default=CampaignStatus.DRAFT,
        sa_column=Column(SAEnum(CampaignStatus), index=True),
    )
    message_template: str | None = Field(default=None, sa_column=Column(Text))
    offer_text: str | None = Field(default=None, sa_column=Column(Text))
    audience_filter: str | None = Field(
        default=None, sa_column=Column(Text)
    )  # JSON: {status, days_since_won, etc.}
    scheduled_at: datetime | None = Field(default=None, index=True)
    started_at: datetime | None = Field(default=None)
    completed_at: datetime | None = Field(default=None)
    total_recipients: int = Field(default=0)
    sent_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    __table_args__ = (Index("ix_campaigns_org_status", "org_id", "status"),)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "org_id": self.org_id,
            "name": self.name,
            "campaign_type": self.campaign_type.value,
            "status": self.status.value,
            "offer_text": self.offer_text,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "total_recipients": self.total_recipients,
            "sent_count": self.sent_count,
            "created_at": self.created_at.isoformat(),
        }


class CampaignRecipient(SQLModel, table=True):
    """Individual recipient in a marketing campaign."""

    __tablename__ = "campaign_recipients"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    campaign_id: str = Field(foreign_key="marketing_campaigns.id", index=True)
    org_id: str = Field(foreign_key="orgs.id", index=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    phone: str = Field(max_length=20)
    status: RecipientStatus = Field(
        default=RecipientStatus.PENDING,
        sa_column=Column(SAEnum(RecipientStatus), index=True),
    )
    message_body: str | None = Field(default=None, sa_column=Column(Text))
    error: str | None = Field(default=None, max_length=500)
    sent_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "campaign_id": self.campaign_id,
            "lead_id": self.lead_id,
            "phone": self.phone,
            "status": self.status.value,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
        }
