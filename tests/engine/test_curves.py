"""Tests for the pure curve engine: validation, interpolation, clamps, presets."""

import pytest
from custom_components.irrigation_maestro.engine.curves import (
    PRESET_LAWN,
    PRESET_POTS,
    Curve,
    CurveError,
    curve_value,
    interpolate,
    validate_points,
)


def make_curve(points, min_value=0.0, max_value=1000.0):
    return Curve(points=tuple(points), min_value=min_value, max_value=max_value)


class TestValidation:
    def test_accepts_strictly_increasing_temperatures(self):
        validate_points(((10.0, 5.0), (25.0, 15.0), (35.0, 30.0)))

    def test_rejects_empty_points(self):
        with pytest.raises(CurveError):
            validate_points(())

    def test_rejects_non_increasing_temperatures(self):
        with pytest.raises(CurveError):
            validate_points(((10.0, 5.0), (10.0, 15.0)))
        with pytest.raises(CurveError):
            validate_points(((25.0, 5.0), (10.0, 15.0)))

    def test_rejects_negative_values(self):
        with pytest.raises(CurveError):
            validate_points(((10.0, -5.0),))

    def test_rejects_inverted_clamps(self):
        with pytest.raises(CurveError):
            Curve(points=((10.0, 5.0),), min_value=30.0, max_value=10.0)

    def test_single_point_is_valid(self):
        validate_points(((20.0, 12.0),))


class TestInterpolation:
    def test_linear_interpolation_between_points(self):
        curve = make_curve([(10.0, 5.0), (25.0, 15.0), (35.0, 30.0)])
        assert curve_value(curve, 17.5) == pytest.approx(10.0)
        assert curve_value(curve, 30.0) == pytest.approx(22.5)

    def test_exact_points_returned_verbatim(self):
        curve = make_curve([(10.0, 5.0), (25.0, 15.0)])
        assert curve_value(curve, 10.0) == pytest.approx(5.0)
        assert curve_value(curve, 25.0) == pytest.approx(15.0)

    def test_flat_extrapolation_below_first_point(self):
        curve = make_curve([(10.0, 5.0), (25.0, 15.0)])
        assert curve_value(curve, -10.0) == pytest.approx(5.0)

    def test_flat_extrapolation_above_last_point(self):
        curve = make_curve([(10.0, 5.0), (25.0, 15.0)])
        assert curve_value(curve, 40.0) == pytest.approx(15.0)

    def test_single_point_curve_is_constant(self):
        curve = make_curve([(20.0, 12.0)])
        assert curve_value(curve, 5.0) == pytest.approx(12.0)
        assert curve_value(curve, 35.0) == pytest.approx(12.0)


class TestClampsAndAdjustment:
    def test_clamps_applied_to_interpolated_value(self):
        curve = make_curve([(0.0, 0.0), (50.0, 50.0)], min_value=10.0, max_value=30.0)
        assert curve_value(curve, 5.0) == pytest.approx(10.0)
        assert curve_value(curve, 45.0) == pytest.approx(30.0)
        assert curve_value(curve, 20.0) == pytest.approx(20.0)

    def test_adjustment_applied_after_curve_before_clamps(self):
        # 70% of 20 = 14 -> below min 15 -> clamped to 15 (spec §1: after curve,
        # before clamps)
        curve = make_curve([(0.0, 0.0), (50.0, 50.0)], min_value=15.0, max_value=30.0)
        assert curve_value(curve, 20.0, adjustment_pct=70) == pytest.approx(15.0)
        # 150% of 25 = 37.5 -> above max -> clamped to 30
        assert curve_value(curve, 25.0, adjustment_pct=150) == pytest.approx(30.0)

    def test_default_adjustment_is_neutral(self):
        curve = make_curve([(0.0, 0.0), (50.0, 50.0)])
        assert curve_value(curve, 33.0) == pytest.approx(33.0)


class TestPresets:
    """The two §8 reference curves, shipped as selectable presets."""

    def test_pots_preset_regression_point(self):
        # weighted temp 31.0 °C -> 32 min (1 min/°C, +1 extra above 30 °C)
        assert round(curve_value(PRESET_POTS, 31.0)) == 32

    def test_pots_preset_clamps(self):
        assert curve_value(PRESET_POTS, 5.0) == pytest.approx(10.0)
        assert curve_value(PRESET_POTS, 50.0) == pytest.approx(55.0)

    def test_pots_preset_below_bonus_knee(self):
        # 25 °C -> 25 min (no bonus below 30 °C)
        assert curve_value(PRESET_POTS, 25.0) == pytest.approx(25.0)

    def test_lawn_preset_regression_point(self):
        # weighted temp 31.0 °C -> mm = 4 + 0.3*(31-25) = 5.8, / 0.375 = 15.47 -> 15
        assert round(curve_value(PRESET_LAWN, 31.0)) == 15

    def test_lawn_preset_mm_floor_and_cap(self):
        # mm floor 3 -> 8 min; mm cap 8 -> 21.33 min (both from the source system)
        assert curve_value(PRESET_LAWN, 0.0) == pytest.approx(8.0)
        assert curve_value(PRESET_LAWN, 45.0) == pytest.approx(64 / 3, abs=0.01)

    def test_lawn_preset_duration_clamps(self):
        assert PRESET_LAWN.min_value == 8.0
        assert PRESET_LAWN.max_value == 25.0


class TestInterpolate:
    """Raw interpolation: no adjustment, no clamps."""

    def test_ignores_the_clamps(self) -> None:
        # PRESET_POTS floors at 10 min, but the raw line through (10,10) and
        # (30,30) is 5 at 5 degrees. curve_value clamps it; interpolate does not.
        assert interpolate(PRESET_POTS.points, 5.0) == pytest.approx(10.0)
        curve = Curve(points=((10.0, 5.0), (30.0, 30.0)), min_value=10.0, max_value=55.0)
        assert interpolate(curve.points, 10.0) == pytest.approx(5.0)
        assert curve_value(curve, 10.0) == pytest.approx(10.0)

    def test_interpolates_between_points(self) -> None:
        assert interpolate(PRESET_POTS.points, 20.0) == pytest.approx(20.0)
        assert interpolate(PRESET_POTS.points, 36.0) == pytest.approx(42.0)

    def test_flat_beyond_the_extremes(self) -> None:
        assert interpolate(PRESET_POTS.points, -5.0) == pytest.approx(10.0)
        assert interpolate(PRESET_POTS.points, 99.0) == pytest.approx(55.0)
