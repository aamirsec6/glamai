"""Notification and event log models."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import Column, Enum as SAEnum, Index
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from src.models.lead import Lead
    from src.models.org import Org


class NotificationChannel(str, enum.Enum):
    """Channel through which a notification was sent."""

    WHATSAPP = "whatsapp"
    EMAIL = "email"
    IN_APP = "in_app"


class NotificationType(str, enum.Enum):
    """Type of notification."""

    NEW_LEAD = "new_lead"
    LEAD_STATUS_CHANGE = "lead_status_change"
    MONTHLY_REPORT = "monthly_report"
    GBP_POST_PUBLISHED = "gbp_post_published"
    TERRITORY_CONFLICT = "territory_conflict"
    GUARANTEE_MILESTONE = "guarantee_milestone"
    ONBOARDING_REMINDER = "onboarding_reminder"
    SYSTEM = "system"


class NotificationLog(SQLModel, table=True):
    """Log of all notifications sent to clients.

    Tracks every WhatsApp message, email, and in-app notification
    sent by the system.
    """

    __tablename__ = "notification_logs"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    # ── Ownership ────────────────────────────────────────────
    org_id: str = Field(foreign_key="orgs.id", index=True)
    lead_id: str | None = Field(
        default=None, foreign_key="leads.id", index=True
    )

    # ── Notification Details ─────────────────────────────────
    channel: NotificationChannel = Field(
        sa_column=Column(SAEnum(NotificationChannel)),
    )
    notification_type: NotificationType = Field(
        sa_column=Column(SAEnum(NotificationType)),
    )
    recipient: str = Field(
        max_length=255
    )  # Phone number or email
    subject: str | None = Field(default=None, max_length=500)
    body: str | None = Field(default=None, sa_column=Column(Text))
    metadata_json: str | None = Field(
        default=None, sa_column=Column(Text)
    )  # JSON metadata

    # ── Status ───────────────────────────────────────────────
    sent: bool = Field(default=False)
    delivered: bool = Field(default=False)
    read: bool = Field(default=False)
    error: str | None = Field(default=None, max_length=500)
    sent_at: datetime | None = Field(default=None)
    delivered_at: datetime | None = Field(default=None)
    read_at: datetime | None = Field(default=None)

    # ── Timestamps ───────────────────────────────────────────
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # ── Relationships ────────────────────────────────────────
    org: Org = Relationship(back_populates="notification_logs")
    lead: Lead = Relationship(back_populates="notifications")

    # ── Indexes ──────────────────────────────────────────────
    __table_args__ = (
        Index("ix_notifications_org_type", "org_id", "notification_type"),
        Index("ix_notifications_sent", "sent_at"),
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "org_id": self.org_id,
            "lead_id": self.lead_id,
            "channel": self.channel.value,
            "notification_type": self.notification_type.value,
            "recipient": self.recipient,
            "sent": self.sent,
            "delivered": self.delivered,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
        }


class OnboardingEvent(SQLModel, table=True):
    """Tracks onboarding progress and funnel analytics.

    Used by the admin analytics panel to understand how clients
    move through onboarding and where they drop off.
    """

    __tablename__ = "onboarding_events"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    org_id: str = Field(foreign_key="orgs.id", index=True)

    # ── Event Details ────────────────────────────────────────
    event_type: str = Field(
        max_length=100, index=True
    )  # signup, gbp_connected, whatsapp_connected, territory_set, first_lead, first_report, etc.
    event_data: str | None = Field(
        default=None, sa_column=Column(Text)
    )  # JSON metadata

    # ── Timestamps ───────────────────────────────────────────
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # ── Relationships ────────────────────────────────────────
    org: Org = Relationship()

    # ── Indexes ──────────────────────────────────────────────
    __table_args__ = (
        Index("ix_onboarding_org_event", "org_id", "event_type"),
    )
