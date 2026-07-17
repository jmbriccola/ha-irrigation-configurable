"""Tests for calendar-day cadence, season windows and calendar restrictions."""

from datetime import date, datetime, time

import pytest
from custom_components.irrigation_maestro.engine.model import EngineError
from custom_components.irrigation_maestro.engine.scheduling import (
    CalendarRestrictions,
    Parity,
    TimeWindow,
    day_allowed,
    is_due,
    max_run_minutes,
    next_allowed_start,
    split_soak,
    time_allowed,
)

TZ_NAIVE_NOON = datetime(2026, 7, 17, 12, 0)  # Friday


class TestCadence:
    """Cadence is evaluated per calendar day, not per elapsed hours."""

    def test_never_completed_is_due(self):
        assert is_due(None, date(2026, 7, 17), interval_days=3)

    def test_due_after_exact_interval(self):
        assert is_due(date(2026, 7, 14), date(2026, 7, 17), interval_days=3)

    def test_not_due_before_interval(self):
        assert not is_due(date(2026, 7, 15), date(2026, 7, 17), interval_days=3)

    def test_completed_today_not_due(self):
        assert not is_due(date(2026, 7, 17), date(2026, 7, 17), interval_days=1)

    def test_interval_one_waters_every_day(self):
        assert is_due(date(2026, 7, 16), date(2026, 7, 17), interval_days=1)

    def test_retry_days_after_skip(self):
        # Last completed 5 days ago with N=3: still due (retries until it completes).
        assert is_due(date(2026, 7, 12), date(2026, 7, 17), interval_days=3)


class TestDayAllowed:
    def test_no_restrictions_allows_everything(self):
        assert day_allowed(date(2026, 7, 17), CalendarRestrictions())

    def test_weekday_restriction(self):
        r = CalendarRestrictions(allowed_weekdays=frozenset({0, 2, 4}))  # Mon/Wed/Fri
        assert day_allowed(date(2026, 7, 17), r)  # Friday
        assert not day_allowed(date(2026, 7, 18), r)  # Saturday

    def test_odd_parity(self):
        r = CalendarRestrictions(parity=Parity.ODD)
        assert day_allowed(date(2026, 7, 17), r)
        assert not day_allowed(date(2026, 7, 18), r)

    def test_even_parity(self):
        r = CalendarRestrictions(parity=Parity.EVEN)
        assert not day_allowed(date(2026, 7, 17), r)
        assert day_allowed(date(2026, 7, 18), r)

    def test_combined_weekday_and_parity(self):
        r = CalendarRestrictions(allowed_weekdays=frozenset({4}), parity=Parity.EVEN)
        assert not day_allowed(date(2026, 7, 17), r)  # Friday but odd
        assert not day_allowed(date(2026, 7, 18), r)  # even but Saturday
        assert day_allowed(date(2026, 7, 24), r)  # Friday and even


class TestTimeWindows:
    WINDOWS = (TimeWindow(time(8, 0), time(10, 0)),)

    def test_outside_window_allowed(self):
        assert time_allowed(time(7, 59), self.WINDOWS)
        assert time_allowed(time(10, 0), self.WINDOWS)  # end is exclusive

    def test_inside_window_forbidden(self):
        assert not time_allowed(time(8, 0), self.WINDOWS)  # start is inclusive
        assert not time_allowed(time(9, 30), self.WINDOWS)

    def test_wrapping_window(self):
        windows = (TimeWindow(time(22, 0), time(6, 0)),)
        assert not time_allowed(time(23, 0), windows)
        assert not time_allowed(time(2, 0), windows)
        assert time_allowed(time(6, 0), windows)
        assert time_allowed(time(12, 0), windows)


class TestNextAllowedStart:
    def test_already_allowed_returns_input(self):
        r = CalendarRestrictions()
        assert next_allowed_start(TZ_NAIVE_NOON, r) == TZ_NAIVE_NOON

    def test_inside_forbidden_window_slides_to_end(self):
        r = CalendarRestrictions(forbidden_windows=(TimeWindow(time(11, 0), time(14, 0)),))
        assert next_allowed_start(TZ_NAIVE_NOON, r) == datetime(2026, 7, 17, 14, 0)

    def test_disallowed_day_slides_to_next_allowed_day(self):
        r = CalendarRestrictions(allowed_weekdays=frozenset({0}))  # Monday only
        assert next_allowed_start(TZ_NAIVE_NOON, r) == datetime(2026, 7, 20, 0, 0)

    def test_slide_across_day_then_window(self):
        # Monday only, and mornings forbidden until 06:00.
        r = CalendarRestrictions(
            allowed_weekdays=frozenset({0}),
            forbidden_windows=(TimeWindow(time(0, 0), time(6, 0)),),
        )
        assert next_allowed_start(TZ_NAIVE_NOON, r) == datetime(2026, 7, 20, 6, 0)

    def test_wrapping_window_crossing_midnight_into_allowed_day(self):
        r = CalendarRestrictions(forbidden_windows=(TimeWindow(time(22, 0), time(6, 0)),))
        start = datetime(2026, 7, 17, 23, 0)
        assert next_allowed_start(start, r) == datetime(2026, 7, 18, 6, 0)

    def test_nothing_allowed_raises(self):
        r = CalendarRestrictions(allowed_weekdays=frozenset())
        with pytest.raises(EngineError):
            next_allowed_start(TZ_NAIVE_NOON, r)


class TestMaxRunMinutes:
    def test_no_windows_full_duration(self):
        r = CalendarRestrictions()
        assert max_run_minutes(TZ_NAIVE_NOON, r, requested_min=30) == 30

    def test_truncated_before_window(self):
        # A cycle in progress must not overrun into the forbidden window.
        r = CalendarRestrictions(forbidden_windows=(TimeWindow(time(12, 20), time(14, 0)),))
        assert max_run_minutes(TZ_NAIVE_NOON, r, requested_min=30) == 20

    def test_zero_when_start_inside_window(self):
        r = CalendarRestrictions(forbidden_windows=(TimeWindow(time(11, 0), time(14, 0)),))
        assert max_run_minutes(TZ_NAIVE_NOON, r, requested_min=30) == 0

    def test_window_next_day_does_not_truncate_short_run(self):
        r = CalendarRestrictions(forbidden_windows=(TimeWindow(time(8, 0), time(10, 0)),))
        assert max_run_minutes(TZ_NAIVE_NOON, r, requested_min=45) == 45


class TestSplitSoak:
    def test_short_run_is_single(self):
        assert split_soak(8, max_run_min=10) == (8,)

    def test_exact_multiple(self):
        assert split_soak(30, max_run_min=10) == (10, 10, 10)

    def test_remainder_run(self):
        assert split_soak(32, max_run_min=10) == (10, 10, 10, 2)

    def test_no_soak_returns_single(self):
        assert split_soak(32, max_run_min=None) == (32,)

    def test_zero_duration(self):
        assert split_soak(0, max_run_min=10) == ()
