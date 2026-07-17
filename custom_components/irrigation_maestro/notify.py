"""Notification routing with per-event configuration and aggregation (§4).

Each event type has a toggle, a list of ``notify.*`` targets and a priority.
Skips sharing a reason within one session are always aggregated into a single
message by the callers (see SessionRunner) — never one notification per zone.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any, Final

from homeassistant.core import HomeAssistant

from .const import CONF_NOTIFY_ENABLED, CONF_NOTIFY_PRIORITY, CONF_NOTIFY_SERVICES

_LOGGER = logging.getLogger(__name__)

PRIORITY_HIGH: Final = "high"

EVENT_COMPLETED: Final = "completed"
EVENT_SKIPPED: Final = "skipped"
EVENT_INTERRUPTED: Final = "interrupted"
EVENT_CANCELLED: Final = "cancelled"
EVENT_ANOMALY: Final = "anomaly"
EVENT_WATCHDOG: Final = "watchdog"
EVENT_SENTINEL: Final = "sentinel"
EVENT_SESSION_OVERRUN: Final = "session_overrun"
EVENT_CONSUMPTION_BUDGET: Final = "consumption_budget"


class Notifier:
    """Sends notifications according to the hub notification config."""

    def __init__(self, hass: HomeAssistant, config_getter: Callable[[], dict[str, Any]]) -> None:
        self._hass = hass
        self._config_getter = config_getter

    async def async_notify(
        self,
        event_key: str,
        *,
        title: str,
        message: str,
        force_priority: str | None = None,
    ) -> None:
        """Send one notification for an event, if configured."""
        config = self._config_getter().get(event_key, {})
        if not config.get(CONF_NOTIFY_ENABLED, False):
            return
        priority = force_priority or config.get(CONF_NOTIFY_PRIORITY, "normal")
        data: dict[str, Any] = {"title": title, "message": message}
        if priority == PRIORITY_HIGH:
            # Best-effort urgency hints (understood by mobile_app targets).
            data["data"] = {
                "tag": f"irrigation_maestro_{event_key}",
                "importance": "high",
                "priority": "high",
                "ttl": 0,
            }
        for service in config.get(CONF_NOTIFY_SERVICES, []):
            # Services are validated at send time: the target may have been
            # removed since it was configured (§4).
            if not self._hass.services.has_service("notify", service):
                _LOGGER.warning("Notify service notify.%s no longer exists; skipping", service)
                continue
            try:
                await self._hass.services.async_call("notify", service, data, blocking=False)
            except Exception:
                _LOGGER.exception("Failed to send notification via notify.%s", service)
