"""Tests for the weather decision model: §2 formulas and the §8 regression case."""

import pytest
from custom_components.irrigation_maestro.engine.curves import (
    PRESET_LAWN,
    PRESET_POTS,
    curve_value,
)
from custom_components.irrigation_maestro.engine.model import (
    EngineError,
    EngineParams,
    SkipReason,
)
from custom_components.irrigation_maestro.engine.weather import (
    PRECIPITATION_STATES,
    check_immediate_skips,
    effective_rain_today,
    forecast_credit,
    skip_threshold,
    water_budget,
    weighted_temperature,
)

PARAMS = EngineParams()


class TestWeightedTemperature:
    def test_all_days_available(self):
        # §8 inputs
        assert (
            weighted_temperature(PARAMS, d3=31.6, d2=32.4, d1=31.0, today=30.0, tomorrow=31.8)
            == 31.0
        )

    def test_result_rounded_to_one_decimal(self):
        value = weighted_temperature(PARAMS, d3=20.0, d2=20.0, d1=20.0, today=21.1, tomorrow=20.0)
        assert value == round(value, 1)

    def test_bootstrap_renormalizes_over_available_days(self):
        # Only today+tomorrow known (fresh install): weights 0.35/0.15 renormalized
        expected = round((30.0 * 0.35 + 20.0 * 0.15) / 0.5, 1)
        assert (
            weighted_temperature(PARAMS, d3=None, d2=None, d1=None, today=30.0, tomorrow=20.0)
            == expected
        )

    def test_bootstrap_single_day(self):
        assert (
            weighted_temperature(PARAMS, d3=None, d2=None, d1=None, today=27.3, tomorrow=None)
            == 27.3
        )

    def test_missing_days_are_never_treated_as_zero(self):
        # If missing days counted as 0 °C the result would be far below 30.
        value = weighted_temperature(PARAMS, d3=None, d2=None, d1=30.0, today=30.0, tomorrow=30.0)
        assert value == 30.0

    def test_all_missing_raises(self):
        with pytest.raises(EngineError):
            weighted_temperature(PARAMS, d3=None, d2=None, d1=None, today=None, tomorrow=None)


class TestEffectiveRainToday:
    def test_before_commit_minute_staging_counts_weighted(self):
        assert effective_rain_today(PARAMS, committed_mm=2.0, staging_mm=1.0, minute=30) == 2.8

    def test_at_or_after_commit_minute_staging_already_committed(self):
        assert effective_rain_today(PARAMS, committed_mm=2.8, staging_mm=1.5, minute=55) == 2.8
        assert effective_rain_today(PARAMS, committed_mm=2.8, staging_mm=1.5, minute=58) == 2.8


class TestForecastCredit:
    def test_regression_value_halved_when_hot(self):
        # §8: (0.0*0.6 + 0.7*0.25) = 0.175, halved (temp 31.0 >= 30) -> 0.09
        assert forecast_credit(PARAMS, rain_0_24=0.0, rain_24_48=0.7, weighted_temp=31.0) == 0.09

    def test_not_halved_below_threshold(self):
        # 0.7*0.25 = 0.175 -> 0.17: the binary float is 0.17499…, so round()
        # goes down — same arithmetic as the source system's Jinja templates.
        assert forecast_credit(PARAMS, rain_0_24=0.0, rain_24_48=0.7, weighted_temp=29.9) == 0.17

    def test_cap_applied_before_halving(self):
        # 20*0.6 = 12 -> cap 5 -> halved 2.5
        assert forecast_credit(PARAMS, rain_0_24=20.0, rain_24_48=0.0, weighted_temp=35.0) == 2.5

    def test_cap_without_halving(self):
        assert forecast_credit(PARAMS, rain_0_24=20.0, rain_24_48=0.0, weighted_temp=20.0) == 5.0


class TestWaterBudgetAndThreshold:
    def test_budget_regression_value(self):
        # §8: 2.8*0.85 + 1.0*0.5 + 4.1*0.2 + 0.0*0.05 + 0.09 (credit 0.0875 pre-round)
        credit = forecast_credit(PARAMS, rain_0_24=0.0, rain_24_48=0.7, weighted_temp=31.0)
        assert water_budget(PARAMS, today=2.8, d1=1.0, d2=4.1, d3=0.0, credit=credit) == 3.79

    def test_threshold_regression_value(self):
        assert skip_threshold(PARAMS, weighted_temp=31.0) == 4.5

    def test_threshold_base_below_knee(self):
        assert skip_threshold(PARAMS, weighted_temp=25.0) == 3.0

    def test_threshold_capped(self):
        assert skip_threshold(PARAMS, weighted_temp=45.0) == 6.0


class TestImmediateSkips:
    def kwargs(self, **overrides):
        base = {
            "month": 7,
            "season_months": frozenset(range(3, 11)),
            "condition": "sunny",
            "current_temp": 22.0,
            "today_max_eff": 28.0,
            "wind_kmh": 5.0,
        }
        base.update(overrides)
        return base

    def test_no_skip_in_normal_conditions(self):
        assert check_immediate_skips(PARAMS, **self.kwargs()) is None

    def test_out_of_season(self):
        assert check_immediate_skips(PARAMS, **self.kwargs(month=12)) is SkipReason.OUT_OF_SEASON

    def test_precipitation_states(self):
        assert {
            "rainy",
            "pouring",
            "lightning-rainy",
            "snowy",
            "snowy-rainy",
        } == PRECIPITATION_STATES
        for state in PRECIPITATION_STATES:
            assert (
                check_immediate_skips(PARAMS, **self.kwargs(condition=state))
                is SkipReason.PRECIPITATION
            )

    def test_frost_risk(self):
        assert (
            check_immediate_skips(PARAMS, **self.kwargs(current_temp=1.9)) is SkipReason.FROST_RISK
        )

    def test_cold_day(self):
        assert (
            check_immediate_skips(PARAMS, **self.kwargs(today_max_eff=9.9)) is SkipReason.COLD_DAY
        )

    def test_wind_disabled_by_default(self):
        assert check_immediate_skips(PARAMS, **self.kwargs(wind_kmh=90.0)) is None

    def test_wind_skip_when_enabled(self):
        params = EngineParams(wind_skip_enabled=True, wind_skip_kmh=30.0)
        assert check_immediate_skips(params, **self.kwargs(wind_kmh=31.0)) is SkipReason.WIND

    def test_priority_order_season_first_then_precipitation(self):
        assert (
            check_immediate_skips(PARAMS, **self.kwargs(month=1, condition="pouring"))
            is SkipReason.OUT_OF_SEASON
        )
        assert (
            check_immediate_skips(PARAMS, **self.kwargs(condition="pouring", current_temp=0.0))
            is SkipReason.PRECIPITATION
        )

    def test_missing_wind_data_never_skips(self):
        params = EngineParams(wind_skip_enabled=True, wind_skip_kmh=30.0)
        assert check_immediate_skips(params, **self.kwargs(wind_kmh=None)) is None


class TestFullRegressionCase:
    """§8: the mandatory end-to-end regression with default parameters."""

    def test_full_pipeline(self):
        temp = weighted_temperature(PARAMS, d3=31.6, d2=32.4, d1=31.0, today=30.0, tomorrow=31.8)
        assert temp == 31.0

        credit = forecast_credit(PARAMS, rain_0_24=0.0, rain_24_48=0.7, weighted_temp=temp)
        assert credit == 0.09

        budget = water_budget(PARAMS, today=2.8, d1=1.0, d2=4.1, d3=0.0, credit=credit)
        assert budget == 3.79

        threshold = skip_threshold(PARAMS, weighted_temp=temp)
        assert threshold == 4.5

        assert budget < threshold  # -> water

        assert round(curve_value(PRESET_POTS, temp)) == 32
        assert round(curve_value(PRESET_LAWN, temp)) == 15
