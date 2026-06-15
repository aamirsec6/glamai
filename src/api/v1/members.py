"""Org membership API — Clerk-ready."""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.member import OrgMember, OrgMemberRole

router = APIRouter(prefix="/v1/members", tags=["Members"])


class MemberCreateSchema(BaseModel):
    clerk_user_id: str
    org_id: str | None = None
    role: OrgMemberRole = OrgMemberRole.OWNER
    email: str | None = None


@router.post("/")
async def create_member(
    body: MemberCreateSchema,
    db: AsyncSession = Depends(get_db),
):
    """Link a Clerk user to an org (used during onboarding or admin invite)."""
    member = OrgMember(
        id=str(uuid4()),
        clerk_user_id=body.clerk_user_id,
        org_id=body.org_id,
        role=body.role,
        email=body.email,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return {
        "data": {
            "id": member.id,
            "clerk_user_id": member.clerk_user_id,
            "org_id": member.org_id,
            "role": member.role.value,
        }
    }


@router.get("/by-clerk/{clerk_user_id}")
async def get_member_by_clerk(
    clerk_user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Resolve org + role for a Clerk user at sign-in."""
    stmt = select(OrgMember).where(OrgMember.clerk_user_id == clerk_user_id)
    result = await db.execute(stmt)
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return {
        "data": {
            "org_id": member.org_id,
            "role": member.role.value,
            "email": member.email,
        }
    }
