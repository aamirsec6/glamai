"""Automated local pack rank tracking via SerpAPI."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.models.gbp import GbpRanking
from src.models.org import Org

logger = structlog.get_logger(__name__)


class RankTrackerService:
  def __init__(self, session: AsyncSession):
    self.session = session
    self.settings = get_settings()

  async def track_org(
    self,
    org_id: str,
    keywords: list[str],
  ) -> dict[str, Any]:
    org = await self.session.get(Org, org_id)
    if not org:
      return {"status": "org_not_found", "rankings": []}

    if not self.settings.serpapi_key:
      logger.warning("rank_tracking_skipped", org_id=org_id, reason="no_serpapi_key")
      return {
        "status": "not_configured",
        "message": "Set SERPAPI_KEY for automated rank tracking",
        "rankings": [],
      }

    if org.latitude is None or org.longitude is None:
      return {
        "status": "no_coordinates",
        "message": "Org needs latitude/longitude for rank tracking",
        "rankings": [],
      }

    results: list[dict[str, Any]] = []
    for keyword in keywords:
      position = await self._fetch_position(
        keyword=keyword,
        lat=org.latitude,
        lng=org.longitude,
        place_id=org.gbp_place_id,
        business_name=org.name,
      )
      ranking = GbpRanking(
        id=str(uuid4()),
        org_id=org_id,
        keyword=keyword,
        position=position,
        search_city=org.city or "Bangalore",
        source="serpapi",
        recorded_at=datetime.utcnow(),
      )
      self.session.add(ranking)
      results.append({
        "keyword": keyword,
        "position": position,
        "in_top3": position is not None and position <= 3,
      })

    await self.session.flush()
    return {"status": "ok", "rankings": results, "tracked": len(results)}

  async def _fetch_position(
    self,
    keyword: str,
    lat: float,
    lng: float,
    place_id: str | None,
    business_name: str,
  ) -> int | None:
    """Return 1-based local pack position or None if not in top 20."""
    params = {
      "engine": "google_maps",
      "q": keyword,
      "ll": f"@{lat},{lng},14z",
      "api_key": self.settings.serpapi_key,
    }
    try:
      async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get("https://serpapi.com/search.json", params=params)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
      logger.error("serpapi_rank_failed", keyword=keyword, error=str(e))
      return None

    local_results = data.get("local_results") or []
    for idx, place in enumerate(local_results[:20], start=1):
      pid = place.get("place_id") or place.get("data_id")
      title = (place.get("title") or "").lower()
      if place_id and pid and place_id in str(pid):
        return idx
      if business_name.lower() in title or title in business_name.lower():
        return idx
    return None
