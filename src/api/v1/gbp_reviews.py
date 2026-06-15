"""GBP reviews API — sync, AI replies, review requests."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import assert_tenant_access, require_org_access
from src.config import get_settings
from src.database import get_db
from src.facades.reviews import ReviewsFacade
from src.models.lead import Lead

router = APIRouter(prefix="/v1/gbp-reviews", tags=["Review Engine"])


class ReviewRequestBody(BaseModel):
    org_id: str
    lead_id: str


@router.get("/")
async def list_reviews(
    org_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    assert_tenant_access(org_id, None, None)
    facade = ReviewsFacade(db)
    try:
        data = await facade.list_reviews(org_id)
    finally:
        await facade.close()
    return {"data": data}


@router.post("/sync")
async def sync_reviews(
    org_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if not get_settings().feature_review_engine:
        raise HTTPException(status_code=403, detail="Review engine not enabled")

    facade = ReviewsFacade(db)
    try:
        result = await facade.sync(org_id)
    finally:
        await facade.close()
    await db.commit()
    return {"data": result}


@router.post("/auto-reply")
async def auto_reply_reviews(
    org_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if not get_settings().feature_review_engine:
        raise HTTPException(status_code=403, detail="Review engine not enabled")

    facade = ReviewsFacade(db)
    try:
        result = await facade.auto_reply(org_id)
    finally:
        await facade.close()
    await db.commit()
    return {"data": result}


@router.post("/request")
async def request_review(
    body: ReviewRequestBody,
    db: AsyncSession = Depends(get_db),
):
    if not get_settings().feature_review_engine:
        raise HTTPException(status_code=403, detail="Review engine not enabled")

    lead = await db.get(Lead, body.lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    require_org_access(body.org_id, lead.org_id)

    facade = ReviewsFacade(db)
    try:
        result = await facade.request_review(body.org_id, body.lead_id)
    finally:
        await facade.close()
    await db.commit()
    return {"data": result}


@router.get("/requests")
async def list_review_requests(
    org_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    facade = ReviewsFacade(db)
    try:
        data = await facade.list_review_requests(org_id)
    finally:
        await facade.close()
    return {"data": data}
