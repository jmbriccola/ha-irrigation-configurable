"""Additional safety-path tests: master valve, sentinel, stale weather, flow."""

from typing import Any

import pytest
from custom_components.irrigation_maestro.const import DOMAIN
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import issue_registry as ir
from homeassistant.util import dt as dt_util

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
        options={"notifications": {"sentinel": {"enabled": True, "services": ["test_target"]}}},
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
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
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
    hass.states.async_set("sensor.flow", "10.0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 150)
    hass.states.async_set(
        "sensor.flow", "10.0", {"unit_of_measurement": "L/min"}, force_update=True
    )
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
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                flow_sensor="sensor.flow",
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


async def test_max_concurrent_two_same_group_run_together(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """With max_concurrent=2, zones sharing a compatibility group coexist;
    a zone without a group never joins them."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    for entity in ("valve.a", "valve.b", "valve.c"):
        park.add(entity)
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", order=1, minutes=5, compatibility_group="drip"),
            zone_data("Beta", "valve.b", order=2, minutes=5, compatibility_group="drip"),
            zone_data("Gamma", "valve.c", order=3, minutes=3),
        ],
        options={"max_concurrent": 2, "compatibility_groups": ["drip"], "settle_pause_s": 30},
    )

    await advance(hass, freezer, 32 * 60)
    # Alpha and Beta (same group) water together; Gamma must wait.
    assert hass.states.get("valve.a").state == "open"
    assert hass.states.get("valve.b").state == "open"
    assert hass.states.get("valve.c").state == "closed"

    await advance(hass, freezer, 10 * 60)
    assert hass.states.get("valve.a").state == "closed"
    assert hass.states.get("valve.b").state == "closed"
    # Gamma ran alone afterwards.
    assert ("open_valve", "valve.c") in park.commands
    runtime = entry.runtime_data
    for zone_id in runtime.zone_ids:
        assert runtime.state.last_outcome(zone_id)["result"] == "completed"


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


async def test_a_cubic_metres_per_hour_meter_reaches_the_volume_target(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """0.45 m³/h is 7.5 L/min: the 20 L target arrives in under three minutes.

    Read as L/min it would have been 0.45 L/min and the run would have hit its
    safety timeout instead, 16.7x short.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "m³/h"})
    mock_weather(hass)
    zone = zone_data(
        "Alpha",
        "valve.a",
        flow_sensor="sensor.flow",
        nominal_flow_lpm=7.5,
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

    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    await advance(hass, freezer, 150)
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"}, force_update=True)
    await advance(hass, freezer, 60)

    assert hass.states.get("valve.a").state == "closed"
    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "completed"
    assert outcome["volume_l"] >= 20


async def test_a_unit_override_beats_the_declared_unit_end_to_end(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The sensor claims L/min but really reports m³/h. The user says so."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    zone = zone_data(
        "Alpha",
        "valve.a",
        flow_sensor="sensor.flow",
        flow_sensor_unit="m³/h",
        nominal_flow_lpm=7.5,
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
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 150)
    hass.states.async_set(
        "sensor.flow", "0.45", {"unit_of_measurement": "L/min"}, force_update=True
    )
    await advance(hass, freezer, 60)

    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["volume_l"] >= 20


async def test_a_meter_with_no_unit_does_not_interrupt_the_cycle(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """An unknown unit accumulates nothing, so it must not trip the zero-flow
    guard — which would otherwise interrupt every single run."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "7.5")  # no unit declared
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")],
    )
    anomalies: list[Any] = []
    hass.bus.async_listen(f"{DOMAIN}_anomaly", anomalies.append)

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    await advance(hass, freezer, 3 * 60)
    # Still watering: the guard is off, not tripped.
    assert hass.states.get("valve.a").state == "open"

    await advance(hass, freezer, 8 * 60)
    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "completed"

    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "flow_unit_unknown_sensor.flow") is not None
    # A meter that never had a usable unit is a standing configuration fault,
    # which the repair states. Pushing it on every run would be alarm fatigue.
    assert not [event for event in anomalies if "sensor.flow" in event.data["message"]]


async def test_a_unit_lost_mid_cycle_freezes_litres_without_crashing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "10.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow", nominal_flow_lpm=10.0
            )
        ],
    )
    anomalies: list[Any] = []
    hass.bus.async_listen(f"{DOMAIN}_anomaly", anomalies.append)

    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 120)
    # An upstream update drops the unit halfway through.
    hass.states.async_set("sensor.flow", "10.0")
    await advance(hass, freezer, 10 * 60)

    # A meter that was working and stopped is pushed, once for the transition
    # and not once per read -- the repair alone would not reach the user
    # mid-cycle.
    notices = [event for event in anomalies if "sensor.flow" in event.data["message"]]
    assert len(notices) == 1
    assert "no longer being used" in notices[0].data["message"]

    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "completed"  # no crash, no interrupt
    # The freeze itself, not merely the absence of a crash: the meter read
    # 10 L/min and the unit survived ~2.8 minutes of the 10-minute run, so a
    # frozen count lands near 28 L. Accruing the blind interval at the last
    # known rate would have reported ~100 L instead.
    assert 25 < outcome["volume_l"] < 40
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "flow_unit_unknown_sensor.flow") is not None


async def test_a_unit_that_returns_just_before_a_check_does_not_trip_the_guard(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The window a unit comes back in is part blind, so it cannot be judged.

    The grace window elapses on the wall clock whether or not the meter is
    readable, but litres only accrue once it is. A unit that returns two
    seconds before a periodic check leaves 1 L/min x 2 s = 0.03 L behind, which
    the guard would weigh against ZERO_FLOW_EPSILON_L = 0.1 L and interrupt a
    perfectly healthy run over. It is the entry edge's bug on the recovery edge.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "1.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow", nominal_flow_lpm=1.0
            )
        ],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    # The monitor is started in the same synchronous block that stamps
    # started_at, so its periodic checks fall on started_at + 120 s * k. The
    # test steers by that clock rather than by the advance offsets, which say
    # nothing about where in a window they land.
    started_at = runtime.session.active_runs[zone_id].started_at
    assert started_at is not None

    async def advance_to(elapsed_s: float) -> None:
        remaining = elapsed_s - (dt_util.utcnow() - started_at).total_seconds()
        assert remaining > 0, "the checkpoint is already behind us"
        await advance(hass, freezer, remaining, step=1.0)

    # One healthy window (2.0 L, well clear of the threshold), then the unit
    # disappears and the check at 240 s goes blind.
    await advance_to(130)
    assert hass.states.get("valve.a").state == "open"
    hass.states.async_set("sensor.flow", "1.0")
    await hass.async_block_till_done()

    await advance_to(358)
    assert hass.states.get("valve.a").state == "open"

    # The unit returns 2 s before the check at 360 s: 0.03 L in that window.
    hass.states.async_set("sensor.flow", "1.0", {"unit_of_measurement": "L/min"})
    await hass.async_block_till_done()
    await advance_to(365)
    assert hass.states.get("valve.a").state == "open"

    await advance(hass, freezer, 5 * 60)
    outcome = runtime.state.last_outcome(zone_id)
    assert outcome["result"] == "completed"
    # The repair raised by the loss is withdrawn again by the recovery.
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "flow_unit_unknown_sensor.flow") is None


async def test_a_repair_is_withdrawn_by_the_next_run_once_the_unit_resolves(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A fresh monitor cannot present a recovery edge, so it clears on sight.

    The repair tells the user to set the unit. They set it between runs, so the
    monitor that finally reads it is a new one whose unit_known started True --
    there is no False->True transition to hang the withdrawal on. Clearing only
    on that edge would leave the warning up for the life of the process, long
    after the user did what it asked.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "7.5")  # no unit declared
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=3, flow_sensor="sensor.flow")],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    registry = ir.async_get(hass)

    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 5 * 60)
    assert registry.async_get_issue(DOMAIN, "flow_unit_unknown_sensor.flow") is not None

    # The user does what the repair asked and the meter now declares its unit.
    hass.states.async_set("sensor.flow", "7.5", {"unit_of_measurement": "L/min"})
    await hass.async_block_till_done()
    # Still up: nothing reads a flow sensor outside a run, so the repair can
    # only be withdrawn by the next one.
    assert registry.async_get_issue(DOMAIN, "flow_unit_unknown_sensor.flow") is not None

    await runtime.async_run_zone(zone_id)
    await advance(hass, freezer, 2 * 60)
    assert registry.async_get_issue(DOMAIN, "flow_unit_unknown_sensor.flow") is None


@pytest.mark.parametrize(
    "zone_meter",
    [{}, {"flow_sensor": ""}],
    ids=["never_configured", "cleared_to_empty"],
)
async def test_a_zone_on_the_line_meter_takes_the_hubs_unit_override(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, zone_meter: dict[str, str]
) -> None:
    """A zone with no meter of its own reads the line meter, hub override and all.

    The line meter claims L/min and really reports m³/h; the correction lives
    on the hub because that is where the sensor lives. The zone's own override
    would describe a sensor it does not have, so it must not be consulted.

    Parametrized over the two ways a zone can have no meter: never configured,
    and cleared to an empty string (which update_zone writes unconditionally).
    Both must fall through to the line meter rather than bind to "".
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.line", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    zone = zone_data(
        "Alpha",
        "valve.a",
        nominal_flow_lpm=7.5,
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
        **zone_meter,
    )
    entry = await setup_hub(
        hass,
        [zone],
        options={"line_flow_sensor": "sensor.line", "line_flow_sensor_unit": "m³/h"},
    )

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    # 0.45 m³/h is 7.5 L/min, so the 20 L target arrives in under 3 minutes.
    hass.states.async_set("sensor.line", "0.45", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 150)
    hass.states.async_set(
        "sensor.line", "0.45", {"unit_of_measurement": "L/min"}, force_update=True
    )
    await advance(hass, freezer, 60)

    assert hass.states.get("valve.a").state == "closed"
    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "completed"
    assert outcome["volume_l"] >= 20
