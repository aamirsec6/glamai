"""Territory and exclusivity models.

Implements the territory management system that prevents conflicts
when multiple competing businesses in the same area use GlamAI.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import Column, Enum as SAEnum, Index, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from src.models.org import Org


class TerritoryStatus(str, enum.Enum):
    """Status of a territory assignment."""

    ACTIVE = "active"
    PENDING = "pending"         # Awaiting conflict resolution
    RELEASED = "released"       # Client churned, territory freed
    CONFLICT = "conflict"       # Overlapping with another client


class KeywordNiche(SQLModel, table=True):
    """Maps keyword niches within a territory.

    When multiple non-exclusive clients exist in the same area,
    this table tracks which keywords each client "owns" to avoid
    competing for the same search terms.
    """

    __tablename__ = "keyword_niches"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    # ── Ownership ────────────────────────────────────────────
    org_id: str = Field(foreign_key="orgs.id", index=True)
    territory_id: str = Field(foreign_key="territories.id", index=True)

    # ── Keyword Assignment ───────────────────────────────────
    keyword: str = Field(max_length=255, index=True)
    is_primary: bool = Field(
        default=True
    )  # Primary niche or secondary
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    assigned_by: str | None = Field(
        default=None, max_length=255
    )  # System or admin who assigned

    # ── Status ───────────────────────────────────────────────
    status: TerritoryStatus = Field(
        default=TerritoryStatus.ACTIVE,
        sa_column=Column(SAEnum(TerritoryStatus)),
    )

    # ── Timestamps ───────────────────────────────────────────
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # ── Constraints ──────────────────────────────────────────
    __table_args__ = (
        # Each keyword in a territory can only be assigned to one org
        UniqueConstraint(
            "territory_id", "keyword", name="uq_territory_keyword"
        ),
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "org_id": self.org_id,
            "territory_id": self.territory_id,
            "keyword": self.keyword,
            "is_primary": self.is_primary,
            "status": self.status.value,
        }


class Territory(SQLModel, table=True):
    """Territory assignment for a business.

    Each org has one territory that defines their exclusive area.
    The territory system prevents conflicts where two competing
    businesses in the same area both use GlamAI.
    """

    __tablename__ = "territories"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    # ── Ownership ────────────────────────────────────────────
    org_id: str = Field(foreign_key="orgs.id", index=True)

    # ── Geographic Definition ────────────────────────────────
    center_latitude: float = Field(index=True)
    center_longitude: float = Field(index=True)
    radius_km: float = Field(default=5.0)
    city: str = Field(max_length=100, index=True)

    # ── Category Scope ───────────────────────────────────────
    category: str = Field(
        max_length=100, index=True
    )  # interior_design, dentist, etc.

    # ── Exclusivity ──────────────────────────────────────────
    is_exclusive: bool = Field(default=False)
    exclusivity_expires_at: datetime | None = Field(
        default=None
    )  # For time-limited exclusivity

    # ── Status ───────────────────────────────────────────────
    status: TerritoryStatus = Field(
        default=TerritoryStatus.ACTIVE,
        sa_column=Column(SAEnum(TerritoryStatus), index=True),
    )

    # ── Conflict Resolution ──────────────────────────────────
    conflict_with_org_id: str | None = Field(
        default=None, max_length=255
    )
    conflict_resolved_at: datetime | None = Field(default=None)
    conflict_resolution_notes: str | None = Field(default=None)

    # ── Timestamps ───────────────────────────────────────────
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    released_at: datetime | None = Field(default=None)

    # ── Relationships ────────────────────────────────────────
    org: Org = Relationship(back_populates="territories")

    # ── Indexes ──────────────────────────────────────────────
    __table_args__ = (
        Index("ix_territories_city_category", "city", "category"),
        Index("ix_territories_status", "status"),
        Index("ix_territories_coords", "center_latitude", "center_longitude"),
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "org_id": self.org_id,
            "city": self.city,
            "category": self.category,
            "center_lat": self.center_latitude,
            "center_lng": self.center_longitude,
            "radius_km": self.radius_km,
            "is_exclusive": self.is_exclusive,
            "status": self.status.value,
        }

    def contains_point(self, lat: float, lng: float) -> bool:
        """Check if a geographic point falls within this territory."""
        from math import asin, cos, radians, sin, sqrt

        # Haversine formula
        lat1, lng1 = radians(self.center_latitude), radians(self.center_longitude)
        lat2, lng2 = radians(lat), radians(lng)

        dlat = lat2 - lat1
        dlng = lng2 - lng1

        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
        c = 2 * asin(sqrt(a))

        # Earth radius in km
        distance = 6371 * c

        return distance <= self.radius_km

    def overlaps_with(
        self, other: Territory
    ) -> bool:
        """Check if this territory overlaps with another."""
        from math import asin, cos, radians, sin, sqrt

        lat1, lng1 = radians(self.center_latitude), radians(self.center_longitude)
        lat2, lng2 = radians(other.center_latitude), radians(other.center_longitude)

        dlat = lat2 - lat1
        dlng = lng2 - lng1

        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
        c = 2 * asin(sqrt(a))

        distance = 6371 * c

        return distance < (self.radius_km + other.radius_km)
