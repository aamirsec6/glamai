"""WhatsApp Business API client (via 360dialog).

Handles outbound message delivery and template management.
"""

from __future__ import annotations

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

logger = structlog.get_logger(__name__)


class WhatsappClient:
    """Client for WhatsApp Business API via 360dialog.

    360dialog is an official WhatsApp Business Solution Provider (BSP).
    API docs: https://docs.360dialog.com/

    For MVP, we use:
    - Session messages (free-form, within 24h of customer's last message)
    - Template messages (pre-approved, for outbound notifications)

    Pricing: ~₹0.30-0.80 per conversation (24h session)
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://waba-v2.360dialog.io",
        webhook_secret: str = "",
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.webhook_secret = webhook_secret
        self._client = httpx.AsyncClient(
            base_url=f"{self.base_url}",
            headers={
                "D360-API-KEY": self.api_key,
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def send_text_message(
        self,
        to_phone: str,
        message: str,
        preview_url: bool = False,
    ) -> dict | None:
        """Send a text message to a phone number.

        This must be a session message (within 24h of customer's last message)
        or use an approved template.

        Args:
            to_phone: Phone number in international format (e.g., "919876543210")
            message: Text message body
            preview_url: Whether to show URL previews

        Returns:
            Response dict with message ID, or None on failure.
        """
        # Ensure phone has country code
        to_phone = self._normalize_phone(to_phone)

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone,
            "type": "text",
            "text": {
                "preview_url": preview_url,
                "body": message,
            },
        }

        try:
            response = await self._client.post("/messages", json=payload)
            response.raise_for_status()
            data = response.json()
            logger.info(
                "whatsapp_message_sent",
                to=to_phone,
                message_id=data.get("messages", [{}])[0].get("id"),
            )
            return data
        except httpx.HTTPStatusError as e:
            logger.error(
                "whatsapp_send_failed",
                to=to_phone,
                status=e.response.status_code,
                body=e.response.text,
            )
            return None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def send_template_message(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "en",
        components: list[dict] | None = None,
    ) -> dict | None:
        """Send a pre-approved template message.

        Template messages are required for:
        - Messages outside the 24h session window
        - Automated notifications (new lead alerts, reports)
        - Marketing messages

        Templates must be pre-approved by WhatsApp/Meta.

        Args:
            to_phone: Phone number in international format
            template_name: Name of the approved template
            language_code: Template language (default: "en")
            components: Template parameters

        Returns:
            Response dict with message ID, or None on failure.
        """
        to_phone = self._normalize_phone(to_phone)

        payload = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
            },
        }

        if components:
            payload["template"]["components"] = components

        try:
            response = await self._client.post("/messages", json=payload)
            response.raise_for_status()
            data = response.json()
            logger.info(
                "whatsapp_template_sent",
                to=to_phone,
                template=template_name,
                message_id=data.get("messages", [{}])[0].get("id"),
            )
            return data
        except httpx.HTTPStatusError as e:
            logger.error(
                "whatsapp_template_failed",
                to=to_phone,
                template=template_name,
                status=e.response.status_code,
                body=e.response.text,
            )
            return None

    async def mark_message_read(self, message_id: str) -> bool:
        """Mark a message as read.

        This shows the blue ticks to the sender.
        """
        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id,
        }

        try:
            response = await self._client.post("/messages", json=payload)
            response.raise_for_status()
            return True
        except httpx.HTTPStatusError:
            return False

    @staticmethod
    def _normalize_phone(phone: str) -> str:
        """Normalize phone number to international format.

        - Strip spaces, dashes, parentheses
        - Add India country code (91) if not present
        - Ensure it starts with '+'
        """
        phone = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")

        if phone.startswith("+"):
            return phone.lstrip("+")

        if phone.startswith("0"):
            phone = phone.lstrip("0")

        # Add India country code if not present
        if not phone.startswith("91") and len(phone) == 10:
            phone = f"91{phone}"

        return phone
