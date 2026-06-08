"""Celery application configuration."""

from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from src.config import get_settings

settings = get_settings()

celery_app = Celery(
    "glamai",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "src.tasks.gbp_tasks",
        "src.tasks.report_tasks",
        "src.tasks.notification_tasks",
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
            "task": "src.tasks.gbp_tasks.publish_scheduled_posts",
            "schedule": crontab(minute="*/15"),  # Every 15 min
        },
        "generate-weekly-posts": {
            "task": "src.tasks.gbp_tasks.generate_weekly_posts",
            "schedule": crontab(day_of_week=1, hour=9, minute=0),  # Monday 9 AM
        },
        "sync-gbp-insights": {
            "task": "src.tasks.gbp_tasks.sync_gbp_insights",
            "schedule": crontab(hour=6, minute=0),  # Daily 6 AM IST
        },
        # ── Report Tasks ─────────────────────────────────────
        "generate-monthly-reports": {
            "task": "src.tasks.report_tasks.generate_monthly_reports",
            "schedule": crontab(day_of_month=1, hour=8, minute=0),  # 1st of month
        },
        # ── Notification Tasks ───────────────────────────────
        "check-onboarding-reminders": {
            "task": "src.tasks.notification_tasks.check_onboarding_reminders",
            "schedule": crontab(hour=10, minute=0),  # Daily 10 AM IST
        },
        "check-territory-conflicts": {
            "task": "src.tasks.notification_tasks.check_territory_conflicts",
            "schedule": crontab(hour=7, minute=0),  # Daily 7 AM IST
        },
    },
)


@celery_app.task(bind=True)
def debug_task(self):
    """Debug task to verify Celery is working."""
    return {"task_id": self.request.id, "status": "ok"}
