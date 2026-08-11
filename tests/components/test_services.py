"""Domain service tests: every service against the running component."""

import json
from datetime import timedelta

import pytest
import voluptuous as vol
from custom_components.irrigation_maestro.const import DOMAIN
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
    assert runtime.state.last_completed(zone_id) is None


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


async def test_set_simple_curve_stores_generated_points(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    cycle_id = entry.runtime_data.zones[zone_id].config.cycles[0].cycle_id

    await hass.services.async_call(
        DOMAIN,
        "set_simple_curve",
        {"zone_id": zone_id, "cycle_id": cycle_id, "amount": 15, "heat": 15},
        blocking=True,
    )
    await hass.async_block_till_done()

    cycle = entry.runtime_data.zones[zone_id].config.cycle(cycle_id)
    # Reference values from points_from_semantic(15, 15); see
    # tests/engine/test_semantic.py::test_points_endpoints_match_amount_and_heat.
    assert cycle.curve.points == ((12.0, 0.0), (25.0, 15.0), (35.0, 30.0))


async def test_set_simple_curve_keeps_existing_clamps_when_omitted(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    cycle_id = entry.runtime_data.zones[zone_id].config.cycles[0].cycle_id
    before = entry.runtime_data.zones[zone_id].config.cycle(cycle_id).curve

    await hass.services.async_call(
        DOMAIN,
        "set_simple_curve",
        {"zone_id": zone_id, "cycle_id": cycle_id, "amount": 20, "heat": 10},
        blocking=True,
    )
    await hass.async_block_till_done()
    after = entry.runtime_data.zones[zone_id].config.cycle(cycle_id).curve
    assert after.min_value == before.min_value
    assert after.max_value == before.max_value


async def test_set_simple_curve_rejects_out_of_range(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    cycle_id = entry.runtime_data.zones[zone_id].config.cycles[0].cycle_id

    with pytest.raises(vol.Invalid):  # MultipleInvalid before the handler ever runs
        await hass.services.async_call(
            DOMAIN,
            "set_simple_curve",
            {"zone_id": zone_id, "cycle_id": cycle_id, "amount": 999, "heat": 5},
            blocking=True,
        )


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
