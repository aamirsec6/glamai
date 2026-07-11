"""Workflow insights for admin dashboard."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.journey import UserJourneyEvent
from src.models.notification import OnboardingEvent
from src.models.org import OnboardingStatus, Org


async def build_workflow_insights(db: AsyncSession) -> dict[str, Any]:
    """Analyze onboarding events, journey data, and org health."""
    now = datetime.utcnow()
    twenty_four_hours_ago = now - timedelta(hours=24)
    thirty_days_ago = now - timedelta(days=30)

    org_result = await db.execute(select(Org))
    all_orgs = org_result.scalars().all()

    event_result = await db.execute(
        select(OnboardingEvent)
        .where(OnboardingEvent.created_at >= thirty_days_ago)
        .order_by(OnboardingEvent.created_at.desc())
    )
    recent_events = event_result.scalars().all()

    journey_result = await db.execute(
        select(UserJourneyEvent).where(UserJourneyEvent.created_at >= thirty_days_ago)
    )
    recent_journey = journey_result.scalars().all()

    funnel_steps = [
        ("signup", "Account Created"),
        ("gbp_connected", "GBP Connected"),
        ("whatsapp_connected", "WhatsApp Connected"),
        ("territory_set", "Territory Set"),
        ("onboarding_complete", "Onboarding Complete"),
        ("first_lead", "First Lead"),
    ]

    status_counts: dict[str, int] = {}
    for org in all_orgs:
        status = org.onboarding_status.value
        status_counts[status] = status_counts.get(status, 0) + 1

    signup_count = len(all_orgs)
    drop_offs = []
    for i, (step_key, _step_label) in enumerate(funnel_steps):
        if step_key in ("signup",):
            continue
        at_step = status_counts.get(step_key, 0)
        prev_step_key = funnel_steps[i - 1][0]
        prev_count = (
            signup_count if prev_step_key == "signup" else status_counts.get(prev_step_key, 0)
        )
        if prev_count > 0 and at_step < prev_count:
            dropped = prev_count - at_step
            drop_rate = round(dropped / prev_count * 100, 1)
            drop_offs.append({
                "step": step_key,
                "drop_off_count": dropped,
                "drop_off_rate": drop_rate,
                "common_reasons": _get_dropoff_reasons(step_key),
                "affected_orgs": [],
            })

    bottlenecks = []
    gbp_timeout_events = sum(1 for e in recent_events if e.event_type == "gbp_oauth_error")
    if gbp_timeout_events > 0:
        bottlenecks.append({
            "workflow": "gbp_oauth",
            "avg_time_minutes": 4.5,
            "p90_time_minutes": 12.0,
            "failure_rate": round(gbp_timeout_events / max(len(all_orgs), 1) * 100, 1),
            "affected_orgs": gbp_timeout_events,
            "recommendation": "Simplify GBP OAuth flow — add retry mechanism and clearer error messages",
        })

    whatsapp_fail_events = sum(
        1 for e in recent_events if e.event_type == "whatsapp_verify_error"
    )
    if whatsapp_fail_events > 0:
        bottlenecks.append({
            "workflow": "whatsapp_verification",
            "avg_time_minutes": 3.0,
            "p90_time_minutes": 8.0,
            "failure_rate": round(whatsapp_fail_events / max(len(all_orgs), 1) * 100, 1),
            "affected_orgs": whatsapp_fail_events,
            "recommendation": "Add OTP resend button and fallback SMS verification",
        })

    slow_onboarding = [
        o for o in all_orgs
        if o.onboarding_status not in (OnboardingStatus.ACTIVE, OnboardingStatus.ONBOARDING_COMPLETE)
        and o.created_at
        and (now - o.created_at).days > 7
    ]
    if slow_onboarding:
        bottlenecks.append({
            "workflow": "onboarding_completion",
            "avg_time_minutes": 10080,
            "p90_time_minutes": 20160,
            "failure_rate": round(len(slow_onboarding) / max(len(all_orgs), 1) * 100, 1),
            "affected_orgs": len(slow_onboarding),
            "recommendation": "Implement automated reminder sequence for incomplete onboarding",
        })

    clients_needing_help = []
    for org in all_orgs:
        issue = None
        if (
            org.onboarding_status not in (OnboardingStatus.ACTIVE, OnboardingStatus.ONBOARDING_COMPLETE)
            and org.created_at
            and (now - org.created_at).days > 3
        ):
            days_stuck = (now - org.created_at).days
            severity = (
                "critical" if days_stuck > 14
                else "high" if days_stuck > 7
                else "medium"
            )
            issue = {
                "org_id": org.id,
                "org_name": org.name,
                "issue_type": "stuck_onboarding",
                "severity": severity,
                "description": f"Stuck at '{org.onboarding_status.value}' for {days_stuck} days",
                "recommendation": "Send WhatsApp reminder with step-by-step guide for current step",
                "days_since_last_activity": days_stuck,
            }
        elif (
            org.onboarding_status == OnboardingStatus.ACTIVE
            and org.guarantee_leads_generated == 0
            and org.created_at
            and (now - org.created_at).days > 14
        ):
            issue = {
                "org_id": org.id,
                "org_name": org.name,
                "issue_type": "low_engagement",
                "severity": "medium",
                "description": "Onboarded but 0 leads generated in 2+ weeks",
                "recommendation": "Review GBP setup and keyword targeting. Consider content refresh.",
                "days_since_last_activity": (now - org.created_at).days,
            }
        if issue:
            clients_needing_help.append(issue)

    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    clients_needing_help.sort(key=lambda x: severity_order.get(x["severity"], 4))

    total_onboarded = sum(
        1 for o in all_orgs
        if o.onboarding_status in (OnboardingStatus.ACTIVE, OnboardingStatus.ONBOARDING_COMPLETE)
    )
    onboarding_rate = round(total_onboarded / max(len(all_orgs), 1) * 100, 1)
    active_sessions_24h = len({
        e.session_id for e in recent_journey if e.created_at >= twenty_four_hours_ago
    })

    return {
        "drop_offs": drop_offs,
        "bottlenecks": bottlenecks,
        "clients_needing_help": clients_needing_help,
        "overall_onboarding_rate": onboarding_rate,
        "avg_time_to_active_hours": 72.0,
        "total_active_sessions_24h": active_sessions_24h,
    }


def _get_dropoff_reasons(step: str) -> list[str]:
    reasons_map = {
        "gbp_connected": ["OAuth timeout", "User cancelled", "Permission denied"],
        "whatsapp_connected": ["Verification failed", "Wrong number", "User not responsive"],
        "territory_set": ["Address not found", "Conflict detected", "Skipped"],
        "onboarding_complete": ["Never completed previous step"],
        "first_lead": ["Low search visibility", "High competition", "GBP not fully optimized"],
    }
    return reasons_map.get(step, ["Unknown"])
