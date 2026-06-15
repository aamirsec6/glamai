"""Basic tenant scoping tests."""

import pytest
from fastapi import HTTPException

from src.api.deps import assert_tenant_access, is_admin_request, require_org_access


def test_require_org_access_allows_same_org():
    require_org_access("org-1", "org-1")


def test_require_org_access_blocks_cross_tenant():
    with pytest.raises(HTTPException) as exc:
        require_org_access("org-1", "org-2")
    assert exc.value.status_code == 403


def test_assert_tenant_access_requires_header_for_clients():
    with pytest.raises(HTTPException) as exc:
        assert_tenant_access("org-1", None, None)
    assert exc.value.status_code == 400


def test_assert_tenant_access_allows_matching_org():
    assert_tenant_access("org-1", "org-1", None)


def test_is_admin_request_false_without_secret():
    assert is_admin_request(None) is False
