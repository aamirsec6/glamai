"""User Journey Tracking model.

Stores client-side behavior events for analytics and workflow insights.
This is the data moat — every interaction improves our AI models over time.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import Column, Enum as SAEnum, Index, Text
from sqlmodel import Field, SQLModel


class JourneyEventType(str, enum.Enum):
    """Types of user journey events we track."""

    PAGE_VIEW = "page_view"
    CLICK = "click"
    FORM_SUBMIT = "form_submit"
    API_CALL = "api_call"
    ERROR = "error"
    ONBOARDING_STEP = "onboarding_step"
    GBP_ACTION = "gbp_action"
    WHATSAPP_ACTION = "whatsapp_action"
    REPORT_VIEW = "report_view"
    LEAD_CREATED = "lead_created"
    SETTINGS_CHANGE = "settings_change"


class UserJourneyEvent(SQLModel, table=True):
    """A single user journey event from the client dashboard.

    These events are sent from the frontend via POST /api/v1/track
    and aggregated for workflow insights and client health scoring.
    """

    __tablename__ = "user_journey_events"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    # ── Ownership ────────────────────────────────────────────
    org_id: str = Field(max_length=255, index=True)
    session_id: str = Field(max_length=255, index=True)

    # ── Event Details ────────────────────────────────────────
    event_type: str = Field(
        max_length=50,
        sa_column=Column(SAEnum(JourneyEventType)),
        index=True,
    )
    page: str | None = Field(default=None, max_length=255)
    element: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    metadata_json: str | None = Field(
        default=None,
        sa_column=Column(Text),
        description="JSON blob for arbitrary event metadata",
    )

    # ── Timestamp ─────────────────────────────────────────────
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # ── Indexes ───────────────────────────────────────────────
    __table_args__ = (
        Index("ix_uje_org_created", "org_id", "created_at"),
        Index("ix_uje_session_created", "session_id", "created_at"),
    )


class VoiceCall(SQLModel, table=True):
    """Voice call records from the AI calling system.

    Tracks every inbound/outbound call handled by the voice AI agent.
    Part of the data moat — call patterns inform scheduling optimization.
    """

    __tablename__ = "voice_calls"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    # ── Ownership ────────────────────────────────────────────
    org_id: str = Field(max_length=255, index=True)

    # ── Call Details ─────────────────────────────────────────
    phone_number: str = Field(max_length=20, index=True)
    direction: str = Field(max_length=10)  # inbound | outbound
    duration_seconds: int | None = Field(default=None)
    status: str = Field(max_length=50)  # answered, missed, booked, no_answer, failed

    # ── AI Processing ────────────────────────────────────────
    transcript: str | None = Field(default=None, sa_column=Column(Text))
    ai_summary: str | None = Field(default=None, max_length=500)
    appointment_booked: bool = Field(default=False)
    appointment_time: datetime | None = Field(default=None)
    sentiment: str | None = Field(default=None, max_length=20)  | None  # positive, neutral, negative

    # ── Provider ─────────────────────────────────────────────
    provider: str = Field(default="exotel", max_length=50)  # exotel, twilio, etc.
    provider_call_id: str | None = Field(default=None, max_length=255)

    # ── Timestamps ───────────────────────────────────────────
    started_at: datetime | None = Field(default=None)
    ended_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # ── Indexes ───────────────────────────────────────────────
    __table_args__ = (
        Index("ix_voice_calls_org_created", "org_id", "created_at"),
        Index("ix_voice_calls_status", "status"),
    )
