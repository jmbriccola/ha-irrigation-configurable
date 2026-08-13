"""Notification routing with per-event configuration and aggregation (§4).

Each event type has a toggle, a list of ``notify.*`` targets and a priority.
Skips sharing a reason within one session are always aggregated into a single
message by the callers (see SessionRunner) — never one notification per zone.
"""

from __future__ import annotations

import logging
from collections.abc import Callable, Collection, Mapping
from dataclasses import dataclass
from typing import Any, Final

from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir

from .const import CONF_NOTIFY_ENABLED, CONF_NOTIFY_PRIORITY, CONF_NOTIFY_SERVICES, DOMAIN

_LOGGER = logging.getLogger(__name__)

PRIORITY_HIGH: Final = "high"
PRIORITY_NORMAL: Final = "normal"

EVENT_COMPLETED: Final = "completed"
EVENT_SKIPPED: Final = "skipped"
EVENT_INTERRUPTED: Final = "interrupted"
EVENT_CANCELLED: Final = "cancelled"
EVENT_ANOMALY: Final = "anomaly"
EVENT_WATCHDOG: Final = "watchdog"
EVENT_SENTINEL: Final = "sentinel"
EVENT_SESSION_OVERRUN: Final = "session_overrun"
EVENT_CONSUMPTION_BUDGET: Final = "consumption_budget"

#: Presentation only: the three severity groups the wizard browses by.
GROUP_CRITICAL: Final = (EVENT_WATCHDOG, EVENT_ANOMALY)
GROUP_OPERATIONAL: Final = (EVENT_SKIPPED, EVENT_INTERRUPTED, EVENT_CANCELLED)
GROUP_INFORMATIONAL: Final = (
    EVENT_COMPLETED,
    EVENT_SENTINEL,
    EVENT_SESSION_OVERRUN,
    EVENT_CONSUMPTION_BUDGET,
)
EVENT_GROUPS: Final[dict[str, tuple[str, ...]]] = {
    "critical": GROUP_CRITICAL,
    "operational": GROUP_OPERATIONAL,
    "informational": GROUP_INFORMATIONAL,
}
ALL_EVENTS: Final = GROUP_CRITICAL + GROUP_OPERATIONAL + GROUP_INFORMATIONAL

#: The events that must reach the user. Deliberately NOT one of the display
#: groups: it spans all three. One set with four consumers -- the defaults the
#: wizard proposes, the events whose default priority is high, the events whose
#: vanished recipient raises a repair issue, and the definition of "mute".
ESSENTIAL_EVENTS: Final = frozenset(
    {EVENT_WATCHDOG, EVENT_ANOMALY, EVENT_SENTINEL, EVENT_INTERRUPTED}
)

_GROUP_OF: Final = {event: group for group, events in EVENT_GROUPS.items() for event in events}


def normalize_service(raw: str) -> str:
    """The bare notify service name, however the user wrote it.

    ``Notifier`` calls ``notify.<service>``, so a stored "notify.phone" is
    invoked as ``notify.notify.phone`` and silently never arrives. Normalising
    on read as well as on write repairs configurations already stored that way
    without a migration.
    """
    return raw.strip().removeprefix("notify.")


def default_priority(event_key: str) -> str:
    """High for the events that must arrive, normal for the rest."""
    return PRIORITY_HIGH if event_key in ESSENTIAL_EVENTS else PRIORITY_NORMAL


@dataclass(frozen=True, slots=True)
class EventStatus:
    """What one event will actually do."""

    event: str
    group: str
    enabled: bool
    services: tuple[str, ...]
    missing: tuple[str, ...]
    priority: str
    essential: bool

    @property
    def reachable(self) -> bool:
        """Enabled AND at least one recipient that still exists."""
        return self.enabled and bool(set(self.services) - set(self.missing))

    def as_dict(self) -> dict[str, Any]:
        return {
            "event": self.event,
            "group": self.group,
            "enabled": self.enabled,
            "services": list(self.services),
            "missing": list(self.missing),
            "priority": self.priority,
            "essential": self.essential,
            "reachable": self.reachable,
        }


@dataclass(frozen=True, slots=True)
class NotificationStatus:
    """The one verdict Repairs, diagnostics, the service and the panel share."""

    verdict: str  # "ok" | "partial" | "silent"
    per_event: dict[str, EventStatus]
    enabled_without_target: tuple[str, ...]
    unreachable: dict[str, tuple[str, ...]]

    def as_dict(self) -> dict[str, Any]:
        return {
            "verdict": self.verdict,
            "groups": {group: list(events) for group, events in EVENT_GROUPS.items()},
            "recommended": sorted(ESSENTIAL_EVENTS),
            "enabled_without_target": list(self.enabled_without_target),
            "unreachable": {name: list(events) for name, events in self.unreachable.items()},
            "events": [self.per_event[event].as_dict() for event in ALL_EVENTS],
        }


def evaluate_notifications(
    config: Mapping[str, Any], known_services: Collection[str] | None = None
) -> NotificationStatus:
    """Describe what the current configuration will and will not deliver.

    ``known_services`` is optional on purpose. At setup time other integrations
    may not have registered their notify services yet, and calling a recipient
    missing then would be a false alarm; passing None asserts nothing about
    existence and only judges the configuration itself.
    """
    per_event: dict[str, EventStatus] = {}
    enabled_without_target: list[str] = []
    unreachable: dict[str, list[str]] = {}

    for event in ALL_EVENTS:
        raw = config.get(event) or {}
        enabled = bool(raw.get(CONF_NOTIFY_ENABLED, False))
        services = tuple(
            dict.fromkeys(
                normalize_service(str(name)) for name in raw.get(CONF_NOTIFY_SERVICES, [])
            )
        )
        if known_services is None:
            missing: tuple[str, ...] = ()
        else:
            missing = tuple(name for name in services if name not in known_services)
        essential = event in ESSENTIAL_EVENTS
        per_event[event] = EventStatus(
            event=event,
            group=_GROUP_OF[event],
            enabled=enabled,
            services=services,
            missing=missing,
            priority=str(raw.get(CONF_NOTIFY_PRIORITY, default_priority(event))),
            essential=essential,
        )
        if enabled and not services:
            enabled_without_target.append(event)
        if enabled and essential:
            for name in missing:
                unreachable.setdefault(name, []).append(event)

    covered = sum(1 for event in ESSENTIAL_EVENTS if per_event[event].reachable)
    if covered == 0:
        verdict = "silent"
    elif covered == len(ESSENTIAL_EVENTS):
        verdict = "ok"
    else:
        verdict = "partial"

    return NotificationStatus(
        verdict=verdict,
        per_event=per_event,
        enabled_without_target=tuple(enabled_without_target),
        unreachable={name: tuple(sorted(events)) for name, events in unreachable.items()},
    )


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
        priority = force_priority or config.get(CONF_NOTIFY_PRIORITY) or default_priority(event_key)
        data: dict[str, Any] = {"title": title, "message": message}
        if priority == PRIORITY_HIGH:
            # Best-effort urgency hints (understood by mobile_app targets).
            data["data"] = {
                "tag": f"irrigation_maestro_{event_key}",
                "importance": "high",
                "priority": "high",
                "ttl": 0,
            }
        essential = event_key in ESSENTIAL_EVENTS
        for raw in config.get(CONF_NOTIFY_SERVICES, []):
            # Normalised on read as well as on write: a configuration stored
            # before the wizard may carry the "notify." prefix the old field's
            # placeholder taught, which would be invoked as notify.notify.x.
            service = normalize_service(str(raw))
            # Services are validated at send time: the target may have been
            # removed since it was configured (§4).
            if not self._hass.services.has_service("notify", service):
                _LOGGER.warning("Notify service notify.%s no longer exists; skipping", service)
                if essential:
                    # A log line is not enough for the events that exist to
                    # report that something went wrong.
                    ir.async_create_issue(
                        self._hass,
                        DOMAIN,
                        f"notify_target_missing_{service}",
                        is_fixable=False,
                        severity=ir.IssueSeverity.ERROR,
                        translation_key="notify_target_missing",
                        translation_placeholders={"service": service, "event": event_key},
                    )
                continue
            try:
                await self._hass.services.async_call("notify", service, data, blocking=False)
            except Exception:
                _LOGGER.exception("Failed to send notification via notify.%s", service)
            else:
                ir.async_delete_issue(self._hass, DOMAIN, f"notify_target_missing_{service}")
