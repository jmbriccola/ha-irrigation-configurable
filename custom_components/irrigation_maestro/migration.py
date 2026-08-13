"""Config-entry migration v1 -> v2: the unified schedule model.

Before 2.0.0 a watering day was the AND of up to four separate mechanisms —
a per-program weekday grid, a per-zone cadence, and the hub's allowed weekdays
and odd/even parity — each editable on a different screen and each skipping
silently. This rewrite gives every program exactly one calendar.

Where a combination is expressible in the new model, the migration preserves
the watering days exactly. Where it is not, it keeps the delivered water
volume unchanged and returns a note, which the caller turns into a repair
issue: the user is told what was dropped rather than discovering it in a dry
flower bed.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from . import const
from .engine.curves import CurveError
from .models import resolve_curve

_ALL_WEEKDAYS = frozenset(range(7))


@dataclass(frozen=True, slots=True)
class MigrationNote:
    """One thing the migration could not carry over, for a repair issue."""

    kind: str
    zone_name: str
    program_name: str
    detail: dict[str, Any] = field(default_factory=dict)


def _meaningful_grid(raw: Any) -> frozenset[int] | None:
    """The grid, or None when it constrains nothing."""
    if raw is None:
        return None
    grid = frozenset(int(day) for day in raw)
    if not grid or grid >= _ALL_WEEKDAYS:
        return None
    return grid


def migrate_zone_v1_to_v2(
    zone_data: dict[str, Any], hub_restrictions: dict[str, Any] | None
) -> tuple[dict[str, Any], list[MigrationNote]]:
    """Rewrite one zone subentry. Returns the new data and what was dropped."""
    zone = dict(zone_data)
    notes: list[MigrationNote] = []
    zone_name = str(zone.get(const.CONF_ZONE_NAME, "?"))

    interval = int(zone.pop(const.CONF_INTERVAL_DAYS, const.DEFAULT_INTERVAL_DAYS))
    zone_season = zone.pop(const.CONF_ZONE_SEASON_MONTHS, None)
    if zone.pop(const.CONF_ZONE_RESTRICTIONS, None) is not None:
        notes.append(MigrationNote("zone_restrictions_dropped", zone_name, ""))

    restrictions = hub_restrictions or {}
    allowed_raw = restrictions.get(const.CONF_ALLOWED_WEEKDAYS)
    allowed = frozenset(int(day) for day in allowed_raw) if allowed_raw else None
    parity = restrictions.get(const.CONF_PARITY)

    cycles: list[dict[str, Any]] = []
    for raw_cycle in zone.get(const.CONF_CYCLES, []):
        cycle = dict(raw_cycle)
        if const.CONF_CALENDAR in cycle:
            # Already migrated. Re-running must never rewrite a calendar the
            # user has since chosen — the migration has to be idempotent.
            cycles.append(cycle)
            continue
        name = str(cycle.get(const.CONF_CYCLE_NAME, cycle.get(const.CONF_CYCLE_ID, "?")))
        grid = _meaningful_grid(cycle.pop(const.CONF_CYCLE_DAYS, None))

        # Season: an explicit per-program override wins over the zone value.
        override = cycle.pop(const.CONF_MONTHS_OVERRIDE, None)
        season = override if override is not None else zone_season
        if season is not None:
            cycle[const.CONF_SEASON_MONTHS] = sorted(int(month) for month in season)

        if grid is not None:
            if interval > 1:
                notes.append(
                    MigrationNote("cadence_dropped", zone_name, name, {"interval_days": interval})
                )
            if parity:
                notes.append(MigrationNote("parity_dropped", zone_name, name, {"parity": parity}))
            effective = grid & allowed if allowed is not None else grid
            if not effective:
                # It never ran: the grid and the hub limit never overlapped.
                cycle[const.CONF_CYCLE_ENABLED] = False
                cycle[const.CONF_CALENDAR] = {"mode": "weekdays", "days": sorted(grid)}
                notes.append(MigrationNote("program_disabled", zone_name, name))
                cycles.append(cycle)
                continue
            cycle[const.CONF_CALENDAR] = {"mode": "weekdays", "days": sorted(effective)}
        elif interval > 1:
            # "every N days, but only on these weekdays" has no single mode.
            # Keep the cadence (same water volume) and report the lost limit.
            if allowed is not None:
                notes.append(
                    MigrationNote("weekdays_dropped", zone_name, name, {"allowed": sorted(allowed)})
                )
            if parity:
                notes.append(MigrationNote("parity_dropped", zone_name, name, {"parity": parity}))
            cycle[const.CONF_CALENDAR] = {"mode": "interval", "interval_days": interval}
        elif parity:
            cycle[const.CONF_CALENDAR] = {"mode": "parity", "parity": parity}
        else:
            days = sorted(allowed) if allowed is not None else sorted(_ALL_WEEKDAYS)
            cycle[const.CONF_CALENDAR] = {"mode": "weekdays", "days": days}

        cycles.append(cycle)

    zone[const.CONF_CYCLES] = cycles
    return zone, notes


def migrate_hub_restrictions(restrictions: dict[str, Any] | None) -> dict[str, Any]:
    """Hours only from 2.0.0: days are a program calendar decision."""
    if not restrictions:
        return {}
    windows = restrictions.get(const.CONF_FORBIDDEN_WINDOWS)
    return {const.CONF_FORBIDDEN_WINDOWS: windows} if windows else {}


def migrate_last_completed(
    stored: dict[str, str], zone_programs: dict[str, list[str]]
) -> dict[str, str]:
    """Re-key the watering marker from per zone to per program.

    Every program of a zone inherits the zone's day, so all of them come due
    at the same moment right after the upgrade — which is what happened before.
    """
    migrated: dict[str, str] = {}
    for zone_id, day in stored.items():
        if ":" in zone_id:  # already migrated
            migrated[zone_id] = day
            continue
        for program_id in zone_programs.get(zone_id, []):
            migrated[f"{zone_id}:{program_id}"] = day
    return migrated


def migrate_zone_v2_to_v3(
    zone_data: dict[str, Any], templates: dict[str, Any]
) -> tuple[dict[str, Any], list[MigrationNote]]:
    """Rewrite one zone subentry for v3: curves become explicit points.

    Presets left the user interface in 3.0.0, so a stored reference is a form
    nobody can create or inspect any more. Materialising it is lossless — the
    points written are exactly the preset's — and leaves one convention in
    user data, which is what stops a reference being silently replaced.
    """
    zone = dict(zone_data)
    notes: list[MigrationNote] = []
    zone_name = str(zone.get(const.CONF_ZONE_NAME, ""))
    cycles: list[dict[str, Any]] = []
    for raw_cycle in zone.get(const.CONF_CYCLES, []):
        cycle = dict(raw_cycle)
        name = str(cycle.get(const.CONF_CYCLE_NAME, ""))
        curve = dict(cycle.get(const.CONF_CURVE, {}))
        if const.CONF_CURVE_TEMPLATE in curve:
            try:
                resolved = resolve_curve(curve, templates)
            except CurveError:
                # Never guess a duration: keep the reference and report it.
                notes.append(
                    MigrationNote(
                        "curve_template_missing",
                        zone_name,
                        name,
                        {"template": curve[const.CONF_CURVE_TEMPLATE]},
                    )
                )
                cycles.append(cycle)
                continue
            cycle[const.CONF_CURVE] = {
                const.CONF_CURVE_POINTS: [[temp, value] for temp, value in resolved.points],
                const.CONF_CURVE_MIN: resolved.min_value,
                const.CONF_CURVE_MAX: resolved.max_value,
                const.CONF_CURVE_KIND: str(resolved.kind),
            }
        cycles.append(cycle)

    zone[const.CONF_CYCLES] = cycles
    return zone, notes
