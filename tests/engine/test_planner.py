"""Tests for the session planner: gates, ordering, frozen durations, aggregation."""

from datetime import date, datetime, timedelta

from custom_components.irrigation_maestro.engine.calendar import ProgramCalendar
from custom_components.irrigation_maestro.engine.curves import (
    PRESET_LAWN,
    PRESET_POTS,
    Curve,
    CurveKind,
)
from custom_components.irrigation_maestro.engine.model import (
    EngineParams,
    SessionEvaluation,
    SkipReason,
)
from custom_components.irrigation_maestro.engine.planner import (
    CycleSpec,
    ZoneSpec,
    build_session_plan,
    resolve_day_curve,
)

PARAMS = EngineParams()
NOW = datetime(2026, 7, 17, 5, 30)  # Friday, July -> in season, odd day
TODAY = NOW.date()

WATER_EVAL = SessionEvaluation(
    weighted_temp=31.0,
    forecast_credit=0.09,
    water_budget=3.79,
    skip_threshold=4.5,
    skip_reason=None,
)
BUDGET_SKIP_EVAL = SessionEvaluation(
    weighted_temp=31.0,
    forecast_credit=2.0,
    water_budget=6.0,
    skip_threshold=4.5,
    skip_reason=SkipReason.BUDGET_SUFFICIENT,
)


def make_cycle(cycle_id="c1", **overrides):
    defaults = dict(
        cycle_id=cycle_id,
        enabled=True,
        curve=PRESET_POTS,
        calendar=ProgramCalendar.daily(),
        season_months=None,
        last_completed=None,
        soak_max_run_min=None,
        soak_pause_min=0,
        volume_safety_timeout_min=None,
    )
    defaults.update(overrides)
    return CycleSpec(**defaults)


def make_zone(zone_id="z1", name="Pots", **overrides):
    defaults = dict(
        zone_id=zone_id,
        name=name,
        enabled=True,
        order=100,
        adjustment_pct=100.0,
        suspended_until=None,
        paused_until=None,
        skip_today=False,
        has_flow_meter=False,
        cycles=(make_cycle(),),
    )
    defaults.update(overrides)
    return ZoneSpec(**defaults)


def plan(zones, evaluation=WATER_EVAL, now=NOW, factor=1.0):
    return build_session_plan(
        PARAMS,
        evaluation,
        zones,
        now=now,
        duration_factor=factor,
    )


_DAY_CURVE = Curve(points=((12.0, 0.0), (25.0, 10.0), (35.0, 20.0)), min_value=0.0, max_value=60.0)


class TestPerDayDuration:
    def test_day_minutes_override_rebuilds_curve(self):
        # Friday base 20' at 25C, heat of the curve = 20-10 = 10.
        # points_from_semantic(20, 10) -> (12,7),(25,20),(35,30); at 31C -> 26.
        cycle = make_cycle(curve=_DAY_CURVE, day_minutes={4: 20})
        result = plan([make_zone(cycles=(cycle,))])
        assert result.runs[0].duration_min == 26

    def test_missing_weekday_falls_back_to_curve(self):
        # No Friday entry -> legacy path: curve at 31C -> 16.
        cycle = make_cycle(curve=_DAY_CURVE, day_minutes={0: 20})
        result = plan([make_zone(cycles=(cycle,))])
        assert result.runs[0].duration_min == 16

    def test_volume_ignores_day_minutes(self):
        vol_curve = Curve(
            points=((12.0, 0.0), (25.0, 10.0), (35.0, 20.0)),
            min_value=0.0,
            max_value=60.0,
            kind=CurveKind.VOLUME,
        )
        # day_minutes never converts liters to duration; resolver returns unchanged.
        assert resolve_day_curve(vol_curve, {4: 20}, 4) is vol_curve

    def test_resolve_day_curve_is_identity_without_day_minutes(self):
        assert resolve_day_curve(_DAY_CURVE, {}, 4) is _DAY_CURVE


class TestDurations:
    def test_duration_frozen_from_weighted_temp(self):
        result = plan([make_zone()])
        assert len(result.runs) == 1
        assert result.runs[0].duration_min == 32  # §8 pots value

    def test_adjustment_factor_applied(self):
        result = plan([make_zone(adjustment_pct=70.0)])
        # 70% of interpolated 32.02 = 22.4 -> within clamps -> 22
        assert result.runs[0].duration_min == 22

    def test_global_duration_factor_applied_after_clamps(self):
        result = plan([make_zone()], factor=0.5)
        assert result.runs[0].duration_min == 16

    def test_duration_factor_never_rounds_to_zero(self):
        result = plan([make_zone()], factor=0.001)
        assert result.runs[0].duration_min == 1

    def test_soak_split(self):
        zone = make_zone(cycles=(make_cycle(soak_max_run_min=10, soak_pause_min=15),))
        result = plan([zone])
        assert result.runs[0].runs == (10, 10, 10, 2)
        assert result.runs[0].soak_pause_min == 15

    def test_volume_mode(self):
        curve = Curve(
            points=((10.0, 20.0), (35.0, 80.0)),
            min_value=10.0,
            max_value=100.0,
            kind=CurveKind.VOLUME,
        )
        zone = make_zone(
            has_flow_meter=True,
            cycles=(make_cycle(curve=curve, volume_safety_timeout_min=45),),
        )
        result = plan([zone])
        run = result.runs[0]
        # 20 + 60*(31-10)/25 = 70.4 -> 70 L
        assert run.volume_l == 70
        assert run.safety_timeout_min == 45

    def test_volume_cycle_without_meter_degrades_to_safety_timeout_duration(self):
        curve = Curve(
            points=((10.0, 20.0), (35.0, 80.0)),
            min_value=10.0,
            max_value=100.0,
            kind=CurveKind.VOLUME,
        )
        zone = make_zone(
            has_flow_meter=False,
            cycles=(make_cycle(curve=curve, volume_safety_timeout_min=45),),
        )
        result = plan([zone])
        run = result.runs[0]
        assert run.volume_l is None
        assert run.duration_min == 45


class TestOrdering:
    def test_runs_sorted_by_order_then_name(self):
        zones = [
            make_zone(zone_id="zc", name="Cherry", order=200),
            make_zone(zone_id="za", name="Basil", order=100),
            make_zone(zone_id="zb", name="apple", order=200),
        ]
        result = plan(zones)
        assert [run.zone_id for run in result.runs] == ["za", "zb", "zc"]


class TestGates:
    def gate_reason(self, zone, evaluation=WATER_EVAL, now=NOW):
        result = plan([zone], evaluation=evaluation, now=now)
        assert not result.runs
        assert len(result.skipped) == 1
        return result.skipped[0].reason

    def test_zone_disabled(self):
        assert self.gate_reason(make_zone(enabled=False)) is SkipReason.ZONE_DISABLED

    def test_cycle_disabled(self):
        zone = make_zone(cycles=(make_cycle(enabled=False),))
        assert self.gate_reason(zone) is SkipReason.CYCLE_DISABLED

    def test_suspended_until_future(self):
        zone = make_zone(suspended_until=datetime(2026, 8, 1))
        assert self.gate_reason(zone) is SkipReason.SUSPENDED

    def test_suspension_expired_runs(self):
        zone = make_zone(suspended_until=datetime(2026, 7, 17, 5, 0))
        assert plan([zone]).runs

    def test_paused(self):
        zone = make_zone(paused_until=datetime(2026, 7, 17, 9, 0))
        assert self.gate_reason(zone) is SkipReason.PAUSED

    def test_skip_today(self):
        zone = make_zone(skip_today=True)
        assert self.gate_reason(zone) is SkipReason.SKIP_TODAY_REQUESTED

    def test_session_skip_applies_to_eligible_zones(self):
        assert self.gate_reason(make_zone(), evaluation=BUDGET_SKIP_EVAL) is (
            SkipReason.BUDGET_SUFFICIENT
        )

    def test_zone_gate_wins_over_session_skip_for_reporting(self):
        zone = make_zone(enabled=False)
        assert self.gate_reason(zone, evaluation=BUDGET_SKIP_EVAL) is (SkipReason.ZONE_DISABLED)

    def test_no_weighted_temp_skips_as_weather_unavailable(self):
        evaluation = SessionEvaluation(
            weighted_temp=None,
            forecast_credit=0.0,
            water_budget=0.0,
            skip_threshold=3.0,
            skip_reason=None,
        )
        assert self.gate_reason(make_zone(), evaluation=evaluation) is (
            SkipReason.WEATHER_UNAVAILABLE
        )


class TestCalendarGate:
    """The program calendar is the only thing that decides watering days."""

    def test_weekday_program_runs_on_its_day(self):
        cycle = make_cycle(calendar=ProgramCalendar.weekdays({4}))  # Friday
        assert plan([make_zone(cycles=(cycle,))]).runs

    def test_weekday_program_skips_other_days(self):
        cycle = make_cycle(calendar=ProgramCalendar.weekdays({0, 1}))
        result = plan([make_zone(cycles=(cycle,))])
        assert not result.runs
        assert result.skipped[0].reason is SkipReason.CALENDAR_NOT_TODAY

    def test_daily_program_always_runs(self):
        assert plan([make_zone()]).runs

    def test_interval_program_gates_following_days(self):
        cycle = make_cycle(calendar=ProgramCalendar.interval(3), last_completed=TODAY)
        for offset in (1, 2):
            result = plan([make_zone(cycles=(cycle,))], now=NOW + timedelta(days=offset))
            assert not result.runs
            assert result.skipped[0].reason is SkipReason.CALENDAR_NOT_TODAY
        assert plan([make_zone(cycles=(cycle,))], now=NOW + timedelta(days=3)).runs

    def test_interval_program_retries_the_day_after_a_skip(self):
        # Nothing completed yesterday, so the marker stays put and the program
        # is due again today.
        cycle = make_cycle(calendar=ProgramCalendar.interval(1), last_completed=date(2026, 7, 16))
        assert plan([make_zone(cycles=(cycle,))]).runs

    def test_two_programs_keep_independent_cadences(self):
        # The 1.3.3 defect must not reappear one level down: the morning
        # program completing today must not consume the evening program's
        # cadence.
        morning = make_cycle("morning", calendar=ProgramCalendar.interval(3), last_completed=TODAY)
        evening = make_cycle("evening", calendar=ProgramCalendar.interval(3), last_completed=None)
        result = plan([make_zone(cycles=(morning, evening))])
        assert [run.cycle_id for run in result.runs] == ["morning", "evening"]

    def test_completed_today_keeps_running_the_rest_of_the_day(self):
        cycle = make_cycle(calendar=ProgramCalendar.interval(3), last_completed=TODAY)
        assert plan([make_zone(cycles=(cycle,))]).runs

    def test_parity_program_runs_on_a_matching_day(self):
        # NOW is 2026-07-17, an odd day.
        assert plan([make_zone(cycles=(make_cycle(calendar=ProgramCalendar.odd()),))]).runs

    def test_parity_program_skips_a_mismatching_day(self):
        result = plan([make_zone(cycles=(make_cycle(calendar=ProgramCalendar.even()),))])
        assert not result.runs
        assert result.skipped[0].reason is SkipReason.CALENDAR_NOT_TODAY

    def test_zone_gates_still_win_for_reporting(self):
        zone = make_zone(
            enabled=False,
            cycles=(
                make_cycle(
                    calendar=ProgramCalendar.weekdays({0}),
                ),
            ),
        )
        assert plan([zone]).skipped[0].reason is SkipReason.ZONE_DISABLED

    def test_calendar_not_today_is_silent(self):
        assert SkipReason.CALENDAR_NOT_TODAY.silent is True


class TestSeason:
    """Season is a program property, with the hub value as the default."""

    def test_program_season_excludes_the_month(self):
        zone = make_zone(cycles=(make_cycle(season_months=frozenset({6})),))
        result = plan([zone])
        assert not result.runs
        assert result.skipped[0].reason is SkipReason.OUT_OF_SEASON

    def test_program_season_includes_the_month(self):
        zone = make_zone(cycles=(make_cycle(season_months=frozenset({7})),))
        assert plan([zone]).runs

    def test_two_programs_hold_different_seasons(self):
        # §1: in the shoulder seasons only the evening program is turned off.
        summer = make_cycle("summer", season_months=frozenset({7}))
        winter = make_cycle("winter", season_months=frozenset({1}))
        result = plan([make_zone(cycles=(summer, winter))])
        assert [run.cycle_id for run in result.runs] == ["summer"]
        assert [item.cycle_id for item in result.skipped] == ["winter"]
        assert result.skipped[0].reason is SkipReason.OUT_OF_SEASON

    def test_hub_default_applies_without_an_override(self):
        assert plan([make_zone()]).runs  # July is in the default season


class TestSkipReasonConsolidation:
    """Three reasons meant the same thing to a user: not a watering day."""

    def test_calendar_not_today_exists_and_is_silent(self):
        assert SkipReason.CALENDAR_NOT_TODAY.silent is True

    def test_superseded_reasons_are_gone(self):
        for name in ("NOT_DUE", "DAY_NOT_SCHEDULED", "CALENDAR_RESTRICTED"):
            assert not hasattr(SkipReason, name), f"{name} should be replaced"


class TestAggregation:
    def test_shared_reason_groups_zones(self):
        zones = [
            make_zone(zone_id="z1", name="Pots"),
            make_zone(zone_id="z2", name="Lawn", cycles=(make_cycle(curve=PRESET_LAWN),)),
            make_zone(zone_id="z3", name="Hedge", enabled=False),
        ]
        result = plan(zones, evaluation=BUDGET_SKIP_EVAL)
        groups = result.aggregate_skips()
        assert groups[SkipReason.BUDGET_SUFFICIENT] == ["Pots", "Lawn"]
        assert groups[SkipReason.ZONE_DISABLED] == ["Hedge"]

    def test_multiple_cycles_of_zone_counted_once_in_aggregation(self):
        zone = make_zone(cycles=(make_cycle("c1"), make_cycle("c2")))
        result = plan([zone], evaluation=BUDGET_SKIP_EVAL)
        assert result.aggregate_skips()[SkipReason.BUDGET_SUFFICIENT] == ["Pots"]
        assert len(result.skipped) == 2  # but every cycle still records its outcome
