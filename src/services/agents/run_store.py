"""Persist last growth-agent run summary (Redis, with in-memory fallback)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

_MEMORY: dict[str, dict[str, Any]] = {}
_KEY = "qimma:growth:last_run:{org_id}"


async def _client():
    try:
        import redis.asyncio as aioredis

        from src.core.config import get_settings

        return aioredis.from_url(get_settings().redis_url, decode_responses=True)
    except Exception:
        return None


async def save_growth_run(org_id: str, payload: dict[str, Any]) -> None:
    record = {
        **payload,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    key = _KEY.format(org_id=org_id)
    _MEMORY[org_id] = record
    client = await _client()
    if client is None:
        return
    try:
        await client.set(key, json.dumps(record), ex=60 * 60 * 24 * 30)
        await client.aclose()
    except Exception:
        logger.warning("growth_run_persist_failed", org_id=org_id)
        try:
            await client.aclose()
        except Exception:
            pass


async def load_growth_run(org_id: str) -> dict[str, Any] | None:
    client = await _client()
    if client is not None:
        try:
            raw = await client.get(_KEY.format(org_id=org_id))
            await client.aclose()
            if raw:
                return json.loads(raw)
        except Exception:
            logger.warning("growth_run_load_failed", org_id=org_id)
            try:
                await client.aclose()
            except Exception:
                pass
    return _MEMORY.get(org_id)
