"""The program calendar: which calendar days a program may run on (§1).

Exactly one mode is active at a time. The mode is stored as a discriminated
union rather than a set of optional fields, so no service call, JSON import or
migration can produce a program with two competing schedules — the ambiguity
that made a weekday grid and a per-zone cadence silently cancel each other out
before 2.0.0.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from enum import StrEnum
from typing import Any, Self

from .model import EngineError
from .scheduling import Parity, is_due

_ALL_WEEKDAYS = frozenset(range(7))


class CalendarMode(StrEnum):
    """The one active way of choosing watering days."""

    WEEKDAYS = "weekdays"
    INTERVAL = "interval"
    PARITY = "parity"


@dataclass(frozen=True, slots=True)
class ProgramCalendar:
    """Which days a program may run on. Exactly one mode is meaningful."""

    mode: CalendarMode
    days: frozenset[int] = _ALL_WEEKDAYS
    interval_days: int = 1
    parity: Parity | None = None

    @classmethod
    def weekdays(cls, days: set[int] | frozenset[int]) -> Self:
        chosen = frozenset(int(day) for day in days)
        if not chosen:
            raise EngineError("calendar_weekdays_empty")
        if not chosen <= _ALL_WEEKDAYS:
            raise EngineError("calendar_weekdays_out_of_range")
        return cls(mode=CalendarMode.WEEKDAYS, days=chosen)

    @classmethod
    def daily(cls) -> Self:
        return cls(mode=CalendarMode.WEEKDAYS, days=_ALL_WEEKDAYS)

    @classmethod
    def interval(cls, interval_days: int) -> Self:
        if interval_days < 1:
            raise EngineError("calendar_interval_below_one")
        return cls(mode=CalendarMode.INTERVAL, interval_days=int(interval_days))

    @classmethod
    def odd(cls) -> Self:
        return cls(mode=CalendarMode.PARITY, parity=Parity.ODD)

    @classmethod
    def even(cls) -> Self:
        return cls(mode=CalendarMode.PARITY, parity=Parity.EVEN)

    @classmethod
    def from_config(cls, config: dict[str, Any]) -> Self:
        """Build from stored data, ignoring keys foreign to the chosen mode."""
        try:
            mode = CalendarMode(config.get("mode"))
        except ValueError as err:
            raise EngineError("calendar_unknown_mode") from err
        if mode is CalendarMode.WEEKDAYS:
            return cls.weekdays(config.get("days", _ALL_WEEKDAYS))
        if mode is CalendarMode.INTERVAL:
            return cls.interval(int(config.get("interval_days", 1)))
        try:
            parity = Parity(config["parity"])
        except (KeyError, ValueError) as err:
            raise EngineError("calendar_unknown_parity") from err
        return cls(mode=CalendarMode.PARITY, parity=parity)

    def to_config(self) -> dict[str, Any]:
        """The stored shape: only the keys of the active mode."""
        if self.mode is CalendarMode.WEEKDAYS:
            return {"mode": str(self.mode), "days": sorted(self.days)}
        if self.mode is CalendarMode.INTERVAL:
            return {"mode": str(self.mode), "interval_days": self.interval_days}
        assert self.parity is not None
        return {"mode": str(self.mode), "parity": str(self.parity)}


def calendar_allows(calendar: ProgramCalendar, day: date, last_completed: date | None) -> bool:
    """Whether the program's calendar permits running on ``day``.

    ``last_completed`` is the program's own last watering day and only matters
    in INTERVAL mode. It is per program, not per zone: two programs of the same
    zone each keep their own cadence.
    """
    if calendar.mode is CalendarMode.WEEKDAYS:
        return day.weekday() in calendar.days
    if calendar.mode is CalendarMode.INTERVAL:
        return is_due(last_completed, day, calendar.interval_days)
    return (day.day % 2 == 1) if calendar.parity is Parity.ODD else (day.day % 2 == 0)
