"""Tests for LeadFacade — webhook handling and manual lead creation."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.facades.leads import LeadFacade
from src.models.lead import Lead, LeadSource, LeadStatus


@pytest.mark.asyncio
async def test_create_lead_with_valid_phone(db: AsyncSession):
    """LeadFacade.create_lead should create a lead with correct field names."""
    facade = LeadFacade(db)
    try:
        result = await facade.create_lead(
            org_id="test-org-1",
            phone="9876543210",
            name="Aamir",
            source="whatsapp",
        )
        assert result["status"] == "ok"
        data = result["data"]
        assert data["contact_phone"] == "9876543210"
        assert data["contact_name"] == "Aamir"
        assert data["source"] == "whatsapp"
        assert data["status"] == "new"
    finally:
        await facade.close()


@pytest.mark.asyncio
async def test_create_lead_without_name(db: AsyncSession):
    """LeadFacade.create_lead should default name to 'Unknown'."""
    facade = LeadFacade(db)
    try:
        result = await facade.create_lead(
            org_id="test-org-1",
            phone="9876543210",
        )
        assert result["status"] == "ok"
        assert result["data"]["contact_name"] == "Unknown"
    finally:
        await facade.close()


@pytest.mark.asyncio
async def test_create_lead_invalid_source(db: AsyncSession):
    """LeadFacade.create_lead should handle invalid source gracefully."""
    facade = LeadFacade(db)
    try:
        result = await facade.create_lead(
            org_id="test-org-1",
            phone="9876543210",
            name="Test",
            source="invalid_source",
        )
        assert result["status"] == "ok"
        assert result["data"]["source"] == "other"
    finally:
        await facade.close()


@pytest.mark.asyncio
async def test_create_lead_manual_source(db: AsyncSession):
    """LeadFacade.create_lead with manual source."""
    facade = LeadFacade(db)
    try:
        result = await facade.create_lead(
            org_id="test-org-1",
            phone="9876543210",
            name="Manual Lead",
            source="manual",
        )
        assert result["status"] == "ok"
        assert result["data"]["source"] == "other"  # "manual" is not a valid LeadSource
    finally:
        await facade.close()
