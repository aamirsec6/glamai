"""Connector protocol and shared types."""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable


class ConnectorProvider(str, enum.Enum):
    GOOGLE_GBP = "google_gbp"
    GOOGLE_PLACES = "google_places"
    ANTHROPIC = "anthropic"
    WHATSAPP = "whatsapp"


class ConnectorResource(str, enum.Enum):
    # GBP
    INSIGHTS = "insights"
    REVIEWS = "reviews"
    POSTS = "posts"
    LOCATIONS = "locations"
    POST = "post"
    REVIEW_REPLY = "review_reply"
    PROFILE = "profile"
    # Places
    COMPETITORS = "competitors"
    GEOCODE = "geocode"
    # Anthropic
    QUALIFY_LEAD = "qualify_lead"
    GENERATE_POSTS = "generate_posts"
    GENERATE_REVIEW_REPLY = "generate_review_reply"
    OPTIMIZE_PROFILE = "optimize_profile"
    REPORT_NARRATIVE = "report_narrative"
    # WhatsApp
    MESSAGE = "message"
    TEMPLATE = "template"


class ConnectorStatus(str, enum.Enum):
    READY = "ready"
    CONFIGURED = "configured"
    CONNECTED = "connected"
    NOT_CONFIGURED = "not_configured"
    ERROR = "error"
    SKIPPED = "skipped"


@dataclass
class ConnectorHealth:
    provider: ConnectorProvider
    status: ConnectorStatus
    message: str = ""
    last_error: str | None = None


@dataclass
class PullResult:
    provider: ConnectorProvider
    resource: ConnectorResource
    org_id: str
    ok: bool
    data: dict[str, Any] = field(default_factory=dict)
    error: str | None = None


@dataclass
class PushResult:
    provider: ConnectorProvider
    resource: ConnectorResource
    org_id: str
    ok: bool
    data: dict[str, Any] = field(default_factory=dict)
    error: str | None = None


@runtime_checkable
class DataConnector(Protocol):
    provider: ConnectorProvider

    async def health(self, org_id: str | None = None) -> ConnectorHealth: ...

    async def pull(
        self,
        org_id: str,
        resource: ConnectorResource,
        **opts: Any,
    ) -> PullResult: ...

    async def push(
        self,
        org_id: str,
        resource: ConnectorResource,
        payload: dict[str, Any],
    ) -> PushResult: ...

    async def close(self) -> None: ...
