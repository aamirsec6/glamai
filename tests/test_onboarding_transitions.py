"""Onboarding multi-tenant helpers."""

from src.api.v1.orgs import _validate_onboarding_transition
from src.models.org import OnboardingStatus
from fastapi import HTTPException
import pytest


def test_whatsapp_skippable_from_gbp_to_territory():
    _validate_onboarding_transition(
        OnboardingStatus.GBP_CONNECTED,
        OnboardingStatus.TERRITORY_SET,
    )


def test_cannot_skip_gbp():
    with pytest.raises(HTTPException):
        _validate_onboarding_transition(
            OnboardingStatus.CREATED,
            OnboardingStatus.TERRITORY_SET,
        )


def test_sequential_from_territory_to_complete():
    _validate_onboarding_transition(
        OnboardingStatus.TERRITORY_SET,
        OnboardingStatus.ONBOARDING_COMPLETE,
    )
    _validate_onboarding_transition(
        OnboardingStatus.ONBOARDING_COMPLETE,
        OnboardingStatus.ACTIVE,
    )
