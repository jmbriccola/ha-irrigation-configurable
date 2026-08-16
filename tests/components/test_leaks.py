"""Leak sourcing: flow while every valve is closed, and the valve's own alarm.

A dedicated file rather than test_safety_extra.py, which is the *in-cycle*
safety file and is already large. This is its mirror image: everything here
happens with the valves shut.

The two sources are the same physical detection on the reference hardware -- a
SONOFF SWV's "moisture" sensor is an alarm derived from its own internal flow
meter, not a ground probe -- so the tests that matter most are the ones proving
they converge into a single alarm.
"""

from dataclasses import replace
from datetime import timedelta
from typing import Any

import pytest
from custom_components.irrigation_maestro.const import DOMAIN
from custom_components.irrigation_maestro.engine.metering import HUB_SCOPE
from custom_components.irrigation_maestro.leak import (
    SOURCE_NO_FLOW_CLOSED,
    SOURCE_VALVE_SENSOR,
    LeakDetector,
)
from custom_components.irrigation_maestro.session import (
    _SUPPLY_EVIDENCE_GRACE_S,
    PHASE_WATERING,
)
from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigSubentry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import issue_registry as ir
from homeassistant.util import dt as dt_util
from homeassistant.util.async_ import get_scheduled_timer_handles

from .mocks import BEHAVIOR_STUCK, MockValvePark
from .test_session import (
    START,
    advance,
    mock_weather,
    open_valves,
    setup_hub,
    zone_data,
)

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


#: Enabling only the leak event is deliberate: every other essential event is
#: left unconfigured, so a test that counts messages counts leak messages.
_LEAK_NOTIFICATIONS: dict[str, Any] = {
    "notifications": {"leak": {"enabled": True, "services": ["phone"]}}
}


def _notify_target(hass: HomeAssistant) -> list[dict[str, Any]]:
    """Register notify.phone and collect every body pushed to it."""
    sent: list[dict[str, Any]] = []

    async def handler(call: ServiceCall) -> None:
        sent.append(dict(call.data))

    hass.services.async_register("notify", "phone", handler)
    return sent


def _bodies(sent: list[dict[str, Any]]) -> list[str]:
    return [str(message["message"]) for message in sent]


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


# What the component actually does about it -----------------------------------


async def test_a_persistent_leak_notifies_once_then_at_the_repeat_interval(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Not one notification per detection: the condition persists, the noise must not."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    sent = _notify_target(hass)
    await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")],
        # A short confirmation window so the reminder, not the confirmation, is
        # what this test measures.
        {**_LEAK_NOTIFICATIONS, "leak_repeat_min": 5, "leak_confirm_s": 30},
    )

    await advance(hass, freezer, 240, step=30.0)
    assert len(sent) == 1  # the transition, and nothing since

    await advance(hass, freezer, 120, step=30.0)
    assert len(sent) == 2  # past the first repeat interval

    await advance(hass, freezer, 300, step=30.0)
    assert len(sent) == 3


async def test_a_second_source_agreeing_sends_no_second_notification(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """One physical leak seen twice is one leak.

    On SONOFF SWV both sources ARE the same detection -- the moisture sensor is
    an alarm derived from the valve's own flow meter -- so a second
    notification would be a second alarm for an event that did not happen
    twice, and the user has no way to decode it.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    sent = _notify_target(hass)
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
        _LEAK_NOTIFICATIONS,
    )
    runtime = entry.runtime_data

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert len(sent) == 1

    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    state = runtime.leak_state(runtime.zone_ids[0])
    assert state.sources == {SOURCE_NO_FLOW_CLOSED, SOURCE_VALVE_SENSOR}
    assert len(sent) == 1


async def test_the_raise_message_says_the_valve_reports_a_leak(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A "moisture" sensor is not necessarily a ground probe.

    On SONOFF SWV it is an alarm derived from the valve's own flow meter --
    "water is passing while I am closed" -- mapped to the nearest device class.
    On other hardware it really is a probe. Either wording that presumes one is
    false for half of all installations, so the message reports what is known.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    sent = _notify_target(hass)
    await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")],
        _LEAK_NOTIFICATIONS,
    )

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    body = _bodies(sent)[0]
    assert "Alpha" in body
    assert "the valve of this zone reports a leak" in body
    for presumption in ("ground", "soil", "probe"):
        assert presumption not in body.lower()


async def test_a_hub_alarm_names_the_system_and_no_zone(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A shared meter genuinely cannot say which zone leaks, so it must not."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("sensor.line", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    sent = _notify_target(hass)
    await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a"), zone_data("Beta", "valve.b", order=200)],
        {**_LEAK_NOTIFICATIONS, "line_flow_sensor": "sensor.line"},
    )

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    body = _bodies(sent)[0]
    assert "Alpha" not in body
    assert "Beta" not in body
    assert "which zone is leaking cannot be told" in body


async def test_the_repeat_notice_restates_the_sources_and_dates_the_confirmation(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The repeat is the only place a second source can ever surface.

    It stayed silent when it arrived, deliberately, so the reminder lists every
    source currently reporting rather than only the one that raised the alarm.
    And it dates the CONFIRMATION, never the leak: a de-configure-and-restore
    yields a fresh timestamp, so no message may claim it measures when the
    water started. The date is spelled out because at the default six-hour
    interval a bare "05:05" is a time the reader takes for today.

    It carries the action note too. This is the one message a standing alarm
    keeps sending, so a close_and_block user who reads only reminders would
    otherwise never learn that cycles are being refused.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    sent = _notify_target(hass)
    await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                at="23:00",  # no cycle inside the window this test measures
                flow_sensor="sensor.flow",
                leak_sensor="binary_sensor.a_leak",
            )
        ],
        {**_LEAK_NOTIFICATIONS, "leak_repeat_min": 20, "leak_action": "close_and_block"},
    )

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)
    assert len(sent) == 1  # the second source added nothing

    await advance(hass, freezer, 20 * 60, step=60.0)

    body = _bodies(sent)[1]
    assert "the valve's own sensor" in body
    assert "flow measured with every valve closed" in body
    assert "Confirmed at 2026-07-17 05:05" in body
    assert "No new cycle starts" in body


async def test_clearing_sends_the_closing_notice_and_deletes_the_issue(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A notification is read and forgotten; an issue stays -- until it must not."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    sent = _notify_target(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")],
        _LEAK_NOTIFICATIONS,
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    registry = ir.async_get(hass)

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert registry.async_get_issue(DOMAIN, f"leak_{zone_id}") is not None

    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 120, step=10.0)

    assert runtime.leak_state(zone_id).active is False
    assert registry.async_get_issue(DOMAIN, f"leak_{zone_id}") is None
    assert len(sent) == 2
    assert "cleared" in _bodies(sent)[1]


async def test_a_removed_zone_takes_its_repairs_issue_with_it(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The detector is dropped without ever withdrawing, so nothing else deletes it."""
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
    registry = ir.async_get(hass)
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert registry.async_get_issue(DOMAIN, f"leak_{beta}") is not None

    hass.config_entries.async_remove_subentry(entry, beta)
    await hass.async_block_till_done()

    assert registry.async_get_issue(DOMAIN, f"leak_{beta}") is None


async def test_an_alarm_that_ended_while_we_were_down_leaves_no_issue_behind(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The alarm is memory-only; the issue registry is not.

    The restart is walked rather than simulated: a real alarm raises a real
    issue, the entry is unloaded with both standing, the water stops while we
    are down, and setup runs again. The alarm does not come back -- by design,
    a restart is not evidence a leak is still running -- so without the
    reconciliation the issue would stand for ever with nothing behind it and
    no path left that could ever delete it.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    registry = ir.async_get(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    zone_id = entry.runtime_data.zone_ids[0]
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert registry.async_get_issue(DOMAIN, f"leak_{zone_id}") is not None

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    # Down, and the issue survives us -- which is the whole point of an issue.
    assert registry.async_get_issue(DOMAIN, f"leak_{zone_id}") is not None
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    runtime = entry.runtime_data
    assert runtime.leak_state(zone_id).active is False
    assert registry.async_get_issue(DOMAIN, f"leak_{zone_id}") is None


async def test_the_default_action_re_closes_the_master_and_registers_the_command(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """What the re-close genuinely buys: a valve left open by a lost command.

    The master left open after a cycle whose close never landed is exactly that
    case, and it is the one shape in which a leak can be confirmed with a valve
    still open -- source 2 needs every valve closed, but the zone's own sensor
    only needs its own. The valve is deliberately stuck, so the pending ledger
    entry survives for the test to find: a re-close read as manual intervention
    would abort the next session and arm the manual-stop block.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.master")
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak")],
        {"master_valve": "valve.master", "leak_confirm_s": 30},
    )
    runtime = entry.runtime_data
    park.set_behavior("valve.master", BEHAVIOR_STUCK)
    park.force_state("valve.master", "open")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    await hass.async_block_till_done()
    before = len(park.commands)

    # Only just past the confirmation window: a ledger entry expires after 60 s
    # (deliberately, so an unactuated command cannot mask a later manual close),
    # and this test is about what was armed, not about how long it survives.
    await advance(hass, freezer, 60, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is True
    assert ("close_valve", "valve.master") in park.commands[before:]
    assert runtime.ledger_consume("valve.master", "close") is True


async def test_the_re_close_leaves_a_valve_that_already_reports_closed_alone(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A ledger entry for a command that produces no transition is a trap.

    It sits for its whole TTL and absorbs the next genuine manual close, which
    is the defect the close paths were swept for. The re-close is guarded the
    same way, so the zone valve -- which source 1 requires to be closed before
    it will confirm anything -- is never commanded at all.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")],
    )
    runtime = entry.runtime_data
    before = len(park.commands)

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is True
    assert park.commands[before:] == []
    assert runtime.ledger_consume("valve.a", "close") is False


async def test_the_notify_action_commands_no_valve_at_all(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.master")
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak")],
        {"master_valve": "valve.master", "leak_confirm_s": 30, "leak_action": "notify"},
    )
    runtime = entry.runtime_data
    park.set_behavior("valve.master", BEHAVIOR_STUCK)
    park.force_state("valve.master", "open")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    await hass.async_block_till_done()
    before = len(park.commands)

    await advance(hass, freezer, 120, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is True
    assert park.commands[before:] == []


async def test_the_re_close_does_not_reach_past_a_running_cycle(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """close promises that cycles continue, and closing the master would end one.

    A zone's own sensor can alarm while a DIFFERENT zone waters -- that is the
    whole reason source 1 is gated on its own valve rather than on all of them.
    The session owns every managed valve while it runs, and re-asserting a
    closure behind its back would abort a legitimate cycle on a zone nothing
    has implicated.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    park.add("valve.master")
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak"),
            zone_data("Beta", "valve.b", minutes=20, order=200),
        ],
        {"master_valve": "valve.master", "leak_confirm_s": 30},
    )
    runtime = entry.runtime_data

    await advance(hass, freezer, 31 * 60)  # Beta's cycle starts at 05:30
    assert hass.states.get("valve.b").state == "open"
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    before = len(park.commands)

    await advance(hass, freezer, 120, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is True
    assert ("close_valve", "valve.master") not in park.commands[before:]
    assert hass.states.get("valve.b").state == "open"


async def test_the_default_action_does_not_block_the_next_cycle(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """close is deliberately not close_and_block: it dries nothing on a false positive."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10, leak_sensor="binary_sensor.a_leak")],
        {"leak_confirm_s": 30},
    )
    runtime = entry.runtime_data
    assert runtime.hub.leak_action == "close"

    await advance(hass, freezer, 31 * 60)

    assert runtime.leak_state(runtime.zone_ids[0]).active is True
    assert hass.states.get("valve.a").state == "open"


async def test_close_and_block_refuses_the_cycle_and_records_why(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A refusal nobody can see is indistinguishable from a bug."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10, leak_sensor="binary_sensor.a_leak")],
        {"leak_confirm_s": 30, "leak_action": "close_and_block"},
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)

    assert hass.states.get("valve.a").state == "closed"
    outcome = runtime.state.last_outcome(zone_id)
    assert outcome is not None
    assert outcome["result"] == "skipped"
    assert outcome["reason_key"] == "leak"


async def test_close_and_block_still_refuses_a_manual_run(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """ "No new cycles" includes the one the user asks for by hand.

    The escape hatches are the honest ones: fix the leak (the alarm clears on
    evidence the water stopped), remove the source that reported it (which
    withdraws), or choose a different leak action.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak")],
        {"leak_confirm_s": 30, "leak_action": "close_and_block"},
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    await advance(hass, freezer, 120, step=10.0)
    assert runtime.leak_state(zone_id).active is True

    await runtime.async_run_zone(zone_id)
    await advance(hass, freezer, 120, step=10.0)

    # The valve was already closed, so its state proves nothing on its own:
    # the refusal is what the outcome says, exactly as for a scheduled run.
    assert hass.states.get("valve.a").state == "closed"
    outcome = runtime.state.last_outcome(zone_id)
    assert outcome is not None
    assert outcome["result"] == "skipped"
    assert outcome["reason_key"] == "leak"


async def test_a_hub_alarm_blocks_every_zone_behind_that_meter_and_no_other(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A hub alarm has no single zone to block, so it blocks the set that could leak.

    Blocking nothing would make close_and_block silently weaker on exactly the
    installations where the alarm is least specific. Blocking everything would
    stop a zone whose own meter says it is dry, on evidence from a meter that
    does not serve it.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    for entity_id in ("valve.a", "valve.b", "valve.c"):
        park.add(entity_id)
    hass.states.async_set("sensor.line", "2.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("sensor.gamma", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a"),
            zone_data("Beta", "valve.b", order=200),
            zone_data("Gamma", "valve.c", order=300, flow_sensor="sensor.gamma"),
        ],
        {
            "line_flow_sensor": "sensor.line",
            "leak_action": "close_and_block",
        },
    )
    runtime = entry.runtime_data
    alpha, beta, gamma = runtime.zone_ids

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert runtime.leak_state(HUB_SCOPE).active is True
    assert runtime.leak_blocked_zone_ids() == {alpha, beta}
    assert gamma not in runtime.leak_blocked_zone_ids()


async def test_a_hub_alarm_on_a_meter_no_zone_claims_blocks_every_zone(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The judgement half of the rule, rather than the derivation half.

    Every zone has its own meter and a line meter measures the whole
    installation on top, so no zone resolves to the meter that raised the
    alarm. The derived set is empty -- and an empty set would make
    close_and_block do nothing at all on the one topology where the alarm can
    point at nobody. That meter sits upstream of every zone, so every zone is
    blocked.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("sensor.line", "2.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("sensor.a_flow", "0.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("sensor.b_flow", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", flow_sensor="sensor.a_flow"),
            zone_data("Beta", "valve.b", order=200, flow_sensor="sensor.b_flow"),
        ],
        {"line_flow_sensor": "sensor.line", "leak_action": "close_and_block"},
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)

    assert runtime.leak_state(HUB_SCOPE).active is True
    # Each zone's own meter is dry, so neither is accused on its own account.
    assert runtime.leak_state(alpha).active is False
    assert runtime.leak_state(beta).active is False
    assert runtime.leak_zone_ids(HUB_SCOPE) == [alpha, beta]
    assert runtime.leak_blocked_zone_ids() == {alpha, beta}


async def test_two_alarms_raising_together_arm_one_ledger_entry_for_the_master(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """One transition can retire at most one entry, however many alarms wanted it.

    Two zone alarms confirming in the same turn both find the master open and
    both would arm a close. The single close that follows retires one, and the
    survivor sits for its whole TTL where it can absorb the next genuine manual
    close -- the trap Task 1 was swept for, arriving through a second alarm
    instead of a second call.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    park.add("valve.master")
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    hass.states.async_set("binary_sensor.b_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak"),
            zone_data("Beta", "valve.b", at="23:00", order=200, leak_sensor="binary_sensor.b_leak"),
        ],
        {"master_valve": "valve.master", "leak_confirm_s": 30},
    )
    runtime = entry.runtime_data
    park.set_behavior("valve.master", BEHAVIOR_STUCK)
    park.force_state("valve.master", "open")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    hass.states.async_set("binary_sensor.b_leak", "on", {"device_class": "moisture"})
    await hass.async_block_till_done()
    before = len(park.commands)

    await advance(hass, freezer, 60, step=10.0)

    alpha, beta = runtime.zone_ids
    assert runtime.leak_state(alpha).active is True
    assert runtime.leak_state(beta).active is True
    assert park.commands[before:].count(("close_valve", "valve.master")) == 1
    assert runtime.ledger_consume("valve.master", "close") is True
    assert runtime.ledger_consume("valve.master", "close") is False


async def test_the_clearing_notice_does_not_promise_cycles_that_are_still_blocked(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """One physical leak, two scopes, and only one of them recovers.

    A zone with its own leak sensor sitting behind a shared line meter raises
    a zone alarm from its sensor AND a hub alarm from the meter. The sensor
    recovering clears the first; the hub alarm still blocks that zone and its
    neighbour, so "new cycles are allowed again" would be false at the instant
    it was sent.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("sensor.line", "2.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    sent = _notify_target(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak"),
            zone_data("Beta", "valve.b", at="23:00", order=200),
        ],
        {
            **_LEAK_NOTIFICATIONS,
            "line_flow_sensor": "sensor.line",
            "leak_action": "close_and_block",
        },
    )
    runtime = entry.runtime_data
    alpha = runtime.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert runtime.leak_state(alpha).active is True
    assert runtime.leak_state(HUB_SCOPE).active is True

    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    await advance(hass, freezer, 30, step=10.0)

    assert runtime.leak_state(alpha).active is False
    assert alpha in runtime.leak_blocked_zone_ids()  # the hub alarm still stands
    cleared = next(body for body in _bodies(sent) if "cleared" in body)
    assert "allowed again" not in cleared
    assert "still blocked by another leak alarm" in cleared


async def test_the_action_note_never_asserts_a_close_that_is_not_performed(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """One message, two scenarios, and it has to be true in both.

    The note used to be written in the indicative and chosen from a live read
    of ``session.active``, which made it false twice over. A running session is
    not an edge case for the skip -- it is the scenario the skip exists for --
    and the reading was taken in one turn while ``async_close_for_leak`` took
    its own when the background task ran, so "nothing intervenes" was the only
    thing holding the two together.

    Worse, the other branch asserted a close that is essentially never
    performed: ``async_close_for_leak`` skips a controller already closed, and
    a ``no_flow_closed`` alarm can only raise once every managed valve has been
    shut for the whole confirmation window -- so at the moment that sentence
    was sent, nothing was commanded at all. The Repairs notice on the same fact
    has always been modal ("can re-close"); the two surfaces disagreed.

    So the same modal note is asserted here in the two states that used to
    produce different indicative claims, and it is asserted not to state either
    as a thing already done.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    park.add("valve.master")
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    sent = _notify_target(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak"),
            zone_data("Beta", "valve.b", minutes=20, order=200),
        ],
        {**_LEAK_NOTIFICATIONS, "master_valve": "valve.master", "leak_confirm_s": 30},
    )
    runtime = entry.runtime_data

    await advance(hass, freezer, 31 * 60)  # Beta's cycle starts at 05:30
    assert hass.states.get("valve.b").state == "open"
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})

    await advance(hass, freezer, 120, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is True
    while_running = _bodies(sent)[0]
    assert "commanded closed again if either is still open" in while_running
    assert "not at all while a cycle is running" in while_running

    # The same alarm again with nothing running, and nothing open to command:
    # Beta's cycle has ended, so every managed valve is shut and the re-close
    # will touch none of them. The note must not have changed its story.
    sent.clear()
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    await advance(hass, freezer, 120, step=10.0)
    await advance(hass, freezer, 30 * 60, step=30.0)
    assert open_valves(hass) == set()
    sent.clear()
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    await advance(hass, freezer, 120, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is True
    while_idle = _bodies(sent)[0]
    note = "Configured action:"
    assert while_idle[while_idle.index(note) :] == while_running[while_running.index(note) :]


async def test_an_unrecognised_leak_action_is_reported_rather_than_silently_defaulted(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Falling back is right; falling back in silence is not.

    A user who mistypes the action believes they configured one thing and gets
    another, and the failure is least visible exactly where it matters most.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a")], {"leak_action": "close_and_pray"}
    )
    runtime = entry.runtime_data
    registry = ir.async_get(hass)

    assert runtime.hub.leak_action == "close"
    issue = registry.async_get_issue(DOMAIN, "leak_action_invalid")
    assert issue is not None
    assert issue.translation_placeholders == {"value": "close_and_pray"}

    hass.config_entries.async_update_entry(
        entry, options={**entry.options, "leak_action": "notify"}
    )
    await hass.async_block_till_done()

    assert registry.async_get_issue(DOMAIN, "leak_action_invalid") is None


# Source 3: the water supply, which is not a leak ---------------------------
#
# It lives in this file because it is the third thing a valve's sensors can
# say about water, and nowhere else in the suite watches those sensors. It
# must never touch the leak alarm, the leak event or the leak repairs: with no
# water there is no leak, there is nothing to water with.

#: Only the anomaly event is enabled, so a test that counts messages counts
#: supply messages -- the supply reports on the anomaly channel, never on the
#: leak one.
_SUPPLY_NOTIFICATIONS: dict[str, Any] = {
    "notifications": {"anomaly": {"enabled": True, "services": ["phone"]}}
}


def _supply(hass: HomeAssistant, state: str, entity_id: str = "binary_sensor.a_supply") -> None:
    """Set a supply sensor. "on" is the PROBLEM, i.e. there is NO water."""
    hass.states.async_set(entity_id, state, {"device_class": "problem"})


def _pending_supply_wakes(hass: HomeAssistant) -> int:
    """How many supply confirmation windows are armed on the event loop.

    Reaches into the loop's own scheduled handles because that is the only
    place the thing being asserted exists: see the test that uses it. The
    shape of a handle armed by ``async_call_later`` -- a HassJob as the last
    argument -- is the same one the test harness's own lingering-timer check
    reads.
    """
    count = 0
    for handle in get_scheduled_timer_handles(hass.loop):
        if handle.cancelled() or not handle._args:
            continue
        target = getattr(handle._args[-1], "target", None)
        # Unwrap the functools.partial that carries the zone id.
        func = getattr(target, "func", target)
        if getattr(func, "__name__", None) == "_on_supply_wake":
            count += 1
    return count


async def test_water_supply_polarity_on_means_no_water(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """device_class problem: "on" is the problem, i.e. the water is gone.

    The entity name reads the other way round and this is the mistake made on
    the first attempt.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "off")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", water_supply_sensor="binary_sensor.a_supply")],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    assert runtime.water_supply_missing(zone_id) is False

    _supply(hass, "on")
    await hass.async_block_till_done()
    assert runtime.water_supply_missing(zone_id) is True


@pytest.mark.parametrize("reading", ["unavailable", "unknown", "off"])
async def test_an_uncertain_supply_sensor_is_not_treated_as_missing_water(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, reading: str
) -> None:
    """Uncertainty resolves to the safe side: unavailable is not "no water".

    Withholding water on a reading nobody can vouch for would let a flaky
    sensor dry the garden, which is the one failure this feature must not
    introduce while removing another.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, reading)
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", water_supply_sensor="binary_sensor.a_supply")],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    assert runtime.water_supply_missing(zone_id) is False
    assert runtime.water_supply_block_active(zone_id) is False


async def test_a_supply_sensor_that_does_not_exist_is_not_missing_water(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A configured entity that never turns up is silence, not evidence."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", water_supply_sensor="binary_sensor.nowhere")],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    assert runtime.water_supply_missing(zone_id) is False
    assert runtime.water_supply_block_active(zone_id) is False


async def test_a_zone_with_no_supply_sensor_is_never_blocked(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The overwhelming majority of installations. They must be untouched."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", minutes=10)])
    runtime = entry.runtime_data

    assert runtime.water_supply_missing(runtime.zone_ids[0]) is False

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"


async def test_a_confirmed_outage_skips_the_cycle_and_records_why(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Blocking costs the garden nothing: with no water the cycle waters nothing.

    What it saves is a pointless valve actuation, and it replaces an
    interrupted cycle with an outcome that says why. A refusal nobody can see
    is indistinguishable from a bug, so it is recorded as a skip with its own
    reason and never as a silent no-show.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "on")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                water_supply_sensor="binary_sensor.a_supply",
            )
        ],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    # The sensor asserted before setup, so by the 05:30 trigger the default
    # 180 s window is long past.
    await advance(hass, freezer, 31 * 60)

    outcome = runtime.state.last_outcome(zone_id)
    assert outcome is not None
    assert outcome["result"] == "skipped"
    assert outcome["reason_key"] == "no_water_supply"
    assert hass.states.get("valve.a").state == "closed"
    # Not a leak, on any of the three channels the leak owns.
    assert runtime.leak_state(zone_id).active is False


async def test_a_single_flaky_reading_does_not_withhold_water(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The confirmation window, and the whole reason it exists.

    The author chose prolonged confirmation over both "block immediately" and
    "never block": one flaky reading must not withhold water, while a genuine
    outage should not cost a pointless valve actuation either. Here the sensor
    asserts two minutes before the trigger under a ten-minute window, so the
    cycle starts -- and if the supply really is gone, the zero-flow guard
    interrupts it a few minutes later with the specific diagnosis, so the two
    behaviours degrade into each other rather than contradicting. That fallback
    needs a meter, though: this zone has none, which is exactly the install
    where the window is the only thing between an outage and a dry cycle.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "off")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                water_supply_sensor="binary_sensor.a_supply",
            )
        ],
        {"water_supply_confirm_s": 600},
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 29 * 60)  # 05:29, one minute before the trigger
    _supply(hass, "on")
    await advance(hass, freezer, 2 * 60)  # 05:31: the cycle has started

    # The valve first: withholding the water is the consequence that matters,
    # and the two predicates below only say why it was not withheld.
    assert hass.states.get("valve.a").state == "open"
    assert runtime.water_supply_missing(zone_id) is True
    assert runtime.water_supply_block_active(zone_id) is False


async def test_the_block_arrives_once_the_outage_is_confirmed(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The same sensor, the same reading, judged by how long it has stood."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "off")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", water_supply_sensor="binary_sensor.a_supply")],
        {"water_supply_confirm_s": 600},
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    _supply(hass, "on")
    await advance(hass, freezer, 300, step=60.0)
    assert runtime.water_supply_block_active(zone_id) is False

    await advance(hass, freezer, 310, step=60.0)
    assert runtime.water_supply_block_active(zone_id) is True


async def test_the_supply_gate_can_be_turned_off(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A flaky sensor must not be able to stop the system without appeal."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "on")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                water_supply_sensor="binary_sensor.a_supply",
            )
        ],
        {"require_water_supply": False},
    )
    runtime = entry.runtime_data

    await advance(hass, freezer, 31 * 60)

    assert runtime.water_supply_missing(runtime.zone_ids[0]) is True
    assert hass.states.get("valve.a").state == "open"


async def test_a_confirmed_outage_refuses_a_manual_run_too(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Running a zone by hand does not conjure water into the pipe.

    The escapes are the honest ones: the water coming back, removing the
    sensor that reported its absence, or turning the gate off.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "on")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                at="23:00",
                water_supply_sensor="binary_sensor.a_supply",
            )
        ],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    await advance(hass, freezer, 300, step=60.0)

    await runtime.async_run_zone(zone_id)
    await advance(hass, freezer, 120, step=10.0)

    assert hass.states.get("valve.a").state == "closed"
    outcome = runtime.state.last_outcome(zone_id)
    assert outcome is not None
    assert outcome["result"] == "skipped"
    assert outcome["reason_key"] == "no_water_supply"


async def test_a_zero_flow_interrupt_names_the_missing_supply_at_once(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Explaining an event that already happened needs no confirmation window.

    The guard has interrupted the cycle; the sensor's reading at that moment is
    the evidence for why. Gating this on the window would replace a specific
    diagnosis with a generic one for no gain -- so the window here is set an
    hour long and the diagnosis still arrives.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    _supply(hass, "off")
    mock_weather(hass)
    sent = _notify_target(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                flow_sensor="sensor.flow",
                nominal_flow_lpm=10.0,
                water_supply_sensor="binary_sensor.a_supply",
            )
        ],
        {**_SUPPLY_NOTIFICATIONS, "water_supply_confirm_s": 3600},
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    # The mains fail while the cycle runs: no flow, and now a reason for it.
    _supply(hass, "on")
    await advance(hass, freezer, 3 * 60)

    assert runtime.water_supply_block_active(zone_id) is False
    assert hass.states.get("valve.a").state == "closed"
    outcome = runtime.state.last_outcome(zone_id)
    assert outcome is not None
    assert outcome["result"] == "interrupted"
    assert outcome["reason_key"] == "no_water_supply"
    # The notification carries the same diagnosis as the outcome. Handing the
    # user the generic one here and the specific one in the panel would be the
    # exact mismatch this branch exists to remove.
    assert any("supply sensor reports no water" in body for body in _bodies(sent))
    assert not any("No flow detected" in body for body in _bodies(sent))


async def test_a_zero_flow_interrupt_with_water_present_keeps_the_generic_reason(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A sensor saying the water is there does not explain the missing flow.

    Something else is wrong -- a shut tap upstream, a broken valve, a meter
    reading nothing -- and claiming the supply would send the user to the
    wrong place.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    _supply(hass, "off")
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
                water_supply_sensor="binary_sensor.a_supply",
            )
        ],
    )
    runtime = entry.runtime_data

    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 3 * 60)

    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome is not None
    assert outcome["result"] == "interrupted"
    assert outcome["reason_key"] == "no_flow"


async def test_a_confirmed_outage_raises_a_repair_and_says_so_on_the_anomaly_channel(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A supply anomaly, not a leak: the notice goes nowhere near the leak event.

    Announced on the same confirmation the refusal uses. Both assert "the
    supply is out" as a present fact, and an assertion needs the same evidence
    whether it withholds water or merely tells you about it.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "off")
    mock_weather(hass)
    sent = _notify_target(hass)
    leaks = _leak_events(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", water_supply_sensor="binary_sensor.a_supply")],
        _SUPPLY_NOTIFICATIONS,
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    registry = ir.async_get(hass)

    _supply(hass, "on")
    await hass.async_block_till_done()
    assert registry.async_get_issue(DOMAIN, f"water_supply_missing_{zone_id}") is None
    assert _bodies(sent) == []

    # Nothing else fires when the window merely runs out: the sensor has
    # already made the only state change it is going to make.
    await advance(hass, freezer, 190, step=30.0)

    issue = registry.async_get_issue(DOMAIN, f"water_supply_missing_{zone_id}")
    assert issue is not None
    assert issue.translation_placeholders == {"zone": "Alpha"}
    bodies = _bodies(sent)
    assert len(bodies) == 1
    assert "Alpha" in bodies[0]
    assert leaks == []
    assert runtime.leak_state(zone_id).active is False


async def test_the_repair_and_a_notice_follow_the_water_back(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Every issue that can be created needs a delete path that is reached."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "on")
    mock_weather(hass)
    sent = _notify_target(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", water_supply_sensor="binary_sensor.a_supply")],
        _SUPPLY_NOTIFICATIONS,
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    registry = ir.async_get(hass)
    await advance(hass, freezer, 190, step=30.0)
    assert registry.async_get_issue(DOMAIN, f"water_supply_missing_{zone_id}") is not None

    # No window on the way out: the water returning is itself the evidence.
    _supply(hass, "off")
    await hass.async_block_till_done()

    assert registry.async_get_issue(DOMAIN, f"water_supply_missing_{zone_id}") is None
    assert runtime.water_supply_missing(zone_id) is False
    assert len(_bodies(sent)) == 2
    assert "the water supply is back" in _bodies(sent)[1]


async def test_a_supply_already_missing_at_startup_is_noticed(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """An outage that began while Home Assistant was down has no transition left.

    The clock restarts at the restore, which is the safe direction: we do not
    know how long the supply has been out, so the water is not withheld until
    the outage has been confirmed again.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "on")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", water_supply_sensor="binary_sensor.a_supply")],
        {"water_supply_confirm_s": 600},
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    registry = ir.async_get(hass)

    assert registry.async_get_issue(DOMAIN, f"water_supply_missing_{zone_id}") is None
    assert runtime.water_supply_block_active(zone_id) is False

    await advance(hass, freezer, 610, step=60.0)
    assert registry.async_get_issue(DOMAIN, f"water_supply_missing_{zone_id}") is not None
    assert runtime.water_supply_block_active(zone_id) is True


async def test_removing_the_supply_sensor_takes_the_repair_down(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The user's own statement that the sensor is gone. Nothing else could clear it.

    And it must not be reported as the water coming back, which is a different
    fact and one nobody has established.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "on")
    mock_weather(hass)
    sent = _notify_target(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", water_supply_sensor="binary_sensor.a_supply")],
        _SUPPLY_NOTIFICATIONS,
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    registry = ir.async_get(hass)
    await advance(hass, freezer, 190, step=30.0)
    assert registry.async_get_issue(DOMAIN, f"water_supply_missing_{zone_id}") is not None

    await _reconfigure_zone(hass, entry, zone_id, water_supply_sensor="")

    assert registry.async_get_issue(DOMAIN, f"water_supply_missing_{zone_id}") is None
    assert runtime.water_supply_missing(zone_id) is False
    assert runtime.water_supply_block_active(zone_id) is False
    assert "sensor has been removed" in _bodies(sent)[1]
    assert "back" not in _bodies(sent)[1]


async def test_removing_the_zone_takes_the_repair_down(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A zone that has left the configuration can no longer clear its own notice."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    _supply(hass, "on")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", water_supply_sensor="binary_sensor.a_supply"),
            zone_data("Beta", "valve.b", order=200),
        ],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    registry = ir.async_get(hass)
    await advance(hass, freezer, 190, step=30.0)
    assert registry.async_get_issue(DOMAIN, f"water_supply_missing_{zone_id}") is not None

    hass.config_entries.async_remove_subentry(entry, zone_id)
    await hass.async_block_till_done()

    assert registry.async_get_issue(DOMAIN, f"water_supply_missing_{zone_id}") is None


async def test_the_supply_confirmation_window_round_trips_through_the_service(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Declared and registered are two distinct places; this is the second."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])

    await hass.services.async_call(
        DOMAIN, "set_valve_safety", {"water_supply_confirm_s": 240}, blocking=True
    )
    await hass.async_block_till_done()

    assert entry.options["water_supply_confirm_s"] == 240
    assert entry.runtime_data.hub.water_supply_confirm_s == 240


async def test_a_flapping_supply_sensor_is_never_announced(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The confirmation window, on the telling as well as on the withholding.

    A sensor flapping faster than the window would otherwise produce a repair
    notice and a notification pair per flap -- the alarm fatigue the rest of
    this feature's anti-noise design exists to prevent, and the reason the leak
    alarm has a window at all. An outage that outlasts the window gets exactly
    one of each.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "off")
    mock_weather(hass)
    sent = _notify_target(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", water_supply_sensor="binary_sensor.a_supply")],
        {**_SUPPLY_NOTIFICATIONS, "water_supply_confirm_s": 600},
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    registry = ir.async_get(hass)

    for _ in range(6):
        _supply(hass, "on")
        await advance(hass, freezer, 60, step=30.0)
        _supply(hass, "off")
        await advance(hass, freezer, 60, step=30.0)

    assert registry.async_get_issue(DOMAIN, f"water_supply_missing_{zone_id}") is None
    assert _bodies(sent) == []

    _supply(hass, "on")
    await advance(hass, freezer, 610, step=30.0)

    assert registry.async_get_issue(DOMAIN, f"water_supply_missing_{zone_id}") is not None
    assert len(_bodies(sent)) == 1
    assert runtime.water_supply_block_active(zone_id) is True


async def test_a_supply_sensor_that_goes_silent_does_not_claim_the_water_is_back(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Silence is not evidence, and the two safe directions differ here.

    The block lifts, because withholding water needs positive evidence that
    there is none. The notice stands, because taking it down would announce
    that the water is back -- a claim nobody has established, and one that
    would be false at the instant it was sent.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "on")
    mock_weather(hass)
    sent = _notify_target(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", water_supply_sensor="binary_sensor.a_supply")],
        _SUPPLY_NOTIFICATIONS,
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    registry = ir.async_get(hass)
    await advance(hass, freezer, 190, step=30.0)
    assert registry.async_get_issue(DOMAIN, f"water_supply_missing_{zone_id}") is not None

    _supply(hass, "unavailable")
    await advance(hass, freezer, 190, step=30.0)

    assert registry.async_get_issue(DOMAIN, f"water_supply_missing_{zone_id}") is not None
    assert len(_bodies(sent)) == 1
    assert runtime.water_supply_missing(zone_id) is False
    assert runtime.water_supply_block_active(zone_id) is False


async def test_a_superseded_confirmation_window_leaves_no_timer_behind(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """White-box on purpose: what this prevents has no other symptom.

    A wake left armed after its window has been superseded is inert -- it
    re-reads live state, and the "already announced" guard swallows whatever
    it concludes -- so no behaviour misbehaves and no black-box assertion can
    catch it. What grows is the event loop's timer list, one entry per flap,
    for as long as Home Assistant runs. So the assertion is on the thing that
    actually grows.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "off")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", water_supply_sensor="binary_sensor.a_supply")],
        {"water_supply_confirm_s": 3600},
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    _supply(hass, "on")
    await advance(hass, freezer, 30, step=10.0)
    assert _pending_supply_wakes(hass) == 1

    # The sensor goes quiet: there is no longer anything to confirm, so the
    # window it was waiting out has to go with it.
    _supply(hass, "unavailable")
    await advance(hass, freezer, 30, step=10.0)
    assert _pending_supply_wakes(hass) == 0

    # And back. One window, not two: the second must replace the first rather
    # than join it.
    _supply(hass, "on")
    await advance(hass, freezer, 30, step=10.0)
    assert _pending_supply_wakes(hass) == 1
    assert set(runtime._supply_wake_unsubs) == {zone_id}


async def test_the_repair_follows_the_evidence_when_the_first_source_withdraws(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A zone with no meter must not stand accused on flow evidence.

    first_source is written once and never revisited, which is right while it
    still contributes -- re-describing a standing alarm every time a second
    source joins would churn a notice for no new fact. But source 2 withdraws
    when its meter leaves the configuration, and the alarm can survive on
    source 1: the notice then described flow measurement for a zone that can no
    longer measure flow, and promised to clear "until the meter is removed",
    which is precisely what had just happened. A wrong diagnosis is worse than
    a wrong promise, because it sends the user to look at the wrong thing.

    It is a change of description, not a new alarm: no second notification, and
    the alarm keeps the moment it was confirmed.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    sent = _notify_target(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                at="23:00",
                flow_sensor="sensor.flow",
                leak_sensor="binary_sensor.a_leak",
            )
        ],
        _LEAK_NOTIFICATIONS,
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    registry = ir.async_get(hass)

    # Source 2 raises first, so the notice is keyed to flow evidence.
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    raised = runtime.leak_state(zone_id)
    assert raised.first_source == SOURCE_NO_FLOW_CLOSED
    issue = registry.async_get_issue(DOMAIN, f"leak_{zone_id}")
    assert issue is not None
    assert issue.translation_key == "leak_zone_flow"

    # Source 1 joins. Nothing about the description changes: the source it
    # cites is still contributing.
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert runtime.leak_state(zone_id).sources == {SOURCE_NO_FLOW_CLOSED, SOURCE_VALVE_SENSOR}
    issue = registry.async_get_issue(DOMAIN, f"leak_{zone_id}")
    assert issue is not None
    assert issue.translation_key == "leak_zone_flow"
    assert len(_bodies(sent)) == 1

    # The meter leaves the configuration while the valve sensor holds the
    # alarm up.
    await _reconfigure_zone(hass, entry, zone_id, flow_sensor="")
    await advance(hass, freezer, 60, step=10.0)

    after = runtime.leak_state(zone_id)
    assert after.active is True
    assert after.sources == {SOURCE_VALVE_SENSOR}
    # The historical fact is untouched: who noticed first does not change.
    assert after.first_source == SOURCE_NO_FLOW_CLOSED
    # What changes is what the notice says, because the evidence changed.
    issue = registry.async_get_issue(DOMAIN, f"leak_{zone_id}")
    assert issue is not None
    assert issue.translation_key == "leak_zone_valve_sensor"
    # A re-description is not a new alarm.
    assert after.since == raised.since
    assert len(_bodies(sent)) == 1


# The valve that closes itself -----------------------------------------------
#
# The reference hardware closes its own valve when it detects no flow, which
# surveillance reads as a manual close: one firmware decision aborted every
# zone and armed the manual-stop block. The exemption is narrow on purpose --
# the watering zone's OWN valve, and hard evidence from its OWN supply sensor
# -- because without evidence there is no telling firmware from a hand on the
# switch.
#
# The two facts are separate reports from one device, in no guaranteed order,
# so a close whose zone HAS a supply sensor waits out a short grace before it
# is judged. Where no sensor exists nothing waits: no evidence could arrive.


def _pending_supply_decisions(hass: HomeAssistant) -> int:
    """How many deferred close verdicts are armed on the event loop.

    Same reach into the loop's own handles, and for the same reason, as
    _pending_supply_wakes: a timer that outlives its session has no other
    symptom until it fires, and by then the thing it would judge is gone.
    """
    count = 0
    for handle in get_scheduled_timer_handles(hass.loop):
        if handle.cancelled() or not handle._args:
            continue
        target = getattr(handle._args[-1], "target", None)
        func = getattr(target, "func", target)
        if getattr(func, "__name__", None) == "_decide_supply_close":
            count += 1
    return count


async def test_a_self_closing_valve_is_not_manual_intervention(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The SWV closes itself when it detects no flow; do not fight it.

    Treated as a legitimate closure: the run ends with no_water_supply, the
    other zones carry on, and the manual-stop block is not armed.

    The window that governs refusing a START is deliberately not consulted
    here. The firmware closes the moment it sees no flow, so demanding minutes
    of prior confirmation would defeat the exemption in exactly the case it
    exists for -- hence a 3600 s window and an exemption that still applies.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    _supply(hass, "off")
    mock_weather(hass)
    sent = _notify_target(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                order=1,
                water_supply_sensor="binary_sensor.a_supply",
            ),
            zone_data("Beta", "valve.b", minutes=3, order=2),
        ],
        {
            "water_supply_confirm_s": 3600,
            "notifications": {
                "cancelled": {"enabled": True, "services": ["phone"]},
                "anomaly": {"enabled": True, "services": ["phone"]},
            },
        },
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    # The valve's own firmware closes it because the supply failed.
    _supply(hass, "on")
    park.force_state("valve.a", "closed")
    await advance(hass, freezer, 30, step=5.0)

    assert runtime.water_supply_block_active(alpha) is False  # ungated, and proved so
    outcome = runtime.state.last_outcome(alpha)
    assert outcome is not None
    assert outcome["result"] == "interrupted"
    assert outcome["reason_key"] == "no_water_supply"
    assert runtime.state.manual_stop_at is None  # the block was not armed

    # And the zone nothing implicated waters its full run.
    await advance(hass, freezer, 6 * 60)
    assert ("open_valve", "valve.b") in park.commands
    beta_outcome = runtime.state.last_outcome(beta)
    assert beta_outcome is not None
    assert beta_outcome["result"] == "completed"

    # One message for one event, and it carries the same reason the outcome
    # does. Both channels the path could speak on are enabled, so the absence
    # of a second body is the assertion: the outage itself belongs to the
    # supply's own notice, which under a 3600 s window has nothing to say yet.
    assert _bodies(sent) == ["Cycle not completed (no_water_supply): Alpha."]


async def test_an_unledgered_close_without_supply_evidence_still_aborts(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """No sensor, no exemption. The manual-intervention guarantee is not weakened
    where the evidence to weaken it is absent.

    And no delay either, which is what keeps the grace a bounded weakening
    rather than a general one: with no sensor configured, no evidence can ever
    arrive, so there is nothing to wait for and this close is judged in the
    instant it is read -- exactly as before the grace existed.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", minutes=10)])
    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    runtime = entry.runtime_data
    park.force_state("valve.a", "closed")
    await advance(hass, freezer, _SUPPLY_EVIDENCE_GRACE_S / 2, step=1.0)

    # Judged already, inside the window a zone with a sensor would still be
    # waiting out, and with nothing armed to judge it later.
    assert runtime.state.manual_stop_at is not None
    assert _pending_supply_decisions(hass) == 0

    await advance(hass, freezer, 30, step=5.0)
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome is not None
    assert outcome["reason_key"] == "manual_intervention"


@pytest.mark.parametrize("reading", ["unavailable", "unknown", "off"])
async def test_an_unavailable_supply_sensor_grants_no_exemption(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, reading: str
) -> None:
    """Only ``on`` is evidence. Everything else falls through to the abort.

    ``off`` is there for the same reason as the two silences: it is the state
    of a healthy supply, and a valve closing under one is a hand on the switch
    as far as anything here can tell.

    This is also the mirror of the race below: the zone HAS a sensor, so the
    verdict is deferred -- and the sensor then says nothing for the whole
    grace, which must end in the abort with the block armed, not in a pass.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, reading)
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                water_supply_sensor="binary_sensor.a_supply",
            )
        ],
    )
    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    park.force_state("valve.a", "closed")
    await advance(hass, freezer, 30, step=5.0)

    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome is not None
    assert outcome["reason_key"] == "manual_intervention"
    assert runtime.state.manual_stop_at is not None


async def test_a_supply_reported_after_the_close_still_earns_the_exemption(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The race, and the reason the grace exists.

    The valve's state and its supply sensor are two entities of one device,
    reported separately and in no guaranteed order. Judged on the instant, a
    close read before its evidence aborts the whole session -- and it would do
    so INTERMITTENTLY, on the same hardware in the same situation, which reads
    as a flaky bug rather than a missing feature.

    Here the close lands first and the sensor speaks inside the grace, which
    must reach the same verdict as if they had arrived the other way round.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    _supply(hass, "off")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                order=1,
                water_supply_sensor="binary_sensor.a_supply",
            ),
            zone_data("Beta", "valve.b", minutes=3, order=2),
        ],
        {"water_supply_confirm_s": 3600},
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    # The valve reports first, and its sensor has not spoken yet.
    park.force_state("valve.a", "closed")
    await advance(hass, freezer, _SUPPLY_EVIDENCE_GRACE_S / 2, step=1.0)
    assert runtime.state.manual_stop_at is None  # nothing judged yet
    assert runtime.state.last_outcome(alpha) is None
    assert _pending_supply_decisions(hass) == 1

    # And now the evidence arrives, inside the window it was given.
    _supply(hass, "on")
    await advance(hass, freezer, _SUPPLY_EVIDENCE_GRACE_S * 4, step=1.0)

    outcome = runtime.state.last_outcome(alpha)
    assert outcome is not None
    assert outcome["result"] == "interrupted"
    assert outcome["reason_key"] == "no_water_supply"
    assert runtime.state.manual_stop_at is None
    assert _pending_supply_decisions(hass) == 0

    await advance(hass, freezer, 6 * 60)
    beta_outcome = runtime.state.last_outcome(beta)
    assert beta_outcome is not None
    assert beta_outcome["result"] == "completed"


async def test_a_valve_that_comes_back_inside_the_grace_is_not_judged(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The observation expired, so there is nothing left to judge.

    A close is deferred on one premise -- this zone's valve is shut while it
    should be open. If the valve is open again when the verdict comes due, that
    premise no longer describes anything, and aborting a run whose valve is
    physically fine would be acting on stale information.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "off")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                water_supply_sensor="binary_sensor.a_supply",
            )
        ],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    park.force_state("valve.a", "closed")
    await advance(hass, freezer, _SUPPLY_EVIDENCE_GRACE_S / 2, step=1.0)
    park.force_state("valve.a", "open")
    await advance(hass, freezer, _SUPPLY_EVIDENCE_GRACE_S * 4, step=1.0)

    assert runtime.state.manual_stop_at is None
    assert runtime.state.last_outcome(zone_id) is None  # still watering
    assert hass.states.get("valve.a").state == "open"

    # And it finishes the run it never stopped.
    await advance(hass, freezer, 11 * 60)
    outcome = runtime.state.last_outcome(zone_id)
    assert outcome is not None
    assert outcome["result"] == "completed"


async def test_a_valve_that_goes_silent_inside_the_grace_is_still_judged(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Uncertainty aborts. It is the reopen case's boundary, not its neighbour.

    A hand closes the valve and the device then falls off the radio inside the
    window -- batteries out, power cut, or a flaky link whose last successful
    report WAS the close. ``is_closed`` and ``is_open`` are both strict, so the
    difference between them is exactly where ``unavailable`` lands, and this
    module resolves uncertainty by cancelling rather than by carrying on. Only
    a valve we can SEE is open retracts the premise.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "off")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                water_supply_sensor="binary_sensor.a_supply",
            )
        ],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)
    park.force_state("valve.a", "closed")
    await advance(hass, freezer, _SUPPLY_EVIDENCE_GRACE_S / 2, step=1.0)
    park.force_state("valve.a", "unavailable")
    await advance(hass, freezer, _SUPPLY_EVIDENCE_GRACE_S * 4, step=1.0)

    assert runtime.state.manual_stop_at is not None
    outcome = runtime.state.last_outcome(zone_id)
    assert outcome is not None
    assert outcome["reason_key"] == "manual_intervention"


@pytest.mark.parametrize("beta_supply", [None, "off"])
async def test_a_sibling_sensor_never_speaks_for_the_zone_that_closed(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, beta_supply: str | None
) -> None:
    """The first safety property: the zone's OWN sensor, not a sibling's.

    Two zones water together and BETA's valve closes itself. Alpha's sensor is
    shouting that Alpha has no water, which says nothing whatever about the
    pipe behind Beta -- they are different taps. Beta must be judged on Beta's
    evidence, of which there is none in either case here: no sensor at all, or
    one reporting the water present.

    Parametrized over both because they reach the same verdict by different
    routes -- no sensor is judged in the instant, a silent one waits out the
    grace first -- and the property has to hold on both.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    _supply(hass, "on")  # ALPHA's supply is the one that is gone
    if beta_supply is not None:
        _supply(hass, beta_supply, entity_id="binary_sensor.b_supply")
    mock_weather(hass)
    beta_extra = (
        {"water_supply_sensor": "binary_sensor.b_supply"} if beta_supply is not None else {}
    )
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                order=1,
                compatibility_group="drip",
                water_supply_sensor="binary_sensor.a_supply",
            ),
            zone_data(
                "Beta",
                "valve.b",
                minutes=10,
                order=2,
                compatibility_group="drip",
                **beta_extra,
            ),
        ],
        {
            "max_concurrent": 2,
            "compatibility_groups": ["drip"],
            # Otherwise Alpha's own outage refuses Alpha's start and the two
            # zones never water together, which is the whole premise here.
            "require_water_supply": False,
        },
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids

    await advance(hass, freezer, 32 * 60)
    assert hass.states.get("valve.a").state == "open"
    assert hass.states.get("valve.b").state == "open"

    # Beta's valve shuts. Alpha's sensor is the only one saying "no water".
    park.force_state("valve.b", "closed")
    await advance(hass, freezer, _SUPPLY_EVIDENCE_GRACE_S * 4, step=1.0)

    assert runtime.state.manual_stop_at is not None
    beta_outcome = runtime.state.last_outcome(beta)
    assert beta_outcome is not None
    assert beta_outcome["reason_key"] == "manual_intervention"
    # Nor was ALPHA's run ended on Alpha's evidence for Beta's close: it is
    # interrupted by the abort, as any zone in an aborted session is, and never
    # carrying the diagnosis that belongs to the other zone's valve.
    alpha_outcome = runtime.state.last_outcome(alpha)
    assert alpha_outcome is not None
    assert alpha_outcome["reason_key"] == "manual_intervention"


async def test_a_verdict_outlives_the_segment_it_was_armed_for(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A hand on the valve stops the queue, even in a run's last seconds.

    The close is deferred, the segment ends inside the grace, and the verdict
    comes due with nothing left to interrupt. It fires anyway: the block stops
    the QUEUE, not the segment, and five seconds of silence from a sensor that
    would have spoken is exactly what tells a hand from the firmware -- the
    firmware closes BECAUSE the water is gone. An ordinary end-of-run close
    cannot arrive here at all, since we close that valve ourselves and the
    command is ledgered.

    The completed run keeps saying it completed, asserted against a copy taken
    before the abort so an outcome rewritten in place could not pass.

    The landing point is read from the run rather than guessed: pinning a
    verdict on a coincidence of seconds is how latently flaky tests entered
    this suite before.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    _supply(hass, "off")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                order=1,
                water_supply_sensor="binary_sensor.a_supply",
            ),
            zone_data("Beta", "valve.b", minutes=3, order=2),
        ],
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids

    await advance(hass, freezer, 31 * 60)
    run = runtime.session.active_runs[alpha]
    assert run.phase == PHASE_WATERING
    assert run.started_at is not None

    # Two seconds short of this segment's own end, whatever the phases before
    # it took, so the close is deferred and the run finishes inside the grace.
    ends_at = run.started_at + timedelta(minutes=run.duration_min)
    await advance(hass, freezer, (ends_at - dt_util.utcnow()).total_seconds() - 2, step=1.0)
    park.force_state("valve.a", "closed")
    assert _pending_supply_decisions(hass) == 1

    # Past the end of the run, still inside the grace.
    await advance(hass, freezer, 2.5, step=1.0)
    completed = runtime.state.last_outcome(alpha)
    assert completed is not None
    assert completed["result"] == "completed"
    completed = dict(completed)
    assert runtime.state.manual_stop_at is None  # not judged yet

    await advance(hass, freezer, _SUPPLY_EVIDENCE_GRACE_S * 4, step=1.0)

    # The queue stops.
    assert runtime.state.manual_stop_at is not None
    assert ("open_valve", "valve.b") not in park.commands
    beta_outcome = runtime.state.last_outcome(beta)
    assert beta_outcome is not None
    assert beta_outcome["result"] != "completed"
    # And the segment that did finish is left exactly as it was.
    assert runtime.state.last_outcome(alpha) == completed


async def test_unloading_the_entry_leaves_no_verdict_armed(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A pending verdict must not outlive the session that armed it.

    Nothing black-box can see the difference: a stale handle would judge a
    session that no longer exists, and the guards inside it make that
    harmless. What grows is the loop's timer list, so the assertion is on that
    -- and on the block a stale verdict must never arm.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "off")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                water_supply_sensor="binary_sensor.a_supply",
            )
        ],
    )
    runtime = entry.runtime_data

    await advance(hass, freezer, 31 * 60)
    park.force_state("valve.a", "closed")
    await advance(hass, freezer, _SUPPLY_EVIDENCE_GRACE_S / 2, step=1.0)
    assert _pending_supply_decisions(hass) == 1

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    assert _pending_supply_decisions(hass) == 0
    assert runtime.state.manual_stop_at is None


# Lifecycle: what happens to an alarm the configuration takes away ----------


async def test_a_zone_deleted_mid_alarm_fires_the_clearing_transition(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The hole in the surface Ruling L32 moves every automation onto.

    Removing the zone stopped its detector -- and ``stop()`` is cancel-only by
    its own documentation -- so nothing routed through ``on_leak_cleared``: no
    ``cleared`` event, no clearing notification. The entity was removed
    outright, and Home Assistant fires no state trigger on a removal, so a user
    whose automation had closed the mains was left with them closed and nothing
    anywhere to tell them otherwise. The integration's own block released,
    because ``leak_blocked_zone_ids`` iterates live detectors: the component
    recovered and the user did not.

    The message has to name the zone, which is the part that is easy to get
    wrong: by the time the removal is noticed, ``_build_zones`` has already
    replaced ``self.zones``, and an opaque subentry id is not a sentence to
    send anyone.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak"),
            zone_data("Beta", "valve.b", at="23:00"),
        ],
        {**_LEAK_NOTIFICATIONS, "leak_action": "close_and_block"},
    )
    sent = _notify_target(hass)
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert runtime.leak_state(zone_id).active is True
    assert runtime.leak_blocked_zone_ids() == {zone_id}
    events = _leak_events(hass)
    sent.clear()

    hass.config_entries.async_remove_subentry(entry, zone_id)
    await hass.async_block_till_done()

    assert [event["state"] for event in events] == ["cleared"]
    # The payload still says what KIND of leak ended, which is the whole reason
    # on_leak_cleared is handed the state as it was.
    assert events[0]["first_source"] == SOURCE_VALVE_SENSOR
    assert events[0]["zone_id"] == zone_id
    assert _bodies(sent) == ["Alpha: the leak condition has cleared. New cycles are allowed again."]
    assert ir.async_get(hass).async_get_issue(DOMAIN, f"leak_{zone_id}") is None
    assert runtime.leak_blocked_zone_ids() == set()


async def test_repointing_a_leak_sensor_withdraws_the_old_sensors_alarm(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Ruling L8 named repointing as worse than stranding; source 1 never got it.

    After a repoint ``_evaluate_valve_sensor`` re-read the NEW sensor: ``off``
    withdrew, ``on`` re-timed its window, and ``unknown``, ``unavailable`` and
    an entity that does not exist yet all took a bare return -- leaving an
    alarm raised by the OLD sensor standing, behind a Repairs notice citing a
    sensor that had raised nothing, and under ``close_and_block`` refusing
    every cycle until the new entity happened to speak.

    Nothing the new sensor can do withdraws it, because the alarm was never
    the new sensor's. Pointing the setting elsewhere is the user's own
    statement about the old one, exactly as clearing it is -- and the remedy
    was already implemented for source 2 (``_forget_flow``).
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak")],
        {**_LEAK_NOTIFICATIONS, "leak_action": "close_and_block"},
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert runtime.leak_state(zone_id).active is True
    events = _leak_events(hass)

    # The new sensor does not exist yet: the paired device has not reported, or
    # the entity id was typed ahead of the integration that will provide it.
    await _reconfigure_zone(hass, entry, zone_id, leak_sensor="binary_sensor.new_leak")

    assert runtime.leak_state(zone_id).active is False
    assert [event["state"] for event in events] == ["cleared"]
    assert ir.async_get(hass).async_get_issue(DOMAIN, f"leak_{zone_id}") is None
    assert runtime.leak_blocked_zone_ids() == set()

    # And the new sensor is genuinely watched: this withdrew an alarm, it did
    # not deafen the source.
    hass.states.async_set("binary_sensor.new_leak", "on", {"device_class": "moisture"})
    await advance(hass, freezer, _WELL_PAST_CONFIRM_S, step=10.0)

    assert runtime.leak_state(zone_id).active is True
    assert runtime.leak_state(zone_id).first_source == SOURCE_VALVE_SENSOR


async def test_changing_the_repeat_interval_reaches_an_alarm_already_standing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """``_arm_repeat`` was reachable only from the raise and from its own expiry.

    So an edit to ``leak_repeat_min`` while an alarm stood reached everything
    except the alarm that was standing -- and ``0 -> N`` meant that alarm never
    reminded again for the whole of its life, which is precisely the alarm the
    user was reaching for the setting because of.

    The re-arm is guarded on the interval actually changing, so an unrelated
    configuration edit cannot push a reminder that was nearly due back out to
    the full interval. Both halves are asserted.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak")],
        {**_LEAK_NOTIFICATIONS, "leak_repeat_min": 0},
    )
    sent = _notify_target(hass)
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert runtime.leak_state(zone_id).active is True
    sent.clear()
    await advance(hass, freezer, 20 * 60, step=30.0)
    assert _bodies(sent) == []  # off means off

    hass.config_entries.async_update_entry(entry, options={**entry.options, "leak_repeat_min": 5})
    await hass.async_block_till_done()
    await advance(hass, freezer, 6 * 60, step=30.0)

    assert len(_bodies(sent)) == 1
    assert "still reporting a leak" in _bodies(sent)[0]

    # An edit that leaves the interval alone must not re-time the reminder. The
    # second one is due ten minutes after the first edit; three minutes short of
    # that an unrelated setting changes, and it still falls due on the original
    # schedule rather than five minutes after the edit.
    await advance(hass, freezer, 3 * 60, step=30.0)
    assert len(_bodies(sent)) == 1
    sent.clear()
    hass.config_entries.async_update_entry(
        entry, options={**entry.options, "leak_threshold_lpm": 0.7}
    )
    await hass.async_block_till_done()
    await advance(hass, freezer, 90, step=30.0)

    assert len(_bodies(sent)) == 1


async def test_retiring_a_meter_never_reaches_source_2(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, monkeypatch: Any
) -> None:
    """A one-line ordering in the accountant that leak detection now leans on.

    ``MeterLedger.retire`` publishes a farewell sample so a live FlowMonitor is
    told the meter has gone rather than left waiting. ``WaterAccountant.rebuild``
    drops its OWN subscription before provoking it, for its own reason (the
    litres would be booked against a total that is about to be dropped) -- and
    that ordering is what keeps the sample away from ``note_flow`` as well.

    Without it, a configuration edit made during post-cycle drainage would hand
    source 2 one last interval of above-threshold seconds, raise an alarm, and
    clear it milliseconds later when the rebuild withdrew the meter: two push
    notifications and an ERROR repair notice, for an edit. Pinned here because
    the guard is a single line whose stated reason says nothing about leaks,
    and a refactor that moved it would look harmless.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.a_flow", "3.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", flow_sensor="sensor.a_flow")],
        # Between two samples of the quiet meter's 30 s cadence, so the pending
        # seconds the farewell sample would carry are exactly what tips it.
        {**_LEAK_NOTIFICATIONS, "leak_confirm_s": 275},
    )
    sent = _notify_target(hass)
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    events = _leak_events(hass)

    fed: list[float] = []
    original = LeakDetector.note_flow

    def _spy(self: LeakDetector, **kwargs: Any) -> None:
        fed.append(float(kwargs["measured_s"]))
        original(self, **kwargs)

    monkeypatch.setattr(LeakDetector, "note_flow", _spy)

    await advance(hass, freezer, 280, step=10.0)
    detector = runtime.leak_detector(zone_id)
    assert detector is not None
    assert detector.state.active is False
    assert detector.flow_evidence_pending is True  # right on the edge
    fed_before = len(fed)

    await _reconfigure_zone(hass, entry, zone_id, flow_sensor="")

    assert fed[fed_before:] == []
    assert events == []
    assert _bodies(sent) == []
    assert ir.async_get(hass).async_get_issue(DOMAIN, f"leak_{zone_id}") is None


async def test_a_leak_issue_orphaned_while_the_entry_was_unloaded_is_swept(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The alarm lives in memory; the issue registry does not.

    ``_reconcile_leak_issues`` used to iterate live detectors, which cannot
    reach the one case nothing else can either: a zone removed while the entry
    was unloaded leaves an issue whose scope is unknowable from the
    configuration that remains, with no detector to reconcile it and no path
    left that could delete it.

    Swept by prefix instead -- and the prefix cannot tell a scope's alarm from
    ``leak_action_invalid``, which is not one and has a lifecycle of its own.
    That it survives the sweep is asserted here, because a sweep that ate it
    would take down a live warning about a mistyped setting.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", at="23:00", leak_sensor="binary_sensor.a_leak"),
            zone_data("Beta", "valve.b", at="23:00"),
        ],
        {"leak_action": "close_and_pray"},  # also raises leak_action_invalid
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    registry = ir.async_get(hass)

    await advance(hass, freezer, _PAST_CONFIRM_S, step=10.0)
    assert registry.async_get_issue(DOMAIN, f"leak_{zone_id}") is not None
    action_issue = registry.async_get_issue(DOMAIN, "leak_action_invalid")
    assert action_issue is not None
    raised_at = action_issue.created

    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    hass.config_entries.async_remove_subentry(entry, zone_id)
    await hass.async_block_till_done()
    assert registry.async_get_issue(DOMAIN, f"leak_{zone_id}") is not None  # nobody could
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert registry.async_get_issue(DOMAIN, f"leak_{zone_id}") is None
    survivor = registry.async_get_issue(DOMAIN, "leak_action_invalid")
    assert survivor is not None
    # UNTOUCHED, not merely present again. `_report_invalid_leak_action` runs
    # after the sweep and would re-create anything the sweep ate -- which is
    # what makes the exclusion look free -- but Home Assistant's upsert
    # preserves an issue's creation time and its DISMISSAL, and a delete
    # followed by a create loses both. Without the exclusion, a user who
    # dismissed this notice would get it back on every configuration change.
    assert survivor.created == raised_at


async def test_a_supply_notice_is_reconciled_across_a_reload(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Two halves of one defect: ``_supply_announced`` is memory of one runtime.

    A reload builds a new runtime while every issue it created stays exactly
    where it was. So a standing outage was announced a SECOND time -- a repeat
    push notification for a condition nothing re-detected, from a sensor that
    never changed -- and one that had ended while the entry was unloaded left
    its notice active for good, because the withdrawal is gated on having
    announced it and nothing remembered that we had.

    Both are asserted in one run, because the fix is one thing: the notices
    themselves are what the edge detector is restored from.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "on")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", water_supply_sensor="binary_sensor.a_supply")],
        {"notifications": {"anomaly": {"enabled": True, "services": ["phone"]}}},
    )
    sent = _notify_target(hass)
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    issue_id = f"water_supply_missing_{zone_id}"
    registry = ir.async_get(hass)

    await advance(hass, freezer, 700, step=10.0)
    assert len(_bodies(sent)) == 1
    assert registry.async_get_issue(DOMAIN, issue_id) is not None

    sent.clear()
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    await advance(hass, freezer, 700, step=10.0)

    assert _bodies(sent) == []  # nothing was re-detected, so nothing is re-said
    assert registry.async_get_issue(DOMAIN, issue_id) is not None

    # And now the water comes back while nothing is listening.
    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    _supply(hass, "off")
    sent.clear()
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert registry.async_get_issue(DOMAIN, issue_id) is None
    assert _bodies(sent) == [
        "Alpha: the water supply is back. Cycles are no longer refused for lack of water."
    ]


async def test_the_self_close_exemption_does_not_consult_require_water_supply(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A deliberate NON-consumer of that setting, pinned so it stays deliberate.

    ``require_water_supply`` governs whether the component REFUSES TO WATER on
    a supply sensor's word. The exemption governs something else entirely: how
    an observation is read -- whether a valve that shut itself was the
    firmware's own no-water closure or a hand on the switch. Making a diagnosis
    switchable by a policy setting is the two-sources-of-truth defect this
    design keeps refusing, and it would point the wrong way besides: on the
    reference hardware the valve self-closes during an outage whatever we
    believe, so honouring the setting here would abort the whole session and
    arm the manual-stop block for exactly the user who asked us to stop letting
    that sensor stop them. The gate off would then be STRICTER than the gate
    on.

    What it costs is stated rather than hidden: a hand-closed valve on a zone
    whose own supply sensor happens to read "no water" at that instant ends one
    segment instead of the cycle. That cost is identical with the gate on --
    the exemption has always been unconditional -- so the setting is not the
    lever that would fix it.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    _supply(hass, "off")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha",
                "valve.a",
                minutes=10,
                order=1,
                water_supply_sensor="binary_sensor.a_supply",
            ),
            zone_data("Beta", "valve.b", minutes=3, order=2),
        ],
        {"water_supply_confirm_s": 3600, "require_water_supply": False},
    )
    runtime = entry.runtime_data
    alpha, beta = runtime.zone_ids

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"  # the gate is off, so it started

    _supply(hass, "on")
    park.force_state("valve.a", "closed")
    await advance(hass, freezer, 30, step=5.0)

    outcome = runtime.state.last_outcome(alpha)
    assert outcome is not None
    assert outcome["reason_key"] == "no_water_supply"
    assert runtime.state.manual_stop_at is None

    await advance(hass, freezer, 6 * 60)
    beta_outcome = runtime.state.last_outcome(beta)
    assert beta_outcome is not None
    assert beta_outcome["result"] == "completed"


async def test_a_supply_notice_restored_inactive_by_a_restart_is_not_re_announced(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A reload and a restart are different, and the registry says which.

    Home Assistant restores a non-persistent issue as INACTIVE: invisible in
    Repairs, carrying neither severity nor translation key, present only so a
    dismissal survives. Restoring the announcement flag from one of those would
    be remembering across a restart something this feature deliberately does
    not remember -- and it would push "the water supply is back" for a notice
    the user could not see, about an outage that ended while the system was
    down.

    So the seed reads ACTIVE issues only, and the outage is confirmed again
    from the sensor's own ``last_changed``, which the restart has reset. The
    inactive entry is simulated exactly as ``IssueRegistry._async_load`` writes
    it, because nothing else in a test process produces one.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    _supply(hass, "on")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", at="23:00", water_supply_sensor="binary_sensor.a_supply")],
        {"notifications": {"anomaly": {"enabled": True, "services": ["phone"]}}},
    )
    sent = _notify_target(hass)
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    issue_id = f"water_supply_missing_{zone_id}"
    registry = ir.async_get(hass)

    await advance(hass, freezer, 700, step=10.0)
    assert len(_bodies(sent)) == 1

    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    stored = registry.async_get_issue(DOMAIN, issue_id)
    assert stored is not None
    registry.issues[(DOMAIN, issue_id)] = replace(stored, active=False)
    _supply(hass, "off")
    sent.clear()

    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert _bodies(sent) == []
