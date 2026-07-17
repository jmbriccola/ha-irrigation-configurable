"""Temperature-to-duration/volume curves.

A curve maps the weighted temperature (°C) to a target value: minutes for
duration cycles, liters for volume cycles. Between control points the value is
linearly interpolated; outside the outermost points it is flat (no
extrapolation). The per-zone adjustment factor is applied after the curve and
before the explicit min/max clamps.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from enum import StrEnum
from itertools import pairwise

type CurvePoint = tuple[float, float]


class CurveError(ValueError):
    """Raised when curve points or clamps are invalid."""


class CurveKind(StrEnum):
    """What the curve output represents."""

    DURATION = "duration"
    VOLUME = "volume"


def validate_points(points: Sequence[CurvePoint]) -> None:
    """Validate control points: non-empty, strictly increasing temps, values >= 0."""
    if not points:
        raise CurveError("curve_empty")
    for temp, value in points:
        if value < 0:
            raise CurveError(f"curve_negative_value:{temp}:{value}")
    temps = [temp for temp, _ in points]
    for previous, current in pairwise(temps):
        if current <= previous:
            raise CurveError(f"curve_temps_not_increasing:{previous}:{current}")


@dataclass(frozen=True, slots=True)
class Curve:
    """An immutable, validated curve."""

    points: tuple[CurvePoint, ...]
    min_value: float
    max_value: float
    kind: CurveKind = field(default=CurveKind.DURATION)

    def __post_init__(self) -> None:
        validate_points(self.points)
        if self.min_value > self.max_value:
            raise CurveError(f"curve_clamps_inverted:{self.min_value}:{self.max_value}")


def curve_value(curve: Curve, temp_c: float, adjustment_pct: float = 100.0) -> float:
    """Evaluate the curve at a temperature.

    Linear interpolation between points, flat beyond the extremes, then the
    adjustment factor, then the min/max clamps.
    """
    points = curve.points
    if temp_c <= points[0][0]:
        raw = points[0][1]
    elif temp_c >= points[-1][0]:
        raw = points[-1][1]
    else:
        raw = points[-1][1]
        for (t0, v0), (t1, v1) in pairwise(points):
            if t0 <= temp_c <= t1:
                raw = v0 + (v1 - v0) * (temp_c - t0) / (t1 - t0)
                break
    adjusted = raw * adjustment_pct / 100.0
    return min(max(adjusted, curve.min_value), curve.max_value)


# The two field-validated reference curves from the source system (§8), shipped
# as selectable presets. Points are exact so the §8 regression values reproduce.

#: Potted plants: 1 min/°C, +1 extra min/°C above 30 °C, clamped to 10-55 min.
#: As control points: value = t up to 30 °C, then 2t - 30 (reaches the 55 min
#: cap at 42.5 °C).
PRESET_POTS = Curve(
    points=((10.0, 10.0), (30.0, 30.0), (42.5, 55.0)),
    min_value=10.0,
    max_value=55.0,
)

#: Lawn: target mm = 4 + 0.3·(t - 25), floored at 3 mm, capped at 8 mm,
#: converted at 0.375 mm/min, clamped to 8-25 min. The mm floor is reached at
#: t = 65/3 °C and the cap at t = 115/3 °C; between them minutes are linear
#: (0.8 min/°C), so two exact control points represent the preset verbatim.
PRESET_LAWN = Curve(
    points=((65 / 3, 8.0), (115 / 3, 64 / 3)),
    min_value=8.0,
    max_value=25.0,
)
