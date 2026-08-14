"""Migration v1 -> v2: the schedule model rewrite.

The contract is behavioural, not structural: a migrated configuration must
water on the same calendar days as before, or raise a note saying it could not.
"""

from copy import deepcopy
from datetime import date, timedelta
from typing import Any

import pytest
from custom_components.irrigation_maestro.migration import (
    migrate_zone_v1_to_v2,
    migrate_zone_v2_to_v3,
)

TODAY = date(2026, 7, 13)  # Monday


def zone_v1(*, interval_days=3, days=None, season=None, programs=1):
    cycles = []
    for index in range(programs):
        cycle = {
            "id": f"c{index}",
            "name": f"P{index}",
            "trigger": {"kind": "time", "at": "05:30"},
        }
        if days is not None:
            cycle["days"] = sorted(days)
        cycles.append(cycle)
    zone = {
        "name": "Pots",
        "valve_entity": "valve.p",
        "interval_days": interval_days,
        "cycles": cycles,
    }
    if season is not None:
        zone["season_months"] = sorted(season)
    return zone


def calendars(migrated):
    return [cycle["calendar"] for cycle in migrated["cycles"]]


class TestCalendarChoice:
    def test_grid_wins_over_cadence_and_notes_it(self):
        migrated, notes = migrate_zone_v1_to_v2(zone_v1(interval_days=3, days={0, 2, 4}), None)
        assert calendars(migrated) == [{"mode": "weekdays", "days": [0, 2, 4]}]
        assert [note.kind for note in notes] == ["cadence_dropped"]

    def test_grid_with_daily_cadence_is_not_a_conflict(self):
        migrated, notes = migrate_zone_v1_to_v2(zone_v1(interval_days=1, days={0, 2}), None)
        assert calendars(migrated) == [{"mode": "weekdays", "days": [0, 2]}]
        assert notes == []

    def test_cadence_without_grid_becomes_interval(self):
        migrated, notes = migrate_zone_v1_to_v2(zone_v1(interval_days=3), None)
        assert calendars(migrated) == [{"mode": "interval", "interval_days": 3}]
        assert notes == []

    def test_no_grid_no_cadence_becomes_daily(self):
        migrated, notes = migrate_zone_v1_to_v2(zone_v1(interval_days=1), None)
        assert calendars(migrated) == [{"mode": "weekdays", "days": [0, 1, 2, 3, 4, 5, 6]}]
        assert notes == []

    def test_all_seven_days_is_not_a_meaningful_grid(self):
        migrated, _notes = migrate_zone_v1_to_v2(zone_v1(interval_days=3, days=set(range(7))), None)
        assert calendars(migrated) == [{"mode": "interval", "interval_days": 3}]

    def test_every_program_of_the_zone_is_migrated(self):
        migrated, _notes = migrate_zone_v1_to_v2(zone_v1(interval_days=3, programs=3), None)
        assert len(calendars(migrated)) == 3


class TestHubWeekdays:
    def test_allowed_weekdays_are_intersected_not_dropped(self):
        # Hub allows Mon/Wed/Fri; a daily program must not become daily.
        migrated, notes = migrate_zone_v1_to_v2(
            zone_v1(interval_days=1), {"allowed_weekdays": [0, 2, 4]}
        )
        assert calendars(migrated) == [{"mode": "weekdays", "days": [0, 2, 4]}]
        assert notes == []

    def test_intersection_narrows_an_existing_grid(self):
        migrated, _notes = migrate_zone_v1_to_v2(
            zone_v1(interval_days=1, days={0, 1, 2}), {"allowed_weekdays": [0, 2, 4]}
        )
        assert calendars(migrated) == [{"mode": "weekdays", "days": [0, 2]}]

    def test_empty_intersection_disables_the_program(self):
        migrated, notes = migrate_zone_v1_to_v2(
            zone_v1(interval_days=1, days={1, 3}), {"allowed_weekdays": [0, 2, 4]}
        )
        assert migrated["cycles"][0]["enabled"] is False
        assert [note.kind for note in notes] == ["program_disabled"]

    def test_interval_keeps_its_cadence_and_notes_the_dropped_limit(self):
        # "every 3 days but only Mon/Wed/Fri" is inexpressible; keep the water
        # volume, hand the legal decision to the user.
        migrated, notes = migrate_zone_v1_to_v2(
            zone_v1(interval_days=3), {"allowed_weekdays": [0, 2, 4]}
        )
        assert calendars(migrated) == [{"mode": "interval", "interval_days": 3}]
        assert [note.kind for note in notes] == ["weekdays_dropped"]


class TestHubParity:
    def test_parity_becomes_the_mode_when_no_grid(self):
        migrated, notes = migrate_zone_v1_to_v2(zone_v1(interval_days=1), {"parity": "odd"})
        assert calendars(migrated) == [{"mode": "parity", "parity": "odd"}]
        assert notes == []

    def test_parity_with_a_grid_keeps_the_grid_and_notes_it(self):
        migrated, notes = migrate_zone_v1_to_v2(
            zone_v1(interval_days=1, days={0, 2}), {"parity": "odd"}
        )
        assert calendars(migrated) == [{"mode": "weekdays", "days": [0, 2]}]
        assert [note.kind for note in notes] == ["parity_dropped"]

    def test_parity_with_a_cadence_keeps_the_cadence_and_notes_it(self):
        migrated, notes = migrate_zone_v1_to_v2(zone_v1(interval_days=3), {"parity": "even"})
        assert calendars(migrated) == [{"mode": "interval", "interval_days": 3}]
        assert [note.kind for note in notes] == ["parity_dropped"]


class TestSeason:
    def test_zone_season_pushes_down_to_programs(self):
        migrated, _notes = migrate_zone_v1_to_v2(zone_v1(season={6, 7, 8}), None)
        assert migrated["cycles"][0]["season_months"] == [6, 7, 8]
        assert "season_months" not in migrated

    def test_existing_override_wins_over_the_zone_value(self):
        zone = zone_v1(season={6, 7, 8})
        zone["cycles"][0]["months_override"] = [7]
        migrated, _notes = migrate_zone_v1_to_v2(zone, None)
        assert migrated["cycles"][0]["season_months"] == [7]
        assert "months_override" not in migrated["cycles"][0]

    def test_no_season_anywhere_leaves_the_program_inheriting_the_hub(self):
        migrated, _notes = migrate_zone_v1_to_v2(zone_v1(), None)
        assert "season_months" not in migrated["cycles"][0]


class TestRemovedZoneFields:
    def test_calendar_fields_are_gone(self):
        migrated, _notes = migrate_zone_v1_to_v2(zone_v1(season={7}), None)
        for key in ("interval_days", "season_months", "restrictions"):
            assert key not in migrated

    def test_legacy_days_key_is_gone_from_programs(self):
        migrated, _notes = migrate_zone_v1_to_v2(zone_v1(days={0, 2}), None)
        assert "days" not in migrated["cycles"][0]

    def test_zone_restrictions_override_is_reported(self):
        zone = zone_v1()
        zone["restrictions"] = {"allowed_weekdays": [1]}
        _migrated, notes = migrate_zone_v1_to_v2(zone, None)
        assert "zone_restrictions_dropped" in [note.kind for note in notes]

    def test_unrelated_zone_fields_survive(self):
        zone = zone_v1()
        zone["area_m2"] = 12.5
        zone["compatibility_group"] = "g1"
        migrated, _notes = migrate_zone_v1_to_v2(zone, None)
        assert migrated["area_m2"] == 12.5
        assert migrated["compatibility_group"] == "g1"


class TestBehaviourPreservation:
    """The real contract: which days water, before and after."""

    def watering_days_v1(self, zone, hub, start, count):
        """Replay the OLD rules: grid AND cadence AND hub weekdays AND parity."""
        from custom_components.irrigation_maestro.engine.scheduling import is_due

        grid = zone["cycles"][0].get("days")
        allowed = (hub or {}).get("allowed_weekdays")
        parity = (hub or {}).get("parity")
        last, days = None, []
        for offset in range(count):
            day = start + timedelta(days=offset)
            if grid is not None and day.weekday() not in grid:
                continue
            if allowed is not None and day.weekday() not in allowed:
                continue
            if parity == "odd" and day.day % 2 == 0:
                continue
            if parity == "even" and day.day % 2 == 1:
                continue
            if not is_due(last, day, zone["interval_days"]):
                continue
            days.append(day)
            last = day
        return days

    def watering_days_v2(self, migrated, start, count):
        from custom_components.irrigation_maestro.engine.calendar import (
            ProgramCalendar,
            calendar_allows,
        )

        cycle = migrated["cycles"][0]
        if cycle.get("enabled") is False:
            return []
        calendar = ProgramCalendar.from_config(cycle["calendar"])
        last, days = None, []
        for offset in range(count):
            day = start + timedelta(days=offset)
            if not calendar_allows(calendar, day, last):
                continue
            days.append(day)
            last = day
        return days

    @pytest.mark.parametrize(
        "zone,hub",
        [
            (zone_v1(interval_days=1), None),
            (zone_v1(interval_days=3), None),
            (zone_v1(interval_days=7), None),
            (zone_v1(interval_days=1, days={0, 2, 4}), None),
            (zone_v1(interval_days=1, days={5, 6}), None),
            (zone_v1(interval_days=1), {"allowed_weekdays": [0, 2, 4]}),
            (zone_v1(interval_days=1, days={0, 1, 2}), {"allowed_weekdays": [0, 2, 4]}),
            (zone_v1(interval_days=1), {"parity": "odd"}),
            (zone_v1(interval_days=1), {"parity": "even"}),
        ],
    )
    def test_watering_days_are_unchanged_over_60_days(self, zone, hub):
        migrated, notes = migrate_zone_v1_to_v2(zone, hub)
        assert notes == [], "this combination is expected to migrate cleanly"
        assert self.watering_days_v2(migrated, TODAY, 60) == self.watering_days_v1(
            zone, hub, TODAY, 60
        )

    def test_the_reported_defect_is_what_changes(self):
        # Mon/Wed/Fri with the default cadence of 3 dropped Wednesday every
        # week. After migration the user gets the days they picked.
        zone = zone_v1(interval_days=3, days={0, 2, 4})
        migrated, notes = migrate_zone_v1_to_v2(zone, None)
        before = self.watering_days_v1(zone, None, TODAY, 14)
        after = self.watering_days_v2(migrated, TODAY, 14)
        assert [day.weekday() for day in before] == [0, 4, 0, 4]  # Wednesday missing
        assert [day.weekday() for day in after] == [0, 2, 4, 0, 2, 4]
        assert [note.kind for note in notes] == ["cadence_dropped"]


class TestEndToEnd:
    """A real v1 entry must come up migrated, with its repair issues raised."""

    async def test_v1_entry_is_migrated_on_setup(self, hass):
        from custom_components.irrigation_maestro.const import DOMAIN
        from homeassistant.helpers import issue_registry as ir
        from pytest_homeassistant_custom_component.common import MockConfigEntry

        await hass.config.async_set_time_zone("UTC")
        entry = MockConfigEntry(
            domain=DOMAIN,
            version=1,  # pre-2.0.0 installation
            title="Irrigation Maestro",
            data={},
            options={
                "weather_entity": "weather.test",
                "restrictions": {"allowed_weekdays": [0, 2, 4], "parity": "odd"},
            },
            subentries_data=[
                {
                    "data": {
                        "name": "Pots",
                        "valve_entity": "valve.pots",
                        "interval_days": 3,
                        "season_months": [6, 7, 8],
                        "cycles": [
                            {
                                "id": "cy_morning",
                                "name": "Morning",
                                "days": [0, 2, 4],
                                "trigger": {"kind": "time", "at": "05:30"},
                                "curve": {
                                    "points": [[20.0, 3.0]],
                                    "min_value": 1.0,
                                    "max_value": 60.0,
                                },
                            }
                        ],
                    },
                    "subentry_type": "zone",
                    "title": "Pots",
                    "unique_id": None,
                }
            ],
        )
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

        assert entry.version == 3
        data = next(iter(entry.subentries.values())).data
        # The grid the user picked wins; the cadence and the parity are gone.
        assert data["cycles"][0]["calendar"] == {"mode": "weekdays", "days": [0, 2, 4]}
        assert data["cycles"][0]["season_months"] == [6, 7, 8]
        assert "interval_days" not in data
        assert "season_months" not in data
        # Restrictions keep hours only.
        assert entry.options["restrictions"] == {}

        registry = ir.async_get(hass)
        assert registry.async_get_issue(DOMAIN, "migration_cadence_dropped") is not None
        assert registry.async_get_issue(DOMAIN, "migration_parity_dropped") is not None

    async def test_migration_is_idempotent(self):
        zone = zone_v1(interval_days=3, days={0, 2, 4})
        once, _notes = migrate_zone_v1_to_v2(zone, None)
        twice, notes = migrate_zone_v1_to_v2(once, None)
        assert twice == once
        assert notes == []


class TestCurveMaterialisation:
    def _zone(self, curve: dict[str, Any]) -> dict[str, Any]:
        return {
            "name": "Pots",
            "valve_entity": "valve.pots",
            "cycles": [{"id": "c1", "name": "Morning", "curve": curve}],
        }

    def test_preset_reference_becomes_its_exact_points(self) -> None:
        data, notes = migrate_zone_v2_to_v3(self._zone({"template": "preset_pots"}), {})
        curve = data["cycles"][0]["curve"]
        assert "template" not in curve
        assert curve["points"] == [[10.0, 10.0], [30.0, 30.0], [42.5, 55.0]]
        assert curve["min_value"] == 10.0
        assert curve["max_value"] == 55.0
        assert curve["kind"] == "duration"
        assert notes == []

    def test_running_twice_changes_nothing(self) -> None:
        once, _ = migrate_zone_v2_to_v3(self._zone({"template": "preset_pots"}), {})
        twice, notes = migrate_zone_v2_to_v3(deepcopy(once), {})
        assert twice == once
        assert notes == []

    def test_explicit_points_are_left_alone(self) -> None:
        original = {"points": [[12.0, 5.0], [25.0, 15.0]], "min_value": 1.0, "max_value": 60.0}
        data, notes = migrate_zone_v2_to_v3(self._zone(dict(original)), {})
        assert data["cycles"][0]["curve"] == original
        assert notes == []

    def test_hub_template_is_resolved(self) -> None:
        templates = {"custom": {"points": [[15.0, 7.0]], "min_value": 1.0, "max_value": 30.0}}
        data, _ = migrate_zone_v2_to_v3(self._zone({"template": "custom"}), templates)
        assert data["cycles"][0]["curve"]["points"] == [[15.0, 7.0]]

    def test_unresolvable_template_is_reported_not_guessed(self) -> None:
        data, notes = migrate_zone_v2_to_v3(self._zone({"template": "gone"}), {})
        assert data["cycles"][0]["curve"] == {"template": "gone"}
        assert [note.kind for note in notes] == ["curve_template_missing"]


class TestPerDayMinutesConversion:
    def _zone(self, curve: dict[str, Any], day_minutes: dict[str, int]) -> dict[str, Any]:
        return {
            "name": "Pots",
            "valve_entity": "valve.pots",
            "cycles": [{"id": "c1", "name": "Morning", "curve": curve, "day_minutes": day_minutes}],
        }

    def test_minutes_become_an_equivalent_percentage(self) -> None:
        # Raw value at 25 C is 20 min; 30 minutes on Monday is 150 %.
        curve = {"points": [[25.0, 20.0]], "min_value": 1.0, "max_value": 60.0}
        data, notes = migrate_zone_v2_to_v3(self._zone(curve, {"0": 30, "3": 10}), {})
        cycle = data["cycles"][0]
        assert "day_minutes" not in cycle
        assert cycle["day_intensity_pct"] == {"0": 150.0, "3": 50.0}
        assert notes == []

    def test_conversion_uses_the_unclamped_value(self) -> None:
        """A floor of 10 over a raw 8 must not distort the factor: asking for
        20 minutes is 250 % of 8, not 200 % of the clamped 10."""
        curve = {"points": [[25.0, 8.0]], "min_value": 10.0, "max_value": 60.0}
        data, _ = migrate_zone_v2_to_v3(self._zone(curve, {"0": 20}), {})
        assert data["cycles"][0]["day_intensity_pct"] == {"0": 250.0}

    def test_running_twice_changes_nothing(self) -> None:
        curve = {"points": [[25.0, 20.0]], "min_value": 1.0, "max_value": 60.0}
        once, _ = migrate_zone_v2_to_v3(self._zone(curve, {"0": 30}), {})
        twice, notes = migrate_zone_v2_to_v3(deepcopy(once), {})
        assert twice == once
        assert notes == []

    def test_a_zero_curve_cannot_be_scaled_and_is_reported(self) -> None:
        curve = {"points": [[25.0, 0.0]], "min_value": 0.0, "max_value": 60.0}
        data, notes = migrate_zone_v2_to_v3(self._zone(curve, {"0": 30}), {})
        cycle = data["cycles"][0]
        assert "day_minutes" not in cycle
        assert "day_intensity_pct" not in cycle
        assert [note.kind for note in notes] == ["day_minutes_dropped"]

    def test_day_minutes_without_a_curve_key_does_not_raise(self) -> None:
        """M4: a program carrying day_minutes but no curve key at all must
        not crash the migration with a KeyError -- it should be treated the
        same as a curve worth zero at the reference: reported, not invented."""
        zone = {
            "name": "Pots",
            "valve_entity": "valve.pots",
            "cycles": [{"id": "c1", "name": "Morning", "day_minutes": {"0": 30}}],
        }
        data, notes = migrate_zone_v2_to_v3(zone, {})
        cycle = data["cycles"][0]
        assert "day_minutes" not in cycle
        assert "day_intensity_pct" not in cycle
        assert [note.kind for note in notes] == ["day_minutes_dropped"]

    def test_unresolvable_template_does_not_orphan_day_minutes(self) -> None:
        """M4: the unresolvable-template branch used to `continue` before the
        day_minutes pop, permanently stranding that legacy key on exactly the
        programs that already needed a repair issue. It must be gone from the
        migrated cycle regardless of whether the curve resolved."""
        data, notes = migrate_zone_v2_to_v3(self._zone({"template": "gone"}, {"0": 30}), {})
        cycle = data["cycles"][0]
        assert "day_minutes" not in cycle
        assert "day_intensity_pct" not in cycle
        assert {note.kind for note in notes} == {"curve_template_missing", "day_minutes_dropped"}


class TestConsumptionCarryOverNotice:
    """3.3.0's upgrade notice must fire only when a carry actually happened.

    seed_carried_over_and_drop_consumption used to report the mere presence of
    the legacy key, and 3.2.x's _default_data always created it -- empty. So
    every upgrading install raised a Repairs issue stating, in both locales
    and as fact, that its monthly total "has been carried forward once as this
    period's opening balance" and "mixes measured with estimated litres",
    while the derived total was 0.0. The carry itself was always gated on a
    matching period and positive litres; the report now follows it.

    The key is dropped in all three cases, and the save that persists that
    removal is scheduled in all three -- only the notice is narrower.
    """

    ISSUE = "consumption_history_restarted"

    @staticmethod
    async def _setup(hass, hass_storage, freezer, consumption):
        from custom_components.irrigation_maestro.const import DOMAIN
        from pytest_homeassistant_custom_component.common import MockConfigEntry

        freezer.move_to("2026-08-14 09:00:00+00:00")
        await hass.config.async_set_time_zone("UTC")
        hass.states.async_set(
            "weather.test",
            "sunny",
            {"temperature": 25.0, "wind_speed": 5.0, "wind_speed_unit": "km/h"},
        )
        entry = MockConfigEntry(
            domain=DOMAIN,
            version=3,
            title="Irrigation Maestro",
            data={},
            options={"weather_entity": "weather.test"},
            subentries_data=[],
        )
        key = f"{DOMAIN}.{entry.entry_id}"
        hass_storage[key] = {
            "version": 1,
            "minor_version": 1,
            "key": key,
            "data": {} if consumption is None else {"consumption": consumption},
        }
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        return entry

    async def test_a_counter_from_this_period_is_carried_and_reported(
        self, hass, hass_storage, freezer
    ):
        from custom_components.irrigation_maestro.const import DOMAIN
        from homeassistant.helpers import issue_registry as ir

        entry = await self._setup(
            hass, hass_storage, freezer, {"period_start": "2026-08-01", "liters": 250.0}
        )
        state = entry.runtime_data.state

        assert state.carried_over_for(date(2026, 8, 1)) == 250.0
        assert "consumption" not in state.as_dict()
        assert ir.async_get(hass).async_get_issue(DOMAIN, self.ISSUE) is not None

    async def test_a_counter_from_a_past_period_is_dropped_in_silence(
        self, hass, hass_storage, freezer
    ):
        """It is deliberately not carried, so nothing was carried forward."""
        from custom_components.irrigation_maestro.const import DOMAIN
        from homeassistant.helpers import issue_registry as ir

        entry = await self._setup(
            hass, hass_storage, freezer, {"period_start": "2026-07-01", "liters": 900.0}
        )
        state = entry.runtime_data.state

        assert state.carried_over_for(date(2026, 8, 1)) == 0.0
        assert "consumption" not in state.as_dict()
        assert ir.async_get(hass).async_get_issue(DOMAIN, self.ISSUE) is None

    async def test_an_install_that_never_had_a_budget_is_dropped_in_silence(
        self, hass, hass_storage, freezer
    ):
        """3.2.x's own default, verbatim: the key exists and holds nothing."""
        from custom_components.irrigation_maestro.const import DOMAIN
        from homeassistant.helpers import issue_registry as ir

        entry = await self._setup(
            hass, hass_storage, freezer, {"period_start": None, "liters": 0.0}
        )
        state = entry.runtime_data.state

        assert state.carried_over_for(date(2026, 8, 1)) == 0.0
        assert "consumption" not in state.as_dict()
        assert ir.async_get(hass).async_get_issue(DOMAIN, self.ISSUE) is None
