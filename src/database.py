"""Backward-compatible re-export — use src.core.database instead."""

from src.core.database import get_db

__all__ = ["get_db"]
