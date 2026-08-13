"""Tests for config parsing: dicts from the config entry -> typed models."""

from datetime import time

import pytest
from custom_components.irrigation_maestro import const
from custom_components.irrigation_maestro.engine.calendar import ProgramCalendar
from custom_components.irrigation_maestro.engine.curves import CurveError, CurveKind
from custom_components.irrigation_maestro.models import (
    CycleConfig,
    HubConfig,
    ZoneConfig,
    engine_params_from_config,
    resolve_curve,
    restrictions_from_config,
)


class TestEngineParams:
    def test_empty_config_gives_defaults(self):
        params = engine_params_from_config({})
        assert params.temp_weights == (0.05, 0.15, 0.30, 0.35, 0.15)
        assert params.threshold_base_mm == 3.0
        assert params.season_months == frozenset(range(3, 11))

    def test_overrides_applied(self):
        params = engine_params_from_config(
            {
                "threshold_base_mm": 4.0,
                "wind_skip_enabled": True,
                "season_months": [4, 5, 6],
                "temp_weights": [0.1, 0.1, 0.3, 0.35, 0.15],
            }
        )
        assert params.threshold_base_mm == 4.0
        assert params.wind_skip_enabled is True
        assert params.season_months == frozenset({4, 5, 6})
        assert params.temp_weights == (0.1, 0.1, 0.3, 0.35, 0.15)

    def test_unknown_keys_ignored(self):
        params = engine_params_from_config({"bogus": 1})
        assert params.threshold_base_mm == 3.0


class TestRestrictions:
    def test_none_stays_none(self):
        assert restrictions_from_config(None) is None

    def test_windows_parse(self):
        restrictions = restrictions_from_config(
            {"forbidden_windows": [{"start": "08:00", "end": "10:30"}]}
        )
        assert restrictions is not None
        assert restrictions.forbidden_windows[0].start == time(8, 0)
        assert restrictions.forbidden_windows[0].end == time(10, 30)

    def test_day_limits_are_ignored(self):
        # Weekday and parity limits are program calendar modes from 2.0.0;
        # a stale blob must not resurrect them as a second day mechanism.
        restrictions = restrictions_from_config({"allowed_weekdays": [0, 2, 4], "parity": "odd"})
        assert restrictions is not None
        assert restrictions.forbidden_windows == ()
        assert not hasattr(restrictions, "allowed_weekdays")
        assert not hasattr(restrictions, "parity")

    def test_empty_dict_gives_unrestricted(self):
        restrictions = restrictions_from_config({})
        assert restrictions is not None
        assert restrictions.forbidden_windows == ()


class TestResolveCurve:
    def test_inline_points(self):
        curve = resolve_curve({"points": [[10, 5], [25, 15]], "min_value": 5, "max_value": 30}, {})
        assert curve.points == ((10.0, 5.0), (25.0, 15.0))
        assert curve.kind is CurveKind.DURATION

    def test_volume_kind(self):
        curve = resolve_curve(
            {"points": [[10, 20]], "min_value": 5, "max_value": 90, "kind": "volume"}, {}
        )
        assert curve.kind is CurveKind.VOLUME

    def test_builtin_presets_always_available(self):
        pots = resolve_curve({"template": "preset_pots"}, {})
        assert pots.min_value == 10.0
        lawn = resolve_curve({"template": "preset_lawn"}, {})
        assert lawn.max_value == 25.0

    def test_user_template(self):
        templates = {"tpl1": {"points": [[20, 10]], "min_value": 5, "max_value": 20}}
        curve = resolve_curve({"template": "tpl1"}, templates)
        assert curve.points == ((20.0, 10.0),)

    def test_unknown_template_raises(self):
        with pytest.raises(CurveError):
            resolve_curve({"template": "missing"}, {})

    def test_invalid_points_raise(self):
        with pytest.raises(CurveError):
            resolve_curve({"points": [], "min_value": 0, "max_value": 1}, {})


class TestHubConfig:
    def test_minimal_options(self):
        hub = HubConfig.from_options({"weather_entity": "weather.home"})
        assert hub.weather_entity == "weather.home"
        assert hub.max_concurrent == 1
        assert hub.settle_pause_s == 120
        assert hub.manual_block_min == 60
        assert hub.watchdog_max_min == 70
        assert hub.master_valve is None
        assert hub.sentinel_time == time(12, 0)
        assert hub.stale_weather_policy == "fail_open"
        assert hub.restrictions.forbidden_windows == ()

    def test_full_options(self):
        hub = HubConfig.from_options(
            {
                "weather_entity": "weather.home",
                "rain_sensor": "sensor.rain_today",
                "line_flow_sensor": "sensor.flow",
                "master_valve": "switch.pump",
                "master_pre_open_s": 10,
                "max_concurrent": 2,
                "session_max_min": 180,
                "must_finish_by": "09:30",
                "sentinel_time": "13:15",
                "restrictions": {"forbidden_windows": [{"start": "22:00", "end": "06:00"}]},
                "engine": {"threshold_base_mm": 4.5},
                "consumption_budget": {"liters_per_month": 5000, "action": "reduce"},
            }
        )
        assert hub.rain_sensor == "sensor.rain_today"
        assert hub.master_valve == "switch.pump"
        assert hub.master_pre_open_s == 10
        assert hub.max_concurrent == 2
        assert hub.session_max_min == 180
        assert hub.must_finish_by == time(9, 30)
        assert hub.sentinel_time == time(13, 15)
        assert hub.restrictions.forbidden_windows[0].start == time(22, 0)
        assert hub.engine_params.threshold_base_mm == 4.5
        assert hub.consumption_budget_liters == 5000
        assert hub.consumption_action == "reduce"


class TestZoneConfig:
    DATA = {
        "name": "Lawn",
        "valve_entity": "valve.lawn",
        "cycles": [
            {
                "id": "c1",
                "name": "Morning",
                "enabled": True,
                "trigger": {"kind": "sun", "event": "sunrise", "offset_s": -3300},
                "curve": {"template": "preset_lawn"},
            },
            {
                "id": "c2",
                "name": "Evening",
                "enabled": False,
                "trigger": {"kind": "time", "at": "19:30"},
                "curve": {"points": [[20, 10]], "min_value": 5, "max_value": 20},
                "soak_max_run_min": 10,
                "soak_pause_min": 15,
            },
        ],
    }

    def test_parse(self):
        zone = ZoneConfig.from_subentry("sub1", self.DATA, templates={})
        assert zone.zone_id == "sub1"
        assert zone.name == "Lawn"
        assert zone.valve_entity == "valve.lawn"
        assert zone.order == 100
        assert zone.adjustment_pct == 100
        assert len(zone.cycles) == 2
        morning, evening = zone.cycles
        assert morning.cycle_id == "c1"
        assert morning.trigger.kind == "sun"
        assert morning.trigger.offset_s == -3300
        assert evening.trigger.kind == "time"
        assert evening.trigger.at == time(19, 30)
        assert evening.soak_max_run_min == 10
        assert evening.enabled_default is False

    def test_zone_is_switch_valve(self):
        zone = ZoneConfig.from_subentry(
            "sub1", {**self.DATA, "valve_entity": "switch.lawn"}, templates={}
        )
        assert zone.is_switch is True
        assert ZoneConfig.from_subentry("s2", self.DATA, templates={}).is_switch is False

    def test_flow_sensor_optional(self):
        zone = ZoneConfig.from_subentry("sub1", self.DATA, templates={})
        assert zone.flow_sensor is None
        zone2 = ZoneConfig.from_subentry(
            "sub1", {**self.DATA, "flow_sensor": "sensor.f1"}, templates={}
        )
        assert zone2.flow_sensor == "sensor.f1"


def _cycle_data(**extra):
    data = {
        const.CONF_CYCLE_ID: "c1",
        const.CONF_CYCLE_NAME: "Morning",
        const.CONF_TRIGGER: {
            const.CONF_TRIGGER_KIND: const.TRIGGER_KIND_TIME,
            const.CONF_TRIGGER_AT: "06:30",
        },
        const.CONF_CURVE: {const.CONF_CURVE_TEMPLATE: const.PRESET_POTS_ID},
    }
    data.update(extra)
    return data


def test_cycle_defaults_to_a_daily_calendar():
    cycle = CycleConfig.from_config(_cycle_data(), templates={})
    assert cycle.calendar == ProgramCalendar.daily()
    assert cycle.season_months is None  # inherits the hub season
    assert cycle.day_intensity_pct == {}  # empty = uniform intensity


def test_cycle_parses_calendar_and_day_intensity():
    cycle = CycleConfig.from_config(
        _cycle_data(
            calendar={"mode": "weekdays", "days": [0, 2, 4]},
            day_intensity_pct={"0": 50.0, "4": 200.0},
        ),
        templates={},
    )
    assert cycle.calendar == ProgramCalendar.weekdays({0, 2, 4})
    assert cycle.day_intensity_pct == {0: 50.0, 4: 200.0}  # keys coerced to int


def test_cycle_parses_its_own_season():
    cycle = CycleConfig.from_config(_cycle_data(season_months=[6, 7, 8]), templates={})
    assert cycle.season_months == frozenset({6, 7, 8})


def test_zone_no_longer_owns_calendar_fields():
    for removed in ("interval_days", "season_months", "restrictions"):
        assert removed not in ZoneConfig.__dataclass_fields__


class TestCycleIntensity:
    def test_absent_intensity_reads_as_one_hundred(self) -> None:
        cycle = CycleConfig.from_config(
            {
                "id": "c1",
                "name": "Morning",
                "trigger": {"kind": "time", "at": "05:30"},
                "curve": {"points": [[20.0, 5.0]], "min_value": 1.0, "max_value": 60.0},
            },
            {},
        )
        assert cycle.intensity_pct == 100.0
        assert cycle.day_intensity_pct == {}

    def test_intensity_parsed_and_forwarded_to_the_spec(self) -> None:
        cycle = CycleConfig.from_config(
            {
                "id": "c1",
                "name": "Morning",
                "trigger": {"kind": "time", "at": "05:30"},
                "curve": {"points": [[20.0, 5.0]], "min_value": 1.0, "max_value": 60.0},
                "intensity_pct": 133.0,
                "day_intensity_pct": {"0": 50.0, "6": 200.0},
            },
            {},
        )
        assert cycle.intensity_pct == 133.0
        assert cycle.day_intensity_pct == {0: 50.0, 6: 200.0}
        spec = cycle.to_spec(enabled=True)
        assert spec.intensity_pct == 133.0
        assert spec.day_intensity_pct == {0: 50.0, 6: 200.0}
