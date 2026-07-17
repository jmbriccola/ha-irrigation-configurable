"""Probe: does async_call_later fire with freezer.tick + async_fire_time_changed?"""

import asyncio
from datetime import timedelta

from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_call_later
from pytest_homeassistant_custom_component.common import async_fire_time_changed


async def test_call_later_fires_with_tick(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to("2026-07-17 05:00:00+00:00")
    fired = []

    @callback
    def _cb(_now):
        fired.append(_now)

    async_call_later(hass, 180, _cb)

    for _ in range(20):
        freezer.tick(timedelta(seconds=10))
        async_fire_time_changed(hass)
        await hass.async_block_till_done()

    assert fired, "callback never fired after 200s of ticks"


async def test_water_wait_pattern_in_background_task(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The runner's wait pattern: timer + abort race inside a background task.

    NOTE: the timer callback MUST be @callback-decorated — a plain function
    passed to async_call_later runs in the executor thread, and resolving a
    future from there raises "Non-thread-safe operation" (see MEMORY.md).
    """
    freezer.move_to("2026-07-17 05:00:00+00:00")
    abort = asyncio.Event()
    results = []

    async def runner() -> None:
        future: asyncio.Future[str] = hass.loop.create_future()

        def _finish(result: str) -> None:
            if not future.done():
                future.set_result(result)

        @callback
        def _on_elapsed(_now) -> None:
            _finish("done")

        unsub = async_call_later(hass, 180, _on_elapsed)
        abort_task = asyncio.ensure_future(abort.wait())
        try:
            await asyncio.wait({future, abort_task}, return_when=asyncio.FIRST_COMPLETED)
        finally:
            unsub()
            abort_task.cancel()
        results.append(future.result() if future.done() else "aborted")

    hass.async_create_background_task(runner(), name="probe")
    await asyncio.sleep(0)

    for _ in range(25):
        freezer.tick(timedelta(seconds=10))
        async_fire_time_changed(hass)
        await hass.async_block_till_done()

    assert results == ["done"]
