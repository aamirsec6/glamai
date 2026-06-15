"""GBP review and review-request models."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import Column, Enum as SAEnum, Index, Text, UniqueConstraint
from sqlmodel import Field, SQLModel


class ReviewReplyStatus(str, enum.Enum):
    PENDING = "pending"
    AI_DRAFT = "ai_draft"
    REPLIED = "replied"
    SKIPPED = "skipped"
    FAILED = "failed"


class GbpReview(SQLModel, table=True):
    """Individual Google Business Profile review."""

    __tablename__ = "gbp_reviews"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    org_id: str = Field(foreign_key="orgs.id", index=True)
    google_review_id: str = Field(max_length=500, index=True)
    reviewer_name: str | None = Field(default=None, max_length=255)
    star_rating: int = Field(default=0, ge=0, le=5)
    comment: str | None = Field(default=None, sa_column=Column(Text))
    reply_text: str | None = Field(default=None, sa_column=Column(Text))
    reply_status: ReviewReplyStatus = Field(
        default=ReviewReplyStatus.PENDING,
        sa_column=Column(SAEnum(ReviewReplyStatus), index=True),
    )
    ai_generated: bool = Field(default=False)
    review_created_at: datetime | None = Field(default=None)
    replied_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("org_id", "google_review_id", name="uq_gbp_review_org_google"),
        Index("ix_gbp_reviews_org_status", "org_id", "reply_status"),
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "org_id": self.org_id,
            "google_review_id": self.google_review_id,
            "reviewer_name": self.reviewer_name,
            "star_rating": self.star_rating,
            "comment": self.comment,
            "reply_text": self.reply_text,
            "reply_status": self.reply_status.value,
            "ai_generated": self.ai_generated,
            "review_created_at": (
                self.review_created_at.isoformat() if self.review_created_at else None
            ),
            "replied_at": self.replied_at.isoformat() if self.replied_at else None,
        }


class ReviewRequest(SQLModel, table=True):
    """WhatsApp review request sent to a customer after project completion."""

    __tablename__ = "review_requests"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    org_id: str = Field(foreign_key="orgs.id", index=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    phone: str = Field(max_length=20)
    message_body: str | None = Field(default=None, sa_column=Column(Text))
    gbp_review_link: str | None = Field(default=None, max_length=1000)
    sent: bool = Field(default=False)
    sent_at: datetime | None = Field(default=None)
    review_received: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "org_id": self.org_id,
            "lead_id": self.lead_id,
            "phone": self.phone,
            "sent": self.sent,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "review_received": self.review_received,
        }
