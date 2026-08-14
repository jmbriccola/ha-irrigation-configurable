"""Pure metering arithmetic: accumulation, daily rollup, 730-day retention."""

from datetime import date

from custom_components.irrigation_maestro.engine.metering import (
    RETENTION_DAYS,
    UNATTRIBUTED_KEY,
    accumulate,
    prune_daily,
    roll_into_day,
    sum_period,
)


def test_accumulate_is_rate_times_time() -> None:
    assert accumulate(60.0, 60.0) == 60.0  # 60 L/min for one minute
    assert accumulate(7.5, 600.0) == 75.0  # 7.5 L/min for ten minutes
    assert accumulate(0.0, 600.0) == 0.0


def test_accumulate_clamps_negative_inputs() -> None:
    """A meter reporting backwards, or a clock stepping back, adds nothing."""
    assert accumulate(-5.0, 60.0) == 0.0
    assert accumulate(60.0, -60.0) == 0.0


def test_roll_into_day_accumulates_without_mutating() -> None:
    daily: dict = {}
    first = roll_into_day(daily, "2026-08-14", "z1", 10.0, estimated=False, gap_s=0.0)
    second = roll_into_day(first, "2026-08-14", "z1", 5.0, estimated=False, gap_s=30.0)

    assert daily == {}
    assert first["2026-08-14"]["z1"]["l"] == 10.0
    assert second["2026-08-14"]["z1"]["l"] == 15.0
    assert second["2026-08-14"]["z1"]["gap_s"] == 30.0


def test_roll_into_day_marks_a_day_estimated_once_any_litre_is() -> None:
    """Mixed provenance is estimated: the number is not wholly measured."""
    daily = roll_into_day({}, "2026-08-14", "z1", 10.0, estimated=False, gap_s=0.0)
    daily = roll_into_day(daily, "2026-08-14", "z1", 5.0, estimated=True, gap_s=0.0)
    assert daily["2026-08-14"]["z1"]["est"] is True


def test_prune_keeps_exactly_the_retention_window() -> None:
    today = date(2026, 8, 14)
    daily = {}
    for offset in (0, 1, RETENTION_DAYS - 1, RETENTION_DAYS, RETENTION_DAYS + 1):
        day = date.fromordinal(today.toordinal() - offset).isoformat()
        daily = roll_into_day(daily, day, "z1", 1.0, estimated=False, gap_s=0.0)

    pruned = prune_daily(daily, today)
    kept = sorted(pruned)
    assert len(kept) == 3  # offsets 0, 1, 729
    assert date.fromisoformat(kept[0]) == date.fromordinal(today.toordinal() - (RETENTION_DAYS - 1))


def test_prune_is_idempotent() -> None:
    today = date(2026, 8, 14)
    daily = roll_into_day({}, "2020-01-01", "z1", 1.0, estimated=False, gap_s=0.0)
    daily = roll_into_day(daily, today.isoformat(), "z1", 1.0, estimated=False, gap_s=0.0)
    once = prune_daily(daily, today)
    assert prune_daily(once, today) == once


def test_sum_period_covers_the_inclusive_range_and_ignores_unattributed() -> None:
    daily: dict = {}
    daily = roll_into_day(daily, "2026-08-01", "z1", 10.0, estimated=False, gap_s=0.0)
    daily = roll_into_day(daily, "2026-08-14", "z1", 20.0, estimated=False, gap_s=0.0)
    daily = roll_into_day(daily, "2026-08-14", "z2", 5.0, estimated=True, gap_s=0.0)
    daily = roll_into_day(daily, "2026-08-15", "z1", 99.0, estimated=False, gap_s=0.0)
    daily.setdefault("2026-08-14", {})[UNATTRIBUTED_KEY] = {"l": 42.0, "closed_l": 42.0}

    assert sum_period(daily, date(2026, 8, 1), date(2026, 8, 14)) == 35.0
