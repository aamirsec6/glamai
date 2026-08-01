"""Path to Top 3 weekly scorecard."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.gbp import GbpRanking
from src.models.org import Org


class PathToTop3Scorecard:
  def __init__(self, session: AsyncSession):
    self.session = session

  async def build(
    self,
    org_id: str,
    rankings: list[dict[str, Any]],
    actions: list[dict[str, Any]],
    tracking_status: str = "ok",
  ) -> dict[str, Any]:
    org = await self.session.get(Org, org_id)
    org_name = org.name if org else "Unknown"

    positions = [r["position"] for r in rankings if r.get("position")]
    in_top3 = sum(1 for p in positions if p <= 3)
    avg_pos = round(sum(positions) / len(positions), 1) if positions else None

    week_ago = datetime.utcnow() - timedelta(days=7)
    prev_stmt = (
      select(GbpRanking)
      .where(GbpRanking.org_id == org_id)
      .where(GbpRanking.recorded_at < week_ago)
      .order_by(GbpRanking.recorded_at.desc())
      .limit(50)
    )
    prev_result = await self.session.execute(prev_stmt)
    prev_rows = prev_result.scalars().all()
    prev_by_kw = {}
    for row in prev_rows:
      if row.keyword not in prev_by_kw and row.position:
        prev_by_kw[row.keyword] = row.position

    keyword_progress = []
    for r in rankings:
      kw = r.get("keyword", "")
      pos = r.get("position")
      prev = prev_by_kw.get(kw)
      delta = (prev - pos) if prev and pos else None
      keyword_progress.append({
        "keyword": kw,
        "position": pos,
        "previous_position": prev,
        "delta": delta,
        "in_top3": pos is not None and pos <= 3,
        "gap_to_top3": max(0, (pos or 21) - 3) if pos else None,
      })

    worst = max(
      (kp for kp in keyword_progress if kp["position"]),
      key=lambda x: x["position"],
      default=None,
    )
    progress_pct = 0
    if positions:
      progress_pct = round((in_top3 / len(positions)) * 100)

    return {
      "generated_at": datetime.utcnow().isoformat(),
      "org_id": org_id,
      "org_name": org_name,
      "tracking_status": tracking_status,
      "summary": {
        "keywords_tracked": len(rankings),
        "in_top3": in_top3,
        "avg_position": avg_pos,
        "progress_pct": progress_pct,
        "worst_keyword": worst["keyword"] if worst else None,
        "worst_position": worst["position"] if worst else None,
      },
      "keywords": keyword_progress,
      "recommended_actions": actions,
      "path_to_top3": {
        "target": "Top 3 on Google Maps for primary keywords",
        "effort_guarantee": True,
        "rank_guarantee": False,
        "next_focus": actions[0] if actions else None,
      },
    }
