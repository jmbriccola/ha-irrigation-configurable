"""Typed views over the config entry dictionaries.

The config entry (hub options) and the zone subentries store plain dicts;
everything downstream works with these frozen models instead. Parsing is
tolerant of missing keys (defaults apply) but strict on invalid curves —
a broken curve must fail loudly, not water for a wrong duration.

This module has no Home Assistant imports so it stays unit-testable.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time
from typing import Any, Self

from . import const
from .engine.calendar import ProgramCalendar
from .engine.curves import PRESET_LAWN, PRESET_POTS, Curve, CurveError, CurveKind
from .engine.model import EngineParams
from .engine.planner import CycleSpec, ZoneSpec
from .engine.scheduling import CalendarRestrictions, TimeWindow

BUILTIN_TEMPLATES: dict[str, Curve] = {
    const.PRESET_POTS_ID: PRESET_POTS,
    const.PRESET_LAWN_ID: PRESET_LAWN,
}


def _parse_time(value: str) -> time:
    hour, _, minute = value.partition(":")
    return time(int(hour), int(minute))


def _non_negative(raw: Any, default: float) -> float:
    """A tunable that cannot sensibly be negative, or the default.

    Falling back rather than raising, and rather than passing the value
    through. Refusing to load the whole integration over one bad number would
    take the irrigation down with it, but a negative leak_confirm_s means the
    confirmation window is already over on the first measured sample -- the
    detector would alarm instantly and for ever, on a setting the user
    probably typed by accident. Non-numeric junk lands here too, for the same
    reason. Zero stays legal everywhere it is meaningful: threshold 0 is "any
    flow at all", confirm 0 is "no waiting", repeat 0 is "no reminders".
    """
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return default
    return value if value >= 0 else default


def leak_action_from_config(raw: Any) -> str:
    """One of the three legal actions, or the default.

    Validated here so an unrecognised value cannot reach the runtime, where
    every comparison against the legal set would simply miss and silently
    degrade the default ``close`` into doing nothing at all -- the failure
    being least visible exactly when it matters most.
    """
    action = str(raw)
    return action if action in const.LEAK_ACTIONS else const.LEAK_ACTION_CLOSE


def engine_params_from_config(config: dict[str, Any]) -> EngineParams:
    """EngineParams from the hub's engine options, defaults for the rest."""
    known = set(EngineParams.__dataclass_fields__)
    kwargs: dict[str, Any] = {}
    for key, value in config.items():
        if key not in known:
            continue
        if key == const.CONF_SEASON_MONTHS:
            kwargs[key] = frozenset(int(month) for month in value)
        elif isinstance(value, list):
            kwargs[key] = tuple(value)
        else:
            kwargs[key] = value
    return EngineParams(**kwargs)


def restrictions_from_config(config: dict[str, Any] | None) -> CalendarRestrictions | None:
    """Hub restrictions: forbidden time-of-day windows only (2.0.0).

    Weekday and parity limits were a second source of truth for watering days
    and now live as program calendar modes.
    """
    if config is None:
        return None
    windows = tuple(
        TimeWindow(_parse_time(w[const.CONF_WINDOW_START]), _parse_time(w[const.CONF_WINDOW_END]))
        for w in config.get(const.CONF_FORBIDDEN_WINDOWS, [])
    )
    return CalendarRestrictions(forbidden_windows=windows)


def resolve_curve(config: dict[str, Any], templates: dict[str, Any]) -> Curve:
    """Build a Curve from inline points or a template reference.

    Built-in presets are always resolvable; user templates come from the hub
    options. Unknown templates raise CurveError — never guess a duration.
    """
    template_id = config.get(const.CONF_CURVE_TEMPLATE)
    if template_id is not None:
        if template_id in BUILTIN_TEMPLATES:
            return BUILTIN_TEMPLATES[template_id]
        if template_id in templates:
            return resolve_curve(templates[template_id], {})
        raise CurveError(f"unknown_curve_template:{template_id}")
    return Curve(
        points=tuple((float(t), float(v)) for t, v in config[const.CONF_CURVE_POINTS]),
        min_value=float(config[const.CONF_CURVE_MIN]),
        max_value=float(config[const.CONF_CURVE_MAX]),
        kind=CurveKind(config.get(const.CONF_CURVE_KIND, CurveKind.DURATION)),
    )


@dataclass(frozen=True, slots=True)
class CycleTrigger:
    """When a cycle fires: sun event with offset, or a fixed local time."""

    kind: str
    event: str | None = None  # sunrise | sunset
    offset_s: int = 0
    at: time | None = None

    @classmethod
    def from_config(cls, config: dict[str, Any]) -> Self:
        kind = config[const.CONF_TRIGGER_KIND]
        if kind == const.TRIGGER_KIND_SUN:
            return cls(
                kind=kind,
                event=config[const.CONF_TRIGGER_EVENT],
                offset_s=int(config.get(const.CONF_TRIGGER_OFFSET_S, 0)),
            )
        return cls(kind=kind, at=_parse_time(config[const.CONF_TRIGGER_AT]))


@dataclass(frozen=True, slots=True)
class CycleConfig:
    """One configured cycle of a zone."""

    cycle_id: str
    name: str
    enabled_default: bool
    trigger: CycleTrigger
    curve: Curve
    curve_config: dict[str, Any]
    calendar: ProgramCalendar = field(default_factory=ProgramCalendar.daily)
    season_months: frozenset[int] | None = None
    soak_max_run_min: int | None = None
    soak_pause_min: int = 0
    volume_safety_timeout_min: int | None = None
    intensity_pct: float = 100.0
    day_intensity_pct: dict[int, float] = field(default_factory=dict)

    @classmethod
    def from_config(cls, config: dict[str, Any], templates: dict[str, Any]) -> Self:
        months = config.get(const.CONF_SEASON_MONTHS)
        calendar_raw = config.get(const.CONF_CALENDAR)
        day_intensity_raw = config.get(const.CONF_CYCLE_DAY_INTENSITY_PCT, {})
        return cls(
            cycle_id=config[const.CONF_CYCLE_ID],
            name=config.get(const.CONF_CYCLE_NAME, config[const.CONF_CYCLE_ID]),
            enabled_default=bool(config.get(const.CONF_CYCLE_ENABLED, True)),
            trigger=CycleTrigger.from_config(config[const.CONF_TRIGGER]),
            curve=resolve_curve(config[const.CONF_CURVE], templates),
            curve_config=dict(config[const.CONF_CURVE]),
            calendar=(
                ProgramCalendar.from_config(calendar_raw)
                if calendar_raw is not None
                else ProgramCalendar.daily()
            ),
            season_months=frozenset(months) if months is not None else None,
            soak_max_run_min=config.get(const.CONF_SOAK_MAX_RUN_MIN),
            soak_pause_min=int(config.get(const.CONF_SOAK_PAUSE_MIN, 0)),
            volume_safety_timeout_min=config.get(const.CONF_VOLUME_SAFETY_TIMEOUT_MIN),
            intensity_pct=float(config.get(const.CONF_CYCLE_INTENSITY_PCT, 100.0)),
            day_intensity_pct={int(k): float(v) for k, v in day_intensity_raw.items()},
        )

    def to_spec(self, *, enabled: bool, last_completed: date | None = None) -> CycleSpec:
        return CycleSpec(
            cycle_id=self.cycle_id,
            enabled=enabled,
            curve=self.curve,
            calendar=self.calendar,
            season_months=self.season_months,
            last_completed=last_completed,
            soak_max_run_min=self.soak_max_run_min,
            soak_pause_min=self.soak_pause_min,
            volume_safety_timeout_min=self.volume_safety_timeout_min,
            intensity_pct=self.intensity_pct,
            day_intensity_pct=self.day_intensity_pct,
        )


@dataclass(frozen=True, slots=True)
class ZoneConfig:
    """One zone (config subentry)."""

    zone_id: str
    name: str
    icon: str | None
    valve_entity: str
    flow_sensor: str | None
    flow_sensor_unit: str | None
    nominal_flow_lpm: float | None
    flow_tolerance_pct: float
    leak_sensor: str | None
    water_supply_sensor: str | None
    area_m2: float | None
    adjustment_pct: float
    order: int
    compatibility_group: str | None
    cycles: tuple[CycleConfig, ...]

    @classmethod
    def from_subentry(
        cls, subentry_id: str, data: dict[str, Any], *, templates: dict[str, Any]
    ) -> Self:
        return cls(
            zone_id=subentry_id,
            name=data[const.CONF_ZONE_NAME],
            icon=data.get(const.CONF_ZONE_ICON),
            valve_entity=data[const.CONF_VALVE_ENTITY],
            flow_sensor=data.get(const.CONF_FLOW_SENSOR),
            flow_sensor_unit=data.get(const.CONF_FLOW_SENSOR_UNIT),
            nominal_flow_lpm=data.get(const.CONF_NOMINAL_FLOW_LPM),
            flow_tolerance_pct=float(
                data.get(const.CONF_FLOW_TOLERANCE_PCT, const.DEFAULT_FLOW_TOLERANCE_PCT)
            ),
            leak_sensor=data.get(const.CONF_LEAK_SENSOR),
            water_supply_sensor=data.get(const.CONF_WATER_SUPPLY_SENSOR),
            area_m2=data.get(const.CONF_AREA_M2),
            adjustment_pct=float(data.get(const.CONF_ADJUSTMENT_PCT, const.DEFAULT_ADJUSTMENT_PCT)),
            order=int(data.get(const.CONF_ORDER, const.DEFAULT_ORDER)),
            compatibility_group=data.get(const.CONF_COMPATIBILITY_GROUP),
            cycles=tuple(
                CycleConfig.from_config(cycle, templates)
                for cycle in data.get(const.CONF_CYCLES, [])
            ),
        )

    @property
    def is_switch(self) -> bool:
        """True when the valve entity is a switch (optimistic, no position)."""
        return self.valve_entity.startswith("switch.")

    def cycle(self, cycle_id: str) -> CycleConfig | None:
        return next((c for c in self.cycles if c.cycle_id == cycle_id), None)

    def to_spec(
        self,
        *,
        enabled: bool,
        cycles: tuple[CycleSpec, ...],
        suspended_until: datetime | None,
        paused_until: datetime | None,
        skip_today: bool,
        has_flow_meter: bool,
    ) -> ZoneSpec:
        return ZoneSpec(
            zone_id=self.zone_id,
            name=self.name,
            enabled=enabled,
            order=self.order,
            adjustment_pct=self.adjustment_pct,
            suspended_until=suspended_until,
            paused_until=paused_until,
            skip_today=skip_today,
            has_flow_meter=has_flow_meter,
            cycles=cycles,
        )


@dataclass(frozen=True, slots=True)
class HubConfig:
    """Global settings from the hub entry options."""

    weather_entity: str
    rain_sensor: str | None = None
    outdoor_temp_sensor: str | None = None
    line_flow_sensor: str | None = None
    line_flow_sensor_unit: str | None = None
    master_valve: str | None = None
    master_pre_open_s: int = const.DEFAULT_MASTER_PRE_OPEN_S
    master_post_close_s: int = const.DEFAULT_MASTER_POST_CLOSE_S
    max_concurrent: int = const.DEFAULT_MAX_CONCURRENT
    compatibility_groups: tuple[str, ...] = ()
    settle_pause_s: int = const.DEFAULT_SETTLE_PAUSE_S
    manual_block_min: int = const.DEFAULT_MANUAL_BLOCK_MIN
    watchdog_max_min: int = const.DEFAULT_WATCHDOG_MAX_MIN
    open_confirm_s: int = const.DEFAULT_OPEN_CONFIRM_S
    close_confirm_s: int = const.DEFAULT_CLOSE_CONFIRM_S
    switch_confirm_s: int = const.DEFAULT_SWITCH_CONFIRM_S
    wait_free_min: int = const.DEFAULT_WAIT_FREE_MIN
    sentinel_time: time = time(12, 0)
    session_max_min: int | None = None
    must_finish_by: time | None = None
    startup_valve_timeout_s: int = const.DEFAULT_STARTUP_VALVE_TIMEOUT_S
    stale_weather_max_h: int = const.DEFAULT_STALE_WEATHER_MAX_H
    stale_weather_policy: str = const.STALE_POLICY_FAIL_OPEN
    restrictions: CalendarRestrictions = field(default_factory=CalendarRestrictions)
    engine_params: EngineParams = field(default_factory=EngineParams)
    notifications: dict[str, Any] = field(default_factory=dict)
    consumption_budget_liters: float | None = None
    consumption_action: str = const.BUDGET_ACTION_NOTIFY
    consumption_reduce_pct: int = const.DEFAULT_BUDGET_REDUCE_PCT
    curve_templates: dict[str, Any] = field(default_factory=dict)
    leak_action: str = const.LEAK_ACTION_CLOSE
    leak_threshold_lpm: float = const.DEFAULT_LEAK_THRESHOLD_LPM
    leak_confirm_s: int = const.DEFAULT_LEAK_CONFIRM_S
    leak_repeat_min: int = const.DEFAULT_LEAK_REPEAT_MIN
    require_water_supply: bool = const.DEFAULT_REQUIRE_WATER_SUPPLY
    water_supply_confirm_s: int = const.DEFAULT_WATER_SUPPLY_CONFIRM_S

    @classmethod
    def from_options(cls, options: dict[str, Any]) -> Self:
        budget = options.get(const.CONF_CONSUMPTION_BUDGET, {})
        must_finish = options.get(const.CONF_MUST_FINISH_BY)
        return cls(
            weather_entity=options[const.CONF_WEATHER_ENTITY],
            rain_sensor=options.get(const.CONF_RAIN_SENSOR),
            outdoor_temp_sensor=options.get(const.CONF_OUTDOOR_TEMP_SENSOR),
            line_flow_sensor=options.get(const.CONF_LINE_FLOW_SENSOR),
            line_flow_sensor_unit=options.get(const.CONF_LINE_FLOW_UNIT),
            master_valve=options.get(const.CONF_MASTER_VALVE),
            master_pre_open_s=int(
                options.get(const.CONF_MASTER_PRE_OPEN_S, const.DEFAULT_MASTER_PRE_OPEN_S)
            ),
            master_post_close_s=int(
                options.get(const.CONF_MASTER_POST_CLOSE_S, const.DEFAULT_MASTER_POST_CLOSE_S)
            ),
            max_concurrent=int(
                options.get(const.CONF_MAX_CONCURRENT, const.DEFAULT_MAX_CONCURRENT)
            ),
            compatibility_groups=tuple(options.get(const.CONF_COMPATIBILITY_GROUPS, ())),
            settle_pause_s=int(
                options.get(const.CONF_SETTLE_PAUSE_S, const.DEFAULT_SETTLE_PAUSE_S)
            ),
            manual_block_min=int(
                options.get(const.CONF_MANUAL_BLOCK_MIN, const.DEFAULT_MANUAL_BLOCK_MIN)
            ),
            watchdog_max_min=int(
                options.get(const.CONF_WATCHDOG_MAX_MIN, const.DEFAULT_WATCHDOG_MAX_MIN)
            ),
            open_confirm_s=int(
                options.get(const.CONF_OPEN_CONFIRM_S, const.DEFAULT_OPEN_CONFIRM_S)
            ),
            close_confirm_s=int(
                options.get(const.CONF_CLOSE_CONFIRM_S, const.DEFAULT_CLOSE_CONFIRM_S)
            ),
            switch_confirm_s=int(
                options.get(const.CONF_SWITCH_CONFIRM_S, const.DEFAULT_SWITCH_CONFIRM_S)
            ),
            wait_free_min=int(options.get(const.CONF_WAIT_FREE_MIN, const.DEFAULT_WAIT_FREE_MIN)),
            sentinel_time=_parse_time(
                options.get(const.CONF_SENTINEL_TIME, const.DEFAULT_SENTINEL_TIME)
            ),
            session_max_min=options.get(const.CONF_SESSION_MAX_MIN),
            must_finish_by=_parse_time(must_finish) if must_finish else None,
            startup_valve_timeout_s=int(
                options.get(
                    const.CONF_STARTUP_VALVE_TIMEOUT_S,
                    const.DEFAULT_STARTUP_VALVE_TIMEOUT_S,
                )
            ),
            stale_weather_max_h=int(
                options.get(const.CONF_STALE_WEATHER_MAX_H, const.DEFAULT_STALE_WEATHER_MAX_H)
            ),
            stale_weather_policy=options.get(
                const.CONF_STALE_WEATHER_POLICY, const.STALE_POLICY_FAIL_OPEN
            ),
            restrictions=restrictions_from_config(options.get(const.CONF_RESTRICTIONS, {}))
            or CalendarRestrictions(),
            engine_params=engine_params_from_config(options.get(const.CONF_ENGINE, {})),
            notifications=dict(options.get(const.CONF_NOTIFICATIONS, {})),
            consumption_budget_liters=budget.get(const.CONF_BUDGET_LITERS),
            consumption_action=budget.get(const.CONF_BUDGET_ACTION, const.BUDGET_ACTION_NOTIFY),
            consumption_reduce_pct=int(
                budget.get(const.CONF_BUDGET_REDUCE_PCT, const.DEFAULT_BUDGET_REDUCE_PCT)
            ),
            curve_templates=dict(options.get(const.CONF_CURVE_TEMPLATES, {})),
            leak_action=leak_action_from_config(
                options.get(const.CONF_LEAK_ACTION, const.LEAK_ACTION_CLOSE)
            ),
            leak_threshold_lpm=_non_negative(
                options.get(const.CONF_LEAK_THRESHOLD_LPM, const.DEFAULT_LEAK_THRESHOLD_LPM),
                const.DEFAULT_LEAK_THRESHOLD_LPM,
            ),
            leak_confirm_s=int(
                _non_negative(
                    options.get(const.CONF_LEAK_CONFIRM_S, const.DEFAULT_LEAK_CONFIRM_S),
                    const.DEFAULT_LEAK_CONFIRM_S,
                )
            ),
            leak_repeat_min=int(
                _non_negative(
                    options.get(const.CONF_LEAK_REPEAT_MIN, const.DEFAULT_LEAK_REPEAT_MIN),
                    const.DEFAULT_LEAK_REPEAT_MIN,
                )
            ),
            require_water_supply=bool(
                options.get(const.CONF_REQUIRE_WATER_SUPPLY, const.DEFAULT_REQUIRE_WATER_SUPPLY)
            ),
            water_supply_confirm_s=int(
                _non_negative(
                    options.get(
                        const.CONF_WATER_SUPPLY_CONFIRM_S, const.DEFAULT_WATER_SUPPLY_CONFIRM_S
                    ),
                    const.DEFAULT_WATER_SUPPLY_CONFIRM_S,
                )
            ),
        )

    @property
    def is_master_switch(self) -> bool:
        return self.master_valve is not None and self.master_valve.startswith("switch.")
