# Panel completeness (Phase 2) — design

Date: 2026-08-12
Status: approved for planning
Target: v2.1.0 (additive, no breaking changes)
Follows: `2026-08-12-unified-schedule-model-design.md` (Phase 1, shipped as v2.0.0)

## Goal

After the initial setup, everything is configured from the irrigation panel.
The config flow retires to first-run setup, zone creation, and the weather
decision engine.

## What is still outside the panel

Confirmed against `main` at v2.0.0. Eighteen settings have **no service at
all** — they exist only inside config-flow steps, which is what forces a user
out of the dashboard:

**Hub — general** (4): `max_concurrent`, `compatibility_groups`,
`master_pre_open_s`, `master_post_close_s`

**Hub — safety** (11): `session_max_min`, `must_finish_by`, `wait_free_min`,
`manual_block_min`, `settle_pause_s`, `sentinel_time`, `open_confirm_s`,
`close_confirm_s`, `switch_confirm_s`, `startup_valve_timeout_s`,
`watchdog_max_min`

**Hub — notifications** (1 nested structure): per-event enable plus the
notify services to call

**Program** (3): `soak_max_run_min`, `soak_pause_min`,
`volume_safety_timeout_min`

Out of scope by decision: the weather decision engine (weights, thresholds,
budget, curves) is field-validated and stays in the config flow.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Five new services, one per real concept. | Mirrors the existing section-shaped services (`set_weather_sources`, `set_consumption_budget`, `set_restrictions`) and keeps per-field schema validation, which one generic `set_option` would lose. |
| D2 | Installer parameters live behind collapsed **Advanced** drawers in the panel. | Everything is reachable, but eleven safety fields sitting open next to everyday settings invite accidental edits. Same affordance the zone editor already uses. |
| D3 | The config-flow **options menu drops everything the panel now covers**. | One editor per setting. This is not the Phase 1 two-sources-of-truth problem — both surfaces would write the same stored value — but it is duplicated surface to maintain and contradicts the goal. |
| D4 | Services are the escape hatch, not a second UI. | If the panel fails to load, every setting stays reachable from Developer Tools → Actions. That is the normal Home Assistant recovery path. |
| D5 | The program enable toggle also lives in the program editor, and degrades visibly. | See below. |

### Services

| Service | Fields |
|---|---|
| `set_session_limits` | `session_max_min`, `must_finish_by`, `wait_free_min`, `manual_block_min`, `settle_pause_s`, `sentinel_time` |
| `set_valve_safety` | `open_confirm_s`, `close_confirm_s`, `switch_confirm_s`, `startup_valve_timeout_s`, `watchdog_max_min` |
| `set_concurrency` | `max_concurrent`, `compatibility_groups`, `master_pre_open_s`, `master_post_close_s` |
| `set_notifications` | `event`, `enabled`, `services` — one event per call, so the nested structure never has to be posted whole |
| `set_program_advanced` | `zone_id`, `program_id`, `soak_max_run_min`, `soak_pause_min`, `volume_safety_timeout_min` |

Every field is optional and absent means unchanged, matching `update_zone`.
Each service validates its own ranges and raises `ServiceValidationError` with
a translation key, never a bare exception.

### Panel

The settings view gains one plain section — **Notifications**, which is
everyday configuration — and two collapsed drawers: **Session and safety** and
**Valves and concurrency**. Each field shows its unit and its default, so a
user can tell what "empty" means before changing it.

The program editor's existing Advanced drawer gains the soak and volume
fields, next to the curve controls already there.

### The program enable toggle

A toggle already exists in the program list, backed by the `cycle_enabled`
switch entity, with `role="switch"` and keyboard support. Two gaps make it
insufficient:

1. **It is absent from the program editor** — the screen you land on when you
   click ✎, and the natural place to disable the program you are looking at.
2. **It disappears silently when the switch entity is not found**
   (`${cycleSwitch ? … : nothing}`): no control and no explanation. This
   matters more after v2.0.0, because the migration *disables* programs whose
   calendar could never water, and the repair issue tells the user to enable
   them again.

Both are fixed: the editor gets the same toggle, and when the entity is
missing both surfaces render a disabled control with a short explanation
instead of rendering nothing.

## Non-goals

- No change to the weather decision engine.
- No change to the scheduling model shipped in v2.0.0.
- Runtime operations (run now, pause, skip today, suspend) stay in the
  Lovelace card. The panel remains configuration-only.

## Testing

- One test per service: it writes the option, rejects out-of-range values with
  a translation key, and leaves absent fields untouched.
- `set_notifications` round-trips one event without disturbing the others.
- `set_program_advanced` round-trips soak and volume fields and rejects a soak
  pause without a soak max run.
- Panel unit tests for the drawer state and for the toggle's degraded
  rendering when the switch entity is absent.
- A config-flow test asserting the options menu no longer offers the migrated
  sections, and that first-run setup plus zone creation still work.
- The full v2.0.0 suite stays green; the §8 weather regression suite is
  untouched.

## Rollout

v2.1.0, additive. No migration: the stored option keys and their shapes do not
change — only which surfaces can edit them.
