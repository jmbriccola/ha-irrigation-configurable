"""Valve controller: one abstraction over ``valve.*`` and ``switch.*`` entities.

A ``valve`` entity reports its real position, so open/close can be confirmed.
A ``switch`` entity is optimistic: its state mirrors the command, so
"confirmation" only proves the command was accepted, not that water moves —
the reduced guarantees are declared in the degradation matrix.
"""

from __future__ import annotations

import asyncio
from typing import Final

from homeassistant.core import Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.helpers.event import async_call_later, async_track_state_change_event

_UNCERTAIN_STATES: Final = frozenset({"unavailable", "unknown", None})


class ValveController:
    """Commands and observes one managed valve (zone or master)."""

    def __init__(self, hass: HomeAssistant, entity_id: str) -> None:
        self.hass = hass
        self.entity_id = entity_id
        self.is_switch = entity_id.startswith("switch.")

    def _state(self) -> str | None:
        state = self.hass.states.get(self.entity_id)
        return state.state if state else None

    @property
    def available(self) -> bool:
        return self._state() not in _UNCERTAIN_STATES

    @property
    def is_open(self) -> bool:
        return self._state() == ("on" if self.is_switch else "open")

    @property
    def is_closed(self) -> bool:
        """Strictly confirmed closed. Uncertain states are NOT closed:
        an unknown valve is treated as busy, never as free (§3)."""
        return self._state() == ("off" if self.is_switch else "closed")

    async def async_open(self) -> None:
        await self._command(open_=True)

    async def async_close(self) -> None:
        await self._command(open_=False)

    async def _command(self, *, open_: bool) -> None:
        if self.is_switch:
            domain, service = "switch", "turn_on" if open_ else "turn_off"
        else:
            domain, service = "valve", "open_valve" if open_ else "close_valve"
        await self.hass.services.async_call(
            domain, service, {"entity_id": self.entity_id}, blocking=True
        )

    async def async_wait_until(self, *, open_: bool, timeout_s: float) -> bool:
        """Wait until the entity confirms the wanted position.

        Returns True when confirmed, False on timeout. Driven by state-change
        events plus a timer (no polling).
        """
        if self.is_open if open_ else self.is_closed:
            return True

        future: asyncio.Future[bool] = self.hass.loop.create_future()

        @callback
        def _on_state(_event: Event[EventStateChangedData]) -> None:
            if not future.done() and (self.is_open if open_ else self.is_closed):
                future.set_result(True)

        @callback
        def _on_timeout(_now: object) -> None:
            if not future.done():
                future.set_result(False)

        unsub_state = async_track_state_change_event(self.hass, [self.entity_id], _on_state)
        unsub_timer = async_call_later(self.hass, timeout_s, _on_timeout)
        try:
            return await future
        finally:
            unsub_state()
            unsub_timer()
