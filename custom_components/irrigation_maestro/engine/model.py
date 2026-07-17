"""Shared engine types: parameters, skip reasons, evaluation results."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class EngineError(ValueError):
    """Raised when engine inputs are unusable (never silently guessed)."""


class SkipReason(StrEnum):
    """Why a session, zone or cycle did not water.

    Values are stable keys: they travel through sensors, events and the card,
    which localize them; the engine never emits display text.
    """

    OUT_OF_SEASON = "out_of_season"
    PRECIPITATION = "precipitation"
    FROST_RISK = "frost_risk"
    COLD_DAY = "cold_day"
    WIND = "wind"
    BUDGET_SUFFICIENT = "budget_sufficient"
    NOT_DUE = "not_due"
    CALENDAR_RESTRICTED = "calendar_restricted"
    ZONE_DISABLED = "zone_disabled"
    CYCLE_DISABLED = "cycle_disabled"
    SUSPENDED = "suspended"
    PAUSED = "paused"
    MANUAL_STOP_BLOCK = "manual_stop_block"
    SESSION_OVERRUN = "session_overrun"
    WEATHER_UNAVAILABLE = "weather_unavailable"
    SKIP_TODAY_REQUESTED = "skip_today_requested"
    CONSUMPTION_BUDGET = "consumption_budget"

    @property
    def silent(self) -> bool:
        """Skips that never notify (routine non-events)."""
        return self in _SILENT_REASONS


_SILENT_REASONS = frozenset(
    {
        SkipReason.OUT_OF_SEASON,
        SkipReason.NOT_DUE,
        SkipReason.ZONE_DISABLED,
        SkipReason.CYCLE_DISABLED,
    }
)


@dataclass(frozen=True, slots=True)
class EngineParams:
    """Every §2 weight and threshold, with the field-validated defaults.

    All values are user-configurable in the hub options ("advanced" section
    with reset-to-defaults).
    """

    # Weighted temperature: day -3, day -2, yesterday, today, tomorrow.
    temp_weights: tuple[float, float, float, float, float] = (0.05, 0.15, 0.30, 0.35, 0.15)
    # Past rain: today, yesterday, day -2, day -3.
    rain_weights: tuple[float, float, float, float] = (0.85, 0.5, 0.2, 0.05)
    # Forecast credit: 0-24 h, 24-48 h.
    forecast_credit_weights: tuple[float, float] = (0.6, 0.25)
    forecast_credit_cap_mm: float = 5.0
    hot_credit_halving_temp_c: float = 30.0
    threshold_base_mm: float = 3.0
    threshold_slope_mm_per_c: float = 0.5
    threshold_knee_c: float = 28.0
    threshold_max_mm: float = 6.0
    freeze_skip_c: float = 2.0
    cold_day_skip_c: float = 10.0
    wind_skip_enabled: bool = False
    wind_skip_kmh: float = 30.0
    # Stage-and-commit hourly rain estimation (no physical rain sensor).
    staged_rain_weight: float = 0.8
    stage_commit_minute: int = 55
    daily_rain_cap_mm: float = 200.0
    hourly_staging_cap_mm: float = 50.0
    season_months: frozenset[int] = field(default_factory=lambda: frozenset(range(3, 11)))


@dataclass(frozen=True, slots=True)
class SessionEvaluation:
    """Frozen result of one session-level engine evaluation."""

    weighted_temp: float | None
    forecast_credit: float
    water_budget: float
    skip_threshold: float
    skip_reason: SkipReason | None
    # Raw inputs kept for notifications / diagnostics / the `evaluate` service.
    rain_today: float = 0.0
    rain_d1: float = 0.0
    rain_d2: float = 0.0
    rain_d3: float = 0.0
    forecast_0_24: float = 0.0
    forecast_24_48: float = 0.0
    today_max_eff: float | None = None
    tomorrow_max: float | None = None
    stale_weather: bool = False

    @property
    def should_water(self) -> bool:
        return self.skip_reason is None
