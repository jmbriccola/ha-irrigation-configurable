"""Additional safety-path tests: master valve, sentinel, stale weather, flow."""

from typing import Any

from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import issue_registry as ir
from homeassistant.util import dt as dt_util

from custom_components.irrigation_maestro.const import DOMAIN

from .mocks import MockValvePark
from .test_session import START, advance, mock_weather, setup_hub, zone_data


async def test_master_valve_wraps_session(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Master opens before the first zone and closes after the last one."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("switch.pump")
    mock_weather(hass)
    await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a")],
        options={"master_valve": "switch.pump", "master_pre_open_s": 5},
    )

    await advance(hass, freezer, 31 * 60)
    # Both open, and the pump was commanded before the zone valve.
    assert hass.states.get("switch.pump").state == "on"
    assert hass.states.get("valve.a").state == "open"
    pump_index = park.commands.index(("turn_on", "switch.pump"))
    zone_index = park.commands.index(("open_valve", "valve.a"))
    assert pump_index < zone_index

    await advance(hass, freezer, 5 * 60)
    assert hass.states.get("valve.a").state == "closed"
    assert hass.states.get("switch.pump").state == "off"
    # Close order: zone first, pump last.
    assert park.commands.index(("close_valve", "valve.a")) < park.commands.index(
        ("turn_off", "switch.pump")
    )


async def test_sentinel_reports_missing_outcome(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A due cycle with no recorded outcome -> notification + Repairs issue."""
    freezer.move_to("2026-07-17 12:01:00+00:00")  # past the 05:30 trigger
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)

    notifications: list[ServiceCall] = []

    async def notify(call: ServiceCall) -> None:
        notifications.append(call)

    hass.services.async_register("notify", "test_target", notify)

    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a")],
        options={
            "notifications": {"sentinel": {"enabled": True, "services": ["test_target"]}}
        },
    )
    runtime = entry.runtime_data
    events: list[Any] = []
    hass.bus.async_listen(f"{DOMAIN}_sentinel", events.append)

    # The trigger never ran today (HA was "off"): no outcome recorded.
    await runtime.sentinel.async_check()
    await hass.async_block_till_done()

    assert len(events) == 1
    assert "Alpha" in events[0].data["missing"][0]
    assert len(notifications) == 1
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "sentinel_missing_outcome") is not None


async def test_sentinel_quiet_when_outcome_recorded(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to("2026-07-17 12:01:00+00:00")
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    runtime = entry.runtime_data

    zone_id = runtime.zone_ids[0]
    cycle_id = runtime.zones[zone_id].config.cycles[0].cycle_id
    runtime.state.record_outcome(dt_util.now().date(), zone_id, cycle_id, "skipped")

    events: list[Any] = []
    hass.bus.async_listen(f"{DOMAIN}_sentinel", events.append)
    await runtime.sentinel.async_check()
    await hass.async_block_till_done()
    assert not events


async def test_stale_weather_fail_open_waters_with_zero_budget(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    # No weather entity state at all: snapshot is None.
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    runtime = entry.runtime_data
    # Last known temperatures exist from previous days.
    runtime.state.record_temp(dt_util.now().date(), 28.0)

    await advance(hass, freezer, 31 * 60)
    # Fail-open (default): waters using the last known weighted temperature.
    assert hass.states.get("valve.a").state == "open"
    assert runtime.session.evaluation is not None
    assert runtime.session.evaluation.stale_weather is True
    assert runtime.session.evaluation.water_budget == 0.0


async def test_stale_weather_fail_closed_skips(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a")],
        options={"engine": {}, "stale_weather_policy": "fail_closed"},
    )
    runtime = entry.runtime_data

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "closed"
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "skipped"
    assert outcome["reason_key"] == "weather_unavailable"
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "weather_unavailable") is not None


async def test_volume_mode_closes_at_target(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0")
    mock_weather(hass)
    zone = zone_data(
        "Alpha",
        "valve.a",
        flow_sensor="sensor.flow",
        nominal_flow_lpm=10.0,
        cycles=[
            {
                "id": "cy_vol",
                "name": "Volume",
                "enabled": True,
                "trigger": {"kind": "time", "at": "05:30"},
                "curve": {
                    "points": [[20.0, 20.0]],
                    "min_value": 5.0,
                    "max_value": 100.0,
                    "kind": "volume",
                },
                "volume_safety_timeout_min": 30,
            }
        ],
    )
    entry = await setup_hub(hass, [zone])

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    # 10 L/min: the 20 L target is reached after ~2 minutes.
    hass.states.async_set("sensor.flow", "10.0")
    await advance(hass, freezer, 150)
    hass.states.async_set("sensor.flow", "10.0", force_update=True)
    await advance(hass, freezer, 60)

    assert hass.states.get("valve.a").state == "closed"
    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "completed"
    assert outcome["volume_l"] >= 20


async def test_zero_flow_interrupts_cycle(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow",
                nominal_flow_lpm=10.0,
            )
        ],
    )

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    # Flow never starts: after the grace period the cycle is interrupted.
    await advance(hass, freezer, 3 * 60)
    assert hass.states.get("valve.a").state == "closed"
    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "interrupted"
    assert outcome["reason_key"] == "no_flow"


async def test_soak_interleaves_other_zone(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """During Alpha's soak pause, Beta waters instead of idling the session."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    mock_weather(hass)
    zone_a = zone_data(
        "Alpha",
        "valve.a",
        order=1,
        cycles=[
            {
                "id": "cy_a",
                "name": "Soaked",
                "enabled": True,
                "trigger": {"kind": "time", "at": "05:30"},
                "curve": {"points": [[20.0, 6.0]], "min_value": 1.0, "max_value": 60.0},
                "soak_max_run_min": 3,
                "soak_pause_min": 10,
            }
        ],
    )
    entry = await setup_hub(
        hass,
        [zone_a, zone_data("Beta", "valve.b", order=2)],
        options={"settle_pause_s": 30},
    )

    # Alpha runs its first 3-minute slice.
    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    await advance(hass, freezer, 4 * 60)
    assert hass.states.get("valve.a").state == "closed"

    # During Alpha's 10-minute soak, Beta gets its turn.
    await advance(hass, freezer, 4 * 60)
    assert ("open_valve", "valve.b") in park.commands

    # Alpha eventually completes its second slice.
    await advance(hass, freezer, 12 * 60)
    runtime = entry.runtime_data
    assert runtime.state.last_outcome(runtime.zone_ids[0])["result"] == "completed"
    assert runtime.state.last_outcome(runtime.zone_ids[1])["result"] == "completed"
