"""Geo / local growth agent orchestrator."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.models.org import Org
from src.services.geo.local_agent import GeoBrief, GeoLocalService

logger = structlog.get_logger(__name__)


@dataclass
class GeoAgentResult:
    org_id: str
    org_name: str
    geo_brief: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "org_id": self.org_id,
            "org_name": self.org_name,
            "geo_brief": self.geo_brief,
            "errors": self.errors,
        }


class GeoLocalAgentOrchestrator:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_settings()
        self.service = GeoLocalService(session)

    async def run(self, org_id: str) -> GeoAgentResult:
        org = await self.session.get(Org, org_id)
        if not org:
            return GeoAgentResult(org_id=org_id, org_name="", errors=["org_not_found"])

        result = GeoAgentResult(org_id=org_id, org_name=org.name)

        if not self.settings.feature_geo_agent:
            result.errors.append("geo_agent_disabled")
            return result

        try:
            brief: GeoBrief = await self.service.run(org_id)
            result.geo_brief = brief.to_dict()
            result.errors.extend(brief.errors)
        except Exception as e:
            logger.exception("geo_agent_failed", org_id=org_id)
            result.errors.append(str(e))
        finally:
            await self.service.close()

        return result
