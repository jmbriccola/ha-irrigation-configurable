"""Semantic curve mapping: two friendly numbers <-> three control points.

This is the reference implementation of the mapping the card editor mirrors in
TypeScript. Kept pure and HA-free so it is unit-testable and shared by the
``set_simple_curve`` service.

- ``amount``: watering minutes on a mild day (25 C) — the baseline.
- ``heat``: extra minutes on a hot day (35 C) versus a mild one.

Points are generated with a slope of ``heat / 10`` minutes per degree, the cool
anchor extrapolated down and floored at 0 so the curve is always valid.
"""

from __future__ import annotations

from .curves import Curve, curve_value

ANCHORS: tuple[float, float, float] = (12.0, 25.0, 35.0)
AMOUNT_MIN, AMOUNT_MAX = 3, 45
HEAT_MIN, HEAT_MAX = 0, 30

_COOL, _MILD, _HOT = ANCHORS
_SLOPE_SPAN = (_MILD - _COOL) / 10.0  # = 1.3 (per unit of heat)


def _clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


def points_from_semantic(
    amount: int, heat: int
) -> tuple[tuple[float, float], tuple[float, float], tuple[float, float]]:
    """Three control points (cool, mild, hot) for the given amount and heat."""
    cool = max(0, round(amount - _SLOPE_SPAN * heat))
    return (
        (_COOL, float(cool)),
        (_MILD, float(amount)),
        (_HOT, float(amount + heat)),
    )


def semantic_from_curve(curve: Curve) -> tuple[int, int]:
    """Best-effort (amount, heat) for an existing curve, clamped to the UI ranges."""
    mild = curve_value(curve, _MILD)
    hot = curve_value(curve, _HOT)
    amount = _clamp(round(mild), AMOUNT_MIN, AMOUNT_MAX)
    heat = _clamp(round(hot - mild), HEAT_MIN, HEAT_MAX)
    return amount, heat
