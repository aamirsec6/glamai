"""Google Business Profile models — posts, rankings, competitors."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import Column, Enum as SAEnum, Index, Text
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from src.models.org import Org


class GbpPostType(str, enum.Enum):
    """Types of Google Business Profile posts."""

    STANDARD = "standard"       # Regular text + image post
    OFFER = "offer"             # Special offer
    EVENT = "event"             # Event announcement
    UPDATE = "update"           # General update
    PHOTO = "photo"             # Photo-only post


class GbpPostStatus(str, enum.Enum):
    """Status of a GBP post."""

    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    FAILED = "failed"


class GbpPost(SQLModel, table=True):
    """A Google Business Profile post created by GlamAI.

    Posts are the primary mechanism for GBP optimization.
    GlamAI creates, schedules, and tracks posts for each org.
    """

    __tablename__ = "gbp_posts"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    # ── Ownership ────────────────────────────────────────────
    org_id: str = Field(foreign_key="orgs.id", index=True)

    # ── Post Content ─────────────────────────────────────────
    title: str | None = Field(default=None, max_length=255)
    content: str = Field(sa_column=Column(Text))
    post_type: GbpPostType = Field(
        default=GbpPostType.STANDARD,
        sa_column=Column(SAEnum(GbpPostType)),
    )
    image_url: str | None = Field(default=None, max_length=1000)
    call_to_action: str | None = Field(
        default=None, max_length=50
    )  # LEARN_MORE, BOOK, CALL, etc.

    # ── Targeting ────────────────────────────────────────────
    keyword_target: str | None = Field(
        default=None, max_length=255
    )  # Primary keyword this post targets
    keyword_secondary: str | None = Field(
        default=None, max_length=500
    )  # JSON array of secondary keywords

    # ── Scheduling ───────────────────────────────────────────
    status: GbpPostStatus = Field(
        default=GbpPostStatus.DRAFT,
        sa_column=Column(SAEnum(GbpPostStatus), index=True),
    )
    scheduled_at: datetime | None = Field(default=None, index=True)
    published_at: datetime | None = Field(default=None)
    google_post_id: str | None = Field(
        default=None, max_length=255
    )  # ID from Google's API

    # ── Performance ──────────────────────────────────────────
    views: int | None = Field(default=None)
    clicks: int | None = Field(default=None)

    # ── AI Generation ────────────────────────────────────────
    ai_generated: bool = Field(default=True)
    ai_prompt_hash: str | None = Field(default=None, max_length=64)

    # ── Timestamps ───────────────────────────────────────────
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # ── Relationships ────────────────────────────────────────
    org: Org = Relationship(back_populates="gbp_posts")

    # ── Indexes ──────────────────────────────────────────────
    __table_args__ = (
        Index("ix_gbp_posts_org_status", "org_id", "status"),
        Index("ix_gbp_posts_scheduled", "scheduled_at"),
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "org_id": self.org_id,
            "title": self.title,
            "content": self.content[:200] + "..." if self.content and len(self.content) > 200 else self.content,
            "post_type": self.post_type.value,
            "status": self.status.value,
            "keyword_target": self.keyword_target,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "ai_generated": self.ai_generated,
        }


class GbpRanking(SQLModel, table=True):
    """keyword ranking position in Google Maps / local pack.

    Rankings are tracked over time to show progress.
    This is collected via manual checks or third-party rank trackers.
    """

    __tablename__ = "gbp_rankings"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    org_id: str = Field(foreign_key="orgs.id", index=True)

    # ── Ranking Data ─────────────────────────────────────────
    keyword: str = Field(max_length=255, index=True)
    position: int | None = Field(
        default=None
    )  # Position in local pack (1-20), None if not in top 20
    search_city: str = Field(
        max_length=100, default="Bangalore"
    )  # City for the search

    # ── Context ──────────────────────────────────────────────
    competitor_count: int | None = Field(
        default=None
    )  # Estimated competitors for this keyword
    local_pack_total: int | None = Field(
        default=None
    )  # Total results in local pack

    # ── Source ───────────────────────────────────────────────
    source: str = Field(
        default="manual", max_length=50
    )  # manual, brightlocal, semrush, scraper
    notes: str | None = Field(default=None, sa_column=Column(Text))

    # ── Timestamps ───────────────────────────────────────────
    recorded_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # ── Relationships ────────────────────────────────────────
    org: Org = Relationship(back_populates="gbp_rankings")

    # ── Indexes ──────────────────────────────────────────────
    __table_args__ = (
        Index("ix_gbp_rankings_org_kw", "org_id", "keyword"),
        Index("ix_gbp_rankings_recorded", "recorded_at"),
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "org_id": self.org_id,
            "keyword": self.keyword,
            "position": self.position,
            "search_city": self.search_city,
            "recorded_at": self.recorded_at.isoformat(),
        }


class GbpCompetitor(SQLModel, table=True):
    """A competitor of one of GlamAI's clients.

    Tracked to understand competitive landscape and optimize
    keyword strategy.
    """

    __tablename__ = "gbp_competitors"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    org_id: str = Field(foreign_key="orgs.id", index=True)

    # ── Competitor Identity ──────────────────────────────────
    name: str = Field(max_length=255)
    gbp_place_id: str | None = Field(default=None, max_length=255)
    category: str = Field(max_length=100)
    city: str = Field(max_length=100)
    latitude: float | None = Field(default=None)
    longitude: float | None = Field(default=None)
    distance_km: float | None = Field(
        default=None
    )  # Distance from client's business
    is_glamai_client: bool = Field(
        default=False
    )  # IMPORTANT: Is this competitor also a GlamAI client?

    # ── Competitor Metrics ───────────────────────────────────
    review_count: int | None = Field(default=None)
    avg_rating: float | None = Field(default=None)
    photo_count: int | None = Field(default=None)

    # ── Keyword Tracking ─────────────────────────────────────
    keywords_they_rank_for: list[str] | None = Field(
        default=None,
        sa_column=Column(Text),  # JSON array
    )
    our_position_for_their_keywords: dict[str, int] | None = Field(
        default=None,
        sa_column=Column(Text),  # JSON: {keyword: our_position}
    )

    # ── Timestamps ────────────────────────────────────────────
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_checked_at: datetime | None = Field(default=None)

    # ── Relationships ────────────────────────────────────────
    org: Org = Relationship(back_populates="gbp_competitors")

    # ── Indexes ──────────────────────────────────────────────
    __table_args__ = (
        Index("ix_gbp_competitors_org", "org_id"),
        Index("ix_gbp_competitors_place", "gbp_place_id"),
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "org_id": self.org_id,
            "name": self.name,
            "category": self.category,
            "city": self.city,
            "distance_km": self.distance_km,
            "is_glamai_client": self.is_glamai_client,
            "review_count": self.review_count,
            "avg_rating": self.avg_rating,
        }


# GBP Insights (from Google API — stored for historical tracking)
class GbpInsights(SQLModel, table=True):
    """Google Business Profile insights data.

    This is the data we CAN get from the GBP API:
    - Views (search + maps)
    - Actions (calls, website clicks, direction requests)
    - Photo views
    - Review count + rating
    """

    __tablename__ = "gbp_insights"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    org_id: str = Field(foreign_key="orgs.id", index=True)

    # ── Views ────────────────────────────────────────────────
    search_views: int = Field(default=0)
    maps_views: int = Field(default=0)
    total_views: int = Field(default=0)

    # ── Actions ──────────────────────────────────────────────
    website_clicks: int = Field(default=0)
    calls: int = Field(default=0)
    direction_requests: int = Field(default=0)

    # ── Photos ───────────────────────────────────────────────
    photo_views: int = Field(default=0)

    # ── Reviews ──────────────────────────────────────────────
    review_count: int | None = Field(default=None)
    avg_rating: float | None = Field(default=None)

    # ── Period ───────────────────────────────────────────────
    period_start: datetime = Field(index=True)
    period_end: datetime = Field()

    # ── Timestamps ───────────────────────────────────────────
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # ── Relationships ────────────────────────────────────────
    org: Org = Relationship()

    # ── Indexes ──────────────────────────────────────────────
    __table_args__ = (
        Index("ix_gbp_insights_org_period", "org_id", "period_start"),
    )
