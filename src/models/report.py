"""Monthly value report model."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import Column, Enum as SAEnum, Index
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from src.models.org import Org


class ReportStatus(str, enum.Enum):
    """Status of a monthly report."""

    PENDING = "pending"
    GENERATING = "generating"
    GENERATED = "generated"
    DELIVERED = "delivered"
    FAILED = "failed"


class MonthlyReport(SQLModel, table=True):
    """Monthly value report for a client.

    Generated automatically at the end of each month and delivered
    via WhatsApp as a PDF.

    The report shows:
    - Leads generated (total, by source, by status)
    - GBP performance (views, actions, ranking changes)
    - Review metrics (new reviews, rating change)
    - Estimated revenue from leads
    - Comparison to previous month
    """

    __tablename__ = "monthly_reports"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
    )

    # ── Ownership ────────────────────────────────────────────
    org_id: str = Field(foreign_key="orgs.id", index=True)

    # ── Report Period ────────────────────────────────────────
    report_month: int = Field(index=True)   # 1-12
    report_year: int = Field(index=True)
    period_start: datetime = Field()
    period_end: datetime = Field()

    # ── Lead Metrics ─────────────────────────────────────────
    leads_total: int = Field(default=0)
    leads_from_whatsapp: int = Field(default=0)
    leads_from_gbp: int = Field(default=0)
    leads_from_other: int = Field(default=0)
    leads_won: int = Field(default=0)
    leads_lost: int = Field(default=0)
    leads_conversion_rate: float | None = Field(
        default=None
    )  # Percentage

    # ── Revenue Metrics ──────────────────────────────────────
    total_estimated_revenue_paise: int = Field(
        default=0
    )  # Sum of won_value for converted leads
    avg_project_value_paise: int | None = Field(default=None)

    # ── GBP Metrics ──────────────────────────────────────────
    gbp_search_views: int = Field(default=0)
    gbp_maps_views: int = Field(default=0)
    gbp_total_views: int = Field(default=0)
    gbp_website_clicks: int = Field(default=0)
    gbp_calls: int = Field(default=0)
    gbp_direction_requests: int = Field(default=0)
    gbp_posts_published: int = Field(default=0)

    # ── Ranking Metrics ──────────────────────────────────────
    avg_keyword_position: float | None = Field(default=None)
    best_keyword_position: int | None = Field(default=None)
    keywords_tracked: int = Field(default=0)
    keywords_improved: int = Field(default=0)
    keywords_declined: int = Field(default=0)

    # ── Review Metrics ───────────────────────────────────────
    reviews_at_start: int = Field(default=0)
    reviews_at_end: int = Field(default=0)
    reviews_new: int = Field(default=0)
    avg_rating_at_start: float | None = Field(default=None)
    avg_rating_at_end: float | None = Field(default=None)

    # ── Month-over-Month Comparison ──────────────────────────
    leads_mom_change_pct: float | None = Field(
        default=None
    )  # Percentage change
    views_mom_change_pct: float | None = Field(default=None)
    revenue_mom_change_pct: float | None = Field(default=None)

    # ── Report Delivery ──────────────────────────────────────
    status: ReportStatus = Field(
        default=ReportStatus.PENDING,
        sa_column=Column(SAEnum(ReportStatus), index=True),
    )
    pdf_url: str | None = Field(default=None, max_length=1000)
    delivered_via: str | None = Field(
        default=None, max_length=50
    )  # whatsapp, email
    delivered_at: datetime | None = Field(default=None)

    # ── AI Narrative ─────────────────────────────────────────
    ai_narrative: str | None = Field(
        default=None, sa_column=Column(Text)
    )  # AI-generated summary paragraph

    # ── Timestamps ───────────────────────────────────────────
    generated_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # ── Relationships ────────────────────────────────────────
    org: Org = Relationship(back_populates="monthly_reports")

    # ── Indexes ──────────────────────────────────────────────
    __table_args__ = (
        Index("ix_reports_org_period", "org_id", "report_year", "report_month"),
        Index("ix_reports_status", "status"),
    )

    @property
    def total_estimated_revenue_inr(self) -> float:
        """Return estimated revenue in INR."""
        return self.total_estimated_revenue_paise / 100

    @property
    def avg_project_value_inr(self) -> float | None:
        """Return average project value in INR."""
        if self.avg_project_value_paise is not None:
            return self.avg_project_value_paise / 100
        return None

    @property
    def period_label(self) -> str:
        """Return human-readable period label."""
        months = [
            "", "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ]
        return f"{months[self.report_month]} {self.report_year}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "org_id": self.org_id,
            "period": self.period_label,
            "leads_total": self.leads_total,
            "leads_won": self.leads_won,
            "leads_conversion_rate": self.leads_conversion_rate,
            "total_estimated_revenue_inr": self.total_estimated_revenue_inr,
            "gbp_total_views": self.gbp_total_views,
            "gbp_calls": self.gbp_calls,
            "reviews_new": self.reviews_new,
            "avg_rating": self.avg_rating_at_end,
            "status": self.status.value,
            "pdf_url": self.pdf_url,
        }
