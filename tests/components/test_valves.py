"""Tests for the valve controller abstraction (valve.* and switch.*)."""

import asyncio
from datetime import timedelta

from custom_components.irrigation_maestro.valves import ValveController
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from .mocks import BEHAVIOR_STUCK, BEHAVIOR_UNAVAILABLE, MockValvePark


async def test_valve_open_close_commands(hass: HomeAssistant) -> None:
    park = MockValvePark(hass)
    park.add("valve.zone1")
    controller = ValveController(hass, "valve.zone1")

    assert controller.is_closed
    assert not controller.is_open
    assert controller.available

    await controller.async_open()
    await hass.async_block_till_done()
    assert ("open_valve", "valve.zone1") in park.commands
    assert controller.is_open

    await controller.async_close()
    await hass.async_block_till_done()
    assert controller.is_closed


async def test_switch_uses_switch_services(hass: HomeAssistant) -> None:
    park = MockValvePark(hass)
    park.add("switch.zone2")
    controller = ValveController(hass, "switch.zone2")

    assert controller.is_switch
    await controller.async_open()
    await hass.async_block_till_done()
    assert ("turn_on", "switch.zone2") in park.commands
    assert controller.is_open
    await controller.async_close()
    await hass.async_block_till_done()
    assert controller.is_closed


async def test_unavailable_is_neither_open_nor_closed(hass: HomeAssistant) -> None:
    park = MockValvePark(hass)
    park.add("valve.zone1")
    park.set_behavior("valve.zone1", BEHAVIOR_UNAVAILABLE)
    await hass.async_block_till_done()
    controller = ValveController(hass, "valve.zone1")

    assert not controller.available
    assert not controller.is_open
    assert not controller.is_closed


async def test_wait_until_open_succeeds(hass: HomeAssistant) -> None:
    park = MockValvePark(hass)
    park.add("valve.zone1")
    controller = ValveController(hass, "valve.zone1")

    await controller.async_open()
    result = await controller.async_wait_until(open_=True, timeout_s=120)
    assert result is True


async def test_wait_until_times_out_when_stuck(hass: HomeAssistant) -> None:
    park = MockValvePark(hass)
    park.add("valve.zone1")
    park.set_behavior("valve.zone1", BEHAVIOR_STUCK)
    controller = ValveController(hass, "valve.zone1")

    await controller.async_open()
    task = asyncio.ensure_future(controller.async_wait_until(open_=True, timeout_s=120))
    await asyncio.sleep(0)
    assert not task.done()
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=121))
    assert await asyncio.wait_for(task, 1) is False


async def test_wait_until_reacts_to_late_state_change(hass: HomeAssistant) -> None:
    park = MockValvePark(hass)
    park.add("valve.zone1")
    park.set_behavior("valve.zone1", BEHAVIOR_STUCK)
    controller = ValveController(hass, "valve.zone1")

    await controller.async_open()
    task = asyncio.ensure_future(controller.async_wait_until(open_=True, timeout_s=120))
    await asyncio.sleep(0)
    assert not task.done()
    park.force_state("valve.zone1", "open")  # device finally reacts
    assert await asyncio.wait_for(task, 1) is True
