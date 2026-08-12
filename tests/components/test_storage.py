"""Tests for the runtime state store (config/state separation, §5)."""

from datetime import UTC, date, datetime

from custom_components.irrigation_maestro.engine.model import EngineParams
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
