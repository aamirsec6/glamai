"""Tests for vertical config packs."""

from __future__ import annotations

from src.services.verticals import get_vertical, list_categories


def test_list_categories_includes_bakery():
    cats = list_categories()
    assert "bakery" in cats
    assert "interior_design" in cats


def test_bakery_keyword_pool():
    pack = get_vertical("bakery")
    keywords = pack.keyword_pool("Bangalore", "Indiranagar")
    assert len(keywords) >= 8
    assert any("cake" in kw.lower() for kw in keywords)
    assert any("bakery" in kw.lower() for kw in keywords)


def test_interior_design_keyword_pool():
    pack = get_vertical("interior_design")
    keywords = pack.keyword_pool("Mumbai")
    assert any("interior" in kw.lower() for kw in keywords)


def test_bakery_qualification_flow():
    pack = get_vertical("bakery")
    flow = pack.qualification_flow
    assert flow["greeting"]["next"] == "occasion"
    assert flow["occasion"]["next"] == "item"
    assert flow["location"]["next"] == "complete"


def test_unknown_category_falls_back():
    pack = get_vertical("unknown_vertical_xyz")
    assert pack.category == "unknown_vertical_xyz"
    keywords = pack.keyword_pool("Delhi")
    assert len(keywords) > 0
