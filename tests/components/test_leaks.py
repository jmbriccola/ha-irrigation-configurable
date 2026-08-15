"""Leak sourcing: flow while every valve is closed, and the valve's own alarm.

A dedicated file rather than test_safety_extra.py, which is the *in-cycle*
safety file and is already large. This is its mirror image: everything here
happens with the valves shut.

The two sources are the same physical detection on the reference hardware -- a
SONOFF SWV's "moisture" sensor is an alarm derived from its own internal flow
meter, not a ground probe -- so the tests that matter most are the ones proving
they converge into a single alarm.
"""

from typing import Any

import pytest
from custom_components.irrigation_maestro.leak import (
    SOURCE_NO_FLOW_CLOSED,
    SOURCE_VALVE_SENSOR,
)
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant

from .mocks import MockValvePark
from .test_session import START, advance, mock_weather, setup_hub, zone_data

#: The confirmation window is 300 s and a quiet meter is sampled every 30 s, so
#: 310 s is the first advance that can contain ten measured samples.
_PAST_CONFIRM_S = 310


def _leak_events(hass: HomeAssistant) -> list[dict[str, Any]]:
    """Every irrigation_maestro_leak payload fired from now on."""
    events: list[dict[str, Any]] = []
    hass.bus.async_listen("irrigation_maestro_leak", lambda event: events.append(event.data))
    return events


async def test_the_valve_sensor_alone_raises_the_alarm(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    state = runtime.leak_state(zone_id)
    assert state.active is True
    assert state.first_source == SOURCE_VALVE_SENSOR
    assert state.sources == {SOURCE_VALVE_SENSOR}


async def test_a_leak_sensor_already_on_at_startup_is_noticed(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A leak that began while Home Assistant was down has no state change left.

    Subscribing to transitions alone would ignore it forever, which is exactly
    the "capability declared, alarm silently never fires" failure this feature
    exists to remove.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")]
    )
    runtime = entry.runtime_data

    assert runtime.leak_state(runtime.zone_ids[0]).active is True


async def test_an_unreadable_leak_sensor_says_nothing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """ "unavailable" is not "no leak", and it is not a leak either."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "unavailable", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")]
    )
    runtime = entry.runtime_data

    await advance(hass, freezer, 120, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is False


async def test_flow_with_every_valve_closed_alone_raises_the_alarm(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The check only this component can make, because only it commanded the close."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    state = runtime.leak_state(zone_id)
    assert state.active is True
    assert state.first_source == SOURCE_NO_FLOW_CLOSED
    assert state.sources == {SOURCE_NO_FLOW_CLOSED}


async def test_a_drip_below_the_threshold_never_alarms(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.2", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    runtime = entry.runtime_data

    await advance(hass, freezer, 600, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is False


async def test_a_zero_threshold_does_not_make_a_dry_system_leak(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Threshold 0 means "any flow is a leak", not "no flow is a leak"."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")],
        {"leak_threshold_lpm": 0},
    )
    runtime = entry.runtime_data

    await advance(hass, freezer, 600, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is False


async def test_flow_that_stops_before_the_confirm_delay_never_alarms(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Post-cycle drainage runs above threshold briefly; that is not a leak.

    One burst on its own, which is the plain case. What it does NOT pin is the
    reset itself -- with the reset deleted this still passes, because nothing
    else ever accumulates. See the repeated-bursts test below for that.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "5.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    runtime = entry.runtime_data

    await advance(hass, freezer, 120, step=10.0)
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 600, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is False


async def test_repeated_bursts_that_each_stop_never_add_up_to_an_alarm(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Six minutes of drainage in three bursts is still not five unbroken ones.

    This is the mechanism, and the reason there is no separate post-close
    blanking window: without the reset, a system that drains for two minutes
    after every cycle would accumulate its way to an alarm over a few days
    while behaving perfectly.

    The events are asserted, not just the state at the end. An alarm raised in
    the third burst and withdrawn by the silence after it leaves the final
    state False while having notified the user of a leak that was drainage --
    which is the whole failure, and a closing assertion alone would miss it.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    runtime = entry.runtime_data
    events = _leak_events(hass)

    for _ in range(3):
        hass.states.async_set("sensor.flow", "5.0", {"unit_of_measurement": "L/min"})
        await advance(hass, freezer, 120, step=10.0)
        hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
        await advance(hass, freezer, 90, step=10.0)
        assert runtime.leak_state(runtime.zone_ids[0]).active is False

    assert events == []


async def test_a_zone_with_no_source_never_alarms_and_never_raises(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    runtime = entry.runtime_data

    await advance(hass, freezer, 900, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is False


async def test_both_sources_together_produce_one_alarm(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The real SONOFF SWV case: the firmware detects the same physical event.

    Its moisture sensor is not a probe, it is an alarm derived from the valve's
    own flow meter -- so on that hardware sources 1 and 2 see one leak twice.
    Two notifications for one event is noise the user cannot decode.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                flow_sensor="sensor.flow",
                leak_sensor="binary_sensor.a_leak",
            )
        ],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    events = _leak_events(hass)

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    state = runtime.leak_state(zone_id)
    assert state.sources == {SOURCE_NO_FLOW_CLOSED, SOURCE_VALVE_SENSOR}
    assert state.first_source == SOURCE_NO_FLOW_CLOSED
    assert len([event for event in events if event["state"] == "active"]) == 1


async def test_the_first_source_survives_the_second_arriving(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Same two sources, opposite order: "the valve told me" must stay first.

    Which one noticed is a diagnostic fact even at equal alarm, and on hardware
    without the firmware alarm only one of them can ever fire first.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                flow_sensor="sensor.flow",
                leak_sensor="binary_sensor.a_leak",
            )
        ],
    )
    runtime = entry.runtime_data
    events = _leak_events(hass)

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    state = runtime.leak_state(runtime.zone_ids[0])
    assert state.first_source == SOURCE_VALVE_SENSOR
    assert state.sources == {SOURCE_VALVE_SENSOR, SOURCE_NO_FLOW_CLOSED}
    # The alarm was already raised during setup, before this listener existed:
    # what matters is that the second source added none of its own.
    assert [event for event in events if event["state"] == "active"] == []


async def test_one_source_withdrawing_leaves_the_other_alarm_standing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """One alarm, two sources: losing one of them is not the end of the leak."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                flow_sensor="sensor.flow",
                leak_sensor="binary_sensor.a_leak",
            )
        ],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    await advance(hass, freezer, 60, step=10.0)

    state = runtime.leak_state(zone_id)
    assert state.active is True
    assert state.sources == {SOURCE_NO_FLOW_CLOSED}
    assert state.first_source == SOURCE_VALVE_SENSOR


async def test_the_last_source_withdrawing_clears_the_alarm(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    events = _leak_events(hass)

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert runtime.leak_state(zone_id).active is True

    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 120, step=10.0)

    state = runtime.leak_state(zone_id)
    assert state.active is False
    assert state.sources == frozenset()
    assert state.since is None
    assert [event["state"] for event in events] == ["active", "cleared"]


@pytest.mark.parametrize("valve_state", ["opening", "closing", "unavailable"])
async def test_an_uncertain_valve_supplies_no_leak_evidence(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, valve_state: str
) -> None:
    """Not-open is not closed, and only closed is evidence.

    The predicate is WaterAccountant.all_valves_closed, `all(is_closed)` rather
    than `not any(is_open)`, so a valve travelling between positions or gone
    unavailable claims no water and supplies no leak evidence either. The
    weaker test would call the system idle and read the water as a leak.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a", valve_state)
    hass.states.async_set("sensor.flow", "5.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data

    await advance(hass, freezer, 900, step=10.0)

    assert hass.states.get("valve.a").state == valve_state
    assert runtime.leak_state(runtime.zone_ids[0]).active is False


async def test_flow_through_an_open_valve_is_never_a_leak(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Water through an open valve is watering, whoever opened it."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "5.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    # After setup, so the watchdog's startup close-all does not undo it. The
    # watchdog's periodic check only acts past watchdog_max_min (70 min).
    park.force_state("valve.a", "open")
    await hass.async_block_till_done()

    await advance(hass, freezer, 900, step=10.0)

    assert hass.states.get("valve.a").state == "open"
    assert runtime.leak_state(runtime.zone_ids[0]).active is False


async def test_an_unreadable_meter_neither_confirms_nor_resets_the_window(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A gap is no evidence: it must not count as confirmation nor as a denial.

    Counting unobserved time would confirm a leak from data nobody read;
    resetting on it would let a flaky meter make a real leak unconfirmable. The
    window therefore accumulates MEASURED seconds only, and an outage simply
    contributes none of them.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 150, step=10.0)
    hass.states.async_set("sensor.flow", "unavailable", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 600, step=10.0)
    # Ten minutes of blindness confirmed nothing.
    assert runtime.leak_state(zone_id).active is False

    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 200, step=10.0)

    # Nor did it wipe the 150 s already measured: 150 + ~180 clears the window.
    assert runtime.leak_state(zone_id).active is True


async def test_an_active_alarm_survives_the_meter_becoming_unreadable(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Absence of evidence is not evidence of absence: only a reading clears."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert runtime.leak_state(zone_id).active is True

    hass.states.async_set("sensor.flow", "unavailable", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 300, step=10.0)

    assert runtime.leak_state(zone_id).active is True


async def test_each_zone_is_judged_by_its_own_sources(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A mixed installation must behave correctly for every zone separately."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("sensor.flow_a", "2.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("sensor.flow_b", "0.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("binary_sensor.b_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", flow_sensor="sensor.flow_a"),
            zone_data(
                "Beta",
                "valve.b",
                flow_sensor="sensor.flow_b",
                order=200,
                leak_sensor="binary_sensor.b_leak",
            ),
        ],
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert runtime.leak_state(alpha).active is True
    assert runtime.leak_state(beta).active is False


async def test_an_unrelated_config_change_does_not_clear_a_live_alarm(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Detectors are diffed on a config change, never dropped and recreated.

    Editing the settle pause must not silently end an alarm, nor restart a
    confirmation window that was seconds from closing -- the same reason
    WaterAccountant.rebuild leaves a ledger it did not have to touch alone.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    raised_at = runtime.leak_state(zone_id).since
    events = _leak_events(hass)

    hass.config_entries.async_update_entry(entry, options={**entry.options, "settle_pause_s": 45})
    await hass.async_block_till_done()

    state = runtime.leak_state(zone_id)
    assert state.active is True
    # The same alarm, not a fresh one wearing the same name.
    assert state.since == raised_at
    assert events == []


async def test_a_removed_zone_takes_its_alarm_with_it(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("binary_sensor.b_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a"),
            zone_data("Beta", "valve.b", order=200, leak_sensor="binary_sensor.b_leak"),
        ],
    )
    runtime = entry.runtime_data
    beta = runtime.zone_ids[1]
    assert runtime.leak_state(beta).active is True

    hass.config_entries.async_remove_subentry(entry, beta)
    await hass.async_block_till_done()

    assert runtime.leak_detector(beta) is None
    assert runtime.leak_state(beta).active is False


async def test_a_persistent_leak_repeats_on_its_own_interval(
    hass: HomeAssistant,
    freezer: FrozenDateTimeFactory,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """One alarm, then a reminder every leak_repeat_min -- not one per detection.

    Driven by the alarm's own clock rather than by how often a source reports,
    so a leak seen only by the valve's sensor (which changes state once and
    then says nothing) repeats exactly like a metered one.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")],
        {"leak_repeat_min": 5},
    )

    with caplog.at_level("WARNING"):
        await advance(hass, freezer, 240, step=30.0)
        assert "still reporting a leak" not in caplog.text

        await advance(hass, freezer, 120, step=30.0)
        assert caplog.text.count("still reporting a leak") == 1

        await advance(hass, freezer, 300, step=30.0)
        assert caplog.text.count("still reporting a leak") == 2
