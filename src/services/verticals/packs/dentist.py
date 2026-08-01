"""Dentist vertical pack."""

from __future__ import annotations

from src.services.verticals._base import format_keywords

CATEGORY = "dentist"
PLACES_TYPES = ["dentist"]
DISPLAY_NAME = "Dentist"

KEYWORD_TEMPLATES = [
    "dentist in {city}",
    "best dentist {city}",
    "dental clinic {city}",
    "dental implants {city}",
    "root canal treatment {city}",
    "braces treatment {city}",
    "cosmetic dentistry {city}",
    "kids dentist {city}",
    "teeth whitening {city}",
    "orthodontist {city}",
]

SEO_GAP_TEMPLATES = [
    "dentist in {city}",
    "best dentist {city}",
    "dental clinic {city}",
]

POST_TEMPLATES = {
    "tip_educational": {"description": "Dental health tip", "example": "Brush twice daily and floss — your smile matters!"},
    "testimonial": {"description": "Patient testimonial", "example": "Painless treatment — happy patient!"},
    "offer_promotion": {"description": "Check-up offer", "example": "Free consultation for new patients this month!"},
    "seasonal": {"description": "Seasonal dental care", "example": "Start the year with a dental check-up!"},
}

MONTHLY_POST_TYPES = ["tip_educational", "testimonial", "offer_promotion", "seasonal"]
QUALIFICATION_FLOW = {
    "greeting": {"question": None, "next": "need", "extract": []},
    "need": {"question": "What dental treatment are you looking for?", "next": "timeline", "extract": ["scope"]},
    "timeline": {"question": "When would you like to visit?", "next": "location", "extract": ["timeline"]},
    "location": {"question": "Which area are you in?", "next": "complete", "extract": ["location_area"]},
    "complete": {"question": None, "next": None, "extract": []},
}


def keyword_pool(city: str, area: str | None = None) -> list[str]:
    return format_keywords(KEYWORD_TEMPLATES, city, area)


def seo_gap_templates(city: str) -> list[str]:
    return format_keywords(SEO_GAP_TEMPLATES, city)


def post_system_prompt(org_name: str, city: str) -> str:
    return f"GBP post writer for {org_name}, dental clinic in {city}, India. JSON response."


def whatsapp_system_prompt(org_name: str, city: str) -> str:
    return f"WhatsApp assistant for {org_name} dental clinic in {city}. Qualify patients warmly."
