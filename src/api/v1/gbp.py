"""GBP API routes."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import assert_tenant_access, require_org_access
from src.config import get_settings
from src.database import get_db
from src.models.gbp import GbpCompetitor, GbpInsights, GbpPost, GbpPostStatus, GbpPostType, GbpRanking
from src.models.org import Org
from src.facades.gbp import GbpFacade
from src.services.gbp.client import GbpClient
from src.services.gbp.token_manager import GbpTokenManager
from src.services.tenant.audit import log_tenant_event

router = APIRouter(prefix="/v1/gbp", tags=["Google Business Profile"])


class CreatePostBody(BaseModel):
    org_id: str
    content: str
    title: str | None = None
    post_type: str = "standard"
    keyword_target: str | None = None
    scheduled_at: str | None = None


class UpdatePostBody(BaseModel):
    org_id: str
    status: str | None = None
    scheduled_at: str | None = None
    content: str | None = None
    title: str | None = None


class SyncBody(BaseModel):
    org_id: str
    async_mode: bool = Field(default=True, alias="async")


@router.get("/posts")
async def list_posts(
    org_id: str = Query(...),
    status: str | None = Query(None),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """List GBP posts for an organization."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
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
    body: CreatePostBody,
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Create a GBP post (manual or scheduled)."""
    assert_tenant_access(body.org_id, x_org_id, x_admin_secret)
    try:
        post_type_enum = GbpPostType(body.post_type)
    except ValueError:
        post_type_enum = GbpPostType.STANDARD

    post = GbpPost(
        org_id=body.org_id,
        title=body.title,
        content=body.content,
        post_type=post_type_enum,
        keyword_target=body.keyword_target,
        status=GbpPostStatus.DRAFT,
        ai_generated=False,
    )

    if body.scheduled_at:
        try:
            post.scheduled_at = datetime.fromisoformat(body.scheduled_at)
            post.status = GbpPostStatus.SCHEDULED
        except ValueError:
            pass

    db.add(post)
    await db.commit()
    await db.refresh(post)

    return {"data": post.to_dict(), "message": "Post created"}


@router.patch("/posts/{post_id}")
async def update_post(
    post_id: str,
    body: UpdatePostBody,
    db: AsyncSession = Depends(get_db),
):
    """Update post content or schedule."""
    post = await db.get(GbpPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    require_org_access(body.org_id, post.org_id)

    if body.content is not None:
        post.content = body.content
    if body.title is not None:
        post.title = body.title
    if body.scheduled_at:
        try:
            post.scheduled_at = datetime.fromisoformat(body.scheduled_at)
            post.status = GbpPostStatus.SCHEDULED
        except ValueError:
            pass
    if body.status:
        try:
            post.status = GbpPostStatus(body.status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")

    post.updated_at = datetime.utcnow()
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return {"data": post.to_dict()}


@router.post("/posts/{post_id}/publish")
async def publish_post_now(
    post_id: str,
    org_id: str = Query(...),
    async_mode: bool = Query(True, alias="async"),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Publish a draft/scheduled post to Google immediately."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    post = await db.get(GbpPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    require_org_access(org_id, post.org_id)

    if async_mode:
        from src.tasks.gbp_tasks import publish_post_by_id

        task = publish_post_by_id.delay(post_id)
        return {"message": "Publish queued", "task_id": task.id}

    facade = GbpFacade(db)
    try:
        result = await facade.publish_post(post_id)
    finally:
        await facade.close()
    await db.commit()

    if result.get("status") != "ok":
        raise HTTPException(status_code=502, detail=result.get("error", "Publish failed"))
    return {"data": result, "message": "Post published"}


@router.post("/posts/generate")
async def generate_posts(
    org_id: str = Query(...),
    async_mode: bool = Query(True, alias="async"),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Generate AI draft posts for an org."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if async_mode:
        from src.tasks.gbp_tasks import generate_posts_for_org

        task = generate_posts_for_org.delay(org_id)
        return {"message": "Post generation queued", "task_id": task.id}

    facade = GbpFacade(db)
    try:
        result = await facade.generate_drafts(org_id)
    finally:
        await facade.close()
    await db.commit()
    return {"data": result}


@router.post("/sync")
async def sync_gbp_data(
    body: SyncBody,
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Sync insights + competitors for an org. Runs via Celery by default."""
    assert_tenant_access(body.org_id, x_org_id, x_admin_secret)
    org = await db.get(Org, body.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if body.async_mode:
        from src.tasks.gbp_tasks import sync_gbp_for_org

        task = sync_gbp_for_org.delay(body.org_id)
        return {"message": "GBP sync queued", "task_id": task.id}

    facade = GbpFacade(db)
    try:
        result = await facade.sync(body.org_id)
        await log_tenant_event(db, body.org_id, "gbp_sync", {"status": result.get("status")})
    finally:
        await facade.close()
    await db.commit()
    return {"data": result, "message": "GBP sync complete"}


@router.get("/rankings")
async def list_rankings(
    org_id: str = Query(...),
    keyword: str | None = Query(None),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """List keyword rankings for an organization."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
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
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """List tracked competitors for an organization."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    query = select(GbpCompetitor).where(GbpCompetitor.org_id == org_id)
    result = await db.execute(query)
    competitors = result.scalars().all()

    return {"data": [c.to_dict() for c in competitors]}


@router.get("/oauth/start")
async def gbp_oauth_start(
    org_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Redirect to Google OAuth for GBP connection."""
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    settings = get_settings()
    client = GbpClient(
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        redirect_uri=settings.google_redirect_uri,
    )
    url = client.get_oauth_url(state=org_id)
    await client.close()
    return RedirectResponse(url=url)


@router.get("/oauth/callback")
async def gbp_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """OAuth callback — store tokens and link GBP to org."""
    org = await db.get(Org, state)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    settings = get_settings()
    facade = GbpFacade(db)
    try:
        result = await facade.connect_oauth(state, code)
        if result.get("status") != "ok":
            raise HTTPException(status_code=502, detail=result.get("status"))
        await db.commit()
    finally:
        await facade.close()

    dashboard_url = settings.app_cors_origins[0] if settings.app_cors_origins else "http://localhost:3000"
    return RedirectResponse(url=f"{dashboard_url}/client/onboarding?gbp=connected")


@router.get("/connection")
async def gbp_connection(
    org_id: str = Query(...),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """GBP connection status for an org."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    token_mgr = GbpTokenManager(db)
    integration = await token_mgr.get_integration(org_id)
    await token_mgr.close()

    return {
        "data": {
            "connected": bool(org.gbp_place_id and integration),
            "place_id": org.gbp_place_id,
            "gbp_name": org.gbp_name,
            "gbp_status": org.gbp_status,
            "last_synced_at": (
                org.gbp_last_synced_at.isoformat() if org.gbp_last_synced_at else None
            ),
        }
    }


@router.get("/insights")
async def gbp_insights(
    org_id: str = Query(...),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Latest GBP insights for an org."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    stmt = (
        select(GbpInsights)
        .where(GbpInsights.org_id == org_id)
        .order_by(GbpInsights.recorded_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    insights = result.scalar_one_or_none()
    if not insights:
        return {"data": None}
    return {"data": insights.to_dict()}


@router.get("/profile")
async def get_profile(
    org_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from src.models.gbp import GbpProfileSnapshot

    stmt = select(GbpProfileSnapshot).where(GbpProfileSnapshot.org_id == org_id)
    result = await db.execute(stmt)
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        facade = GbpFacade(db)
        try:
            sync_result = await facade.sync_profile(org_id)
        finally:
            await facade.close()
        await db.commit()
        if sync_result.get("status") == "ok":
            return {"data": sync_result.get("profile")}
        return {"data": None}
    return {"data": snapshot.to_dict()}


@router.post("/profile/optimize")
async def optimize_profile(
    org_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if not get_settings().feature_content_generator:
        raise HTTPException(status_code=403, detail="Content generator not enabled")

    facade = GbpFacade(db)
    try:
        result = await facade.optimize_profile(org_id)
    finally:
        await facade.close()
    await db.commit()
    return {"data": result}


@router.post("/profile/apply")
async def apply_profile(
    org_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if not get_settings().feature_content_generator:
        raise HTTPException(status_code=403, detail="Content generator not enabled")

    facade = GbpFacade(db)
    try:
        result = await facade.apply_profile(org_id)
    finally:
        await facade.close()
    await db.commit()
    return {"data": result}
