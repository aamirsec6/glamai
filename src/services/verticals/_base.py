"""Shared helpers for vertical config packs."""

from __future__ import annotations


def format_keywords(templates: list[str], city: str, area: str | None = None) -> list[str]:
    """Expand keyword templates with city/area placeholders."""
    city_lower = city.lower()
    area_lower = (area or city).lower()
    result: list[str] = []
    for template in templates:
        kw = template.format(city=city_lower, area=area_lower)
        if kw not in result:
            result.append(kw)
    return result
