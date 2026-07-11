"""GBP profile content optimization."""

from __future__ import annotations

import json
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.integrations.anthropic import AnthropicConnector
from src.integrations.base import ConnectorResource
from src.integrations.registry import ConnectorRegistry
from src.models.gbp import GbpProfileSnapshot
from src.models.org import Org
from src.services.gbp.optimizer import INTERIOR_DESIGN_KEYWORDS

logger = structlog.get_logger(__name__)


class GbpProfileOptimizer:
    """Sync, analyze, and optimize GBP business profile content."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.registry = ConnectorRegistry(session)
        self.ai = AnthropicConnector()

    async def close(self) -> None:
        await self.registry.close()
        await self.ai.close()

    async def sync_profile(self, org_id: str) -> dict[str, Any]:
        org = await self.session.get(Org, org_id)
        if not org or not org.gbp_place_id:
            return {"status": "not_connected"}

        gbp = self.registry.gbp()
        try:
            pull = await gbp.pull(org_id, ConnectorResource.LOCATIONS)
            if not pull.ok:
                return {"status": "error", "error": pull.error}

            locations = pull.data.get("locations", [])
            if not locations:
                return {"status": "no_locations"}

            loc = locations[0]
            description = loc.get("profile", {}).get("description") or loc.get("description", "")
            title = loc.get("title") or loc.get("locationName") or org.name

            stmt = select(GbpProfileSnapshot).where(GbpProfileSnapshot.org_id == org_id)
            result = await self.session.execute(stmt)
            snapshot = result.scalar_one_or_none()
            if not snapshot:
                snapshot = GbpProfileSnapshot(org_id=org_id)
            snapshot.title = title
            snapshot.description = description
            snapshot.categories_json = json.dumps(loc.get("categories", []))
            from datetime import datetime

            snapshot.synced_at = datetime.utcnow()
            snapshot.updated_at = datetime.utcnow()
            self.session.add(snapshot)
            await self.session.flush()
            return {"status": "ok", "profile": snapshot.to_dict()}
        finally:
            await gbp.close()

    async def optimize_profile(self, org_id: str) -> dict[str, Any]:
        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        stmt = select(GbpProfileSnapshot).where(GbpProfileSnapshot.org_id == org_id)
        result = await self.session.execute(stmt)
        snapshot = result.scalar_one_or_none()
        if not snapshot:
            sync_result = await self.sync_profile(org_id)
            if sync_result.get("status") != "ok":
                return sync_result
            result = await self.session.execute(stmt)
            snapshot = result.scalar_one()

        keywords = list(INTERIOR_DESIGN_KEYWORDS.get("primary", []))
        if org.category.value != "interior_design":
            keywords = [org.category.value.replace("_", " "), f"{org.category.value} {org.city}"]

        system = (
            f"You optimize Google Business Profile content for {org.name} "
            f"({org.category.value}, {org.city}, India). "
            "Return JSON only with keys: optimized_description (max 750 chars), "
            "services (array of 5-8 service strings), keywords (array), "
            "optimization_score (0-100), suggestions (array of short strings)."
        )
        user = (
            f"Business: {org.name}\n"
            f"City: {org.city}\n"
            f"Current description: {snapshot.description or 'None'}\n"
            f"Target keywords: {', '.join(keywords[:6])}\n"
        )

        pull = await self.ai.pull(
            org_id,
            ConnectorResource.OPTIMIZE_PROFILE,
            system_prompt=system,
            user_message=user,
            max_tokens=1200,
        )

        if not pull.ok:
            return {"status": "ai_error", "error": pull.error}

        data = pull.data
        if "raw" in data and not data.get("optimized_description"):
            try:
                text = data["raw"]
                if text.startswith("```"):
                    text = text.split("\n", 1)[1].rsplit("\n```", 1)[0]
                data = json.loads(text)
            except json.JSONDecodeError:
                data = {"optimized_description": data.get("raw", "")}

        snapshot.optimized_description = data.get("optimized_description", "")
        snapshot.services_json = json.dumps(data.get("services", []))
        snapshot.keywords_json = json.dumps(data.get("keywords", keywords))
        snapshot.optimization_score = int(data.get("optimization_score", 70))
        snapshot.ai_suggestions_json = json.dumps(data.get("suggestions", []))
        from datetime import datetime

        snapshot.updated_at = datetime.utcnow()
        self.session.add(snapshot)
        await self.session.flush()
        return {"status": "ok", "profile": snapshot.to_dict()}

    async def apply_optimization(self, org_id: str) -> dict[str, Any]:
        stmt = select(GbpProfileSnapshot).where(GbpProfileSnapshot.org_id == org_id)
        result = await self.session.execute(stmt)
        snapshot = result.scalar_one_or_none()
        if not snapshot or not snapshot.optimized_description:
            return {"status": "nothing_to_apply"}

        org = await self.session.get(Org, org_id)
        if not org or not org.gbp_place_id:
            return {"status": "not_connected"}

        gbp = self.registry.gbp()
        try:
            push = await gbp.push(
                org_id,
                ConnectorResource.PROFILE,
                {"description": snapshot.optimized_description},
            )
            if push.ok:
                from datetime import datetime

                snapshot.applied = True
                snapshot.applied_at = datetime.utcnow()
                snapshot.updated_at = datetime.utcnow()
                self.session.add(snapshot)
                await self.session.flush()
            return {"status": "ok" if push.ok else "error", "error": push.error}
        finally:
            await gbp.close()
