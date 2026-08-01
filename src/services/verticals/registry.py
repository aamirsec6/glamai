"""Vertical config registry — keyword banks, posts, SEO, WhatsApp flows per business type."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from src.services.verticals.packs import bakery, dentist, interior_design, salon
from src.services.verticals.packs import _default as default_pack


@dataclass
class VerticalConfig:
    """Configuration pack for a business vertical."""

    category: str
    display_name: str
    places_types: list[str]
    keyword_pool_fn: Callable[..., list[str]]
    seo_gap_fn: Callable[..., list[str]]
    post_templates: dict[str, dict[str, str]]
    monthly_post_types: list[str]
    qualification_flow: dict[str, Any]
    post_system_prompt_fn: Callable[..., str]
    whatsapp_system_prompt_fn: Callable[..., str]
    keyword_bank: dict[str, list[str]] = field(default_factory=dict)

    def keyword_pool(self, city: str, area: str | None = None) -> list[str]:
        return self.keyword_pool_fn(city, area)

    def seo_gap_templates(self, city: str) -> list[str]:
        return self.seo_gap_fn(city)

    def post_system_prompt(self, org_name: str, city: str) -> str:
        return self.post_system_prompt_fn(org_name, city)

    def whatsapp_system_prompt(self, org_name: str, city: str) -> str:
        return self.whatsapp_system_prompt_fn(org_name, city)


def _pack_to_config(module: Any) -> VerticalConfig:
    return VerticalConfig(
        category=module.CATEGORY,
        display_name=module.DISPLAY_NAME,
        places_types=module.PLACES_TYPES,
        keyword_pool_fn=module.keyword_pool,
        seo_gap_fn=module.seo_gap_templates,
        post_templates=module.POST_TEMPLATES,
        monthly_post_types=module.MONTHLY_POST_TYPES,
        qualification_flow=module.QUALIFICATION_FLOW,
        post_system_prompt_fn=module.post_system_prompt,
        whatsapp_system_prompt_fn=module.whatsapp_system_prompt,
        keyword_bank=getattr(module, "KEYWORD_BANK", {}),
    )


def _default_config(category: str) -> VerticalConfig:
    return VerticalConfig(
        category=category,
        display_name=category.replace("_", " ").title(),
        places_types=default_pack.PLACES_TYPES,
        keyword_pool_fn=lambda city, area=None, c=category: default_pack.keyword_pool(
            city, area, c
        ),
        seo_gap_fn=lambda city, c=category: default_pack.seo_gap_templates(city, c),
        post_templates=default_pack.POST_TEMPLATES,
        monthly_post_types=default_pack.MONTHLY_POST_TYPES,
        qualification_flow=default_pack.QUALIFICATION_FLOW,
        post_system_prompt_fn=lambda name, city, c=category: default_pack.post_system_prompt(
            name, city, c
        ),
        whatsapp_system_prompt_fn=lambda name, city, c=category: default_pack.whatsapp_system_prompt(
            name, city, c
        ),
    )


_REGISTRY: dict[str, VerticalConfig] = {
    "interior_design": _pack_to_config(interior_design),
    "bakery": _pack_to_config(bakery),
    "dentist": _pack_to_config(dentist),
    "salon": _pack_to_config(salon),
    "gym": _default_config("gym"),
    "architect": _default_config("architect"),
    "photographer": _default_config("photographer"),
    "restaurant": _default_config("restaurant"),
    "other": _default_config("other"),
}

# Places type overrides for defaults
_REGISTRY["gym"].places_types = ["gym", "fitness_center"]
_REGISTRY["architect"].places_types = ["architect"]
_REGISTRY["photographer"].places_types = ["photographer"]
_REGISTRY["restaurant"].places_types = ["restaurant"]


def get_vertical(category: str) -> VerticalConfig:
    """Return vertical config for a business category."""
    key = (category or "other").lower()
    return _REGISTRY.get(key, _default_config(key))


def all_places_types() -> dict[str, list[str]]:
    """Map category -> Google Places types for competitor search."""
    return {cat: cfg.places_types for cat, cfg in _REGISTRY.items()}


def list_categories() -> list[str]:
    return list(_REGISTRY.keys())
