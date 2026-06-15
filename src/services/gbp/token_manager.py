"""Per-org Google GBP OAuth token lifecycle."""

from __future__ import annotations

from datetime import datetime, timedelta

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.integration import IntegrationProvider, OrgIntegration
from src.services.gbp.client import GbpClient
from src.utils.encryption import decrypt_value, encrypt_value

logger = structlog.get_logger(__name__)


class GbpTokenManager:
    """Load, refresh, and persist GBP OAuth tokens per org."""

    def __init__(self, session: AsyncSession):
        self.session = session
        settings = get_settings()
        self.client = GbpClient(
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            redirect_uri=settings.google_redirect_uri,
        )

    async def get_integration(self, org_id: str) -> OrgIntegration | None:
        stmt = select(OrgIntegration).where(
            OrgIntegration.org_id == org_id,
            OrgIntegration.provider == IntegrationProvider.GOOGLE_GBP,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def store_tokens(
        self,
        org_id: str,
        access_token: str,
        refresh_token: str | None,
        expires_in: int | None,
        metadata_json: str | None = None,
    ) -> OrgIntegration:
        integration = await self.get_integration(org_id)
        expires_at = None
        if expires_in:
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        if integration is None:
            integration = OrgIntegration(
                org_id=org_id,
                provider=IntegrationProvider.GOOGLE_GBP,
            )

        integration.access_token_encrypted = encrypt_value(access_token)
        if refresh_token:
            integration.refresh_token_encrypted = encrypt_value(refresh_token)
        integration.expires_at = expires_at
        integration.metadata_json = metadata_json
        integration.updated_at = datetime.utcnow()
        self.session.add(integration)
        await self.session.flush()
        return integration

    async def get_valid_access_token(self, org_id: str) -> str | None:
        integration = await self.get_integration(org_id)
        if not integration or not integration.access_token_encrypted:
            return None

        if integration.expires_at and integration.expires_at <= datetime.utcnow() + timedelta(
            minutes=5
        ):
            if integration.refresh_token_encrypted:
                await self._refresh(integration)
            else:
                return None

        return decrypt_value(integration.access_token_encrypted)

    async def _refresh(self, integration: OrgIntegration) -> None:
        if not integration.refresh_token_encrypted:
            return
        refresh = decrypt_value(integration.refresh_token_encrypted)
        try:
            data = await self.client.refresh_token(refresh)
            integration.access_token_encrypted = encrypt_value(data["access_token"])
            if data.get("refresh_token"):
                integration.refresh_token_encrypted = encrypt_value(data["refresh_token"])
            expires_in = data.get("expires_in", 3600)
            integration.expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            integration.updated_at = datetime.utcnow()
            self.session.add(integration)
            await self.session.flush()
            logger.info("gbp_token_refreshed", org_id=integration.org_id)
        except Exception as e:
            logger.error("gbp_token_refresh_failed", org_id=integration.org_id, error=str(e))
            raise

    async def close(self) -> None:
        await self.client.close()
