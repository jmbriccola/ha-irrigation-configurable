"""Weather decision model (§2): weighted temperature, water budget, skips.

Rounding contract (validated against the §8 regression case and the source
system): weighted temperature → 0.1 °C; credit, budget and threshold →
0.01 mm. Rounded values feed the downstream formulas, exactly like the
original templates did.
"""

from __future__ import annotations

from .model import EngineError, EngineParams, SkipReason

#: Weather entity states meaning "precipitation in progress" (immediate skip).
PRECIPITATION_STATES: frozenset[str] = frozenset(
    {"rainy", "pouring", "lightning-rainy", "snowy", "snowy-rainy"}
)


def weighted_temperature(
    params: EngineParams,
    *,
    d3: float | None,
    d2: float | None,
    d1: float | None,
    today: float | None,
    tomorrow: float | None,
) -> float:
    """Weighted temperature over five daily maxima.

    Missing days (fresh install, lost storage, no forecast) renormalize the
    remaining weights proportionally — a missing day is never counted as 0 °C.
    """
    pairs = [
        (d3, params.temp_weights[0]),
        (d2, params.temp_weights[1]),
        (d1, params.temp_weights[2]),
        (today, params.temp_weights[3]),
        (tomorrow, params.temp_weights[4]),
    ]
    available = [(value, weight) for value, weight in pairs if value is not None]
    if not available:
        raise EngineError("no_temperature_data")
    total_weight = sum(weight for _, weight in available)
    if total_weight <= 0:
        raise EngineError("temperature_weights_sum_zero")
    return round(sum(value * weight for value, weight in available) / total_weight, 1)


def effective_rain_today(
    params: EngineParams, *, committed_mm: float, staging_mm: float, minute: int
) -> float:
    """Rain fallen today as seen at evaluation time.

    Before the commit minute the staged current-hour forecast counts at the
    staged weight (it has not been committed yet); from the commit minute on
    it is already inside the committed counter.
    """
    if minute < params.stage_commit_minute:
        return round(committed_mm + staging_mm * params.staged_rain_weight, 1)
    return round(committed_mm, 1)


def forecast_credit(
    params: EngineParams, *, rain_0_24: float, rain_24_48: float, weighted_temp: float
) -> float:
    """Forecast credit: weighted, capped, halved in hot weather."""
    raw = rain_0_24 * params.forecast_credit_weights[0] + (
        rain_24_48 * params.forecast_credit_weights[1]
    )
    capped = min(raw, params.forecast_credit_cap_mm)
    if weighted_temp >= params.hot_credit_halving_temp_c:
        capped *= 0.5
    return round(capped, 2)


def water_budget(
    params: EngineParams, *, today: float, d1: float, d2: float, d3: float, credit: float
) -> float:
    """Water budget in mm: weighted past rain plus the forecast credit."""
    weights = params.rain_weights
    return round(
        today * weights[0] + d1 * weights[1] + d2 * weights[2] + d3 * weights[3] + credit, 2
    )


def skip_threshold(params: EngineParams, *, weighted_temp: float) -> float:
    """Dynamic skip threshold in mm, growing with heat, capped."""
    extra = max(weighted_temp - params.threshold_knee_c, 0.0)
    return round(
        min(
            params.threshold_base_mm + extra * params.threshold_slope_mm_per_c,
            params.threshold_max_mm,
        ),
        2,
    )


def check_immediate_skips(
    params: EngineParams,
    *,
    month: int,
    season_months: frozenset[int],
    condition: str | None,
    current_temp: float | None,
    today_max_eff: float | None,
    wind_kmh: float | None,
) -> SkipReason | None:
    """Pre-computation skips, in the source system's priority order.

    Missing sensor data never triggers a skip on its own — a check whose input
    is unavailable is passed over (the stale-weather policy is handled by the
    caller before this point).
    """
    if month not in season_months:
        return SkipReason.OUT_OF_SEASON
    if condition is not None and condition in PRECIPITATION_STATES:
        return SkipReason.PRECIPITATION
    if current_temp is not None and current_temp < params.freeze_skip_c:
        return SkipReason.FROST_RISK
    if today_max_eff is not None and today_max_eff < params.cold_day_skip_c:
        return SkipReason.COLD_DAY
    if params.wind_skip_enabled and wind_kmh is not None and wind_kmh > params.wind_skip_kmh:
        return SkipReason.WIND
    return None
