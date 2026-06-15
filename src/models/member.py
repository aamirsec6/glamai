"""Org membership for Clerk-authenticated users."""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, Enum as SAEnum, Index, UniqueConstraint
from sqlmodel import Field, SQLModel


class OrgMemberRole(str, enum.Enum):
    OWNER = "owner"
    STAFF = "staff"
    PLATFORM_ADMIN = "platform_admin"


class OrgMember(SQLModel, table=True):
    """Maps a Clerk user to an org and role."""

    __tablename__ = "org_members"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    clerk_user_id: str = Field(max_length=255, index=True)
    org_id: str | None = Field(default=None, foreign_key="orgs.id", index=True)
    role: OrgMemberRole = Field(
        default=OrgMemberRole.OWNER,
        sa_column=Column(SAEnum(OrgMemberRole), index=True),
    )
    email: str | None = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("clerk_user_id", "org_id", name="uq_member_clerk_org"),
        Index("ix_org_members_clerk", "clerk_user_id"),
    )
