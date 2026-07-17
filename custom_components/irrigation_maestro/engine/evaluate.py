"""Top-level session evaluation: §2 in one deterministic call.

The coordinator fetches the weather snapshot once per session, then calls
``evaluate_session``; the result is frozen for the whole session. Budget and
threshold are computed even when an immediate skip fires, so the hub sensors
always show current numbers.
"""

from __future__ import annotations

from datetime import datetime

from .model import EngineError, EngineParams, SessionEvaluation, SkipReason
from .weather import (
    check_immediate_skips,
    effective_rain_today,
    forecast_credit,
    skip_threshold,
    water_budget,
    weighted_temperature,
)


def evaluate_session(
    params: EngineParams,
    *,
    now: datetime,
    season_months: frozenset[int],
    condition: str | None,
    current_temp: float | None,
    wind_kmh: float | None,
    temp_d3: float | None,
    temp_d2: float | None,
    temp_d1: float | None,
    temp_today_observed: float | None,
    temp_today_forecast_max: float | None,
    temp_tomorrow_max: float | None,
    rain_committed_today: float,
    rain_staging_mm: float,
    rain_d1: float,
    rain_d2: float,
    rain_d3: float,
    forecast_0_24: float,
    forecast_24_48: float,
    stale_weather: bool = False,
) -> SessionEvaluation:
    """Evaluate one irrigation session."""
    today_candidates = [
        value
        for value in (temp_today_observed, temp_today_forecast_max, current_temp)
        if value is not None
    ]
    today_max_eff = max(today_candidates) if today_candidates else None

    try:
        weighted = weighted_temperature(
            params,
            d3=temp_d3,
            d2=temp_d2,
            d1=temp_d1,
            today=today_max_eff,
            tomorrow=temp_tomorrow_max,
        )
    except EngineError:
        # No temperature data anywhere: leave the decision to the caller's
        # stale-weather policy (the planner marks runs weather_unavailable).
        weighted = None

    rain_today = effective_rain_today(
        params,
        committed_mm=rain_committed_today,
        staging_mm=rain_staging_mm,
        minute=now.minute,
    )

    if weighted is None:
        credit = 0.0
        budget = 0.0
        threshold = round(params.threshold_base_mm, 2)
    else:
        credit = forecast_credit(
            params, rain_0_24=forecast_0_24, rain_24_48=forecast_24_48, weighted_temp=weighted
        )
        budget = water_budget(
            params, today=rain_today, d1=rain_d1, d2=rain_d2, d3=rain_d3, credit=credit
        )
        threshold = skip_threshold(params, weighted_temp=weighted)

    reason = check_immediate_skips(
        params,
        month=now.month,
        season_months=season_months,
        condition=condition,
        current_temp=current_temp,
        today_max_eff=today_max_eff,
        wind_kmh=wind_kmh,
    )
    if reason is None and weighted is not None and budget >= threshold:
        reason = SkipReason.BUDGET_SUFFICIENT

    return SessionEvaluation(
        weighted_temp=weighted,
        forecast_credit=credit,
        water_budget=budget,
        skip_threshold=threshold,
        skip_reason=reason,
        rain_today=rain_today,
        rain_d1=rain_d1,
        rain_d2=rain_d2,
        rain_d3=rain_d3,
        forecast_0_24=forecast_0_24,
        forecast_24_48=forecast_24_48,
        today_max_eff=today_max_eff,
        tomorrow_max=temp_tomorrow_max,
        stale_weather=stale_weather,
    )
