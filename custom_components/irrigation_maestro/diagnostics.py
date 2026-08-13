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


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: IrrigationConfigEntry
) -> dict[str, Any]:
    """Return diagnostics for the hub entry."""
    runtime = entry.runtime_data
    payload: dict[str, Any] = {
        "options": dict(entry.options),
        "zones": {
            subentry_id: dict(subentry.data)
            for subentry_id, subentry in entry.subentries.items()
            if subentry.subentry_type == SUBENTRY_TYPE_ZONE
        },
        "runtime_state": runtime.state.as_dict(),
        # Which events are live and where they go, so "mute" is inspectable
        # without opening .storage.
        "notifications": evaluate_notifications(
            entry.options.get(CONF_NOTIFICATIONS, {}),
            known_services=set(hass.services.async_services_for_domain("notify")),
        ).as_dict(),
        "hub_version": INTEGRATION_VERSION,
    }
    return async_redact_data(payload, TO_REDACT)
