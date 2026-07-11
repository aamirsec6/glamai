"""Connector factory and health aggregation."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.integrations.anthropic import AnthropicConnector
from src.integrations.base import ConnectorHealth, ConnectorProvider, ConnectorStatus, DataConnector
from src.integrations.google_gbp import GoogleGbpConnector
from src.integrations.google_places import GooglePlacesConnector
from src.integrations.whatsapp import get_whatsapp_connector


class ConnectorRegistry:
    """Builds connector instances for a DB session."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self._anthropic = AnthropicConnector()

    def gbp(self) -> GoogleGbpConnector:
        return GoogleGbpConnector(self.session)

    def places(self) -> GooglePlacesConnector:
        return GooglePlacesConnector(self.session)

    def anthropic(self) -> AnthropicConnector:
        return self._anthropic

    def whatsapp(self):
        return get_whatsapp_connector(self.session)

    async def health_all(self, org_id: str | None = None) -> list[ConnectorHealth]:
        connectors: list[DataConnector] = [
            self.gbp(),
            self.places(),
            self.anthropic(),
            self.whatsapp(),
        ]
        results: list[ConnectorHealth] = []
        for c in connectors:
            try:
                results.append(await c.health(org_id))
            except Exception as e:
                results.append(
                    ConnectorHealth(
                        provider=c.provider,
                        status=ConnectorStatus.ERROR,
                        message=str(e),
                        last_error=str(e),
                    )
                )
            finally:
                if c is not self._anthropic:
                    await c.close()
        return results

    async def close(self) -> None:
        await self._anthropic.close()


def get_connector(
    provider: ConnectorProvider,
    session: AsyncSession,
) -> DataConnector:
    registry = ConnectorRegistry(session)
    if provider == ConnectorProvider.GOOGLE_GBP:
        return registry.gbp()
    if provider == ConnectorProvider.GOOGLE_PLACES:
        return registry.places()
    if provider == ConnectorProvider.ANTHROPIC:
        return registry.anthropic()
    if provider == ConnectorProvider.WHATSAPP:
        return registry.whatsapp()
    raise ValueError(f"Unknown provider: {provider}")
