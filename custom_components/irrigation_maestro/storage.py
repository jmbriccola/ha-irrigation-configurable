"""Runtime state persistence (§5: config/state separation).

Everything that is *state*, not *intent*, lives here — never in the config
entry: daily temperature maxima, rain counters and staging, last completed day
per zone, manual-stop timestamp, suspensions/pauses, last outcomes and the
consumption counter. Histories are keyed by ISO date (see engine.history), so
midnight needs no rotation step and restarts cannot corrupt the window.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORAGE_VERSION
from .engine import history
from .engine.model import EngineParams

_SAVE_DELAY_S = 10
_GLOBAL_KEY = "__global__"


class RuntimeState:
    """Typed wrapper around one Store per config entry."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, f"{DOMAIN}.{entry_id}")
        self._data: dict[str, Any] = self._default_data()

    @staticmethod
    def _default_data() -> dict[str, Any]:
        return {
            "temp_history": {},
            "rain_history": {},
            "rain_staging_mm": 0.0,
            "last_completed": {},
            "manual_stop_at": None,
            "suspended_until": {},
            "paused_until": {},
            "skip_today": {},
            "last_outcome": {},
            "zone_enabled": {},
            "cycle_enabled": {},
            "outcome_log": {},
            "consumption": {"period_start": None, "liters": 0.0},
        }

    async def async_load(self) -> None:
        stored = await self._store.async_load()
        if stored is not None:
            data = self._default_data()
            data.update(stored)
            self._data = data

    async def async_save(self) -> None:
        await self._store.async_save(self._data)

    def schedule_save(self) -> None:
        """Debounced save for high-frequency updates (temp/rain tracking)."""
        self._store.async_delay_save(lambda: self._data, _SAVE_DELAY_S)

    # Temperature ---------------------------------------------------------

    def record_temp(self, day: date, value: float) -> None:
        self._data["temp_history"] = history.record_temp_max(self._data["temp_history"], day, value)

    def temps_for(
        self, today: date
    ) -> tuple[float | None, float | None, float | None, float | None]:
        return history.day_values_for_evaluation(self._data["temp_history"], today)

    # Rain ----------------------------------------------------------------

    def add_rain(self, day: date, mm: float, params: EngineParams) -> None:
        self._data["rain_history"] = history.add_rain(
            self._data["rain_history"], day, mm, cap=params.daily_rain_cap_mm
        )

    def set_rain_total(self, day: date, mm: float, params: EngineParams) -> None:
        """Absolute daily total from a physical rain sensor."""
        updated = dict(self._data["rain_history"])
        updated[day.isoformat()] = min(max(mm, 0.0), params.daily_rain_cap_mm)
        self._data["rain_history"] = updated

    def rains_for(self, today: date) -> tuple[float, float, float, float]:
        d3, d2, d1, today_value = history.day_values_for_evaluation(
            self._data["rain_history"], today
        )
        return (today_value or 0.0, d1 or 0.0, d2 or 0.0, d3 or 0.0)

    @property
    def staging_mm(self) -> float:
        return float(self._data["rain_staging_mm"])

    def set_staging(self, mm: float) -> None:
        self._data["rain_staging_mm"] = max(mm, 0.0)

    def commit_staging(self, day: date, params: EngineParams) -> None:
        self._data["rain_history"] = history.commit_staged_rain(
            self._data["rain_history"], day, staging_mm=self.staging_mm, params=params
        )
        self._data["rain_staging_mm"] = 0.0

    def prune(self, today: date) -> None:
        self._data["temp_history"] = history.prune_history(self._data["temp_history"], today)
        self._data["rain_history"] = history.prune_history(self._data["rain_history"], today)
        cutoff = (today - timedelta(days=3)).isoformat()
        self._data["outcome_log"] = {
            day: log for day, log in self._data["outcome_log"].items() if day >= cutoff
        }

    # Per-zone state --------------------------------------------------------

    def last_completed(self, zone_id: str) -> date | None:
        raw = self._data["last_completed"].get(zone_id)
        return date.fromisoformat(raw) if raw else None

    def set_last_completed(self, zone_id: str, day: date) -> None:
        self._data["last_completed"][zone_id] = day.isoformat()

    def suspended_until(self, zone_id: str) -> datetime | None:
        raw = self._data["suspended_until"].get(zone_id)
        return datetime.fromisoformat(raw) if raw else None

    def set_suspended_until(self, zone_id: str, until: datetime | None) -> None:
        if until is None:
            self._data["suspended_until"].pop(zone_id, None)
        else:
            self._data["suspended_until"][zone_id] = until.isoformat()

    def paused_until(self, zone_id: str | None) -> datetime | None:
        raw = self._data["paused_until"].get(zone_id or _GLOBAL_KEY)
        return datetime.fromisoformat(raw) if raw else None

    def set_paused_until(self, zone_id: str | None, until: datetime) -> None:
        self._data["paused_until"][zone_id or _GLOBAL_KEY] = until.isoformat()

    def clear_pause(self, zone_id: str | None) -> None:
        self._data["paused_until"].pop(zone_id or _GLOBAL_KEY, None)

    def skip_today_date(self, zone_id: str) -> date | None:
        raw = self._data["skip_today"].get(zone_id)
        return date.fromisoformat(raw) if raw else None

    def set_skip_today(self, zone_id: str, day: date) -> None:
        self._data["skip_today"][zone_id] = day.isoformat()

    def last_outcome(self, zone_id: str) -> dict[str, Any] | None:
        outcome = self._data["last_outcome"].get(zone_id)
        return dict(outcome) if outcome else None

    def set_last_outcome(self, zone_id: str, outcome: dict[str, Any]) -> None:
        self._data["last_outcome"][zone_id] = dict(outcome)

    # Runtime enable flags (they are state, not config: §5) -----------------

    def zone_enabled(self, zone_id: str) -> bool:
        return bool(self._data["zone_enabled"].get(zone_id, True))

    def set_zone_enabled(self, zone_id: str, enabled: bool) -> None:
        self._data["zone_enabled"][zone_id] = enabled

    def cycle_enabled(self, zone_id: str, cycle_id: str) -> bool:
        return bool(self._data["cycle_enabled"].get(f"{zone_id}:{cycle_id}", True))

    def set_cycle_enabled(self, zone_id: str, cycle_id: str, enabled: bool) -> None:
        self._data["cycle_enabled"][f"{zone_id}:{cycle_id}"] = enabled

    # Outcome log (sentinel evidence: every due cycle leaves a trace) --------

    def record_outcome(self, day: date, zone_id: str, cycle_id: str, result: str) -> None:
        log = self._data["outcome_log"].setdefault(day.isoformat(), {})
        log[f"{zone_id}:{cycle_id}"] = result

    def outcome_recorded(self, day: date, zone_id: str, cycle_id: str) -> bool:
        return f"{zone_id}:{cycle_id}" in self._data["outcome_log"].get(day.isoformat(), {})

    def drop_zone(self, zone_id: str) -> None:
        """Forget all state of a removed zone."""
        for key in (
            "last_completed",
            "suspended_until",
            "paused_until",
            "skip_today",
            "last_outcome",
            "zone_enabled",
        ):
            self._data[key].pop(zone_id, None)
        self._data["cycle_enabled"] = {
            key: value
            for key, value in self._data["cycle_enabled"].items()
            if not key.startswith(f"{zone_id}:")
        }

    # Manual stop -----------------------------------------------------------

    @property
    def manual_stop_at(self) -> datetime | None:
        raw = self._data["manual_stop_at"]
        return datetime.fromisoformat(raw) if raw else None

    def set_manual_stop(self, at: datetime | None) -> None:
        self._data["manual_stop_at"] = at.isoformat() if at else None

    # Consumption -----------------------------------------------------------

    @property
    def consumption_liters(self) -> float:
        return float(self._data["consumption"]["liters"])

    @property
    def consumption_period_start(self) -> date | None:
        raw = self._data["consumption"]["period_start"]
        return date.fromisoformat(raw) if raw else None

    def add_consumption(self, liters: float, *, period_start: date) -> None:
        """Accumulate liters; a new period start resets the counter."""
        if self.consumption_period_start != period_start:
            self._data["consumption"] = {
                "period_start": period_start.isoformat(),
                "liters": 0.0,
            }
        self._data["consumption"]["liters"] += max(liters, 0.0)

    def as_dict(self) -> dict[str, Any]:
        """Snapshot for diagnostics."""
        return dict(self._data)
