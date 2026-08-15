"""A restart in the middle of a cycle must not double-count or go backwards.

A total_increasing sensor that jumps back or resets confuses Home Assistant's
statistics, and litres counted twice are worse than litres missed: the first
is a wrong number presented as right, the second is a declared gap.
"""

from datetime import date

import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant

from .mocks import MockValvePark
from .test_entities import role_state
from .test_session import START, advance, mock_weather, setup_hub, zone_data


async def test_a_restart_mid_cycle_neither_doubles_nor_rewinds(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=20, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    hass.states.async_set("sensor.flow", "10", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 300, step=10.0)

    before = runtime.state.zone_water_total(zone_id)
    assert before > 40
    await runtime.state.async_save()

    # Reload the entry: the queue is memory-only and the watchdog closes what
    # it finds open, exactly as after a real restart.
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    reloaded = entry.runtime_data

    after = reloaded.state.zone_water_total(zone_id)
    assert after >= before  # never backwards
    assert after <= before + 1.0  # and not re-counted

    # The interval spanning the restart is a gap, not a double count: the
    # ledger restarts from now rather than resuming from the old timestamp.
    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 120, step=10.0)
    assert reloaded.state.zone_water_total(zone_id) >= after


async def test_last_gap_at_survives_a_restart_the_way_the_counters_do(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The stamp is state, so it lives in the Store, not in the entity.

    A RestoreEntity copy would be a second version of the same fact, free to
    disagree with the counters written in the same transaction. The zone's
    litres come back from the store on reload; when its meter was last unread
    must come back with them, or the sensor would report a clean history for a
    zone whose day is full of holes.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "10", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=20, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    hass.states.async_set("sensor.flow", "unavailable", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 100, step=10.0)
    hass.states.async_set("sensor.flow", "10", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 30, step=10.0)

    stamped = runtime.state.zone_last_gap_at(zone_id)
    assert stamped is not None
    # Present on the entity too, but not necessarily this very instant: the
    # sample path refreshes entities at most once a minute (_due_to_persist),
    # so mid-outage it can still be showing an earlier sample of the same
    # outage. The store is the authority, and it is what the reload reads.
    assert role_state(hass, "zone_water_total", zone_id=zone_id).attributes["last_gap_at"]
    await runtime.state.async_save()

    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    reloaded = entry.runtime_data

    assert reloaded.state.zone_last_gap_at(zone_id) == stamped
    assert role_state(hass, "zone_water_total", zone_id=zone_id).attributes["last_gap_at"] == (
        stamped
    )


async def test_the_daily_entry_matches_the_cumulative_after_a_reload(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """One writer for both, so a reload cannot split them apart."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=7.5)])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 11 * 60)
    await runtime.state.async_save()

    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    reloaded = entry.runtime_data

    assert reloaded.state.water_for_day(zone_id, date(2026, 7, 17)) == pytest.approx(
        reloaded.state.zone_water_total(zone_id)
    )
