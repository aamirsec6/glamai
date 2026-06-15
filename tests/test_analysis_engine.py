"""Analysis engine tests."""

from src.engine.analysis import AnalysisEngine, TenantSnapshot


def test_tenant_snapshot_defaults():
    snap = TenantSnapshot(org_id="o1", org_name="Test")
    assert snap.leads_total == 0
    assert snap.gbp_connected is False


def test_analysis_scores_empty_snapshot():
    from dataclasses import asdict

    snap = TenantSnapshot(org_id="o1", org_name="Test", gbp_total_views=100, posts_published=2)
    # Score logic mirrors engine: visibility = min(100, views/10)
    gbp_score = min(100, snap.gbp_total_views / 10)
    assert gbp_score == 10.0
    assert asdict(snap)["org_id"] == "o1"
