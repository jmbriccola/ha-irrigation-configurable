"""Tests for the top-level session evaluation (immediate skips + budget)."""

from datetime import datetime

from custom_components.irrigation_maestro.engine.evaluate import evaluate_session
from custom_components.irrigation_maestro.engine.model import EngineParams, SkipReason

PARAMS = EngineParams()
JULY = datetime(2026, 7, 17, 5, 30)
SEASON = frozenset(range(3, 11))


def evaluate(**overrides):
    """§8 inputs by default; overridable per test."""
    kwargs = dict(
        now=JULY,
        season_months=SEASON,
        condition="sunny",
        current_temp=24.0,
        wind_kmh=5.0,
        temp_d3=31.6,
        temp_d2=32.4,
        temp_d1=31.0,
        temp_today_observed=30.0,
        temp_today_forecast_max=28.5,
        temp_tomorrow_max=31.8,
        rain_committed_today=2.8,
        rain_staging_mm=0.0,
        rain_d1=1.0,
        rain_d2=4.1,
        rain_d3=0.0,
        forecast_0_24=0.0,
        forecast_24_48=0.7,
        stale_weather=False,
    )
    kwargs.update(overrides)
    return evaluate_session(PARAMS, **kwargs)


class TestRegressionCase:
    def test_section_8_outputs(self):
        result = evaluate()
        assert result.weighted_temp == 31.0
        assert result.forecast_credit == 0.09
        assert result.water_budget == 3.79
        assert result.skip_threshold == 4.5
        assert result.skip_reason is None
        assert result.should_water


class TestTodayEffective:
    def test_takes_max_of_observed_forecast_and_current(self):
        assert evaluate(temp_today_forecast_max=33.0).today_max_eff == 33.0
        assert evaluate(current_temp=34.0).today_max_eff == 34.0
        assert evaluate().today_max_eff == 30.0

    def test_missing_sources_ignored(self):
        result = evaluate(temp_today_observed=None, temp_today_forecast_max=None)
        assert result.today_max_eff == 24.0  # falls back to current temp


class TestSkips:
    def test_budget_sufficient(self):
        result = evaluate(rain_committed_today=6.0)
        assert result.skip_reason is SkipReason.BUDGET_SUFFICIENT
        assert result.water_budget >= result.skip_threshold

    def test_out_of_season(self):
        result = evaluate(now=datetime(2026, 12, 17, 5, 30))
        assert result.skip_reason is SkipReason.OUT_OF_SEASON

    def test_precipitation_wins_over_budget(self):
        result = evaluate(condition="pouring", rain_committed_today=6.0)
        assert result.skip_reason is SkipReason.PRECIPITATION

    def test_frost(self):
        assert evaluate(current_temp=1.0).skip_reason is SkipReason.FROST_RISK

    def test_cold_day_uses_effective_max(self):
        result = evaluate(temp_today_observed=8.0, temp_today_forecast_max=9.0, current_temp=7.0)
        assert result.skip_reason is SkipReason.COLD_DAY

    def test_values_still_computed_on_skip(self):
        # Sensors keep showing budget/threshold even when the session skips.
        result = evaluate(condition="rainy")
        assert result.water_budget == 3.79
        assert result.skip_threshold == 4.5


class TestStagedRain:
    def test_staging_counts_weighted_before_commit_minute(self):
        result = evaluate(rain_committed_today=2.0, rain_staging_mm=1.0)  # 05:30
        assert result.rain_today == 2.8

    def test_staging_not_double_counted_after_commit_minute(self):
        result = evaluate(
            now=datetime(2026, 7, 17, 5, 57),
            rain_committed_today=2.8,
            rain_staging_mm=1.0,
        )
        assert result.rain_today == 2.8


class TestNoWeatherData:
    def test_no_temperatures_yields_none_weighted_and_zero_budget(self):
        result = evaluate(
            temp_d3=None,
            temp_d2=None,
            temp_d1=None,
            temp_today_observed=None,
            temp_today_forecast_max=None,
            temp_tomorrow_max=None,
            current_temp=None,
            condition=None,
        )
        assert result.weighted_temp is None
        assert result.water_budget == 0.0
        assert result.skip_reason is None  # the planner marks runs weather_unavailable

    def test_stale_flag_carried(self):
        assert evaluate(stale_weather=True).stale_weather is True
