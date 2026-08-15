"""Domain service tests: every service against the running component."""

import json
from copy import deepcopy
from datetime import timedelta

import pytest
import voluptuous as vol
from custom_components.irrigation_maestro import const
from custom_components.irrigation_maestro.const import DOMAIN
from custom_components.irrigation_maestro.engine.curves import CurveKind, curve_value
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.util import dt as dt_util

from .mocks import MockValvePark
from .test_session import START, advance, mock_weather, setup_hub, zone_data


async def test_run_zone_with_duration_override(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await hass.services.async_call(
        DOMAIN, "run_zone", {"zone_id": zone_id, "duration": 2}, blocking=True
    )
    await advance(hass, freezer, 30)  # gather window + open
    assert hass.states.get("valve.pots").state == "open"

    await advance(hass, freezer, 3 * 60)  # 2-minute override elapses
    assert hass.states.get("valve.pots").state == "closed"
    outcome = runtime.state.last_outcome(zone_id)
    assert outcome["result"] == "completed"
    assert outcome["duration_min"] == 2
    # Manual runs never advance the cadence counter.
    assert runtime.state.last_completed(zone_id, "cy_pots") is None


async def test_manual_run_applies_per_day_intensity(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A manual run (no explicit duration) must fold in today's per-day
    intensity override the same way a scheduled run does: runtime._manual_run
    mirrors planner._cycle_target's `zone.adjustment_pct * factor / 100.0`
    composition, where factor is cycle.day_intensity_pct.get(weekday,
    cycle.intensity_pct). So a per-day intensity for today's weekday changes
    the outcome versus the zone's unscaled curve."""
    freezer.move_to(START)
    # runtime._manual_run derives the weekday from local time (dt_util.now()),
    # not UTC. setup_hub() below pins HA's time zone to UTC, so pin it here
    # too before reading the local weekday -- otherwise this runs against
    # pytest-homeassistant's default "US/Pacific" fixture time zone, which
    # can disagree with UTC on which weekday 05:00 UTC falls on.
    await hass.config.async_set_time_zone("UTC")
    weekday = dt_util.now().weekday()
    park = MockValvePark(hass)
    park.add("valve.pots")
    # sunny/30C -> weighted_temp == 30.0 exactly (see test_evaluate_returns_full_plan,
    # which asserts this for the same mock_weather() default against this same
    # weather-only computation).
    mock_weather(hass)
    zone = zone_data("Pots", "valve.pots")
    # Curve authored directly: mild (25C) -> 20', hot (35C) -> 30'.
    zone[const.CONF_CYCLES][0][const.CONF_CURVE] = {
        const.CONF_CURVE_POINTS: [[12, 7], [25, 20], [35, 30]],
        const.CONF_CURVE_MIN: 0,
        const.CONF_CURVE_MAX: 60,
        const.CONF_CURVE_KIND: "duration",
    }
    # Today's per-day intensity is 40% instead of the cycle's default 100%.
    zone[const.CONF_CYCLES][0][const.CONF_CYCLE_DAY_INTENSITY_PCT] = {str(weekday): 40.0}
    entry = await setup_hub(hass, [zone])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    raw_curve = runtime.zones[zone_id].config.cycles[0].curve

    # Sanity-check the raw curve's own value at weighted_temp=30 (interpolating
    # between (25, 20) and (35, 30) -> 25'), so the two branches are proven to
    # differ, not just asserted to differ.
    raw_expected = max(round(curve_value(raw_curve, 30.0, 100.0)), 1)
    assert raw_expected == 25

    await hass.services.async_call(DOMAIN, "run_zone", {"zone_id": zone_id}, blocking=True)
    await advance(hass, freezer, 30)  # gather window + open
    assert hass.states.get("valve.pots").state == "open"

    await advance(hass, freezer, 11 * 60)  # 10-minute intensity-scaled duration elapses
    assert hass.states.get("valve.pots").state == "closed"
    outcome = runtime.state.last_outcome(zone_id)
    assert outcome["result"] == "completed"
    # 40% of the raw curve's 25' value at 30C -> 10', not the raw curve's 25'
    # — proof that day_intensity_pct was consulted, exactly as the engine
    # would consult it for a scheduled run.
    assert outcome["duration_min"] == 10
    assert outcome["duration_min"] != raw_expected


async def test_run_zone_unknown_zone_raises(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "run_zone", {"zone_id": "no_such_zone"}, blocking=True
        )


async def test_skip_today_records_skip_on_trigger(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await hass.services.async_call(DOMAIN, "skip_today", {"zone_id": zone_id}, blocking=True)
    await advance(hass, freezer, 31 * 60)  # trigger at 05:30

    assert ("open_valve", "valve.pots") not in park.commands
    outcome = runtime.state.last_outcome(zone_id)
    assert outcome["result"] == "skipped"
    assert outcome["reason_key"] == "skip_today_requested"


async def test_pause_and_resume(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await hass.services.async_call(DOMAIN, "pause", {"hours": 2, "zone_id": zone_id}, blocking=True)
    assert runtime.zone_status(zone_id) == "paused"

    await hass.services.async_call(DOMAIN, "resume", {"zone_id": zone_id}, blocking=True)
    assert runtime.zone_status(zone_id) == "idle"

    # Global pause without a zone id.
    await hass.services.async_call(DOMAIN, "pause", {"hours": 1}, blocking=True)
    assert runtime.globally_paused
    assert runtime.zone_status(zone_id) == "paused"
    await hass.services.async_call(DOMAIN, "resume", {}, blocking=True)
    assert not runtime.globally_paused
    assert runtime.zone_status(zone_id) == "idle"


async def test_suspend_until_and_resume(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    until = dt_util.utcnow() + timedelta(days=3)
    await hass.services.async_call(
        DOMAIN, "suspend_until", {"until": until.isoformat(), "zone_id": zone_id}, blocking=True
    )
    assert runtime.zone_status(zone_id) == "suspended"
    assert runtime.state.suspended_until(zone_id) == until

    await hass.services.async_call(DOMAIN, "resume", {"zone_id": zone_id}, blocking=True)
    assert runtime.zone_status(zone_id) == "idle"
    assert runtime.state.suspended_until(zone_id) is None


async def test_evaluate_returns_full_plan(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    response = await hass.services.async_call(
        DOMAIN, "evaluate", {}, blocking=True, return_response=True
    )
    assert response["weighted_temp"] == pytest.approx(30.0)
    assert response["skip_reason"] is None
    assert response["skipped"] == []
    assert len(response["runs"]) == 1
    run = response["runs"][0]
    assert run["zone_id"] == zone_id
    assert run["zone_name"] == "Pots"
    assert run["cycle_id"] == "cy_pots"
    assert run["duration_min"] == 3


async def test_evaluate_omits_the_volume_target_when_the_meters_unit_is_unresolvable(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The plan is where zone_flow_meter_usable is actually observable: the
    run's wall-clock duration is identical whether the meter is usable or not
    (both are capped at the safety timeout), but volume_l is only ever set
    when the unit resolved at plan time."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "7.5")  # no unit
    mock_weather(hass)
    zone = zone_data(
        "Alpha",
        "valve.a",
        flow_sensor="sensor.flow",
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
                "volume_safety_timeout_min": 5,
            }
        ],
    )
    await setup_hub(hass, [zone])

    response = await hass.services.async_call(
        DOMAIN, "evaluate", {}, blocking=True, return_response=True
    )
    assert response["runs"][0]["volume_l"] is None

    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    response = await hass.services.async_call(
        DOMAIN, "evaluate", {}, blocking=True, return_response=True
    )
    assert response["runs"][0]["volume_l"] is not None


async def test_set_zone_order_updates_subentry(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    await hass.services.async_call(
        DOMAIN, "set_zone_order", {"zone_id": zone_id, "order": 7}, blocking=True
    )
    await hass.async_block_till_done()
    assert entry.subentries[zone_id].data["order"] == 7
    assert entry.runtime_data.zones[zone_id].config.order == 7


async def test_set_curve_updates_cycle_curve(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    await hass.services.async_call(
        DOMAIN,
        "set_curve",
        {
            "zone_id": zone_id,
            "cycle_id": "cy_pots",
            "points": [[10, 5], [25, 15], [35, 30]],
            "min_value": 2,
            "max_value": 45,
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    curve_data = entry.subentries[zone_id].data["cycles"][0]["curve"]
    assert curve_data["points"] == [[10.0, 5.0], [25.0, 15.0], [35.0, 30.0]]
    assert curve_data["min_value"] == 2.0
    assert curve_data["max_value"] == 45.0
    assert curve_data["kind"] == "duration"
    # The runtime config was rebuilt in place.
    curve = entry.runtime_data.zones[zone_id].config.cycles[0].curve
    assert curve.points == ((10.0, 5.0), (25.0, 15.0), (35.0, 30.0))
    assert curve.min_value == 2.0
    assert curve.max_value == 45.0


async def test_set_curve_keeps_existing_clamps_when_omitted(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Omitting both min_value and max_value on set_curve must keep the
    program's existing clamps, not reset them -- _async_set_curve falls back
    to `cycle.curve.min_value` / `cycle.curve.max_value` when the call omits
    either field. This was previously covered (for the now-removed
    set_simple_curve service, which shares the same fallback via
    _write_cycle_curve) by test_set_simple_curve_keeps_existing_clamps_when_omitted;
    that test is gone with the service, but the fallback itself is still live
    code for set_curve, so it needs its own coverage here."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    before = entry.runtime_data.zones[zone_id].config.cycle("cy_pots").curve
    assert before.min_value == 1.0
    assert before.max_value == 60.0

    await hass.services.async_call(
        DOMAIN,
        "set_curve",
        {"zone_id": zone_id, "cycle_id": "cy_pots", "points": [[10, 5], [25, 15], [35, 30]]},
        blocking=True,
    )
    await hass.async_block_till_done()

    after = entry.runtime_data.zones[zone_id].config.cycle("cy_pots").curve
    assert after.points == ((10.0, 5.0), (25.0, 15.0), (35.0, 30.0))
    assert after.min_value == before.min_value
    assert after.max_value == before.max_value


async def test_set_curve_rejects_bad_input(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    with pytest.raises(ServiceValidationError):  # non-monotonic temperatures
        await hass.services.async_call(
            DOMAIN,
            "set_curve",
            {"zone_id": zone_id, "cycle_id": "cy_pots", "points": [[25, 5], [10, 15]]},
            blocking=True,
        )
    with pytest.raises(ServiceValidationError):  # min above max
        await hass.services.async_call(
            DOMAIN,
            "set_curve",
            {
                "zone_id": zone_id,
                "cycle_id": "cy_pots",
                "points": [[10, 5]],
                "min_value": 50,
                "max_value": 10,
            },
            blocking=True,
        )
    with pytest.raises(ServiceValidationError):  # unknown cycle
        await hass.services.async_call(
            DOMAIN,
            "set_curve",
            {"zone_id": zone_id, "cycle_id": "nope", "points": [[10, 5]]},
            blocking=True,
        )
    # Nothing was written.
    assert "points" in entry.subentries[zone_id].data["cycles"][0]["curve"]
    assert entry.subentries[zone_id].data["cycles"][0]["curve"]["points"] == [[20.0, 3.0]]


async def test_set_curve_switches_kind_to_volume_with_a_meter(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots", flow_sensor="sensor.pots_flow")],
    )
    hass.states.async_set("sensor.pots_flow", "5.0")
    zone_id = entry.runtime_data.zone_ids[0]

    await hass.services.async_call(
        DOMAIN,
        "set_curve",
        {
            "zone_id": zone_id,
            "cycle_id": "cy_pots",
            "points": [[20.0, 30.0]],
            "min_value": 1.0,
            "max_value": 100.0,
            "kind": "volume",
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    cycle = entry.runtime_data.zones[zone_id].config.cycle("cy_pots")
    assert cycle.curve.kind is CurveKind.VOLUME


async def test_set_curve_refuses_volume_without_a_meter(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "set_curve",
            {
                "zone_id": zone_id,
                "cycle_id": "cy_pots",
                "points": [[20.0, 30.0]],
                "kind": "volume",
            },
            blocking=True,
        )


async def test_set_curve_resets_intensity_so_effective_value_matches_request(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Same C1 regression as above, through set_curve's explicit points."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    cycle_id = entry.runtime_data.zones[zone_id].config.cycles[0].cycle_id

    await hass.services.async_call(
        DOMAIN,
        "set_program_minutes",
        {"zone_id": zone_id, "program_id": cycle_id, "minutes": 6},
        blocking=True,
    )
    await hass.async_block_till_done()
    assert entry.runtime_data.zones[zone_id].config.cycle(cycle_id).intensity_pct == 200.0

    await hass.services.async_call(
        DOMAIN,
        "set_curve",
        {
            "zone_id": zone_id,
            "cycle_id": cycle_id,
            "points": [[25.0, 20.0]],
            "min_value": 1.0,
            "max_value": 60.0,
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    cycle = entry.runtime_data.zones[zone_id].config.cycle(cycle_id)
    assert cycle.intensity_pct == 100.0
    assert curve_value(cycle.curve, 25.0, cycle.intensity_pct) == 20.0


async def test_set_curve_clears_per_day_intensity(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """C1 regression, per-day variant: a non-empty day_intensity_pct must not
    survive an explicit curve write either."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    cycle_id = entry.runtime_data.zones[zone_id].config.cycles[0].cycle_id

    await hass.services.async_call(
        DOMAIN,
        "set_program_minutes",
        {"zone_id": zone_id, "program_id": cycle_id, "day_minutes": {"0": 9}},
        blocking=True,
    )
    await hass.async_block_till_done()
    assert entry.runtime_data.zones[zone_id].config.cycle(cycle_id).day_intensity_pct

    await hass.services.async_call(
        DOMAIN,
        "set_curve",
        {"zone_id": zone_id, "cycle_id": cycle_id, "points": [[25.0, 12.0]]},
        blocking=True,
    )
    await hass.async_block_till_done()

    cycle = entry.runtime_data.zones[zone_id].config.cycle(cycle_id)
    assert cycle.day_intensity_pct == {}
    stored = entry.subentries[zone_id].data["cycles"][0]
    assert const.CONF_CYCLE_DAY_INTENSITY_PCT not in stored


async def test_export_import_roundtrip_restores_config(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    response = await hass.services.async_call(
        DOMAIN, "export_config", {}, blocking=True, return_response=True
    )
    payload = response["payload"]
    exported = json.loads(payload)
    assert exported["options"]["settle_pause_s"] == 60
    assert exported["zones"][zone_id]["order"] == 100

    # Mutate the live configuration.
    hass.config_entries.async_update_entry(entry, options={**entry.options, "settle_pause_s": 999})
    await hass.async_block_till_done()
    subentry = entry.subentries[zone_id]
    hass.config_entries.async_update_subentry(entry, subentry, data={**subentry.data, "order": 55})
    await hass.async_block_till_done()
    assert entry.options["settle_pause_s"] == 999
    assert entry.subentries[zone_id].data["order"] == 55

    # Import restores everything.
    await hass.services.async_call(DOMAIN, "import_config", {"payload": payload}, blocking=True)
    await hass.async_block_till_done()
    assert entry.options["settle_pause_s"] == 60
    assert entry.subentries[zone_id].data["order"] == 100
    assert entry.runtime_data.hub.settle_pause_s == 60

    # Unknown zone ids in the payload are rejected before anything is applied.
    bad = json.dumps({"options": dict(entry.options), "zones": {"bogus": {}}})
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(DOMAIN, "import_config", {"payload": bad}, blocking=True)
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "import_config", {"payload": "not json"}, blocking=True
        )


async def test_set_program_schedule_writes_days_and_time(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    program_id = runtime.zones[zone_id].config.cycles[0].cycle_id

    await hass.services.async_call(
        DOMAIN,
        "set_program_schedule",
        {
            "zone_id": zone_id,
            "program_id": program_id,
            "calendar_mode": "weekdays",
            "days": [0, 2, 4],
            "start_kind": "time",
            "start_time": "07:15",
        },
        blocking=True,
    )
    cycle = runtime.zones[zone_id].config.cycles[0]
    assert cycle.calendar.to_config() == {"mode": "weekdays", "days": [0, 2, 4]}
    assert cycle.trigger.kind == "time"
    assert cycle.trigger.at.strftime("%H:%M") == "07:15"


async def test_set_program_schedule_normalizes_hh_mm_ss_start_time(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """HA's time selector (and the services.yaml example) emit "HH:MM:SS";
    models._parse_time only understands "HH:MM". Regression test for the
    critical bug where storing the raw "HH:MM:SS" string corrupted storage:
    the next _build_zones -> CycleConfig.from_config -> _parse_time crashed
    and the whole config entry failed to load."""
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    program_id = runtime.zones[zone_id].config.cycles[0].cycle_id

    await hass.services.async_call(
        DOMAIN,
        "set_program_schedule",
        {
            "zone_id": zone_id,
            "program_id": program_id,
            "start_kind": "time",
            "start_time": "06:00:00",
        },
        blocking=True,
    )

    # The runtime config was rebuilt in place from the persisted dict without
    # raising -- proof that the stored value re-parses via CycleConfig.from_config,
    # the same path the update listener uses on reload.
    cycle = runtime.zones[zone_id].config.cycles[0]
    assert cycle.trigger.kind == "time"
    assert cycle.trigger.at.strftime("%H:%M") == "06:00"

    # The raw stored trigger string itself must be "HH:MM", not "HH:MM:SS".
    raw_trigger = entry.subentries[zone_id].data["cycles"][0]["trigger"]
    assert raw_trigger["at"] == "06:00"
    assert len(raw_trigger["at"]) == 5


async def test_set_program_schedule_rejects_unparseable_time(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The service schema only requires start_time to be a string (cv.string),
    so a value like "xx:yy" survives voluptuous but cannot be parsed as a
    time. _update_cycle must validate the mutated cycle dict through
    CycleConfig.from_config (spec §4.2) and reject it *before* persisting --
    this is the safety net for invalid input other than the "HH:MM:SS" case
    fixed above."""
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    program_id = runtime.zones[zone_id].config.cycles[0].cycle_id
    original_trigger = dict(entry.subentries[zone_id].data["cycles"][0]["trigger"])

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "set_program_schedule",
            {
                "zone_id": zone_id,
                "program_id": program_id,
                "start_kind": "time",
                "start_time": "xx:yy",
            },
            blocking=True,
        )
    # Nothing was written: the unparseable time never reached storage.
    assert entry.subentries[zone_id].data["cycles"][0]["trigger"] == original_trigger
    # The runtime config is untouched too (no reload was ever triggered).
    assert runtime.zones[zone_id].config.cycles[0].trigger.at.strftime("%H:%M") == "05:30"


async def test_set_program_minutes_uniform_sets_intensity_and_clears_per_day(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """This used to decode a "heat" value from the curve and rewrite its
    points; now minutes only ever set an intensity percentage, and the
    curve's control points are left exactly as they were."""
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    program_id = runtime.zones[zone_id].config.cycles[0].cycle_id
    curve_before = dict(entry.subentries[zone_id].data["cycles"][0]["curve"])

    await hass.services.async_call(
        DOMAIN,
        "set_program_minutes",
        {"zone_id": zone_id, "program_id": program_id, "minutes": 18},
        blocking=True,
    )
    await hass.async_block_till_done()

    stored = entry.subentries[zone_id].data["cycles"][0]
    assert stored["curve"] == curve_before  # every control point survives
    # The fixture's curve is flat at 3 minutes, so 18 minutes is 600 %.
    assert stored["intensity_pct"] == 600.0
    assert runtime.zones[zone_id].config.cycles[0].day_intensity_pct == {}  # per-day cleared


async def test_set_program_minutes_uniform_clears_existing_per_day_override(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A non-empty per-day override must be wiped by a subsequent uniform
    call. Starting from an already-empty override (as other tests do) can't
    tell "cleared" from "was never set" apart."""
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    program_id = runtime.zones[zone_id].config.cycles[0].cycle_id

    await hass.services.async_call(
        DOMAIN,
        "set_program_minutes",
        {"zone_id": zone_id, "program_id": program_id, "day_minutes": {"0": 10}},
        blocking=True,
    )
    await hass.async_block_till_done()
    # The override must actually be there, or clearing it proves nothing.
    stored = entry.subentries[zone_id].data["cycles"][0]
    assert stored["day_intensity_pct"]  # non-empty

    await hass.services.async_call(
        DOMAIN,
        "set_program_minutes",
        {"zone_id": zone_id, "program_id": program_id, "minutes": 18},
        blocking=True,
    )
    await hass.async_block_till_done()

    stored = entry.subentries[zone_id].data["cycles"][0]
    assert stored["intensity_pct"] == 600.0
    assert "day_intensity_pct" not in stored


async def test_set_program_minutes_per_day_sets_day_intensity(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    program_id = runtime.zones[zone_id].config.cycles[0].cycle_id

    await hass.services.async_call(
        DOMAIN,
        "set_program_minutes",
        {"zone_id": zone_id, "program_id": program_id, "day_minutes": {"0": 10, "4": 20}},
        blocking=True,
    )
    # The fixture's curve is flat at 3 minutes at 25 C.
    assert runtime.zones[zone_id].config.cycles[0].day_intensity_pct == {
        0: pytest.approx(333.33),
        4: pytest.approx(666.67),
    }


async def test_set_program_minutes_rejects_non_numeric_day_key(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    program_id = runtime.zones[zone_id].config.cycles[0].cycle_id

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "set_program_minutes",
            {"zone_id": zone_id, "program_id": program_id, "day_minutes": {"monday": 10}},
            blocking=True,
        )
    # Nothing was written: the bad key was rejected before persisting.
    assert runtime.zones[zone_id].config.cycles[0].day_intensity_pct == {}


async def test_set_program_minutes_rejects_unknown_program(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "set_program_minutes",
            {"zone_id": zone_id, "program_id": "nope", "minutes": 12},
            blocking=True,
        )


async def test_stop_all_during_watering_closes_and_blocks(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots", minutes=10)])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 31 * 60)  # trigger at 05:30
    assert hass.states.get("valve.pots").state == "open"

    await hass.services.async_call(DOMAIN, "stop_all", {}, blocking=True)
    await advance(hass, freezer, 60)

    assert hass.states.get("valve.pots").state == "closed"
    assert ("close_valve", "valve.pots") in park.commands
    # The manual block window is armed.
    assert runtime.state.manual_stop_at is not None
    assert runtime.manual_block_active()
    outcome = runtime.state.last_outcome(zone_id)
    assert outcome["result"] == "interrupted"


async def test_add_program_creates_enabled_program(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    before = len(runtime.zones[zone_id].config.cycles)

    resp = await hass.services.async_call(
        DOMAIN,
        "add_program",
        {"zone_id": zone_id, "name": "Sera"},
        blocking=True,
        return_response=True,
    )
    new_id = resp["program_id"]
    cycles = runtime.zones[zone_id].config.cycles
    assert len(cycles) == before + 1
    added = next(c for c in cycles if c.cycle_id == new_id)
    assert added.name == "Sera"
    assert added.curve.kind is CurveKind.DURATION
    assert runtime.state.cycle_enabled(zone_id, new_id) is True  # defaults enabled


async def test_add_program_default_curve_matches_the_retired_semantic_mapping(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """These are exactly the points the retired semantic mapping produced for
    amount=15 / heat=8 (points_from_semantic(15, 8) == ((12.0, 5.0),
    (25.0, 15.0), (35.0, 23.0)) before that module was deleted), so a program
    created before and after 3.0.0 starts identically. DEFAULT_CURVE_POINTS
    in services.py is now a bare literal with no other check on its value --
    this test is what stops it drifting (e.g. a typo silently changing how
    every newly created program waters)."""
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    resp = await hass.services.async_call(
        DOMAIN,
        "add_program",
        {"zone_id": zone_id, "name": "Sera"},
        blocking=True,
        return_response=True,
    )
    new_id = resp["program_id"]

    curve_data = next(
        c["curve"] for c in entry.subentries[zone_id].data["cycles"] if c["id"] == new_id
    )
    assert curve_data["points"] == [[12.0, 5.0], [25.0, 15.0], [35.0, 23.0]]
    assert curve_data["min_value"] == 1.0
    assert curve_data["max_value"] == 60.0
    assert curve_data["kind"] == "duration"

    added = runtime.zones[zone_id].config.cycle(new_id)
    assert added is not None
    assert added.curve.points == ((12.0, 5.0), (25.0, 15.0), (35.0, 23.0))
    assert added.curve.min_value == 1.0
    assert added.curve.max_value == 60.0
    assert added.curve.kind is CurveKind.DURATION


async def test_add_program_validates_through_typed_model_before_persist(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, monkeypatch: pytest.MonkeyPatch
) -> None:
    """_async_add_program must validate the built/copied program dict through
    CycleConfig.from_config *before* appending and persisting it (spec §4.2),
    so a bad copy_from source or a bad default can never be saved. Simulate
    "the typed model rejects this program" by making CycleConfig.from_config
    fail, and prove the failure surfaces as ServiceValidationError with
    nothing written -- rather than a raw exception after persisting."""
    from custom_components.irrigation_maestro import models

    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    before_cycles = list(entry.subentries[zone_id].data["cycles"])

    def _always_invalid(config: dict, templates: dict) -> None:
        raise ValueError("synthetic_failure_for_test")

    monkeypatch.setattr(models.CycleConfig, "from_config", staticmethod(_always_invalid))

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "add_program",
            {"zone_id": zone_id, "name": "Bad"},
            blocking=True,
            return_response=True,
        )
    # Nothing was appended or persisted: the invalid program never reached storage.
    assert entry.subentries[zone_id].data["cycles"] == before_cycles
    assert len(runtime.zones[zone_id].config.cycles) == len(before_cycles)


async def test_duplicate_program_is_a_fresh_program(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    # A watering marker on the source: the duplicate must not inherit cadence.
    entry.runtime_data.state.set_last_completed(zone_id, "cy_pots", dt_util.now().date())

    response = await hass.services.async_call(
        DOMAIN,
        "duplicate_program",
        {"zone_id": zone_id, "program_id": "cy_pots"},
        blocking=True,
        return_response=True,
    )
    await hass.async_block_till_done()

    new_id = response["program_id"]
    assert new_id != "cy_pots"
    cycles = entry.subentries[zone_id].data["cycles"]
    assert len(cycles) == 2
    duplicate = next(c for c in cycles if c["id"] == new_id)
    source = next(c for c in cycles if c["id"] == "cy_pots")
    assert duplicate["curve"] == source["curve"]
    assert duplicate["name"] == "Morning (copy)"
    assert entry.runtime_data.state.last_completed(zone_id, new_id) is None


async def test_duplicate_program_name_does_not_collide(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    for _ in range(2):
        await hass.services.async_call(
            DOMAIN,
            "duplicate_program",
            {"zone_id": zone_id, "program_id": "cy_pots"},
            blocking=True,
            return_response=True,
        )
        await hass.async_block_till_done()

    names = [c["name"] for c in entry.subentries[zone_id].data["cycles"]]
    assert names == ["Morning", "Morning (copy)", "Morning (copy) 2"]


async def test_duplicate_program_into_another_zone(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots"), zone_data("Lawn", "valve.lawn")],
    )
    pots, lawn = entry.runtime_data.zone_ids[0], entry.runtime_data.zone_ids[1]

    response = await hass.services.async_call(
        DOMAIN,
        "duplicate_program",
        {"zone_id": pots, "program_id": "cy_pots", "target_zone_id": lawn, "name": "Borrowed"},
        blocking=True,
        return_response=True,
    )
    await hass.async_block_till_done()

    assert len(entry.subentries[pots].data["cycles"]) == 1
    lawn_cycles = entry.subentries[lawn].data["cycles"]
    assert [c["name"] for c in lawn_cycles] == ["Morning", "Borrowed"]
    assert lawn_cycles[1]["id"] == response["program_id"]


async def test_duplicate_volume_program_into_a_meterless_zone_is_refused(
    hass: HomeAssistant,
) -> None:
    """Documented behaviour: refuse, rather than silently degrade the copy to
    a timed run in a zone that cannot measure liters."""
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                flow_sensor="sensor.pots_flow",
                cycles=[
                    {
                        "id": "c1",
                        "name": "Morning",
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": {
                            "points": [[20.0, 30.0]],
                            "min_value": 1.0,
                            "max_value": 100.0,
                            "kind": "volume",
                        },
                    }
                ],
            ),
            zone_data("Lawn", "valve.lawn"),
        ],
    )
    hass.states.async_set("sensor.pots_flow", "5.0")
    pots, lawn = entry.runtime_data.zone_ids[0], entry.runtime_data.zone_ids[1]

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "duplicate_program",
            {"zone_id": pots, "program_id": "c1", "target_zone_id": lawn},
            blocking=True,
            return_response=True,
        )


async def test_copy_curve_changes_only_the_curve(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                cycles=[
                    {
                        "id": "src",
                        "name": "Source",
                        "trigger": {"kind": "time", "at": "04:00"},
                        "curve": {
                            "points": [[10.0, 10.0], [30.0, 30.0], [42.5, 55.0]],
                            "min_value": 10.0,
                            "max_value": 55.0,
                        },
                    }
                ],
            ),
            zone_data("Lawn", "valve.lawn", at="06:15"),
        ],
    )
    pots, lawn = entry.runtime_data.zone_ids[0], entry.runtime_data.zone_ids[1]
    before = dict(entry.subentries[lawn].data["cycles"][0])

    await hass.services.async_call(
        DOMAIN,
        "copy_curve",
        {
            "source_zone_id": pots,
            "source_program_id": "src",
            "zone_id": lawn,
            "program_id": "cy_lawn",
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    after = entry.subentries[lawn].data["cycles"][0]
    assert after["curve"] == entry.subentries[pots].data["cycles"][0]["curve"]
    for key in ("id", "name", "trigger"):
        assert after[key] == before[key]


async def test_copy_curve_leaves_the_intensity_alone(hass: HomeAssistant) -> None:
    """The curve is the shape; the intensity is the strength. Copying one must
    not carry the other."""
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Pots", "valve.pots"),
            zone_data("Lawn", "valve.lawn"),
        ],
    )
    pots, lawn = entry.runtime_data.zone_ids[0], entry.runtime_data.zone_ids[1]
    await hass.services.async_call(
        DOMAIN,
        "set_program_minutes",
        {"zone_id": lawn, "program_id": "cy_lawn", "minutes": 9},
        blocking=True,
    )
    await hass.async_block_till_done()
    intensity = entry.subentries[lawn].data["cycles"][0]["intensity_pct"]

    await hass.services.async_call(
        DOMAIN,
        "copy_curve",
        {
            "source_zone_id": pots,
            "source_program_id": "cy_pots",
            "zone_id": lawn,
            "program_id": "cy_lawn",
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    assert entry.subentries[lawn].data["cycles"][0]["intensity_pct"] == intensity


async def test_remove_program_refuses_last(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    only_id = runtime.zones[zone_id].config.cycles[0].cycle_id
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "remove_program", {"zone_id": zone_id, "program_id": only_id}, blocking=True
        )


async def test_add_then_remove_program(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    resp = await hass.services.async_call(
        DOMAIN, "add_program", {"zone_id": zone_id}, blocking=True, return_response=True
    )
    new_id = resp["program_id"]
    await hass.services.async_call(
        DOMAIN, "remove_program", {"zone_id": zone_id, "program_id": new_id}, blocking=True
    )
    assert all(c.cycle_id != new_id for c in runtime.zones[zone_id].config.cycles)


async def test_rename_program(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    freezer.move_to(START)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    pid = runtime.zones[zone_id].config.cycles[0].cycle_id
    await hass.services.async_call(
        DOMAIN,
        "rename_program",
        {"zone_id": zone_id, "program_id": pid, "name": "Alba"},
        blocking=True,
    )
    assert runtime.zones[zone_id].config.cycle(pid).name == "Alba"


async def test_add_zone_creates_zone_in_place(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    park.add("valve.newzone")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    before = set(runtime.zone_ids)

    resp = await hass.services.async_call(
        DOMAIN,
        "add_zone",
        {"name": "Aiuole", "valve_entity": "valve.newzone", "area_m2": 12},
        blocking=True,
        return_response=True,
    )
    await hass.async_block_till_done()
    new_id = resp["zone_id"]
    assert new_id not in before
    assert new_id in runtime.zone_ids
    zone = runtime.zones[new_id].config
    assert zone.name == "Aiuole"
    assert zone.valve_entity == "valve.newzone"
    assert len(zone.cycles) == 1  # seeded default program
    # entities reconciled in place (no reload): a zone_state sensor exists
    assert any(s.attributes.get("zone_id") == new_id for s in hass.states.async_all("sensor"))


async def test_add_zone_rejects_invalid(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises(vol.Invalid):
        # missing required valve_entity -> schema validation rejects before
        # the handler ever runs (MultipleInvalid is raised by HA's service
        # registry, not wrapped as ServiceValidationError).
        await hass.services.async_call(
            DOMAIN, "add_zone", {"name": "X"}, blocking=True, return_response=True
        )


async def test_add_zone_writes_the_defaults_explicitly(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    park.add("valve.lawn")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots", order=100)])

    response = await hass.services.async_call(
        DOMAIN,
        "add_zone",
        {"name": "Lawn", "valve_entity": "valve.lawn"},
        blocking=True,
        return_response=True,
    )
    await hass.async_block_till_done()

    data = entry.subentries[response["zone_id"]].data
    # A new zone lands at the end of the sequence instead of tying with the
    # zones already there.
    assert data["order"] == 101
    assert data["adjustment_pct"] == const.DEFAULT_ADJUSTMENT_PCT


async def test_update_zone_patches_in_place(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zid = runtime.zone_ids[0]
    cycles_before = len(runtime.zones[zid].config.cycles)

    await hass.services.async_call(
        DOMAIN,
        "update_zone",
        {"zone_id": zid, "name": "Vasi", "area_m2": 5, "compatibility_group": "g1"},
        blocking=True,
    )
    zone = runtime.zones[zid].config
    assert zone.name == "Vasi"
    assert zone.area_m2 == 5
    assert zone.compatibility_group == "g1"
    assert len(zone.cycles) == cycles_before  # programs preserved


async def test_update_zone_unknown(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "update_zone", {"zone_id": "nope", "name": "X"}, blocking=True
        )


async def test_remove_zone(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    park.add("valve.b")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots"), zone_data("B", "valve.b")])
    runtime = entry.runtime_data
    victim = runtime.zone_ids[0]

    await hass.services.async_call(DOMAIN, "remove_zone", {"zone_id": victim}, blocking=True)
    await hass.async_block_till_done()
    assert victim not in runtime.zone_ids
    assert not any(s.attributes.get("zone_id") == victim for s in hass.states.async_all("sensor"))


async def test_set_weather_sources(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN,
        "set_weather_sources",
        {"weather_entity": "weather.home", "rain_sensor": "sensor.rain"},
        blocking=True,
    )
    from custom_components.irrigation_maestro.models import HubConfig

    hub = HubConfig.from_options(dict(entry.options))
    assert hub.weather_entity == "weather.home"
    assert hub.rain_sensor == "sensor.rain"


async def test_set_weather_sources_clears_outdoor_temp(hass, freezer):
    """Setting then clearing (empty string) outdoor_temp_sensor removes it."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    # 1) set it
    await hass.services.async_call(
        DOMAIN,
        "set_weather_sources",
        {"weather_entity": "weather.home", "outdoor_temp_sensor": "sensor.temp"},
        blocking=True,
    )
    assert entry.options.get(const.CONF_OUTDOOR_TEMP_SENSOR) == "sensor.temp"
    # 2) clear it with an explicit empty string
    await hass.services.async_call(
        DOMAIN,
        "set_weather_sources",
        {"weather_entity": "weather.home", "outdoor_temp_sensor": ""},
        blocking=True,
    )
    assert const.CONF_OUTDOOR_TEMP_SENSOR not in entry.options


async def test_set_weather_sources_requires_weather(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises((ServiceValidationError, vol.Invalid)):
        await hass.services.async_call(
            DOMAIN, "set_weather_sources", {"weather_entity": ""}, blocking=True
        )


async def test_set_consumption_budget(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN,
        "set_consumption_budget",
        {"liters_per_month": 8000, "action": "reduce", "reduce_pct": 40},
        blocking=True,
    )
    from custom_components.irrigation_maestro.models import HubConfig

    hub = HubConfig.from_options(dict(entry.options))
    assert hub.consumption_budget_liters == 8000
    assert hub.consumption_action == "reduce"
    assert hub.consumption_reduce_pct == 40


async def test_set_restrictions(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN,
        "set_restrictions",
        {
            "forbidden_windows": [{"start": "22:00", "end": "06:00"}],
        },
        blocking=True,
    )
    from custom_components.irrigation_maestro.models import HubConfig

    hub = HubConfig.from_options(dict(entry.options))
    assert len(hub.restrictions.forbidden_windows) == 1


async def test_set_restrictions_normalizes_window_times(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN,
        "set_restrictions",
        {
            "forbidden_windows": [{"start": "22:00:00", "end": "06:00:00"}],
        },
        blocking=True,
    )
    from custom_components.irrigation_maestro.models import HubConfig

    hub = HubConfig.from_options(dict(entry.options))
    assert len(hub.restrictions.forbidden_windows) == 1
    # Verify the stored values in options are normalized to HH:MM
    window_data = entry.options[const.CONF_RESTRICTIONS][const.CONF_FORBIDDEN_WINDOWS][0]
    assert window_data[const.CONF_WINDOW_START] == "22:00"
    assert window_data[const.CONF_WINDOW_END] == "06:00"


async def test_set_program_minutes_never_touches_the_curve(hass: HomeAssistant) -> None:
    """The regression this release exists for: a quick minutes change used to
    rewrite the control points, silently replacing whatever curve was there."""
    mock_weather(hass)
    curve = {
        "points": [[10.0, 10.0], [30.0, 30.0], [42.5, 55.0]],
        "min_value": 10.0,
        "max_value": 55.0,
    }
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                cycles=[
                    {
                        "id": "c1",
                        "name": "Morning",
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": dict(curve),
                    }
                ],
            )
        ],
    )
    zone_id = entry.runtime_data.zone_ids[0]

    await hass.services.async_call(
        DOMAIN,
        "set_program_minutes",
        {"zone_id": zone_id, "program_id": "c1", "minutes": 50},
        blocking=True,
    )
    await hass.async_block_till_done()

    stored = entry.subentries[zone_id].data["cycles"][0]
    assert stored["curve"] == curve  # every control point survives
    # Raw value at 25 C is 25 min, so 50 minutes is 200 %.
    assert stored["intensity_pct"] == 200.0


async def test_set_program_minutes_hits_the_target_through_a_floor(
    hass: HomeAssistant,
) -> None:
    """The factor comes from the unclamped value: deriving it from the clamped
    one would ask for 200 % and deliver 16 minutes instead of 20."""
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                cycles=[
                    {
                        "id": "c1",
                        "name": "Morning",
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": {
                            "points": [[25.0, 8.0]],
                            "min_value": 10.0,
                            "max_value": 60.0,
                        },
                    }
                ],
            )
        ],
    )
    zone_id = entry.runtime_data.zone_ids[0]

    await hass.services.async_call(
        DOMAIN,
        "set_program_minutes",
        {"zone_id": zone_id, "program_id": "c1", "minutes": 20},
        blocking=True,
    )
    await hass.async_block_till_done()

    cycle = entry.runtime_data.zones[zone_id].config.cycle("c1")
    assert cycle.intensity_pct == 250.0
    assert curve_value(cycle.curve, 25.0, cycle.intensity_pct) == pytest.approx(20.0)


async def test_set_program_minutes_refuses_a_curve_worth_zero(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                cycles=[
                    {
                        "id": "c1",
                        "name": "Morning",
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": {
                            "points": [[25.0, 0.0]],
                            "min_value": 0.0,
                            "max_value": 60.0,
                        },
                    }
                ],
            )
        ],
    )
    zone_id = entry.runtime_data.zone_ids[0]

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "set_program_minutes",
            {"zone_id": zone_id, "program_id": "c1", "minutes": 20},
            blocking=True,
        )


async def test_set_program_day_minutes_writes_per_day_intensity(hass: HomeAssistant) -> None:
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                cycles=[
                    {
                        "id": "c1",
                        "name": "Morning",
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": {
                            "points": [[25.0, 20.0]],
                            "min_value": 1.0,
                            "max_value": 60.0,
                        },
                    }
                ],
            )
        ],
    )
    zone_id = entry.runtime_data.zone_ids[0]

    await hass.services.async_call(
        DOMAIN,
        "set_program_minutes",
        {"zone_id": zone_id, "program_id": "c1", "day_minutes": {"0": 30, "3": 10}},
        blocking=True,
    )
    await hass.async_block_till_done()

    stored = entry.subentries[zone_id].data["cycles"][0]
    assert stored["day_intensity_pct"] == {"0": 150.0, "3": 50.0}
    assert "day_minutes" not in stored


async def test_no_non_curve_operation_rewrites_the_curve(hass: HomeAssistant) -> None:
    """Rename, reschedule, recalendar and rescale a program: the control
    points must come out byte-identical. This is the guarantee 3.0.0 exists
    to provide."""
    mock_weather(hass)
    curve = {
        "points": [[5.0, 4.0], [12.0, 10.0], [25.0, 24.0], [33.0, 40.0], [40.0, 52.0]],
        "min_value": 1.0,
        "max_value": 60.0,
    }
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                cycles=[
                    {
                        "id": "c1",
                        "name": "Morning",
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": dict(curve),
                    }
                ],
            )
        ],
    )
    zone_id = entry.runtime_data.zone_ids[0]
    program = {"zone_id": zone_id, "program_id": "c1"}

    for service, payload in (
        ("rename_program", {"name": "Evening"}),
        (
            "set_program_schedule",
            {
                "calendar_mode": "weekdays",
                "days": [0, 2, 4],
                "start_kind": "time",
                "start_time": "06:15",
            },
        ),
        (
            "set_program_schedule",
            {
                "calendar_mode": "interval",
                "interval_days": 3,
                "start_kind": "sun",
                "start_event": "sunrise",
                "start_offset_min": 0,
            },
        ),
        ("set_program_minutes", {"minutes": 30}),
        ("set_program_minutes", {"day_minutes": {"0": 12}}),
    ):
        await hass.services.async_call(DOMAIN, service, {**program, **payload}, blocking=True)
        await hass.async_block_till_done()
        stored = entry.subentries[zone_id].data["cycles"][0]
        assert stored["curve"] == curve, f"{service} rewrote the curve"


async def test_export_import_round_trip_preserves_both_curve_forms(
    hass: HomeAssistant,
) -> None:
    """A v3 payload carries explicit points and import must accept it
    unchanged. A payload exported by a 2.x install still carries a curve
    template reference plus a day_minutes map (I1); import must run every
    zone through the same v2 -> v3 migration a config-entry version bump
    uses, MATERIALISING the reference into explicit points and converting
    day_minutes into day_intensity_pct -- writing either verbatim would
    silently revive the two defects that migration exists to remove. (This
    replaces a prior version of this test that asserted the template
    reference survived import as a reference: that expectation encoded the
    I1 bug rather than catching it.)"""
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    response = await hass.services.async_call(
        DOMAIN, "export_config", {}, blocking=True, return_response=True
    )
    exported = json.loads(response["payload"])
    assert "points" in exported["zones"][zone_id]["cycles"][0]["curve"]

    await hass.services.async_call(
        DOMAIN, "import_config", {"payload": response["payload"]}, blocking=True
    )
    await hass.async_block_till_done()
    assert (
        entry.subentries[zone_id].data["cycles"][0]["curve"]
        == (exported["zones"][zone_id]["cycles"][0]["curve"])
    )

    legacy = deepcopy(exported)
    legacy["zones"][zone_id]["cycles"][0]["curve"] = {"template": "preset_pots"}
    legacy["zones"][zone_id]["cycles"][0]["day_minutes"] = {"0": 5}
    await hass.services.async_call(
        DOMAIN, "import_config", {"payload": json.dumps(legacy)}, blocking=True
    )
    await hass.async_block_till_done()

    # The reference is materialised into PRESET_POTS's explicit points in
    # STORAGE -- not merely resolvable at read time via CycleConfig, which
    # would resolve a stored reference too and hide the defect.
    stored = entry.subentries[zone_id].data["cycles"][0]
    stored_curve = stored["curve"]
    assert stored_curve["points"] == [[10.0, 10.0], [30.0, 30.0], [42.5, 55.0]]
    assert stored_curve["min_value"] == 10.0
    assert stored_curve["max_value"] == 55.0
    assert "template" not in stored_curve

    cycle = entry.runtime_data.zones[zone_id].config.cycle("cy_pots")
    assert cycle.curve.points == ((10.0, 10.0), (30.0, 30.0), (42.5, 55.0))

    # The legacy day_minutes map is not dropped: it becomes an equivalent
    # day_intensity_pct. PRESET_POTS interpolates to 25' at the 25C
    # reference, so 5 minutes on weekday 0 is 20 %.
    assert "day_minutes" not in stored
    assert stored["day_intensity_pct"] == {"0": 20.0}
    assert cycle.day_intensity_pct == {0: 20.0}


async def test_import_config_reports_dropped_day_minutes_as_repair_issue(
    hass: HomeAssistant,
) -> None:
    """A legacy day_minutes map that the v2 -> v3 migration cannot scale (the
    curve is worth zero at the reference temperature) must surface as a
    repair issue on import -- the same as it would on a config-entry version
    bump -- rather than silently vanishing."""
    from homeassistant.helpers import issue_registry as ir

    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    response = await hass.services.async_call(
        DOMAIN, "export_config", {}, blocking=True, return_response=True
    )
    payload = json.loads(response["payload"])
    cycle = payload["zones"][zone_id]["cycles"][0]
    cycle["curve"] = {"points": [[20.0, 0.0]], "min_value": 0.0, "max_value": 10.0}
    cycle["day_minutes"] = {"0": 5}

    await hass.services.async_call(
        DOMAIN, "import_config", {"payload": json.dumps(payload)}, blocking=True
    )
    await hass.async_block_till_done()

    stored = entry.subentries[zone_id].data["cycles"][0]
    assert "day_minutes" not in stored
    assert "day_intensity_pct" not in stored  # nothing to scale into, not invented

    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "migration_day_minutes_dropped") is not None


async def test_import_config_rejects_a_malformed_payload_cleanly(hass: HomeAssistant) -> None:
    """A hand-edited backup must produce a translated error, not a traceback.

    The v2 -> v3 migration this service runs on every imported zone must be
    covered by the same translated-error contract as the rest of import: a
    zone shaped so the migration itself blows up (not just the later typed
    parse) still has to come back as ServiceValidationError, and nothing may
    be written on the way there.
    """
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    before = dict(entry.subentries[zone_id].data)
    payload = json.dumps({"options": dict(entry.options), "zones": {zone_id: {"cycles": "abc"}}})

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(DOMAIN, "import_config", {"payload": payload}, blocking=True)
    # Atomic: nothing written on the way to the error.
    assert dict(entry.subentries[zone_id].data) == before


async def test_set_curve_rejects_a_point_value_over_a_day(hass: HomeAssistant) -> None:
    """The config flow's only bound on a curve point's value (1440 minutes)
    disappeared with the flow itself. Now that set_curve is the authoring
    surface, the bound must live there instead -- but only for a DURATION
    curve; the handler is the only place that knows the kind, so the check
    runs there and raises a translated ServiceValidationError rather than a
    bare vol.Invalid."""
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "set_curve",
            {"zone_id": zone_id, "cycle_id": "cy_pots", "points": [[10, 5000]]},
            blocking=True,
        )
    # Nothing was written.
    assert entry.subentries[zone_id].data["cycles"][0]["curve"]["points"] == [[20.0, 3.0]]


async def test_set_curve_accepts_a_point_value_over_a_day_for_volume(
    hass: HomeAssistant,
) -> None:
    """The 1440-minute bound is duration-only. 2000 litres is an ordinary
    target (25 mm over 80 m2) for a VOLUME curve and must not be capped by a
    limit that only ever meant a day of minutes."""
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots", flow_sensor="sensor.pots_flow")],
    )
    hass.states.async_set("sensor.pots_flow", "5.0")
    zone_id = entry.runtime_data.zone_ids[0]

    await hass.services.async_call(
        DOMAIN,
        "set_curve",
        {
            "zone_id": zone_id,
            "cycle_id": "cy_pots",
            "points": [[20.0, 2000.0]],
            "kind": "volume",
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    cycle = entry.runtime_data.zones[zone_id].config.cycle("cy_pots")
    assert cycle.curve.kind is CurveKind.VOLUME
    assert cycle.curve.points == ((20.0, 2000.0),)


async def test_update_zone_stores_a_flow_unit_override(hass: HomeAssistant) -> None:
    # add_zone deliberately accepts only name/valve_entity/area_m2/icon (see
    # panel.ts and zone-editor.ts): a sensor and its unit override are set
    # afterwards through update_zone, same as flow_sensor itself already is.
    entry = await setup_hub(hass, [])
    await hass.services.async_call(
        DOMAIN,
        "add_zone",
        {"name": "Vasi", "valve_entity": "valve.vasi"},
        blocking=True,
    )
    zone_id = next(iter(entry.subentries))
    await hass.services.async_call(
        DOMAIN,
        "update_zone",
        {
            "zone_id": zone_id,
            "flow_sensor": "sensor.vasi_flow",
            "flow_sensor_unit": "m³/h",
        },
        blocking=True,
    )
    assert entry.subentries[zone_id].data["flow_sensor_unit"] == "m³/h"


async def test_update_zone_can_clear_its_flow_unit_override(hass: HomeAssistant) -> None:
    # flow_sensor_unit is the only zone field whose "unset" state is itself a
    # user-visible, user-choosable option (detect automatically), so an empty
    # string must clear it rather than store an empty string.
    entry = await setup_hub(hass, [])
    await hass.services.async_call(
        DOMAIN,
        "add_zone",
        {"name": "Vasi", "valve_entity": "valve.vasi"},
        blocking=True,
    )
    zone_id = next(iter(entry.subentries))
    await hass.services.async_call(
        DOMAIN,
        "update_zone",
        {
            "zone_id": zone_id,
            "flow_sensor": "sensor.vasi_flow",
            "flow_sensor_unit": "m³/h",
        },
        blocking=True,
    )
    assert entry.subentries[zone_id].data["flow_sensor_unit"] == "m³/h"

    await hass.services.async_call(
        DOMAIN,
        "update_zone",
        {"zone_id": zone_id, "flow_sensor_unit": ""},
        blocking=True,
    )
    assert "flow_sensor_unit" not in entry.subentries[zone_id].data


async def test_a_unit_the_converter_cannot_handle_is_refused(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [])
    await hass.services.async_call(
        DOMAIN,
        "add_zone",
        {"name": "Vasi", "valve_entity": "valve.vasi"},
        blocking=True,
    )
    zone_id = next(iter(entry.subentries))
    with pytest.raises(vol.Invalid):
        await hass.services.async_call(
            DOMAIN,
            "update_zone",
            {"zone_id": zone_id, "flow_sensor_unit": "widgets/s"},
            blocking=True,
        )


async def test_set_weather_sources_stores_the_line_meter_unit(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [])
    await hass.services.async_call(
        DOMAIN,
        "set_weather_sources",
        {
            "weather_entity": "weather.test",
            "line_flow_sensor": "sensor.line",
            "line_flow_sensor_unit": "m³/h",
        },
        blocking=True,
    )
    assert entry.options["line_flow_sensor_unit"] == "m³/h"


async def test_clearing_the_line_meter_clears_its_unit_override(hass: HomeAssistant) -> None:
    # An override that outlived its sensor would silently apply to whatever
    # sensor is configured next.
    entry = await setup_hub(
        hass, [], {"line_flow_sensor": "sensor.line", "line_flow_sensor_unit": "m³/h"}
    )
    await hass.services.async_call(
        DOMAIN,
        "set_weather_sources",
        {"weather_entity": "weather.test", "line_flow_sensor": ""},
        blocking=True,
    )
    assert "line_flow_sensor" not in entry.options
    assert "line_flow_sensor_unit" not in entry.options


async def test_set_weather_sources_can_clear_just_the_line_meter_unit(
    hass: HomeAssistant,
) -> None:
    # The sensor stays configured; only the override is cleared, so detection
    # resumes without losing the line meter itself.
    entry = await setup_hub(
        hass, [], {"line_flow_sensor": "sensor.line", "line_flow_sensor_unit": "m³/h"}
    )
    await hass.services.async_call(
        DOMAIN,
        "set_weather_sources",
        {
            "weather_entity": "weather.test",
            "line_flow_sensor": "sensor.line",
            "line_flow_sensor_unit": "",
        },
        blocking=True,
    )
    assert entry.options["line_flow_sensor"] == "sensor.line"
    assert "line_flow_sensor_unit" not in entry.options


async def test_update_zone_stores_the_leak_and_supply_sensors(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await hass.services.async_call(
        DOMAIN,
        "update_zone",
        {
            "zone_id": zone_id,
            "leak_sensor": "binary_sensor.a_leak",
            "water_supply_sensor": "binary_sensor.a_supply",
        },
        blocking=True,
    )

    config = runtime.zones[zone_id].config
    assert config.leak_sensor == "binary_sensor.a_leak"
    assert config.water_supply_sensor == "binary_sensor.a_supply"


async def test_a_zone_without_the_new_keys_still_loads(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Backward compatibility: existing subentries have neither key."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    config = entry.runtime_data.zones[entry.runtime_data.zone_ids[0]].config
    assert config.leak_sensor is None
    assert config.water_supply_sensor is None
