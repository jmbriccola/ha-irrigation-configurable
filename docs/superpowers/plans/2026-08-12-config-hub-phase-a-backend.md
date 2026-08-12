# Config Hub — Phase A (Backend Services) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the backend services that let the panel (Phase B) manage zones and everyday hub settings without leaving it — `add_zone`/`update_zone`/`remove_zone` and `set_weather_sources`/`set_consumption_budget`/`set_restrictions` — all mutating the config entry in place and validated through the typed models.

**Architecture:** Extend `services.py` following its established pattern (resolve the loaded hub entry, validate through the typed models, persist in place). Zone CRUD uses `async_add_subentry`/`async_update_subentry`/`async_remove_subentry`; hub settings patch `entry.options` via `async_update_entry`. All of these fire the entry update listener → `runtime.async_config_updated` → the platforms reconcile entities live (no reload). The engine is untouched (§8 sacred). No frontend and no version bump in this phase.

**Tech Stack:** Python 3.13, Home Assistant config-entry + subentry APIs, voluptuous service schemas, pytest-homeassistant-custom-component.

## Global Constraints

- **§8 sacred.** No engine/decision-logic changes. Only `services.py`, `services.yaml`, `translations/{en,it}.json`, `docs/design/card-contract.md` are touched.
- **In place, no reload.** `async_add_subentry` / `async_update_subentry` / `async_remove_subentry` and `async_update_entry(options=…)` all fire the entry update listener → `runtime.async_config_updated` → `_build_zones` → `SIGNAL_ZONES_CHANGED`. The platforms already reconcile: `entity.py` `async_add_zone_entities._sync` adds a NEW zone's entities and `switch.py` `_sync_cycles` its cycle switches; `async_remove_subentry` clears the device/entity registry for the removed subentry. A running session is never interrupted.
- **Validate before persist.** Zone writes validate the resulting subentry dict via `ZoneConfig.from_subentry("probe", data, templates=runtime.hub.curve_templates)`; hub-settings writes validate the merged options via `HubConfig.from_options(merged)`. On failure raise `ServiceValidationError` — never persist an invalid config.
- **`ConfigSubentry` is fussy (verified vs installed HA 2026.7).** It is a frozen kw-only dataclass; `unique_id` has NO default (omitting it raises `TypeError`) and `data` must be a `MappingProxyType` (a bare `dict` fails mypy strict). `async_add_subentry` returns `bool`, so read the new id off the constructed object's `.subentry_id`.
- **hassfest copy rule.** `services.yaml` + service `name`/`description` strings must contain NO `{…}` and NO `<…>` (v1.2.0 lesson). **Exception** messages MAY use `{placeholder}` bound to `translation_placeholders` (the repo already does: `unknown_zone` = "Unknown zone: {zone_id}.", `invalid_points` = "…({error})…"). New exception keys `invalid_zone` and `invalid_hub_settings` each carry `{error}`.
- **`HubConfig.from_options` requires `weather_entity`** (`options[CONF_WEATHER_ENTITY]`, a hard KeyError if absent) — never drop it from a merged patch; `set_weather_sources` requires a non-empty `weather_entity`.
- **Weekday encoding** 0=Mon…6=Sun.
- **Do NOT bump `manifest.json` version** — v1.3.0 ships with Phase B.
- **CI green:** `ruff check .`, `ruff format --check .`, `mypy` (strict), `pytest`, hassfest.
- **Config flow stays as an alternative** — do not touch `config_flow.py`.

**Reuse (already in `services.py`):** `_loaded_entry(hass)`, `_runtime(hass)`, `_require_zone(runtime, zone_id)`, `_default_program(name)` (returns a valid single-cycle dict), `_validate_program` (the pattern to mirror). Imports present: `from . import const`, `from .const import DOMAIN, SUBENTRY_TYPE_ZONE`, `from .models import CycleConfig, HubConfig, ZoneConfig`, `from .runtime import IrrigationRuntime`, `ServiceResponse`, `SupportsResponse`, `ServiceValidationError`, `cast`, `voluptuous as vol`, `config_validation as cv`.

---

## File Structure
- Modify `custom_components/irrigation_maestro/services.py` — new SERVICE_/ATTR_ constants, schemas, helpers (`_validate_zone`, `_zone_data_from_service`, `_write_hub_options`), 6 handlers, registration.
- Modify `custom_components/irrigation_maestro/services.yaml` — 6 service definitions.
- Modify `custom_components/irrigation_maestro/translations/en.json` + `it.json` — 6 services blocks + `invalid_zone`/`invalid_hub_settings` exceptions.
- Modify `docs/design/card-contract.md` — document the 6 services.
- Test `tests/components/test_services.py`.

---

### Task 1: `add_zone` (response service)

Create a zone subentry from a service, seeded with a default program, validated, in place.

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py`
- Modify: `custom_components/irrigation_maestro/translations/en.json` + `it.json` (exception `invalid_zone`)
- Test: `tests/components/test_services.py`

**Interfaces (produced):**
- Service `irrigation_maestro.add_zone(name, valve_entity, area_m2?, icon?)` → response `{"zone_id": "<subentry_id>"}`.
- Helper `_validate_zone(data: dict[str, Any], templates: dict[str, Any]) -> None`.

- [ ] **Step 1: Write the failing test**

In `tests/components/test_services.py` (uses the file's existing `setup_hub`, `zone_data`, `mock_weather`, `START` from `.test_session`, and `MockValvePark`):

```python
async def test_add_zone_creates_zone_in_place(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    park.add("valve.newzone")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    before = set(runtime.zone_ids)

    resp = await hass.services.async_call(
        DOMAIN, "add_zone",
        {"name": "Aiuole", "valve_entity": "valve.newzone", "area_m2": 12},
        blocking=True, return_response=True,
    )
    await hass.async_block_till_done()
    new_id = resp["zone_id"]
    assert new_id not in before
    assert new_id in runtime.zone_ids
    zone = runtime.zones[new_id].config
    assert zone.name == "Aiuole"
    assert zone.valve_entity == "valve.newzone"
    assert len(zone.cycles) == 1  # seeded default program
    # entities reconciled in place (no reload): a zone_state sensor exists
    assert any(
        s.attributes.get("zone_id") == new_id for s in hass.states.async_all("sensor")
    )


async def test_add_zone_rejects_invalid(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.pots")
    mock_weather(hass)
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises(ServiceValidationError):
        # missing required valve_entity -> schema/validation rejects
        await hass.services.async_call(
            DOMAIN, "add_zone", {"name": "X"}, blocking=True, return_response=True
        )
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/components/test_services.py -k add_zone -v`
Expected: FAIL (`Unable to find service irrigation_maestro.add_zone`).

- [ ] **Step 3: Constants + schema + `_validate_zone`**

In `services.py` add near the other `SERVICE_*` (line ~52):

```python
SERVICE_ADD_ZONE: Final = "add_zone"
SERVICE_UPDATE_ZONE: Final = "update_zone"
SERVICE_REMOVE_ZONE: Final = "remove_zone"
SERVICE_SET_WEATHER_SOURCES: Final = "set_weather_sources"
SERVICE_SET_CONSUMPTION_BUDGET: Final = "set_consumption_budget"
SERVICE_SET_RESTRICTIONS: Final = "set_restrictions"
```

Add attribute constants (near the other `ATTR_*`, some already exist — only add missing):

```python
ATTR_VALVE_ENTITY: Final = "valve_entity"
ATTR_AREA_M2: Final = "area_m2"
ATTR_ICON: Final = "icon"
ATTR_FLOW_SENSOR: Final = "flow_sensor"
ATTR_NOMINAL_FLOW_LPM: Final = "nominal_flow_lpm"
ATTR_FLOW_TOLERANCE_PCT: Final = "flow_tolerance_pct"
ATTR_ADJUSTMENT_PCT: Final = "adjustment_pct"
ATTR_INTERVAL_DAYS: Final = "interval_days"
ATTR_COMPATIBILITY_GROUP: Final = "compatibility_group"
ATTR_SEASON_MONTHS: Final = "season_months"
ATTR_WEATHER_ENTITY: Final = "weather_entity"
ATTR_RAIN_SENSOR: Final = "rain_sensor"
ATTR_OUTDOOR_TEMP_SENSOR: Final = "outdoor_temp_sensor"
ATTR_LINE_FLOW_SENSOR: Final = "line_flow_sensor"
ATTR_MASTER_VALVE: Final = "master_valve"
ATTR_LITERS_PER_MONTH: Final = "liters_per_month"
ATTR_ACTION: Final = "action"
ATTR_REDUCE_PCT: Final = "reduce_pct"
ATTR_ALLOWED_WEEKDAYS: Final = "allowed_weekdays"
ATTR_PARITY: Final = "parity"
ATTR_FORBIDDEN_WINDOWS: Final = "forbidden_windows"
ATTR_WINDOW_START: Final = "start"
ATTR_WINDOW_END: Final = "end"
```

Add the schema (near the other schemas):

```python
_ADD_ZONE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_NAME): cv.string,
        vol.Required(ATTR_VALVE_ENTITY): cv.string,
        vol.Optional(ATTR_AREA_M2): vol.Coerce(float),
        vol.Optional(ATTR_ICON): cv.string,
    }
)
```

Add the validation helper (mirrors `_validate_program`):

```python
def _validate_zone(data: dict[str, Any], templates: dict[str, Any]) -> None:
    """Round-trip a zone dict through the typed model before persisting."""
    from .engine.curves import CurveError  # already imported at top; keep top import

    try:
        ZoneConfig.from_subentry("probe", data, templates=templates)
    except (CurveError, ValueError, KeyError, TypeError) as err:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="invalid_zone",
            translation_placeholders={"error": str(err)},
        ) from err
```

(`CurveError` is already imported at module top — do NOT add an in-function import; the snippet above shows the exception set only. Use the existing top-level `from .engine.curves import CurveError, CurveKind, validate_points`.)

- [ ] **Step 4: The handler**

```python
async def _async_add_zone(call: ServiceCall) -> ServiceResponse:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    name: str = call.data[ATTR_NAME]
    data: dict[str, Any] = {
        const.CONF_ZONE_NAME: name,
        const.CONF_VALVE_ENTITY: call.data[ATTR_VALVE_ENTITY],
        const.CONF_CYCLES: [_default_program(name)],
    }
    if ATTR_AREA_M2 in call.data:
        data[const.CONF_AREA_M2] = float(call.data[ATTR_AREA_M2])
    if ATTR_ICON in call.data:
        data[const.CONF_ZONE_ICON] = call.data[ATTR_ICON]

    _validate_zone(data, runtime.hub.curve_templates)

    from types import MappingProxyType  # HA stores subentry data as MappingProxyType

    from homeassistant.config_entries import ConfigSubentry

    subentry = ConfigSubentry(
        subentry_type=SUBENTRY_TYPE_ZONE,
        data=MappingProxyType(data),
        title=name,
        unique_id=None,
    )
    hass.config_entries.async_add_subentry(entry, subentry)
    return {"zone_id": subentry.subentry_id}
```

Move the two imports (`MappingProxyType`, `ConfigSubentry`) to the MODULE TOP if ruff PLC0415 flags them (in-function imports are forbidden in non-test code). Put `from types import MappingProxyType` with the stdlib imports and add `ConfigSubentry` to the existing `from homeassistant.config_entries import ConfigEntry, ConfigEntryState` line.

- [ ] **Step 5: Register (response service) + exception strings**

In `async_setup_services`, add:

```python
    hass.services.async_register(
        DOMAIN, SERVICE_ADD_ZONE, _async_add_zone, _ADD_ZONE_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
```

In `translations/en.json` `exceptions`, add:
`"invalid_zone": { "message": "The zone is not valid ({error})." }`
In `translations/it.json` `exceptions`, add:
`"invalid_zone": { "message": "La zona non è valida ({error})." }`

- [ ] **Step 6: Run tests + full gate**

Run: `.venv/bin/pytest tests/components/test_services.py -k add_zone -q && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy && .venv/bin/pytest -q`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add custom_components/irrigation_maestro/services.py custom_components/irrigation_maestro/translations/en.json custom_components/irrigation_maestro/translations/it.json tests/components/test_services.py
git commit -m "feat(services): add_zone (creates a zone subentry in place, seeded + validated)"
```

---

### Task 2: `update_zone` + `remove_zone`

Patch an existing zone's fields (preserving its programs) and delete a zone — both in place.

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py`
- Test: `tests/components/test_services.py`

**Interfaces:**
- Consumes: `_validate_zone` (Task 1), `_loaded_entry`, `_runtime`, `_require_zone`.
- Produces: `irrigation_maestro.update_zone(zone_id, name?, valve_entity?, area_m2?, icon?, flow_sensor?, nominal_flow_lpm?, flow_tolerance_pct?, adjustment_pct?, order?, interval_days?, compatibility_group?, season_months?)`; `irrigation_maestro.remove_zone(zone_id)`.

- [ ] **Step 1: Write the failing tests**

```python
async def test_update_zone_patches_in_place(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass); park.add("valve.pots"); mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    runtime = entry.runtime_data
    zid = runtime.zone_ids[0]
    cycles_before = len(runtime.zones[zid].config.cycles)

    await hass.services.async_call(
        DOMAIN, "update_zone",
        {"zone_id": zid, "name": "Vasi", "area_m2": 5, "interval_days": 4},
        blocking=True,
    )
    zone = runtime.zones[zid].config
    assert zone.name == "Vasi"
    assert zone.area_m2 == 5
    assert zone.interval_days == 4
    assert len(zone.cycles) == cycles_before  # programs preserved


async def test_update_zone_unknown(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass); park.add("valve.pots"); mock_weather(hass)
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "update_zone", {"zone_id": "nope", "name": "X"}, blocking=True
        )


async def test_remove_zone(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass); park.add("valve.pots"); park.add("valve.b")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots"), zone_data("B", "valve.b")])
    runtime = entry.runtime_data
    victim = runtime.zone_ids[0]

    await hass.services.async_call(DOMAIN, "remove_zone", {"zone_id": victim}, blocking=True)
    await hass.async_block_till_done()
    assert victim not in runtime.zone_ids
    assert not any(s.attributes.get("zone_id") == victim for s in hass.states.async_all("sensor"))
```

- [ ] **Step 2: Run to verify fail**

Run: `.venv/bin/pytest tests/components/test_services.py -k "update_zone or remove_zone" -v`
Expected: FAIL (services not found).

- [ ] **Step 3: Schemas**

```python
_UPDATE_ZONE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ZONE_ID): cv.string,
        vol.Optional(ATTR_NAME): cv.string,
        vol.Optional(ATTR_VALVE_ENTITY): cv.string,
        vol.Optional(ATTR_AREA_M2): vol.Coerce(float),
        vol.Optional(ATTR_ICON): cv.string,
        vol.Optional(ATTR_FLOW_SENSOR): cv.string,
        vol.Optional(ATTR_NOMINAL_FLOW_LPM): vol.All(vol.Coerce(float), vol.Range(min=0)),
        vol.Optional(ATTR_FLOW_TOLERANCE_PCT): vol.All(vol.Coerce(float), vol.Range(min=1, max=100)),
        vol.Optional(ATTR_ADJUSTMENT_PCT): vol.All(vol.Coerce(int), vol.Range(min=10, max=300)),
        vol.Optional(ATTR_ORDER): vol.All(vol.Coerce(int), vol.Range(min=1, max=1000)),
        vol.Optional(ATTR_INTERVAL_DAYS): vol.All(vol.Coerce(int), vol.Range(min=1, max=60)),
        vol.Optional(ATTR_COMPATIBILITY_GROUP): cv.string,
        vol.Optional(ATTR_SEASON_MONTHS): [vol.All(vol.Coerce(int), vol.Range(min=1, max=12))],
    }
)
_REMOVE_ZONE_SCHEMA = vol.Schema({vol.Required(ATTR_ZONE_ID): cv.string})

# attr -> zone-data const key, with the coercion already applied by the schema
_ZONE_PATCH_KEYS: Final = {
    ATTR_NAME: const.CONF_ZONE_NAME,
    ATTR_VALVE_ENTITY: const.CONF_VALVE_ENTITY,
    ATTR_AREA_M2: const.CONF_AREA_M2,
    ATTR_ICON: const.CONF_ZONE_ICON,
    ATTR_FLOW_SENSOR: const.CONF_FLOW_SENSOR,
    ATTR_NOMINAL_FLOW_LPM: const.CONF_NOMINAL_FLOW_LPM,
    ATTR_FLOW_TOLERANCE_PCT: const.CONF_FLOW_TOLERANCE_PCT,
    ATTR_ADJUSTMENT_PCT: const.CONF_ADJUSTMENT_PCT,
    ATTR_ORDER: const.CONF_ORDER,
    ATTR_INTERVAL_DAYS: const.CONF_INTERVAL_DAYS,
    ATTR_COMPATIBILITY_GROUP: const.CONF_COMPATIBILITY_GROUP,
    ATTR_SEASON_MONTHS: const.CONF_ZONE_SEASON_MONTHS,
}
```

- [ ] **Step 4: Handlers**

```python
async def _async_update_zone(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    subentry = entry.subentries[zone_id]
    data = dict(subentry.data)  # preserves CONF_CYCLES + untouched keys
    for attr, conf_key in _ZONE_PATCH_KEYS.items():
        if attr in call.data:
            data[conf_key] = call.data[attr]
    _validate_zone(data, runtime.hub.curve_templates)
    title = call.data.get(ATTR_NAME, subentry.title)
    hass.config_entries.async_update_subentry(entry, subentry, data=data, title=title)


async def _async_remove_zone(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = cast(IrrigationRuntime, entry.runtime_data)
    zone_id: str = call.data[ATTR_ZONE_ID]
    _require_zone(runtime, zone_id)
    hass.config_entries.async_remove_subentry(entry, zone_id)
```

- [ ] **Step 5: Register**

```python
    hass.services.async_register(DOMAIN, SERVICE_UPDATE_ZONE, _async_update_zone, _UPDATE_ZONE_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_REMOVE_ZONE, _async_remove_zone, _REMOVE_ZONE_SCHEMA)
```

- [ ] **Step 6: Run tests + full gate**

Run: `.venv/bin/pytest tests/components/test_services.py -k "update_zone or remove_zone" -q && .venv/bin/ruff check . && .venv/bin/mypy && .venv/bin/pytest -q`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add custom_components/irrigation_maestro/services.py tests/components/test_services.py
git commit -m "feat(services): update_zone + remove_zone (in place)"
```

---

### Task 3: `set_weather_sources` + hub-options helper

The first everyday-settings service, plus the shared options-merge/validate helper.

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py`
- Modify: `custom_components/irrigation_maestro/translations/en.json` + `it.json` (exception `invalid_hub_settings`)
- Test: `tests/components/test_services.py`

**Interfaces:**
- Produces: helper `_write_hub_options(hass, entry, options: dict[str, Any]) -> None` (validate a COMPLETE options dict via `HubConfig.from_options` → `async_update_entry`; callers build `options` from `dict(entry.options)` and set/pop keys); service `set_weather_sources(weather_entity, rain_sensor?, outdoor_temp_sensor?, line_flow_sensor?, master_valve?)`.

- [ ] **Step 1: Write the failing test**

```python
async def test_set_weather_sources(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass); park.add("valve.pots"); mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN, "set_weather_sources",
        {"weather_entity": "weather.home", "rain_sensor": "sensor.rain"},
        blocking=True,
    )
    from custom_components.irrigation_maestro.models import HubConfig
    hub = HubConfig.from_options(dict(entry.options))
    assert hub.weather_entity == "weather.home"
    assert hub.rain_sensor == "sensor.rain"


async def test_set_weather_sources_requires_weather(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass); park.add("valve.pots"); mock_weather(hass)
    await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    with pytest.raises((ServiceValidationError, vol.Invalid)):
        await hass.services.async_call(
            DOMAIN, "set_weather_sources", {"weather_entity": ""}, blocking=True
        )
```

- [ ] **Step 2: Run to verify fail**

Run: `.venv/bin/pytest tests/components/test_services.py -k set_weather_sources -v`
Expected: FAIL.

- [ ] **Step 3: Helper + schema**

```python
def _write_hub_options(hass: HomeAssistant, entry: ConfigEntry, options: dict[str, Any]) -> None:
    """Validate a COMPLETE options dict and persist it in place.

    Callers build ``options`` from ``dict(entry.options)`` and set/pop keys, so
    clearing a key actually takes effect (a re-merge with entry.options here
    would silently resurrect popped keys).
    """
    try:
        HubConfig.from_options(options)
    except (ValueError, KeyError, TypeError) as err:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="invalid_hub_settings",
            translation_placeholders={"error": str(err)},
        ) from err
    hass.config_entries.async_update_entry(entry, options=options)


_SET_WEATHER_SOURCES_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_WEATHER_ENTITY): vol.All(cv.string, vol.Length(min=1)),
        vol.Optional(ATTR_RAIN_SENSOR): cv.string,
        vol.Optional(ATTR_OUTDOOR_TEMP_SENSOR): cv.string,
        vol.Optional(ATTR_LINE_FLOW_SENSOR): cv.string,
        vol.Optional(ATTR_MASTER_VALVE): cv.string,
    }
)

# attr -> option key; optional ones MERGE: present+non-empty sets, present+empty clears, absent unchanged
_WEATHER_OPT_KEYS: Final = {
    ATTR_RAIN_SENSOR: const.CONF_RAIN_SENSOR,
    ATTR_OUTDOOR_TEMP_SENSOR: const.CONF_OUTDOOR_TEMP_SENSOR,
    ATTR_LINE_FLOW_SENSOR: const.CONF_LINE_FLOW_SENSOR,
    ATTR_MASTER_VALVE: const.CONF_MASTER_VALVE,
}
```

- [ ] **Step 4: Handler**

```python
async def _async_set_weather_sources(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    merged = dict(entry.options)
    merged[const.CONF_WEATHER_ENTITY] = call.data[ATTR_WEATHER_ENTITY]
    for attr, opt_key in _WEATHER_OPT_KEYS.items():
        if attr in call.data:  # absent = unchanged
            value = call.data[attr]
            if value:  # non-empty = set
                merged[opt_key] = value
            else:  # explicit empty = clear
                merged.pop(opt_key, None)
    _write_hub_options(hass, entry, merged)
```

- [ ] **Step 5: Register + exception strings**

```python
    hass.services.async_register(
        DOMAIN, SERVICE_SET_WEATHER_SOURCES, _async_set_weather_sources, _SET_WEATHER_SOURCES_SCHEMA
    )
```

`translations/en.json` exceptions: `"invalid_hub_settings": { "message": "The settings are not valid ({error})." }`
`translations/it.json` exceptions: `"invalid_hub_settings": { "message": "Le impostazioni non sono valide ({error})." }`

- [ ] **Step 6: Run tests + full gate**

Run: `.venv/bin/pytest tests/components/test_services.py -k set_weather_sources -q && .venv/bin/ruff check . && .venv/bin/mypy && .venv/bin/pytest -q`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add custom_components/irrigation_maestro/services.py custom_components/irrigation_maestro/translations/en.json custom_components/irrigation_maestro/translations/it.json tests/components/test_services.py
git commit -m "feat(services): set_weather_sources + hub-options merge/validate helper"
```

---

### Task 4: `set_consumption_budget` + `set_restrictions`

Two more everyday-settings services, replacing their nested option dicts wholesale.

**Files:**
- Modify: `custom_components/irrigation_maestro/services.py`
- Test: `tests/components/test_services.py`

**Interfaces:**
- Consumes: `_write_hub_options` (Task 3).
- Produces: `set_consumption_budget(liters_per_month?, action, reduce_pct?)`; `set_restrictions(allowed_weekdays?, parity?, forbidden_windows?)`.

- [ ] **Step 1: Write the failing tests**

```python
async def test_set_consumption_budget(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass); park.add("valve.pots"); mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN, "set_consumption_budget",
        {"liters_per_month": 8000, "action": "reduce", "reduce_pct": 40},
        blocking=True,
    )
    from custom_components.irrigation_maestro.models import HubConfig
    hub = HubConfig.from_options(dict(entry.options))
    assert hub.consumption_budget_liters == 8000
    assert hub.consumption_action == "reduce"
    assert hub.consumption_reduce_pct == 40


async def test_set_restrictions(hass, freezer):
    freezer.move_to(START)
    park = MockValvePark(hass); park.add("valve.pots"); mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Pots", "valve.pots")])
    await hass.services.async_call(
        DOMAIN, "set_restrictions",
        {"allowed_weekdays": [0, 2, 4], "parity": "odd",
         "forbidden_windows": [{"start": "22:00", "end": "06:00"}]},
        blocking=True,
    )
    from custom_components.irrigation_maestro.models import HubConfig
    hub = HubConfig.from_options(dict(entry.options))
    assert hub.restrictions.allowed_weekdays == frozenset({0, 2, 4})
    assert str(hub.restrictions.parity) == "odd"
    assert len(hub.restrictions.forbidden_windows) == 1
```

- [ ] **Step 2: Run to verify fail**

Run: `.venv/bin/pytest tests/components/test_services.py -k "consumption_budget or set_restrictions" -v`
Expected: FAIL.

- [ ] **Step 3: Schemas**

```python
_SET_CONSUMPTION_BUDGET_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_LITERS_PER_MONTH): vol.All(vol.Coerce(float), vol.Range(min=0)),
        vol.Required(ATTR_ACTION): vol.In(
            [const.BUDGET_ACTION_NOTIFY, const.BUDGET_ACTION_REDUCE, const.BUDGET_ACTION_SUSPEND]
        ),
        vol.Optional(ATTR_REDUCE_PCT): vol.All(vol.Coerce(int), vol.Range(min=1, max=100)),
    }
)
_WINDOW_SCHEMA = vol.Schema(
    {vol.Required(ATTR_WINDOW_START): cv.string, vol.Required(ATTR_WINDOW_END): cv.string}
)
_SET_RESTRICTIONS_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_ALLOWED_WEEKDAYS): [vol.All(vol.Coerce(int), vol.Range(min=0, max=6))],
        vol.Optional(ATTR_PARITY): vol.In(["odd", "even", "none"]),
        vol.Optional(ATTR_FORBIDDEN_WINDOWS): [_WINDOW_SCHEMA],
    }
)
```

- [ ] **Step 4: Handlers**

```python
async def _async_set_consumption_budget(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    budget: dict[str, Any] = {const.CONF_BUDGET_ACTION: call.data[ATTR_ACTION]}
    if ATTR_LITERS_PER_MONTH in call.data and call.data[ATTR_LITERS_PER_MONTH] > 0:
        budget[const.CONF_BUDGET_LITERS] = float(call.data[ATTR_LITERS_PER_MONTH])
    if ATTR_REDUCE_PCT in call.data:
        budget[const.CONF_BUDGET_REDUCE_PCT] = int(call.data[ATTR_REDUCE_PCT])
    merged = dict(entry.options)
    merged[const.CONF_CONSUMPTION_BUDGET] = budget
    _write_hub_options(hass, entry, merged)


async def _async_set_restrictions(call: ServiceCall) -> None:
    hass = call.hass
    entry = _loaded_entry(hass)
    restrictions: dict[str, Any] = {}
    if ATTR_ALLOWED_WEEKDAYS in call.data and call.data[ATTR_ALLOWED_WEEKDAYS]:
        restrictions[const.CONF_ALLOWED_WEEKDAYS] = sorted(set(call.data[ATTR_ALLOWED_WEEKDAYS]))
    parity = call.data.get(ATTR_PARITY)
    if parity and parity != "none":
        restrictions[const.CONF_PARITY] = parity
    if ATTR_FORBIDDEN_WINDOWS in call.data:
        restrictions[const.CONF_FORBIDDEN_WINDOWS] = [
            {const.CONF_WINDOW_START: w[ATTR_WINDOW_START], const.CONF_WINDOW_END: w[ATTR_WINDOW_END]}
            for w in call.data[ATTR_FORBIDDEN_WINDOWS]
        ]
    merged = dict(entry.options)
    merged[const.CONF_RESTRICTIONS] = restrictions
    _write_hub_options(hass, entry, merged)
```

- [ ] **Step 5: Register**

```python
    hass.services.async_register(
        DOMAIN, SERVICE_SET_CONSUMPTION_BUDGET, _async_set_consumption_budget,
        _SET_CONSUMPTION_BUDGET_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SET_RESTRICTIONS, _async_set_restrictions, _SET_RESTRICTIONS_SCHEMA
    )
```

- [ ] **Step 6: Run tests + full gate**

Run: `.venv/bin/pytest tests/components/test_services.py -k "consumption_budget or set_restrictions" -q && .venv/bin/ruff check . && .venv/bin/mypy && .venv/bin/pytest -q`
Expected: PASS. Verify `_parse_time` accepts the `"22:00"` window strings (it does — `restrictions_from_config` parses `HH:MM`).

- [ ] **Step 7: Commit**

```bash
git add custom_components/irrigation_maestro/services.py tests/components/test_services.py
git commit -m "feat(services): set_consumption_budget + set_restrictions"
```

---

### Task 5: `services.yaml` + service strings + docs + full gate

Register the 6 new services in `services.yaml` with clear IT/EN help (hassfest-clean), document them, and run the whole gate. No version bump.

**Files:**
- Modify: `custom_components/irrigation_maestro/services.yaml`
- Modify: `custom_components/irrigation_maestro/translations/en.json` + `it.json` (`services` block)
- Modify: `docs/design/card-contract.md`
- Test: full suite + hassfest-style consistency check.

- [ ] **Step 1: `services.yaml`** — add the 6 services with field selectors, mirroring the existing entries' style (study `set_program_schedule`/`set_program_minutes` first). Fields:
  - `add_zone`: `name` (text, required), `valve_entity` (entity selector `domain: [valve, switch]`, required), `area_m2` (number), `icon` (icon).
  - `update_zone`: `zone_id` (text, required) + `name`, `valve_entity` (entity valve/switch), `area_m2` (number), `icon`, `flow_sensor` (entity sensor), `nominal_flow_lpm` (number), `flow_tolerance_pct` (number 1-100), `adjustment_pct` (number 10-300), `order` (number 1-1000), `interval_days` (number 1-60), `compatibility_group` (text), `season_months` (multi-select 1-12).
  - `remove_zone`: `zone_id` (text, required).
  - `set_weather_sources`: `weather_entity` (entity `weather`, required), `rain_sensor`/`outdoor_temp_sensor`/`line_flow_sensor` (entity sensor), `master_valve` (entity valve/switch).
  - `set_consumption_budget`: `liters_per_month` (number), `action` (select notify/reduce/suspend, required), `reduce_pct` (number 1-100).
  - `set_restrictions`: `allowed_weekdays` (multi-select 0-6), `parity` (select odd/even/none), `forbidden_windows` (object).
  NO `{…}` / `<…>` anywhere in yaml descriptions.

- [ ] **Step 2: translations `services` block (en + it)** — for each of the 6 services add `name`, `description`, and a `fields.<field>.{name,description}` for EVERY field in the yaml (hassfest requires an exact field-set match, both directions, both locales). Copy the tone/structure of the existing `set_program_*` entries. Italian: "Aggiungi zona", "Modifica zona", "Rimuovi zona", "Imposta meteo e sensori", "Budget consumo", "Restrizioni". NO braces/HTML.

- [ ] **Step 3: `docs/design/card-contract.md`** — add a "Configuration services" subsection documenting the 6 services (fields, the `add_zone` `{zone_id}` response, the in-place/no-reload behavior, and that the config flow remains an alternative).

- [ ] **Step 4: Consistency check (hassfest proxy — Docker not available locally)** — run a throwaway python check that every `services.yaml` service+field has a matching translation entry in both locales (no orphans either direction), and that no service `name`/`description` contains `{` or `<`. Then delete the throwaway script.

```python
# throwaway: verify services.yaml <-> translations field-set parity + no braces/html
import yaml, json, re
sv = yaml.safe_load(open("custom_components/irrigation_maestro/services.yaml"))
for loc in ("en", "it"):
    tr = json.load(open(f"custom_components/irrigation_maestro/translations/{loc}.json"))["services"]
    for svc, spec in sv.items():
        assert svc in tr, f"{loc}: missing service {svc}"
        yf = set((spec.get("fields") or {}))
        tf = set((tr[svc].get("fields") or {}))
        assert yf == tf, f"{loc}:{svc} field mismatch yaml={yf} tr={tf}"
        blob = json.dumps(tr[svc])
        assert "{" not in blob and "<" not in blob, f"{loc}:{svc} has brace/html in service text"
print("services.yaml <-> translations OK")
```

- [ ] **Step 5: Full gate**

Run:
```bash
.venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy && .venv/bin/pytest -q
```
plus JSON validity for the two translation files. Confirm the §8 engine tests still pass (no engine change). manifest version UNCHANGED (still 1.2.0).

- [ ] **Step 6: Commit**

```bash
git add custom_components/irrigation_maestro/services.yaml custom_components/irrigation_maestro/translations/en.json custom_components/irrigation_maestro/translations/it.json docs/design/card-contract.md
git commit -m "docs+meta: services.yaml, strings and contract for the config-hub services"
```

---

## Self-Review

**1. Spec coverage (Phase A slice):**
- `add_zone` (response, seeded, validated, in place) → Task 1. ✓
- `update_zone` / `remove_zone` → Task 2. ✓
- `set_weather_sources` + hub-options helper → Task 3. ✓
- `set_consumption_budget` / `set_restrictions` → Task 4. ✓
- services.yaml + IT/EN + docs + gate → Task 5. ✓
- `invalid_zone` / `invalid_hub_settings` exception keys (with `{error}`) → Tasks 1 & 3. ✓
- In-place/no-reload, validate-before-persist, `ConfigSubentry(unique_id=None, data=MappingProxyType)`, weather-required → constraints honored. ✓
- §8 untouched; no version bump → holds (Phase B ships v1.3.0). ✓
- Frontend (zone editor, settings view, ha-selector) → explicitly Phase B, out of scope. ✓

**2. Placeholder scan:** every code step carries real code; the throwaway consistency script is fully written; services.yaml field lists are enumerated per service.

**3. Type/interface consistency:** `_validate_zone(data, templates)` used in Tasks 1 & 2; `_write_hub_options(hass, entry, patch)` used in Tasks 3 & 4; `_ZONE_PATCH_KEYS`/`_WEATHER_OPT_KEYS` mappings defined before use; service+attr constants defined in Task 1 and reused. Zone-data keys match `models.ZoneConfig.from_subentry` and the config-flow builder (name/valve_entity/area_m2/icon/flow_sensor/nominal_flow_lpm/flow_tolerance_pct/adjustment_pct/order/interval_days/compatibility_group/season_months/cycles). Option keys/nested shapes match `HubConfig.from_options` / `restrictions_from_config`.

**Notes for the executor:**
- Run everything with the repo `.venv` (`.venv/bin/…`).
- Move `MappingProxyType`/`ConfigSubentry` imports to module top (ruff PLC0415 forbids in-function imports in non-test code).
- Add `await hass.async_block_till_done()` after `add_zone`/`remove_zone` in tests so the platform entity reconciliation completes before asserting on `hass.states`.
- If any `tests/engine/**` golden value would move, STOP — that means an accidental engine change; this phase must not touch the engine.
