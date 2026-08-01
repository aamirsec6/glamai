"""Salon vertical pack."""

from __future__ import annotations

from src.services.verticals._base import format_keywords

CATEGORY = "salon"
PLACES_TYPES = ["beauty_salon", "hair_salon"]
DISPLAY_NAME = "Salon"

KEYWORD_TEMPLATES = [
    "salon in {city}",
    "beauty salon {city}",
    "hair salon {city}",
    "bridal makeup {city}",
    "hair spa {city}",
    "facial treatment {city}",
    "nail salon {city}",
    "best salon {city}",
    "mens salon {city}",
    "salon near me",
]

SEO_GAP_TEMPLATES = ["salon in {city}", "best salon {city}", "bridal makeup {city}"]

POST_TEMPLATES = {
    "portfolio_showcase": {"description": "Style showcase", "example": "Fresh cut and color — book your slot!"},
    "tip_educational": {"description": "Hair/beauty tip", "example": "Winter hair care tip from our stylists."},
    "testimonial": {"description": "Client testimonial", "example": "Best bridal makeup — happy bride!"},
    "offer_promotion": {"description": "Salon offer", "example": "20% off hair spa this week!"},
}

MONTHLY_POST_TYPES = ["portfolio_showcase", "tip_educational", "testimonial", "offer_promotion"]
QUALIFICATION_FLOW = {
    "greeting": {"question": None, "next": "service", "extract": []},
    "service": {"question": "What service are you interested in? (haircut, bridal, facial, etc.)", "next": "date", "extract": ["scope"]},
    "date": {"question": "When would you like to book?", "next": "location", "extract": ["timeline"]},
    "location": {"question": "Which area are you in?", "next": "complete", "extract": ["location_area"]},
    "complete": {"question": None, "next": None, "extract": []},
}


def keyword_pool(city: str, area: str | None = None) -> list[str]:
    return format_keywords(KEYWORD_TEMPLATES, city, area)


def seo_gap_templates(city: str) -> list[str]:
    return format_keywords(SEO_GAP_TEMPLATES, city)


def post_system_prompt(org_name: str, city: str) -> str:
    return f"GBP post writer for {org_name}, salon in {city}, India. JSON response."


def whatsapp_system_prompt(org_name: str, city: str) -> str:
    return f"WhatsApp assistant for {org_name} salon in {city}. Help book services."
