"""Analytics snapshot and sync API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import assert_tenant_access
from src.database import get_db
from src.facades.analytics import AnalyticsFacade
from src.facades.gbp import GbpFacade

router = APIRouter(prefix="/v1/analytics", tags=["Analytics"])


class TenantSyncBody(BaseModel):
    org_id: str
    resources: list[str] | None = None
    async_mode: bool = Field(default=True, alias="async")


@router.get("/snapshot")
async def analytics_snapshot(
    org_id: str = Query(...),
    period_days: int = Query(30, ge=1, le=365),
    include_narrative: bool = Query(False),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Tenant analysis from stored DB data."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    facade = AnalyticsFacade(db)
    try:
        data = await facade.analyze_tenant(org_id, period_days, include_narrative)
        return {"data": data}
    finally:
        await facade.close()


@router.post("/sync")
async def analytics_sync(
    body: TenantSyncBody,
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Pull external data via connectors then return fresh snapshot."""
    assert_tenant_access(body.org_id, x_org_id, x_admin_secret)
    if body.async_mode:
        from src.tasks.gbp_tasks import sync_gbp_for_org

        task = sync_gbp_for_org.delay(body.org_id)
        return {"message": "Sync queued", "task_id": task.id}

    gbp = GbpFacade(db)
    analytics = AnalyticsFacade(db)
    try:
        sync_result = await gbp.sync(body.org_id, resources=body.resources)
        snapshot = await analytics.analyze_tenant(body.org_id)
        await db.commit()
        return {"data": {"sync": sync_result, "snapshot": snapshot}}
    finally:
        await gbp.close()
        await analytics.close()
