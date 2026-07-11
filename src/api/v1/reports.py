"""Monthly report API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.deps import assert_tenant_access, require_org_access
from src.core.database import get_db
from src.models.report import MonthlyReport

router = APIRouter(prefix="/v1/reports", tags=["Reports"])


@router.get("/")
async def list_reports(
    org_id: str = Query(..., description="Organization ID"),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """List monthly reports for an organization."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    stmt = (
        select(MonthlyReport)
        .where(MonthlyReport.org_id == org_id)
        .order_by(MonthlyReport.report_year.desc(), MonthlyReport.report_month.desc())
    )
    result = await db.execute(stmt)
    reports = result.scalars().all()
    return {"data": [r.to_dict() for r in reports]}


@router.post("/generate")
async def generate_report(
    org_id: str = Query(...),
    month: int | None = Query(None, ge=1, le=12),
    year: int | None = Query(None),
    async_mode: bool = Query(True, alias="async"),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Generate a monthly report for an org (previous month by default)."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    from datetime import datetime

    from src.models.org import Org

    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    now = datetime.utcnow()
    report_month = month or (12 if now.month == 1 else now.month - 1)
    report_year = year or (now.year - 1 if now.month == 1 else now.year)

    if async_mode:
        from src.workers.report_tasks import generate_report_for_org

        task = generate_report_for_org.delay(org_id, report_month, report_year)
        return {"message": "Report generation queued", "task_id": task.id}

    from src.application.analytics import AnalyticsFacade

    facade = AnalyticsFacade(db)
    try:
        result = await facade.generate_monthly_report(
            org_id, report_month, report_year, include_narrative=True
        )
    finally:
        await facade.close()
    await db.commit()
    return result


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    org_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Get a single monthly report."""
    report = await db.get(MonthlyReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    require_org_access(org_id, report.org_id)
    return {"data": report.to_dict()}
