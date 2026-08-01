"""Google Maps review link helpers."""

from __future__ import annotations


def build_gbp_review_url(place_id: str | None) -> str | None:
    """Build a Google Maps write-review URL from a stored place identifier."""
    if not place_id:
        return None
    normalized = place_id.strip()
    if not normalized:
        return None
    # GBP OAuth stores locations/{id}; writereview accepts the raw stored value.
    return f"https://search.google.com/local/writereview?placeid={normalized}"
