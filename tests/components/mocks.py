"""Mock valve/switch devices backed by real service calls.

Tests drive the same service-call + state-change path the integration uses in
production: commanding a mock valve updates its state (unless told to be
stuck or unavailable), so confirmation windows, surveillance and watchdog
logic are exercised for real.

The park reacts to the ``call_service`` *event* rather than owning the
service handlers: the integration's switch platform loads the real ``switch``
component, whose entity services replace any plain registration under that
domain. The event survives that, and the real handlers simply ignore the
park's bare states (they are not component entities).
"""

from __future__ import annotations

from typing import Any

from homeassistant.const import EVENT_CALL_SERVICE
from homeassistant.core import Event, HomeAssistant, ServiceCall, callback

BEHAVIOR_NORMAL = "normal"
BEHAVIOR_STUCK = "stuck"  # ignores commands, state never changes
BEHAVIOR_UNAVAILABLE = "unavailable"

_STATE_FOR_SERVICE = {
    ("valve", "open_valve"): "open",
    ("valve", "close_valve"): "closed",
    ("switch", "turn_on"): "on",
    ("switch", "turn_off"): "off",
}


class MockValvePark:
    """Reflects valve/switch service calls into entity states."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.behavior: dict[str, str] = {}
        self.commands: list[tuple[str, str]] = []  # (service, entity_id)
        # Placeholder registrations so the services exist even when the real
        # integrations are not loaded (the valve component never is).
        for domain, service in _STATE_FOR_SERVICE:
            if not hass.services.has_service(domain, service):
                hass.services.async_register(domain, service, self._noop)
        hass.bus.async_listen(EVENT_CALL_SERVICE, self._on_call_service)

    @staticmethod
    def _noop(call: ServiceCall) -> None:
        return None

    def add(self, entity_id: str, state: str | None = None) -> None:
        if state is None:
            state = "closed" if entity_id.startswith("valve.") else "off"
        self.behavior.setdefault(entity_id, BEHAVIOR_NORMAL)
        self.hass.states.async_set(entity_id, state)

    def set_behavior(self, entity_id: str, behavior: str) -> None:
        self.behavior[entity_id] = behavior
        if behavior == BEHAVIOR_UNAVAILABLE:
            self.hass.states.async_set(entity_id, "unavailable")

    def force_state(self, entity_id: str, state: str) -> None:
        """External/manual intervention: set state without a command."""
        self.hass.states.async_set(entity_id, state)

    @callback
    def _on_call_service(self, event: Event[Any]) -> None:
        key = (event.data.get("domain"), event.data.get("service"))
        new_state = _STATE_FOR_SERVICE.get(key)
        if new_state is None:
            return
        targets = event.data.get("service_data", {}).get("entity_id", [])
        if isinstance(targets, str):
            targets = [targets]
        for entity_id in targets:
            if entity_id not in self.behavior:
                continue  # not a park device (e.g. an integration entity)
            self.commands.append((key[1], entity_id))
            if self.behavior.get(entity_id, BEHAVIOR_NORMAL) == BEHAVIOR_NORMAL:
                self.hass.states.async_set(entity_id, new_state)
