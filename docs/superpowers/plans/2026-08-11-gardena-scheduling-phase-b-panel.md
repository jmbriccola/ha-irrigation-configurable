# Gardena Scheduling — Phase B (Sidebar Panel & UX) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the "Irrigazione" sidebar panel — a classic-controller experience (weekly-day grid, per-day durations, start time, guided wizard, advanced drawer) that consumes the Phase A backend — and release it as v1.2.0.

**Architecture:** A new custom sidebar panel (`panel_custom.async_register_panel`) serves a second Vite bundle `irrigation-maestro-panel.js` defining a top-level `<irrigation-maestro-panel>` Lit element. The panel reuses the card's building blocks (`discovery.ts`, `types.ts`, `curve-math.ts`, `curve-editor.ts`, `curve-sparkline.ts`, `localize/*`, `format.ts`) and adds panel-only components (program list, program editor with weekday grid + per-day steppers + weather line, add-program wizard, advanced drawer). All pure scheduling logic lives in a testable `schedule-math.ts`. The engine is untouched (§8 sacred). The final task bumps to 1.2.0 and updates docs so a push to main cuts a clean release.

**Tech Stack:** Lit 3 + TypeScript + Vite (library mode, ES); Vitest; Home Assistant 2026.7 custom panel (`panel_custom`/`frontend`); Python (pytest-homeassistant-custom-component) for registration.

## Global Constraints

- **HA panel registration (2026.7.2, verified):** register with `await panel_custom.async_register_panel(hass, frontend_url_path="irrigation", webcomponent_name="irrigation-maestro-panel", sidebar_title="Irrigazione", sidebar_icon="mdi:sprinkler-variant", module_url=f"{FRONTEND_URL_BASE}/{PANEL_FILENAME}?v={version}", embed_iframe=False, trust_external=False, require_admin=False)`. Unregister with `frontend.async_remove_panel(hass, "irrigation")` (sync `@callback`, no `await`). Guard double-registration with a `hass.data` flag mirroring `resources.py`'s `_REGISTERED_KEY`.
- **manifest `dependencies`** must become `["frontend", "http", "lovelace", "panel_custom"]` (hassfest requires directly-imported integrations be declared).
- **Panel element contract:** HA sets `.hass`, `.narrow`, `.route`, `.panel` properties on the element; `config` passed at registration surfaces as `.panel.config`. The element must be registered via `customElements.define("irrigation-maestro-panel", …)` in the served module.
- **Weekday encoding:** `0 = Monday … 6 = Sunday` (matches backend `date.weekday()` / `days` field).
- **§8 is sacred:** Phase B changes NO engine/Python decision logic. Backend touches are limited to `panel.py`, `const.py` (PANEL_FILENAME), `__init__.py` wiring, `manifest.json`, docs, translations.
- **Backend contract already live (Phase A):** services `set_program_schedule`, `set_program_minutes`, `add_program`(→`{program_id}`), `remove_program`, `rename_program`; the `ZoneStateSensor` `cycles[]` attribute already carries `days` (list|null), `day_minutes` (`{ "wd": min }`|null), `amount` (int|null), `heat` (int|null) per program, plus `cycle_id`, `name`, `enabled`, `trigger`, `curve`.
- **Terminology:** user-facing "ciclo" → **"programma"** (card + config-flow strings + panel). Internal keys unchanged.
- **Copy:** use the exact IT/EN strings from spec §7 (`docs/superpowers/specs/2026-08-11-panel-gardena-scheduling-design.md`). Mockups to match: `docs/superpowers/specs/2026-08-11-panel-gardena-scheduling-design.md` §1 (the brainstorm mockups it references).
- **Vite (two INDEPENDENT single-entry builds — do NOT use a multi-entry `lib.entry` map):** a multi-entry lib build makes Rollup factor any module imported by both entries (e.g. `curve-editor.ts`, which both reuse) into a shared **content-hashed** chunk (`curve-editor-<hash>.js`). That third file is not committed, and CI's `git diff --exit-code` only checks *tracked* files, so it would ship a bundle with a static `import` to a missing file → 404 at load. Instead build each bundle from its OWN single-entry config so each is fully self-contained: `card/vite.config.ts` (card) + `card/vite.panel.config.ts` (panel), and `npm run build` runs `vite build && vite build --config vite.panel.config.ts`. Both keep `outDir ../custom_components/irrigation_maestro/frontend`, `emptyOutDir:false`. CI `card` job runs `npm ci && npm run build && npm run test` then `git diff --exit-code custom_components/irrigation_maestro/frontend/` — which is correct ONLY because each bundle is self-contained (no shared hashed chunk).
- **CI green:** ruff, ruff format, mypy strict, pytest, hassfest; card `tsc --noEmit`, vitest, build, bundle-in-sync.
- **Release:** the FINAL task bumps `manifest.json` to `1.2.0`, updates CHANGELOG + docs, rebuilds bundles. Earlier tasks do NOT bump the version.

**Reusable card modules (do not rewrite):** `discovery.ts` (`discover(hass)`, `ZoneBundle`), `types.ts` (helpers `asNumber/asString/asArray/isUnavailable/clamp/defineElement`, `HomeAssistant`, `CycleInfo`), `curve-math.ts` (`pointsFromSemantic`, `curveValue`, `roundHalfEven`, `semanticFromPoints`, `COOL/MILD/HOT`), `curve-editor.ts` (`imc-curve-editor`, props `.cycle`/`.weightedTemp`, events `imc-curve-save`/`imc-curve-cancel`), `curve-sparkline.ts`, `format.ts` (`describeTrigger`, `formatRelative`), `localize/localize.ts` (`pickLanguage`, `localize`, `localizeDynamic`). The hass/service pattern to copy from `card.ts`: `@property({attribute:false}) hass`, a `shouldUpdate` gate, a private `_call(domain, service, data)` wrapper that catches errors into a transient `_error` state, and child components dispatching **bubbling composed** `CustomEvent`s handled at the root.

---

## File Structure

**Backend (Python):**
- Create `custom_components/irrigation_maestro/panel.py` — panel registration/unregistration.
- Modify `custom_components/irrigation_maestro/const.py` — add `PANEL_FILENAME`.
- Modify `custom_components/irrigation_maestro/__init__.py` — register on setup, unregister on unload.
- Modify `custom_components/irrigation_maestro/manifest.json` — dependencies (+ version bump in final task).
- Test `tests/components/test_panel.py`.

**Frontend build:**
- Modify `card/vite.config.ts` — two-entry output.

**Frontend TS (new, under `card/src/`):**
- `schedule-math.ts` — pure weekday/per-day/weather-line logic (+ `schedule-math.test.ts` vitest).
- `panel/index.ts` — panel entry (imports `./panel`, no customCards).
- `panel/panel.ts` — `<irrigation-maestro-panel>` root (hass plumbing, zone tabs, layout, `_call`).
- `panel/program-list.ts` — `<imc-program-list>` (per-zone program cards + actions).
- `panel/program-editor.ts` — `<imc-program-editor>` (weekday grid, start time, per-day steppers, weather line, advanced drawer).
- `panel/program-wizard.ts` — `<imc-program-wizard>` (3-step add flow).

**Frontend TS (modified):**
- `card/src/types.ts` — `CycleInfo` gains `days`/`day_minutes`/`amount`/`heat`; `REASON_KEYS` gains `day_not_scheduled`; add panel event/action types.
- `card/src/discovery.ts` — add `readCycles(zone)` typed reader.
- `card/src/localize/en.ts`, `it.ts` — panel/wizard copy + `reason.day_not_scheduled` + ciclo→programma.

**Built bundles (committed):** `custom_components/irrigation_maestro/frontend/irrigation-maestro-card.js` (rebuilt), `.../irrigation-maestro-panel.js` (new).

**Docs / release (final task):** `docs/design/card-contract.md`, `INSTRUCTIONS.md`, `docs/it/istruzioni.md`, `README.md`, `CHANGELOG.md`, `manifest.json` (version), config-flow translations for terminology.

**Milestones:** Tasks 1–4 = a reachable, read-only panel in the sidebar (working software). Tasks 5–10 = the editing UX. Tasks 11–12 = terminology + release.

---

### Task 1: Panel registration (backend)

Register the sidebar panel so "Irrigazione" appears in the HA left menu; remove it on unload. The panel JS doesn't exist yet — registration only points at a URL, so this task lands and is testable before the frontend bundle exists.

**Files:**
- Create: `custom_components/irrigation_maestro/panel.py`
- Modify: `custom_components/irrigation_maestro/const.py` (Frontend section, after `CARD_FILENAME`)
- Modify: `custom_components/irrigation_maestro/__init__.py`
- Modify: `custom_components/irrigation_maestro/manifest.json` (dependencies only — NOT version)
- Test: `tests/components/test_panel.py`

**Interfaces:**
- Produces: `const.PANEL_FILENAME = "irrigation-maestro-panel.js"`.
- Produces: `panel.async_register_panel(hass) -> Awaitable[None]`, `panel.async_unregister_panel(hass) -> None`, `panel.PANEL_URL_PATH = "irrigation"`.

- [ ] **Step 1: Write the failing test**

`tests/components/test_panel.py`:

```python
"""Tests for the Irrigation Maestro sidebar panel registration."""

from custom_components.irrigation_maestro.panel import PANEL_URL_PATH
from homeassistant.components.frontend import async_panel_exists
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from .mocks import MockValvePark
from .test_session import mock_weather, setup_hub, zone_data


async def test_panel_registered_on_setup(hass: HomeAssistant) -> None:
    assert await async_setup_component(hass, "frontend", {})
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    assert async_panel_exists(hass, PANEL_URL_PATH)


async def test_panel_removed_on_unload(hass: HomeAssistant) -> None:
    assert await async_setup_component(hass, "frontend", {})
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    assert async_panel_exists(hass, PANEL_URL_PATH)
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert not async_panel_exists(hass, PANEL_URL_PATH)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/components/test_panel.py -v`
Expected: FAIL (`ModuleNotFoundError: ...panel`).

- [ ] **Step 3: Add the const**

In `const.py`, in the `# Frontend` block after `CARD_FILENAME` (line ~157):

```python
PANEL_FILENAME: Final = "irrigation-maestro-panel.js"
```

- [ ] **Step 4: Create `panel.py`**

```python
"""Register the Irrigation Maestro sidebar panel (custom panel)."""

from __future__ import annotations

import logging

from homeassistant.components import panel_custom
from homeassistant.components.frontend import async_remove_panel
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

from .const import DOMAIN, FRONTEND_URL_BASE, PANEL_FILENAME

_LOGGER = logging.getLogger(__name__)

PANEL_URL_PATH = "irrigation"
PANEL_WEBCOMPONENT_NAME = "irrigation-maestro-panel"

_PANEL_REGISTERED_KEY = f"{DOMAIN}_panel_registered"


async def async_register_panel(hass: HomeAssistant) -> None:
    """Register the sidebar panel once per HA instance (idempotent)."""
    if hass.data.get(_PANEL_REGISTERED_KEY):
        return
    hass.data[_PANEL_REGISTERED_KEY] = True

    integration = await async_get_integration(hass, DOMAIN)
    version = integration.version or "0"
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_WEBCOMPONENT_NAME,
        sidebar_title="Irrigazione",
        sidebar_icon="mdi:sprinkler-variant",
        module_url=f"{FRONTEND_URL_BASE}/{PANEL_FILENAME}?v={version}",
        embed_iframe=False,
        trust_external=False,
        require_admin=False,
    )


def async_unregister_panel(hass: HomeAssistant) -> None:
    """Remove the sidebar panel (sync callback — never await)."""
    if not hass.data.pop(_PANEL_REGISTERED_KEY, False):
        return
    async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)
```

- [ ] **Step 5: Wire into `__init__.py`**

Add the import near the top:

```python
from .panel import async_register_panel, async_unregister_panel
```

In `async_setup_entry`, right after `await async_register_frontend(hass)`:

```python
    await async_register_panel(hass)
```

In `async_unload_entry`, inside the `if unload_ok:` block, after `await entry.runtime_data.async_shutdown()`:

```python
        async_unregister_panel(hass)
```

- [ ] **Step 6: Update manifest dependencies**

In `manifest.json`, change `"dependencies"` to (keep version as-is):

```json
"dependencies": ["frontend", "http", "lovelace", "panel_custom"],
```

- [ ] **Step 7: Run tests + full gate**

Run: `.venv/bin/pytest tests/components/test_panel.py -q && .venv/bin/ruff check . && .venv/bin/mypy && .venv/bin/pytest -q`
Expected: PASS (panel registered on setup, removed on unload; existing suite green).

- [ ] **Step 8: Commit**

```bash
git add custom_components/irrigation_maestro/panel.py custom_components/irrigation_maestro/const.py custom_components/irrigation_maestro/__init__.py custom_components/irrigation_maestro/manifest.json tests/components/test_panel.py
git commit -m "feat(panel): register the Irrigazione sidebar panel"
```

---

### Task 2: Second (independent) Vite build + minimal panel element

Emit a second, SELF-CONTAINED bundle `irrigation-maestro-panel.js` via its own single-entry config (see the Vite Global Constraint), defining a minimal `<irrigation-maestro-panel>` that renders a title from `hass`. After this, opening "Irrigazione" in the sidebar shows a (minimal) working page.

**Files:**
- Create: `card/vite.banner.ts` (extract the shared banner plugin)
- Modify: `card/vite.config.ts` (import the shared banner; card entry unchanged)
- Create: `card/vite.panel.config.ts` (panel single-entry build)
- Modify: `card/package.json` (`build` runs both)
- Create: `card/src/panel/index.ts`
- Create: `card/src/panel/panel.ts`
- Build output (commit): `custom_components/irrigation_maestro/frontend/irrigation-maestro-panel.js`

**Interfaces:**
- Produces: custom element `irrigation-maestro-panel` (registered via `defineElement`), a `LitElement` with `@property({attribute:false}) hass`, `@property({type:Boolean}) narrow`, `@property({attribute:false}) route`, `@property({attribute:false}) panel`.

- [ ] **Step 1: Extract the shared banner plugin**

Create `card/vite.banner.ts`:

```ts
import type { Plugin } from "vite";

const banner = `/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
`;

/** Prepend the license banner after minification so it survives esbuild. */
export function bannerPlugin(): Plugin {
  return {
    name: "imc-banner",
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk") chunk.code = banner + chunk.code;
      }
    },
  };
}
```

Refactor `card/vite.config.ts` to import it (`import { bannerPlugin } from "./vite.banner";`) and delete the inline plugin definition — the card `build.lib` block (single entry `src/index.ts` → `irrigation-maestro-card.js`) is otherwise UNCHANGED.

- [ ] **Step 1b: Panel Vite config**

Create `card/vite.panel.config.ts` (its own single-entry build → self-contained bundle):

```ts
import { defineConfig } from "vite";
import { bannerPlugin } from "./vite.banner";

export default defineConfig({
  plugins: [bannerPlugin()],
  build: {
    lib: {
      entry: "src/panel/index.ts",
      formats: ["es"],
      fileName: () => "irrigation-maestro-panel.js",
    },
    outDir: "../custom_components/irrigation_maestro/frontend",
    emptyOutDir: false,
    target: "es2021",
    minify: "esbuild",
    sourcemap: false,
  },
});
```

In `card/package.json`, change the build script:

```json
"build": "vite build && vite build --config vite.panel.config.ts",
```

- [ ] **Step 2: Minimal panel element**

`card/src/panel/panel.ts`:

```ts
import { LitElement, html, css, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import type { HomeAssistant } from "../types";
import { defineElement } from "../types";
import { pickLanguage, localize } from "../localize/localize";

export class IrrigationMaestroPanel extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ type: Boolean }) narrow = false;
  @property({ attribute: false }) route?: unknown;
  @property({ attribute: false }) panel?: unknown;

  @state() private _error?: string;

  static styles = css`
    :host { display: block; height: 100%; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 16px; }
    h1 { font-size: 20px; font-weight: 600; }
  `;

  render(): TemplateResult {
    const lang = pickLanguage(this.hass);
    return html`
      <div class="wrap">
        <h1>${localize(lang, "panel.title")}</h1>
      </div>
    `;
  }
}

defineElement("irrigation-maestro-panel", IrrigationMaestroPanel);
```

`card/src/panel/index.ts`:

```ts
/** Panel entry point: defines the <irrigation-maestro-panel> element. */
import "./panel";
```

- [ ] **Step 3: Add the `panel.title` localize key (temporary minimal set)**

In `card/src/localize/en.ts` add `"panel.title": "Irrigation",` and in `it.ts` add `"panel.title": "Irrigazione",`. (Task 7 adds the rest of the panel copy; en/it must stay key-parity — add to both.)

- [ ] **Step 4: Typecheck, build, verify each bundle is self-contained**

Run (from `card/`): `npm run typecheck && npm run build`
Expected: no TS errors; `custom_components/irrigation_maestro/frontend/` contains EXACTLY `irrigation-maestro-card.js` and `irrigation-maestro-panel.js` — and NO third `*-<hash>.js` chunk. Verify:
Run: `ls custom_components/irrigation_maestro/frontend/` — must show only the two `.js` files (plus any pre-existing non-JS assets). If a hashed chunk appears, the build is wrong (a multi-entry lib config slipped in) — stop and fix the configs.
Run: `git status --porcelain custom_components/irrigation_maestro/frontend/` — no untracked files.

- [ ] **Step 5: Commit (including built bundles + configs)**

```bash
git add card/vite.banner.ts card/vite.config.ts card/vite.panel.config.ts card/package.json card/src/panel/ card/src/localize/en.ts card/src/localize/it.ts custom_components/irrigation_maestro/frontend/irrigation-maestro-card.js custom_components/irrigation_maestro/frontend/irrigation-maestro-panel.js
git commit -m "feat(panel): emit self-contained panel bundle + minimal panel element"
```

---

### Task 3: Contract types + typed cycle reader + day_not_scheduled

Teach the frontend contract about the Phase A fields and the new skip reason, and add a typed reader that turns a zone's raw `cycles[]` attribute into `CycleInfo[]`.

**Files:**
- Modify: `card/src/types.ts`
- Modify: `card/src/discovery.ts`
- Modify: `card/src/localize/en.ts`, `it.ts`
- Test: `card/src/schedule-math.test.ts` will cover the reader indirectly in Task 5; add a focused vitest here.
- Test file: `card/src/discovery.test.ts` (new)

**Interfaces:**
- Produces: `CycleInfo` with `days?: number[]`, `day_minutes?: Record<string, number>`, `amount?: number`, `heat?: number`.
- Produces: `ReasonKey` includes `"day_not_scheduled"`.
- Produces: `readCycles(zone: ZoneBundle): CycleInfo[]` in `discovery.ts`.

- [ ] **Step 1: Write the failing test**

`card/src/discovery.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readCycles } from "./discovery";
import type { ZoneBundle } from "./discovery";

function zoneWithCycles(cycles: unknown): ZoneBundle {
  return {
    zoneId: "z1", name: "Prato", order: 1, cycleSwitches: [],
    state: { entity_id: "sensor.z1", state: "idle", attributes: { cycles } },
  };
}

describe("readCycles", () => {
  it("parses the new schedule fields", () => {
    const cycles = readCycles(zoneWithCycles([
      { cycle_id: "a1", name: "Mattina", enabled: true,
        trigger: { kind: "time", at: "06:30" },
        curve: { points: [[12, 0], [25, 15], [35, 23]], min: 1, max: 60, kind: "duration" },
        days: [0, 2, 4], day_minutes: { "0": 10, "4": 20 }, amount: 15, heat: 8 },
    ]));
    expect(cycles).toHaveLength(1);
    expect(cycles[0]?.days).toEqual([0, 2, 4]);
    expect(cycles[0]?.day_minutes).toEqual({ "0": 10, "4": 20 });
    expect(cycles[0]?.amount).toBe(15);
    expect(cycles[0]?.heat).toBe(8);
  });

  it("tolerates missing schedule fields (day-less program)", () => {
    const cycles = readCycles(zoneWithCycles([{ cycle_id: "a1", name: "X" }]));
    expect(cycles[0]?.days).toBeUndefined();
    expect(cycles[0]?.day_minutes).toBeUndefined();
  });

  it("returns [] when there is no cycles attribute", () => {
    expect(readCycles({ zoneId: "z", name: "z", order: 1, cycleSwitches: [] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (from `card/`): `npx vitest run src/discovery.test.ts`
Expected: FAIL (`readCycles` not exported).

- [ ] **Step 3: Extend `CycleInfo` and `REASON_KEYS` in `types.ts`**

In `types.ts`, extend `CycleInfo` (after `curve?: CycleCurve;`):

```ts
export interface CycleInfo {
  cycle_id?: string;
  name?: string;
  enabled?: boolean;
  trigger?: CycleTrigger;
  curve?: CycleCurve;
  /** Weekdays 0=Mon..6=Sun the program runs; undefined/absent = every day. */
  days?: number[];
  /** Per-weekday base minutes, keyed by weekday-as-string; absent = uniform. */
  day_minutes?: Record<string, number>;
  /** Friendly derived values for a duration curve (null/absent for volume). */
  amount?: number;
  heat?: number;
}
```

Add `"day_not_scheduled"` to `REASON_KEYS` (immediately after `"skip_today_requested"`):

```ts
  "skip_today_requested",
  "day_not_scheduled",
  "consumption_budget",
```

- [ ] **Step 4: Add `readCycles` to `discovery.ts`**

Append to `discovery.ts` (import the helpers it needs at the top: `asArray`, `asNumber`, `asString` are in `types.ts`; add `CycleInfo` to the type import):

```ts
import { asArray, asNumber, asString } from "./types";
import type { CycleInfo } from "./types";

/** Read a zone's programs (cycles) from its state entity attribute, typed. */
export function readCycles(zone: ZoneBundle): CycleInfo[] {
  const raw = asArray(zone.state?.attributes?.["cycles"]);
  const out: CycleInfo[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const c = item as Record<string, unknown>;
    const info: CycleInfo = {
      cycle_id: asString(c["cycle_id"]),
      name: asString(c["name"]),
      enabled: typeof c["enabled"] === "boolean" ? (c["enabled"] as boolean) : undefined,
      trigger: (c["trigger"] as CycleInfo["trigger"]) ?? undefined,
      curve: (c["curve"] as CycleInfo["curve"]) ?? undefined,
    };
    const days = c["days"];
    if (Array.isArray(days)) {
      info.days = days.map((d) => asNumber(d)).filter((d): d is number => d !== undefined);
    }
    const dm = c["day_minutes"];
    if (dm && typeof dm === "object") {
      const map: Record<string, number> = {};
      for (const [k, v] of Object.entries(dm as Record<string, unknown>)) {
        const n = asNumber(v);
        if (n !== undefined) map[k] = n;
      }
      info.day_minutes = map;
    }
    info.amount = asNumber(c["amount"]);
    info.heat = asNumber(c["heat"]);
    out.push(info);
  }
  return out;
}
```

- [ ] **Step 5: Add the localize key to en.ts + it.ts**

en.ts: `"reason.day_not_scheduled": "Not scheduled today",`
it.ts: `"reason.day_not_scheduled": "Non previsto oggi",`

- [ ] **Step 6: Run vitest + typecheck**

Run (from `card/`): `npx vitest run && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add card/src/types.ts card/src/discovery.ts card/src/discovery.test.ts card/src/localize/en.ts card/src/localize/it.ts
git commit -m "feat(panel): contract types + typed readCycles + day_not_scheduled"
```

---

### Task 4: Read-only panel — zone tabs + program list (MILESTONE 1)

Turn the minimal panel into the working read-only experience: zone tabs, and per zone a list of its programs showing name, days, start time, and a minutes summary. After this the panel is genuinely useful (discoverability win) even before editing lands.

**Files:**
- Modify: `card/src/panel/panel.ts`
- Create: `card/src/panel/program-list.ts`
- Build output (commit): both bundles rebuilt.

**Interfaces:**
- Consumes: `discover`, `readCycles`, `ZoneBundle`, `CycleInfo`, `localize`, `describeTrigger`.
- Produces: `<imc-program-list>` with `@property() hass`, `@property() zone: ZoneBundle`.

- [ ] **Step 1: Panel shell with zone tabs**

Rewrite `card/src/panel/panel.ts` `render()` to discover zones, keep a selected-zone `@state`, render tabs, and render `<imc-program-list>` for the selected zone. Follow the card's `discover(hass)` pattern and `shouldUpdate` gate (copy the change-detection approach from `card.ts`). Skeleton:

```ts
import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import type { HomeAssistant } from "../types";
import { defineElement } from "../types";
import { pickLanguage, localize } from "../localize/localize";
import { discover, type MaestroModel, type ZoneBundle } from "../discovery";
import "./program-list";

export class IrrigationMaestroPanel extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ type: Boolean }) narrow = false;
  @state() private _selectedZoneId?: string;

  static styles = css`
    :host { display:block; height:100%; --imc-accent:#3a6df0; }
    .wrap { max-width: 760px; margin: 0 auto; padding: 16px; }
    header { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
    header h1 { font-size:20px; font-weight:600; }
    .tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
    .tab { font-size:13px; padding:6px 14px; border-radius:999px; background:var(--secondary-background-color,#26262e); color:var(--primary-text-color); cursor:pointer; }
    .tab.sel { background:var(--imc-accent); color:#fff; }
    .empty { color: var(--secondary-text-color); padding: 24px 0; }
  `;

  render(): TemplateResult {
    if (!this.hass) return html``;
    const lang = pickLanguage(this.hass);
    const model: MaestroModel = discover(this.hass);
    if (!model.found || model.zones.length === 0) {
      return html`<div class="wrap"><header><h1>${localize(lang, "panel.title")}</h1></header>
        <div class="empty">${localize(lang, "panel.no_zones")}</div></div>`;
    }
    const selected = this._resolveSelected(model.zones);
    return html`
      <div class="wrap">
        <header><h1>${localize(lang, "panel.title")}</h1></header>
        <div class="tabs">
          ${model.zones.map((z) => html`
            <div class="tab ${z.zoneId === selected.zoneId ? "sel" : ""}"
                 @click=${() => (this._selectedZoneId = z.zoneId)}>${z.name}</div>`)}
        </div>
        <imc-program-list .hass=${this.hass} .zone=${selected}></imc-program-list>
      </div>`;
  }

  private _resolveSelected(zones: ZoneBundle[]): ZoneBundle {
    return zones.find((z) => z.zoneId === this._selectedZoneId) ?? zones[0]!;
  }
}

defineElement("irrigation-maestro-panel", IrrigationMaestroPanel);
```

- [ ] **Step 2: Program list (read-only)**

`card/src/panel/program-list.ts` — render one card per program with name, weekday chips (read-only), start time via `describeTrigger`, and a minutes summary. Skeleton:

```ts
import { LitElement, html, css, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import type { HomeAssistant } from "../types";
import { defineElement } from "../types";
import { pickLanguage, localize } from "../localize/localize";
import { readCycles, type ZoneBundle } from "../discovery";
import type { CycleInfo } from "../types";
import { describeTrigger } from "../format";
import { weekdayLabels, everyDay } from "../schedule-math";

export class ImcProgramList extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) zone?: ZoneBundle;

  static styles = css`
    .prog { border:1px solid var(--divider-color,#333); border-radius:12px; padding:12px 14px; margin-bottom:10px; }
    .name { font-weight:600; margin-bottom:8px; }
    .days { display:flex; gap:5px; margin:6px 0; }
    .day { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; background:var(--secondary-background-color,#26262e); color:var(--secondary-text-color); }
    .day.on { background:var(--imc-accent,#3a6df0); color:#fff; }
    .meta { font-size:12.5px; color:var(--secondary-text-color); }
  `;

  render(): TemplateResult {
    if (!this.hass || !this.zone) return html``;
    const lang = pickLanguage(this.hass);
    const cycles: CycleInfo[] = readCycles(this.zone);
    if (cycles.length === 0) return html`<div class="meta">${localize(lang, "panel.no_programs")}</div>`;
    const labels = weekdayLabels(lang);
    return html`${cycles.map((c) => {
      const on = c.days ?? [];
      const isEvery = everyDay(c.days);
      return html`
        <div class="prog">
          <div class="name">${c.name ?? c.cycle_id}</div>
          <div class="days">
            ${labels.map((lbl, wd) => html`<div class="day ${isEvery || on.includes(wd) ? "on" : ""}">${lbl}</div>`)}
          </div>
          <div class="meta">${describeTrigger(c.trigger, lang)} · ${this._minutesSummary(lang, c)}</div>
        </div>`;
    })}`;
  }

  private _minutesSummary(lang: string, c: CycleInfo): string {
    if (c.day_minutes && Object.keys(c.day_minutes).length > 0) {
      return localize(lang, "panel.per_day_minutes");
    }
    return localize(lang, "panel.minutes_value", { min: c.amount ?? "?" });
  }
}

defineElement("imc-program-list", ImcProgramList);
```

(`weekdayLabels`/`everyDay` come from `schedule-math.ts` — Task 5 defines them; for this task, add a minimal `schedule-math.ts` with just `weekdayLabels(lang)` returning `["Lun".."Dom"]`/`["Mon".."Sun"]` and `everyDay(days?)`. Task 5 fills in the rest with tests. Confirm `describeTrigger(lang, trigger)` signature in `format.ts` and adapt if it takes the raw trigger object.)

- [ ] **Step 3: Add the panel copy keys used here**

Add to en.ts / it.ts (both, key-parity): `panel.no_zones`, `panel.no_programs`, `panel.per_day_minutes`, `panel.minutes_value` ("{min} min"). Use spec §7 wording (EN/IT).

- [ ] **Step 4: Typecheck, build, commit bundles**

Run (from `card/`): `npm run typecheck && npm run build && npx vitest run`
Then commit including rebuilt bundles.

```bash
git add card/src/panel/ card/src/schedule-math.ts card/src/localize/en.ts card/src/localize/it.ts custom_components/irrigation_maestro/frontend/irrigation-maestro-card.js custom_components/irrigation_maestro/frontend/irrigation-maestro-panel.js
git commit -m "feat(panel): read-only zone tabs + program list (milestone 1)"
```

---

### Task 5: `schedule-math.ts` — pure logic + Vitest

The tested core the editor depends on: weekday helpers, per-day map helpers, and the weather-line minutes computation (mirrors backend `resolve_day_curve`).

**Files:**
- Modify/complete: `card/src/schedule-math.ts` (started in Task 4)
- Test: `card/src/schedule-math.test.ts`

**Interfaces (produced):**
- `WEEKDAYS: readonly number[]` = `[0,1,2,3,4,5,6]`.
- `weekdayLabels(lang: string): string[]` (7 short labels; index = weekday).
- `everyDay(days?: number[]): boolean` — true when `days` is undefined/empty or contains all 7.
- `toggleWeekday(days: number[], wd: number): number[]` — sorted-unique add/remove.
- `isUniform(dayMinutes?: Record<string, number>): boolean` — true when absent/empty.
- `dayBase(cycle: {amount?: number; day_minutes?: Record<string, number>}, wd: number): number` — `day_minutes[wd] ?? amount ?? 0`.
- `effectiveMinutes(base: number, heat: number, weightedTemp: number, min?: number, max?: number): number` — `roundHalfEven(curveValue(pointsFromSemantic(base, heat), weightedTemp, min, max))`.

- [ ] **Step 1: Write the failing test**

`card/src/schedule-math.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { everyDay, toggleWeekday, isUniform, dayBase, effectiveMinutes, WEEKDAYS } from "./schedule-math";

describe("weekday helpers", () => {
  it("everyDay is true for empty/undefined/all-seven", () => {
    expect(everyDay(undefined)).toBe(true);
    expect(everyDay([])).toBe(true);
    expect(everyDay([...WEEKDAYS])).toBe(true);
    expect(everyDay([0, 2, 4])).toBe(false);
  });
  it("toggleWeekday adds and removes, keeping sorted unique", () => {
    expect(toggleWeekday([0, 4], 2)).toEqual([0, 2, 4]);
    expect(toggleWeekday([0, 2, 4], 2)).toEqual([0, 4]);
    expect(toggleWeekday([4, 0], 0)).toEqual([4]);
  });
});

describe("per-day + weather", () => {
  it("isUniform when no per-day map", () => {
    expect(isUniform(undefined)).toBe(true);
    expect(isUniform({})).toBe(true);
    expect(isUniform({ "0": 10 })).toBe(false);
  });
  it("dayBase prefers the per-day value, else amount", () => {
    expect(dayBase({ amount: 15, day_minutes: { "4": 20 } }, 4)).toBe(20);
    expect(dayBase({ amount: 15, day_minutes: { "4": 20 } }, 1)).toBe(15);
    expect(dayBase({ amount: 15 }, 1)).toBe(15);
  });
  it("effectiveMinutes mirrors the backend resolve_day_curve (base 20, heat 10, 31C -> 26)", () => {
    // pointsFromSemantic(20,10) = [[12,7],[25,20],[35,30]]; at 31 -> 20+10*0.6 = 26
    expect(effectiveMinutes(20, 10, 31, 1, 60)).toBe(26);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (from `card/`): `npx vitest run src/schedule-math.test.ts`
Expected: FAIL (functions not yet exported / stubbed).

- [ ] **Step 3: Complete `schedule-math.ts`**

```ts
/**
 * Pure scheduling logic for the Irrigazione panel. Weather math mirrors
 * engine/planner.resolve_day_curve + engine/semantic.py via curve-math.ts.
 */
import { pointsFromSemantic, curveValue, roundHalfEven } from "./curve-math";

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const LABELS: Record<string, string[]> = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
};

export function weekdayLabels(lang: string): string[] {
  return LABELS[lang] ?? LABELS.en!;
}

export function everyDay(days?: number[]): boolean {
  return !days || days.length === 0 || days.length >= 7;
}

export function toggleWeekday(days: number[], wd: number): number[] {
  const set = new Set(days);
  if (set.has(wd)) set.delete(wd);
  else set.add(wd);
  return [...set].sort((a, b) => a - b);
}

export function isUniform(dayMinutes?: Record<string, number>): boolean {
  return !dayMinutes || Object.keys(dayMinutes).length === 0;
}

export function dayBase(
  cycle: { amount?: number; day_minutes?: Record<string, number> },
  wd: number,
): number {
  return cycle.day_minutes?.[String(wd)] ?? cycle.amount ?? 0;
}

export function effectiveMinutes(
  base: number,
  heat: number,
  weightedTemp: number,
  min?: number,
  max?: number,
): number {
  return roundHalfEven(curveValue(pointsFromSemantic(base, heat), weightedTemp, min, max));
}
```

(Keep the `weekdayLabels`/`everyDay` you stubbed in Task 4 — replace them with these final versions.)

- [ ] **Step 4: Run tests**

Run (from `card/`): `npx vitest run && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add card/src/schedule-math.ts card/src/schedule-math.test.ts
git commit -m "feat(panel): schedule-math pure logic + vitest (weekday/per-day/weather)"
```

---

### Task 6: `imc-program-editor` — weekday grid + start time + per-day durations + weather line

The heart of the editing UX (spec §1.2 mockup `program-editor`). A form component that loads a `CycleInfo`, lets the user edit days / start / minutes, shows the green weather line, and emits two save events mapping to `set_program_schedule` and `set_program_minutes`.

**Files:**
- Create: `card/src/panel/program-editor.ts`
- Modify: `card/src/panel/program-list.ts` (open the editor for a program), `card/src/panel/panel.ts` (dispatch the save events to services via `_call`), `card/src/types.ts` (panel action types), `card/src/localize/en.ts`/`it.ts` (editor copy).

**Interfaces:**
- Produces element `<imc-program-editor>` props `.hass`, `.zoneId`, `.cycle: CycleInfo`, `.weightedTemp?: number`; events:
  - `imc-program-save-schedule` detail `{ zoneId, programId, days: number[], start: { kind: "time"|"sun"; at?: string; event?: "sunrise"|"sunset"; offset_min?: number } }`
  - `imc-program-save-minutes` detail `{ zoneId, programId, minutes?: number, dayMinutes?: Record<string, number> }`
  - `imc-program-cancel`
- Panel maps those to services: schedule → `set_program_schedule` (`{ zone_id, program_id, days, start_kind, start_time?, start_event?, start_offset_min? }`), minutes → `set_program_minutes` (`{ zone_id, program_id, minutes? , day_minutes? }`).

- [ ] **Step 1: Editor component**

`card/src/panel/program-editor.ts` — implement per the `program-editor` mockup (spec §1.2). Structure: **Giorni** (7 chips via `weekdayLabels`, click → `toggleWeekday`); **Orario di partenza** (segmented `Ora fissa · Alba · Tramonto`; time input for `time`, ±min offset for sun); **Durata per giorno** (a `– min +` stepper per selected day; a "Stessa durata per tutti i giorni" toggle → collapse to one stepper writing uniform `minutes`); the **weather line** (green banner: `effectiveMinutes(dayBase(cycle, today), cycle.heat ?? 8, weightedTemp, curve.min, curve.max)` for today's weekday, using `new Date().getDay()` mapped to 0=Mon..6=Sun via `(getDay()+6)%7`); **Save/Cancel**. Use `@state` for the working copy, seed from `.cycle` when `cycle_id` changes (mirror `curve-editor.ts`'s `_seededCycleId` willUpdate guard). On Save, emit `imc-program-save-schedule` then `imc-program-save-minutes` (bubbling, composed). Copy (spec §7): "Giorni"/"Days", "Orario di partenza"/"When does it start?", "Ora fissa"/"Fixed time", "Alba"/"Sunrise", "Tramonto"/"Sunset", "Durata per giorno"/"Duration per day", "Stessa durata per tutti i giorni"/"Same duration every day", and the weather-line template `panel.weather_line` = "Oggi ({day}) ≈ {min} min. Salta se piove." / "Today ({day}) ≈ {min} min. Skips if it rains." Keep the component thin — delegate all math to `schedule-math.ts`.

Provide the full class with imports, `@property`/`@state`, the willUpdate seed guard, the three render sections, and the two save dispatchers. (Follow `curve-editor.ts` for the seed-guard and event-dispatch idioms; follow the `program-editor` mockup for layout/classes.)

- [ ] **Step 2: Wire the editor into the list + panel service dispatch**

In `program-list.ts`, add an "Modifica"/"Edit" button per program that sets an `@state _editingId`; when set, render `<imc-program-editor .hass .zoneId=${zone.zoneId} .cycle=${cycle} .weightedTemp=${...}>` inline (weightedTemp from the hub `weighted_temp` sensor via `discover`/`hass`). In `panel.ts`, add a private `_call` wrapper (based on `card.ts:147-167`, with a transient `_error` state) BUT make it **return the service result** so later tasks (the wizard) can read a service response — the card's original `_call` returns `Promise<void>` and discards the result, which is insufficient here:

```ts
private async _call(
  domain: string,
  service: string,
  data: Record<string, unknown>,
  returnResponse = false,
): Promise<{ context: unknown; response?: Record<string, unknown> } | undefined> {
  if (!this.hass) return undefined;
  try {
    return (await this.hass.callService(
      domain, service, data, undefined, true, returnResponse,
    )) as { context: unknown; response?: Record<string, unknown> };
  } catch (err) {
    this._error = err instanceof Error ? err.message : String(err);
    // clear after ~6s like card.ts
    return undefined;
  }
}
```

(This requires the extended `HomeAssistant.callService` signature — add it in `types.ts` in this task: `callService(domain, service, data?, target?, notifyOnError?, returnResponse?): Promise<{ context: unknown; response?: Record<string, unknown> }>`. The existing 3-arg card calls still typecheck.)

Listen for `imc-program-save-schedule`/`imc-program-save-minutes`/`imc-program-cancel` at the panel root. Handler mapping (exact):
```ts
// schedule
this._call("irrigation_maestro", "set_program_schedule", {
  zone_id: d.zoneId, program_id: d.programId, days: d.days,
  start_kind: d.start.kind,
  ...(d.start.kind === "time" ? { start_time: d.start.at } : { start_event: d.start.event, start_offset_min: d.start.offset_min ?? 0 }),
});
// minutes
this._call("irrigation_maestro", "set_program_minutes",
  d.dayMinutes ? { zone_id: d.zoneId, program_id: d.programId, day_minutes: d.dayMinutes }
               : { zone_id: d.zoneId, program_id: d.programId, minutes: d.minutes });
```

- [ ] **Step 3: Add editor copy keys (en + it, key-parity)** per spec §7.

- [ ] **Step 4: Typecheck + build + vitest + commit bundles**

```bash
git add card/src/panel/ card/src/types.ts card/src/localize/en.ts card/src/localize/it.ts custom_components/irrigation_maestro/frontend/irrigation-maestro-card.js custom_components/irrigation_maestro/frontend/irrigation-maestro-panel.js
git commit -m "feat(panel): program editor — weekday grid, start time, per-day durations, weather line"
```

---

### Task 7: Program actions — enable toggle, rename, delete

Give each program in the list an enable toggle (bound to its `cycle_enabled` switch), rename, and delete (confirmed), wired to the backend.

**Files:**
- Modify: `card/src/panel/program-list.ts`, `card/src/panel/panel.ts`, `card/src/localize/*`.

**Interfaces:**
- Events from list → panel: `imc-program-toggle` `{ zoneId, programId, entityId, enabled }`, `imc-program-rename` `{ zoneId, programId, name }`, `imc-program-remove` `{ zoneId, programId }`.
- Panel maps: toggle → `switch.turn_on|turn_off` on the cycle's `cycle_enabled` entity (match by the switch whose `attributes.cycle_id`/name maps to the program — reuse `zone.cycleSwitches`); rename → `rename_program` `{ zone_id, program_id, name }`; remove → `remove_program` `{ zone_id, program_id }`.

- [ ] **Step 1:** Add per-program controls in `program-list.ts`: a toggle (find the matching `cycleSwitches` entity), a rename affordance (prompt/inline input), a delete button that shows a confirm before emitting `imc-program-remove` (mirror the confirm pattern in `global-controls.ts`). Copy (spec §7): "Aggiungi programma"/"Add program" is Task 8; here "Rinomina"/"Rename", "Elimina"/"Delete", "Attivo"/"Enabled".
- [ ] **Step 2:** In `panel.ts`, handle the three events via `_call`. For toggle, resolve the entity_id from the event (`switch.turn_on`/`switch.turn_off`, `{ entity_id }`).
- [ ] **Step 3:** Typecheck + build + commit bundles. Commit message: `feat(panel): program enable/rename/delete actions`.

---

### Task 8: Add-program wizard (3 steps)

"＋ Aggiungi programma" launches a 3-step guided flow (spec §1.3 mockup `wizard-advanced`): Giorni → Orario → Durata, with safe defaults; on finish it calls `add_program` (reading the `{program_id}` response) then `set_program_schedule` + `set_program_minutes` with the chosen values.

**Files:**
- Create: `card/src/panel/program-wizard.ts`
- Modify: `card/src/panel/program-list.ts` (the "＋" button opens the wizard), `card/src/panel/panel.ts` (handle the wizard-finish event), `card/src/localize/*`.

**Interfaces:**
- `<imc-program-wizard>` props `.hass`, `.zoneId`; events: `imc-wizard-finish` `{ zoneId, name?, days: number[], start: {...}, minutes: number }`, `imc-wizard-cancel`.
- Panel handler: `const res = await this._call("irrigation_maestro", "add_program", {zone_id, name}, /*returnResponse*/ true)`. The frontend `callService(..., returnResponse=true)` resolves to `{ context, response }`, so read the id from the **nested** `response`: `const programId = res?.response?.["program_id"]` (a string) — NOT `res.program_id`. Then chain `set_program_schedule` + `set_program_minutes` for that `programId`. The extended `HomeAssistant.callService` signature and the response-returning `_call` were added in Task 6 — reuse them (no further type change needed here). Guard: if `programId` is falsy (response missing), surface `_error` and abort the chain.

- [ ] **Step 1:** Build `program-wizard.ts` with 3 steps + presets (Ogni giorno / Giorni alterni / Solo weekend), defaults (all days, sunrise, 15 min), a "Fatto" preview using `effectiveMinutes`. Copy from spec §7.
- [ ] **Step 2:** Wire the "＋" button in `program-list.ts` and the finish handler in `panel.ts` (add_program → read program_id → schedule + minutes).
- [ ] **Step 3:** Verify the wizard-finish handler reads `res?.response?.["program_id"]` (nested), reusing the extended `HomeAssistant.callService` type + response-returning `_call` added in Task 6. Add a test-by-hand: with a program added, the two follow-up service calls must carry the SAME `program_id` the response returned.
- [ ] **Step 4:** Typecheck + build + commit bundles. Message: `feat(panel): add-program wizard`.

---

### Task 9: Advanced drawer — reuse `imc-curve-editor` as "reattività al caldo"

Add a collapsible "Impostazioni avanzate" section to the program editor embedding the existing `imc-curve-editor` (amount/heat + min/max), wired to `set_simple_curve`/`set_curve` (already-existing services).

**Files:**
- Modify: `card/src/panel/program-editor.ts` (advanced `<details>`/toggle embedding `<imc-curve-editor .cycle .weightedTemp>`), `card/src/panel/panel.ts` (handle the curve editor's existing `imc-curve-save` events), `card/src/localize/*`.

**Interfaces:**
- Reuse `imc-curve-editor` verbatim. Its `imc-curve-save` detail is a discriminated union (`curve-editor.ts:23-38`): `{ cycleId, mode: "simple", amount, heat, min, max }` or `{ cycleId, mode: "advanced", points, min, max }`, bubbling+composed — switch on `detail.mode`. Its props are `.cycle`, `.weightedTemp`, AND **`.language`** (defaults to `"en"` — must be set explicitly or Italian users see English).
- **Field-name trap:** the curve services use DIFFERENT field names than the schedule/minutes services. `set_simple_curve`/`set_curve` take `zone_id`, **`cycle_id`** (not `program_id`), and **`min_value`/`max_value`** (not `min`/`max`). Map explicitly (mirror `card.ts:213-231`).

- [ ] **Step 1:** In `program-editor.ts`, add an advanced toggle (copy "Impostazioni avanzate"/"Advanced settings", "Reattività al caldo"/"Heat response" from spec §7) that reveals `<imc-curve-editor .cycle=${this.cycle} .weightedTemp=${this.weightedTemp} .language=${pickLanguage(this.hass)}>`. Import `../curve-editor` and `pickLanguage`.
- [ ] **Step 2:** In `panel.ts`, handle `imc-curve-save` (bubbling from the embedded editor), switching on `detail.mode`:
  - `"simple"` → `set_simple_curve` `{ zone_id, cycle_id: detail.cycleId, amount: detail.amount, heat: detail.heat, min_value: detail.min, max_value: detail.max }`
  - `"advanced"` → `set_curve` `{ zone_id, cycle_id: detail.cycleId, points: detail.points, min_value: detail.min, max_value: detail.max }`
- [ ] **Step 3:** Typecheck + build + commit bundles. Message: `feat(panel): advanced drawer reuses the curve editor for heat response`.

---

### Task 10: Panel polish — narrow layout, weightedTemp wiring, error toast, empty/loading states

Make the panel production-quality: responsive (`narrow`), a header showing live weather context, the shared error toast, and graceful empty states — matching the spec §1.1 panel mockup.

**Files:**
- Modify: `card/src/panel/panel.ts` (+ small CSS in list/editor).

- [ ] **Step 1:** Header shows current weighted temperature + budget status from the hub sensors (via `discover(hass).hub.weightedTemp` / `waterBudget`), like the mockup's "meteo: 32° · budget acqua OK". Pass `weightedTemp` down to list/editor.
- [ ] **Step 2:** Render the `_error` toast (copy the transient-error pattern from `card.ts`). Handle `narrow` (stack tabs/steppers). Confirm no horizontal overflow.
- [ ] **Step 3:** Typecheck + build + commit bundles. Message: `feat(panel): responsive polish, weather header, error toast`.

---

### Task 11: Terminology ciclo → programma

Rename user-facing "ciclo"/"cycle" to "programma"/"program" across the card localize dictionaries and the config-flow subentry strings (spec §6). Internal keys stay unchanged.

**Files:**
- Modify: `card/src/localize/en.ts`, `it.ts` (any "cycle"/"ciclo" user-facing labels → "program"/"programma"; e.g. `editor.edit_curve`, `zone.no_cycles`, etc.).
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `it.json` (config-flow `config_subentries` step titles/descriptions/labels that say "cycle"/"ciclo").

- [ ] **Step 1:** Grep the card localize files and translations for user-facing "cycle"/"ciclo" (`grep -rni "cycle\|ciclo" card/src/localize custom_components/irrigation_maestro/translations`) and rewrite the display strings to program/programma. Do NOT change JSON keys or const identifiers — only human-readable values.
- [ ] **Step 2:** `npm run typecheck` (card), `.venv/bin/python -c "import json,glob; [json.load(open(f)) for f in glob.glob('custom_components/irrigation_maestro/translations/*.json')]"`, ensure en/it key-parity in the card dictionaries.
- [ ] **Step 3:** Commit. Message: `i18n: rename user-facing cycle -> programma (card + config flow)`.

---

### Task 12: Docs, version bump to 1.2.0, CHANGELOG, rebuild, full release gate

The release task. Document the panel, bump the version so a push to main cuts v1.2.0, and run the entire gate one last time.

**Files:**
- Modify: `custom_components/irrigation_maestro/manifest.json` (`"version": "1.2.0"`)
- Modify: `docs/design/card-contract.md` (panel section — registration, the `<irrigation-maestro-panel>` element, and that it consumes the Phase A `cycles[]` fields + services), `INSTRUCTIONS.md`, `docs/it/istruzioni.md`, `README.md` (how to reach the "Irrigazione" sidebar panel; note the dashboard card still works), `CHANGELOG.md` (1.2.0 entry: sidebar panel, weekday grid, per-day durations, wizard, advanced drawer).
- Rebuild both bundles and commit them in sync.

- [ ] **Step 1:** Bump `manifest.json` version to `1.2.0`.
- [ ] **Step 2:** Write the docs updates (each file) and the CHANGELOG 1.2.0 entry. In README/INSTRUCTIONS, lead with: open the **Irrigazione** panel in the sidebar → pick a zone → add/edit programs (giorni, orario, durata); advanced settings hidden under a drawer.
- [ ] **Step 3:** Rebuild the card bundles: from `card/`, `npm ci && npm run build && npm run test && npm run typecheck`. Ensure `git diff --exit-code custom_components/irrigation_maestro/frontend/` is clean after `git add` of the rebuilt bundles (the CI `card` job runs exactly this diff check).
- [ ] **Step 4: Full gate**

Run:
```bash
.venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy && .venv/bin/pytest -q
```
and from `card/`: `npm run typecheck && npm run build && npm run test`.
Expected: all green; §8 golden values untouched (no engine changes this phase); both bundles committed and in sync.

- [ ] **Step 5: Commit**

```bash
git add custom_components/irrigation_maestro/manifest.json docs/ INSTRUCTIONS.md README.md CHANGELOG.md custom_components/irrigation_maestro/frontend/irrigation-maestro-card.js custom_components/irrigation_maestro/frontend/irrigation-maestro-panel.js
git commit -m "release: Irrigazione panel + Gardena scheduling UX (v1.2.0)"
```

---

## Self-Review

**1. Spec coverage (Phase B):**
- Sidebar panel registration (§5) → Task 1. ✓
- Panel served by a second bundle (§5) → Task 2. ✓
- Contract fields + `day_not_scheduled` (§4.1) → Task 3. ✓
- Panel + zone tabs + program list (§1.1) → Tasks 4, 10. ✓
- Weekly grid + start time + per-day durations + weather line (§1.2) → Tasks 5, 6. ✓
- Program add/remove/rename + enable (§1.1) → Tasks 7, 8. ✓
- Wizard (§1.3) → Task 8. ✓
- Advanced drawer reusing curve editor (§1.4, §4.3) → Task 9. ✓
- Terminology (§6) → Task 11. ✓
- Copy (§7) → applied per UI task, consolidated key-parity checks. ✓
- Release/version/docs → Task 12. ✓
- §8 untouched (no engine changes) → holds; only backend touch is panel.py/const/init/manifest/translations/docs. ✓

**2. Placeholder scan:** UI tasks (6–10) specify component structure, exact events, service mappings, and copy, plus skeleton code and the mockup to match — this is design realization, not a logic placeholder. The deterministic tasks (1,2,3,5) carry full verbatim code + tests. Task 6/8/9 reference `curve-editor.ts`/`card.ts`/`global-controls.ts` idioms by exact file:line to copy — allowed (they are existing code to mirror, given verbatim in the repo).

**3. Type/interface consistency:** `readCycles`/`CycleInfo` (Task 3) consumed by Tasks 4/6/8. `schedule-math.ts` exports (Task 5: `weekdayLabels`, `everyDay`, `toggleWeekday`, `isUniform`, `dayBase`, `effectiveMinutes`, `WEEKDAYS`) used by Tasks 4/6/8 — Task 4 stubs `weekdayLabels`/`everyDay`, Task 5 finalizes them (noted). Event names are consistent panel-wide: `imc-program-save-schedule`/`-save-minutes`/`-cancel`/`-toggle`/`-rename`/`-remove`, `imc-wizard-finish`/`-cancel`, reused `imc-curve-save`. Service payloads match the Phase A schemas (`set_program_schedule` days+start_kind+start_time/start_event/start_offset_min; `set_program_minutes` exactly one of minutes|day_minutes; `add_program`→program_id; `remove_program`/`rename_program`).

**Notes for the executor:**
- The panel bundle must be committed whenever it changes (CI diff-checks `frontend/`). Run `npm run build` before each frontend commit and `git add` both bundles.
- `describeTrigger(lang, trigger)` and `card.ts` `_call`/`_onCurveSave` are the canonical idioms — read them before Tasks 4/6/9 and mirror exactly (don't invent new patterns).
- Weekday "today" for the weather line: JS `Date.getDay()` is 0=Sunday; convert to 0=Mon..6=Sun with `(getDay()+6)%7`.
- No engine/Python test values change in Phase B; if any `tests/engine/**` value would move, stop — that means an accidental backend change.
