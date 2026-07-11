"""Prioritized growth opportunities from all insight models."""

from __future__ import annotations

from src.analytics.insights.types import (
    BusinessOpportunity,
    CompetitiveInsights,
    ForecastInsights,
    GbpPerformanceInsights,
    LeadFunnelInsights,
    SeoHealthInsights,
)


class OpportunityScoringModel:
    """Rank actionable opportunities by impact and effort."""

    def score(
        self,
        *,
        funnel: LeadFunnelInsights,
        gbp: GbpPerformanceInsights,
        competitive: CompetitiveInsights,
        forecast: ForecastInsights,
        seo: SeoHealthInsights,
    ) -> list[BusinessOpportunity]:
        candidates: list[BusinessOpportunity] = []

        if funnel.drop_off_stage and funnel.drop_off_stage in ("quoted", "negotiation"):
            candidates.append(
                BusinessOpportunity(
                    id="fix-funnel-dropoff",
                    title=f"Reduce drop-off at {funnel.drop_off_stage} stage",
                    category="leads",
                    impact_score=88,
                    effort="medium",
                    expected_lift="+15–25% win rate",
                    rationale=(
                        f"Highest funnel leakage at '{funnel.drop_off_stage}'. "
                        "Add follow-up automation and quote reminders."
                    ),
                )
            )

        if funnel.overall_win_rate_pct < 20 and funnel.qualified_leads > 0:
            candidates.append(
                BusinessOpportunity(
                    id="improve-qualification",
                    title="Tighten lead qualification before quoting",
                    category="leads",
                    impact_score=75,
                    effort="low",
                    expected_lift="+10% conversion",
                    rationale=(
                        f"Win rate is {funnel.overall_win_rate_pct}% with "
                        f"{funnel.qualified_leads} qualified leads in pipeline."
                    ),
                )
            )

        best_source = max(
            funnel.source_attribution.items(),
            key=lambda x: x[1].get("win_rate_pct", 0),
            default=None,
        )
        if best_source and best_source[1].get("total", 0) >= 2:
            src, data = best_source
            candidates.append(
                BusinessOpportunity(
                    id="double-down-source",
                    title=f"Invest more in {src.replace('_', ' ')} leads",
                    category="acquisition",
                    impact_score=82,
                    effort="medium",
                    expected_lift=f"+{data['win_rate_pct']:.0f}% win rate channel",
                    rationale=(
                        f"{src} converts at {data['win_rate_pct']}% — "
                        "your best-performing acquisition channel."
                    ),
                )
            )

        if gbp.content_cadence_score < 75:
            candidates.append(
                BusinessOpportunity(
                    id="boost-content-cadence",
                    title="Publish more GBP posts this month",
                    category="content",
                    impact_score=80,
                    effort="low",
                    expected_lift="+18% GBP visibility",
                    rationale=(
                        f"Content cadence score is {gbp.content_cadence_score}/100. "
                        "Target 4 posts/month for local SEO lift."
                    ),
                )
            )

        if gbp.engagement_rate_pct < 5 and gbp.maps_share_pct > 0:
            candidates.append(
                BusinessOpportunity(
                    id="improve-gbp-cta",
                    title="Add stronger calls-to-action on GBP posts",
                    category="gbp",
                    impact_score=70,
                    effort="low",
                    expected_lift="+0.5–1% engagement rate",
                    rationale=(
                        f"Engagement rate is {gbp.engagement_rate_pct}% — "
                        "below the 5% benchmark for local services."
                    ),
                )
            )

        if competitive.review_gap is not None and competitive.review_gap < 0:
            candidates.append(
                BusinessOpportunity(
                    id="review-collection",
                    title="Accelerate review collection from happy clients",
                    category="reputation",
                    impact_score=85,
                    effort="medium",
                    expected_lift="+12% local pack visibility",
                    rationale=(
                        f"You have {abs(int(competitive.review_gap))} fewer reviews "
                        "than competitor average."
                    ),
                )
            )

        if seo.keyword_gaps:
            candidates.append(
                BusinessOpportunity(
                    id="close-keyword-gaps",
                    title="Target untracked high-intent keywords",
                    category="seo",
                    impact_score=78,
                    effort="medium",
                    expected_lift="+2–3 ranking positions",
                    rationale=f"Missing coverage for: {', '.join(seo.keyword_gaps[:3])}.",
                )
            )

        if forecast.growth_rate_pct is not None and forecast.growth_rate_pct < 0:
            candidates.append(
                BusinessOpportunity(
                    id="reverse-lead-decline",
                    title="Reverse declining lead volume",
                    category="growth",
                    impact_score=92,
                    effort="high",
                    expected_lift=f"Recover {abs(forecast.growth_rate_pct):.0f}% lead growth",
                    rationale=(
                        f"Lead volume dropped {abs(forecast.growth_rate_pct):.0f}% "
                        "vs prior period. Run campaigns and GBP refresh."
                    ),
                )
            )

        if competitive.competitive_position == "behind":
            candidates.append(
                BusinessOpportunity(
                    id="competitive-catch-up",
                    title="Close competitive gap in local pack",
                    category="competitive",
                    impact_score=86,
                    effort="high",
                    expected_lift="Move 2+ keywords into top 5",
                    rationale=(
                        "You're behind competitors on ratings and/or keyword rankings. "
                        "Prioritize reviews + keyword-targeted posts."
                    ),
                )
            )

        candidates.sort(key=lambda o: o.impact_score, reverse=True)
        return candidates[:6]
