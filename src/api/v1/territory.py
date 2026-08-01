"""Territory API routes — conflict checking and keyword niches."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import assert_tenant_access
from src.models.org import BusinessCategory, Org
from src.models.territory import KeywordNiche, Territory, TerritoryStatus
from src.services.territory.checker import TerritoryChecker

router = APIRouter(prefix="/v1/territory", tags=["Territory"])


class TerritoryClaimSchema(BaseModel):
    org_id: str
    latitude: float
    longitude: float
    city: str
    category: str
    radius_km: float = 5.0
    is_exclusive: bool = False
    address: str | None = None


@router.get("/check")
async def check_territory(
    org_id: str = Query(...),
    latitude: float = Query(...),
    longitude: float = Query(...),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Check if a location would conflict with existing territories."""
    assert_tenant_access(org_id, x_org_id, x_admin_secret)
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    checker = TerritoryChecker()
    result = await checker.check_conflict(org, latitude, longitude, db)

    return {"data": result}


@router.post("/claim")
async def claim_territory(
    body: TerritoryClaimSchema,
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Claim a territory for an organization and persist keyword niches."""
    assert_tenant_access(body.org_id, x_org_id, x_admin_secret)
    org = await db.get(Org, body.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    checker = TerritoryChecker()
    conflict = await checker.check_conflict(org, body.latitude, body.longitude, db)

    if conflict["has_conflict"] and conflict["resolution"] == "decline":
        raise HTTPException(status_code=409, detail=conflict["message"])

    # Replace prior active territories for this org (re-onboarding safe)
    existing = (
        await db.execute(
            select(Territory).where(
                Territory.org_id == body.org_id,
                Territory.status == TerritoryStatus.ACTIVE,
            )
        )
    ).scalars().all()
    for t in existing:
        t.status = TerritoryStatus.RELEASED
        db.add(t)
    old_niches = (
        await db.execute(select(KeywordNiche).where(KeywordNiche.org_id == body.org_id))
    ).scalars().all()
    for n in old_niches:
        n.status = TerritoryStatus.RELEASED
        db.add(n)

    territory = Territory(
        org_id=body.org_id,
        center_latitude=body.latitude,
        center_longitude=body.longitude,
        radius_km=body.radius_km,
        city=body.city,
        category=body.category,
        is_exclusive=body.is_exclusive,
        status=TerritoryStatus.ACTIVE,
    )
    db.add(territory)
    await db.flush()

    conflicting_territory_ids = [
        c["territory_id"] for c in conflict.get("conflicting_orgs", []) if c.get("territory_id")
    ]
    keywords = await checker.assign_keyword_niches(
        org_id=body.org_id,
        territory_id=territory.id,
        city=body.city,
        category=body.category,
        db=db,
        exclude_territory_ids=conflicting_territory_ids
        if conflict.get("resolve_with_keyword_niches")
        else None,
    )

    org.latitude = body.latitude
    org.longitude = body.longitude
    org.city = body.city
    if body.address:
        org.address = body.address
    try:
        org.category = BusinessCategory(body.category)
    except ValueError:
        pass
    from datetime import datetime

    org.updated_at = datetime.utcnow()
    db.add(org)

    from src.services.tenant.audit import log_tenant_event

    await log_tenant_event(
        db,
        body.org_id,
        "territory_claimed",
        {
            "city": body.city,
            "category": body.category,
            "radius_km": body.radius_km,
            "keywords": len(keywords),
        },
    )

    await db.commit()
    await db.refresh(territory)

    return {
        "data": {
            "territory": territory.to_dict(),
            "assigned_keywords": keywords,
            "conflict_info": conflict,
            "org": {
                "latitude": org.latitude,
                "longitude": org.longitude,
                "city": org.city,
                "address": org.address,
            },
        },
        "message": "Territory claimed successfully",
    }


@router.get("/niches/{territory_id}")
async def get_keyword_niches(
    territory_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get keyword niche assignments for a territory."""
    checker = TerritoryChecker()
    niches = await checker.get_competitor_niches(territory_id, db)
    return {"data": niches}
