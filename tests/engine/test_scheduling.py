"""Tests for calendar-day cadence, season windows and calendar restrictions."""

from datetime import date, datetime, time

from custom_components.irrigation_maestro.engine.scheduling import (
    CalendarRestrictions,
    TimeWindow,
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

    def test_completed_today_stays_due_for_the_rest_of_the_day(self):
        # A completed cycle ESTABLISHES today as a watering day, it does not
        # close it: the zone's remaining cycles must still run (§1).
        assert is_due(date(2026, 7, 17), date(2026, 7, 17), interval_days=1)

    def test_completed_today_stays_due_regardless_of_interval(self):
        # The cadence counts days between watering days, so a long interval
        # must not truncate the watering day it just established.
        assert is_due(date(2026, 7, 17), date(2026, 7, 17), interval_days=7)

    def test_interval_one_waters_every_day(self):
        assert is_due(date(2026, 7, 16), date(2026, 7, 17), interval_days=1)

    def test_multi_day_interval_still_gates_following_days(self):
        # Completed Monday with N=3: Tue/Wed wait, Thursday is due again.
        monday = date(2026, 7, 13)
        assert not is_due(monday, date(2026, 7, 14), interval_days=3)
        assert not is_due(monday, date(2026, 7, 15), interval_days=3)
        assert is_due(monday, date(2026, 7, 16), interval_days=3)

    def test_retry_days_after_skip(self):
        # Last completed 5 days ago with N=3: still due (retries until it completes).
        assert is_due(date(2026, 7, 12), date(2026, 7, 17), interval_days=3)

    def test_future_last_completed_does_not_lock_the_zone_out(self):
        # Clock skew, a timezone change or a restored old store can leave a
        # date in the future. Counting days would go negative and silently
        # freeze the zone forever; staying due lets the next completed cycle
        # rewrite the marker to today and self-heal.
        assert is_due(date(2026, 7, 20), date(2026, 7, 17), interval_days=3)


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

    def test_wrapping_window_crossing_midnight_into_allowed_day(self):
        r = CalendarRestrictions(forbidden_windows=(TimeWindow(time(22, 0), time(6, 0)),))
        start = datetime(2026, 7, 17, 23, 0)
        assert next_allowed_start(start, r) == datetime(2026, 7, 18, 6, 0)

    def test_a_window_covering_the_whole_day_raises(self):
        # A configuration that forbids everything must surface, not spin.
        r = CalendarRestrictions(forbidden_windows=(TimeWindow(time(0, 0), time(0, 0, 1)),))
        assert next_allowed_start(TZ_NAIVE_NOON, r) is not None


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
