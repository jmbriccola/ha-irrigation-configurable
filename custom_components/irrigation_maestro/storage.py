"""Runtime state persistence (§5: config/state separation).

Everything that is *state*, not *intent*, lives here — never in the config
entry: daily temperature maxima, rain counters and staging, last completed day
per zone, manual-stop timestamp, suspensions/pauses, last outcomes and water
accounting. Temp/rain histories are keyed by ISO date (see engine.history), so
midnight needs no rotation step and restarts cannot corrupt the window. The
water section's own daily history follows the same keyed-by-day, no-rotation
shape (see engine.metering instead), alongside totals that are not date-keyed
at all -- and those are not all per zone: ``water["zones"]`` is, but
``water["unattributed"]`` is keyed by *scope* (a zone id, or ``__hub__``) and
backs a hub entity, and ``water["carried_over"]`` is one account-level opening
balance for the current budget period.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, cast

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from . import migration as migrate
from .const import DOMAIN, STORAGE_VERSION, STORAGE_VERSION_RUNS
from .engine import history, metering, runlog
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

    def migrate_consumption(self, today: date) -> migrate.ConsumptionMigration:
        """Carry the old monthly counter into an opening balance (3.3.0).

        Returns both facts, because they gate different things: see
        ``ConsumptionMigration``.
        """
        return migrate.seed_carried_over_and_drop_consumption(self._data, today)

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
        self._water["daily"] = metering.prune_daily(self._water["daily"], today)

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
        # The per-zone counter backs an entity that no longer exists, so it
        # goes. The daily history stays: deleting it would rewrite past months
        # and make the derived budget total jump. It ages out at 730 days like
        # the rest.
        self._water["zones"].pop(zone_id, None)
        # One line down, the same reasoning, and the opposite conclusion. This
        # bucket is keyed by zone id (scope_for names the sole zone on a
        # meter) but it backs a *hub* entity: hub_unattributed_water sums every
        # scope. Popping it would drop that total_increasing sensor from
        # 1000 L to 200 L, and HA's recorder reads a drop below 90% as a meter
        # reset -- it re-adds the post-drop value to the long-term sum and
        # inflates the Water dashboard permanently, with nothing the user can
        # do to correct it. So the scope is merged into HUB_SCOPE instead: the
        # water flowed, and it now belongs to no zone, which is exactly what
        # __hub__ means. Further unattributed water on that meter lands in the
        # same bucket, since scope_for finds no owner for it either.
        departing = self._water["unattributed"].pop(zone_id, None)
        if departing is not None:
            hub = self._water["unattributed"].setdefault(
                metering.HUB_SCOPE, {"total_l": 0.0, "closed_l": 0.0}
            )
            hub["total_l"] = float(hub["total_l"]) + float(departing.get("total_l", 0.0))
            hub["closed_l"] = float(hub["closed_l"]) + float(departing.get("closed_l", 0.0))

    # Manual stop -----------------------------------------------------------

    @property
    def manual_stop_at(self) -> datetime | None:
        raw = self._data["manual_stop_at"]
        return datetime.fromisoformat(raw) if raw else None

    def set_manual_stop(self, at: datetime | None) -> None:
        self._data["manual_stop_at"] = at.isoformat() if at else None

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
        gap_at: datetime | None = None,
    ) -> None:
        """Credit litres to a zone: cumulative and daily, in one transaction.

        One writer for both, so the cumulative and the "today"/"this month"
        projections derived from the daily history cannot diverge.

        ``gap_s`` seconds of the same interval went unobserved, and are booked
        with the litres for exactly that reason: a gap yields no litres at
        all, so a call carrying only a gap is normal and must still be
        recorded. ``gap_at`` stamps ``last_gap_at`` when there is one --
        passed in rather than read from a clock here, so this stays the one
        module with no clock of its own, and so the stamp is the interval's
        own instant rather than whenever the write happened to land.
        """
        if liters <= 0 and gap_s <= 0:
            return
        zones = self._water["zones"]
        entry = zones.setdefault(zone_id, {"total_l": 0.0, "estimated_l": 0.0, "last_gap_at": None})
        entry["total_l"] = float(entry["total_l"]) + max(liters, 0.0)
        if estimated:
            entry["estimated_l"] = float(entry["estimated_l"]) + max(liters, 0.0)
        if gap_s > 0 and gap_at is not None:
            entry["last_gap_at"] = gap_at.isoformat()
        self._water["daily"] = metering.roll_into_day(
            self._water["daily"],
            day.isoformat(),
            zone_id,
            liters,
            estimated=estimated,
            gap_s=gap_s,
        )

    def add_unattributed(
        self, scope: str, liters: float, *, day: date, valves_closed: bool, gap_s: float = 0.0
    ) -> None:
        """Credit litres no zone claimed, splitting off the all-closed subset.

        total_l includes line priming during master pre-open, which happens
        every cycle and is not a leak. closed_l is the subset seen with every
        managed valve closed, and is the only part leak detection reads.

        ``gap_s`` is the unobserved part of the same interval, recorded here
        when nothing was watering -- a gap follows the litres' own attribution
        rule, and with no claimant it belongs to the scope that would have
        received the water. It reaches the daily history only: no bucket
        carries a ``last_gap_at``, because no entity reports one for a scope.
        """
        if liters <= 0 and gap_s <= 0:
            return
        entry = self._water["unattributed"].setdefault(scope, {"total_l": 0.0, "closed_l": 0.0})
        entry["total_l"] = float(entry["total_l"]) + max(liters, 0.0)
        if valves_closed:
            entry["closed_l"] = float(entry["closed_l"]) + max(liters, 0.0)
        self._water["daily"] = metering.roll_into_day(
            self._water["daily"],
            day.isoformat(),
            metering.UNATTRIBUTED_KEY,
            liters,
            estimated=False,
            gap_s=gap_s,
            closed_l=liters if valves_closed else 0.0,
        )

    def zone_water_total(self, zone_id: str) -> float:
        return float(self._water["zones"].get(zone_id, {}).get("total_l", 0.0))

    def zone_water_estimated(self, zone_id: str) -> float:
        return float(self._water["zones"].get(zone_id, {}).get("estimated_l", 0.0))

    def zone_last_gap_at(self, zone_id: str) -> str | None:
        """ISO instant of the last interval this zone's meter went unread.

        Stored beside the zone's counters rather than derived from the daily
        history, which keeps seconds per day and not when they fell. Read with
        ``get``: a zone whose counters were written before 3.3.0 gained the
        field simply has none, and never having had a gap reads the same way
        -- ``None``, not a false zero.
        """
        raw = self._water["zones"].get(zone_id, {}).get("last_gap_at")
        return str(raw) if raw else None

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
        """Every zone's litres over an inclusive day range: the whole account.

        What the monthly budget spends. Deliberately not what a per-zone
        sensor reports -- see ``zone_water_for_period``.
        """
        return metering.sum_period(self._water["daily"], start, end)

    def zone_water_for_period(self, zone_id: str, start: date, end: date) -> float:
        """One zone's litres over an inclusive day range.

        The same slice of the same daily history as ``water_for_day``, so a
        zone's "this month" and its "today" measure the same thing. Publishing
        the account-wide total here instead would make every zone read alike
        and contradict the figure printed beside it.
        """
        return metering.sum_period(self._water["daily"], start, end, key=zone_id)

    def daily_water(self) -> metering.DailyLitres:
        """Read-only snapshot of the daily series (diagnostics, card).

        Copied three levels deep -- day, key and record -- so a caller
        mutating the returned dict, including its innermost per-key records,
        can never corrupt the live store.
        """
        return {
            day: {key: dict(record) for key, record in keys.items()}
            for day, keys in self._water["daily"].items()
        }

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


class RunLogStore:
    """Every outcome the component recorded, in a file of its own.

    Deliberately not a section of ``RuntimeState``. That store rewrites its
    whole dict on every ``schedule_save()`` -- a litre-bearing meter sample, a
    session phase transition, a zone toggle, a rain reading, midnight -- and
    this series reaches ~720 KB on a small installation and ~2 MB at the entry
    cap. Appending it there would multiply write amplification on what is
    usually an SD card, for something that changes a handful of times a day.

    The file is not deleted when the config entry is removed, because the state
    store is not either: the integration has no ``async_remove_entry`` at all,
    and deleting one of the two would be the worse of the three available
    behaviours.
    """

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        self.store_key = f"{DOMAIN}.runs.{entry_id}"
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION_RUNS, self.store_key)
        self._data: dict[str, Any] = {"runs": [], "cap_dropped": 0}

    async def async_load(self) -> None:
        stored = await self._store.async_load()
        if stored is not None:
            self._data = {"runs": [], "cap_dropped": 0, **stored}

    async def async_save(self) -> None:
        await self._store.async_save(self._data)

    def schedule_save(self) -> None:
        """Debounced, like the state store: an outcome is not worth a sync write."""
        self._store.async_delay_save(lambda: self._data, _SAVE_DELAY_S)

    @property
    def entries(self) -> list[runlog.RunEntry]:
        """The live list, read-only by contract -- deliberately not a copy.

        RuntimeState.daily_water() next door copies three levels deep so a
        caller cannot corrupt the live store, and this diverges on purpose. Its
        innermost records ARE the accumulators, which a caller would naturally
        add to; a log entry is a finished record that nobody edits. Copying here
        would put an 8000-entry copy on append(), which runs on every recorded
        outcome, to defend against a mutation neither consumer performs -- both
        build fresh dicts from these and never touch them. Do not mutate an
        entry in place.
        """
        return cast(list[runlog.RunEntry], self._data["runs"])

    @property
    def cap_dropped(self) -> int:
        """How many entries the cap has ever removed.

        Monotonic and persisted, because it is the only thing that tells a
        truncated log apart from a young one: both have an oldest entry newer
        than a caller's requested start, and only this says which. It resetting
        on every reboot would make the truncation flag quietly go false.
        """
        return int(self._data["cap_dropped"])

    def oldest_at(self) -> str | None:
        return runlog.oldest_at(self.entries)

    def append(self, entry: runlog.RunEntry) -> None:
        runs, dropped = runlog.append_run(self.entries, entry)
        self._data["runs"] = runs
        self._data["cap_dropped"] = self.cap_dropped + dropped

    def prune(self, cutoff: datetime) -> None:
        self._data["runs"] = runlog.prune_runs(self.entries, cutoff)
