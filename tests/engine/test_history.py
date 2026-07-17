"""Tests for date-keyed daily history: temp maxima, rain counters, staging."""

from datetime import date

from custom_components.irrigation_maestro.engine.history import (
    add_rain,
    commit_staged_rain,
    day_values_for_evaluation,
    prune_history,
    record_temp_max,
)
from custom_components.irrigation_maestro.engine.model import EngineParams

PARAMS = EngineParams()
TODAY = date(2026, 7, 17)


class TestRecordTempMax:
    def test_records_first_value(self):
        assert record_temp_max({}, TODAY, 25.0) == {"2026-07-17": 25.0}

    def test_keeps_maximum(self):
        history = {"2026-07-17": 30.0}
        assert record_temp_max(history, TODAY, 28.0) == {"2026-07-17": 30.0}
        assert record_temp_max(history, TODAY, 31.5) == {"2026-07-17": 31.5}

    def test_does_not_mutate_input(self):
        history = {"2026-07-17": 30.0}
        record_temp_max(history, TODAY, 35.0)
        assert history == {"2026-07-17": 30.0}


class TestRain:
    def test_add_rain_accumulates(self):
        history = add_rain({}, TODAY, 1.2, cap=PARAMS.daily_rain_cap_mm)
        history = add_rain(history, TODAY, 0.8, cap=PARAMS.daily_rain_cap_mm)
        assert history == {"2026-07-17": 2.0}

    def test_add_rain_caps(self):
        history = add_rain({"2026-07-17": 199.5}, TODAY, 5.0, cap=200.0)
        assert history == {"2026-07-17": 200.0}

    def test_negative_rain_ignored(self):
        assert add_rain({}, TODAY, -1.0, cap=200.0) == {"2026-07-17": 0.0}

    def test_commit_staged_rain_applies_weight(self):
        history = commit_staged_rain({"2026-07-17": 1.0}, TODAY, staging_mm=2.0, params=PARAMS)
        assert history == {"2026-07-17": 2.6}  # 1.0 + 2.0*0.8


class TestWindowing:
    HISTORY = {
        "2026-07-13": 9.0,  # too old, pruned
        "2026-07-14": 31.6,
        "2026-07-15": 32.4,
        "2026-07-16": 31.0,
        "2026-07-17": 30.0,
    }

    def test_prune_keeps_window(self):
        pruned = prune_history(self.HISTORY, TODAY, keep_days=4)
        assert "2026-07-13" not in pruned
        assert len(pruned) == 4

    def test_day_values_for_evaluation(self):
        # Rotation-free: (d3, d2, d1, today) read straight off the date keys.
        assert day_values_for_evaluation(self.HISTORY, TODAY) == (31.6, 32.4, 31.0, 30.0)

    def test_missing_days_are_none_not_zero(self):
        history = {"2026-07-17": 30.0}
        assert day_values_for_evaluation(history, TODAY) == (None, None, None, 30.0)

    def test_after_midnight_same_data_reads_shifted(self):
        # What was "today" becomes "yesterday" with no rotation step at all.
        next_day = date(2026, 7, 18)
        d3, d2, d1, today = day_values_for_evaluation(self.HISTORY, next_day)
        assert (d3, d2, d1) == (32.4, 31.0, 30.0)
        assert today is None
