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
from custom_components.irrigation_maestro.engine.metering import HUB_SCOPE
from custom_components.irrigation_maestro.leak import (
    SOURCE_NO_FLOW_CLOSED,
    SOURCE_VALVE_SENSOR,
)
from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigSubentry
from homeassistant.core import HomeAssistant

from .mocks import MockValvePark
from .test_session import START, advance, mock_weather, setup_hub, zone_data

#: The confirmation window is 300 s and a quiet meter is sampled every 30 s, so
#: 310 s is the first advance that can contain ten measured samples.
_PAST_CONFIRM_S = 310
#: For a window that starts partway through a test rather than at setup, where
#: the meter's 30 s cadence no longer lines up with the window's own start and
#: up to one whole sample can fall outside it.
_WELL_PAST_CONFIRM_S = 400


def _leak_events(hass: HomeAssistant) -> list[dict[str, Any]]:
    """Every irrigation_maestro_leak payload fired from now on."""
    events: list[dict[str, Any]] = []
    hass.bus.async_listen("irrigation_maestro_leak", lambda event: events.append(event.data))
    return events


async def _reconfigure_zone(hass: HomeAssistant, entry: Any, zone_id: str, **changes: Any) -> None:
    """Edit one zone's stored data in place, as the update_zone service does."""
    subentry = entry.subentries[zone_id]
    hass.config_entries.async_update_subentry(entry, subentry, data={**subentry.data, **changes})
    await hass.async_block_till_done()


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
    exists to remove. It is confirmed rather than instant: after a restart both
    timestamps are the restore, so the window runs from start-up -- the safe
    direction, since we cannot know how long it had been asserting.
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

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

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

    await advance(hass, freezer, 600, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is False


async def test_a_probe_wet_while_its_own_zone_waters_never_alarms(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The ground-probe reading of "moisture", and the alarm-fatigue failure.

    On SONOFF SWV the sensor means "water is passing while I am closed", so it
    only ever speaks with its valve shut and the gate costs nothing. On
    hardware where the same device class is a real ground probe, the probe
    under a sprinkler is wet for the whole of its own zone's cycle -- so
    without the gate the integration would raise a leak alarm on every single
    watering, which is how a panel becomes something people ignore.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, leak_sensor="binary_sensor.a_leak")]
    )
    runtime = entry.runtime_data
    events = _leak_events(hass)
    # The zone is watering and its own probe goes wet, exactly as it does on
    # every cycle. (After setup, so the watchdog's startup close-all is done.)
    park.force_state("valve.a", "open")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})

    await advance(hass, freezer, 900, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is False
    assert events == []


async def test_the_source_1_window_starts_at_the_close_not_at_the_wetting(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A probe wet since mid-cycle has not been "wet while shut" for any of it.

    The window runs from whichever came later, the sensor asserting or the
    valve closing -- so a cycle that ends with the probe already wet starts
    counting at the close. Reading the sensor's own timestamp alone would
    confirm instantly at every close, which is the same every-cycle alarm the
    gate exists to remove.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, leak_sensor="binary_sensor.a_leak")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    park.force_state("valve.a", "open")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    await advance(hass, freezer, 600, step=10.0)

    park.force_state("valve.a", "closed")
    await advance(hass, freezer, 120, step=10.0)
    # Ten minutes wet, but only two of them shut.
    assert runtime.leak_state(zone_id).active is False

    await advance(hass, freezer, 240, step=10.0)
    assert runtime.leak_state(zone_id).active is True


async def test_the_source_1_window_runs_from_the_sensor_not_only_from_the_close(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The other half of the max, and the half that matters on real hardware.

    A valve is shut most of the day, so timing the window from the close alone
    would make source 1 effectively instant -- deleting the confirmation
    window precisely where this integration lives, on a valve that has been
    closed since last night when its sensor finally speaks.
    """
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

    # The valve has been shut far longer than the confirmation window.
    await advance(hass, freezer, 400, step=10.0)
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    await advance(hass, freezer, 120, step=10.0)

    # Two minutes since the sensor spoke, whatever the valve has been doing.
    assert runtime.leak_state(zone_id).active is False

    await advance(hass, freezer, 240, step=10.0)

    assert runtime.leak_state(zone_id).active is True


async def test_source_1_is_gated_on_its_own_valve_not_on_every_valve(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Zone B watering must not mute zone A's own valve alarm.

    All-closed would be the wrong gate here: a valve that reports a leak while
    a different zone is watering is exactly when a seeping seat is most worth
    knowing about, and the SWV alarm is a statement about its own valve alone.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", minutes=10, leak_sensor="binary_sensor.a_leak"),
            zone_data("Beta", "valve.b", minutes=10, order=200),
        ],
    )
    runtime = entry.runtime_data
    alpha = runtime.zone_ids[0]
    park.force_state("valve.b", "open")  # a different zone is watering
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert hass.states.get("valve.b").state == "open"
    assert runtime.leak_state(alpha).active is True
    assert runtime.leak_state(alpha).first_source == SOURCE_VALVE_SENSOR


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


async def test_a_valve_opening_resets_the_flow_window(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The same accumulation defect as the drip case, on the valve path.

    Drainage before one cycle and drainage after a later one are separated by
    the whole of the watering between them. Without the reset on "something is
    open", those two unrelated stretches add up across it and confirm a leak
    that never ran for five unbroken minutes -- exactly what the below-threshold
    reset prevents on the flow path, left unguarded here.

    The first stretch is deliberately long enough that, added to the second,
    it would clear the window; neither reaches it alone.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    events = _leak_events(hass)

    await advance(hass, freezer, 150, step=10.0)
    park.force_state("valve.a", "open")  # a cycle starts
    await advance(hass, freezer, 180, step=10.0)
    park.force_state("valve.a", "closed")  # and ends
    await advance(hass, freezer, 240, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is False
    assert events == []


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
    without the firmware alarm only one of them can ever fire first. The meter
    is dry until the sensor has confirmed, so the order is the test's and not
    the scheduler's -- both windows are leak_confirm_s long and starting them
    together would decide first_source by whichever timer happened to fire.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
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
    assert runtime.leak_state(runtime.zone_ids[0]).first_source == SOURCE_VALVE_SENSOR

    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)

    state = runtime.leak_state(runtime.zone_ids[0])
    assert state.first_source == SOURCE_VALVE_SENSOR
    assert state.sources == {SOURCE_VALVE_SENSOR, SOURCE_NO_FLOW_CLOSED}
    assert len([event for event in events if event["state"] == "active"]) == 1


async def test_one_source_withdrawing_leaves_the_other_alarm_standing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """One alarm, two sources: losing one of them is not the end of the leak.

    Staggered for the same reason as the previous test: the sensor confirms
    first against a dry meter, then the flow starts.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
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
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)
    assert runtime.leak_state(zone_id).sources == {SOURCE_VALVE_SENSOR, SOURCE_NO_FLOW_CLOSED}

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


async def test_a_shared_line_meter_raises_one_alarm_for_the_system(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Two zones behind one meter: which of them leaks is unanswerable.

    Whether the SYSTEM leaks is not, and that alarm has to exist. Keying
    detection by zone left every shared-line-meter installation with no source
    2 at all, while the documentation promised that a flow meter was enough --
    a false claim about a safety feature. One alarm on the hub scope, named
    honestly, rather than none and rather than one per zone.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("sensor.line", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a"), zone_data("Beta", "valve.b", order=200)],
        {"line_flow_sensor": "sensor.line"},
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids
    events = _leak_events(hass)

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert runtime.leak_state(HUB_SCOPE).active is True
    assert runtime.leak_state(HUB_SCOPE).first_source == SOURCE_NO_FLOW_CLOSED
    # No zone is implicated, because none can be.
    assert runtime.leak_state(alpha).active is False
    assert runtime.leak_state(beta).active is False
    active = [event for event in events if event["state"] == "active"]
    assert len(active) == 1
    assert active[0]["scope"] == HUB_SCOPE
    assert active[0]["zone_id"] is None


async def test_a_line_meter_serving_one_zone_still_names_that_zone(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The hub scope is for the unanswerable case, not a blanket fallback.

    With a single zone behind the line meter the question does have an answer,
    and the alarm must give it rather than retreat to "somewhere in the system".
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.line", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a")], {"line_flow_sensor": "sensor.line"}
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    events = _leak_events(hass)

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert runtime.leak_state(zone_id).active is True
    assert runtime.leak_state(HUB_SCOPE).active is False
    active = [event for event in events if event["state"] == "active"]
    assert len(active) == 1
    assert active[0]["zone_id"] == zone_id


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
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    raised_at = runtime.leak_state(zone_id).since
    events = _leak_events(hass)

    hass.config_entries.async_update_entry(entry, options={**entry.options, "settle_pause_s": 45})
    await hass.async_block_till_done()

    state = runtime.leak_state(zone_id)
    assert state.active is True
    # The same alarm, not a fresh one wearing the same name.
    assert state.since == raised_at
    assert events == []


async def test_a_config_change_does_not_restart_a_confirmation_window(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Source 1's elapsed time comes from the entities, not from a clock of ours.

    So a rebuild in the middle of a window resumes it rather than resetting it.
    A user editing settings while a leak is confirming would otherwise postpone
    the alarm every time they saved.
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

    await advance(hass, freezer, 200, step=10.0)
    hass.config_entries.async_update_entry(entry, options={**entry.options, "settle_pause_s": 45})
    await hass.async_block_till_done()
    assert runtime.leak_state(runtime.zone_ids[0]).active is False

    await advance(hass, freezer, 150, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is True


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
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert runtime.leak_state(beta).active is True

    hass.config_entries.async_remove_subentry(entry, beta)
    await hass.async_block_till_done()

    assert runtime.leak_detector(beta) is None
    assert runtime.leak_state(beta).active is False


async def test_removing_the_leak_sensor_withdraws_the_alarm_it_raised(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A source can only be withdrawn through itself, so removing it must withdraw.

    Otherwise the ordinary act of distrusting a sensor and clearing it leaves
    an alarm nothing can ever take down: no subscription, no evaluation, and a
    reminder every leak_repeat_min until Home Assistant restarts -- which under
    Task 8's close_and_block is an installation that will not water.
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
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert runtime.leak_state(zone_id).active is True
    events = _leak_events(hass)

    # "" rather than a missing key: update_zone writes the field
    # unconditionally, so that is how a cleared sensor actually reaches us.
    await _reconfigure_zone(hass, entry, zone_id, leak_sensor="")

    assert runtime.leak_state(zone_id).active is False
    assert [event["state"] for event in events] == ["cleared"]


async def test_removing_the_flow_meter_withdraws_the_alarm_it_raised(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The same hole on source 2: note_flow is the only path that can withdraw."""
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

    await _reconfigure_zone(hass, entry, zone_id, flow_sensor="")

    assert runtime.leak_state(zone_id).active is False


async def test_repointing_a_meter_to_the_hub_scope_moves_the_alarm(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Worse than a plain removal: the stale alarm would double with a fresh one.

    Put a second zone behind a zone's meter and its scope becomes HUB_SCOPE, so
    samples arrive under the hub from then on. Without the withdrawal, the
    zone's stale alarm and the hub's new one would stand together for one
    physical leak -- the double alarm the whole design forbids, arriving
    through the configuration door rather than the sensor one.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    runtime = entry.runtime_data
    alpha = runtime.zone_ids[0]
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert runtime.leak_state(alpha).active is True

    hass.config_entries.async_add_subentry(
        entry,
        ConfigSubentry(
            data=zone_data("Beta", "valve.b", order=200, flow_sensor="sensor.flow"),
            subentry_type="zone",
            title="Beta",
            unique_id=None,
        ),
    )
    await hass.async_block_till_done()

    # The zone can no longer be blamed, so it is no longer accused.
    assert runtime.leak_state(alpha).active is False

    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)

    assert runtime.leak_state(HUB_SCOPE).active is True
    assert runtime.leak_state(alpha).active is False


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
        # A short confirmation window so the reminder, not the confirmation,
        # is what this test measures.
        {"leak_repeat_min": 5, "leak_confirm_s": 30},
    )

    with caplog.at_level("WARNING"):
        await advance(hass, freezer, 240, step=30.0)
        assert "still reporting a leak" not in caplog.text

        await advance(hass, freezer, 120, step=30.0)
        assert caplog.text.count("still reporting a leak") == 1

        await advance(hass, freezer, 300, step=30.0)
        assert caplog.text.count("still reporting a leak") == 2
