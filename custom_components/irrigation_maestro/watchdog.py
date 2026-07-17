"""Independent watchdog: last-line safety net, decoupled from sessions (§3).

Every minute it force-closes any managed valve open longer than the absolute
maximum. On Home Assistant start it closes everything it finds open — waiting
first for each (typically Zigbee) valve to become available, because they stay
``unavailable`` for tens of seconds after a restart. No legitimate cycle
survives a restart by design: the session queue is memory-only.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CALLBACK_TYPE, CoreState, callback
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from .session import REASON_WATCHDOG

if TYPE_CHECKING:
    from .runtime import IrrigationRuntime

_LOGGER = logging.getLogger(__name__)

CHECK_INTERVAL = timedelta(seconds=60)
AVAILABILITY_POLL_S = 5.0


class Watchdog:
    """Periodic overtime check + startup close-all."""

    def __init__(self, runtime: IrrigationRuntime) -> None:
        self._runtime = runtime
        self._unsubs: list[CALLBACK_TYPE] = []
        self._startup_done = False

    def start(self) -> None:
        hass = self._runtime.hass
        self._unsubs.append(async_track_time_interval(hass, self._check, CHECK_INTERVAL))
        if hass.state is CoreState.running:
            self._schedule_startup()
        else:
            self._unsubs.append(
                hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, self._on_started)
            )

    def stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()

    @callback
    def _on_started(self, _event: Any) -> None:
        self._schedule_startup()

    def _schedule_startup(self) -> None:
        if self._startup_done:
            return
        self._startup_done = True
        self._runtime.entry.async_create_background_task(
            self._runtime.hass, self._startup_check(), name="irrigation_maestro_startup"
        )

    async def _startup_check(self) -> None:
        """Close whatever is open once each valve becomes reachable."""
        runtime = self._runtime
        timeout_s = runtime.hub.startup_valve_timeout_s
        deadline = dt_util.utcnow() + timedelta(seconds=timeout_s)
        pending = list(runtime.all_valve_controllers())
        closed_any = False
        unreachable: list[str] = []
        while pending:
            still_pending = []
            for controller in pending:
                if controller.available:
                    if controller.is_open:
                        _LOGGER.warning("Startup: %s found open, closing", controller.entity_id)
                        runtime.ledger_expect(controller.entity_id, "close")
                        await controller.async_close()
                        await controller.async_wait_until(
                            open_=False, timeout_s=runtime.hub.close_confirm_s
                        )
                        closed_any = True
                else:
                    still_pending.append(controller)
            pending = still_pending
            if not pending:
                break
            if dt_util.utcnow() >= deadline:
                unreachable = [controller.entity_id for controller in pending]
                break
            await runtime.async_sleep(AVAILABILITY_POLL_S)

        if closed_any:
            await runtime.notify_watchdog(
                "A valve was found open at Home Assistant start and was closed "
                "for safety. Today's cycle may have been interrupted by the restart."
            )
        for entity_id in unreachable:
            runtime.report_valve_unreachable(entity_id)

    @callback
    def _check(self, _now: Any) -> None:
        self._runtime.entry.async_create_background_task(
            self._runtime.hass, self._async_check(), name="irrigation_maestro_watchdog"
        )

    async def _async_check(self) -> None:
        runtime = self._runtime
        max_delta = timedelta(minutes=runtime.hub.watchdog_max_min)
        now = dt_util.utcnow()
        overdue = []
        for controller in runtime.all_valve_controllers():
            if not controller.is_open:
                continue
            state = runtime.hass.states.get(controller.entity_id)
            if state is not None and now - state.last_changed > max_delta:
                overdue.append(controller)
        if not overdue:
            return

        _LOGGER.warning(
            "Watchdog: closing %s (open beyond %s min)",
            [controller.entity_id for controller in overdue],
            runtime.hub.watchdog_max_min,
        )
        # If a session is somehow involved, abort it (never leave a phantom
        # run believing its valve is open).
        if runtime.session.active:
            await runtime.session.async_stop_all(reason=REASON_WATCHDOG, manual=False)

        failed = []
        for controller in overdue:
            runtime.ledger_expect(controller.entity_id, "close")
            await controller.async_close()
            if not await controller.async_wait_until(
                open_=False, timeout_s=runtime.hub.close_confirm_s
            ):
                runtime.ledger_expect(controller.entity_id, "close")
                await controller.async_close()
                if not await controller.async_wait_until(
                    open_=False, timeout_s=runtime.hub.close_confirm_s
                ):
                    failed.append(controller.entity_id)

        runtime.fire_event(
            "watchdog",
            {"closed": [controller.entity_id for controller in overdue], "failed": failed},
        )
        if failed:
            for entity_id in failed:
                await runtime.report_close_failure(entity_id, entity_id)
        else:
            await runtime.notify_watchdog(
                "Watchdog: valve open beyond the maximum duration was force-closed "
                "(closure verified). Check the system."
            )
