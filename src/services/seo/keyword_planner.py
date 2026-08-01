"""Select keywords to track per org from niches and vertical packs."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.org import Org
from src.models.territory import KeywordNiche, Territory, TerritoryStatus
from src.services.verticals import get_vertical


class KeywordPlanner:
  def __init__(self, session: AsyncSession):
    self.session = session

  async def get_tracked_keywords(self, org_id: str, limit: int = 12) -> list[str]:
    org = await self.session.get(Org, org_id)
    if not org:
      return []

    niche_stmt = (
      select(KeywordNiche.keyword)
      .where(KeywordNiche.org_id == org_id)
      .where(KeywordNiche.status == TerritoryStatus.ACTIVE)
    )
    niche_result = await self.session.execute(niche_stmt)
    niche_keywords = [row[0] for row in niche_result.all() if row[0]]

    if niche_keywords:
      return list(dict.fromkeys(niche_keywords))[:limit]

    city = org.city or "Bangalore"
    vertical = get_vertical(org.category.value)
    return vertical.keyword_pool(city)[:limit]

  async def get_priority_keywords(self, org_id: str, limit: int = 4) -> list[str]:
    keywords = await self.get_tracked_keywords(org_id, limit=limit)
    return keywords[:limit]
