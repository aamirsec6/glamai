"""Lead and WhatsApp conversation models."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import Column, Enum as SAEnum, Index, Text
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from src.models.notification import NotificationLog
    from src.models.org import Org


class LeadSource(str, enum.Enum):
    """Where the lead came from."""

    WHATSAPP = "whatsapp"
    GBP = "gbp"                     # Google Business Profile
    GBP_CALL = "gbp_call"           # Call from GBP
    GBP_DIRECTIONS = "gbp_directions"  # Direction request from GBP
    WEBSITE = "website"
    REFERRAL = "referral"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    OTHER = "other"


class LeadStatus(str, enum.Enum):
    """Lead lifecycle status."""

    NEW = "new"                     # Just came in
    CONTACTED = "contacted"         # Designer has reached out
    QUOTED = "quoted"               # Quote/proposal sent
    NEGOTIATION = "negotiation"     # In discussion
    WON = "won"                     # Converted to project
    LOST = "lost"                   # Lost to competitor or ghosted
    DROPPED = "dropped"             # Not qualified / spam


class LeadScope(str, enum.Enum):
    """Scope of work the lead is interested in."""

    FULL_HOME = "full_home"
    OFFICE = "office"
    KITCHEN = "kitchen"
    BEDROOM = "bedroom"
    LIVING_ROOM = "living_room"
    BATHROOM = "bathroom"
    COMMERCIAL = "commercial"
    RENOVATION = "renovation"
    UNKNOWN = "unknown"


class BudgetRange(str, enum.Enum):
    """Budget range brackets for interior design projects."""

    UNDER_3L = "under_3l"           # Under ₹3 lakhs
    FROM_3L_5L = "3l_5l"            # ₹3-5 lakhs
    FROM_5L_10L = "5l_10l"          # ₹5-10 lakhs
    FROM_10L_20L = "10l_20l"        # ₹10-20 lakhs
    FROM_20L_50L = "20l_50l"        # ₹20-50 lakhs
    ABOVE_50L = "above_50l"         # Above ₹50 lakhs
    UNKNOWN = "unknown"


class Lead(SQLModel, table=True):
    """A potential customer lead generated through GlamAI.

    Leads come from WhatsApp conversations, GBP actions, or other sources.
    Each lead goes through a qualification flow and lifecycle.
    """

    __tablename__ = "leads"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    # ── Ownership ────────────────────────────────────────────
    org_id: str = Field(foreign_key="orgs.id", index=True)

    # ── Source ───────────────────────────────────────────────
    source: LeadSource = Field(
        sa_column=Column(SAEnum(LeadSource), index=True),
    )
    source_detail: str | None = Field(
        default=None, max_length=500
    )  # e.g., "GBP call from 'interior designer Whitefield' search"

    # ── Contact Info ─────────────────────────────────────────
    contact_name: str = Field(max_length=255)
    contact_phone: str = Field(max_length=20, index=True)
    contact_email: str | None = Field(default=None, max_length=255)

    # ── Qualification Data (extracted by AI) ─────────────────
    status: LeadStatus = Field(
        default=LeadStatus.NEW,
        sa_column=Column(SAEnum(LeadStatus), index=True),
    )
    scope: LeadScope = Field(
        default=LeadScope.UNKNOWN,
        sa_column=Column(SAEnum(LeadScope)),
    )
    budget_range: BudgetRange = Field(
        default=BudgetRange.UNKNOWN,
        sa_column=Column(SAEnum(BudgetRange)),
    )
    timeline: str | None = Field(
        default=None, max_length=255
    )  # e.g., "3 months", "before Diwali", "ASAP"
    location_area: str | None = Field(
        default=None, max_length=255
    )  # e.g., "Whitefield", "Indiranagar"
    property_type: str | None = Field(
        default=None, max_length=100
    )  # e.g., "3BHK", "2BHK", "Villa", "Office"
    property_size_sqft: int | None = Field(default=None)

    # ── AI Qualification ─────────────────────────────────────
    ai_summary: str | None = Field(
        default=None, sa_column=Column(Text)
    )  # AI-generated summary for the designer
    ai_qualification_score: float | None = Field(
        default=None
    )  # 0.0 to 1.0, how qualified this lead is
    ai_extracted_data: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column(Text),  # Store as JSON string
    )

    # ── Outcome ──────────────────────────────────────────────
    won_value_paise: int | None = Field(
        default=None
    )  # Final project value if won
    lost_reason: str | None = Field(default=None, max_length=500)

    # ── Assignment ───────────────────────────────────────────
    assigned_to: str | None = Field(
        default=None, max_length=255
    )  # Designer name/email

    # ── Timestamps ───────────────────────────────────────────
    first_contact_at: datetime = Field(default_factory=datetime.utcnow)
    last_contact_at: datetime = Field(default_factory=datetime.utcnow)
    status_changed_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # ── Relationships ────────────────────────────────────────
    org: Org = Relationship(back_populates="leads")
    conversations: list[WhatsappConversation] = Relationship(
        back_populates="lead"
    )
    notifications: list[NotificationLog] = Relationship(back_populates="lead")

    # ── Indexes ──────────────────────────────────────────────
    __table_args__ = (
        Index("ix_leads_org_status", "org_id", "status"),
        Index("ix_leads_org_created", "org_id", "created_at"),
        Index("ix_leads_phone", "contact_phone"),
    )

    @property
    def won_value_inr(self) -> float | None:
        """Return won value in INR."""
        if self.won_value_paise is not None:
            return self.won_value_paise / 100
        return None

    @property
    def is_qualified(self) -> bool:
        """Check if lead meets minimum qualification criteria."""
        return (
            self.budget_range != BudgetRange.UNKNOWN
            and self.scope != LeadScope.UNKNOWN
            and self.ai_qualification_score is not None
            and self.ai_qualification_score >= 0.5
        )

    @property
    def is_converted(self) -> bool:
        """Check if lead was converted to a project."""
        return self.status == LeadStatus.WON

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "id": self.id,
            "org_id": self.org_id,
            "source": self.source.value,
            "contact_name": self.contact_name,
            "contact_phone": self.contact_phone,
            "status": self.status.value,
            "scope": self.scope.value,
            "budget_range": self.budget_range.value,
            "timeline": self.timeline,
            "location_area": self.location_area,
            "ai_summary": self.ai_summary,
            "ai_qualification_score": self.ai_qualification_score,
            "won_value_inr": self.won_value_inr,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class MessageDirection(str, enum.Enum):
    """Direction of a WhatsApp message."""

    INBOUND = "inbound"     # From lead to business
    OUTBOUND = "outbound"   # From business/AI to lead


class MessageSender(str, enum.Enum):
    """Who sent the message."""

    LEAD = "lead"
    AI = "ai"
    DESIGNER = "designer"   # Human designer manually replied
    SYSTEM = "system"       # System message (template, notification)


class WhatsappConversation(SQLModel, table=True):
    """Individual WhatsApp messages linked to a lead.

    This is the full conversation history between a lead and the
    business (via AI or human).
    """

    __tablename__ = "whatsapp_conversations"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    # ── Ownership ────────────────────────────────────────────
    org_id: str = Field(foreign_key="orgs.id", index=True)
    lead_id: str | None = Field(
        default=None, foreign_key="leads.id", index=True
    )

    # ── Message Details ──────────────────────────────────────
    wa_message_id: str | None = Field(
        default=None, max_length=255, index=True
    )  # WhatsApp's message ID
    direction: MessageDirection = Field(
        sa_column=Column(SAEnum(MessageDirection)),
    )
    sender: MessageSender = Field(
        sa_column=Column(SAEnum(MessageSender)),
    )
    message_text: str | None = Field(default=None, sa_column=Column(Text))
    message_type: str = Field(
        default="text", max_length=50
    )  # text, image, template, interactive

    # ── AI Processing ────────────────────────────────────────
    ai_intent: str | None = Field(
        default=None, max_length=100
    )  # Classified intent: inquiry, booking, followup, spam
    ai_extracted_entities: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column(Text),  # JSON: budget, timeline, scope, etc.
    )
    ai_response_time_ms: int | None = Field(
        default=None
    )  # How long AI took to respond

    # ── Status ───────────────────────────────────────────────
    delivered: bool = Field(default=False)
    read: bool = Field(default=False)
    delivered_at: datetime | None = Field(default=None)
    read_at: datetime | None = Field(default=None)

    # ── Timestamps ───────────────────────────────────────────
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # ── Relationships ────────────────────────────────────────
    org: Org = Relationship(back_populates="whatsapp_conversations")
    lead: Lead = Relationship(back_populates="conversations")

    # ── Indexes ──────────────────────────────────────────────
    __table_args__ = (
        Index("ix_wa_conv_org_lead", "org_id", "lead_id"),
        Index("ix_wa_conv_sent", "sent_at"),
    )
