"""Tests for the program calendar: one mode, mutually exclusive."""

from datetime import date

import pytest
from custom_components.irrigation_maestro.engine.calendar import (
    CalendarMode,
    ProgramCalendar,
    calendar_allows,
)
from custom_components.irrigation_maestro.engine.model import EngineError
from custom_components.irrigation_maestro.engine.scheduling import Parity

MON = date(2026, 7, 13)
TUE = date(2026, 7, 14)
WED = date(2026, 7, 15)


class TestWeekdays:
    def test_allows_listed_day(self):
        cal = ProgramCalendar.weekdays({0, 2, 4})
        assert calendar_allows(cal, MON, None)

    def test_blocks_unlisted_day(self):
        cal = ProgramCalendar.weekdays({0, 2, 4})
        assert not calendar_allows(cal, TUE, None)

    def test_daily_allows_everything(self):
        cal = ProgramCalendar.daily()
        assert all(calendar_allows(cal, day, None) for day in (MON, TUE, WED))

    def test_last_completed_is_irrelevant(self):
        # A weekday program runs on its days regardless of when it last ran.
        cal = ProgramCalendar.weekdays({0})
        assert calendar_allows(cal, MON, MON)

    def test_empty_days_rejected(self):
        # A calendar that can never run must not be constructible.
        with pytest.raises(EngineError):
            ProgramCalendar.weekdays(set())

    def test_out_of_range_days_rejected(self):
        with pytest.raises(EngineError):
            ProgramCalendar.weekdays({0, 9})


class TestInterval:
    def test_never_run_is_allowed(self):
        assert calendar_allows(ProgramCalendar.interval(3), MON, None)

    def test_blocks_before_interval(self):
        assert not calendar_allows(ProgramCalendar.interval(3), TUE, MON)

    def test_allows_on_interval(self):
        assert calendar_allows(ProgramCalendar.interval(3), date(2026, 7, 16), MON)

    def test_same_day_stays_allowed(self):
        # A completed run establishes the day; it does not close it (v1.3.3).
        assert calendar_allows(ProgramCalendar.interval(3), MON, MON)

    def test_future_marker_does_not_lock_out(self):
        assert calendar_allows(ProgramCalendar.interval(3), MON, WED)

    def test_interval_below_one_rejected(self):
        with pytest.raises(EngineError):
            ProgramCalendar.interval(0)


class TestParity:
    def test_odd_allows_odd_day(self):
        assert calendar_allows(ProgramCalendar.odd(), date(2026, 7, 17), None)

    def test_odd_blocks_even_day(self):
        assert not calendar_allows(ProgramCalendar.odd(), date(2026, 7, 18), None)

    def test_even_allows_even_day(self):
        assert calendar_allows(ProgramCalendar.even(), date(2026, 7, 18), None)

    def test_even_blocks_odd_day(self):
        assert not calendar_allows(ProgramCalendar.even(), date(2026, 7, 17), None)


class TestSerialisation:
    @pytest.mark.parametrize(
        "cal",
        [
            ProgramCalendar.weekdays({0, 2, 4}),
            ProgramCalendar.interval(3),
            ProgramCalendar.odd(),
            ProgramCalendar.even(),
            ProgramCalendar.daily(),
        ],
    )
    def test_round_trip(self, cal):
        assert ProgramCalendar.from_config(cal.to_config()) == cal

    def test_stored_shape_is_a_discriminated_union(self):
        assert ProgramCalendar.weekdays({0, 2}).to_config() == {
            "mode": "weekdays",
            "days": [0, 2],
        }
        assert ProgramCalendar.interval(3).to_config() == {
            "mode": "interval",
            "interval_days": 3,
        }
        assert ProgramCalendar.odd().to_config() == {"mode": "parity", "parity": "odd"}

    def test_unknown_mode_rejected(self):
        with pytest.raises(EngineError):
            ProgramCalendar.from_config({"mode": "whenever"})

    def test_missing_mode_rejected(self):
        with pytest.raises(EngineError):
            ProgramCalendar.from_config({})

    def test_unknown_parity_rejected(self):
        with pytest.raises(EngineError):
            ProgramCalendar.from_config({"mode": "parity", "parity": "sometimes"})

    def test_foreign_keys_cannot_smuggle_a_second_mode(self):
        # An import or a hand-edited store must not produce a hybrid.
        cal = ProgramCalendar.from_config(
            {"mode": "weekdays", "days": [0], "interval_days": 3, "parity": "odd"}
        )
        assert cal.mode is CalendarMode.WEEKDAYS
        assert cal.to_config() == {"mode": "weekdays", "days": [0]}

    def test_parity_round_trip_keeps_the_enum(self):
        cal = ProgramCalendar.from_config({"mode": "parity", "parity": "even"})
        assert cal.parity is Parity.EVEN
