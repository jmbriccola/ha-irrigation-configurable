"""Diagnostics: the full config and runtime state, location keys redacted."""

from __future__ import annotations

from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.core import HomeAssistant

from . import IrrigationConfigEntry
from .const import CONF_NOTIFICATIONS, SUBENTRY_TYPE_ZONE
from .entity import INTEGRATION_VERSION
from .notify import evaluate_notifications

# Nothing stored today is location-sensitive; the set future-proofs against
# coordinates ever landing in options or state.
TO_REDACT = {"latitude", "longitude"}


def _water_daily_summary(runtime: Any) -> dict[str, Any]:
    """Day count, oldest/newest day and the current period total.

    The 730-day daily history is the one part of ``runtime_state`` too big for
    a diagnostics payload -- dumping it would bury everything else under a
    series nobody reads at a glance. The rest of the water section (zones,
    unattributed, carried_over) is small and stays raw below.
    """
    daily = runtime.state.daily_water()
    return {
        "day_count": len(daily),
        "oldest_day": min(daily) if daily else None,
        "newest_day": max(daily) if daily else None,
        "period_total_l": round(runtime.consumption_used_liters(), 1),
    }


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: IrrigationConfigEntry
) -> dict[str, Any]:
    """Return diagnostics for the hub entry."""
    runtime = entry.runtime_data
    runtime_state = runtime.state.as_dict()
    runtime_state["water"] = {**runtime_state["water"], "daily": _water_daily_summary(runtime)}
    payload: dict[str, Any] = {
        "options": dict(entry.options),
        "zones": {
            subentry_id: dict(subentry.data)
            for subentry_id, subentry in entry.subentries.items()
            if subentry.subentry_type == SUBENTRY_TYPE_ZONE
        },
        "runtime_state": runtime_state,
        # Which events are live and where they go, so "mute" is inspectable
        # without opening .storage.
        "notifications": evaluate_notifications(
            entry.options.get(CONF_NOTIFICATIONS, {}),
            known_services=set(hass.services.async_services_for_domain("notify")),
        ).as_dict(),
        "hub_version": INTEGRATION_VERSION,
    }
    return async_redact_data(payload, TO_REDACT)
