# Irrigation Maestro — Panel as Configuration Hub Design

**Status:** Approved design (brainstorm) — 2026-08-12
**Domain:** `irrigation_maestro`
**Builds on:** the "Irrigazione" sidebar panel shipped in v1.2.0 (`docs/superpowers/specs/2026-08-11-panel-gardena-scheduling-design.md`).

**Goal:** Make the "Irrigazione" sidebar panel the home for everyday configuration — create/edit/delete **zones** and edit the **everyday hub settings** (weather & sensors, consumption budget, calendar restrictions) — so a user never has to leave the panel for routine setup. The HA config flow stays as an alternative and for the initial bootstrap.

**Architecture:** New backend services mutate the config entry in place: zone CRUD via `async_add_subentry`/`async_update_subentry`/`async_remove_subentry`, and hub-settings patches via `async_update_entry(options=…)`. Every write validates through the existing typed models (`ZoneConfig.from_subentry`, `HubConfig.from_options`) before persisting — never store an invalid config. The panel gains a zone editor and a settings view built from the panel's existing Lit components plus HA's native `ha-selector` for entity pickers. The weather/decision engine is untouched (§8 sacred).

**Tech Stack:** Python 3.13 (HA config-entry + subentry APIs, voluptuous services), Lit 3 + TypeScript + Vite panel, HA frontend `ha-selector`/`ha-entity-picker` web components, pytest + Vitest.

---

## Global Constraints

- **§8 is sacred.** No engine/decision-logic changes. Backend touches are limited to `services.py` (new services), `services.yaml` + translations, `const.py` (any new attr keys), docs, and the panel frontend.
- **In place, no reload.** Zone add/edit/delete use `hass.config_entries.async_add_subentry` / `async_update_subentry` / `async_remove_subentry` — all route through `_async_update_entry`, firing the entry update listener → `runtime.async_config_updated` → `_build_zones` → `SIGNAL_ZONES_CHANGED`, which the platforms already consume (`entity.py:75` `async_add_zone_entities._sync`, `switch.py:92`) to add/remove zone entities live; `async_remove_subentry` clears the device/entity registry for the removed subentry. A running session is never interrupted by a config edit (§5 of the base spec).
- **Validate before persist.** Zone writes validate the resulting subentry dict via `ZoneConfig.from_subentry(...)`; hub-settings writes validate the merged options via `HubConfig.from_options(...)`. On failure raise `ServiceValidationError` with a translation key — never persist an invalid config.
- **Config flow stays as an alternative.** The zone subentry flow (`config_flow.py ZoneSubentryFlowHandler`) and the hub options flow are unchanged and remain fully functional. The panel is the primary path; Settings is the fallback and the only place for the initial bootstrap (add integration + weather entity) and expert parameters.
- **Everyday settings only.** The panel's settings cover exactly: **weather & sensors**, **consumption budget**, **calendar restrictions**. Engine weights/thresholds, safety timings, and notifications stay in Settings, reachable via an "Advanced → opens Settings" link.
- **Terminology:** user-facing "programma"/"zona"; internal keys unchanged.
- **CI green:** ruff, ruff format, mypy strict, pytest, hassfest (service descriptions free of `{…}` placeholders and `<…>` HTML — a v1.2.0 lesson); card `tsc --noEmit`, Vitest, build, each bundle self-contained + committed in sync.
- **Weekday encoding:** `0 = Monday … 6 = Sunday`.
- **Release:** the final task bumps `manifest.json` to `1.3.0`, updates CHANGELOG + docs.

---

## 1. UX

Reference mockups (validated with the user): `.superpowers/brainstorm/387524-1786513148/content/{config-home,settings-view}.html`.

### 1.1 Panel becomes the config hub
- The zone tabs gain a **`＋ Aggiungi zona`** entry that opens the zone editor in "create" mode (today the panel's "＋" deep-links to the config flow — this replaces it with an in-panel form; the config flow remains reachable from Settings).
- Each zone shows a **`✎ Modifica zona`** affordance (near the zone name) opening the zone editor in "edit" mode, and a delete action (with confirm).
- The panel header gains a **`⚙️ Impostazioni`** button opening the settings view.

### 1.2 Zone editor (`<imc-zone-editor>`)
Simple, top to bottom — a normal user touches only the first three:
- **Nome** (text, required).
- **Valvola** (required) — HA's native `ha-selector` entity picker restricted to `domain: ["valve","switch"]`, so the user searches their own devices/helpers. Mirrors the config flow's valve selector.
- **Area (m²)** — optional number.
- **▸ Avanzate** drawer — the remaining zone fields: flow sensor (entity selector, `sensor`), nominal flow L/min, flow tolerance %, adjustment %, watering order, minimum interval (days), season months (multi-select 1–12), compatibility group (only if the hub defines groups).
- **Save** (create → `add_zone`, edit → `update_zone`), **Annulla**, and **🗑 Elimina** (edit mode only → `remove_zone`, confirmed).
- A newly created zone is seeded with one **default program** (reusing `_default_program` from `services.py`) so it is immediately valid and usable — the config flow requires ≥1 cycle, and this keeps parity.

### 1.3 Settings view (`<imc-settings-view>`)
Three sections (mockup `settings-view`), each saved through its own service:
- **🌦️ Meteo e sensori** — weather entity (required), rain sensor, outdoor temperature sensor, line flow sensor, master valve — all `ha-selector` entity pickers.
- **🚰 Budget consumo** — liters/month (number), on-exceed action (notify · reduce · suspend, segmented), reduce % (number, shown when action = reduce).
- **📅 Restrizioni calendario** — allowed weekdays (7 chips), parity (all · odd · even), forbidden time windows (list of start–end).
- **▸ Parametri avanzati** — a link that opens HA Settings for the integration (engine, safety, notifications). If a deep link to the options flow is unavailable on the running HA, fall back to instructing the user to open Settings → Devices & Services → Irrigation Maestro.

---

## 2. Backend services

All new services follow the established `services.py` pattern: resolve the loaded hub entry, validate through the typed models, then persist in place. They are registered in `async_setup_services` with `services.yaml` + IT/EN translations.

### 2.1 Zone CRUD

| Service | Fields | Effect |
|---|---|---|
| `add_zone` | `name` (req), `valve_entity` (req), `area_m2?`, `icon?` | Build a zone `data` dict (with a seeded default program under `CONF_CYCLES`), validate via `ZoneConfig.from_subentry("probe", data, templates=hub.curve_templates)`, then build and add the subentry, returning its id. **Response** `{zone_id}`. |
| `update_zone` | `zone_id` (req) + any of `name`, `valve_entity`, `area_m2`, `icon`, and the advanced fields (`flow_sensor`, `nominal_flow_lpm`, `flow_tolerance_pct`, `adjustment_pct`, `order`, `interval_days`, `compatibility_group`, `season_months`) | Merge the patch into the existing subentry `data` (preserving `CONF_CYCLES` and untouched keys), validate via `ZoneConfig.from_subentry`, then `async_update_subentry(entry, subentry, data=…, title=name?)`. |
| `remove_zone` | `zone_id` (req) | `async_remove_subentry(entry, zone_id)` (registry cleanup is automatic). No last-zone guard (an integration may have zero zones); the panel confirms before calling. |

`add_zone`/`update_zone` reuse a shared `_zone_data_patch` builder and the existing `_default_program` (from the program work) for seeding.

**Exact `add_zone` shape (the constructor is fussy — verified against installed HA):** `ConfigSubentry` (from `homeassistant.config_entries`) is a frozen kw-only dataclass whose `unique_id` has **no default** and whose `data` is a `MappingProxyType`. Build the object first, then read its auto-generated `subentry_id` for the response — `async_add_subentry` returns only `bool`:

```python
from types import MappingProxyType
from homeassistant.config_entries import ConfigSubentry

subentry = ConfigSubentry(
    subentry_type=SUBENTRY_TYPE_ZONE,
    data=MappingProxyType(data),
    title=name,
    unique_id=None,          # required — HA's own callers pass None
)
hass.config_entries.async_add_subentry(entry, subentry)
return {"zone_id": subentry.subentry_id}
```

(A bare `dict` for `data` runs but fails mypy strict; omitting `unique_id` raises `TypeError`. Both are one-line fixes but the snippet as written must be used verbatim.)

### 2.2 Hub everyday settings

Each service merges a partial patch into a copy of `entry.options`, validates the whole via `HubConfig.from_options(merged)`, and persists with `hass.config_entries.async_update_entry(entry, options=merged)` (which fires the update listener → in-place `async_config_updated`).

| Service | Fields | Options keys written |
|---|---|---|
| `set_weather_sources` | `weather_entity` (req), `rain_sensor?`, `outdoor_temp_sensor?`, `line_flow_sensor?`, `master_valve?` | `CONF_WEATHER_ENTITY`, `CONF_RAIN_SENSOR`, `CONF_OUTDOOR_TEMP_SENSOR`, `CONF_LINE_FLOW_SENSOR`, `CONF_MASTER_VALVE` |
| `set_consumption_budget` | `liters_per_month?` (0/omitted = off), `action` (notify\|reduce\|suspend), `reduce_pct?` | `CONF_CONSUMPTION_BUDGET` = `{liters_per_month, action, reduce_pct}` |
| `set_restrictions` | `allowed_weekdays?` (list 0–6), `parity?` (odd\|even\|none), `forbidden_windows?` (list of `{start,end}` "HH:MM") | `CONF_RESTRICTIONS` = `{allowed_weekdays, parity, forbidden_windows}` |

Omitted optional fields clear (or leave) their key per each service's documented semantics (e.g. an empty `allowed_weekdays` clears the restriction → all weekdays allowed). Passing an unknown entity id is allowed by the service (HA validates entities lazily); the typed-model validation catches structural errors (e.g. an inverted budget, a malformed window).

---

## 3. Frontend

### 3.1 Native selector reuse (the one genuinely new capability)
The panel starts using HA's built-in web components for entity pickers:
```ts
html`<ha-selector
  .hass=${this.hass}
  .selector=${{ entity: { domain: ["valve", "switch"] } }}
  .value=${this._valve}
  @value-changed=${(e: CustomEvent) => (this._valve = e.detail.value)}
></ha-selector>`
```
`ha-selector` is registered globally by the HA frontend and is available to a custom panel (which already receives `hass`). A thin `card/src/panel/ha-selector.ts` wrapper declares the minimal TS types (the element is not in the panel's bundle — it is resolved at runtime by the frontend) and centralizes a **graceful fallback**: if `customElements.get("ha-selector")` is undefined at render time, render a plain text input bound to the same value, so the panel never shows an empty box. The panel's `tsconfig`/build must not try to import the component's implementation — only reference the custom element by tag.

### 3.2 Components
- `card/src/panel/zone-editor.ts` — `<imc-zone-editor>` (props `.hass`, `.zone?` for edit vs create). Emits `imc-zone-save` `{ mode:"add"|"update", zoneId?, patch:{name, valve_entity, area_m2?, icon?, …advanced} }` and `imc-zone-remove` `{ zoneId }`, `imc-zone-cancel` (bubbling+composed). The panel maps these to `add_zone` (reads `res.response.zone_id`, then selects the new zone), `update_zone`, `remove_zone`.
- `card/src/panel/settings-view.ts` — `<imc-settings-view>` (prop `.hass`). Three sections; emits `imc-settings-save-weather` / `-budget` / `-restrictions` with the respective payloads → the three hub services. Reads current values from `discover(hass).hub` sensor states and/or the config (see §3.3).
- `card/src/panel/panel.ts` — adds the `＋ Aggiungi zona` tab, the per-zone `✎`, the `⚙️ Impostazioni` header button, a `_view` state (`"zones" | "settings" | "zone-editor"`), and the service dispatch for the new events via the existing response-returning `_call`.

### 3.3 Reading current config into the forms
Zone fields already arrive via discovery (the zone editor reads name/valve/area/advanced from the zone's config as surfaced today, extended as needed). Hub everyday settings are surfaced as additive, read-only sensor attributes so the settings view renders current values without a config round-trip (keeping the card contract attribute-driven). Pick the natural home per section: **budget** already fits `HubConsumptionLeftSensor` (which exposes `budget_liters`/`used_liters`/`action` today — extend with `reduce_pct`); **weather sources** and **restrictions** go on the hub weighted-temp / a small config sensor — settle the exact sensor per section during planning. Avoid overloading the live `HubSessionSensor` (idle/evaluating/running + queue) with static config. As a fallback, the panel can also read current options via the existing `export_config` service if an attribute home is deemed wrong.

---

## 4. What stays in the config flow (unchanged)
- Initial bootstrap: add the integration + choose the weather entity (the panel cannot exist before setup).
- The full zone subentry flow — kept as an alternative path.
- Expert parameters: engine weights/thresholds, safety timings, notifications (reached from the panel's "Advanced" link).

---

## 5. Validation & error handling
- Zone services: build the candidate `data`, run `ZoneConfig.from_subentry` (raises on a bad curve/valve/field); on failure raise `ServiceValidationError(translation_key="invalid_zone")`. Unknown `zone_id` → `unknown_zone` (existing). `remove_zone` on a missing zone → `unknown_zone`.
- Hub services: merge patch, run `HubConfig.from_options`; on failure raise `ServiceValidationError(translation_key="invalid_hub_settings")`. `set_weather_sources` requires a non-empty `weather_entity` (the hub cannot run without it).
- **hassfest copy rule (precise):** `services.yaml` and translation *service* `name`/`description` text must contain no `{…}` and no `<…>` (they have no placeholder mechanism — the v1.2.0 failures). **Exception** messages, however, MAY use `{placeholder}` bound to `translation_placeholders` (the repo already does: `unknown_zone` = "Unknown zone: {zone_id}.", `invalid_points` = "…({error})…"). New exception keys: `invalid_zone` and `invalid_hub_settings`, each surfacing `{error}` like `invalid_points` for an actionable message.
- The panel surfaces failures through the existing transient `_error` toast; success re-renders from the reconciled state.

---

## 6. Copy (key labels, IT / EN)

| Context | IT | EN |
|---|---|---|
| Add zone | Aggiungi zona | Add zone |
| Edit zone | Modifica zona | Edit zone |
| Delete zone | Elimina zona | Delete zone |
| Valve | Valvola | Valve |
| Area | Area (m²) | Area (m²) |
| Advanced | Avanzate | Advanced |
| Settings | Impostazioni | Settings |
| Weather & sensors | Meteo e sensori | Weather & sensors |
| Weather entity | Entità meteo | Weather entity |
| Master valve | Valvola principale | Master valve |
| Consumption budget | Budget consumo | Consumption budget |
| Liters / month | Litri / mese | Liters / month |
| On exceed | Al superamento | On exceed |
| Calendar restrictions | Restrizioni calendario | Calendar restrictions |
| Allowed days | Giorni consentiti | Allowed days |
| Forbidden windows | Finestre vietate | Forbidden windows |
| Advanced params → Settings | Parametri avanzati → apre Impostazioni | Advanced parameters → open Settings |

(Full field-level copy pulled from the existing config-flow translations where equivalent labels already exist — reuse them so the two paths read identically.)

---

## 7. Testing
- **Services (pytest):** `add_zone` creates a subentry whose entities appear (a zone_state sensor for the returned `zone_id`) without reload, and seeds a default program; `update_zone` patches a field and the zone reconfigures in place; `remove_zone` deletes the subentry and its entities disappear; each validates and rejects a bad payload (`invalid_zone`). `set_weather_sources` rejects an empty weather entity; `set_consumption_budget` / `set_restrictions` persist and round-trip through `HubConfig.from_options`; a malformed patch raises `invalid_hub_settings`.
- **§8 golden — unchanged.** No engine code changes; assert the existing values still pass.
- **Frontend (Vitest + typecheck):** any pure helpers (e.g. the restrictions/day-grid mapping, the settings payload builders) get Vitest; the `ha-selector` fallback logic is unit-testable (given/knowing `customElements.get` returns undefined → renders a text input). Components verified by `tsc --noEmit` + build; bundles self-contained + in sync.
- **hassfest:** new service descriptions and exception messages contain no `{…}`/`<…>`.

---

## 8. Out of scope (YAGNI)
- Engine weights/thresholds, safety timings, notifications editing in the panel (stay in Settings).
- Removing or hiding the config-flow zone flow (kept as an alternative).
- Editing curve *templates* or compatibility-group *definitions* from the panel (group selection is surfaced; defining groups stays in Settings).
- Creating the hub / choosing the initial weather entity from the panel (impossible pre-setup).
- Bulk zone import/export UI (the `export_config`/`import_config` services already exist for power users).

---

## 9. Risks & open questions
- **`ha-selector` version sensitivity.** The element and its `selector` schema are a long-stable HA frontend contract, but not versioned with this integration. The §3.1 graceful fallback (text input when the element is absent) bounds the blast radius; Phase-frontend must verify against the supported HA range and keep the fallback.
- **Reading current hub settings into the form (§3.3).** Chosen approach: additive read-only attributes on the hub session sensor. If that sensor's attribute surface is deemed the wrong home, the alternative is a dedicated read (a small `get_config` response service); decide during planning, but do not block the panel on a config round-trip.
- **`add_zone` seeding a default program** means a new zone waters on defaults until edited. This matches the config-flow "≥1 cycle" rule and the safe-defaults ethos; documented so it is not surprising.
- **Two write paths (panel + config flow)** for zones. Both go through `ZoneConfig.from_subentry`, so stored data cannot diverge structurally; the only risk is UI drift (a field added to one path but not the other), mitigated by keeping the zone-editor field list and the config-flow schema reviewed together.
- **Zone rename vs HA device name (pre-existing).** Each zone entity's HA *device* name is captured once at construction (`entity.py`) and is not re-pushed to the device registry on a later rename; a plain rename fires `SIGNAL_UPDATE` (attributes refresh) but not `SIGNAL_ZONES_CHANGED`. This already exists via the config-flow reconfigure step; the panel makes rename a common in-place action, so the plan should either update the device-registry name on rename (small, targeted) or explicitly document that the device name lags until reload. Not an engine change — safe.
- **Implementation phasing.** Natural split: (A) backend services + tests (usable via services/YAML immediately), then (B) the panel zone-editor + settings-view frontend. `writing-plans` decides one or two plans.
