"""Celery application configuration."""

from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from src.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "glamai",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "src.workers.gbp_tasks",
        "src.workers.report_tasks",
        "src.workers.notification_tasks",
        "src.workers.marketing_tasks",
        "src.workers.review_tasks",
        "src.workers.agent_tasks",
        "src.workers.seo_tasks",
        "src.workers.geo_tasks",
        "src.workers.growth_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 min max per task
    worker_max_tasks_per_child=1000,
    # Beat schedule
    beat_schedule={
        # ── GBP Tasks ────────────────────────────────────────
        "publish-scheduled-posts": {
            "task": "src.workers.gbp_tasks.publish_scheduled_posts",
            "schedule": crontab(minute="*/15"),  # Every 15 min
        },
        # Weekly GBP post generation is owned by Growth (geo → SEO → content).
        # Kept off the Monday beat to avoid double-posting with growth content.

        "sync-gbp-insights": {
            "task": "src.workers.gbp_tasks.sync_gbp_insights",
            "schedule": crontab(hour=6, minute=0),
        },
        "sync-gbp-competitors": {
            "task": "src.workers.gbp_tasks.sync_gbp_competitors",
            "schedule": crontab(hour=6, minute=30),
        },
        "refresh-gbp-tokens": {
            "task": "src.workers.gbp_tasks.refresh_expiring_gbp_tokens",
            "schedule": crontab(hour=5, minute=0),
        },
        # ── Report Tasks ─────────────────────────────────────
        "generate-monthly-reports": {
            "task": "src.workers.report_tasks.generate_monthly_reports",
            "schedule": crontab(day_of_month=1, hour=8, minute=0),  # 1st of month
        },
        # ── Notification Tasks ───────────────────────────────
        "check-onboarding-reminders": {
            "task": "src.workers.notification_tasks.check_onboarding_reminders",
            "schedule": crontab(hour=10, minute=0),  # Daily 10 AM IST
        },
        "check-territory-conflicts": {
            "task": "src.workers.notification_tasks.check_territory_conflicts",
            "schedule": crontab(hour=7, minute=0),
        },
        # ── Review Engine ────────────────────────────────────
        "sync-all-gbp-reviews": {
            "task": "src.workers.review_tasks.sync_all_reviews",
            "schedule": crontab(hour=6, minute=15),
        },
        "auto-reply-gbp-reviews": {
            "task": "src.workers.review_tasks.auto_reply_all_reviews",
            "schedule": crontab(hour=6, minute=45),
        },
        # ── Marketing Agent ──────────────────────────────────
        "repeat-sale-campaigns": {
            "task": "src.workers.marketing_tasks.run_repeat_sale_campaigns",
            "schedule": crontab(day_of_week=1, hour=11, minute=0),
        },
        "stale-lead-reminders": {
            "task": "src.workers.marketing_tasks.run_stale_lead_reminders",
            "schedule": crontab(hour=11, minute=30),
        },
        # ── GBP Profile ──────────────────────────────────────
        "optimize-gbp-profiles": {
            "task": "src.workers.gbp_tasks.optimize_all_profiles",
            "schedule": crontab(day_of_week=2, hour=8, minute=0),
        },
        # ── Growth Stack (single Monday owner: geo → SEO → content → reviews) ──
        "run-weekly-growth-agents": {
            "task": "src.workers.growth_tasks.run_growth_agents_all_orgs",
            "schedule": crontab(day_of_week=1, hour=6, minute=30),
        },
        # Standalone SEO track / content / weekly GBP posts removed from Monday
        # beat — GrowthOrchestrator owns that work to prevent duplicate posts.

    },
)


@celery_app.task(bind=True)
def debug_task(self):
    """Debug task to verify Celery is working."""
    return {"task_id": self.request.id, "status": "ok"}
