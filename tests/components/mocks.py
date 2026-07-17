"""Mock valve/switch devices backed by real service registrations.

Tests drive the same service-call + state-change path the integration uses in
production: commanding a mock valve updates its state (unless told to be
stuck or unavailable), so confirmation windows, surveillance and watchdog
logic are exercised for real.
"""

from __future__ import annotations

from homeassistant.core import HomeAssistant, ServiceCall

BEHAVIOR_NORMAL = "normal"
BEHAVIOR_STUCK = "stuck"  # ignores commands, state never changes
BEHAVIOR_UNAVAILABLE = "unavailable"


class MockValvePark:
    """Registers valve/switch domain services that reflect entity states."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.behavior: dict[str, str] = {}
        self.commands: list[tuple[str, str]] = []  # (service, entity_id)
        hass.services.async_register("valve", "open_valve", self._valve_open)
        hass.services.async_register("valve", "close_valve", self._valve_close)
        hass.services.async_register("switch", "turn_on", self._switch_on)
        hass.services.async_register("switch", "turn_off", self._switch_off)

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

    def _apply(self, call: ServiceCall, service: str, new_state: str) -> None:
        targets = call.data["entity_id"]
        if isinstance(targets, str):
            targets = [targets]
        for entity_id in targets:
            self.commands.append((service, entity_id))
            if self.behavior.get(entity_id, BEHAVIOR_NORMAL) == BEHAVIOR_NORMAL:
                self.hass.states.async_set(entity_id, new_state)

    def _valve_open(self, call: ServiceCall) -> None:
        self._apply(call, "open_valve", "open")

    def _valve_close(self, call: ServiceCall) -> None:
        self._apply(call, "close_valve", "closed")

    def _switch_on(self, call: ServiceCall) -> None:
        self._apply(call, "turn_on", "on")

    def _switch_off(self, call: ServiceCall) -> None:
        self._apply(call, "turn_off", "off")
