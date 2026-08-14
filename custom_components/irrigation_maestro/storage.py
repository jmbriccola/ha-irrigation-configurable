"""Runtime state persistence (§5: config/state separation).

Everything that is *state*, not *intent*, lives here — never in the config
entry: daily temperature maxima, rain counters and staging, last completed day
per zone, manual-stop timestamp, suspensions/pauses, last outcomes and the
consumption counter. Histories are keyed by ISO date (see engine.history), so
midnight needs no rotation step and restarts cannot corrupt the window.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, cast

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORAGE_VERSION
from .engine import history, metering
from .engine.model import EngineParams
from .migration import migrate_last_completed

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
            "water": {
                "zones": {},
                "unattributed": {},
                "daily": {},
                "carried_over": {"period_start": None, "liters": 0.0},
            },
        }

    async def async_load(self) -> None:
        stored = await self._store.async_load()
        if stored is not None:
            data = self._default_data()
            data.update(stored)
            # The top-level merge is shallow. "water" is the one nested section
            # whose sub-keys are read unconditionally, so it is merged one level
            # deeper rather than teaching fifteen accessors to tolerate absence.
            water = self._default_data()["water"]
            water.update(data.get("water") or {})
            data["water"] = water
            self._data = data

    def migrate_markers(self, zone_programs: dict[str, list[str]]) -> None:
        """Re-key the watering marker from per zone to per program (v2)."""
        self._data["last_completed"] = migrate_last_completed(
            self._data["last_completed"], zone_programs
        )

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

    def prune_water(self, today: date) -> None:
        """Sweep the 730-day daily-water history.

        Kept off ``prune()`` on purpose: that method also runs on every
        evaluate (roughly every two minutes) without a save afterwards, and a
        730-day x N-zone sweep does not belong on that path. This one is only
        ever called from the once-a-day midnight callback, which does save.
        """
        self._data["water"]["daily"] = metering.prune_daily(self._data["water"]["daily"], today)

    # Per-zone state --------------------------------------------------------

    @staticmethod
    def _marker_key(zone_id: str, program_id: str) -> str:
        return f"{zone_id}:{program_id}"

    def last_completed(self, zone_id: str, program_id: str) -> date | None:
        """The program's own last watering day.

        Per program, not per zone: cadence is a program property, and a shared
        marker would let one program consume another's cadence.
        """
        raw = self._data["last_completed"].get(self._marker_key(zone_id, program_id))
        return date.fromisoformat(raw) if raw else None

    def set_last_completed(self, zone_id: str, program_id: str, day: date) -> None:
        self._data["last_completed"][self._marker_key(zone_id, program_id)] = day.isoformat()

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
            "suspended_until",
            "paused_until",
            "skip_today",
            "last_outcome",
            "zone_enabled",
        ):
            self._data[key].pop(zone_id, None)
        prefix = f"{zone_id}:"
        for key in ("cycle_enabled", "last_completed"):
            self._data[key] = {
                item: value
                for item, value in self._data[key].items()
                if not item.startswith(prefix)
            }
        # Live counters back entities that no longer exist, so they go. The
        # daily history stays: deleting it would rewrite past months and make
        # the derived budget total jump. It ages out at 730 days like the rest.
        self._water["zones"].pop(zone_id, None)
        self._water["unattributed"].pop(zone_id, None)

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

    # Water accounting ------------------------------------------------------

    @property
    def _water(self) -> dict[str, Any]:
        return cast(dict[str, Any], self._data["water"])

    def add_water(
        self,
        zone_id: str,
        liters: float,
        *,
        day: date,
        estimated: bool,
        gap_s: float = 0.0,
    ) -> None:
        """Credit litres to a zone: cumulative and daily, in one transaction.

        One writer for both, so the cumulative and the "today"/"this month"
        projections derived from the daily history cannot diverge.
        """
        if liters <= 0 and gap_s <= 0:
            return
        zones = self._water["zones"]
        entry = zones.setdefault(zone_id, {"total_l": 0.0, "estimated_l": 0.0})
        entry["total_l"] = float(entry["total_l"]) + max(liters, 0.0)
        if estimated:
            entry["estimated_l"] = float(entry["estimated_l"]) + max(liters, 0.0)
        self._water["daily"] = metering.roll_into_day(
            self._water["daily"],
            day.isoformat(),
            zone_id,
            liters,
            estimated=estimated,
            gap_s=gap_s,
        )

    def add_unattributed(
        self, scope: str, liters: float, *, day: date, valves_closed: bool
    ) -> None:
        """Credit litres no zone claimed, splitting off the all-closed subset.

        total_l includes line priming during master pre-open, which happens
        every cycle and is not a leak. closed_l is the subset seen with every
        managed valve closed, and is the only part leak detection reads.
        """
        if liters <= 0:
            return
        entry = self._water["unattributed"].setdefault(scope, {"total_l": 0.0, "closed_l": 0.0})
        entry["total_l"] = float(entry["total_l"]) + liters
        if valves_closed:
            entry["closed_l"] = float(entry["closed_l"]) + liters
        daily = metering.roll_into_day(
            self._water["daily"],
            day.isoformat(),
            metering.UNATTRIBUTED_KEY,
            liters,
            estimated=False,
            gap_s=0.0,
        )
        record = daily[day.isoformat()][metering.UNATTRIBUTED_KEY]
        record["closed_l"] = float(record.get("closed_l", 0.0)) + (liters if valves_closed else 0.0)
        self._water["daily"] = daily

    def zone_water_total(self, zone_id: str) -> float:
        return float(self._water["zones"].get(zone_id, {}).get("total_l", 0.0))

    def zone_water_estimated(self, zone_id: str) -> float:
        return float(self._water["zones"].get(zone_id, {}).get("estimated_l", 0.0))

    def unattributed_total(self, scope: str | None = None) -> float:
        buckets = self._water["unattributed"]
        if scope is not None:
            return float(buckets.get(scope, {}).get("total_l", 0.0))
        return sum(float(entry.get("total_l", 0.0)) for entry in buckets.values())

    def unattributed_closed(self, scope: str | None = None) -> float:
        buckets = self._water["unattributed"]
        if scope is not None:
            return float(buckets.get(scope, {}).get("closed_l", 0.0))
        return sum(float(entry.get("closed_l", 0.0)) for entry in buckets.values())

    def water_for_day(self, zone_id: str, day: date) -> float:
        return float(self._water["daily"].get(day.isoformat(), {}).get(zone_id, {}).get("l", 0.0))

    def water_for_period(self, start: date, end: date) -> float:
        return metering.sum_period(self._water["daily"], start, end)

    def daily_water(self) -> metering.DailyLitres:
        """Read-only snapshot of the daily series (diagnostics, card)."""
        return {day: dict(keys) for day, keys in self._water["daily"].items()}

    def carried_over_for(self, period_start: date) -> float:
        """The opening balance, but only for the period it was stamped with."""
        carried = self._water["carried_over"]
        if carried.get("period_start") != period_start.isoformat():
            return 0.0
        return float(carried.get("liters", 0.0))

    def set_carried_over(self, period_start: date, liters: float) -> None:
        self._water["carried_over"] = {
            "period_start": period_start.isoformat(),
            "liters": max(liters, 0.0),
        }

    def as_dict(self) -> dict[str, Any]:
        """Snapshot for diagnostics."""
        return dict(self._data)
