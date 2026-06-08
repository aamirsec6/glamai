"""Territory API routes — conflict checking and keyword niches."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.org import Org
from src.models.territory import KeywordNiche, Territory, TerritoryStatus
from src.services.territory.checker import TerritoryChecker

router = APIRouter(prefix="/v1/territory", tags=["Territory"])


@router.get("/check")
async def check_territory(
    org_id: str = Query(...),
    latitude: float = Query(...),
    longitude: float = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Check if a location would conflict with existing territories."""
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    checker = TerritoryChecker()
    result = await checker.check_conflict(org, latitude, longitude, db)

    return {"data": result}


@router.post("/claim")
async def claim_territory(
    org_id: str,
    latitude: float,
    longitude: float,
    city: str,
    category: str,
    radius_km: float = 5.0,
    is_exclusive: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """Claim a territory for an organization."""
    # Check for conflicts
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    checker = TerritoryChecker()
    conflict = await checker.check_conflict(org, latitude, longitude, db)

    if conflict["has_conflict"] and conflict["resolution"] == "decline":
        raise HTTPException(status_code=409, detail=conflict["message"])

    # Create territory
    territory = Territory(
        org_id=org_id,
        center_latitude=latitude,
        center_longitude=longitude,
        radius_km=radius_km,
        city=city,
        category=category,
        is_exclusive=is_exclusive,
        status=TerritoryStatus.ACTIVE,
    )
    db.add(territory)
    await db.flush()

    # If non-exclusive, partition keywords
    if not is_exclusive and conflict.get("resolve_with_keyword_niches"):
        keywords = await checker.partition_keywords(
            org_id=org_id,
            territory_id=territory.id,
            city=city,
            category=category,
            db=db,
        )
    else:
        keywords = checker._get_keyword_pool(category, city)[:6]

    await db.commit()

    return {
        "data": {
            "territory": territory.to_dict(),
            "assigned_keywords": keywords[:4],
            "conflict_info": conflict,
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
