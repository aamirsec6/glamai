"""Plug-and-play data connectors for external services."""

from src.connectors.base import (
    ConnectorHealth,
    ConnectorProvider,
    ConnectorResource,
    ConnectorStatus,
    PullResult,
    PushResult,
)
from src.connectors.registry import ConnectorRegistry, get_connector

__all__ = [
    "ConnectorHealth",
    "ConnectorProvider",
    "ConnectorResource",
    "ConnectorStatus",
    "PullResult",
    "PushResult",
    "ConnectorRegistry",
    "get_connector",
]
