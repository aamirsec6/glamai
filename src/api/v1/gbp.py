"""GBP API routes."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.gbp import GbpPost, GbpPostStatus, GbpRanking, GbpCompetitor

router = APIRouter(prefix="/v1/gbp", tags=["Google Business Profile"])


@router.get("/posts")
async def list_posts(
    org_id: str = Query(...),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List GBP posts for an organization."""
    query = select(GbpPost).where(GbpPost.org_id == org_id)

    if status:
        try:
            query = query.where(GbpPost.status == GbpPostStatus(status))
        except ValueError:
            pass

    query = query.order_by(GbpPost.created_at.desc())
    result = await db.execute(query)
    posts = result.scalars().all()

    return {"data": [p.to_dict() for p in posts]}


@router.post("/posts")
async def create_post(
    org_id: str,
    content: str,
    title: str | None = None,
    post_type: str = "standard",
    keyword_target: str | None = None,
    scheduled_at: str | None = None,  # ISO datetime
    db: AsyncSession = Depends(get_db),
):
    """Create a GBP post (manual or scheduled)."""
    try:
        post_type_enum = GbpPostStatus(post_type)
    except ValueError:
        from src.models.gbp import GbpPostType
        post_type_enum = GbpPostType.STANDARD

    from src.models.gbp import GbpPostType

    post = GbpPost(
        org_id=org_id,
        title=title,
        content=content,
        post_type=GbpPostType.STANDARD,
        keyword_target=keyword_target,
        status=GbpPostStatus.DRAFT,
    )

    if scheduled_at:
        try:
            post.scheduled_at = datetime.fromisoformat(scheduled_at)
            post.status = GbpPostStatus.SCHEDULED
        except ValueError:
            pass

    db.add(post)
    await db.commit()
    await db.refresh(post)

    return {"data": post.to_dict(), "message": "Post created"}


@router.get("/rankings")
async def list_rankings(
    org_id: str = Query(...),
    keyword: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List keyword rankings for an organization."""
    query = select(GbpRanking).where(GbpRanking.org_id == org_id)

    if keyword:
        query = query.where(GbpRanking.keyword == keyword)

    query = query.order_by(GbpRanking.recorded_at.desc())
    result = await db.execute(query)
    rankings = result.scalars().all()

    return {"data": [r.to_dict() for r in rankings]}


@router.post("/rankings")
async def record_ranking(
    org_id: str,
    keyword: str,
    position: int | None = None,
    search_city: str = "Bangalore",
    source: str = "manual",
    db: AsyncSession = Depends(get_db),
):
    """Record a keyword ranking (from manual check or automated tracking)."""
    ranking = GbpRanking(
        org_id=org_id,
        keyword=keyword,
        position=position,
        search_city=search_city,
        source=source,
        recorded_at=datetime.utcnow(),
    )

    db.add(ranking)
    await db.commit()
    await db.refresh(ranking)

    return {"data": ranking.to_dict()}


@router.get("/competitors")
async def list_competitors(
    org_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """List tracked competitors for an organization."""
    query = select(GbpCompetitor).where(GbpCompetitor.org_id == org_id)
    result = await db.execute(query)
    competitors = result.scalars().all()

    return {"data": [c.to_dict() for c in competitors]}
