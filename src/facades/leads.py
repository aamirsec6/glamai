"""Lead facade — webhook handling and manual lead creation."""

from __future__ import annotations

from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.connectors.base import ConnectorResource
from src.connectors.registry import ConnectorRegistry
from src.models.lead import Lead, LeadSource, LeadStatus
from src.services.ai.lead_qualifier import LeadQualifier
from src.services.whatsapp.webhook import WhatsappWebhookHandler

logger = structlog.get_logger(__name__)


class _WhatsappConnectorAdapter:
    """Adapts WhatsApp connector push to WhatsappClient interface."""

    def __init__(self, connector, org_id: str = "platform"):
        self._connector = connector
        self._org_id = org_id

    async def send_text_message(
        self,
        to_phone: str,
        message: str,
        preview_url: bool = False,
    ) -> dict | None:
        push = await self._connector.push(
            self._org_id,
            ConnectorResource.MESSAGE,
            {"to_phone": to_phone, "message": message, "preview_url": preview_url},
        )
        if push.ok:
            return {"messages": [{"id": push.data.get("message_id", "")}]}
        return None

    async def close(self) -> None:
        await self._connector.close()


class LeadFacade:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.registry = ConnectorRegistry(session)

    async def close(self) -> None:
        await self.registry.close()

    def _build_handler(self) -> tuple[WhatsappWebhookHandler, _WhatsappConnectorAdapter]:
        from src.config import get_settings

        settings = get_settings()
        wa = self.registry.whatsapp()
        adapter = _WhatsappConnectorAdapter(wa)
        ai = LeadQualifier()
        handler = WhatsappWebhookHandler(
            webhook_secret=settings.whatsapp_webhook_secret,
            whatsapp_client=adapter,
            ai_qualifier=ai,
        )
        return handler, adapter

    async def handle_inbound_webhook(
        self,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        handler, _ = self._build_handler()
        return await handler.process_webhook(payload, self.session)

    def validate_signature(self, body: bytes, signature: str | None) -> bool:
        handler, _ = self._build_handler()
        return handler.validate_signature(body, signature)

    async def create_lead(
        self,
        org_id: str,
        phone: str,
        name: str | None = None,
        source: str = "manual",
    ) -> dict[str, Any]:
        try:
            lead_source = LeadSource(source)
        except ValueError:
            lead_source = LeadSource.OTHER

        lead = Lead(
            org_id=org_id,
            phone=phone,
            name=name,
            source=lead_source,
            status=LeadStatus.NEW,
        )

        self.session.add(lead)
        await self.session.flush()
        await self.session.refresh(lead)
        return {"status": "ok", "data": lead.to_dict()}
