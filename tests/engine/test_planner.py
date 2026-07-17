"""Tests for the session planner: gates, ordering, frozen durations, aggregation."""

from datetime import date, datetime

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
)
from custom_components.irrigation_maestro.engine.scheduling import (
    CalendarRestrictions,
)

PARAMS = EngineParams()
NOW = datetime(2026, 7, 17, 5, 30)  # Friday, July -> in season
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
        soak_max_run_min=None,
        soak_pause_min=0,
        months_override=None,
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
        interval_days=1,
        season_months=None,
        restrictions=None,
        last_completed=None,
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
        global_restrictions=CalendarRestrictions(),
        now=now,
        duration_factor=factor,
    )


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

    def test_out_of_season_zone_override(self):
        zone = make_zone(season_months=frozenset({6}))
        assert self.gate_reason(zone) is SkipReason.OUT_OF_SEASON

    def test_cycle_months_override_wins_over_zone(self):
        zone = make_zone(
            season_months=frozenset({6}),
            cycles=(make_cycle(months_override=frozenset({7})),),
        )
        assert plan([zone]).runs

    def test_calendar_restricted_day(self):
        zone = make_zone(restrictions=CalendarRestrictions(allowed_weekdays=frozenset({0})))
        assert self.gate_reason(zone) is SkipReason.CALENDAR_RESTRICTED

    def test_global_restrictions_apply_when_zone_has_none(self):
        result = build_session_plan(
            PARAMS,
            WATER_EVAL,
            [make_zone()],
            global_restrictions=CalendarRestrictions(allowed_weekdays=frozenset({0})),
            now=NOW,
        )
        assert result.skipped[0].reason is SkipReason.CALENDAR_RESTRICTED

    def test_zone_restrictions_override_global(self):
        result = build_session_plan(
            PARAMS,
            WATER_EVAL,
            [make_zone(restrictions=CalendarRestrictions())],
            global_restrictions=CalendarRestrictions(allowed_weekdays=frozenset({0})),
            now=NOW,
        )
        assert result.runs

    def test_not_due(self):
        zone = make_zone(interval_days=3, last_completed=date(2026, 7, 16))
        assert self.gate_reason(zone) is SkipReason.NOT_DUE

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
