"""Per-tenant integration credentials and webhook idempotency."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import Column, Enum as SAEnum, Index, Text, UniqueConstraint
from sqlmodel import Field, SQLModel


class IntegrationProvider(str, enum.Enum):
    """External integration providers."""

    GOOGLE_GBP = "google_gbp"
    WHATSAPP_360DIALOG = "whatsapp_360dialog"


class OrgIntegration(SQLModel, table=True):
    """Encrypted OAuth/API credentials per org."""

    __tablename__ = "org_integrations"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    org_id: str = Field(foreign_key="orgs.id", index=True)
    provider: IntegrationProvider = Field(
        sa_column=Column(SAEnum(IntegrationProvider), index=True),
    )
    access_token_encrypted: str | None = Field(default=None, sa_column=Column(Text))
    refresh_token_encrypted: str | None = Field(default=None, sa_column=Column(Text))
    expires_at: datetime | None = Field(default=None)
    metadata_json: str | None = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("org_id", "provider", name="uq_org_integration_provider"),
    )


class WebhookProvider(str, enum.Enum):
    WHATSAPP = "whatsapp"
    GOOGLE = "google"


class WebhookEvent(SQLModel, table=True):
    """Idempotency log for inbound webhooks."""

    __tablename__ = "webhook_events"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    provider: WebhookProvider = Field(sa_column=Column(SAEnum(WebhookProvider), index=True))
    external_id: str = Field(max_length=255, index=True)
    org_id: str | None = Field(default=None, foreign_key="orgs.id", index=True)
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    success: bool = Field(default=True)
    error_message: str | None = Field(default=None, max_length=500)
    retry_count: int = Field(default=0)

    __table_args__ = (
        UniqueConstraint("provider", "external_id", name="uq_webhook_provider_external"),
    )


class OrgSettings(SQLModel, table=True):
    """Per-org notification and scheduling preferences."""

    __tablename__ = "org_settings"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    org_id: str = Field(foreign_key="orgs.id", unique=True, index=True)
    timezone: str = Field(default="Asia/Kolkata", max_length=50)
    notify_new_leads: bool = Field(default=True)
    notify_monthly_reports: bool = Field(default=True)
    gbp_post_schedule_day: int = Field(default=1)  # Monday
    gbp_posts_per_week: int = Field(default=1)
    metadata_json: str | None = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def to_dict(self) -> dict[str, Any]:
        return {
            "org_id": self.org_id,
            "timezone": self.timezone,
            "notify_new_leads": self.notify_new_leads,
            "notify_monthly_reports": self.notify_monthly_reports,
            "gbp_post_schedule_day": self.gbp_post_schedule_day,
            "gbp_posts_per_week": self.gbp_posts_per_week,
        }
