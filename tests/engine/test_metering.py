"""Pure metering arithmetic: accumulation, daily rollup, 730-day retention."""

from datetime import date

from custom_components.irrigation_maestro.engine.metering import (
    RETENTION_DAYS,
    UNATTRIBUTED_KEY,
    accumulate,
    daily_series,
    keys_in_range,
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


def test_roll_into_day_accumulates_closed_l_independently_of_l() -> None:
    """closed_l is the leak-detection input: it must accumulate, not overwrite.

    Both calls contribute a nonzero, distinct closed_l (3.0, then 5.0) so an
    overwrite bug (last-write-wins) and true accumulation would disagree --
    overwrite would leave closed_l at 5.0, not 8.0. l is driven by a
    different pair of values (2.0, then 9.0) so the two fields are shown to
    track apart from one another, not just move in lockstep.
    """
    daily = roll_into_day({}, "2026-08-14", "z1", 2.0, estimated=False, gap_s=0.0, closed_l=3.0)
    daily = roll_into_day(daily, "2026-08-14", "z1", 9.0, estimated=False, gap_s=0.0, closed_l=5.0)

    assert daily["2026-08-14"]["z1"]["l"] == 11.0
    assert daily["2026-08-14"]["z1"]["closed_l"] == 8.0


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


def test_sum_period_excludes_days_before_the_range() -> None:
    """The left edge is a real bound, not decoration.

    The inclusive-range test above only ever exercises the right edge: every
    one of its days is on or after the start, so a sum that dropped the
    `day < first` half of the guard would still pass it. Last month's litres
    must not land in this month's budget.
    """
    daily: dict = {}
    daily = roll_into_day(daily, "2026-07-31", "z1", 100.0, estimated=False, gap_s=0.0)
    daily = roll_into_day(daily, "2026-08-01", "z1", 7.0, estimated=False, gap_s=0.0)

    assert sum_period(daily, date(2026, 8, 1), date(2026, 8, 31)) == 7.0


def test_sum_period_can_be_scoped_to_one_key() -> None:
    """The per-zone reading and the account-wide one, from one function.

    Without the filter a zone's "this month" is the hub's total: two zones at
    10 L and 20 L would both report 30 L, contradicting the per-zone "today"
    printed next to it.
    """
    daily: dict = {}
    daily = roll_into_day(daily, "2026-08-14", "z1", 10.0, estimated=False, gap_s=0.0)
    daily = roll_into_day(daily, "2026-08-14", "z2", 20.0, estimated=False, gap_s=0.0)

    assert sum_period(daily, date(2026, 8, 1), date(2026, 8, 31)) == 30.0
    assert sum_period(daily, date(2026, 8, 1), date(2026, 8, 31), key="z1") == 10.0
    assert sum_period(daily, date(2026, 8, 1), date(2026, 8, 31), key="z2") == 20.0
    assert sum_period(daily, date(2026, 8, 1), date(2026, 8, 31), key="nobody") == 0.0


def test_the_series_is_dense_so_a_quiet_day_and_a_blind_day_are_different_shapes() -> None:
    """The whole reason gap_s exists: a day with a six-hour hole in the meter
    must not look like a day on which nothing was watered."""
    daily = roll_into_day({}, "2026-08-16", "z1", 40.0, estimated=False, gap_s=0.0)
    daily = roll_into_day(daily, "2026-08-18", "z1", 0.0, estimated=False, gap_s=21600.0)

    series = daily_series(daily, "z1", date(2026, 8, 16), date(2026, 8, 18))

    assert series == [
        {"date": "2026-08-16", "l": 40.0, "est": False, "gap_s": 0.0},
        {"date": "2026-08-17", "l": 0.0, "est": False, "gap_s": 0.0},
        {"date": "2026-08-18", "l": 0.0, "est": False, "gap_s": 21600.0},
    ]


def test_a_single_day_range_yields_exactly_one_point() -> None:
    series = daily_series({}, "z1", date(2026, 8, 16), date(2026, 8, 16))

    assert series == [{"date": "2026-08-16", "l": 0.0, "est": False, "gap_s": 0.0}]


def test_the_series_carries_the_estimated_latch_through() -> None:
    daily = roll_into_day({}, "2026-08-16", "z1", 40.0, estimated=True, gap_s=0.0)

    assert daily_series(daily, "z1", date(2026, 8, 16), date(2026, 8, 16))[0]["est"] is True


def test_the_unattributed_series_carries_closed_l_and_no_est() -> None:
    """closed_l is the only figure leak detection reads, and est is meaningless
    for water no zone claimed."""
    daily = roll_into_day(
        {},
        "2026-08-16",
        UNATTRIBUTED_KEY,
        5.0,
        estimated=False,
        gap_s=0.0,
        closed_l=2.0,
    )

    series = daily_series(daily, UNATTRIBUTED_KEY, date(2026, 8, 16), date(2026, 8, 16))

    assert series == [{"date": "2026-08-16", "l": 5.0, "gap_s": 0.0, "closed_l": 2.0}]


def test_the_series_rounds_litres_to_millilitres_and_seconds_to_a_tenth() -> None:
    daily = roll_into_day({}, "2026-08-16", "z1", 1.0 / 3.0, estimated=False, gap_s=1.0 / 3.0)

    point = daily_series(daily, "z1", date(2026, 8, 16), date(2026, 8, 16))[0]

    assert point["l"] == 0.333
    assert point["gap_s"] == 0.3


def test_keys_in_range_reports_every_key_that_booked_anything() -> None:
    daily = roll_into_day({}, "2026-08-16", "z1", 1.0, estimated=False, gap_s=0.0)
    daily = roll_into_day(daily, "2026-08-20", "z2", 1.0, estimated=False, gap_s=0.0)
    daily = roll_into_day(daily, "2026-08-16", UNATTRIBUTED_KEY, 1.0, estimated=False, gap_s=0.0)

    assert keys_in_range(daily, date(2026, 8, 16), date(2026, 8, 17)) == {
        "z1",
        UNATTRIBUTED_KEY,
    }
