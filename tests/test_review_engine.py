"""Tests for review engine — sync, AI replies, and review requests."""

from __future__ import annotations

import pytest

from src.models.review import GbpReview, ReviewReplyStatus, ReviewRequest


def test_review_reply_status_values():
    """All review reply statuses should have correct values."""
    assert ReviewReplyStatus.PENDING.value == "pending"
    assert ReviewReplyStatus.AI_DRAFT.value == "ai_draft"
    assert ReviewReplyStatus.REPLIED.value == "replied"
    assert ReviewReplyStatus.SKIPPED.value == "skipped"
    assert ReviewReplyStatus.FAILED.value == "failed"


def test_review_default_reply_status_is_pending():
    """New reviews should default to PENDING."""
    review = GbpReview(
        org_id="org-1",
        google_review_id="review-123",
        star_rating=5,
        comment="Great service!",
    )
    assert review.reply_status == ReviewReplyStatus.PENDING
    assert review.ai_generated is False


def test_review_to_dict():
    """Review serialization should include all key fields."""
    review = GbpReview(
        org_id="org-1",
        google_review_id="review-456",
        reviewer_name="Rahul",
        star_rating=5,
        comment="Excellent dental work",
        reply_status=ReviewReplyStatus.REPLIED,
        reply_text="Thank you Rahul!",
        ai_generated=True,
    )
    d = review.to_dict()
    assert d["org_id"] == "org-1"
    assert d["google_review_id"] == "review-456"
    assert d["star_rating"] == 5
    assert d["reply_status"] == "replied"
    assert d["ai_generated"] is True


def test_review_request_defaults():
    """Review request defaults should be correct."""
    req = ReviewRequest(
        org_id="org-1",
        lead_id="lead-1",
        phone="9876543210",
        message_body="Please leave a review",
    )
    assert req.sent is False
    assert req.review_received is False
