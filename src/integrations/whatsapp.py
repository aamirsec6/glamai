"""WhatsApp connectors — 360dialog and Meta Cloud API stub."""

from __future__ import annotations

from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.integrations.base import (
    ConnectorHealth,
    ConnectorProvider,
    ConnectorResource,
    ConnectorStatus,
    PullResult,
    PushResult,
)
from src.services.whatsapp.client import WhatsappClient

logger = structlog.get_logger(__name__)


class Whatsapp360DialogConnector:
    provider = ConnectorProvider.WHATSAPP

    def __init__(self, session: AsyncSession | None = None):
        self.session = session
        settings = get_settings()
        self.api_key = settings.whatsapp_api_key or settings.whatsapp_360dialog_api_key
        self.base_url = settings.whatsapp_base_url.replace("/v1", "").rstrip("/")
        if "360dialog" not in self.base_url:
            self.base_url = "https://waba-v2.360dialog.io"
        self._client: WhatsappClient | None = None
        if self.api_key:
            self._client = WhatsappClient(
                api_key=self.api_key,
                base_url=self.base_url,
                webhook_secret=settings.whatsapp_webhook_secret,
            )

    async def close(self) -> None:
        if self._client:
            await self._client.close()

    async def health(self, org_id: str | None = None) -> ConnectorHealth:
        if not self.api_key:
            return ConnectorHealth(
                provider=self.provider,
                status=ConnectorStatus.NOT_CONFIGURED,
                message="WhatsApp API key missing",
            )
        return ConnectorHealth(
            provider=self.provider,
            status=ConnectorStatus.READY,
            message="360dialog configured",
        )

    async def pull(
        self,
        org_id: str,
        resource: ConnectorResource,
        **opts: Any,
    ) -> PullResult:
        return PullResult(
            self.provider,
            resource,
            org_id,
            False,
            error="whatsapp_inbound_via_webhook_only",
        )

    async def push(
        self,
        org_id: str,
        resource: ConnectorResource,
        payload: dict[str, Any],
    ) -> PushResult:
        if not self._client:
            return PushResult(
                self.provider, resource, org_id, False, error="whatsapp_not_configured"
            )

        to_phone = payload.get("to_phone", "")
        try:
            if resource == ConnectorResource.MESSAGE:
                result = await self._client.send_text_message(
                    to_phone=to_phone,
                    message=payload.get("message", ""),
                    preview_url=payload.get("preview_url", False),
                )
            elif resource == ConnectorResource.TEMPLATE:
                result = await self._client.send_template_message(
                    to_phone=to_phone,
                    template_name=payload.get("template_name", ""),
                    language_code=payload.get("language_code", "en"),
                    components=payload.get("components"),
                )
            else:
                return PushResult(
                    self.provider, resource, org_id, False, error=f"unsupported_push:{resource}"
                )

            if result is None:
                return PushResult(
                    self.provider, resource, org_id, False, error="send_failed"
                )
            msg_id = result.get("messages", [{}])[0].get("id")
            return PushResult(
                self.provider, resource, org_id, True, data={"message_id": msg_id}
            )
        except Exception as e:
            logger.error("whatsapp_push_failed", org_id=org_id, error=str(e))
            return PushResult(self.provider, resource, org_id, False, error=str(e))


class WhatsappMetaDirectConnector:
    """Stub for Meta Cloud API direct — same interface, not yet implemented."""

    provider = ConnectorProvider.WHATSAPP

    def __init__(self, session: AsyncSession | None = None):
        self.session = session

    async def close(self) -> None:
        return None

    async def health(self, org_id: str | None = None) -> ConnectorHealth:
        return ConnectorHealth(
            provider=self.provider,
            status=ConnectorStatus.SKIPPED,
            message="Meta direct connector not implemented yet",
        )

    async def pull(
        self,
        org_id: str,
        resource: ConnectorResource,
        **opts: Any,
    ) -> PullResult:
        return PullResult(
            self.provider, resource, org_id, False, error="meta_direct_not_implemented"
        )

    async def push(
        self,
        org_id: str,
        resource: ConnectorResource,
        payload: dict[str, Any],
    ) -> PushResult:
        return PushResult(
            self.provider, resource, org_id, False, error="meta_direct_not_implemented"
        )


def get_whatsapp_connector(session: AsyncSession | None = None):
    settings = get_settings()
    if settings.whatsapp_provider == "meta_direct":
        return WhatsappMetaDirectConnector(session)
    return Whatsapp360DialogConnector(session)
