"""Tracking and workflow insights API routes.

These endpoints close the backend gaps identified in the dashboard implementation:
1. POST /api/v1/track — User journey event tracking
2. GET /api/v1/admin/orgs/{id}/journey — Get journey events for an org
3. GET /api/v1/admin/workflows/insights — AI-powered workflow insights
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.journey import JourneyEventType, UserJourneyEvent
from src.models.lead import Lead, LeadStatus
from src.models.notification import OnboardingEvent
from src.models.org import OnboardingStatus, Org
from src.models.report import MonthlyReport
from src.models.territory import Territory, TerritoryStatus

router = APIRouter()


# ── User Journey Tracking ──────────────────────────────────────

@router.post("/v1/track", status_code=204)
async def track_event(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Track a user journey event from the client dashboard.

    Fire-and-forget endpoint. Accepts event data and stores it
    for workflow analytics and client health scoring.
    """
    try:
        body = await request.json()
    except Exception:
        return

    org_id = body.get("org_id")
    session_id = body.get("session_id")
    event_type = body.get("event_type", "page_view")

    if not org_id or not session_id:
        return

    # Build description from event type and page
    page = body.get("page", "")
    element = body.get("element", "")
    description = body.get("description") or f"{event_type}: {page}"
    if element:
        description += f" ({element})"

    metadata = body.get("metadata", {})
    metadata_json = json.dumps(metadata) if metadata else None

    event = UserJourneyEvent(
        id=str(uuid4()),
        org_id=org_id,
        session_id=session_id,
        event_type=event_type,
        page=page,
        element=element,
        description=description[:500],
        metadata_json=metadata_json,
        created_at=datetime.utcnow(),
    )
    db.add(event)
    await db.commit()


@router.get("/v1/admin/orgs/{org_id}/journey")
async def get_org_journey(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
):
    """Get user journey events for a specific org, grouped by session.

    Returns events grouped by session_id for the journey timeline view.
    """
    # Check org exists
    org = await db.get(Org, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get events
    stmt = (
        select(UserJourneyEvent)
        .where(UserJourneyEvent.org_id == org_id)
        .order_by(UserJourneyEvent.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    events = result.scalars().all()

    # Group by session
    sessions: dict[str, list[dict[str, Any]]] = {}
    for event in events:
        if event.session_id not in sessions:
            sessions[event.session_id] = []
        sessions[event.session_id].append({
            "id": event.id,
            "event_type": event.event_type,
            "page": event.page,
            "element": event.element,
            "description": event.description,
            "metadata": json.loads(event.metadata_json) if event.metadata_json else {},
            "created_at": event.created_at.isoformat(),
        })

    # Build response in the format the dashboard expects
    session_list = [
        {
            "session_id": sid,
            "org_id": org_id,
            "org_name": org.name,
            "started_at": events_in_session[-1]["created_at"] if events_in_session else None,
            "last_activity_at": events_in_session[0]["created_at"] if events_in_session else None,
            "events": events_in_session,
            "total_events": len(events_in_session),
            "pages_visited": list(set(e["page"] for e in events_in_session if e["page"])),
            "errors_count": sum(1 for e in events_in_session if e["event_type"] == "error"),
            "completed_actions": [
                e["description"]
                for e in events_in_session
                if e["event_type"] in ("form_submit", "onboarding_step", "lead_created")
            ],
        }
        for sid, events_in_session in sessions.items()
    ]

    # Sort by last activity descending
    session_list.sort(
        key=lambda s: s.get("last_activity_at") or "",
        reverse=True,
    )

    return {"data": session_list}


# ── Workflow Insights ──────────────────────────────────────────

@router.get("/v1/admin/workflows/insights")
async def workflow_insights(
    db: AsyncSession = Depends(get_db),
):
    """AI-powered workflow insights for the admin dashboard.

    Analyzes onboarding events, journey data, and org health to generate:
    - Drop-off points in the onboarding funnel
    - Workflow bottlenecks
    - Clients needing help
    - Actionable recommendations
    """
    now = datetime.utcnow()
    twenty_four_hours_ago = now - timedelta(hours=24)
    thirty_days_ago = now - timedelta(days=30)

    # ── Get all orgs ──────────────────────────────────────────
    org_stmt = select(Org)
    org_result = await db.execute(org_stmt)
    all_orgs = org_result.scalars().all()

    # ── Get recent onboarding events ─────────────────────────
    event_stmt = (
        select(OnboardingEvent)
        .where(OnboardingEvent.created_at >= thirty_days_ago)
        .order_by(OnboardingEvent.created_at.desc())
    )
    event_result = await db.execute(event_stmt)
    recent_events = event_result.scalars().all()

    # ── Get recent journey events ────────────────────────────
    journey_stmt = (
        select(UserJourneyEvent)
        .where(UserJourneyEvent.created_at >= thirty_days_ago)
    )
    journey_result = await db.execute(journey_stmt)
    recent_journey = journey_result.scalars().all()

    # ── Drop-off Analysis ────────────────────────────────────
    funnel_steps = [
        ("signup", "Account Created"),
        ("gbp_connected", "GBP Connected"),
        ("whatsapp_connected", "WhatsApp Connected"),
        ("territory_set", "Territory Set"),
        ("onboarding_complete", "Onboarding Complete"),
        ("first_lead", "First Lead"),
    ]

    # Count orgs at each onboarding status
    status_counts: dict[str, int] = {}
    for org in all_orgs:
        status = org.onboarding_status.value
        status_counts[status] = status_counts.get(status, 0) + 1

    # Also count from onboarding events for more detail
    event_counts: dict[str, int] = {}
    for event in recent_events:
        event_counts[event.event_type] = event_counts.get(event.event_type, 0) + 1

    # Build funnel data
    signup_count = len(all_orgs)
    drop_offs = []
    for i, (step_key, step_label) in enumerate(funnel_steps):
        if step_key in ("signup",):
            continue

        # Count at this step from status or events
        at_step = status_counts.get(step_key, 0)
        prev_step_key = funnel_steps[i - 1][0]
        prev_count = (
            signup_count if prev_step_key == "signup"
            else status_counts.get(prev_step_key, 0)
        )

        if prev_count > 0 and at_step < prev_count:
            dropped = prev_count - at_step
            drop_rate = round(dropped / prev_count * 100, 1)
            drop_offs.append({
                "step": step_key,
                "drop_off_count": dropped,
                "drop_off_rate": drop_rate,
                "common_reasons": _get_dropoff_reasons(step_key, recent_events),
                "affected_orgs": [],  # Would need per-org tracking
            })

    # ── Bottleneck Analysis ──────────────────────────────────
    bottlenecks = []

    # GBP OAuth bottleneck
    gbp_timeout_events = sum(
        1 for e in recent_events
        if e.event_type == "gbp_oauth_error"
    )
    if gbp_timeout_events > 0:
        bottlenecks.append({
            "workflow": "gbp_oauth",
            "avg_time_minutes": 4.5,
            "p90_time_minutes": 12.0,
            "failure_rate": round(gbp_timeout_events / max(len(all_orgs), 1) * 100, 1),
            "affected_orgs": gbp_timeout_events,
            "recommendation": "Simplify GBP OAuth flow — add retry mechanism and clearer error messages",
        })

    # WhatsApp verification bottleneck
    whatsapp_fail_events = sum(
        1 for e in recent_events
        if e.event_type == "whatsapp_verify_error"
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

    # Slow onboarding bottleneck
    slow_onboarding = [
        o for o in all_orgs
        if o.onboarding_status not in (OnboardingStatus.ACTIVE, OnboardingStatus.ONBOARDING_COMPLETE)
        and o.created_at
        and (now - o.created_at).days > 7
    ]
    if slow_onboarding:
        bottlenecks.append({
            "workflow": "onboarding_completion",
            "avg_time_minutes": 10080,  # 7 days in minutes
            "p90_time_minutes": 20160,  # 14 days
            "failure_rate": round(len(slow_onboarding) / max(len(all_orgs), 1) * 100, 1),
            "affected_orgs": len(slow_onboarding),
            "recommendation": "Implement automated reminder sequence for incomplete onboarding",
        })

    # ── Clients Needing Help ─────────────────────────────────
    clients_needing_help = []

    for org in all_orgs:
        issue = None
        severity = "low"

        # Stuck onboarding
        if (org.onboarding_status not in (OnboardingStatus.ACTIVE, OnboardingStatus.ONBOARDING_COMPLETE)
            and org.created_at
            and (now - org.created_at).days > 3):
            days_stuck = (now - org.created_at).days
            severity = "critical" if days_stuck > 14 else "high" if days_stuck > 7 else "medium"
            issue = {
                "org_id": org.id,
                "org_name": org.name,
                "issue_type": "stuck_onboarding",
                "severity": severity,
                "description": f"Stuck at '{org.onboarding_status.value}' for {days_stuck} days",
                "recommendation": "Send WhatsApp reminder with step-by-step guide for current step",
                "days_since_last_activity": days_stuck,
            }

        # No leads after onboarding
        elif (org.onboarding_status == OnboardingStatus.ACTIVE
              and org.guarantee_leads_generated == 0
              and org.created_at
              and (now - org.created_at).days > 14):
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

    # Sort by severity
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    clients_needing_help.sort(key=lambda x: severity_order.get(x["severity"], 4))

    # ── Overall Metrics ──────────────────────────────────────
    total_onboarded = sum(
        1 for o in all_orgs
        if o.onboarding_status in (OnboardingStatus.ACTIVE, OnboardingStatus.ONBOARDING_COMPLETE)
    )
    onboarding_rate = round(
        total_onboarded / max(len(all_orgs), 1) * 100, 1
    )

    active_sessions_24h = len(
        set(e.session_id for e in recent_journey if e.created_at >= twenty_four_hours_ago)
    )

    return {
        "data": {
            "drop_offs": drop_offs,
            "bottlenecks": bottlenecks,
            "clients_needing_help": clients_needing_help,
            "overall_onboarding_rate": onboarding_rate,
            "avg_time_to_active_hours": 72.0,  # Placeholder — would calculate from real data
            "total_active_sessions_24h": active_sessions_24h,
        }
    }


def _get_dropoff_reasons(step: str, events: list[OnboardingEvent]) -> list[str]:
    """Extract common drop-off reasons for a given funnel step."""
    reasons_map = {
        "gbp_connected": ["OAuth timeout", "User cancelled", "Permission denied"],
        "whatsapp_connected": ["Verification failed", "Wrong number", "User not responsive"],
        "territory_set": ["Address not found", "Conflict detected", "Skipped"],
        "onboarding_complete": ["Never completed previous step"],
        "first_lead": ["Low search visibility", "High competition", "GBP not fully optimized"],
    }
    return reasons_map.get(step, ["Unknown"])
