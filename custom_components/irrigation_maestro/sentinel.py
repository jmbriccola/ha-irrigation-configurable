"""Daily sentinel: verifies every due cycle left an outcome (§3).

Completed and skipped cycles both record an outcome; if one is missing, the
trigger never ran at all (HA down at trigger time, disabled automation,
unexpected error) — exactly the failure mode in-cycle notifications cannot
cover. The sentinel notifies and opens a Repairs issue.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.core import CALLBACK_TYPE, callback
from homeassistant.helpers import sun
from homeassistant.helpers.event import async_track_time_change
from homeassistant.util import dt as dt_util

if TYPE_CHECKING:
    from .models import CycleConfig, ZoneConfig
    from .runtime import IrrigationRuntime

_LOGGER = logging.getLogger(__name__)


class Sentinel:
    """Runs once a day at the configured time."""

    def __init__(self, runtime: IrrigationRuntime) -> None:
        self._runtime = runtime
        self._unsub: CALLBACK_TYPE | None = None

    def start(self) -> None:
        self.stop()
        at = self._runtime.hub.sentinel_time
        self._unsub = async_track_time_change(
            self._runtime.hass, self._fire, hour=at.hour, minute=at.minute, second=0
        )

    def stop(self) -> None:
        if self._unsub is not None:
            self._unsub()
            self._unsub = None

    @callback
    def _fire(self, _now: Any) -> None:
        self._runtime.entry.async_create_background_task(
            self._runtime.hass, self.async_check(), name="irrigation_maestro_sentinel"
        )

    def _cycle_fire_time(self, cycle: CycleConfig, now: datetime) -> datetime | None:
        """Today's occurrence of a cycle trigger, or None if not computable."""
        today = dt_util.as_local(now).date()
        if cycle.trigger.kind == "time" and cycle.trigger.at is not None:
            return dt_util.as_utc(
                datetime.combine(today, cycle.trigger.at, tzinfo=dt_util.get_default_time_zone())
            )
        if cycle.trigger.kind == "sun" and cycle.trigger.event is not None:
            base = sun.get_astral_event_date(self._runtime.hass, cycle.trigger.event, today)
            if base is None:
                return None
            return base + timedelta(seconds=cycle.trigger.offset_s)
        return None

    def _months_for(self, zone: ZoneConfig, cycle: CycleConfig) -> frozenset[int]:
        if cycle.months_override is not None:
            return cycle.months_override
        if zone.season_months is not None:
            return zone.season_months
        return self._runtime.hub.engine_params.season_months

    async def async_check(self) -> None:
        runtime = self._runtime
        now = dt_util.utcnow()
        today = dt_util.as_local(now).date()
        missing: list[str] = []
        for zone in runtime.zone_configs():
            for cycle in zone.cycles:
                if today.month not in self._months_for(zone, cycle):
                    continue
                fire_time = self._cycle_fire_time(cycle, now)
                if fire_time is None or fire_time > now:
                    continue
                if not runtime.state.outcome_recorded(today, zone.zone_id, cycle.cycle_id):
                    missing.append(f"{zone.name} / {cycle.name}")

        if not missing:
            return
        _LOGGER.warning("Sentinel: no outcome recorded today for: %s", missing)
        runtime.fire_event("sentinel", {"missing": missing})
        runtime.report_sentinel_missing(missing)
        await runtime.notify_sentinel(missing)
