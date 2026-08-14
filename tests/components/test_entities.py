"""Entity platform tests: contract attributes, live updates, write-backs.

Entities are located exactly the way the card does it: by their
``maestro_role`` (and ``zone_id``) attributes, never by entity id.
"""

from datetime import timedelta
from typing import Any

import pytest
from custom_components.irrigation_maestro.const import DOMAIN
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant, State
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util

from .mocks import MockValvePark
from .test_session import START, advance, mock_weather, setup_hub, zone_data


def role_state(hass: HomeAssistant, role: str, zone_id: str | None = None) -> State | None:
    """Find an entity by its maestro_role (card-style discovery)."""
    for state in hass.states.async_all():
        if state.attributes.get("maestro_role") != role:
            continue
        if zone_id is not None and state.attributes.get("zone_id") != zone_id:
            continue
        return state
    return None


async def test_hub_sensors_populate_after_evaluate_button(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])

    # Before any evaluation the values are unknown but the roles exist.
    budget = role_state(hass, "hub_water_budget")
    assert budget is not None
    assert budget.state == "unknown"
    assert role_state(hass, "hub_skip_threshold") is not None
    assert role_state(hass, "hub_weighted_temp") is not None

    button = role_state(hass, "hub_evaluate")
    assert button is not None
    await hass.services.async_call(
        "button", "press", {"entity_id": button.entity_id}, blocking=True
    )
    await hass.async_block_till_done()

    budget = role_state(hass, "hub_water_budget")
    assert budget is not None
    assert float(budget.state) == pytest.approx(0.0)
    assert budget.attributes["rain_today"] == pytest.approx(0.0)
    assert budget.attributes["forecast_0_24"] == pytest.approx(0.0)
    assert budget.attributes["forecast_credit"] == pytest.approx(0.0)

    threshold = role_state(hass, "hub_skip_threshold")
    assert threshold is not None
    # 30 °C weighted: 3.0 base + 0.5 mm/°C above the 28 °C knee = 4.0 mm.
    assert float(threshold.state) == pytest.approx(4.0)

    temp = role_state(hass, "hub_weighted_temp")
    assert temp is not None
    assert float(temp.state) == pytest.approx(30.0)
    assert temp.attributes["stale_weather"] is False
    assert temp.attributes["temp_today_eff"] == pytest.approx(30.0)

    session = role_state(hass, "hub_session")
    assert session is not None
    assert session.state == "idle"
    assert session.attributes["queue"] == []
    assert session.attributes["active_zone_id"] is None


async def test_zone_state_idle_watering_and_session_running(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    state = role_state(hass, "zone_state", zone_id)
    assert state is not None
    assert state.state == "idle"
    assert state.attributes["zone_name"] == "Pots"
    assert state.attributes["order"] == 100
    assert state.attributes["adjustment_pct"] == pytest.approx(100.0)
    assert state.attributes["suspended_until"] is None
    assert state.attributes["degraded"] == ["no_flow_meter"]
    cycles = state.attributes["cycles"]
    assert cycles[0]["cycle_id"] == "cy_pots"
    assert cycles[0]["enabled"] is True
    assert cycles[0]["trigger"] == {"kind": "time", "at": "05:30"}
    assert cycles[0]["curve"]["points"] == [[20.0, 3.0]]
    assert cycles[0]["curve"]["kind"] == "duration"

    next_run = role_state(hass, "zone_next_run", zone_id)
    assert next_run is not None
    assert next_run.state.startswith("2026-07-17T05:30")
    assert next_run.attributes["cycle_id"] == "cy_pots"
    assert next_run.attributes["cycle_name"] == "Morning"

    await advance(hass, freezer, 31 * 60)  # trigger fires at 05:30
    state = role_state(hass, "zone_state", zone_id)
    assert state is not None
    assert state.state == "watering"
    assert state.attributes["active_cycle_id"] == "cy_pots"
    assert state.attributes["run_duration_min"] == 3
    assert state.attributes["run_planned_runs"] == [3]
    assert state.attributes["run_started_at"] is not None

    session = role_state(hass, "hub_session")
    assert session is not None
    assert session.state == "running"
    assert session.attributes["active_zone_id"] == zone_id

    await advance(hass, freezer, 4 * 60)
    state = role_state(hass, "zone_state", zone_id)
    assert state is not None
    assert state.state == "idle"

    outcome = role_state(hass, "zone_last_outcome", zone_id)
    assert outcome is not None
    assert outcome.state == "completed"
    assert outcome.attributes["cycle_id"] == "cy_pots"
    assert outcome.attributes["reason_key"] is None
    assert outcome.attributes["duration_min"] == 3
    assert outcome.attributes["finished_at"] is not None


async def test_zone_state_publishes_configured_adjustment_pct(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The zone sensor exposes the adjustment the engine multiplies into
    every cycle's delivered minutes, so the card can fold it into previews.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots", adjustment_pct=70)])
    zone_id = entry.runtime_data.zone_ids[0]

    state = role_state(hass, "zone_state", zone_id)
    assert state is not None
    assert state.attributes["adjustment_pct"] == pytest.approx(70.0)


async def test_zone_enabled_switch_off_skips_as_zone_disabled(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    switch = role_state(hass, "zone_enabled", zone_id)
    assert switch is not None
    assert switch.state == "on"
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": switch.entity_id}, blocking=True
    )
    await hass.async_block_till_done()

    switch = role_state(hass, "zone_enabled", zone_id)
    assert switch is not None
    assert switch.state == "off"
    state = role_state(hass, "zone_state", zone_id)
    assert state is not None
    assert state.state == "disabled"

    await advance(hass, freezer, 31 * 60)  # trigger fires; zone must skip
    assert hass.states.get("valve.pots").state == "closed"
    outcome = entry.runtime_data.state.last_outcome(zone_id)
    assert outcome["result"] == "skipped"
    assert outcome["reason_key"] == "zone_disabled"


async def test_numbers_write_back_to_subentry_data(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    order = role_state(hass, "zone_order", zone_id)
    adjustment = role_state(hass, "zone_adjustment", zone_id)
    assert order is not None and float(order.state) == 100
    assert adjustment is not None and float(adjustment.state) == 100
    # The cadence moved into the program calendar, so the zone has no
    # interval number entity any more.
    assert role_state(hass, "zone_interval", zone_id) is None

    for entity, value in ((order, 5), (adjustment, 120)):
        await hass.services.async_call(
            "number", "set_value", {"entity_id": entity.entity_id, "value": value}, blocking=True
        )
    await hass.async_block_till_done()

    subentry = entry.subentries[zone_id]
    assert subentry.data["order"] == 5
    assert subentry.data["adjustment_pct"] == 120
    # The runtime applied the change in place.
    config = entry.runtime_data.zones[zone_id].config
    assert config.order == 5
    assert config.adjustment_pct == 120
    order = role_state(hass, "zone_order", zone_id)
    assert order is not None and float(order.state) == 5


async def test_cycle_switch_toggles_cycle_enabled(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    switch = role_state(hass, "cycle_enabled", zone_id)
    assert switch is not None
    assert switch.state == "on"
    assert switch.attributes["cycle_id"] == "cy_pots"
    assert switch.attributes["cycle_name"] == "Morning"

    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": switch.entity_id}, blocking=True
    )
    await hass.async_block_till_done()
    assert runtime.state.cycle_enabled(zone_id, "cy_pots") is False
    switch = role_state(hass, "cycle_enabled", zone_id)
    assert switch is not None
    assert switch.state == "off"

    await advance(hass, freezer, 31 * 60)  # trigger fires; cycle disabled
    outcome = runtime.state.last_outcome(zone_id)
    assert outcome["result"] == "skipped"
    assert outcome["reason_key"] == "cycle_disabled"

    await hass.services.async_call(
        "switch", "turn_on", {"entity_id": switch.entity_id}, blocking=True
    )
    await hass.async_block_till_done()
    assert runtime.state.cycle_enabled(zone_id, "cy_pots") is True


async def test_datetime_set_suspends_zone(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    suspend = role_state(hass, "zone_suspend_until", zone_id)
    assert suspend is not None
    assert suspend.state == "unknown"

    until = dt_util.utcnow() + timedelta(days=2)
    await hass.services.async_call(
        "datetime",
        "set_value",
        {"entity_id": suspend.entity_id, "datetime": until.isoformat()},
        blocking=True,
    )
    await hass.async_block_till_done()

    assert entry.runtime_data.state.suspended_until(zone_id) == until
    state = role_state(hass, "zone_state", zone_id)
    assert state is not None
    assert state.state == "suspended"
    assert state.attributes["suspended_until"] == until.isoformat()
    suspend = role_state(hass, "zone_suspend_until", zone_id)
    assert suspend is not None
    assert suspend.state != "unknown"


async def test_switch_zone_declares_switch_valve_degradation(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("switch.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "switch.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    state = role_state(hass, "zone_state", zone_id)
    assert state is not None
    assert "switch_valve" in state.attributes["degraded"]


async def test_volume_cycle_without_meter_declares_degradation(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    zone = zone_data(
        "Pots",
        "valve.pots",
        cycles=[
            {
                "id": "cy_vol",
                "name": "Volume",
                "enabled": True,
                "trigger": {"kind": "time", "at": "05:30"},
                "curve": {
                    "points": [[20.0, 20.0]],
                    "min_value": 5.0,
                    "max_value": 90.0,
                    "kind": "volume",
                },
                "volume_safety_timeout_min": 20,
            }
        ],
    )
    entry = await setup_hub(hass, [zone])
    zone_id = entry.runtime_data.zone_ids[0]

    state = role_state(hass, "zone_state", zone_id)
    assert state is not None
    assert "volume_mode_unavailable" in state.attributes["degraded"]
    assert "no_flow_meter" in state.attributes["degraded"]


async def test_consumption_sensor_unavailable_without_budget(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    # The sensor exists (so enabling the budget later needs no reload) but is
    # unavailable until a budget is configured. An unavailable entity has its
    # attributes stripped, so it is looked up by unique_id, not by role.
    registry = er.async_get(hass)
    unique_id = f"{entry.entry_id}_hub_consumption_left"
    entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert entity_id is not None
    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "unavailable"


def _first_cycle_attr(hass: HomeAssistant, entity_id: str) -> dict[str, Any]:
    state = hass.states.get(entity_id)
    assert state is not None
    return state.attributes["cycles"][0]


async def test_zone_state_exposes_schedule_fields(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    state = role_state(hass, "zone_state", zone_id)
    assert state is not None
    cycle = _first_cycle_attr(hass, state.entity_id)
    assert cycle["calendar"] == {"mode": "weekdays", "days": [0, 1, 2, 3, 4, 5, 6]}
    assert cycle["day_intensity_pct"] is None  # no per-day overrides


async def test_zone_state_exposes_per_day_schedule_fields(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    zone = zone_data(
        "Pots",
        "valve.pots",
        cycles=[
            {
                "id": "cy_pots",
                "name": "Morning",
                "enabled": True,
                "trigger": {"kind": "time", "at": "05:30"},
                "curve": {
                    "points": [[20.0, 3.0]],
                    "min_value": 1.0,
                    "max_value": 60.0,
                },
                "calendar": {"mode": "weekdays", "days": [0, 2, 4]},
                "day_intensity_pct": {"0": 200.0, "4": 400.0},
            }
        ],
    )
    entry = await setup_hub(hass, [zone])
    zone_id = entry.runtime_data.zone_ids[0]

    state = role_state(hass, "zone_state", zone_id)
    assert state is not None
    cycle = _first_cycle_attr(hass, state.entity_id)
    assert cycle["calendar"] == {"mode": "weekdays", "days": [0, 2, 4]}
    assert cycle["day_intensity_pct"] == {"0": 200.0, "4": 400.0}


async def test_consumption_sensor_present_with_budget(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots")],
        options={"consumption_budget": {"liters_per_month": 1000}},
    )
    sensor = role_state(hass, "hub_consumption_left")
    assert sensor is not None
    assert float(sensor.state) == pytest.approx(1000.0)
    assert sensor.attributes["budget_liters"] == 1000
    assert sensor.attributes["used_liters"] == 0
    assert sensor.attributes["action"] == "notify"


async def test_next_run_skips_days_the_calendar_forbids(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """It used to promise a run on days the zone would silently skip."""
    freezer.move_to(START)  # Friday 2026-07-17
    MockValvePark(hass).add("valve.pots")
    mock_weather(hass)
    await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                calendar={"mode": "weekdays", "days": [0]},  # Mondays only
            )
        ],
    )
    next_run = role_state(hass, "zone_next_run")
    assert next_run is not None
    assert next_run.state.startswith("2026-07-20T05:30")  # the following Monday


async def test_next_run_respects_the_program_season(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)  # July
    MockValvePark(hass).add("valve.pots")
    mock_weather(hass)
    await setup_hub(
        hass,
        [
            zone_data(
                "Pots",
                "valve.pots",
                cycles=[
                    {
                        "id": "cy_pots",
                        "name": "Morning",
                        "enabled": True,
                        "trigger": {"kind": "time", "at": "05:30"},
                        "curve": {"points": [[20.0, 3.0]], "min_value": 1.0, "max_value": 60.0},
                        "season_months": [9],  # September only
                    }
                ],
            )
        ],
    )
    next_run = role_state(hass, "zone_next_run")
    assert next_run is not None
    assert next_run.state.startswith("2026-09-01T05:30")


async def test_next_run_skips_past_a_suspension(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A suspended zone reports when watering resumes, not tomorrow."""
    freezer.move_to(START)
    MockValvePark(hass).add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    await hass.services.async_call(
        DOMAIN,
        "suspend_until",
        {"zone_id": zone_id, "until": "2027-01-01 00:00:00"},
        blocking=True,
    )
    await hass.async_block_till_done()
    next_run = role_state(hass, "zone_next_run", zone_id)
    assert next_run is not None
    # Suspended until January, and the default season starts in March.
    assert next_run.state.startswith("2027-03-01T05:30")


async def test_zone_state_publishes_everything_the_panel_reads_back(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The sensor is the panel's only read-back path.

    Regression: the panel wrote the calendar correctly but the sensor/reader
    pair drifted, so a saved change never came back and looked ignored. Every
    field the panel can edit must survive the round trip.
    """
    freezer.move_to(START)
    MockValvePark(hass).add("valve.pots")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]

    await hass.services.async_call(
        DOMAIN,
        "set_program_schedule",
        {
            "zone_id": zone_id,
            "program_id": "cy_pots",
            "calendar_mode": "interval",
            "interval_days": 3,
            "season_months": [6, 7, 8],
            "start_kind": "time",
            "start_time": "05:30",
        },
        blocking=True,
    )
    await hass.services.async_call(
        DOMAIN,
        "set_program_advanced",
        {
            "zone_id": zone_id,
            "program_id": "cy_pots",
            "soak_max_run_min": 10,
            "soak_pause_min": 15,
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    cycle = role_state(hass, "zone_state", zone_id).attributes["cycles"][0]
    assert cycle["calendar"] == {"mode": "interval", "interval_days": 3}
    assert cycle["season_months"] == [6, 7, 8]
    assert cycle["soak_max_run_min"] == 10
    assert cycle["soak_pause_min"] == 15


async def test_zone_sensor_publishes_the_intensity(hass: HomeAssistant) -> None:
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
                            "points": [[25.0, 20.0], [35.0, 30.0]],
                            "min_value": 1.0,
                            "max_value": 60.0,
                        },
                        "intensity_pct": 150.0,
                    }
                ],
            )
        ],
    )
    zone_id = entry.runtime_data.zone_ids[0]
    cycle = role_state(hass, "zone_state", zone_id).attributes["cycles"][0]

    assert cycle["intensity_pct"] == 150.0
    assert cycle["day_intensity_pct"] is None


async def test_zone_sensor_publishes_only_the_stored_shape(hass: HomeAssistant) -> None:
    """amount/heat/day_minutes were a bridge for the 2.x card. The card now
    reads the curve and the intensity, so publishing a second, derived
    representation of the same quantity is a source of drift, not a service."""
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    cycle = role_state(hass, "zone_state", zone_id).attributes["cycles"][0]

    assert "amount" not in cycle
    assert "heat" not in cycle
    assert "day_minutes" not in cycle
    assert cycle["intensity_pct"] == 100.0
    assert cycle["curve"]["points"] == [[20.0, 3.0]]


async def test_a_meter_with_an_unresolvable_unit_is_declared_degraded(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "7.5")  # no unit declared
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    zone_id = entry.runtime_data.zone_ids[0]

    state = role_state(hass, "zone_state", zone_id)
    assert state is not None
    assert "flow_unit_unknown" in state.attributes["degraded"]
    assert "no_flow_meter" not in state.attributes["degraded"]


async def test_a_meter_with_a_convertible_unit_is_not_degraded(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    zone_id = entry.runtime_data.zone_ids[0]

    state = role_state(hass, "zone_state", zone_id)
    assert state is not None
    assert "flow_unit_unknown" not in state.attributes["degraded"]


async def test_a_meter_that_appears_after_setup_stops_reading_as_degraded(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A restart must not leave a good meter accused of having no unit.

    Zone entities do not poll and re-render only on SIGNAL_UPDATE, so with
    nothing watching the flow sensor a zone kept showing flow_unit_unknown
    (and volume_mode_unavailable) until some unrelated dispatch happened to
    fire. The false signal is exactly what this feature exists to remove.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
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
                            "points": [[20.0, 40.0]],
                            "min_value": 1.0,
                            "max_value": 200.0,
                            "kind": "volume",
                        },
                    }
                ],
            )
        ],
    )
    zone_id = entry.runtime_data.zone_ids[0]

    # No state for the meter yet: the zone rightly reports both.
    before = role_state(hass, "zone_state", zone_id)
    assert before is not None
    assert "flow_unit_unknown" in before.attributes["degraded"]
    assert "volume_mode_unavailable" in before.attributes["degraded"]

    # The meter turns up, declaring a unit the converter handles. No unrelated
    # dispatch, no reload -- the zone must re-render on the sensor itself.
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    await hass.async_block_till_done()

    after = role_state(hass, "zone_state", zone_id)
    assert after is not None
    assert "flow_unit_unknown" not in after.attributes["degraded"]
    assert "volume_mode_unavailable" not in after.attributes["degraded"]


async def test_a_zone_with_an_empty_flow_sensor_falls_through_to_the_line_meter(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Regression: zone_has_flow_meter and zone_flow_meter_usable disagreeing
    on an empty-string sensor id once produced a zone reporting no_flow_meter
    and flow_unit_unknown at the same time. Both must treat "" the same as
    never configured -- falling through to the line meter -- not as a literal
    entity id to bind a reader to."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.line", "7.5", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", flow_sensor="")],
        options={"line_flow_sensor": "sensor.line"},
    )
    zone_id = entry.runtime_data.zone_ids[0]

    state = role_state(hass, "zone_state", zone_id)
    assert state is not None
    assert "no_flow_meter" not in state.attributes["degraded"]


async def test_the_zone_water_sensor_is_a_statistics_grade_total(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """device_class water + total_increasing is what feeds long-term statistics."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=7.5)])
    runtime = entry.runtime_data
    state = role_state(hass, "zone_water_total", zone_id=runtime.zone_ids[0])

    assert state.attributes["device_class"] == "water"
    assert state.attributes["state_class"] == "total_increasing"
    assert state.attributes["unit_of_measurement"] == "L"


async def test_an_estimated_zone_is_marked_estimated(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=7.5)])
    runtime = entry.runtime_data
    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 11 * 60)

    state = role_state(hass, "zone_water_total", zone_id=runtime.zone_ids[0])
    assert state.attributes["estimated"] is True
    assert state.attributes["source"] == "nominal"


async def test_the_unattributed_sensor_separates_priming_from_suspect_water(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", minutes=10)])
    runtime = entry.runtime_data
    day = dt_util.now().date()
    runtime.state.add_unattributed("__hub__", 3.0, day=day, valves_closed=False)
    runtime.state.add_unattributed("__hub__", 7.0, day=day, valves_closed=True)
    runtime.dispatch_update()
    await hass.async_block_till_done()

    state = role_state(hass, "hub_unattributed_water")
    assert float(state.state) == 10.0
    assert state.attributes["closed_l"] == 7.0


async def test_a_zone_on_the_line_meter_is_declared_shared_even_when_cleared(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Empty string is a reachable way of saying "no meter" (runtime.py:240).

    sensor.py used `is None` here, so a zone whose meter was cleared fed from
    the line meter without being labelled -- and the label is the set the
    attribution index must reproduce.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.line", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="")],
        {"line_flow_sensor": "sensor.line"},
    )
    runtime = entry.runtime_data
    state = role_state(hass, "zone_state", zone_id=runtime.zone_ids[0])
    assert "line_meter_shared" in state.attributes["degraded"]
