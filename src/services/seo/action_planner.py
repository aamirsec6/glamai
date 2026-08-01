"""Plan SEO actions from analysis and ranking data."""

from __future__ import annotations

from typing import Any

from src.analytics.insights.types import SeoHealthInsights


class ActionPlanner:
  def plan(
    self,
    seo: SeoHealthInsights,
    rankings: list[dict[str, Any]],
    priority_keywords: list[str],
  ) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []

    for gap in seo.keyword_gaps[:3]:
      actions.append({
        "type": "targeted_post",
        "keyword": gap,
        "reason": f"Keyword gap: not tracked for '{gap}'",
        "priority": "high",
      })

    for r in rankings:
      pos = r.get("position")
      kw = r.get("keyword")
      if pos is None:
        actions.append({
          "type": "profile_keyword",
          "keyword": kw,
          "reason": f"Not in top 20 for '{kw}'",
          "priority": "high",
        })
      elif pos > 3:
        actions.append({
          "type": "targeted_post",
          "keyword": kw,
          "reason": f"Position #{pos} — push toward top 3",
          "priority": "medium" if pos <= 10 else "high",
        })

    if seo.ranking_momentum == "weak":
      actions.append({
        "type": "profile_refresh",
        "keyword": priority_keywords[0] if priority_keywords else None,
        "reason": "Weak ranking momentum — refresh GBP profile",
        "priority": "high",
      })

    if not actions and priority_keywords:
      actions.append({
        "type": "targeted_post",
        "keyword": priority_keywords[0],
        "reason": "Maintain visibility with fresh GBP content",
        "priority": "low",
      })

    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for a in actions:
      key = f"{a['type']}:{a.get('keyword')}"
      if key not in seen:
        seen.add(key)
        unique.append(a)
    return unique[:8]
