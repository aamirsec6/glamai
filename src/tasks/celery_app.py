"""Backward-compatible re-export — use src.workers.celery_app instead."""

from src.workers.celery_app import celery_app

__all__ = ["celery_app"]
