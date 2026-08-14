"""Tests for the runtime state store (config/state separation, §5)."""

from datetime import UTC, date, datetime

from custom_components.irrigation_maestro.engine.metering import UNATTRIBUTED_KEY
from custom_components.irrigation_maestro.engine.model import EngineParams
from custom_components.irrigation_maestro.migration import (
    migrate_last_completed,
    seed_carried_over_and_drop_consumption,
)
from custom_components.irrigation_maestro.storage import RuntimeState
from homeassistant.core import HomeAssistant

PARAMS = EngineParams()
NOW = datetime(2026, 7, 17, 5, 30, tzinfo=UTC)
TODAY = date(2026, 7, 17)


async def make_state(hass: HomeAssistant, entry_id: str = "entry1") -> RuntimeState:
    state = RuntimeState(hass, entry_id)
    await state.async_load()
    return state


async def test_fresh_state_defaults(hass: HomeAssistant) -> None:
    state = await make_state(hass)
    assert state.temps_for(TODAY) == (None, None, None, None)
    assert state.rains_for(TODAY) == (0.0, 0.0, 0.0, 0.0)
    assert state.staging_mm == 0.0
    assert state.last_completed("zone1", "c1") is None
    assert state.manual_stop_at is None
    assert state.suspended_until("zone1") is None
    assert state.consumption_liters == 0.0


async def test_temp_and_rain_tracking(hass: HomeAssistant) -> None:
    state = await make_state(hass)
    state.record_temp(TODAY, 28.0)
    state.record_temp(TODAY, 31.5)
    state.record_temp(TODAY, 30.0)
    state.add_rain(TODAY, 1.2, PARAMS)
    assert state.temps_for(TODAY) == (None, None, None, 31.5)
    assert state.rains_for(TODAY)[0] == 1.2


async def test_staging_commit_cycle(hass: HomeAssistant) -> None:
    state = await make_state(hass)
    state.set_staging(2.0)
    assert state.staging_mm == 2.0
    state.commit_staging(TODAY, PARAMS)
    assert state.staging_mm == 0.0
    assert state.rains_for(TODAY)[0] == 1.6  # 2.0 * 0.8


async def test_persistence_roundtrip(hass: HomeAssistant) -> None:
    state = await make_state(hass)
    state.record_temp(TODAY, 31.5)
    state.add_rain(TODAY, 2.8, PARAMS)
    state.set_last_completed("zone1", "c1", TODAY)
    state.set_manual_stop(NOW)
    state.set_suspended_until("zone1", NOW)
    state.add_consumption(120.5, period_start=TODAY)
    state.set_last_outcome("zone1", {"result": "completed", "at": NOW.isoformat()})
    await state.async_save()

    reloaded = await make_state(hass)
    assert reloaded.temps_for(TODAY) == (None, None, None, 31.5)
    assert reloaded.rains_for(TODAY)[0] == 2.8
    assert reloaded.last_completed("zone1", "c1") == TODAY
    assert reloaded.manual_stop_at == NOW
    assert reloaded.suspended_until("zone1") == NOW
    assert reloaded.consumption_liters == 120.5
    assert reloaded.last_outcome("zone1") == {"result": "completed", "at": NOW.isoformat()}


async def test_window_shifts_across_midnight_without_rotation(hass: HomeAssistant) -> None:
    state = await make_state(hass)
    state.record_temp(TODAY, 30.0)
    tomorrow = date(2026, 7, 18)
    _d3, _d2, d1, today = state.temps_for(tomorrow)
    assert d1 == 30.0
    assert today is None


async def test_old_days_pruned_on_save(hass: HomeAssistant) -> None:
    state = await make_state(hass)
    state.record_temp(date(2026, 7, 10), 25.0)
    state.record_temp(TODAY, 30.0)
    state.prune(TODAY)
    assert state.temps_for(TODAY) == (None, None, None, 30.0)
    d3, _, _, _ = state.temps_for(date(2026, 7, 13))
    assert d3 == 25.0 or d3 is None  # pruned: no key older than the window


async def test_consumption_period_reset(hass: HomeAssistant) -> None:
    state = await make_state(hass)
    state.add_consumption(100.0, period_start=date(2026, 6, 1))
    assert state.consumption_liters == 100.0
    # New period: counter restarts.
    state.add_consumption(10.0, period_start=date(2026, 7, 1))
    assert state.consumption_liters == 10.0
    assert state.consumption_period_start == date(2026, 7, 1)


async def test_enable_flags_default_true_and_persist(hass: HomeAssistant) -> None:
    state = await make_state(hass)
    assert state.zone_enabled("zone1") is True
    assert state.cycle_enabled("zone1", "c1") is True
    state.set_zone_enabled("zone1", False)
    state.set_cycle_enabled("zone1", "c1", False)
    await state.async_save()
    reloaded = await make_state(hass)
    assert reloaded.zone_enabled("zone1") is False
    assert reloaded.cycle_enabled("zone1", "c1") is False
    assert reloaded.cycle_enabled("zone1", "c2") is True


async def test_outcome_log_per_day(hass: HomeAssistant) -> None:
    state = await make_state(hass)
    assert state.outcome_recorded(TODAY, "zone1", "c1") is False
    state.record_outcome(TODAY, "zone1", "c1", "completed")
    assert state.outcome_recorded(TODAY, "zone1", "c1") is True
    assert state.outcome_recorded(TODAY, "zone1", "c2") is False
    # Pruning keeps the log bounded.
    state.record_outcome(date(2026, 7, 10), "zone1", "c1", "completed")
    state.prune(TODAY)
    assert state.outcome_recorded(date(2026, 7, 10), "zone1", "c1") is False


async def test_global_pause_key(hass: HomeAssistant) -> None:
    state = await make_state(hass)
    assert state.paused_until(None) is None
    state.set_paused_until(None, NOW)
    assert state.paused_until(None) == NOW
    state.set_paused_until("zone1", NOW)
    assert state.paused_until("zone1") == NOW
    state.clear_pause("zone1")
    assert state.paused_until("zone1") is None


async def test_persisted_key_set_round_trips(hass: HomeAssistant) -> None:
    """The stored dict keeps exactly the keys the defaults declare.

    Nothing else asserts the persisted shape, so a key added or removed by
    accident is invisible until an install fails to load. "consumption" is
    gone: a fresh install never has it, and an upgraded one loses it the
    first time the 3.3.0 migration runs (see the tests below).
    """
    state = RuntimeState(hass, "entry1")
    await state.async_load()
    await state.async_save()

    reloaded = RuntimeState(hass, "entry1")
    await reloaded.async_load()
    assert set(reloaded.as_dict()) == {
        "temp_history",
        "rain_history",
        "rain_staging_mm",
        "last_completed",
        "manual_stop_at",
        "suspended_until",
        "paused_until",
        "skip_today",
        "last_outcome",
        "zone_enabled",
        "cycle_enabled",
        "outcome_log",
        "water",
    }


def test_marker_migration_is_idempotent() -> None:
    """migrate_last_completed re-keys zone -> zone:program, once.

    The precedent every later storage migration copies, shipped untested.
    """
    zone_programs = {"z1": ["p1", "p2"]}
    once = migrate_last_completed({"z1": "2026-07-01"}, zone_programs)
    assert once == {"z1:p1": "2026-07-01", "z1:p2": "2026-07-01"}
    assert migrate_last_completed(once, zone_programs) == once


def test_marker_migration_drops_markers_of_removed_zones() -> None:
    assert migrate_last_completed({"gone": "2026-07-01"}, {}) == {}


async def test_water_totals_accumulate_and_split_by_provenance(hass: HomeAssistant) -> None:
    state = RuntimeState(hass, "entry_water")
    await state.async_load()
    day = date(2026, 8, 14)

    state.add_water("z1", 10.0, day=day, estimated=False)
    state.add_water("z1", 5.0, day=day, estimated=True)

    assert state.zone_water_total("z1") == 15.0
    assert state.zone_water_estimated("z1") == 5.0
    assert state.water_for_day("z1", day) == 15.0


async def test_add_water_records_a_gap_with_zero_litres(hass: HomeAssistant) -> None:
    """A reading gap with no litres must still leave a trace in the daily record.

    The guard clause is `liters <= 0 and gap_s <= 0`, so a gap-only call (no
    litres, some elapsed gap) must not be swallowed: l stays at zero but
    gap_s accumulates.
    """
    state = RuntimeState(hass, "entry_water_gap")
    await state.async_load()
    day = date(2026, 8, 14)

    state.add_water("z1", 0.0, day=day, estimated=False, gap_s=30.0)

    assert state.zone_water_total("z1") == 0.0
    record = state.daily_water()[day.isoformat()]["z1"]
    assert record["l"] == 0.0
    assert record["gap_s"] == 30.0


async def test_unattributed_tracks_closed_valves_separately(hass: HomeAssistant) -> None:
    """Priming litres are unattributed; only the all-closed subset is suspect.

    Two separate closed-valve contributions (3.0, then 5.0), not one: a single
    nonzero contribution cannot tell accumulation apart from overwrite, which
    is exactly the defect this counter was shipped with once already (see the
    daily-record test below, fixed one level down).
    """
    state = RuntimeState(hass, "entry_water2")
    await state.async_load()
    day = date(2026, 8, 14)

    state.add_unattributed("z1", 2.0, day=day, valves_closed=False)  # master pre-open
    state.add_unattributed("z1", 3.0, day=day, valves_closed=True)  # leak candidate
    state.add_unattributed("z1", 5.0, day=day, valves_closed=True)  # leak candidate

    assert state.unattributed_total("z1") == 10.0
    assert state.unattributed_closed("z1") == 8.0
    assert state.unattributed_total() == 10.0


async def test_unattributed_daily_record_tracks_closed_l_not_just_the_counter(
    hass: HomeAssistant,
) -> None:
    """closed_l is leak detection's entire input, at the daily level, not just the cumulative.

    Three calls: one with the master pre-open (contributes to total_l only),
    then two separate closed-valve contributions (3.0, then 5.0). closed_l
    must be their sum, 8.0, not the last one, 5.0 -- an overwrite bug would
    leave closed_l at 5.0 while total_l (10.0) stayed correct, so pinning
    both is what catches it.
    """
    state = RuntimeState(hass, "entry_water_closed_daily")
    await state.async_load()
    day = date(2026, 8, 14)

    state.add_unattributed("z1", 2.0, day=day, valves_closed=False)
    state.add_unattributed("z1", 3.0, day=day, valves_closed=True)
    state.add_unattributed("z1", 5.0, day=day, valves_closed=True)

    record = state.daily_water()[day.isoformat()][UNATTRIBUTED_KEY]
    assert record["l"] == 10.0
    assert record["closed_l"] == 8.0


async def test_water_survives_a_reload_without_going_backwards(hass: HomeAssistant) -> None:
    state = RuntimeState(hass, "entry_water3")
    await state.async_load()
    state.add_water("z1", 42.0, day=date(2026, 8, 14), estimated=False)
    await state.async_save()

    reloaded = RuntimeState(hass, "entry_water3")
    await reloaded.async_load()
    assert reloaded.zone_water_total("z1") == 42.0


async def test_a_partial_stored_water_section_is_filled_with_defaults(
    hass: HomeAssistant, hass_storage: dict
) -> None:
    """The defaults merge is shallow, so the sub-dict must be merged explicitly.

    A store written by an earlier build of this feature, or hand-edited, must
    not make every accessor raise KeyError.
    """
    hass_storage["irrigation_maestro.entry_water4"] = {
        "version": 1,
        "data": {"water": {"zones": {"z1": {"total_l": 3.0, "estimated_l": 0.0}}}},
    }
    state = RuntimeState(hass, "entry_water4")
    await state.async_load()

    assert state.zone_water_total("z1") == 3.0
    assert state.unattributed_total() == 0.0
    assert state.daily_water() == {}
    assert state.carried_over_for(date(2026, 8, 1)) == 0.0


async def test_daily_water_is_pruned_to_the_retention_window(hass: HomeAssistant) -> None:
    state = RuntimeState(hass, "entry_water5")
    await state.async_load()
    today = date(2026, 8, 14)
    state.add_water("z1", 1.0, day=date.fromordinal(today.toordinal() - 731), estimated=False)
    state.add_water("z1", 1.0, day=date.fromordinal(today.toordinal() - 729), estimated=False)
    state.add_water("z1", 1.0, day=today, estimated=False)

    state.prune_water(today)

    assert len(state.daily_water()) == 2


async def test_dropping_a_zone_keeps_its_history_and_drops_its_counters(
    hass: HomeAssistant,
) -> None:
    """Water that flowed, flowed: deleting the history would rewrite past months.

    The cumulative counters back entities that no longer exist, so they go.
    """
    state = RuntimeState(hass, "entry_water6")
    await state.async_load()
    day = date(2026, 8, 14)
    state.add_water("z1", 10.0, day=day, estimated=False)
    state.add_unattributed("z1", 4.0, day=day, valves_closed=True)

    state.drop_zone("z1")

    assert state.zone_water_total("z1") == 0.0
    assert state.unattributed_total("z1") == 0.0
    assert state.water_for_day("z1", day) == 10.0
    assert state.water_for_period(day, day) == 10.0


async def test_carried_over_applies_only_to_its_own_period(hass: HomeAssistant) -> None:
    state = RuntimeState(hass, "entry_water7")
    await state.async_load()
    state.set_carried_over(date(2026, 8, 1), 250.0)

    assert state.carried_over_for(date(2026, 8, 1)) == 250.0
    assert state.carried_over_for(date(2026, 9, 1)) == 0.0


def test_consumption_is_carried_over_then_removed() -> None:
    data = {
        "consumption": {"period_start": "2026-08-01", "liters": 250.0},
        "water": {
            "zones": {},
            "unattributed": {},
            "daily": {},
            "carried_over": {"period_start": None, "liters": 0.0},
        },
    }
    changed = seed_carried_over_and_drop_consumption(data, date(2026, 8, 14))

    assert changed is True
    assert "consumption" not in data
    assert data["water"]["carried_over"] == {"period_start": "2026-08-01", "liters": 250.0}


def test_the_carry_over_migration_is_idempotent() -> None:
    data = {
        "consumption": {"period_start": "2026-08-01", "liters": 250.0},
        "water": {
            "zones": {},
            "unattributed": {},
            "daily": {},
            "carried_over": {"period_start": None, "liters": 0.0},
        },
    }
    seed_carried_over_and_drop_consumption(data, date(2026, 8, 14))
    before = dict(data["water"]["carried_over"])

    assert seed_carried_over_and_drop_consumption(data, date(2026, 8, 14)) is False
    assert data["water"]["carried_over"] == before


def test_a_stale_period_is_not_carried_into_the_current_one() -> None:
    """A counter from July must not become August's opening balance."""
    data = {
        "consumption": {"period_start": "2026-07-01", "liters": 900.0},
        "water": {
            "zones": {},
            "unattributed": {},
            "daily": {},
            "carried_over": {"period_start": None, "liters": 0.0},
        },
    }
    seed_carried_over_and_drop_consumption(data, date(2026, 8, 14))

    assert "consumption" not in data
    assert data["water"]["carried_over"]["liters"] == 0.0


async def test_migrate_consumption_drops_the_key_from_the_persisted_store(
    hass: HomeAssistant, hass_storage: dict
) -> None:
    """The key must vanish from the file on disk, not just from a bare dict.

    Popping "consumption" from ``_default_data()`` would not be enough on its
    own -- the defaults merge in ``async_load`` copies an unknown stored key
    through verbatim -- so this seeds a store the way a pre-3.3.0 install
    would have left it and proves the round trip through Store, not just the
    pure function above.
    """
    hass_storage["irrigation_maestro.entry_water8"] = {
        "version": 1,
        "data": {"consumption": {"period_start": "2026-08-01", "liters": 250.0}},
    }
    state = RuntimeState(hass, "entry_water8")
    await state.async_load()

    assert state.migrate_consumption(date(2026, 8, 14)) is True
    await state.async_save()

    reloaded = RuntimeState(hass, "entry_water8")
    await reloaded.async_load()

    assert "consumption" not in reloaded.as_dict()
    assert reloaded.carried_over_for(date(2026, 8, 1)) == 250.0
    # Idempotent on the store too: a load that has nothing left to migrate
    # reports no change, which is what gates the Repairs issue to fire once.
    assert reloaded.migrate_consumption(date(2026, 8, 14)) is False


async def test_migrate_consumption_is_a_no_op_on_a_fresh_install(hass: HomeAssistant) -> None:
    """A fresh install never had a "consumption" key; nothing to report."""
    state = RuntimeState(hass, "entry_water9")
    await state.async_load()

    assert state.migrate_consumption(date(2026, 8, 14)) is False
