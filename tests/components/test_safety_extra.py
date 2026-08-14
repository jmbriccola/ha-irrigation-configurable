"""Additional safety-path tests: master valve, sentinel, stale weather, flow."""

from typing import Any

import pytest
from custom_components.irrigation_maestro.accounting import MeterSample
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


async def test_a_meter_that_goes_unavailable_still_interrupts_the_cycle(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """An unavailable meter with a known unit is a genuine, known zero.

    flow.py returns lpm=0.0, unit_known=True, available=False for an
    unavailable/unknown state with a declared unit -- deliberately, so the
    zero-flow guard is entitled to act on it (see the degradation matrix in
    README.md). The guard's blind condition is `not unit_known or
    unit_recovered`, nothing else: it must not also read
    MeterSample.measured_s, because accounting.py reports measured_s=0.0 for
    exactly this case (see MeterLedger._integrate's availability guard).
    Gating on it
    would leave the guard re-arming forever without ever judging a window --
    watering blind to the run's duration or safety timeout with no
    diagnosis, instead of interrupting at roughly the grace period like a
    measured zero does.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "unavailable", {"unit_of_measurement": "L/min"})
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

    # The meter never becomes available: after the grace period the cycle is
    # interrupted, exactly as it would be for a measured, known zero.
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


async def test_a_partial_unit_loss_does_not_double_book_the_meterless_estimate(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """had_usable_unit is this run's own history, not just its last sample.

    A meter that worked for part of a run and then lost its unit already has
    its working-part litres recorded by the ledger, attributed to this zone
    while its valve was open. add_consumption must not also book a
    full-duration nominal estimate on top just because the run ended blind --
    that would count real, ledger-recorded water again as an estimate, on a
    device_class: water / total_increasing sensor the user has chosen to
    expose on HA's own Water dashboard. Litres counted twice are worse than
    litres missed (see test_metering_restart.py's own module docstring for
    the same preference stated the other way round).

    Same scenario as test_a_unit_lost_mid_cycle_freezes_litres_without_crashing
    (10 L/min for ~2 minutes before the unit is lost): the ledger attributes
    roughly 20 L of real litres to this zone before going blind. A
    double-booked estimate would add 10 L/min * 10 min = 100 L on top --
    easily distinguished from the real total, so the bound below is wide.
    """
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
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 120)
    # An upstream update drops the unit halfway through.
    hass.states.async_set("sensor.flow", "10.0")
    await advance(hass, freezer, 10 * 60)

    outcome = runtime.state.last_outcome(zone_id)
    assert outcome["result"] == "completed"

    total = runtime.state.zone_water_total(zone_id)
    assert 20 <= total < 40


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


async def test_a_blind_gap_does_not_count_towards_a_sustained_range_anomaly(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The range clock cannot run through an interval nothing was checked in.

    RANGE_SUSTAIN_S is wall-clock, but _check_range is only reached while the
    unit is known. An out-of-range reading before the loss and one after the
    recovery are 125 s apart here, yet only the 45 s after the recovery were
    ever observed -- reporting that as a sustained anomaly would be inventing
    evidence from a gap.

    The recovery arrives on a state-change event, which is how it normally
    arrives, and the whole blind gap is placed strictly between two periodic
    ticks -- so no tick ever observes it. Only a reset on the recovery itself
    covers this; resetting in the tick's blind branch does not run at all here.
    """
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
    runtime = entry.runtime_data
    anomalies: list[Any] = []
    hass.bus.async_listen(f"{DOMAIN}_anomaly", anomalies.append)

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    # Periodic ticks fall on started_at + 120 s * k, so the gap below (150 s to
    # 210 s) sits wholly between the ticks at 120 s and 240 s.
    started_at = runtime.session.active_runs[runtime.zone_ids[0]].started_at
    assert started_at is not None

    async def advance_to(elapsed_s: float) -> None:
        remaining = elapsed_s - (dt_util.utcnow() - started_at).total_seconds()
        assert remaining > 0, "the checkpoint is already behind us"
        await advance(hass, freezer, remaining, step=1.0)

    # Well outside the +/-25% band around 10 L/min, with the unit known: the
    # range clock starts here.
    await advance_to(130)
    hass.states.async_set("sensor.flow", "30.0", {"unit_of_measurement": "L/min"})
    await hass.async_block_till_done()

    await advance_to(150)
    hass.states.async_set("sensor.flow", "30.0")  # unit lost
    await hass.async_block_till_done()

    await advance_to(210)
    hass.states.async_set("sensor.flow", "30.0", {"unit_of_measurement": "L/min"})
    await hass.async_block_till_done()

    # 125 s after the first out-of-range reading, but only 45 s after the
    # recovery -- short of RANGE_SUSTAIN_S once the blind gap is discounted.
    await advance_to(255)
    hass.states.async_set("sensor.flow", "31.0", {"unit_of_measurement": "L/min"})
    await hass.async_block_till_done()

    assert not [event for event in anomalies if "out of expected range" in event.data["message"]]


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


async def test_volume_target_reached_on_the_read_that_loses_the_unit(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Litres already integrated finish the run even if that read kills the unit.

    The target check sits above the unit_known gate on purpose (see
    FlowMonitor._on_sample):
    water certainly delivered still finishes the run, even when the very
    sample that lost the unit is the one whose litres cross it.

    Under the ledger (Task 9) a state change and the ledger's own 30 s
    gap-detection tick both arrive through the same _on_sample, so there is
    no longer a separate "periodic check" path that could reach the same
    conclusion independently and mask a broken gate the way there was when
    FlowMonitor integrated on its own -- that negative control is gone with
    the second integrator. What survives is MeterLedger._integrate's own
    order of operations: a sample integrates the *previous* reading over the
    interval since the last one, and only afterwards looks at its own new
    lpm. So the read that removes the unit can still be the read whose
    litres cross the target, because those litres were earned by the reading
    before it, not by itself.

    The meter holds a genuine, unit-bearing 0 L/min through the whole opening
    sequence, so nothing accrues regardless of where the ledger's own tick
    happens to land -- its phase is anchored to when the ledger started (hub
    setup), not to this run, and is not under this test's control. Once
    open: one read arms _last_lpm at a high rate WITH a unit (that sample
    integrates the prior, zero-flow interval, so nothing accrues from it);
    6 s later, a second read holds the same rate but WITHOUT a unit. That
    second read is where MeterLedger._integrate runs against the *armed*
    300 L/min over those 6 s -- 30 L -- before the new, unit-less reading is
    even consulted, comfortably past the 20 L target.

    Both reads must avoid the ledger's own tick landing between them, which
    would publish a competing sample and no longer pin the invariant on the
    read that loses the unit specifically. Rather than trust that the two
    checkpoints below avoid it by construction, a spy subscribed directly to
    the zone's ledger asserts it: the sample count is unchanged across the
    arm-to-lose window, and the crossing sample itself is checked for
    lpm is None and total_l - baseline >= target. A tick landing where it
    should not fails on that assertion, naming the broken assumption,
    instead of failing later on a state assertion that does not say why.

    For context, not as the correctness mechanism: ticks fall on multiples
    of 30 s counted from hub setup. started_at does *not* land on that grid
    -- empirically (right after the standard 31 * 60 s advance used
    throughout this file, elapsed-since-started_at is exactly 50.0 s, and
    31 * 60 - 50 = 1810 = 1800 + 10, where 1800 = 60 * 30 is a grid point) it
    sits 10 s after one. So ticks fall at started_at - 10 s, +20 s, +50 s,
    +80 s, ... -- and the standard 31 * 60 s advance happens to land exactly
    on the +50 s one, purely as a coincidence of the two numbers. The two
    reads below, at +53 s and +59 s, sit inside the following gap, (+50 s,
    +80 s], with margin on both sides.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                flow_sensor="sensor.flow",
                cycles=[
                    {
                        "id": "cy_alpha",
                        "name": "Morning",
                        "enabled": True,
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": {
                            "points": [[20.0, 20.0]],
                            "min_value": 1.0,
                            "max_value": 500.0,
                            "kind": "volume",
                        },
                        "volume_safety_timeout_min": 30,
                    }
                ],
            )
        ],
    )
    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    zone = runtime.zones[zone_id]
    ledger = runtime.accountant.ledger_for(zone)
    assert ledger is not None
    samples: list[MeterSample] = []
    ledger.subscribe(samples.append)
    baseline = ledger.total_l
    started_at = runtime.session.active_runs[zone_id].started_at
    assert started_at is not None

    async def advance_to(elapsed_s: float) -> None:
        remaining = elapsed_s - (dt_util.utcnow() - started_at).total_seconds()
        assert remaining > 0, "the checkpoint is already behind us"
        await advance(hass, freezer, remaining, step=1.0)

    # Zero flow, with a unit, the whole time so far: nothing to integrate.
    await advance_to(53)
    assert hass.states.get("valve.a").state == "open"

    # Arms _last_lpm at a high rate; this sample integrates the prior
    # (zero-flow) interval, so nothing accrues from it.
    hass.states.async_set("sensor.flow", "300", {"unit_of_measurement": "L/min"})
    await hass.async_block_till_done()
    samples_after_arm = len(samples)

    await advance_to(59)
    # Merely waiting does not integrate anything: no sample has run since
    # the arm above, so nothing has accrued yet -- still watering.
    assert hass.states.get("valve.a").state == "open"
    # Pin the precondition directly instead of narrating it: no ledger
    # sample -- tick or otherwise -- arrived in the arm-to-lose window. If
    # one did, the crossing below would not be attributable to the specific
    # read that loses the unit, and this failure names that instead of the
    # test failing later on a state assertion that does not say why.
    assert len(samples) == samples_after_arm, (
        "a ledger sample landed between the arm and the unit-losing read -- "
        "the tick-free-window assumption this test relies on no longer holds"
    )

    # The read that loses the unit: _integrate runs first, against the armed
    # 300 L/min over the 6 s since the previous read (30 L, past the 20 L
    # target) -- before the new, unit-less reading is even looked at.
    hass.states.async_set("sensor.flow", "300", {})
    await hass.async_block_till_done()
    assert len(samples) == samples_after_arm + 1
    crossing = samples[-1]
    assert crossing.lpm is None
    assert crossing.total_l - baseline >= 20

    await advance_to(61)

    assert hass.states.get("valve.a").state == "closed"
    outcome = runtime.state.last_outcome(zone_id)
    assert outcome["result"] == "completed"


async def test_flow_in_range_reports_nothing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The positive path of _check_range: sustained in-range flow is silent.

    _check_range is reachable only from _on_sample, the ledger's sample
    listener (FlowMonitor._on_sample); re-asserting the identical state and
    attributes fires EVENT_STATE_REPORTED, not EVENT_STATE_CHANGED, so it
    would never reach the ledger's own state-change listener and never
    publish a sample at all -- force_update is what keeps these
    state-changed events real. The expected_flow_range spy proves
    _check_range's body actually ran (it is the function's first
    statement): without it, "reported == []" alone would also hold if the
    whole method were disabled, which is no test at all.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "10", {"unit_of_measurement": "L/min"})
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
                flow_tolerance_pct=25,
            )
        ],
    )
    runtime = entry.runtime_data
    reported: list[tuple[float, float, float]] = []
    runtime.report_flow_out_of_range = lambda *args: reported.append(args)  # type: ignore[method-assign]
    range_checks: list[None] = []
    original_expected_flow_range = runtime.expected_flow_range

    def _spy_expected_flow_range() -> tuple[float, float] | None:
        range_checks.append(None)
        return original_expected_flow_range()

    runtime.expected_flow_range = _spy_expected_flow_range  # type: ignore[method-assign]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    # Real state-changed events, well past RANGE_SUSTAIN_S (120 s), all
    # inside the expected 7.5-12.5 L/min band.
    for _ in range(5):
        hass.states.async_set(
            "sensor.flow", "10", {"unit_of_measurement": "L/min"}, force_update=True
        )
        await advance(hass, freezer, 60, step=1.0)

    assert range_checks, "_check_range never ran -- the test observed nothing"
    assert reported == []
