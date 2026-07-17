"""Tests for the Irrigation Maestro config, options and zone subentry flows."""

from collections.abc import Generator
from typing import Any
from unittest.mock import patch

import pytest
from custom_components.irrigation_maestro import const
from custom_components.irrigation_maestro.models import (
    HubConfig,
    ZoneConfig,
    engine_params_from_config,
    restrictions_from_config,
)
from homeassistant import config_entries
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

ZONE = const.SUBENTRY_TYPE_ZONE

LAWN_CYCLE_ID = "c1a2b3c4"
LAWN_ZONE_DATA: dict[str, Any] = {
    const.CONF_ZONE_NAME: "Lawn",
    const.CONF_VALVE_ENTITY: "valve.lawn",
    const.CONF_CYCLES: [
        {
            const.CONF_CYCLE_ID: LAWN_CYCLE_ID,
            const.CONF_CYCLE_NAME: "Morning",
            const.CONF_TRIGGER: {
                const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_SUN,
                const.CONF_TRIGGER_EVENT: "sunrise",
                const.CONF_TRIGGER_OFFSET_S: -600,
            },
            const.CONF_CURVE: {
                const.CONF_CURVE_POINTS: [[10, 5], [25, 15]],
                const.CONF_CURVE_MIN: 5,
                const.CONF_CURVE_MAX: 30,
            },
        }
    ],
}


@pytest.fixture(autouse=True)
def mock_setup_entry() -> Generator[None]:
    """The real setup/unload are not implemented yet; pretend they succeed."""
    with (
        patch(
            "custom_components.irrigation_maestro.async_setup_entry",
            return_value=True,
            create=True,
        ),
        patch(
            "custom_components.irrigation_maestro.async_unload_entry",
            return_value=True,
            create=True,
        ),
    ):
        yield


@pytest.fixture
def hub_entry(hass: HomeAssistant) -> MockConfigEntry:
    """A configured hub entry."""
    entry = MockConfigEntry(
        domain=const.DOMAIN,
        title="Irrigation Maestro",
        data={},
        options={const.CONF_WEATHER_ENTITY: "weather.home"},
    )
    entry.add_to_hass(hass)
    return entry


@pytest.fixture
def hub_entry_with_zone(hass: HomeAssistant) -> MockConfigEntry:
    """A hub entry that already has one zone subentry."""
    entry = MockConfigEntry(
        domain=const.DOMAIN,
        title="Irrigation Maestro",
        data={},
        options={const.CONF_WEATHER_ENTITY: "weather.home"},
        subentries_data=[
            config_entries.ConfigSubentryData(
                data=LAWN_ZONE_DATA,
                subentry_type=ZONE,
                title="Lawn",
                unique_id=None,
            )
        ],
    )
    entry.add_to_hass(hass)
    return entry


def _schema_selector(result: dict[str, Any], field: str) -> Any:
    """Return the selector of a form field from a flow result."""
    return next(value for key, value in result["data_schema"].schema.items() if key == field)


async def _options_section(
    hass: HomeAssistant, entry: MockConfigEntry, section: str
) -> dict[str, Any]:
    """Open the options flow and enter one menu section."""
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.MENU
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": section}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == section
    return result


# ---------------------------------------------------------------------------
# Hub config flow


async def test_hub_happy_path(hass: HomeAssistant) -> None:
    """The user step creates the hub with only the provided options."""
    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {
            const.CONF_WEATHER_ENTITY: "weather.home",
            const.CONF_RAIN_SENSOR: "sensor.rain_today",
        },
    )
    await hass.async_block_till_done()

    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Irrigation Maestro"
    assert result["data"] == {}
    assert result["options"] == {
        const.CONF_WEATHER_ENTITY: "weather.home",
        const.CONF_RAIN_SENSOR: "sensor.rain_today",
    }

    entry = hass.config_entries.async_entries(const.DOMAIN)[0]
    assert entry.version == 1
    assert entry.minor_version == 1
    # The options must parse into the typed hub model.
    hub = HubConfig.from_options(dict(entry.options))
    assert hub.weather_entity == "weather.home"
    assert hub.master_valve is None


async def test_hub_single_instance(hass: HomeAssistant, hub_entry: MockConfigEntry) -> None:
    """A second hub entry is refused."""
    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "single_instance_allowed"


# ---------------------------------------------------------------------------
# Options flow


async def test_options_general(hass: HomeAssistant, hub_entry: MockConfigEntry) -> None:
    """General section stores entities, delays and parsed groups."""
    result = await _options_section(hass, hub_entry, "general")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            const.CONF_WEATHER_ENTITY: "weather.home",
            const.CONF_MASTER_VALVE: "switch.pump",
            const.CONF_MASTER_PRE_OPEN_S: 10,
            const.CONF_MASTER_POST_CLOSE_S: 7,
            const.CONF_MAX_CONCURRENT: 2,
            const.CONF_COMPATIBILITY_GROUPS: "front, back",
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY

    options = hub_entry.options
    assert options[const.CONF_MASTER_VALVE] == "switch.pump"
    assert options[const.CONF_MASTER_PRE_OPEN_S] == 10
    assert options[const.CONF_MASTER_POST_CLOSE_S] == 7
    assert options[const.CONF_MAX_CONCURRENT] == 2
    assert options[const.CONF_COMPATIBILITY_GROUPS] == ["front", "back"]
    assert const.CONF_RAIN_SENSOR not in options
    assert HubConfig.from_options(dict(options)).compatibility_groups == ("front", "back")


async def test_options_safety_and_merge(hass: HomeAssistant, hub_entry: MockConfigEntry) -> None:
    """Safety section round-trips and preserves keys from other sections."""
    # Populate an unrelated section first.
    result = await _options_section(hass, hub_entry, "general")
    await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            const.CONF_WEATHER_ENTITY: "weather.home",
            const.CONF_MASTER_VALVE: "switch.pump",
        },
    )

    result = await _options_section(hass, hub_entry, "safety")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            const.CONF_SETTLE_PAUSE_S: 90,
            const.CONF_SENTINEL_TIME: "13:15:00",
            const.CONF_SESSION_MAX_MIN: 120,
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY

    options = hub_entry.options
    assert options[const.CONF_SETTLE_PAUSE_S] == 90
    assert options[const.CONF_SENTINEL_TIME] == "13:15"
    assert options[const.CONF_SESSION_MAX_MIN] == 120
    # Defaults were materialized, optional empty fields were not.
    assert options[const.CONF_WATCHDOG_MAX_MIN] == const.DEFAULT_WATCHDOG_MAX_MIN
    assert const.CONF_MUST_FINISH_BY not in options
    # The general section keys survived the safety save.
    assert options[const.CONF_MASTER_VALVE] == "switch.pump"
    hub = HubConfig.from_options(dict(options))
    assert hub.sentinel_time.hour == 13
    assert hub.session_max_min == 120


async def test_options_engine_roundtrip_and_reset(
    hass: HomeAssistant, hub_entry: MockConfigEntry
) -> None:
    """Engine values are stored under the engine key; reset wipes them."""
    result = await _options_section(hass, hub_entry, "engine_advanced")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            const.CONF_THRESHOLD_BASE: 4.5,
            const.CONF_WIND_SKIP_ENABLED: True,
            const.CONF_SEASON_MONTHS: ["4", "5", "6"],
            const.CONF_STALE_WEATHER_MAX_H: 12,
            const.CONF_STALE_WEATHER_POLICY: const.STALE_POLICY_FAIL_CLOSED,
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY

    options = hub_entry.options
    engine = options[const.CONF_ENGINE]
    assert engine[const.CONF_THRESHOLD_BASE] == 4.5
    assert engine[const.CONF_WIND_SKIP_ENABLED] is True
    assert engine[const.CONF_SEASON_MONTHS] == [4, 5, 6]
    assert len(engine[const.CONF_TEMP_WEIGHTS]) == 5
    # Stale-weather settings live at the top level (see HubConfig.from_options).
    assert options[const.CONF_STALE_WEATHER_MAX_H] == 12
    assert options[const.CONF_STALE_WEATHER_POLICY] == const.STALE_POLICY_FAIL_CLOSED
    params = engine_params_from_config(engine)
    assert params.threshold_base_mm == 4.5
    assert params.season_months == frozenset({4, 5, 6})

    # Reset to defaults removes the whole engine section again.
    result = await _options_section(hass, hub_entry, "engine_advanced")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"reset_to_defaults": True}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert const.CONF_ENGINE not in hub_entry.options
    assert const.CONF_STALE_WEATHER_MAX_H not in hub_entry.options
    assert const.CONF_STALE_WEATHER_POLICY not in hub_entry.options


async def test_options_engine_invalid_weights(
    hass: HomeAssistant, hub_entry: MockConfigEntry
) -> None:
    """Malformed weight lists come back as field errors, not exceptions."""
    result = await _options_section(hass, hub_entry, "engine_advanced")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {const.CONF_TEMP_WEIGHTS: "0.1, 0.2"}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {const.CONF_TEMP_WEIGHTS: "invalid_temp_weights"}
    assert const.CONF_ENGINE not in hub_entry.options


async def test_options_restrictions(hass: HomeAssistant, hub_entry: MockConfigEntry) -> None:
    """Restrictions parse weekdays, parity and window text."""
    result = await _options_section(hass, hub_entry, "restrictions")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            const.CONF_ALLOWED_WEEKDAYS: ["2", "0"],
            const.CONF_PARITY: "odd",
            const.CONF_FORBIDDEN_WINDOWS: "08:00-10:30, 22:00-23:15",
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY

    stored = hub_entry.options[const.CONF_RESTRICTIONS]
    assert stored[const.CONF_ALLOWED_WEEKDAYS] == [0, 2]
    assert stored[const.CONF_PARITY] == "odd"
    assert stored[const.CONF_FORBIDDEN_WINDOWS] == [
        {"start": "08:00", "end": "10:30"},
        {"start": "22:00", "end": "23:15"},
    ]
    restrictions = restrictions_from_config(stored)
    assert restrictions is not None
    assert restrictions.allowed_weekdays == frozenset({0, 2})


async def test_options_restrictions_invalid_window(
    hass: HomeAssistant, hub_entry: MockConfigEntry
) -> None:
    """A malformed window string is a friendly form error."""
    result = await _options_section(hass, hub_entry, "restrictions")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {const.CONF_PARITY: "none", const.CONF_FORBIDDEN_WINDOWS: "8-9"},
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {const.CONF_FORBIDDEN_WINDOWS: "invalid_time_window"}


async def test_options_notifications(hass: HomeAssistant, hub_entry: MockConfigEntry) -> None:
    """Notify services are listed dynamically and one event round-trips."""

    async def fake_notify(call: ServiceCall) -> None:
        return

    hass.services.async_register("notify", "fake_mobile", fake_notify)

    result = await _options_section(hass, hub_entry, "notifications")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"event": "completed"}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "notifications_event"
    services_selector = _schema_selector(result, const.CONF_NOTIFY_SERVICES)
    assert "fake_mobile" in services_selector.config["options"]

    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            const.CONF_NOTIFY_ENABLED: True,
            const.CONF_NOTIFY_SERVICES: ["fake_mobile"],
            const.CONF_NOTIFY_PRIORITY: "high",
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert hub_entry.options[const.CONF_NOTIFICATIONS]["completed"] == {
        const.CONF_NOTIFY_ENABLED: True,
        const.CONF_NOTIFY_SERVICES: ["fake_mobile"],
        const.CONF_NOTIFY_PRIORITY: "high",
    }


async def test_options_consumption_budget(hass: HomeAssistant, hub_entry: MockConfigEntry) -> None:
    """Budget section round-trips through the typed hub model."""
    result = await _options_section(hass, hub_entry, "consumption_budget")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            const.CONF_BUDGET_LITERS: 5000,
            const.CONF_BUDGET_ACTION: const.BUDGET_ACTION_REDUCE,
            const.CONF_BUDGET_REDUCE_PCT: 40,
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY

    hub = HubConfig.from_options(dict(hub_entry.options))
    assert hub.consumption_budget_liters == 5000
    assert hub.consumption_action == const.BUDGET_ACTION_REDUCE
    assert hub.consumption_reduce_pct == 40


# ---------------------------------------------------------------------------
# Zone subentry flow: creation


async def _start_zone_flow(
    hass: HomeAssistant, entry: MockConfigEntry, basics: dict[str, Any]
) -> dict[str, Any]:
    """Start the zone flow and submit the basics form; returns the cycle menu."""
    result = await hass.config_entries.subentries.async_init(
        (entry.entry_id, ZONE), context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
    result = await hass.config_entries.subentries.async_configure(result["flow_id"], basics)
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "cycle_menu"
    return dict(result)


async def test_zone_creation_two_cycles(hass: HomeAssistant, hub_entry: MockConfigEntry) -> None:
    """One sun-triggered preset cycle plus one time-triggered custom cycle."""
    result = await _start_zone_flow(
        hass,
        hub_entry,
        {
            const.CONF_ZONE_NAME: "Front lawn",
            const.CONF_VALVE_ENTITY: "valve.front",
            const.CONF_INTERVAL_DAYS: 2,
        },
    )
    # No cycles yet: finishing must not be offered.
    assert result["menu_options"] == ["add_cycle"]

    configure = hass.config_entries.subentries.async_configure
    result = await configure(result["flow_id"], {"next_step_id": "add_cycle"})
    assert result["step_id"] == "cycle"
    result = await configure(
        result["flow_id"],
        {
            const.CONF_CYCLE_NAME: "Morning",
            const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_SUN,
        },
    )
    assert result["step_id"] == "cycle_sun"
    result = await configure(
        result["flow_id"],
        {const.CONF_TRIGGER_EVENT: "sunrise", "offset_min": -55},
    )
    assert result["step_id"] == "cycle_curve"
    result = await configure(result["flow_id"], {"source": const.PRESET_POTS_ID})
    assert result["type"] is FlowResultType.MENU
    assert result["menu_options"] == ["add_cycle", "finish"]

    result = await configure(result["flow_id"], {"next_step_id": "add_cycle"})
    result = await configure(
        result["flow_id"],
        {
            const.CONF_CYCLE_NAME: "Evening",
            const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_TIME,
        },
    )
    assert result["step_id"] == "cycle_time"
    result = await configure(result["flow_id"], {const.CONF_TRIGGER_AT: "19:30:00"})
    assert result["step_id"] == "cycle_curve"
    result = await configure(
        result["flow_id"],
        {
            "source": "custom",
            const.CONF_SOAK_MAX_RUN_MIN: 10,
            const.CONF_SOAK_PAUSE_MIN: 15,
        },
    )
    assert result["step_id"] == "cycle_curve_custom"
    result = await configure(
        result["flow_id"],
        {
            const.CONF_CURVE_POINTS: "10:5, 25:15, 35:30",
            const.CONF_CURVE_MIN: 5,
            const.CONF_CURVE_MAX: 30,
            const.CONF_CURVE_KIND: "duration",
        },
    )
    assert result["type"] is FlowResultType.MENU

    result = await configure(result["flow_id"], {"next_step_id": "finish"})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Front lawn"
    assert result["unique_id"] is None

    subentry = next(iter(hub_entry.subentries.values()))
    assert subentry.subentry_type == ZONE
    assert subentry.title == "Front lawn"
    data = dict(subentry.data)
    cycles = data[const.CONF_CYCLES]
    assert len(cycles) == 2
    ids = {cycle[const.CONF_CYCLE_ID] for cycle in cycles}
    assert len(ids) == 2
    assert all(len(cycle_id) == 8 for cycle_id in ids)
    morning, evening = cycles
    assert morning[const.CONF_TRIGGER] == {
        const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_SUN,
        const.CONF_TRIGGER_EVENT: "sunrise",
        const.CONF_TRIGGER_OFFSET_S: -3300,
    }
    assert morning[const.CONF_CURVE] == {const.CONF_CURVE_TEMPLATE: const.PRESET_POTS_ID}
    assert evening[const.CONF_TRIGGER] == {
        const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_TIME,
        const.CONF_TRIGGER_AT: "19:30",
    }
    assert evening[const.CONF_SOAK_MAX_RUN_MIN] == 10
    assert evening[const.CONF_SOAK_PAUSE_MIN] == 15

    # The stored data must parse into the typed zone model.
    zone = ZoneConfig.from_subentry(subentry.subentry_id, data, templates={})
    assert zone.name == "Front lawn"
    assert zone.interval_days == 2
    assert zone.cycles[0].trigger.offset_s == -3300
    assert zone.cycles[1].curve.points == ((10.0, 5.0), (25.0, 15.0), (35.0, 30.0))
    assert zone.cycles[1].soak_max_run_min == 10


async def test_zone_interval_validation(hass: HomeAssistant, hub_entry: MockConfigEntry) -> None:
    """An out-of-range interval is a friendly form error."""
    result = await hass.config_entries.subentries.async_init(
        (hub_entry.entry_id, ZONE), context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.subentries.async_configure(
        result["flow_id"],
        {
            const.CONF_ZONE_NAME: "Zone",
            const.CONF_VALVE_ENTITY: "valve.z",
            const.CONF_INTERVAL_DAYS: 61,
        },
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {const.CONF_INTERVAL_DAYS: "interval_out_of_range"}


async def test_zone_curve_text_errors(hass: HomeAssistant, hub_entry: MockConfigEntry) -> None:
    """Curve text problems surface as form errors until fixed."""
    result = await _start_zone_flow(
        hass,
        hub_entry,
        {const.CONF_ZONE_NAME: "Beds", const.CONF_VALVE_ENTITY: "switch.beds"},
    )
    configure = hass.config_entries.subentries.async_configure
    result = await configure(result["flow_id"], {"next_step_id": "add_cycle"})
    result = await configure(
        result["flow_id"],
        {
            const.CONF_CYCLE_NAME: "Noon",
            const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_TIME,
        },
    )
    result = await configure(result["flow_id"], {const.CONF_TRIGGER_AT: "12:00:00"})
    result = await configure(result["flow_id"], {"source": "custom"})
    assert result["step_id"] == "cycle_curve_custom"

    submit = {
        const.CONF_CURVE_MIN: 5,
        const.CONF_CURVE_MAX: 30,
        const.CONF_CURVE_KIND: "duration",
    }
    result = await configure(result["flow_id"], {**submit, const.CONF_CURVE_POINTS: "25:15, 10:5"})
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {const.CONF_CURVE_POINTS: "curve_temps_not_increasing"}

    result = await configure(result["flow_id"], {**submit, const.CONF_CURVE_POINTS: "banana"})
    assert result["errors"] == {const.CONF_CURVE_POINTS: "invalid_points_format"}

    result = await configure(
        result["flow_id"],
        {
            const.CONF_CURVE_POINTS: "10:5, 25:15",
            const.CONF_CURVE_MIN: 50,
            const.CONF_CURVE_MAX: 30,
            const.CONF_CURVE_KIND: "duration",
        },
    )
    assert result["errors"] == {const.CONF_CURVE_MIN: "min_above_max"}

    result = await configure(
        result["flow_id"], {**submit, const.CONF_CURVE_POINTS: "10:5, 25:2000"}
    )
    assert result["errors"] == {const.CONF_CURVE_POINTS: "duration_out_of_range"}

    result = await configure(result["flow_id"], {**submit, const.CONF_CURVE_POINTS: "10:5, 25:15"})
    assert result["type"] is FlowResultType.MENU


async def test_zone_volume_only_with_flow_sensor(
    hass: HomeAssistant, hub_entry: MockConfigEntry
) -> None:
    """Volume curves are offered only when a usable flow meter exists."""

    async def to_custom_step(basics: dict[str, Any]) -> dict[str, Any]:
        result = await _start_zone_flow(hass, hub_entry, basics)
        configure = hass.config_entries.subentries.async_configure
        result = await configure(result["flow_id"], {"next_step_id": "add_cycle"})
        result = await configure(
            result["flow_id"],
            {
                const.CONF_CYCLE_NAME: "Cycle",
                const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_TIME,
            },
        )
        result = await configure(result["flow_id"], {const.CONF_TRIGGER_AT: "06:00:00"})
        result = await configure(
            result["flow_id"],
            {"source": "custom", const.CONF_VOLUME_SAFETY_TIMEOUT_MIN: 45},
        )
        assert result["step_id"] == "cycle_curve_custom"
        return dict(result)

    # Without any flow meter only duration is offered.
    result = await to_custom_step(
        {const.CONF_ZONE_NAME: "Dry", const.CONF_VALVE_ENTITY: "valve.dry"}
    )
    assert _schema_selector(result, const.CONF_CURVE_KIND).config["options"] == ["duration"]
    hass.config_entries.subentries.async_abort(result["flow_id"])

    # With a zone flow sensor, volume becomes available and round-trips.
    result = await to_custom_step(
        {
            const.CONF_ZONE_NAME: "Wet",
            const.CONF_VALVE_ENTITY: "valve.wet",
            const.CONF_FLOW_SENSOR: "sensor.wet_flow",
        }
    )
    assert _schema_selector(result, const.CONF_CURVE_KIND).config["options"] == [
        "duration",
        "volume",
    ]
    configure = hass.config_entries.subentries.async_configure
    result = await configure(
        result["flow_id"],
        {
            const.CONF_CURVE_POINTS: "10:20, 30:60",
            const.CONF_CURVE_MIN: 10,
            const.CONF_CURVE_MAX: 90,
            const.CONF_CURVE_KIND: "volume",
        },
    )
    assert result["type"] is FlowResultType.MENU
    result = await configure(result["flow_id"], {"next_step_id": "finish"})
    assert result["type"] is FlowResultType.CREATE_ENTRY

    subentry = next(iter(hub_entry.subentries.values()))
    cycle = subentry.data[const.CONF_CYCLES][0]
    assert cycle[const.CONF_CURVE][const.CONF_CURVE_KIND] == "volume"
    assert cycle[const.CONF_VOLUME_SAFETY_TIMEOUT_MIN] == 45


async def test_zone_copy_curve(hass: HomeAssistant, hub_entry_with_zone: MockConfigEntry) -> None:
    """A new zone can copy the curve of an existing zone's cycle."""
    entry = hub_entry_with_zone
    source_subentry_id = next(iter(entry.subentries))

    result = await _start_zone_flow(
        hass,
        entry,
        {const.CONF_ZONE_NAME: "Hedge", const.CONF_VALVE_ENTITY: "valve.hedge"},
    )
    configure = hass.config_entries.subentries.async_configure
    result = await configure(result["flow_id"], {"next_step_id": "add_cycle"})
    result = await configure(
        result["flow_id"],
        {
            const.CONF_CYCLE_NAME: "Copied",
            const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_TIME,
        },
    )
    result = await configure(result["flow_id"], {const.CONF_TRIGGER_AT: "07:00:00"})
    assert result["step_id"] == "cycle_curve"
    source_values = [
        option["value"] for option in _schema_selector(result, "source").config["options"]
    ]
    assert "copy" in source_values

    result = await configure(result["flow_id"], {"source": "copy"})
    assert result["step_id"] == "cycle_curve_copy"
    options = _schema_selector(result, "source").config["options"]
    assert options == [
        {"value": f"{source_subentry_id}:{LAWN_CYCLE_ID}", "label": "Lawn / Morning"}
    ]

    result = await configure(result["flow_id"], {"source": f"{source_subentry_id}:{LAWN_CYCLE_ID}"})
    assert result["type"] is FlowResultType.MENU
    result = await configure(result["flow_id"], {"next_step_id": "finish"})
    assert result["type"] is FlowResultType.CREATE_ENTRY

    new_subentry = next(
        subentry for subentry in entry.subentries.values() if subentry.title == "Hedge"
    )
    copied = new_subentry.data[const.CONF_CYCLES][0][const.CONF_CURVE]
    assert copied == LAWN_ZONE_DATA[const.CONF_CYCLES][0][const.CONF_CURVE]


# ---------------------------------------------------------------------------
# Zone subentry flow: reconfigure


async def test_zone_reconfigure_rename_and_cycle_edit(
    hass: HomeAssistant, hub_entry_with_zone: MockConfigEntry
) -> None:
    """Renaming the zone and editing a cycle preserves the cycle id."""
    entry = hub_entry_with_zone
    subentry_id = next(iter(entry.subentries))

    result = await entry.start_subentry_reconfigure_flow(hass, subentry_id)
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "reconfigure"

    configure = hass.config_entries.subentries.async_configure
    result = await configure(result["flow_id"], {"next_step_id": "edit_zone"})
    assert result["step_id"] == "edit_zone"
    result = await configure(
        result["flow_id"],
        {
            const.CONF_ZONE_NAME: "Lawn North",
            const.CONF_VALVE_ENTITY: "valve.lawn",
            const.CONF_INTERVAL_DAYS: 4,
        },
    )
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "reconfigure"

    result = await configure(result["flow_id"], {"next_step_id": "manage_cycles"})
    assert result["type"] is FlowResultType.MENU
    # A single cycle must not be removable.
    assert result["menu_options"] == ["add_cycle", "edit_cycle", "back"]

    result = await configure(result["flow_id"], {"next_step_id": "edit_cycle"})
    result = await configure(result["flow_id"], {"cycle": LAWN_CYCLE_ID})
    assert result["step_id"] == "cycle"
    result = await configure(
        result["flow_id"],
        {
            const.CONF_CYCLE_NAME: "Dawn",
            const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_SUN,
        },
    )
    assert result["step_id"] == "cycle_sun"
    result = await configure(
        result["flow_id"], {const.CONF_TRIGGER_EVENT: "sunset", "offset_min": 20}
    )
    assert result["step_id"] == "cycle_curve"
    result = await configure(result["flow_id"], {"source": "custom"})
    assert result["step_id"] == "cycle_curve_custom"
    result = await configure(
        result["flow_id"],
        {
            const.CONF_CURVE_POINTS: "10:5, 25:15",
            const.CONF_CURVE_MIN: 5,
            const.CONF_CURVE_MAX: 30,
            const.CONF_CURVE_KIND: "duration",
        },
    )
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "manage_cycles"

    result = await configure(result["flow_id"], {"next_step_id": "back"})
    assert result["step_id"] == "reconfigure"
    result = await configure(result["flow_id"], {"next_step_id": "done"})
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reconfigure_successful"

    subentry = entry.subentries[subentry_id]
    assert subentry.title == "Lawn North"
    data = dict(subentry.data)
    assert data[const.CONF_ZONE_NAME] == "Lawn North"
    assert data[const.CONF_INTERVAL_DAYS] == 4
    cycles = data[const.CONF_CYCLES]
    assert len(cycles) == 1
    # The id survived the edit untouched.
    assert cycles[0][const.CONF_CYCLE_ID] == LAWN_CYCLE_ID
    assert cycles[0][const.CONF_CYCLE_NAME] == "Dawn"
    assert cycles[0][const.CONF_TRIGGER] == {
        const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_SUN,
        const.CONF_TRIGGER_EVENT: "sunset",
        const.CONF_TRIGGER_OFFSET_S: 1200,
    }
    zone = ZoneConfig.from_subentry(subentry_id, data, templates={})
    assert zone.cycles[0].cycle_id == LAWN_CYCLE_ID
