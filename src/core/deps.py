"""FastAPI dependencies for tenant scoping and admin auth."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException

from src.core.config import get_settings


def require_org_access(org_id: str, resource_org_id: str) -> None:
    """Ensure the caller's org matches the resource org."""
    if org_id != resource_org_id:
        raise HTTPException(status_code=403, detail="Access denied for this organization")


def is_admin_request(x_admin_secret: str | None) -> bool:
    """True when a valid platform admin secret is provided."""
    secret = get_settings().admin_api_secret
    return bool(secret) and x_admin_secret == secret


def assert_tenant_access(
    requested_org_id: str,
    caller_org_id: str | None,
    x_admin_secret: str | None = None,
) -> None:
    """Allow admins to read any tenant; clients only their own org."""
    if is_admin_request(x_admin_secret):
        return
    if not caller_org_id:
        raise HTTPException(
            status_code=400,
            detail="X-Org-Id header is required for tenant-scoped requests",
        )
    require_org_access(requested_org_id, caller_org_id)


async def get_org_id_header(
    x_org_id: Annotated[str | None, Header(alias="X-Org-Id")] = None,
) -> str:
    """Require X-Org-Id header for client-scoped routes."""
    if not x_org_id:
        raise HTTPException(status_code=400, detail="X-Org-Id header is required")
    return x_org_id


async def get_optional_org_id_header(
    x_org_id: Annotated[str | None, Header(alias="X-Org-Id")] = None,
) -> str | None:
    return x_org_id


async def verify_admin_secret(
    x_admin_secret: Annotated[str | None, Header(alias="X-Admin-Secret")] = None,
) -> None:
    """Optional admin API guard when ADMIN_API_SECRET is configured."""
    secret = get_settings().admin_api_secret
    if secret and x_admin_secret != secret:
        raise HTTPException(status_code=403, detail="Invalid or missing admin secret")


OrgIdDep = Annotated[str, Depends(get_org_id_header)]
OptionalOrgIdDep = Annotated[str | None, Depends(get_optional_org_id_header)]
AdminSecretDep = Annotated[None, Depends(verify_admin_secret)]
