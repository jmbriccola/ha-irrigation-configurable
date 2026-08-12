# Config Hub — Phase B (Panel UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Irrigazione" panel the configuration hub — create/edit/delete zones and edit the everyday hub settings (weather & sensors, consumption budget, calendar restrictions) from the panel — consuming the Phase A services, and release it as v1.3.0.

**Architecture:** Add two panel views built from Lit components under `card/src/panel/`: a zone editor and a settings view, both using HA's native `ha-selector` for entity pickers (via a thin `<imc-entity-picker>` wrapper with a text-input fallback). Current values are read once per form-open through the existing `export_config` response service (no new backend read paths). Saves dispatch bubbling events that `panel.ts` maps to the Phase A services via its existing response-returning `_call`. No engine/Python-logic changes; the only backend touch is the manifest version bump + docs in the final task.

**Tech Stack:** Lit 3 + TypeScript + Vite (two independent self-contained bundles), Vitest, HA frontend `ha-selector` web component.

## Global Constraints

- **§8 sacred, frontend-only.** No engine/Python decision-logic changes. Backend touch is limited to `manifest.json` (version) + docs in the final task.
- **`ha-selector` reuse, never bundled.** Reference the `ha-selector` custom element by tag at runtime (it is registered globally by the HA frontend; `panel_custom` with `embed_iframe=False` shares that `customElements` registry — same document). Do NOT import its implementation into the bundle. Provide a graceful fallback: when `customElements.get("ha-selector")` is undefined, render a plain text input bound to the same value.
- **Read current config via `export_config`** (existing, `SupportsResponse.ONLY`, returns `{payload: "<json>"}` of `{options, zones}`). No new backend read attributes.
- **Two INDEPENDENT self-contained Vite builds** (card + panel). After `npm run build`, `custom_components/irrigation_maestro/frontend/` must contain EXACTLY `irrigation-maestro-card.js` and `irrigation-maestro-panel.js` — NO third hashed chunk. Every frontend commit rebuilds and `git add`s BOTH bundles (CI `card` job runs `git diff --exit-code` on that dir).
- **`override` modifiers** on `styles`/`render`/`willUpdate`/lifecycle (repo tsconfig `noImplicitOverride: true`).
- **en/it key-parity** is compiler-enforced (`it.ts` is `Record<keyof typeof en, string>`) — add every new key to BOTH.
- **Weekday encoding** 0=Mon…6=Sun.
- **Copy:** exact IT/EN from spec §6 (`docs/superpowers/specs/2026-08-12-panel-config-hub-design.md`). Terminology "zona"/"programma".
- **CI green:** ruff, ruff format, mypy strict, pytest, hassfest; card `tsc --noEmit`, Vitest, build, bundles-in-sync.
- **Release:** the FINAL task bumps `manifest.json` to `1.3.0`, updates CHANGELOG + docs, rebuilds both bundles. Pushing to main after it cuts v1.3.0 (releasing BOTH config-hub Phase A backend and this Phase B).

**Reuse (already in the panel):** `panel.ts` `_call(domain, service, data, returnResponse=false)` → `{context, response?} | undefined` with a transient `_error` toast and `shouldUpdate` gating; zone tabs + `<imc-program-list>`; the header weather line. `discovery.ts` `ZoneBundle{zoneId,name,order,state,…}`. `schedule-math.ts` `weekdayLabels(lang)`, `WEEKDAYS`, `toggleWeekday`. `localize(lang,key,vars?)`, `pickLanguage(hass)`, `defineElement`. `types.ts` `HomeAssistant.callService` is the 6-arg signature returning `{context, response?}`.

---

## File Structure
- Create `card/src/panel/ha-selector.ts` — `<imc-entity-picker>` wrapper + `useNativeSelector()`.
- Create `card/src/panel/config-read.ts` — `parseExportedConfig`, `ZoneData`/`HubOptions` types.
- Create `card/src/panel/zone-editor.ts` — `<imc-zone-editor>`.
- Create `card/src/panel/settings-view.ts` — `<imc-settings-view>`.
- Modify `card/src/panel/panel.ts` — `_view`/`_editingZone` state, ＋/✎/⚙️ nav, event→service wiring, `_readConfig`.
- Modify `card/src/localize/en.ts` + `it.ts` — new copy keys.
- Tests: `card/src/panel/ha-selector.test.ts`, `card/src/panel/config-read.test.ts` (Vitest).
- Built bundles (committed): both `.js` rebuilt each frontend task.
- Final: `manifest.json`, `CHANGELOG.md`, `README.md`, `INSTRUCTIONS.md`, `docs/it/istruzioni.md`, `docs/design/card-contract.md`.

**Milestone:** Tasks 1–4 = zones fully manageable in the panel (add/edit/delete). Tasks 5–6 = settings view. Task 7 = release v1.3.0.

---

### Task 1: `<imc-entity-picker>` — ha-selector wrapper + fallback

**Files:**
- Create: `card/src/panel/ha-selector.ts`
- Test: `card/src/panel/ha-selector.test.ts`

**Interfaces (produced):**
- `useNativeSelector(): boolean` — true iff `ha-selector` is registered.
- element `<imc-entity-picker>` props `.hass`, `.selector: EntitySelectorConfig`, `.value: string`, `.label: string`; emits `value-changed` `{ value: string }` (bubbling+composed).
- `type EntitySelectorConfig = { entity: { domain?: string | string[] } }`.

- [ ] **Step 1: Write the failing test**

`card/src/panel/ha-selector.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { useNativeSelector } from "./ha-selector";

const g = globalThis as unknown as { customElements?: { get: (t: string) => unknown } };

afterEach(() => { delete g.customElements; });

describe("useNativeSelector", () => {
  it("false when customElements is absent (node/test env)", () => {
    delete g.customElements;
    expect(useNativeSelector()).toBe(false);
  });
  it("false when ha-selector is not registered", () => {
    g.customElements = { get: () => undefined };
    expect(useNativeSelector()).toBe(false);
  });
  it("true when ha-selector is registered", () => {
    g.customElements = { get: (t) => (t === "ha-selector" ? class {} : undefined) };
    expect(useNativeSelector()).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run (from `card/`): `npx vitest run src/panel/ha-selector.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`card/src/panel/ha-selector.ts`:

```ts
import { LitElement, html, css, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import type { HomeAssistant } from "../types";
import { defineElement } from "../types";

export type EntitySelectorConfig = { entity: { domain?: string | string[] } };

/** True iff HA's native <ha-selector> is registered in this document. */
export function useNativeSelector(): boolean {
  return typeof customElements !== "undefined" && !!customElements.get("ha-selector");
}

/**
 * Entity picker that reuses HA's native <ha-selector> at runtime (never
 * bundled — it lives in the frontend, shared via panel_custom
 * embed_iframe=False). Falls back to a plain entity-id text input when the
 * element isn't available, so the form never renders an empty box.
 */
export class ImcEntityPicker extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) selector: EntitySelectorConfig = { entity: {} };
  @property() value = "";
  @property() label = "";

  static override styles = css`
    input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #444);
      background: var(--secondary-background-color, #26262e);
      color: var(--primary-text-color);
      font-size: 13px;
    }
  `;

  private _emit(value: string): void {
    this.value = value;
    this.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value }, bubbles: true, composed: true }),
    );
  }

  override render(): TemplateResult {
    if (useNativeSelector()) {
      return html`<ha-selector
        .hass=${this.hass}
        .selector=${this.selector}
        .value=${this.value || undefined}
        .label=${this.label}
        @value-changed=${(e: CustomEvent) => this._emit((e.detail?.value as string) ?? "")}
      ></ha-selector>`;
    }
    return html`<input
      .value=${this.value}
      placeholder=${this.label}
      @input=${(e: Event) => this._emit((e.target as HTMLInputElement).value)}
    />`;
  }
}

defineElement("imc-entity-picker", ImcEntityPicker);
```

(Note: `<ha-selector>` in a lit-html template is a plain tag string — `tsc` does not type-check custom-element tag names or their property bindings, so no ambient declaration is needed. Do NOT `import` anything for `ha-selector`.)

- [ ] **Step 4: Run vitest + typecheck**

Run (from `card/`): `npx vitest run && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit** (no bundle change — the element isn't imported by an entry yet)

```bash
git add card/src/panel/ha-selector.ts card/src/panel/ha-selector.test.ts
git commit -m "feat(panel): imc-entity-picker (ha-selector reuse with text-input fallback)"
```

---

### Task 2: `config-read.ts` — parse exported config

**Files:**
- Create: `card/src/panel/config-read.ts`
- Test: `card/src/panel/config-read.test.ts`

**Interfaces (produced):**
- `interface ZoneData { name?; valve_entity?; area_m2?; icon?; flow_sensor?; nominal_flow_lpm?; flow_tolerance_pct?; adjustment_pct?; order?; interval_days?; compatibility_group?; season_months?: number[] }`
- `interface HubOptions { weather_entity?; rain_sensor?; outdoor_temp_sensor?; line_flow_sensor?; master_valve?; consumption_budget?: {liters_per_month?; action?; reduce_pct?}; restrictions?: {allowed_weekdays?: number[]; parity?: string; forbidden_windows?: {start:string;end:string}[]} }`
- `interface ExportedConfig { options: HubOptions; zones: Record<string, ZoneData> }`
- `parseExportedConfig(payload: string): ExportedConfig`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { parseExportedConfig } from "./config-read";

describe("parseExportedConfig", () => {
  it("parses options and zones", () => {
    const payload = JSON.stringify({
      options: { weather_entity: "weather.home", consumption_budget: { action: "reduce", reduce_pct: 40 } },
      zones: { z1: { name: "Prato", valve_entity: "valve.p", area_m2: 80 } },
    });
    const cfg = parseExportedConfig(payload);
    expect(cfg.options.weather_entity).toBe("weather.home");
    expect(cfg.options.consumption_budget?.reduce_pct).toBe(40);
    expect(cfg.zones["z1"]?.name).toBe("Prato");
  });
  it("tolerates missing options/zones", () => {
    const cfg = parseExportedConfig("{}");
    expect(cfg.options).toEqual({});
    expect(cfg.zones).toEqual({});
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npx vitest run src/panel/config-read.test.ts` → FAIL.

- [ ] **Step 3: Implement** `card/src/panel/config-read.ts` with the interfaces above and:

```ts
export function parseExportedConfig(payload: string): ExportedConfig {
  const raw = JSON.parse(payload) as { options?: HubOptions; zones?: Record<string, ZoneData> };
  return { options: raw.options ?? {}, zones: raw.zones ?? {} };
}
```

- [ ] **Step 4: Run vitest + typecheck** → PASS.

- [ ] **Step 5: Commit**

```bash
git add card/src/panel/config-read.ts card/src/panel/config-read.test.ts
git commit -m "feat(panel): parseExportedConfig + typed zone/hub config shapes"
```

---

### Task 3: `<imc-zone-editor>`

The zone create/edit form (spec §1.2). Reuses `<imc-entity-picker>`.

**Files:**
- Create: `card/src/panel/zone-editor.ts`
- Modify: `card/src/localize/en.ts` + `it.ts` (zone-editor copy)
- Build output (commit): both bundles (this element is imported by the panel in Task 4 — but committing now with the panel-import in Task 4 is fine; for THIS task the element isn't bundled yet, so no bundle change — verify with `git status`).

**Interfaces (produced):**
- element `<imc-zone-editor>` props `.hass`, `.zone?: ZoneData` (absent/undefined = create), `.zoneId?: string`. Events (bubbling+composed):
  - `imc-zone-save` `{ mode: "add" | "update", zoneId?: string, patch: { name: string; valve_entity: string; area_m2?: number; icon?: string; flow_sensor?: string; nominal_flow_lpm?: number; flow_tolerance_pct?: number; adjustment_pct?: number; order?: number; interval_days?: number; compatibility_group?: string; season_months?: number[] } }`
  - `imc-zone-remove` `{ zoneId: string }`
  - `imc-zone-cancel`

- [ ] **Step 1: Implement the component**

`card/src/panel/zone-editor.ts` — follow the `program-editor.ts` idioms (a `willUpdate` seed-guard keyed on `this.zoneId` so edits aren't clobbered; a `@state` working copy; bubbling+composed dispatch). Structure per the mockup (`config-home.html`): **Nome** (text input), **Valvola** (`<imc-entity-picker .hass .selector=${{entity:{domain:["valve","switch"]}}} .value=${_valve} @value-changed>`, required), **Area** (number, optional).

**CRITICAL — advanced fields are EDIT-ONLY.** The Phase A `add_zone` service accepts ONLY `name`, `valve_entity`, `area_m2`, `icon` (its voluptuous schema has no `ALLOW_EXTRA`, so any extra field makes the call **hard-fail**). Therefore render the **▸ Avanzate** drawer only in EDIT mode (`this.zone` is defined) — a new zone is created with the basics and its advanced fields are refined right afterward via `update_zone`. The Avanzate drawer (edit mode only) reveals: flow_sensor (`imc-entity-picker` `{entity:{domain:"sensor"}}`), nominal_flow_lpm (number), flow_tolerance_pct (number 1–100), adjustment_pct (number 10–300), order (number 1–1000), interval_days (number 1–60), season_months (12 month chips, values 1–12), compatibility_group (text). Footer: **Salva** (disabled until name and valve are non-empty), **Annulla**, and in edit mode **🗑 Elimina** (window.confirm first).

Save handler builds `patch` from the working state (omit empty optional fields) and emits `imc-zone-save` with `mode = this.zone ? "update" : "add"` and `zoneId = this.zoneId`. In create mode the working state only carries base fields (the Avanzate drawer isn't rendered), so the `patch` naturally contains only `name`/`valve_entity`/`area_m2`/`icon`. **Export the detail types** (panel.ts imports them by type):

```ts
export interface ZoneSaveDetail {
  mode: "add" | "update";
  zoneId?: string;
  patch: {
    name: string; valve_entity: string; area_m2?: number; icon?: string;
    flow_sensor?: string; nominal_flow_lpm?: number; flow_tolerance_pct?: number;
    adjustment_pct?: number; order?: number; interval_days?: number;
    compatibility_group?: string; season_months?: number[];
  };
}
export interface ZoneRemoveDetail { zoneId: string; }
```

Use `override` on `styles`/`render`/`willUpdate`. New localize keys (add to en.ts + it.ts, spec §6): `zone.add`/"Add zone"/"Aggiungi zona", `zone.edit`/"Edit zone"/"Modifica zona", `zone.delete`/"Delete zone"/"Elimina zona", `zone.field_name`/"Name"/"Nome", `zone.field_valve`/"Valve"/"Valvola", `zone.field_area`/"Area (m²)"/"Area (m²)", `zone.advanced`/"Advanced"/"Avanzate", plus advanced field labels (`zone.field_flow_sensor`, `zone.field_adjustment`, `zone.field_interval`, `zone.field_season`, `zone.field_group`, `zone.field_flow_nominal`, `zone.field_flow_tolerance`, `zone.field_order`), and `common.save`/`common.cancel` (reuse existing if present — grep en.ts first).

Provide the full class (imports, `@property .hass/.zone/.zoneId`, `@state` working fields, `willUpdate` seed-guard, the three render sections, the save/remove/cancel dispatchers). Import `./ha-selector`, `schedule-math` is not needed here.

- [ ] **Step 2: Typecheck** — `npm run typecheck` → clean. (No bundle rebuild yet — the element is wired into the panel in Task 4.)

- [ ] **Step 3: Commit**

```bash
git add card/src/panel/zone-editor.ts card/src/localize/en.ts card/src/localize/it.ts
git commit -m "feat(panel): imc-zone-editor (create/edit form with entity pickers)"
```

---

### Task 4: Panel zone CRUD wiring (MILESTONE)

Add the ＋ Aggiungi zona tab, per-zone ✎ Modifica zona, the editor view, and wire `add_zone`/`update_zone`/`remove_zone`. After this, zones are fully manageable in the panel.

**Files:**
- Modify: `card/src/panel/panel.ts`
- Modify: `card/src/localize/en.ts` + `it.ts` (any nav copy)
- Build output (commit): both bundles rebuilt.

**Interfaces:**
- Consumes: `<imc-zone-editor>` (Task 3), `parseExportedConfig`/`ZoneData` (Task 2), the existing `_call`.

- [ ] **Step 1: Add state + config read**

In `panel.ts`, add `import "./zone-editor";`, `import { parseExportedConfig, type ZoneData } from "./config-read";`, and:

```ts
@state() private _editingZone?: ZoneData | null;  // undefined = list, null = create, ZoneData = edit
@state() private _editingZoneId?: string;
```

Add a config-read helper:

```ts
private async _readConfig(): Promise<import("./config-read").ExportedConfig | undefined> {
  const res = await this._call("irrigation_maestro", "export_config", {}, true);
  const payload = res?.response?.["payload"];
  if (typeof payload !== "string") return undefined;
  try {
    return parseExportedConfig(payload);
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 2: Nav affordances + editor view**

- Add a `＋ Aggiungi zona` tab (after the zone tabs) that sets `this._editingZone = null; this._editingZoneId = undefined;`.
- Add a per-zone `✎ Modifica zona` control (near the selected zone header/name) whose handler does `const cfg = await this._readConfig(); if (cfg) { this._editingZoneId = zoneId; this._editingZone = cfg.zones[zoneId] ?? {}; }`.
- In `render`, when `this._editingZone !== undefined`, render `<imc-zone-editor .hass=${hass} .zone=${this._editingZone ?? undefined} .zoneId=${this._editingZoneId}>` INSTEAD of the tabs+program-list (a focused editor screen with the existing `_error` toast still shown).

- [ ] **Step 3: Wire the events**

Add to the root event handlers:

```ts
private async _onZoneSave(ev: CustomEvent<import("./zone-editor").ZoneSaveDetail>): Promise<void> {
  const d = ev.detail;
  if (d.mode === "add") {
    // add_zone accepts ONLY name/valve_entity/area_m2/icon (no ALLOW_EXTRA) —
    // pick exactly those, never spread the full patch (advanced fields would
    // hard-fail the call). The editor doesn't produce advanced fields in
    // create mode, but pick defensively anyway.
    const p = d.patch;
    const add: Record<string, unknown> = { name: p.name, valve_entity: p.valve_entity };
    if (p.area_m2 !== undefined) add["area_m2"] = p.area_m2;
    if (p.icon !== undefined) add["icon"] = p.icon;
    const res = await this._call("irrigation_maestro", "add_zone", add, true);
    const zoneId = res?.response?.["zone_id"];
    if (typeof zoneId === "string" && zoneId) this._selectedZoneId = zoneId;
  } else {
    await this._call("irrigation_maestro", "update_zone", { zone_id: d.zoneId, ...d.patch });
  }
  this._editingZone = undefined;
  this._editingZoneId = undefined;
}

private async _onZoneRemove(ev: CustomEvent<import("./zone-editor").ZoneRemoveDetail>): Promise<void> {
  await this._call("irrigation_maestro", "remove_zone", { zone_id: ev.detail.zoneId });
  this._editingZone = undefined;
  this._editingZoneId = undefined;
  this._selectedZoneId = undefined;
}

private _onZoneCancel(): void {
  this._editingZone = undefined;
  this._editingZoneId = undefined;
}
```

Register `@imc-zone-save`, `@imc-zone-remove`, `@imc-zone-cancel` on the root `.wrap`. Field names: the editor's `patch` keys equal the service attr names. **`update_zone` accepts the full set** (`name`, `valve_entity`, `area_m2`, `icon`, `flow_sensor`, `nominal_flow_lpm`, `flow_tolerance_pct`, `adjustment_pct`, `order`, `interval_days`, `compatibility_group`, `season_months`) so the update branch may spread `...d.patch` directly. **`add_zone` accepts ONLY `name`/`valve_entity`/`area_m2`/`icon`** — the add branch above picks exactly those (never spreads the full patch), or voluptuous hard-rejects the call.

- [ ] **Step 4: Rebuild + verify + commit bundles**

Run (from `card/`): `npm run typecheck && npm run build && npx vitest run`; confirm `ls ../custom_components/irrigation_maestro/frontend/` shows exactly the two `.js` files (no hashed chunk).

```bash
git add card/src/panel/panel.ts card/src/localize/en.ts card/src/localize/it.ts custom_components/irrigation_maestro/frontend/irrigation-maestro-card.js custom_components/irrigation_maestro/frontend/irrigation-maestro-panel.js
git commit -m "feat(panel): zone create/edit/delete wired to services (config-hub milestone)"
```

---

### Task 5: `<imc-settings-view>`

The everyday-settings form (spec §1.3), pre-filled from `HubOptions`.

**Files:**
- Create: `card/src/panel/settings-view.ts`
- Modify: `card/src/localize/en.ts` + `it.ts` (settings copy)

**Interfaces (produced):**
- element `<imc-settings-view>` props `.hass`, `.options: HubOptions`. Events (bubbling+composed):
  - `imc-settings-save-weather` `{ weather_entity: string; rain_sensor?: string; outdoor_temp_sensor?: string; line_flow_sensor?: string; master_valve?: string }`
  - `imc-settings-save-budget` `{ liters_per_month?: number; action: "notify"|"reduce"|"suspend"; reduce_pct?: number }`
  - `imc-settings-save-restrictions` `{ allowed_weekdays?: number[]; parity?: "odd"|"even"|"none"; forbidden_windows?: { start: string; end: string }[] }`
  - `imc-settings-back`

- [ ] **Step 1: Implement** the three sections per the mockup (`settings-view.html`):
  - **Meteo e sensori** — 5 `<imc-entity-picker>`: weather (`{entity:{domain:"weather"}}`, required), rain/outdoor_temp/line_flow (`{entity:{domain:"sensor"}}`), master_valve (`{entity:{domain:["valve","switch"]}}`). A "Salva" emits `imc-settings-save-weather` (omit empty optionals as `""` so the merge-service clears them; always send `weather_entity`).
  - **Budget consumo** — liters number, `action` segmented (notify/reduce/suspend), reduce_pct number shown when action = reduce. "Salva" emits `imc-settings-save-budget`.
  - **Restrizioni calendario** — 7 weekday chips (`weekdayLabels(lang)`, `toggleWeekday`), parity segmented (all/odd/even → "none"/"odd"/"even"), forbidden windows as a list of start/end time inputs with add/remove. "Salva" emits `imc-settings-save-restrictions`.
  - A **▸ Parametri avanzati** note that engine/safety/notifications live in Settings.
  Seed working `@state` from `.options` with a `willUpdate` guard (reseed when the options object identity changes is fine here — the settings view is opened fresh each time). `override` on styles/render/willUpdate. Import `./ha-selector` and `weekdayLabels`/`WEEKDAYS`/`toggleWeekday` from `../schedule-math`.

  **Full-section saves (not diffs).** `set_consumption_budget` and `set_restrictions` REPLACE their whole option section (any field omitted is cleared), while `set_weather_sources` merges. So each section's Save must emit the FULL current working state of that section, never a partial diff — the budget Save always sends `action` (+ `liters_per_month`/`reduce_pct` when set); the restrictions Save always sends the current weekday set / parity / windows. **Export the detail types** (panel.ts imports them by type): `export interface WeatherSaveDetail { weather_entity: string; rain_sensor?: string; outdoor_temp_sensor?: string; line_flow_sensor?: string; master_valve?: string }`, `export interface BudgetSaveDetail { liters_per_month?: number; action: "notify"|"reduce"|"suspend"; reduce_pct?: number }`, `export interface RestrictionsSaveDetail { allowed_weekdays?: number[]; parity?: "odd"|"even"|"none"; forbidden_windows?: { start: string; end: string }[] }`.
  New localize keys (en+it, spec §6): `settings.title`/"Settings"/"Impostazioni", `settings.weather`/"Weather & sensors"/"Meteo e sensori", `settings.weather_entity`/"Weather entity"/"Entità meteo", `settings.rain`, `settings.outdoor_temp`, `settings.line_flow`, `settings.master_valve`/"Master valve"/"Valvola principale", `settings.budget`/"Consumption budget"/"Budget consumo", `settings.liters`/"Liters per month"/"Litri al mese", `settings.on_exceed`/"On exceed"/"Al superamento", `settings.action_notify`/`_reduce`/`_suspend`, `settings.reduce_pct`, `settings.restrictions`/"Calendar restrictions"/"Restrizioni calendario", `settings.allowed_days`/"Allowed days"/"Giorni consentiti", `settings.parity_all`/`_odd`/`_even`, `settings.forbidden_windows`/"Forbidden windows"/"Finestre vietate", `settings.advanced_note`/"Advanced parameters (engine, safety, notifications) live in Settings"/"Parametri avanzati (motore, sicurezza, notifiche) → Impostazioni".

- [ ] **Step 2: Typecheck** → clean.

- [ ] **Step 3: Commit**

```bash
git add card/src/panel/settings-view.ts card/src/localize/en.ts card/src/localize/it.ts
git commit -m "feat(panel): imc-settings-view (weather, budget, restrictions)"
```

---

### Task 6: Panel settings wiring

Add the ⚙️ Impostazioni button, the settings view, and wire the 3 hub services.

**Files:**
- Modify: `card/src/panel/panel.ts`
- Build output (commit): both bundles rebuilt.

- [ ] **Step 1: State + read + nav**

In `panel.ts`, add `import "./settings-view";`, `import type { HubOptions } from "./config-read";`, and:

```ts
@state() private _view: "zones" | "settings" = "zones";
@state() private _options?: HubOptions;
```

Add a `⚙️ Impostazioni` button in the header whose handler does `const cfg = await this._readConfig(); if (cfg) { this._options = cfg.options; this._view = "settings"; }`. In `render`, when `this._view === "settings"`, render a `‹ back` control (sets `_view = "zones"`) + `<imc-settings-view .hass=${hass} .options=${this._options ?? {}}>` instead of the zones view.

- [ ] **Step 2: Wire the 3 save events + back**

```ts
private _onSaveWeather(ev: CustomEvent<import("./settings-view").WeatherSaveDetail>): void {
  void this._call("irrigation_maestro", "set_weather_sources", { ...ev.detail });
}
private _onSaveBudget(ev: CustomEvent<import("./settings-view").BudgetSaveDetail>): void {
  void this._call("irrigation_maestro", "set_consumption_budget", { ...ev.detail });
}
private _onSaveRestrictions(ev: CustomEvent<import("./settings-view").RestrictionsSaveDetail>): void {
  void this._call("irrigation_maestro", "set_restrictions", { ...ev.detail });
}
private _onSettingsBack(): void { this._view = "zones"; }
```

Register `@imc-settings-save-weather`, `@imc-settings-save-budget`, `@imc-settings-save-restrictions`, `@imc-settings-back` on the root `.wrap`. The event detail keys ARE the service attr names, so spread directly.

- [ ] **Step 3: Rebuild + verify + commit bundles**

Run: `npm run typecheck && npm run build && npx vitest run`; `ls frontend/` shows exactly two `.js`.

```bash
git add card/src/panel/panel.ts custom_components/irrigation_maestro/frontend/irrigation-maestro-card.js custom_components/irrigation_maestro/frontend/irrigation-maestro-panel.js
git commit -m "feat(panel): settings view wired to hub-settings services"
```

---

### Task 7: Docs + v1.3.0 release + full gate

The release task — releases BOTH config-hub Phase A backend and Phase B panel.

**Files:**
- Modify: `custom_components/irrigation_maestro/manifest.json` (`"version": "1.3.0"`)
- Modify: `CHANGELOG.md`, `README.md`, `INSTRUCTIONS.md`, `docs/it/istruzioni.md`, `docs/design/card-contract.md`
- Rebuild both bundles.

- [ ] **Step 1:** Bump `manifest.json` version to `1.3.0`.
- [ ] **Step 2:** CHANGELOG `## 1.3.0` (dated 2026-08-12): the panel is now the configuration hub — create/edit/delete zones and edit everyday settings (weather & sensors, consumption budget, calendar restrictions) from the sidebar; new backend services (add_zone/update_zone/remove_zone/set_weather_sources/set_consumption_budget/set_restrictions); the HA config flow remains available. Match the file's existing format.
- [ ] **Step 3:** Docs: in README/INSTRUCTIONS (English) and docs/it/istruzioni.md (Italian), document managing zones + settings from the panel (with the config flow still available for the initial setup + expert params). Update `docs/design/card-contract.md` if the panel's consumed contract changed (it uses `export_config` for reads + the 6 config services). Keep each doc's language/structure.
- [ ] **Step 4:** Rebuild: from `card/`, `npm ci && npm run build && npm run test && npm run typecheck`; ensure `git diff --exit-code custom_components/irrigation_maestro/frontend/` is clean after `git add` of the rebuilt bundles.
- [ ] **Step 5: Full gate**

Run: `.venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy && .venv/bin/pytest -q`; and from `card/`: `npm run typecheck && npm run build && npm run test`. All green; §8 golden untouched; both bundles in sync.

- [ ] **Step 6: Commit**

```bash
git add custom_components/irrigation_maestro/manifest.json CHANGELOG.md README.md INSTRUCTIONS.md docs/ custom_components/irrigation_maestro/frontend/irrigation-maestro-card.js custom_components/irrigation_maestro/frontend/irrigation-maestro-panel.js
git commit -m "release: panel configuration hub — zones + everyday settings (v1.3.0)"
```

---

## Self-Review

**1. Spec coverage (Phase B):**
- `ha-selector` reuse + fallback (§3.1) → Task 1. ✓
- Read current config via `export_config` (§3.3) → Task 2 + `_readConfig` in Task 4. ✓
- Zone editor create/edit/delete (§1.2) → Tasks 3, 4. ✓
- Settings view (§1.3) → Tasks 5, 6. ✓
- Panel nav (＋/✎/⚙️, §1.1) → Tasks 4, 6. ✓
- Service wiring (add/update/remove_zone, set_weather_sources/budget/restrictions) → Tasks 4, 6. ✓
- Config flow stays (§4) → unchanged; no config_flow.py touched. ✓
- Copy §6 → per-component keys, en+it. ✓
- Release v1.3.0 + docs → Task 7. ✓
- §8 untouched (no Python-logic change) → holds; only manifest version + docs. ✓

**2. Placeholder scan:** Tasks 1, 2 carry verbatim code + Vitest; Tasks 3, 5 specify the component structure, exact events/detail shapes, exact copy keys, and the mockup to match (design realization, not logic placeholders); Tasks 4, 6 give the exact panel state, `_readConfig`, event handlers, and service field mapping.

**3. Type/interface consistency:** `imc-entity-picker` (`value-changed {value}`) consumed by Tasks 3, 5. `parseExportedConfig`/`ZoneData`/`HubOptions` (Task 2) consumed by Tasks 4, 6. Event/detail names consistent: `imc-zone-save {mode,zoneId?,patch}` / `imc-zone-remove {zoneId}` / `imc-zone-cancel` (Task 3 ↔ Task 4); `imc-settings-save-weather/-budget/-restrictions` + `imc-settings-back` (Task 5 ↔ Task 6). The zone-editor `patch` keys and the settings detail keys equal the Phase A service attr names, so `panel.ts` spreads them directly. Task 3 must export the detail types `ZoneSaveDetail`/`ZoneRemoveDetail`; Task 5 must export `WeatherSaveDetail`/`BudgetSaveDetail`/`RestrictionsSaveDetail` (panel imports them by `import(...)` type — ensure they are `export`ed).

**Notes for the executor:**
- Rebuild + commit BOTH bundles on Tasks 4, 6, 7 (any panel-source change). Never a third hashed chunk.
- The zone editor's Save must be disabled until `name` and `valve_entity` are non-empty (add_zone/update_zone need them; empty valve fails validation).
- Read current config with `export_config` only when opening a form (not on every render) — store in `_editingZone`/`_options` state.
- No engine/Python-logic change anywhere in Phase B; if a `tests/engine/**` value would move, STOP.
