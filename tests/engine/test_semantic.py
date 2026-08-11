"""Tests for the semantic curve mapping (amount + heat <-> 3 control points)."""

from custom_components.irrigation_maestro.engine.curves import PRESET_POTS, Curve
from custom_components.irrigation_maestro.engine.semantic import (
    AMOUNT_MAX,
    AMOUNT_MIN,
    ANCHORS,
    HEAT_MAX,
    HEAT_MIN,
    points_from_semantic,
    semantic_from_curve,
)


def test_anchors_are_cool_mild_hot():
    assert ANCHORS == (12.0, 25.0, 35.0)


def test_points_endpoints_match_amount_and_heat():
    points = points_from_semantic(15, 15)
    assert points == ((12.0, 0.0), (25.0, 15.0), (35.0, 30.0))


def test_points_temperatures_are_fixed_and_increasing():
    points = points_from_semantic(3, 30)
    assert [t for t, _ in points] == [12.0, 25.0, 35.0]


def test_cool_value_floored_at_zero_for_large_heat():
    # 3 - 1.3*30 = -36 -> floored to 0; values never negative.
    points = points_from_semantic(3, 30)
    assert points[0][1] == 0.0
    assert all(v >= 0 for _, v in points)


def test_heat_zero_is_flat_from_mild_up():
    points = points_from_semantic(20, 0)
    assert points == ((12.0, 20.0), (25.0, 20.0), (35.0, 20.0))


def test_semantic_from_curve_roundtrips():
    points = points_from_semantic(18, 12)
    curve = Curve(points=points, min_value=0.0, max_value=120.0)
    assert semantic_from_curve(curve) == (18, 12)


def test_semantic_from_curve_fits_pots_preset():
    # pots preset: 1 min/°C, +1/°C above 30, clamp 10-55.
    # At 25 -> 25 min (amount), at 35 -> 40 min -> heat 15.
    amount, heat = semantic_from_curve(PRESET_POTS)
    assert amount == 25
    assert heat == 15


def test_semantic_values_clamped_to_ranges():
    tiny = Curve(points=((25.0, 1.0), (35.0, 1.0)), min_value=0.0, max_value=120.0)
    amount, heat = semantic_from_curve(tiny)
    assert amount == AMOUNT_MIN  # 1 -> clamped up to 3
    assert heat == HEAT_MIN
    huge = Curve(points=((25.0, 200.0), (35.0, 400.0)), min_value=0.0, max_value=1000.0)
    amount, heat = semantic_from_curve(huge)
    assert amount == AMOUNT_MAX
    assert heat == HEAT_MAX
