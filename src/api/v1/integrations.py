"""Integration health API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import assert_tenant_access
from src.connectors.registry import ConnectorRegistry
from src.database import get_db

router = APIRouter(prefix="/v1/integrations", tags=["Integrations"])


@router.get("/health")
async def integration_health(
    org_id: str | None = Query(None),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    x_admin_secret: str | None = Header(default=None, alias="X-Admin-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Per-connector health for platform and optional org."""
    if org_id:
        assert_tenant_access(org_id, x_org_id, x_admin_secret)
    registry = ConnectorRegistry(db)
    try:
        health = await registry.health_all(org_id)
        return {
            "data": [
                {
                    "provider": h.provider.value,
                    "status": h.status.value if hasattr(h.status, "value") else h.status,
                    "message": h.message,
                    "last_error": h.last_error,
                }
                for h in health
            ]
        }
    finally:
        await registry.close()
