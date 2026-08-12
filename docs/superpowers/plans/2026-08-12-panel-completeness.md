# Panel Completeness (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After first-run setup, every setting except the weather decision engine is configured from the irrigation panel.

**Architecture:** Five new section-shaped services cover the eighteen settings that today have no service at all. Each builds a complete options dict from `dict(entry.options)` and hands it to the existing `_write_hub_options`, which validates through `HubConfig.from_options` before persisting. The panel gains a Notifications section and two collapsed Advanced drawers; the config-flow options menu drops what the panel now covers.

**Tech Stack:** Python 3.13+, Home Assistant custom integration, `pytest` + `pytest-homeassistant-custom-component`, `ruff`, `mypy --strict`. Frontend is Lit + TypeScript in `card/`, tested with `vitest`.

**Spec:** `docs/superpowers/specs/2026-08-12-panel-completeness-design.md`

## Global Constraints

- Code, comments, docstrings and README in **English**. UI strings go in **both** `translations/en.json` and `translations/it.json`, and both files must stay key-for-key identical.
- **No changes to the weather decision engine** and **no changes to the v2.0.0 scheduling model**.
- Everything async, no blocking I/O, no YAML configuration.
- Entity `unique_id`s must not change.
- Verification before every commit — all four, because mypy was missed in Phase 1 and CI caught it:
  ```
  .venv/bin/python -m pytest -p no:logging
  .venv/bin/mypy
  .venv/bin/python -m ruff check . && .venv/bin/python -m ruff format --check .
  cd card && npm test && npx tsc --noEmit && npm run build
  ```
- Target version **2.1.0** (minor, additive). Bump `manifest.json` in the final task only.
- Every service field is optional; absent means unchanged. Failures raise `ServiceValidationError` with a translation key.

---

## File Structure

**Modified**
- `custom_components/irrigation_maestro/services.py` — five new services, their schemas and handlers.
- `custom_components/irrigation_maestro/services.yaml` — their selectors.
- `custom_components/irrigation_maestro/config_flow.py` — options menu reduced.
- `custom_components/irrigation_maestro/translations/{en,it}.json`.
- `card/src/panel/settings-view.ts` — Notifications section, two Advanced drawers.
- `card/src/panel/program-editor.ts` — soak/volume fields, enable toggle.
- `card/src/panel/program-list.ts` — toggle degrades visibly.
- `card/src/panel/panel.ts` — wire the new save events to the new services.
- `card/src/panel/config-read.ts` — types for the newly-read options.
- `card/src/localize/{en,it}.ts`.
- `README.md`, `CHANGELOG.md`, `manifest.json`.

**Created**
- `tests/components/test_services_settings.py` — the five services.

---

### Task 1: `set_session_limits`, `set_valve_safety`, `set_concurrency`

Three services with the same shape, so they share one task and one test file.

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py`
- Modify: `custom_components/irrigation_maestro/services.yaml`
- Test: `tests/components/test_services_settings.py`

**Interfaces:**
- Consumes: `_loaded_entry(hass)`, `_write_hub_options(hass, entry, options)` (existing, `services.py:440`).
- Produces: `SERVICE_SET_SESSION_LIMITS`, `SERVICE_SET_VALVE_SAFETY`, `SERVICE_SET_CONCURRENCY` and a shared `_patch_hub_options(call, mapping)` helper taking `{attr_name: conf_key}`.

- [ ] **Step 1: Write the failing tests**

```python
"""The settings services behind the panel's Advanced drawers."""

import pytest
import voluptuous as vol
from custom_components.irrigation_maestro.const import DOMAIN
from homeassistant.core import HomeAssistant

from .test_session import setup_hub, zone_data


async def test_session_limits_writes_only_what_it_is_given(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")], {"session_max_min": 90})
    await hass.services.async_call(
        DOMAIN, "set_session_limits", {"wait_free_min": 7}, blocking=True
    )
    assert entry.options["wait_free_min"] == 7
    assert entry.options["session_max_min"] == 90  # untouched


async def test_session_limits_rejects_out_of_range(hass: HomeAssistant) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises(vol.Invalid):
        await hass.services.async_call(
            DOMAIN, "set_session_limits", {"session_max_min": 0}, blocking=True
        )


async def test_valve_safety_round_trips(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN,
        "set_valve_safety",
        {"open_confirm_s": 12, "close_confirm_s": 20, "watchdog_max_min": 45},
        blocking=True,
    )
    assert entry.options["open_confirm_s"] == 12
    assert entry.options["close_confirm_s"] == 20
    assert entry.options["watchdog_max_min"] == 45


async def test_concurrency_round_trips(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN,
        "set_concurrency",
        {"max_concurrent": 2, "compatibility_groups": "drip,lawn"},
        blocking=True,
    )
    assert entry.options["max_concurrent"] == 2
    assert entry.options["compatibility_groups"] == "drip,lawn"


async def test_settings_apply_without_a_reload(hass: HomeAssistant) -> None:
    # §5: config changes are applied in place, never by reloading the entry.
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN, "set_concurrency", {"max_concurrent": 3}, blocking=True
    )
    await hass.async_block_till_done()
    assert entry.runtime_data.hub.max_concurrent == 3
```

- [ ] **Step 2: Run to verify they fail**

Run: `.venv/bin/python -m pytest tests/components/test_services_settings.py -p no:logging`
Expected: FAIL — `Service set_session_limits not found`.

- [ ] **Step 3: Implement**

In `services.py`, add the three `SERVICE_*` names and the ATTR constants for each field, then one shared helper:

```python
def _patch_hub_options(call: ServiceCall, mapping: dict[str, str]) -> None:
    """Apply the fields present in the call to the hub options.

    Absent means unchanged, matching update_zone. The complete dict goes
    through _write_hub_options, which validates it via HubConfig.from_options
    before anything is persisted.
    """
    hass = call.hass
    entry = _loaded_entry(hass)
    options = dict(entry.options)
    for attr, conf_key in mapping.items():
        if attr in call.data:
            options[conf_key] = call.data[attr]
    _write_hub_options(hass, entry, options)
```

Each handler is then one line, e.g.:

```python
async def _async_set_session_limits(call: ServiceCall) -> None:
    _patch_hub_options(call, _SESSION_LIMIT_KEYS)
```

with `_SESSION_LIMIT_KEYS = {ATTR_SESSION_MAX_MIN: const.CONF_SESSION_MAX_MIN, ...}`.
Schemas use `vol.Optional` with these ranges: `session_max_min` 1–1440,
`must_finish_by` `cv.string` (HH:MM), `wait_free_min` 0–120,
`manual_block_min` 0–1440, `settle_pause_s` 0–600, `sentinel_time`
`cv.string`, `open_confirm_s`/`close_confirm_s`/`switch_confirm_s` 1–300,
`startup_valve_timeout_s` 1–600, `watchdog_max_min` 1–1440,
`max_concurrent` 1–10, `compatibility_groups` `cv.string`,
`master_pre_open_s`/`master_post_close_s` 0–600.

Register all three in `async_setup_services`, and mirror every field in
`services.yaml` with matching selectors.

- [ ] **Step 4: Run the tests**

Run: `.venv/bin/python -m pytest tests/components/test_services_settings.py -p no:logging`
Expected: PASS.

- [ ] **Step 5: Full verification and commit**

```bash
git add custom_components/irrigation_maestro/services.py custom_components/irrigation_maestro/services.yaml tests/components/test_services_settings.py
git commit -m "feat(services): session limits, valve safety and concurrency

Eighteen settings had no service at all and existed only inside config-flow
steps, which is what forced a user out of the dashboard. Three of the five
that close the gap; absent fields mean unchanged."
```

---

### Task 2: `set_notifications`

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py`, `services.yaml`
- Test: `tests/components/test_services_settings.py`

**Interfaces:**
- Produces: `set_notifications(event, enabled?, services?)`. One event per call, so the nested structure never has to be posted whole.

- [ ] **Step 1: Write the failing test**

```python
async def test_notifications_updates_one_event_only(hass: HomeAssistant) -> None:
    entry = await setup_hub(
        hass,
        [zone_data("Pots", "valve.pots")],
        {"notifications": {"completed": {"enabled": True, "services": ["notify.a"]}}},
    )
    await hass.services.async_call(
        DOMAIN,
        "set_notifications",
        {"event": "anomaly", "enabled": True, "services": ["notify.b"]},
        blocking=True,
    )
    stored = entry.options["notifications"]
    assert stored["anomaly"] == {"enabled": True, "services": ["notify.b"]}
    assert stored["completed"] == {"enabled": True, "services": ["notify.a"]}


async def test_notifications_can_disable_an_event(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN, "set_notifications", {"event": "skipped", "enabled": False}, blocking=True
    )
    assert entry.options["notifications"]["skipped"]["enabled"] is False


async def test_notifications_rejects_an_unknown_event(hass: HomeAssistant) -> None:
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises(vol.Invalid):
        await hass.services.async_call(
            DOMAIN, "set_notifications", {"event": "not_an_event"}, blocking=True
        )
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/python -m pytest tests/components/test_services_settings.py -p no:logging -k notifications`
Expected: FAIL — service not found.

- [ ] **Step 3: Implement**

Read the valid event names from `notify.py` (`EVENT_COMPLETED`, `EVENT_SKIPPED`, `EVENT_ANOMALY`, `EVENT_CANCELLED`, `EVENT_INTERRUPTED`, `EVENT_WATCHDOG`, `EVENT_SENTINEL`, `EVENT_SESSION_OVERRUN`, `EVENT_CONSUMPTION_BUDGET`) and build `vol.In(...)` from them, so a renamed event cannot drift out of sync. The handler deep-copies `options["notifications"]`, updates only the named event's sub-dict, and writes back through `_write_hub_options`.

- [ ] **Step 4: Run the tests, then full verification**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(services): per-event notification settings

One event per call, so a caller never has to post the whole nested structure
back and cannot clobber the events it did not mean to touch."
```

---

### Task 3: `set_program_advanced`

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py`, `services.yaml`
- Test: `tests/components/test_services.py`

**Interfaces:**
- Consumes: `_program_context(call)` and `_update_cycle(hass, entry, zone_id, program_id, mutate)` (existing).
- Produces: `set_program_advanced(zone_id, program_id, soak_max_run_min?, soak_pause_min?, volume_safety_timeout_min?)`.

- [ ] **Step 1: Write the failing test**

```python
async def test_set_program_advanced_round_trips(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    await hass.services.async_call(
        DOMAIN,
        "set_program_advanced",
        {
            "zone_id": zone_id,
            "program_id": "cy_pots",
            "soak_max_run_min": 10,
            "soak_pause_min": 15,
        },
        blocking=True,
    )
    cycle = entry.runtime_data.zones[zone_id].config.cycle("cy_pots")
    assert cycle.soak_max_run_min == 10
    assert cycle.soak_pause_min == 15


async def test_soak_pause_without_a_max_run_is_rejected(hass: HomeAssistant) -> None:
    # A pause with nothing to pause between is a configuration mistake, not a
    # no-op: the run would never be split.
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    zone_id = entry.runtime_data.zone_ids[0]
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "set_program_advanced",
            {"zone_id": zone_id, "program_id": "cy_pots", "soak_pause_min": 15},
            blocking=True,
        )
```

- [ ] **Step 2: Run to verify it fails.** Expected: service not found.

- [ ] **Step 3: Implement** the handler with a `mutate` that sets each present key, and raise `ServiceValidationError(translation_key="soak_pause_without_max_run")` when a pause arrives with neither a new nor an existing max run.

- [ ] **Step 4: Run the tests, then full verification.**

- [ ] **Step 5: Commit.**

---

### Task 4: Program enable toggle

**Files:**
- Modify: `card/src/panel/program-editor.ts`, `program-list.ts`
- Test: `card/src/panel/program-editor.test.ts` (create)

**Interfaces:**
- Reuses the existing `imc-program-toggle` event and `ProgramToggleDetail`.
- Produces: `renderEnableToggle(switchEntity, on, onToggle)` shared helper exported from `program-list.ts`, or a small `program-toggle.ts` if that reads cleaner.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { toggleState } from "./program-toggle";

describe("toggleState", () => {
  it("reports enabled when the switch is on", () => {
    expect(toggleState({ state: "on" } as never)).toEqual({ on: true, available: true });
  });

  it("reports disabled when the switch is off", () => {
    expect(toggleState({ state: "off" } as never)).toEqual({ on: false, available: true });
  });

  it("stays visible but unavailable when the entity is missing", () => {
    // It used to render nothing at all: no control, no explanation — and the
    // 2.0.0 migration can disable a program and then ask the user to enable it.
    expect(toggleState(undefined)).toEqual({ on: false, available: false });
  });

  it("is unavailable when the entity itself is unavailable", () => {
    expect(toggleState({ state: "unavailable" } as never)).toEqual({
      on: false,
      available: false,
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails.** `cd card && npm test -- program-toggle`

- [ ] **Step 3: Implement** `toggleState` plus a shared render helper. Use it in `program-list.ts` in place of the `${cycleSwitch ? … : nothing}` branch, and add the same control to the program editor's header row. When `available` is false, render the switch visually disabled with the localized text `program.toggle_unavailable` and do not dispatch on click.

- [ ] **Step 4: Add the two localize keys** (`program.toggle_unavailable`) to `card/src/localize/en.ts` and `it.ts`.

- [ ] **Step 5: Run tests, typecheck and build. Commit.**

---

### Task 5: Panel settings view

**Files:**
- Modify: `card/src/panel/settings-view.ts`, `panel.ts`, `config-read.ts`, `card/src/localize/{en,it}.ts`
- Test: `card/src/panel/settings-view.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { buildSessionLimitsPatch, buildValveSafetyPatch } from "./settings-view";

describe("settings patches", () => {
  it("omits fields the user left empty, so absent means unchanged", () => {
    expect(buildSessionLimitsPatch({ sessionMaxMin: undefined, waitFreeMin: 7 })).toEqual({
      wait_free_min: 7,
    });
  });

  it("passes zero through rather than treating it as empty", () => {
    expect(buildValveSafetyPatch({ openConfirmS: 0 })).toEqual({ open_confirm_s: 0 });
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement.** Add a plain **Notifications** section (one row per event: a toggle plus a comma-separated notify-service field) and two `<details>`-style collapsed drawers, **Session and safety** and **Valves and concurrency**, matching the existing `.advanced-toggle` pattern in `program-editor.ts`. Each numeric field shows its unit and its default in the hint line. Export the pure `build*Patch` helpers for the tests. Emit `imc-settings-save-session-limits`, `imc-settings-save-valve-safety`, `imc-settings-save-concurrency`, `imc-settings-save-notifications`; wire them in `panel.ts` to the matching services and reuse the existing success-toast path. Extend `config-read.ts` `HubOptions` with the newly-read keys.

- [ ] **Step 4: Run tests, typecheck, build. Commit.**

---

### Task 6: Program editor advanced fields

**Files:**
- Modify: `card/src/panel/program-editor.ts`, `panel.ts`

- [ ] **Step 1: Write the failing test**

```typescript
it("omits advanced fields the user did not set", () => {
  expect(buildAdvancedPatch({ soakMaxRunMin: 10, soakPauseMin: undefined })).toEqual({
    soak_max_run_min: 10,
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement.** Add soak max run, soak pause and volume safety timeout to the existing Advanced drawer, beside the curve editor. Emit `imc-program-save-advanced`; wire it in `panel.ts` to `set_program_advanced`. Show the volume timeout only for volume-mode programs, mirroring how the editor already hides minutes for them.

- [ ] **Step 4: Run tests, typecheck, build. Commit.**

---

### Task 7: Config flow retires

**Files:**
- Modify: `custom_components/irrigation_maestro/config_flow.py`
- Test: `tests/components/test_config_flow.py`

- [ ] **Step 1: Write the failing test**

```python
async def test_options_menu_only_offers_the_weather_engine(hass, hub_entry):
    result = await hass.config_entries.options.async_init(hub_entry.entry_id)
    assert result["type"] is FlowResultType.MENU
    # Everything else moved to the panel; one editor per setting.
    assert set(result["menu_options"]) == {"engine_advanced"}


async def test_first_run_and_zone_creation_still_work(hass):
    # The config flow keeps exactly what the panel cannot do before the
    # integration exists.
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement.** Remove `general`, `safety`, `restrictions`, `notifications`, `notifications_event` and `consumption_budget` from the options menu and delete their now-unreachable steps. Keep `async_step_init` (menu), `engine_advanced`, the whole zone subentry flow and the first-run `user` step.

- [ ] **Step 4: Run the full Python suite, mypy and ruff. Commit.**

---

### Task 8: Translations, docs and release

**Files:**
- Modify: `custom_components/irrigation_maestro/translations/{en,it}.json`
- Modify: `README.md`, `CHANGELOG.md`, `MEMORY.md`, `manifest.json`

- [ ] **Step 1: Translations.** Add `services.*` name/description entries for the five new services and every field, plus the `soak_pause_without_max_run` exception. Remove the entries for the deleted config-flow steps. Verify both files are key-for-key identical:

```bash
.venv/bin/python - <<'PY'
import json, itertools
def keys(o, p=""):
    if isinstance(o, dict):
        return set(itertools.chain.from_iterable(keys(v, f"{p}.{k}") for k, v in o.items())) or {p}
    return {p}
en = keys(json.load(open("custom_components/irrigation_maestro/translations/en.json")))
it = keys(json.load(open("custom_components/irrigation_maestro/translations/it.json")))
assert en == it, (sorted(en - it), sorted(it - en))
print("parity ok:", len(en), "keys")
PY
```

- [ ] **Step 2: Docs.** README: state that the panel configures everything after setup and the config flow covers first run, zones and the weather engine. MEMORY.md: record that each setting has exactly one editor, and that services are the recovery path when the panel cannot load.

- [ ] **Step 3: Changelog.** A `## [2.1.0]` section under **Added**, leading with what the user gains: session/safety/valve/concurrency/notification settings and per-program soak now editable from the dashboard, and a program enable toggle in the editor that no longer vanishes when the entity is missing.

- [ ] **Step 4: Bump** `manifest.json` to `2.1.0`. Confirm `hacs.json` still carries no version.

- [ ] **Step 5: Full verification, then commit.**

---

## Self-Review

**Spec coverage.** D1 → Tasks 1–3. D2 → Task 5. D3 → Task 7. D4 → covered by Tasks 1–3 existing at all, and stated in Task 8's MEMORY.md note. D5 → Task 4. The eighteen settings: general (4) → Task 1 `set_concurrency`; safety (11) → Task 1 `set_session_limits` + `set_valve_safety`; notifications → Task 2; program (3) → Tasks 3 and 6.

**Placeholders.** None: every code step carries real code or an exact edit description naming the file and the symbols involved.

**Type consistency.** `_patch_hub_options(call, mapping)` keeps one signature across Tasks 1 and 2. `toggleState(entity | undefined) -> {on, available}` matches between Task 4's test and both consumers. The `build*Patch` helpers return snake_case service payloads in Tasks 5 and 6, matching the schemas defined in Tasks 1–3.

**Ordering.** Tasks 1–3 must precede 5–6: the panel calls services that have to exist. Task 7 must come last of the behavioural tasks — removing the config-flow steps before the panel can edit those settings would leave them unreachable in between.
