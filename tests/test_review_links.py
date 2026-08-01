from src.services.reviews.links import build_gbp_review_url


def test_build_gbp_review_url_with_place_id():
    assert (
        build_gbp_review_url("ChIJ_demo_studio")
        == "https://search.google.com/local/writereview?placeid=ChIJ_demo_studio"
    )


def test_build_gbp_review_url_with_location_resource():
    assert (
        build_gbp_review_url("locations/123456789")
        == "https://search.google.com/local/writereview?placeid=locations/123456789"
    )


def test_build_gbp_review_url_empty():
    assert build_gbp_review_url(None) is None
    assert build_gbp_review_url("") is None
    assert build_gbp_review_url("   ") is None
