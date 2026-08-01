"""Shared handoff payloads between growth agents."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class GrowthHandoff:
    """Contract Geo → SEO → Content within one Growth run."""

    priority_keywords: list[str] = field(default_factory=list)
    geo_brief: dict[str, Any] = field(default_factory=dict)
    seo_actions: list[dict[str, Any]] = field(default_factory=list)
    ranking_summary: dict[str, Any] = field(default_factory=dict)

    def targeted_post_keywords(self) -> list[str]:
        """Keywords SEO wants Content to post about this week."""
        keys: list[str] = []
        for action in self.seo_actions:
            if action.get("type") == "targeted_post" and action.get("keyword"):
                keys.append(str(action["keyword"]))
        # Prefer SEO targets, then geo priority list
        merged = list(dict.fromkeys([*keys, *self.priority_keywords]))
        return merged

    def needs_profile_refresh(self) -> bool:
        return any(
            a.get("type") in ("profile_refresh", "profile_keyword")
            for a in self.seo_actions
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "priority_keywords": self.priority_keywords,
            "geo_brief": self.geo_brief,
            "seo_actions": self.seo_actions,
            "ranking_summary": self.ranking_summary,
            "targeted_post_keywords": self.targeted_post_keywords(),
            "needs_profile_refresh": self.needs_profile_refresh(),
        }
