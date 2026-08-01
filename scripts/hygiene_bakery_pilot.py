#!/usr/bin/env python3
"""End-to-end hygiene check for a bakery pilot before real-client onboard.

Creates a temporary bakery org, walks onboarding → growth → admin audit,
then deletes the hygiene org so the DB is clean for the friend's bakery.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import httpx

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import _async_session_factory
from src.models.integration import IntegrationProvider, OrgIntegration
from src.models.org import BusinessCategory, OnboardingStatus, Org
from src.services.demo.seed import _purge_org

API = "http://127.0.0.1:8000"
HYGIENE_SLUG_PREFIX = "hygiene-bakery-"

# Indiranagar, Bangalore
LAT = 12.9784
LNG = 77.6408


class Check:
    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0
        self.notes: list[str] = []

    def ok(self, name: str, detail: str = "") -> None:
        self.passed += 1
        print(f"  ✅ {name}" + (f" — {detail}" if detail else ""))

    def fail(self, name: str, detail: str = "") -> None:
        self.failed += 1
        print(f"  ❌ {name}" + (f" — {detail}" if detail else ""))

    def note(self, msg: str) -> None:
        self.notes.append(msg)
        print(f"  ℹ️  {msg}")


async def ensure_bakery_enum(session: AsyncSession, check: Check) -> None:
    exists = (
        await session.execute(
            text(
                """
                select 1 from pg_enum e
                join pg_type t on t.oid = e.enumtypid
                where t.typname = 'businesscategory' and e.enumlabel = 'BAKERY'
                """
            )
        )
    ).scalar()
    if not exists:
        await session.execute(text("ALTER TYPE businesscategory ADD VALUE IF NOT EXISTS 'BAKERY'"))
        await session.commit()
        check.ok("DB enum: added BAKERY")
    else:
        check.ok("DB enum includes BAKERY")


async def assert_db_clean(session: AsyncSession, check: Check) -> None:
    n = (await session.execute(text("select count(*) from orgs"))).scalar() or 0
    if n == 0:
        check.ok("DB empty of orgs")
    else:
        rows = (
            await session.execute(text("select slug, name from orgs order by created_at"))
        ).fetchall()
        check.fail("DB not empty", f"{n} orgs: {[r[0] for r in rows]}")


async def simulate_gbp(session: AsyncSession, org_id: str) -> None:
    org = await session.get(Org, org_id)
    assert org
    org.gbp_place_id = f"accounts/hygiene/locations/{uuid4().hex[:12]}"
    org.gbp_name = org.name
    org.gbp_status = "CONNECTED"
    org.onboarding_status = OnboardingStatus.GBP_CONNECTED
    org.gbp_last_synced_at = datetime.utcnow()
    org.updated_at = datetime.utcnow()
    session.add(org)
    session.add(
        OrgIntegration(
            org_id=org_id,
            provider=IntegrationProvider.GOOGLE_GBP,
            access_token_encrypted="hygiene-placeholder",
            metadata_json=json.dumps({"hygiene": True}),
        )
    )
    from src.models.notification import OnboardingEvent

    session.add(
        OnboardingEvent(
            org_id=org_id,
            event_type="gbp_connected",
            event_data=json.dumps({"hygiene": True, "simulated": True}),
        )
    )
    await session.commit()


async def delete_hygiene_orgs(session: AsyncSession) -> int:
    rows = (
        await session.execute(select(Org).where(Org.slug.startswith(HYGIENE_SLUG_PREFIX)))
    ).scalars().all()
    for org in rows:
        await _purge_org(session, org.id)
        await session.delete(org)
    await session.commit()
    return len(rows)


async def run(*, keep: bool, skip_growth: bool) -> int:
    check = Check()
    print("\n=== 1. Preflight ===")
    async with _async_session_factory() as session:
        await ensure_bakery_enum(session, check)
        await assert_db_clean(session, check)
        removed = await delete_hygiene_orgs(session)
        if removed:
            check.note(f"Removed {removed} leftover hygiene org(s)")

    # Redis
    try:
        import redis.asyncio as aioredis
        from src.core.config import get_settings

        client = aioredis.from_url(get_settings().redis_url, decode_responses=True)
        pong = await client.ping()
        await client.aclose()
        if pong:
            check.ok("Redis reachable")
        else:
            check.fail("Redis ping failed")
    except Exception as e:
        check.fail("Redis unreachable", str(e))
        check.note("Start with: brew services start redis")

    # API up
    async with httpx.AsyncClient(base_url=API, timeout=120.0) as client:
        try:
            r = await client.get("/docs")
            check.ok("API up", f"HTTP {r.status_code}") if r.status_code == 200 else check.fail(
                "API up", f"HTTP {r.status_code}"
            )
        except Exception as e:
            check.fail("API up", str(e))
            print("\nAborting — start API with make dev")
            return 1

        print("\n=== 2. Bakery onboarding workflow ===")
        create = await client.post(
            "/api/v1/orgs/",
            json={
                "name": "Hygiene Bakery Pilot",
                "category": "bakery",
                "email": "hygiene+bakery@qimma.test",
                "phone": "919999000001",
                "address": "100 Feet Road, Indiranagar",
                "city": "Bangalore",
                "state": "Karnataka",
                "pincode": "560038",
                "website": "https://hygiene-bakery.example.com",
            },
        )
        if create.status_code != 201:
            check.fail("Create bakery org", create.text[:200])
            return 1
        org = create.json()["data"]
        org_id = org["id"]
        # Force hygiene slug prefix for cleanup
        async with _async_session_factory() as session:
            row = await session.get(Org, org_id)
            assert row
            row.slug = f"{HYGIENE_SLUG_PREFIX}{uuid4().hex[:8]}"
            row.category = BusinessCategory.BAKERY
            await session.commit()
        check.ok("Create bakery org", org_id)

        headers = {"X-Org-Id": org_id}

        # Simulated GBP (real OAuth is for friend's bakery)
        async with _async_session_factory() as session:
            await simulate_gbp(session, org_id)
        check.ok("Simulate GBP connect (hygiene only)")

        # Territory claim (skip live geocode — no Places key required)
        claim = await client.post(
            "/api/v1/territory/claim",
            headers=headers,
            json={
                "org_id": org_id,
                "latitude": LAT,
                "longitude": LNG,
                "city": "Bangalore",
                "category": "bakery",
                "radius_km": 5,
                "address": "100 Feet Road, Indiranagar, Bangalore",
            },
        )
        if claim.status_code != 200:
            check.fail("Claim territory", claim.text[:300])
        else:
            kws = claim.json()["data"].get("assigned_keywords") or []
            check.ok("Claim territory", f"{len(kws)} bakery keywords")
            if any("bakery" in str(k).lower() or "cake" in str(k).lower() for k in kws):
                check.ok("Bakery keyword niches assigned")
            else:
                check.fail("Bakery keyword niches", str(kws)[:200])

        # Advance status like the wizard
        patch = await client.patch(
            f"/api/v1/orgs/{org_id}",
            headers=headers,
            json={"onboarding_status": "territory_set"},
        )
        if patch.status_code == 200:
            check.ok("Status → territory_set")
        else:
            check.fail("Status → territory_set", patch.text[:200])

        # Skip WhatsApp → complete
        done = await client.post(
            f"/api/v1/orgs/{org_id}/complete-onboarding",
            headers=headers,
        )
        if done.status_code == 200:
            status = done.json()["data"].get("onboarding_status")
            check.ok("Complete onboarding", status)
        else:
            check.fail("Complete onboarding", done.text[:300])

        # Frontend journey track
        track = await client.post(
            "/api/v1/track",
            json={
                "org_id": org_id,
                "event_type": "page_view",
                "event_name": "hygiene_onboarding_complete",
                "page": "/client/onboarding",
                "session_id": f"hygiene-{uuid4().hex[:8]}",
            },
        )
        if track.status_code in (200, 201, 204):
            check.ok("Journey track event recorded")
        else:
            check.fail("Journey track", f"{track.status_code} {track.text[:160]}")

        print("\n=== 3. Growth pipeline ===")
        if skip_growth:
            check.note("Skipped growth (--skip-growth)")
        else:
            growth = await client.post(
                "/api/v1/agents/growth/run",
                headers=headers,
                json={"org_id": org_id, "execute_seo_actions": True},
            )
            if growth.status_code != 200:
                check.fail("Growth run", f"{growth.status_code} {growth.text[:300]}")
            else:
                data = growth.json().get("data") or {}
                summary = data.get("summary") or {}
                errors = data.get("errors") or []
                check.ok(
                    "Growth run HTTP 200",
                    f"posts={summary.get('posts_created')} keywords={summary.get('keywords_assigned')}",
                )
                if errors:
                    check.fail("Growth zero errors", "; ".join(str(e).split("\n")[0][:80] for e in errors[:3]))
                else:
                    check.ok("Growth zero errors")
                if (summary.get("posts_created") or 0) >= 1:
                    check.ok("Spark created posts")
                else:
                    check.fail("Spark created posts", str(summary))

            last = await client.get(
                f"/api/v1/agents/growth/last-run?org_id={org_id}",
                headers=headers,
            )
            if last.status_code == 200 and last.json().get("data"):
                check.ok("Last-run store readable")
            else:
                check.fail("Last-run store", last.text[:200])

            score = await client.get(
                f"/api/v1/agents/seo/scorecard?org_id={org_id}",
                headers=headers,
            )
            if score.status_code == 200:
                check.ok("SEO scorecard", score.json().get("data", {}).get("tracking_status", ""))
            else:
                check.fail("SEO scorecard", score.text[:200])

        print("\n=== 4. Admin audit visibility ===")
        activity = await client.get(f"/api/v1/admin/orgs/{org_id}/activity")
        if activity.status_code != 200:
            check.fail("Admin activity feed", activity.text[:200])
        else:
            payload = activity.json().get("data") or {}
            events = payload.get("events") or []
            types = [e.get("type") for e in events]
            check.ok("Admin activity feed", f"{len(events)} events")
            for required in ("signup", "gbp_connected", "onboarding_complete"):
                if required in types:
                    check.ok(f"Audit has `{required}`")
                else:
                    check.fail(f"Audit has `{required}`", f"got {types}")
            if skip_growth:
                check.note("growth audit skipped")
            elif "growth_pipeline_run" in types:
                check.ok("Audit has `growth_pipeline_run`")
            else:
                check.fail("Audit has `growth_pipeline_run`", f"got {types}")
            if "territory_claimed" in types or "territory_set" in types:
                check.ok("Audit has territory event")
            else:
                check.fail("Audit has territory event", f"got {types}")

        journey = await client.get(f"/api/v1/admin/orgs/{org_id}/journey")
        if journey.status_code == 200:
            sessions = journey.json().get("data") or []
            if sessions:
                check.ok("Admin journey sessions", f"{len(sessions)} session(s)")
            else:
                check.fail("Admin journey sessions", "empty")
        else:
            check.fail("Admin journey", journey.text[:200])

        pilot = await client.get("/api/v1/admin/pilot-status")
        if pilot.status_code == 200:
            orgs = (pilot.json().get("data") or {}).get("orgs") or []
            match = [o for o in orgs if o.get("org_id") == org_id]
            if match:
                check.ok("Pilot dashboard lists bakery", match[0].get("pilot_status"))
            else:
                check.fail("Pilot dashboard lists bakery", f"{len(orgs)} orgs")
        else:
            check.fail("Pilot status", pilot.text[:200])

        admin_orgs = await client.get("/api/v1/admin/orgs")
        if admin_orgs.status_code == 200:
            total = (admin_orgs.json().get("pagination") or {}).get("total", 0)
            check.ok("Admin orgs list", f"total={total}")
        else:
            check.fail("Admin orgs list", admin_orgs.text[:200])

        dash = await client.get(f"/api/v1/orgs/{org_id}/dashboard", headers=headers)
        if dash.status_code == 200:
            check.ok("Client dashboard API")
        else:
            check.fail("Client dashboard API", dash.text[:200])

    print("\n=== 5. Cleanup ===")
    if keep:
        check.note(f"Kept hygiene org {org_id} (--keep)")
    else:
        async with _async_session_factory() as session:
            n = await delete_hygiene_orgs(session)
            check.ok("Hygiene org purged", f"removed={n}")
            await assert_db_clean(session, check)

    print("\n=== Result ===")
    print(f"Passed: {check.passed}  Failed: {check.failed}")
    for n in check.notes:
        print(f"Note: {n}")
    if check.failed:
        print("\nHygiene FAILED — fix before onboarding the bakery.")
        return 1
    print("\nHygiene PASSED — DB is clean. Onboard the bakery at /client/onboarding")
    print("  • Category: Bakery")
    print("  • Connect their real GBP via Google OAuth")
    print("  • Clear browser localStorage key glamai_org_id if an old org still loads")
    print("  • Watch them in Admin → Pilot + client Activity")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bakery pilot hygiene check")
    parser.add_argument("--keep", action="store_true", help="Keep hygiene org after run")
    parser.add_argument("--skip-growth", action="store_true", help="Skip LLM growth pipeline")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(run(keep=args.keep, skip_growth=args.skip_growth)))
