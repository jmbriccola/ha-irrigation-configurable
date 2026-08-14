# Leak Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect leaks from three independent sources — the valve's own leak sensor, flow measured while every managed valve reports closed, and a missing water supply — resolving availability **per zone** from the hardware's detected capabilities, and unifying the sources that observe the same physical event into a single alarm per zone.

**Architecture:** `capabilities.py` walks the entity and device registries from a zone's valve to find sibling `binary_sensor`s by `device_class`, and a response service exposes the result to the panel, which pre-fills the zone editor; `add_zone` writes what it finds server-side. `leak.py` holds one `LeakDetector` per zone: sources 1 and 2 converge into one state with one notification on the transition, a configurable repeat, and a clearing notification. Source 3 is not a leak and does not touch that state — it blocks a cycle start, explains a zero-flow interrupt, and legitimises a valve that closes itself.

**Tech Stack:** Python 3.13-compatible syntax (ruff `target-version = py313`), mypy strict, Home Assistant ≥ 2025.7, pytest via `pytest-homeassistant-custom-component`, Lit 3 + TypeScript + Vite for the card and panel.

**Spec:** `docs/superpowers/specs/2026-08-14-water-accounting-and-leak-detection-design.md`

**Branch:** `feat/leak-detection`, branched from `main` **after** `feat/water-accounting` (3.3.0) is merged. Ships as 3.4.0. It consumes `RuntimeState.unattributed_closed` and the `WaterAccountant`, which do not exist before that merge.

## Global Constraints

- **Never touch the decision engine.** `engine/weather.py`, `engine/curves.py`, `engine/evaluate.py`, `engine/history.py`, the weights, thresholds, water budget, forecast credit, weighted temperature, immediate skips and the `PRESET_POTS` / `PRESET_LAWN` control points are out of scope.
- **Capabilities are detected, never matched by name.** The entity ids in the brief come from one installation. No string matching on `_water_leak`, no assumed prefixes, no assumed manufacturer.
- **`device_class: moisture` on a valve is not necessarily a ground probe.** On SONOFF SWV it is an alarm derived from the valve's internal flow meter. Every user-visible string must be true for both readings: *"the valve of zone X reports a leak"*, never *"water detected on the ground"*.
- **`water_supply` has `device_class: problem`, so `on` means NO WATER.** The name reads the other way round; this is the mistake made on the first attempt.
- **Uncertainty resolves to the safe side.** `unavailable`, `unknown`, a missing entity and an unconfigured sensor all fall through to the existing behaviour. Never widen an exemption on absent evidence.
- **Code, comments and docstrings in English.** Translations complete in `translations/en.json` and `translations/it.json`; the card has its own IT+EN layer.
- **Italian terminology:** a flow meter is *"flussometro"*, always. *"Contatore"* is reserved for an actual counter.
- **Fully asynchronous, no blocking I/O, no YAML configuration.**
- **Every new service is declared in `services.yaml` AND registered** — two distinct places.
- **`services.yaml` carries three copies of the notification event list.** All three must gain `leak`, and nothing tests that today.
- **`card/src/localize/localize.test.ts:26-28` asserts key ORDER**, not just the key set. Insert new keys at the identical index in `en.ts` and `it.ts`.
- **All `async_call_later` callbacks must be `@callback`-decorated.**
- **Commands:** tests `.venv/bin/pytest <path> -v`; suite `.venv/bin/pytest -q`; lint `.venv/bin/ruff check .`; types `.venv/bin/mypy`; card `cd card && npm run typecheck && npm test && npm run build`.

---

## File Structure

**Created:**
- `custom_components/irrigation_maestro/capabilities.py` — registry walk, per-zone capability resolution.
- `custom_components/irrigation_maestro/leak.py` — `LeakDetector` per zone, alarm state, anti-noise.
- `tests/components/test_capabilities.py` — structured like `test_flow.py`.
- `tests/components/test_leaks.py` — dedicated; `test_safety_extra.py` is the *in-cycle* safety file and is already 728 lines.

**Modified:**
- `session.py` — `_close_valve` guard, the self-close exemption in `_on_valve_change`, the `no_water_supply` reason.
- `const.py`, `models.py`, `services.py`, `services.yaml` — the two new zone keys and the hub leak settings.
- `notify.py` — the `leak` event key.
- `runtime.py`, `sensor.py` — detector lifecycle, capability attributes, repairs.
- `card/src/{types,discovery,zone-row}.ts`, `card/src/panel/{zone-editor,settings-view,config-read}.ts`, `card/src/localize/{en,it}.ts`.
- `translations/{en,it}.json`, `README.md`, `docs/design/card-contract.md`, `MEMORY.md`, `CHANGELOG.md`, `manifest.json`.

---

## Task 1: Fix the ledger entry leaked by closing an already-closed valve

Every re-close path hits this. `_close_valve` (`session.py:973-982`) registers a ledger entry with no `is_closed` guard; `async_wait_until` returns immediately (`valves.py:67`), no transition occurs, and the entry survives its TTL where it can absorb a genuine manual close. `runtime.async_close_all_valves` guards correctly (`runtime.py:346-351`) — this is the odd one out.

**Files:**
- Modify: `custom_components/irrigation_maestro/session.py:973-982`
- Test: `tests/components/test_safety_extra.py`

**Interfaces:**
- Produces: no signature change. `_close_valve` returns `True` immediately for an already-closed valve without registering anything.

- [ ] **Step 1: Write the failing test**

Append to `tests/components/test_safety_extra.py`:

```python
async def test_closing_an_already_closed_valve_leaves_no_ledger_entry(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A command that cannot actuate must not arm a ledger entry.

    The entry only exists to tell our own transition apart from a manual one.
    One that never gets consumed sits there for its whole TTL and absorbs the
    next genuine manual close, silently disarming surveillance.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", minutes=10)])
    runtime = entry.runtime_data
    runner = runtime.session

    assert hass.states.get("valve.a").state == "closed"
    assert await runner._close_valve(runtime.zones[runtime.zone_ids[0]].valve) is True

    # Nothing was armed, so a real manual close is still detectable.
    assert runtime.ledger_consume("valve.a", "close") is False
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/components/test_safety_extra.py::test_closing_an_already_closed_valve_leaves_no_ledger_entry -v`
Expected: FAIL — `ledger_consume` returns `True`, because `_close_valve` armed an entry that nothing consumed.

- [ ] **Step 3: Implement**

In `session.py`:

```python
    async def _close_valve(self, valve: ValveController) -> bool:
        # A valve already closed produces no transition, so a ledger entry
        # registered here would never be consumed and would sit for its whole
        # TTL absorbing the next genuine manual close. runtime.
        # async_close_all_valves guards the same way.
        if valve.is_closed:
            return True
        self._runtime.ledger_expect(valve.entity_id, "close")
        await valve.async_close()
        hub = self._runtime.hub
        confirm_s = hub.switch_confirm_s if valve.is_switch else hub.close_confirm_s
        if await valve.async_wait_until(open_=False, timeout_s=confirm_s):
            return True
        self._runtime.ledger_expect(valve.entity_id, "close")
        await valve.async_close()
        return await valve.async_wait_until(open_=False, timeout_s=confirm_s)
```

- [ ] **Step 4: Run the test and the safety suite**

Run: `.venv/bin/pytest tests/components/test_safety_extra.py -v && .venv/bin/pytest -q`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
.venv/bin/ruff check .
.venv/bin/mypy
git add custom_components/irrigation_maestro/session.py tests/components/test_safety_extra.py
git commit -m "fix(session): do not arm a ledger entry for an already-closed valve

The entry exists only to tell our own transition apart from a manual one.
Closing a closed valve produces no transition, so the entry was never
consumed and sat for its full TTL, where it would absorb the next genuine
manual close and silently disarm surveillance. runtime.async_close_all_valves
already guarded this way; _close_valve was the odd one out. Fixed first
because every re-close path in leak handling hits it."
```

---

## Task 2: The two new zone config keys

**Files:**
- Modify: `const.py:87-101`, `models.py:168-208`, `services.py:466-477` (`_ZONE_PATCH_KEYS`) and its `ATTR_` block and schema, `services.yaml`
- Test: `tests/components/test_services.py`

**Interfaces:**
- Produces, consumed by Tasks 3, 5, 6, 11, 12:
  - `const.CONF_LEAK_SENSOR = "leak_sensor"`, `const.CONF_WATER_SUPPLY_SENSOR = "water_supply_sensor"`
  - `ZoneConfig.leak_sensor: str | None`, `ZoneConfig.water_supply_sensor: str | None`

- [ ] **Step 1: Write the failing test**

Append to `tests/components/test_services.py`:

```python
async def test_update_zone_stores_the_leak_and_supply_sensors(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await hass.services.async_call(
        DOMAIN,
        "update_zone",
        {
            "zone_id": zone_id,
            "leak_sensor": "binary_sensor.a_leak",
            "water_supply_sensor": "binary_sensor.a_supply",
        },
        blocking=True,
    )

    config = runtime.zones[zone_id].config
    assert config.leak_sensor == "binary_sensor.a_leak"
    assert config.water_supply_sensor == "binary_sensor.a_supply"


async def test_a_zone_without_the_new_keys_still_loads(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Backward compatibility: existing subentries have neither key."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    config = entry.runtime_data.zones[entry.runtime_data.zone_ids[0]].config
    assert config.leak_sensor is None
    assert config.water_supply_sensor is None
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/components/test_services.py -v -k "leak_and_supply or without_the_new_keys"`
Expected: FAIL — `update_zone` rejects the unknown keys (its schema has no `ALLOW_EXTRA`).

- [ ] **Step 3: Implement**

In `const.py`, after `CONF_FLOW_TOLERANCE_PCT`:

```python
#: Optional per-zone binary_sensor with device_class "moisture", reporting a
#: leak. On some valves this is a physical probe; on others (SONOFF SWV) it is
#: an alarm derived from the valve's own flow meter. Messages must be true for
#: both, so they say "the valve reports a leak", never "water on the ground".
CONF_LEAK_SENSOR: Final = "leak_sensor"
#: Optional per-zone binary_sensor with device_class "problem". Polarity is
#: inverted with respect to the usual entity name: "on" means PROBLEM, i.e.
#: no water available.
CONF_WATER_SUPPLY_SENSOR: Final = "water_supply_sensor"
```

In `models.py`, add both fields to `ZoneConfig` after `flow_tolerance_pct` and to `from_subentry`:

```python
    leak_sensor: str | None
    water_supply_sensor: str | None
```
```python
            leak_sensor=data.get(const.CONF_LEAK_SENSOR),
            water_supply_sensor=data.get(const.CONF_WATER_SUPPLY_SENSOR),
```

In `services.py`, add the attribute constants beside `ATTR_FLOW_SENSOR`:

```python
ATTR_LEAK_SENSOR: Final = "leak_sensor"
ATTR_WATER_SUPPLY_SENSOR: Final = "water_supply_sensor"
```

add both to `_ZONE_PATCH_KEYS`:

```python
    ATTR_LEAK_SENSOR: const.CONF_LEAK_SENSOR,
    ATTR_WATER_SUPPLY_SENSOR: const.CONF_WATER_SUPPLY_SENSOR,
```

and add `vol.Optional(ATTR_LEAK_SENSOR): cv.string` and `vol.Optional(ATTR_WATER_SUPPLY_SENSOR): cv.string` to the `update_zone` schema.

In `services.yaml`, add both fields to the `update_zone` selectors, using an `entity` selector filtered to `binary_sensor` with the matching `device_class`.

- [ ] **Step 4: Run the tests**

Run: `.venv/bin/pytest tests/components/test_services.py -v && .venv/bin/pytest -q`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
.venv/bin/ruff check .
.venv/bin/mypy
git add -A
git commit -m "feat(config): per-zone leak and water-supply sensor keys

Both optional, both absent from every existing subentry and therefore
backward compatible with no migration. Documented at the constant where the
two traps live: moisture on a valve is not necessarily a ground probe, and
water_supply carries device_class problem, so on means NO water."
```

---

## Task 3: Capability detection

**Files:**
- Create: `custom_components/irrigation_maestro/capabilities.py`
- Modify: `services.py` (new response service), `services.yaml` (declare **and** register)
- Test: `tests/components/test_capabilities.py`

**Interfaces:**
- Produces, consumed by Tasks 4, 5, 13:
  - `ZoneCapabilities` — frozen dataclass with `leak_sensor: str | None`, `water_supply_sensor: str | None`, `leak_candidate: str | None`, `supply_candidate: str | None`, and properties `leak_detection: str` and `water_supply: str` returning `"configured" | "candidate_available" | "unavailable"`.
  - `discover_sibling_sensors(hass, valve_entity) -> tuple[str | None, str | None]` — `(moisture_candidate, problem_candidate)`, either `None`.
  - `resolve_zone_capabilities(hass, zone: ZoneConfig) -> ZoneCapabilities`
  - Service `irrigation_maestro.discover_zone_sensors` (`SupportsResponse.ONLY`), taking `zone_id`, returning `{"leak_candidate": …, "supply_candidate": …, "leak_sensor": …, "water_supply_sensor": …}`.

- [ ] **Step 1: Write the failing tests**

Create `tests/components/test_capabilities.py`:

```python
"""Per-zone capability detection from the entity and device registries.

Structured like test_flow.py, which is the closest existing analogue and is
itself capability detection in miniature: pure resolution first, then late
appearance, then config change without reload, then withdrawal.
"""

from custom_components.irrigation_maestro.capabilities import (
    discover_sibling_sensors,
    resolve_zone_capabilities,
)
from custom_components.irrigation_maestro.const import DOMAIN
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from .mocks import MockValvePark
from .test_session import START, mock_weather, setup_hub, zone_data


def _valve_with_siblings(
    hass: HomeAssistant, *, moisture: bool = True, problem: bool = True
) -> str:
    """A device carrying a valve plus optionally its two binary sensors."""
    foreign = MockConfigEntry(domain="demo")
    foreign.add_to_hass(hass)
    devices = dr.async_get(hass)
    device = devices.async_get_or_create(
        config_entry_id=foreign.entry_id,
        identifiers={("demo", "swv1")},
        name="Irrigazione Vasi",
    )
    entities = er.async_get(hass)
    entities.async_get_or_create(
        "valve", "demo", "swv1_valve", device_id=device.id,
        suggested_object_id="irrigazione_vasi",
    )
    if moisture:
        entities.async_get_or_create(
            "binary_sensor", "demo", "swv1_leak", device_id=device.id,
            suggested_object_id="irrigazione_vasi_water_leak",
            original_device_class="moisture",
        )
    if problem:
        entities.async_get_or_create(
            "binary_sensor", "demo", "swv1_supply", device_id=device.id,
            suggested_object_id="irrigazione_vasi_water_supply",
            original_device_class="problem",
        )
    return "valve.irrigazione_vasi"


async def test_siblings_are_found_by_device_class_not_by_name(
    hass: HomeAssistant,
) -> None:
    valve = _valve_with_siblings(hass)
    leak, supply = discover_sibling_sensors(hass, valve)
    assert leak == "binary_sensor.irrigazione_vasi_water_leak"
    assert supply == "binary_sensor.irrigazione_vasi_water_supply"


async def test_a_valve_without_siblings_offers_no_candidate(hass: HomeAssistant) -> None:
    valve = _valve_with_siblings(hass, moisture=False, problem=False)
    assert discover_sibling_sensors(hass, valve) == (None, None)


async def test_a_valve_with_no_device_at_all_is_handled(hass: HomeAssistant) -> None:
    """A valve that is not in the registry must not raise."""
    hass.states.async_set("valve.orphan", "closed")
    assert discover_sibling_sensors(hass, "valve.orphan") == (None, None)


async def test_capability_is_unavailable_when_nothing_is_found_or_configured(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Declared absent, not an alarm that will silently never fire."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    runtime = entry.runtime_data
    caps = resolve_zone_capabilities(hass, runtime.zones[runtime.zone_ids[0]].config)

    assert caps.leak_detection == "unavailable"
    assert caps.water_supply == "unavailable"


async def test_a_configured_sensor_on_another_device_is_accepted(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A ground probe near the bed is legitimate and needs no special case."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.somewhere_else")],
    )
    runtime = entry.runtime_data
    caps = resolve_zone_capabilities(hass, runtime.zones[runtime.zone_ids[0]].config)

    assert caps.leak_detection == "configured"
    assert caps.leak_sensor == "binary_sensor.somewhere_else"


async def test_an_unconfigured_zone_with_a_candidate_says_so(hass: HomeAssistant) -> None:
    """"Your hardware could do this, you have not told it to" is its own state."""
    valve = _valve_with_siblings(hass)
    park = MockValvePark(hass)
    park.add(valve)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Vasi", valve)])
    runtime = entry.runtime_data
    caps = resolve_zone_capabilities(hass, runtime.zones[runtime.zone_ids[0]].config)

    assert caps.leak_detection == "candidate_available"
    assert caps.leak_candidate == "binary_sensor.irrigazione_vasi_water_leak"


async def test_the_discovery_service_returns_both_candidates(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    valve = _valve_with_siblings(hass)
    park = MockValvePark(hass)
    park.add(valve)
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Vasi", valve)])
    zone_id = entry.runtime_data.zone_ids[0]

    response = await hass.services.async_call(
        DOMAIN, "discover_zone_sensors", {"zone_id": zone_id},
        blocking=True, return_response=True,
    )

    assert response["leak_candidate"] == "binary_sensor.irrigazione_vasi_water_leak"
    assert response["supply_candidate"] == "binary_sensor.irrigazione_vasi_water_supply"
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/components/test_capabilities.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named '...capabilities'`.

- [ ] **Step 3: Implement `capabilities.py`**

```python
"""What a zone's hardware can actually do, resolved per zone.

The entity ids in the field reports are examples from one installation, not a
convention: this module never matches on names. It walks from the zone's valve
to its device through the entity registry, then looks among that device's other
entities for the device_class it needs — "moisture" for a leak report,
"problem" for the water supply.

Detection proposes; storage decides. Nothing here is applied implicitly: what
acts at runtime is only what is written in the zone's configuration, because a
silently adopted sensor is a coupling between two devices that nobody
authorised. add_zone writes what this finds; the panel pre-fills with it.

A capability that is neither configured nor available is declared absent, which
is the point: an alarm that will never fire must say so rather than sit there
looking armed.
"""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.components.binary_sensor import BinarySensorDeviceClass
from homeassistant.const import ATTR_DEVICE_CLASS
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from .models import ZoneConfig

CONFIGURED = "configured"
CANDIDATE_AVAILABLE = "candidate_available"
UNAVAILABLE = "unavailable"


@dataclass(frozen=True, slots=True)
class ZoneCapabilities:
    """What this zone can detect, and what it could if it were told to."""

    leak_sensor: str | None
    water_supply_sensor: str | None
    leak_candidate: str | None
    supply_candidate: str | None

    @staticmethod
    def _status(configured: str | None, candidate: str | None) -> str:
        if configured:
            return CONFIGURED
        return CANDIDATE_AVAILABLE if candidate else UNAVAILABLE

    @property
    def leak_detection(self) -> str:
        return self._status(self.leak_sensor, self.leak_candidate)

    @property
    def water_supply(self) -> str:
        return self._status(self.water_supply_sensor, self.supply_candidate)


def _device_class_of(hass: HomeAssistant, entry: er.RegistryEntry) -> str | None:
    """The class from the registry, falling back to live state.

    The registry answer works before the entity has ever had a state, which is
    the normal case for Zigbee and MQTT right after a restart. The user's own
    override (``device_class``) wins over the integration's
    ``original_device_class``, because that is what the user meant.
    """
    if entry.device_class or entry.original_device_class:
        return entry.device_class or entry.original_device_class
    state = hass.states.get(entry.entity_id)
    return None if state is None else state.attributes.get(ATTR_DEVICE_CLASS)


def discover_sibling_sensors(
    hass: HomeAssistant, valve_entity: str
) -> tuple[str | None, str | None]:
    """(moisture, problem) binary sensors on the valve's own device."""
    registry = er.async_get(hass)
    valve = registry.async_get(valve_entity)
    if valve is None or valve.device_id is None:
        return None, None
    leak: str | None = None
    supply: str | None = None
    for entry in er.async_entries_for_device(
        registry, valve.device_id, include_disabled_entities=False
    ):
        if entry.domain != "binary_sensor":
            continue
        device_class = _device_class_of(hass, entry)
        if device_class == BinarySensorDeviceClass.MOISTURE and leak is None:
            leak = entry.entity_id
        elif device_class == BinarySensorDeviceClass.PROBLEM and supply is None:
            supply = entry.entity_id
    return leak, supply


def resolve_zone_capabilities(hass: HomeAssistant, zone: ZoneConfig) -> ZoneCapabilities:
    """What this zone has, and what its valve's device could offer."""
    leak_candidate, supply_candidate = discover_sibling_sensors(hass, zone.valve_entity)
    return ZoneCapabilities(
        leak_sensor=zone.leak_sensor or None,
        water_supply_sensor=zone.water_supply_sensor or None,
        leak_candidate=leak_candidate,
        supply_candidate=supply_candidate,
    )
```

- [ ] **Step 4: Add the response service — declare AND register**

In `services.py`, add `SERVICE_DISCOVER_ZONE_SENSORS: Final = "discover_zone_sensors"`, the handler:

```python
    async def _async_discover_zone_sensors(call: ServiceCall) -> dict[str, Any]:
        """What the zone's valve device offers, for the panel to pre-fill with.

        Server-side because the frontend cannot do it: the card's HomeAssistant
        object exposes states only — no entity or device registry, and a state's
        attributes never carry a device_id.
        """
        runtime, zone = _zone_from_call(call)
        caps = resolve_zone_capabilities(runtime.hass, zone.config)
        return {
            "leak_sensor": caps.leak_sensor,
            "water_supply_sensor": caps.water_supply_sensor,
            "leak_candidate": caps.leak_candidate,
            "supply_candidate": caps.supply_candidate,
            "leak_detection": caps.leak_detection,
            "water_supply": caps.water_supply,
        }
```

using whatever zone-resolution helper `services.py` already provides for `zone_id` calls, and register it next to the other response services:

```python
    hass.services.async_register(
        DOMAIN,
        SERVICE_DISCOVER_ZONE_SENSORS,
        _async_discover_zone_sensors,
        _ZONE_REQUIRED_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
```

Declare it in `services.yaml` with its `zone_id` field. **Both places** — the declaration and the registration.

- [ ] **Step 5: Run the tests**

Run: `.venv/bin/pytest tests/components/test_capabilities.py -v && .venv/bin/pytest -q`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
.venv/bin/ruff check .
.venv/bin/mypy
git add -A
git commit -m "feat(capabilities): detect a valve's sibling sensors by device_class

Walks the entity registry from the zone's valve to its device and looks for
binary sensors carrying moisture or problem. No name matching: the entity ids
in the field reports come from one installation and are not a convention.

The registry answer is preferred over live state so detection works before
the entity has ever had a state -- the normal case for Zigbee and MQTT right
after a restart -- and a user override of device_class wins over the
integration's original.

Exposed through a response service because the frontend cannot do this: the
card's HomeAssistant object has states only, no registries, and a state's
attributes never carry a device_id."
```

---

## Task 4: `add_zone` writes what it detects

**Files:**
- Modify: `services.py` (the `add_zone` handler)
- Test: `tests/components/test_capabilities.py`

**Interfaces:**
- Consumes: `discover_sibling_sensors` (Task 3).
- Produces: no signature change. `add_zone`'s **schema is untouched** — the values are written server-side, not accepted as inputs, so `panel.ts:361-386` and `zone-editor.ts:390-409` need no change.

- [ ] **Step 1: Write the failing test**

```python
async def test_add_zone_writes_the_detected_sensors(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The creating service writes the defaults (the 3.0.0 convention).

    A zone created on hardware that exposes both sensors is covered from birth,
    with no extra step and no schema change: they are written, not accepted.
    """
    freezer.move_to(START)
    valve = _valve_with_siblings(hass)
    park = MockValvePark(hass)
    park.add(valve)
    park.add("valve.seed")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Seed", "valve.seed")])

    await hass.services.async_call(
        DOMAIN, "add_zone", {"name": "Vasi", "valve_entity": valve}, blocking=True
    )
    runtime = entry.runtime_data
    created = next(
        zone.config for zone in runtime.zones.values() if zone.config.name == "Vasi"
    )

    assert created.leak_sensor == "binary_sensor.irrigazione_vasi_water_leak"
    assert created.water_supply_sensor == "binary_sensor.irrigazione_vasi_water_supply"


async def test_add_zone_leaves_the_keys_absent_when_nothing_is_detected(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.plain")
    park.add("valve.seed")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Seed", "valve.seed")])

    await hass.services.async_call(
        DOMAIN, "add_zone", {"name": "Plain", "valve_entity": "valve.plain"},
        blocking=True,
    )
    runtime = entry.runtime_data
    created = next(
        zone.config for zone in runtime.zones.values() if zone.config.name == "Plain"
    )

    assert created.leak_sensor is None
    assert created.water_supply_sensor is None
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/components/test_capabilities.py -v -k add_zone`
Expected: FAIL — both keys are `None` in the first test.

- [ ] **Step 3: Implement**

In the `add_zone` handler in `services.py`, where the zone dict is assembled and `order` / `adjustment_pct` are written explicitly, add:

```python
        # The creating service writes the defaults (3.0.0). Detection runs once,
        # here, so a zone created on hardware that exposes both sensors is
        # covered from birth. Written rather than accepted as input: add_zone's
        # schema has no ALLOW_EXTRA and its whitelist is duplicated in the
        # panel, so an input field would be a three-way change for no gain.
        leak_candidate, supply_candidate = discover_sibling_sensors(hass, valve_entity)
        if leak_candidate:
            zone_data[const.CONF_LEAK_SENSOR] = leak_candidate
        if supply_candidate:
            zone_data[const.CONF_WATER_SUPPLY_SENSOR] = supply_candidate
```

Use whatever local names the handler already has for the new zone dict and the valve entity.

- [ ] **Step 4: Run the tests**

Run: `.venv/bin/pytest tests/components/test_capabilities.py -v && .venv/bin/pytest -q`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
.venv/bin/ruff check .
.venv/bin/mypy
git add -A
git commit -m "feat(services): add_zone writes the sensors it detects

Follows the 3.0.0 convention that the creating service writes the defaults,
so a zone created on hardware exposing both sensors is covered from birth.
Written server-side rather than accepted as input: add_zone's schema has no
ALLOW_EXTRA and its whitelist is duplicated in panel.ts and zone-editor.ts,
so an input field would be a three-way change for nothing gained. Existing
zones are untouched -- no migration adopts a sensor behind the user's back."
```

---

## Task 5: Capabilities on the zone sensor

**Files:**
- Modify: `sensor.py` (`ZoneStateSensor._role_attributes`), `docs/design/card-contract.md`
- Test: `tests/components/test_entities.py`

**Interfaces:**
- Consumes: `resolve_zone_capabilities` (Task 3).
- Produces: `zone_state.capabilities` — `{water_accounting, leak_detection, water_supply}`, consumed by Task 13.

- [ ] **Step 1: Write the failing test**

```python
async def test_zone_state_declares_its_capabilities(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A mixed installation: each zone reports its own hardware, not the hub's."""
    freezer.move_to(START)
    valve = _valve_with_siblings(hass)
    park = MockValvePark(hass)
    park.add(valve)
    park.add("valve.plain")
    hass.states.async_set("sensor.flow", "0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Vasi", valve, flow_sensor="sensor.flow",
                leak_sensor="binary_sensor.irrigazione_vasi_water_leak",
            ),
            zone_data("Plain", "valve.plain", nominal_flow_lpm=5.0),
        ],
    )
    runtime = entry.runtime_data
    equipped = role_state(hass, "zone_state", zone_id=runtime.zone_ids[0])
    bare = role_state(hass, "zone_state", zone_id=runtime.zone_ids[1])

    assert equipped.attributes["capabilities"]["leak_detection"] == "configured"
    assert equipped.attributes["capabilities"]["water_accounting"] == "measured"
    assert bare.attributes["capabilities"]["leak_detection"] == "unavailable"
    assert bare.attributes["capabilities"]["water_accounting"] == "estimated"
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/components/test_entities.py -v -k capabilities`
Expected: FAIL — `KeyError: 'capabilities'`.

- [ ] **Step 3: Implement**

In `ZoneStateSensor._role_attributes`, add:

```python
        attributes["capabilities"] = self._capabilities(config)
```

and the method:

```python
    def _capabilities(self, config: ZoneConfig) -> dict[str, str]:
        """What this zone can do, resolved per zone rather than per hub.

        In a mixed installation one zone has the sensor and another does not,
        and each must behave and report accordingly. "candidate_available"
        means the hardware could do it and has not been told to — an invitation
        in the card, not an alarm.
        """
        runtime = self._runtime
        caps = resolve_zone_capabilities(self.hass, config)
        if not runtime.zone_has_flow_meter(config):
            accounting = "estimated" if config.nominal_flow_lpm else "unavailable"
        elif runtime.zone_flow_meter_usable(runtime.zones[config.zone_id]):
            accounting = "measured"
        else:
            accounting = "unavailable"
        return {
            "water_accounting": accounting,
            "leak_detection": caps.leak_detection,
            "water_supply": caps.water_supply,
        }
```

Document the block in `docs/design/card-contract.md` beside the other `zone_state` attributes.

- [ ] **Step 4: Run and commit**

```bash
.venv/bin/pytest tests/components/test_entities.py -v && .venv/bin/pytest -q
.venv/bin/ruff check . && .venv/bin/mypy
git add -A
git commit -m "feat(sensor): zone_state declares its per-zone capabilities

Resolved per zone, not per hub: in a mixed installation one zone has the
sensor and another does not, and each must report accordingly. Three states
rather than two, because \"your hardware could do this and has not been told
to\" is neither configured nor absent, and the card renders it as an
invitation instead of an alarm."
```

---

## Task 6: The `leak` notification event key

**Files:**
- Modify: `notify.py:25-57`, `services.yaml` (**three** copies of the event list), `translations/{en,it}.json`, `card/src/panel/notification-wizard-state.ts`, `card/src/localize/{en,it}.ts`
- Test: `tests/components/test_notify.py`, `tests/components/test_services_settings.py`, new `services.yaml` consistency test

**Interfaces:**
- Produces: `notify.EVENT_LEAK = "leak"`, in `GROUP_CRITICAL` and in `ESSENTIAL_EVENTS`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/test_notify.py`:

```python
def test_leak_is_critical_and_essential() -> None:
    """Water damage is not an informational event.

    ESSENTIAL_EVENTS is deliberately not one of the display groups: it drives
    the defaults the wizard proposes, the default high priority, the
    missing-recipient repair and the definition of "mute". leak belongs in
    both, and that is not duplication.
    """
    assert EVENT_LEAK in GROUP_CRITICAL
    assert EVENT_LEAK in ESSENTIAL_EVENTS
    assert default_priority(EVENT_LEAK) == PRIORITY_HIGH


def test_leak_enabled_without_a_recipient_is_rejected() -> None:
    status = evaluate_notifications({"leak": {"enabled": True, "services": []}})
    assert "leak" in status.enabled_without_target
```

Create `tests/components/test_services_yaml.py`:

```python
"""services.yaml keeps three copies of the notification event list.

A key missing from one of them is unpickable in Developer Tools while the
service still accepts it -- a silent, one-sided divergence that nothing
caught before this test.
"""

from pathlib import Path

import yaml

from custom_components.irrigation_maestro.notify import ALL_EVENTS


def test_every_event_list_in_services_yaml_is_complete() -> None:
    raw = yaml.safe_load(
        (
            Path(__file__).parents[2]
            / "custom_components/irrigation_maestro/services.yaml"
        ).read_text(encoding="utf-8")
    )
    found = 0
    for service in raw.values():
        for field in (service.get("fields") or {}).values():
            options = (field.get("selector") or {}).get("select", {}).get("options")
            if not options:
                continue
            values = {
                option if isinstance(option, str) else option["value"]
                for option in options
            }
            if values & set(ALL_EVENTS):
                found += 1
                assert values >= set(ALL_EVENTS), f"incomplete event list: {values}"
    assert found >= 3, f"expected at least three event lists, found {found}"
```

- [ ] **Step 2: Run to verify they fail**

Run: `.venv/bin/pytest tests/components/test_notify.py tests/components/test_services_yaml.py -v`
Expected: FAIL — `ImportError: cannot import name 'EVENT_LEAK'`.

- [ ] **Step 3: Implement**

In `notify.py`:

```python
EVENT_LEAK: Final = "leak"
```
```python
GROUP_CRITICAL: Final = (EVENT_WATCHDOG, EVENT_ANOMALY, EVENT_LEAK)
```
```python
ESSENTIAL_EVENTS: Final = frozenset(
    {EVENT_WATCHDOG, EVENT_ANOMALY, EVENT_SENTINEL, EVENT_INTERRUPTED, EVENT_LEAK}
)
```

Add `leak` to **all three** event lists in `services.yaml`.

- [ ] **Step 4: Correct the prose that enumerates the essential four**

Both strings name them explicitly and go stale:

- `translations/en.json`, `services.set_notifications.fields.priority.description` — "Defaults to high for watchdog, anomaly, sentinel and interrupted"
- `translations/en.json`, `issues.notifications_silent.description`

and their Italian mirrors, plus any Italian doc under `docs/it/` repeating the list. Add `leak` to each.

- [ ] **Step 5: Add the localised strings**

Add the wizard's `leak` label and description to `card/src/localize/en.ts` and `it.ts` **at the identical index in both files** — `localize.test.ts:26-28` asserts order. Italian: *"Perdita d'acqua"*.

- [ ] **Step 6: Run everything**

Run: `.venv/bin/pytest -q && cd card && npm test && cd ..`
Expected: all PASS, including `tests/test_translations.py` key parity and `localize.test.ts` key order. Any test asserting the size of `ESSENTIAL_EVENTS` must be updated from four to five — that is the intended change, not a regression.

- [ ] **Step 7: Commit**

```bash
.venv/bin/ruff check . && .venv/bin/mypy
git add -A
git commit -m "feat(notify): a dedicated leak event, critical and essential

In GROUP_CRITICAL for presentation and in ESSENTIAL_EVENTS for the four
consumers that set governs -- the wizard's proposed defaults, the default
high priority, the vanished-recipient repair, and the definition of mute.
Both, not one: ESSENTIAL_EVENTS is deliberately not a display group.

Also adds the first test of services.yaml's three duplicated event lists. A
key missing from one of them is unpickable in Developer Tools while the
service still accepts it, and nothing caught that before."
```

---

## Task 7: `LeakDetector` — sources 1 and 2, one alarm

**Files:**
- Create: `custom_components/irrigation_maestro/leak.py`
- Modify: `const.py` (hub settings), `models.py` (`HubConfig`), `runtime.py` (lifecycle)
- Test: `tests/components/test_leaks.py`

**Interfaces:**
- Consumes: `RuntimeState.unattributed_closed` and `WaterAccountant` from the water-accounting branch; `ZoneConfig.leak_sensor` (Task 2).
- Produces, consumed by Tasks 8, 13:
  - `LeakState` — frozen dataclass with `active: bool`, `since: datetime | None`, `first_source: str | None`, `sources: frozenset[str]`.
  - `LeakDetector(runtime, zone_id)` with `start()`, `stop()`, `state -> LeakState`, `note_flow(closed_liters_delta: float, at: datetime)`.
  - `SOURCE_VALVE_SENSOR = "valve_sensor"`, `SOURCE_NO_FLOW_CLOSED = "no_flow_closed"`.
  - Hub settings: `leak_action` (`notify` | `close` | `close_and_block`, default `close`), `leak_threshold_lpm` (0.5), `leak_confirm_s` (300), `leak_repeat_min` (360), `require_water_supply` (True).

- [ ] **Step 1: Write the failing tests for each source alone**

Create `tests/components/test_leaks.py`:

```python
"""Leak sourcing: flow while every valve is closed, and the valve's own alarm.

A dedicated file rather than test_safety_extra.py, which is the in-cycle
safety file and is already 728 lines. This is its mirror image: everything
here happens with the valves shut.
"""

from datetime import date

from custom_components.irrigation_maestro.leak import (
    SOURCE_NO_FLOW_CLOSED,
    SOURCE_VALVE_SENSOR,
)
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant

from .mocks import MockValvePark
from .test_session import START, advance, mock_weather, setup_hub, zone_data


async def test_the_valve_sensor_alone_raises_the_alarm(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", leak_sensor="binary_sensor.a_leak")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    await advance(hass, freezer, 310, step=10.0)

    state = runtime.leak_state(zone_id)
    assert state.active is True
    assert state.first_source == SOURCE_VALVE_SENSOR


async def test_flow_with_every_valve_closed_alone_raises_the_alarm(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The check only this component can make, because only it commanded the close."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    await advance(hass, freezer, 310, step=10.0)

    state = runtime.leak_state(zone_id)
    assert state.active is True
    assert state.first_source == SOURCE_NO_FLOW_CLOSED


async def test_a_drip_below_the_threshold_never_alarms(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.2", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data

    await advance(hass, freezer, 600, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is False


async def test_flow_that_stops_before_the_confirm_delay_never_alarms(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Post-cycle drainage runs above threshold briefly; that is not a leak."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "5.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data

    await advance(hass, freezer, 120, step=10.0)
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 600, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is False


async def test_a_zone_with_no_source_never_alarms_and_never_raises(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a")])
    runtime = entry.runtime_data

    await advance(hass, freezer, 900, step=10.0)

    assert runtime.leak_state(runtime.zone_ids[0]).active is False


async def test_both_sources_together_produce_one_alarm(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The real SONOFF SWV case: the firmware detects the same physical event.

    Its moisture sensor is not a probe, it is an alarm derived from the valve's
    own flow meter -- so on that hardware sources 1 and 2 see one leak twice.
    Two notifications for one event is noise the user cannot decode.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    hass.states.async_set("binary_sensor.a_leak", "off", {"device_class": "moisture"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha", "valve.a",
                flow_sensor="sensor.flow", leak_sensor="binary_sensor.a_leak",
            )
        ],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    events: list[dict] = []
    hass.bus.async_listen("irrigation_maestro_leak", lambda e: events.append(e.data))

    await advance(hass, freezer, 310, step=10.0)
    hass.states.async_set("binary_sensor.a_leak", "on", {"device_class": "moisture"})
    await advance(hass, freezer, 310, step=10.0)

    state = runtime.leak_state(zone_id)
    assert state.sources == {SOURCE_NO_FLOW_CLOSED, SOURCE_VALVE_SENSOR}
    assert state.first_source == SOURCE_NO_FLOW_CLOSED
    assert len([event for event in events if event["state"] == "active"]) == 1
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/components/test_leaks.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named '...leak'`.

- [ ] **Step 3: Add the hub settings**

In `const.py`:

```python
CONF_LEAK_ACTION: Final = "leak_action"
CONF_LEAK_THRESHOLD_LPM: Final = "leak_threshold_lpm"
CONF_LEAK_CONFIRM_S: Final = "leak_confirm_s"
CONF_LEAK_REPEAT_MIN: Final = "leak_repeat_min"
CONF_REQUIRE_WATER_SUPPLY: Final = "require_water_supply"

LEAK_ACTION_NOTIFY: Final = "notify"
LEAK_ACTION_CLOSE: Final = "close"
LEAK_ACTION_CLOSE_AND_BLOCK: Final = "close_and_block"

#: Sustained flow below this, with everything shut, is drip and drainage.
DEFAULT_LEAK_THRESHOLD_LPM: Final = 0.5
#: How long that flow must persist. The timer starts when the last valve
#: closes and resets whenever flow drops below the threshold, so post-cycle
#: drainage cannot reach it: it would have to run above threshold unbroken for
#: the whole window, which is not drainage.
DEFAULT_LEAK_CONFIRM_S: Final = 300
DEFAULT_LEAK_REPEAT_MIN: Final = 360
```

In `models.py`, add the five fields to `HubConfig` with those defaults and parse them in `from_options`.

- [ ] **Step 4: Implement `leak.py`**

```python
"""One leak alarm per zone, from sources that may see the same event twice.

Source 1 is the valve's own sensor; source 2 is flow measured while every
managed valve reports closed, which only this component can check because only
it commanded the closure. On SONOFF SWV hardware they are the same physical
detection -- the valve's "moisture" sensor is an alarm derived from its
internal flow meter, not a probe -- so they converge into one state with one
notification. Which source noticed first is kept, because "the valve told me"
and "I measured it" are different diagnostic facts at equal alarm.

Source 3, the water supply, is not a leak and is not handled here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING

from homeassistant.core import CALLBACK_TYPE, Event, EventStateChangedData, callback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util

if TYPE_CHECKING:
    from .runtime import IrrigationRuntime

SOURCE_VALVE_SENSOR = "valve_sensor"
SOURCE_NO_FLOW_CLOSED = "no_flow_closed"


@dataclass(frozen=True, slots=True)
class LeakState:
    """One zone's alarm. One alarm, however many sources agree."""

    active: bool = False
    since: datetime | None = None
    first_source: str | None = None
    sources: frozenset[str] = field(default_factory=frozenset)


class LeakDetector:
    """Watches one zone's sources and keeps one alarm state."""

    def __init__(self, runtime: IrrigationRuntime, zone_id: str) -> None:
        self._runtime = runtime
        self._zone_id = zone_id
        self.state = LeakState()
        self._flow_above_since: datetime | None = None
        self._last_notified_at: datetime | None = None
        self._unsubs: list[CALLBACK_TYPE] = []

    def start(self) -> None:
        sensor = self._config.leak_sensor if self._config else None
        if sensor:
            self._unsubs.append(
                async_track_state_change_event(
                    self._runtime.hass, [sensor], self._on_leak_sensor
                )
            )

    def stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()

    @property
    def _config(self):  # type: ignore[no-untyped-def]
        zone = self._runtime.zones.get(self._zone_id)
        return zone.config if zone else None

    @callback
    def _on_leak_sensor(self, event: Event[EventStateChangedData]) -> None:
        new_state = event.data["new_state"]
        if new_state is None:
            return
        if new_state.state == "on":
            self._raise(SOURCE_VALVE_SENSOR)
        elif new_state.state == "off":
            self._withdraw(SOURCE_VALVE_SENSOR)

    def note_flow(self, lpm: float, *, all_closed: bool, now: datetime) -> None:
        """Feed source 2: flow observed with every managed valve shut.

        The confirm timer starts when flow first exceeds the threshold with
        everything closed, and resets the moment it drops below or anything
        opens. Drainage after a cycle therefore cannot reach the window: it
        would have to stay above the threshold unbroken for the whole of it.
        """
        hub = self._runtime.hub
        if not all_closed or lpm < hub.leak_threshold_lpm:
            self._flow_above_since = None
            self._withdraw(SOURCE_NO_FLOW_CLOSED)
            return
        if self._flow_above_since is None:
            self._flow_above_since = now
            return
        if (now - self._flow_above_since).total_seconds() >= hub.leak_confirm_s:
            self._raise(SOURCE_NO_FLOW_CLOSED)

    def _raise(self, source: str) -> None:
        now = dt_util.utcnow()
        if self.state.active:
            if source in self.state.sources:
                self._maybe_repeat(now)
                return
            # A second source agreeing is not a second leak. Record it and stay
            # quiet: two notifications for one physical event is noise the user
            # has no way to decode.
            self.state = LeakState(
                active=True,
                since=self.state.since,
                first_source=self.state.first_source,
                sources=self.state.sources | {source},
            )
            self._runtime.dispatch_update()
            return
        self.state = LeakState(
            active=True, since=now, first_source=source, sources=frozenset({source})
        )
        self._last_notified_at = now
        self._runtime.on_leak_raised(self._zone_id, self.state)

    def _maybe_repeat(self, now: datetime) -> None:
        repeat_s = self._runtime.hub.leak_repeat_min * 60
        if (
            self._last_notified_at is not None
            and (now - self._last_notified_at).total_seconds() < repeat_s
        ):
            return
        self._last_notified_at = now
        self._runtime.on_leak_repeated(self._zone_id, self.state)

    def _withdraw(self, source: str) -> None:
        if not self.state.active or source not in self.state.sources:
            return
        remaining = self.state.sources - {source}
        if remaining:
            self.state = LeakState(
                active=True,
                since=self.state.since,
                first_source=self.state.first_source,
                sources=remaining,
            )
            self._runtime.dispatch_update()
            return
        self.state = LeakState()
        self._last_notified_at = None
        self._runtime.on_leak_cleared(self._zone_id)
```

- [ ] **Step 5: Wire the detectors into the runtime**

In `runtime.py`: build one `LeakDetector` per zone alongside the other per-zone runtime state, rebuild them wherever zones are rebuilt, add `leak_state(zone_id) -> LeakState`, and feed source 2 from the accountant — in `WaterAccountant._on_sample`, after crediting the unattributed bucket, call

```python
        scope = self._scope_for(entity_id)
        detector = self._runtime.leak_detector(scope)
        if detector is not None:
            detector.note_flow(
                sample.lpm or 0.0, all_closed=self._all_valves_closed(), now=sample.at
            )
```

Add the three runtime hooks `on_leak_raised`, `on_leak_repeated`, `on_leak_cleared` as stubs that fire the `leak` event; Task 8 fills in the notification, the repair and the action.

```python
    def on_leak_raised(self, zone_id: str, state: LeakState) -> None:
        self.fire_event(
            "leak",
            {
                "zone_id": zone_id,
                "state": "active",
                "first_source": state.first_source,
                "sources": sorted(state.sources),
            },
        )
        self.dispatch_update()
```

- [ ] **Step 6: Run the tests**

Run: `.venv/bin/pytest tests/components/test_leaks.py -v && .venv/bin/pytest -q`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
.venv/bin/ruff check . && .venv/bin/mypy
git add -A
git commit -m "feat(leak): one alarm per zone from two sources that may agree

Source 1 is the valve's own sensor, source 2 is flow measured while every
managed valve reports closed -- the check only this component can make,
because only it commanded the closure.

On SONOFF SWV they are the same physical detection: that valve's moisture
sensor is an alarm derived from its internal flow meter, not a probe. So a
second source arriving at an active alarm records itself and stays quiet.
first_source is kept, because \"the valve told me\" and \"I measured it\"
are different diagnostic facts at equal alarm.

The confirm timer resets whenever flow drops below the threshold, so
post-cycle drainage cannot reach it: it would have to run above threshold
unbroken for the whole window, which is not drainage."
```

---

## Task 8: Notification, Repairs, and the action

**Files:**
- Modify: `runtime.py` (the three hooks), `translations/{en,it}.json`
- Test: `tests/components/test_leaks.py`

**Interfaces:**
- Consumes: `notify.EVENT_LEAK` (Task 6), `LeakState` (Task 7), `hub.leak_action`.
- Produces: Repairs issue `leak_<zone_id>`; notifications through `Notifier`.

- [ ] **Step 1: Write the failing tests**

```python
async def test_a_persistent_leak_notifies_once_then_at_the_repeat_interval(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Not one notification per detection: the condition persists, the noise must not."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    sent: list[dict] = []
    hass.services.async_register("notify", "phone", lambda call: sent.append(call.data))
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")],
        {
            "notifications": {"leak": {"enabled": True, "services": ["phone"]}},
            "leak_repeat_min": 10,
        },
    )

    await advance(hass, freezer, 310, step=10.0)
    assert len(sent) == 1

    await advance(hass, freezer, 300, step=30.0)      # 5 min: still inside the interval
    assert len(sent) == 1

    await advance(hass, freezer, 400, step=30.0)      # past 10 min
    assert len(sent) == 2


async def test_clearing_sends_the_closing_notice_and_resolves_the_issue(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]
    registry = ir.async_get(hass)

    await advance(hass, freezer, 310, step=10.0)
    assert registry.async_get_issue(DOMAIN, f"leak_{zone_id}") is not None

    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 60, step=10.0)

    assert runtime.leak_state(zone_id).active is False
    assert registry.async_get_issue(DOMAIN, f"leak_{zone_id}") is None


async def test_the_default_action_re_closes_without_blocking(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Recovers a valve left open by a lost command; dries nothing on a false positive."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "2.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    park.force_state("valve.a", "open")
    await hass.async_block_till_done()
    before = len(park.commands)

    await advance(hass, freezer, 310, step=10.0)

    assert any(
        service == "close_valve" and entity == "valve.a"
        for service, entity in park.commands[before:]
    )
    # Not blocked: the next scheduled cycle still runs.
    assert runtime.hub.leak_action == "close"
```

Add `from homeassistant.helpers import issue_registry as ir` and `from custom_components.irrigation_maestro.const import DOMAIN` to the imports.

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/components/test_leaks.py -v -k "persistent or clearing or default_action"`
Expected: FAIL — no notification is sent and no issue is created.

- [ ] **Step 3: Implement the hooks**

In `runtime.py`, fill in the three hooks:

```python
    def on_leak_raised(self, zone_id: str, state: LeakState) -> None:
        self._fire_leak_event(zone_id, state, "active")
        zone = self.zones.get(zone_id)
        name = zone.config.name if zone else zone_id
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            f"leak_{zone_id}",
            is_fixable=False,
            severity=ir.IssueSeverity.ERROR,
            translation_key="leak",
            translation_placeholders={"zone": name},
        )
        self._notify_leak(name, state)
        if self.hub.leak_action in (LEAK_ACTION_CLOSE, LEAK_ACTION_CLOSE_AND_BLOCK):
            # Closing what is already closed is a no-op; this exists for the
            # valve left open by a command that never landed. It does not
            # repair a seeping seat and does not pretend to. Ledger-registered
            # so surveillance does not read it as manual intervention.
            self.entry.async_create_background_task(
                self.hass, self.async_close_all_valves(), name="irrigation_maestro_leak_close"
            )
        self.dispatch_update()

    def on_leak_repeated(self, zone_id: str, state: LeakState) -> None:
        zone = self.zones.get(zone_id)
        self._notify_leak(zone.config.name if zone else zone_id, state)

    def on_leak_cleared(self, zone_id: str) -> None:
        self._fire_leak_event(zone_id, LeakState(), "cleared")
        ir.async_delete_issue(self.hass, DOMAIN, f"leak_{zone_id}")
        zone = self.zones.get(zone_id)
        name = zone.config.name if zone else zone_id
        self.entry.async_create_background_task(
            self.hass,
            self.notifier.async_notify(
                EVENT_LEAK,
                title="💧 Irrigation Maestro",
                message=f"{name}: the leak condition has cleared.",
            ),
            name="irrigation_maestro_notify_leak_cleared",
        )
        self.dispatch_update()

    def _notify_leak(self, zone_name: str, state: LeakState) -> None:
        """Wording that is true whatever the sensor physically is.

        On some valves a "moisture" sensor is a ground probe; on others it is
        an alarm derived from the valve's own flow meter. "Water detected on
        the ground" would be false for half the installations, so the message
        reports what is known: the valve reports a leak, or we measured flow
        while everything was shut.
        """
        detail = (
            "the valve reports a leak"
            if state.first_source == SOURCE_VALVE_SENSOR
            else "water is flowing with every valve closed"
        )
        self.entry.async_create_background_task(
            self.hass,
            self.notifier.async_notify(
                EVENT_LEAK,
                title="💧 Irrigation Maestro",
                message=f"{zone_name}: possible leak — {detail}. Check the system.",
            ),
            name="irrigation_maestro_notify_leak",
        )
```

Add the `leak` issue strings to `translations/en.json` and `translations/it.json`. Italian must be generic in the same way: *«la valvola della zona {zone} segnala una perdita»*, never *«rilevata acqua sul terreno»*.

- [ ] **Step 4: Add `leak_action` to the hub settings service**

Add `leak_action`, `leak_threshold_lpm`, `leak_confirm_s`, `leak_repeat_min` and `require_water_supply` to `set_settings` in `services.py` and `services.yaml`, in the Advanced group.

- [ ] **Step 5: Run and commit**

```bash
.venv/bin/pytest tests/components/test_leaks.py -v && .venv/bin/pytest -q
.venv/bin/ruff check . && .venv/bin/mypy
git add -A
git commit -m "feat(leak): notify on the transition, repeat on an interval, repair while it lasts

A persistent leak must not notify on every detection. One notification on
the transition, a repeat every leak_repeat_min while it lasts, a clearing
notice when it stops, and a Repairs issue for the whole duration -- the
notification is read and forgotten, the issue stays.

Default action re-closes master and valves, ledger-registered, without
blocking. Closing what is already closed is a no-op, and that is the honest
position: the component cannot stop a leak it detects while idle, only
report it and re-assert the closure. It does recover the valve left open by
a command that never landed, and it dries nothing on a false positive.

Messages say \"the valve reports a leak\", never \"water on the ground\":
on SWV that sensor is derived from the valve's flow meter, and the other
wording would be false for half of all installations."
```

---

## Task 9: Source 3 — the water supply

**Files:**
- Modify: `session.py:49-56` (reason), `runtime.py` (gate + repair), `card/src/types.ts`, `card/src/localize/{en,it}.ts`, `docs/design/card-contract.md`
- Test: `tests/components/test_leaks.py`

**Interfaces:**
- Consumes: `ZoneConfig.water_supply_sensor` (Task 2), `hub.require_water_supply` (Task 7).
- Produces: `session.REASON_NO_WATER_SUPPLY = "no_water_supply"`; `runtime.water_supply_missing(zone_id) -> bool` — **True only when a sensor is configured and reads exactly `"on"`**.

- [ ] **Step 1: Write the failing tests**

```python
async def test_water_supply_polarity_on_means_no_water(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """device_class problem: "on" is the problem, i.e. the water is gone.

    The entity name reads the other way round and this is the mistake made on
    the first attempt.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_supply", "off", {"device_class": "problem"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", water_supply_sensor="binary_sensor.a_supply")],
    )
    runtime = entry.runtime_data
    zone_id = runtime.zone_ids[0]

    assert runtime.water_supply_missing(zone_id) is False

    hass.states.async_set("binary_sensor.a_supply", "on", {"device_class": "problem"})
    await hass.async_block_till_done()
    assert runtime.water_supply_missing(zone_id) is True


async def test_an_uncertain_supply_sensor_is_not_treated_as_missing_water(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Uncertainty resolves to the safe side: unavailable is not "no water"."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_supply", "unavailable", {"device_class": "problem"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", water_supply_sensor="binary_sensor.a_supply")],
    )
    runtime = entry.runtime_data
    assert runtime.water_supply_missing(runtime.zone_ids[0]) is False


async def test_a_cycle_is_skipped_when_there_is_no_water(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Blocking costs the garden nothing: with no water the cycle waters nothing.

    What it saves is a pointless valve actuation, and it replaces an
    interrupted cycle with an outcome that says why.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_supply", "on", {"device_class": "problem"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha", "valve.a", minutes=10,
                water_supply_sensor="binary_sensor.a_supply",
            )
        ],
    )
    await advance(hass, freezer, 31 * 60)

    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "skipped"
    assert outcome["reason_key"] == "no_water_supply"
    assert hass.states.get("valve.a").state == "closed"


async def test_the_supply_gate_can_be_turned_off(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A flaky sensor must not be able to stop the system without appeal."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_supply", "on", {"device_class": "problem"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha", "valve.a", minutes=10,
                water_supply_sensor="binary_sensor.a_supply",
            )
        ],
        {"require_water_supply": False},
    )
    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/components/test_leaks.py -v -k supply`
Expected: FAIL — `AttributeError: 'IrrigationRuntime' object has no attribute 'water_supply_missing'`.

- [ ] **Step 3: Implement**

In `session.py`, add `REASON_NO_WATER_SUPPLY = "no_water_supply"` beside the other reasons.

In `runtime.py`:

```python
    def water_supply_missing(self, zone_id: str) -> bool:
        """True only on hard evidence that the water is gone.

        device_class "problem": "on" is the problem, so on means NO water. The
        entity name usually reads the other way round.

        Anything else -- no sensor, unavailable, unknown, a missing entity --
        is not evidence, and returns False. Uncertainty resolves to the side
        that keeps watering, because the alternative is a flaky sensor drying
        the garden.
        """
        zone = self.zones.get(zone_id)
        sensor = zone.config.water_supply_sensor if zone else None
        if not sensor:
            return False
        state = self.hass.states.get(sensor)
        return state is not None and state.state == "on"
```

In the session runner, in the same gate block that already rejects a segment before opening a valve, add:

```python
        if (
            self._runtime.hub.require_water_supply
            and self._runtime.water_supply_missing(segment.zone_id)
        ):
            self._record(segment, RESULT_SKIPPED, REASON_NO_WATER_SUPPLY)
            return
```

and where a run ends with `REASON_NO_FLOW`, prefer the specific diagnosis when it is available:

```python
        if watering_result == "no_flow":
            reason = (
                REASON_NO_WATER_SUPPLY
                if runtime.water_supply_missing(segment.zone_id)
                else REASON_NO_FLOW
            )
            self._record(segment, RESULT_INTERRUPTED, reason, minutes=allowed_min)
```

Add the reason to `card/src/types.ts:35-63`, to `en.ts` and `it.ts` **at the same index**, and to `docs/design/card-contract.md:279-291`. If it must notify as an interruption rather than a cancellation, add it to `runtime.py:839`'s reason tuple.

Raise a Repairs issue `water_supply_missing_<zone_id>` while the condition holds, cleared when it lifts, with strings in both locales.

- [ ] **Step 4: Run and commit**

```bash
.venv/bin/pytest tests/components/test_leaks.py -v && .venv/bin/pytest -q
.venv/bin/ruff check . && .venv/bin/mypy
cd card && npm run typecheck && npm test && cd ..
git add -A
git commit -m "feat(leak): the water-supply sensor, with its inverted polarity

device_class problem means on = NO water, the opposite of how the entity
name reads. It explains a zero-flow interrupt with a specific reason instead
of the generic one, and blocks a cycle start by default -- which costs the
garden nothing, because with no water the cycle waters nothing either way;
what it saves is a pointless actuation and an outcome that says why.

Configurable, because a flaky sensor must not stop the system without
appeal. And strictly evidence-based: unavailable, unknown and missing all
mean \"not known to be missing\", never \"missing\"."
```

---

## Task 10: The valve that closes itself

**Files:**
- Modify: `session.py:539-542` (`_on_valve_change`)
- Test: `tests/components/test_leaks.py`

**Interfaces:**
- Consumes: `runtime.water_supply_missing` (Task 9).
- Produces: no new symbols. `_on_valve_change` gains one narrow exemption before the `REASON_MANUAL` branch.

- [ ] **Step 1: Write the failing tests**

```python
async def test_a_self_closing_valve_is_not_manual_intervention(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The SWV closes itself when it detects no flow; do not fight it.

    Treated as a legitimate closure: the run ends with no_water_supply, the
    other zones carry on, and the manual-stop block is not armed.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    park.add("valve.b")
    hass.states.async_set("binary_sensor.a_supply", "off", {"device_class": "problem"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data("Alpha", "valve.a", minutes=10, order=1,
                      water_supply_sensor="binary_sensor.a_supply"),
            zone_data("Beta", "valve.b", minutes=10, order=2),
        ],
    )
    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    # The valve's own firmware closes it because the supply failed.
    hass.states.async_set("binary_sensor.a_supply", "on", {"device_class": "problem"})
    park.force_state("valve.a", "closed")
    await advance(hass, freezer, 30, step=5.0)

    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["reason_key"] == "no_water_supply"
    assert runtime.state.manual_stop_at is None      # the block was not armed


async def test_an_unledgered_close_without_supply_evidence_still_aborts(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """No sensor, no exemption. The manual-intervention guarantee is not weakened
    where the evidence to weaken it is absent."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(hass, [zone_data("Alpha", "valve.a", minutes=10)])
    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    park.force_state("valve.a", "closed")
    await advance(hass, freezer, 30, step=5.0)

    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["reason_key"] == "manual_intervention"
    assert runtime.state.manual_stop_at is not None


async def test_an_unavailable_supply_sensor_grants_no_exemption(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("binary_sensor.a_supply", "unavailable", {"device_class": "problem"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10,
                   water_supply_sensor="binary_sensor.a_supply")],
    )
    await advance(hass, freezer, 31 * 60)
    park.force_state("valve.a", "closed")
    await advance(hass, freezer, 30, step=5.0)

    runtime = entry.runtime_data
    assert runtime.state.last_outcome(runtime.zone_ids[0])["reason_key"] == "manual_intervention"
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/pytest tests/components/test_leaks.py -v -k self_closing`
Expected: FAIL — the first test gets `manual_intervention` and an armed manual-stop block.

- [ ] **Step 3: Implement**

In `session.py`, in `_on_valve_change`, replace the `elif` branch:

```python
        if is_open and entity_id not in expected_open:
            self._trigger_manual_abort(REASON_FOREIGN_VALVE)
        elif is_closed and entity_id in expected_open:
            zone_id = self._zone_of_valve(entity_id)
            if zone_id is not None and self._runtime.water_supply_missing(zone_id):
                # The valve's own firmware closes it when it detects no flow
                # (the SWV's automatic no-water closure). Fighting that would
                # abort every zone over a legitimate, self-diagnosed stop.
                #
                # Deliberately narrow: only the watering zone's OWN valve, and
                # only on hard evidence from its OWN supply sensor. Without a
                # sensor there is no way to tell the firmware from a hand on the
                # switch, and the manual-intervention guarantee is not weakened
                # where the evidence to weaken it is absent.
                self._end_segment_no_supply(zone_id)
                return
            self._trigger_manual_abort(REASON_MANUAL)
```

Add the two helpers. `_zone_of_valve` maps an entity id back to the zone id among `self._active`, returning `None` for the master or any valve not currently watering. `_end_segment_no_supply` resolves the running segment's future with a dedicated result so `_water` returns and the segment records `RESULT_INTERRUPTED` with `REASON_NO_WATER_SUPPLY` — **not** by letting the zero-flow guard notice up to 120 s later. One terminating path, chosen, rather than two racing:

```python
    @callback
    def _end_segment_no_supply(self, zone_id: str) -> None:
        """End this zone's run now, with the specific reason.

        The zero-flow guard would reach the same conclusion within its 120 s
        grace window, but by accident and later. Handing off deliberately keeps
        one outcome instead of two possible ones, and the run is already dry.
        """
        finisher = self._segment_finishers.get(zone_id)
        if finisher is not None:
            finisher("no_water_supply")
```

Register the finisher in `_water` when the future is created: `self._segment_finishers[segment.zone_id] = _finish`, removed in the `finally`. Handle the `"no_water_supply"` result where `"no_flow"` is handled, recording `RESULT_INTERRUPTED` with `REASON_NO_WATER_SUPPLY`.

- [ ] **Step 4: Run the full suite**

Run: `.venv/bin/pytest -q`
Expected: all PASS, including every existing manual-intervention test — the exemption is narrow enough that none of them meets its conditions.

- [ ] **Step 5: Commit**

```bash
.venv/bin/ruff check . && .venv/bin/mypy
git add -A
git commit -m "feat(session): a valve that closes itself for lack of water is legitimate

The SWV exposes an automatic no-water closure and uses it. Treating that as
manual intervention aborted every zone over a self-diagnosed, correct stop.

Narrow on purpose: the watering zone's OWN valve, an unledgered close, and
hard evidence from its OWN supply sensor. No sensor, unavailable or unknown
all fall through to the existing abort -- without evidence there is no way
to tell firmware from a hand on the switch, and the guarantee is not
weakened where the evidence to weaken it is absent.

Per zone: the manual-stop block is not armed and the other zones carry on.
The segment is ended explicitly rather than left to the zero-flow guard,
which would reach the same conclusion up to 120 s later and by accident."
```

---

## Task 11: Panel and card

**Files:**
- Modify: `card/src/panel/zone-editor.ts`, `card/src/panel/settings-view.ts`, `card/src/panel/config-read.ts`, `card/src/discovery.ts`, `card/src/zone-row.ts`, `card/src/types.ts`, `card/src/localize/{en,it}.ts`
- Test: `card/src/discovery.test.ts`, `card/src/panel/zone-editor.test.ts`, `card/src/panel/settings-view.test.ts`

**Interfaces:**
- Consumes: `zone_state.capabilities` (Task 5), `discover_zone_sensors` (Task 3).
- Produces: `capabilityBadges(zone: ZoneEntities): CapabilityBadge[]` in `discovery.ts` — a pure helper, tested there, because there is no `zone-row.test.ts` harness.

- [ ] **Step 1: Write the failing helper test**

Append to `card/src/discovery.test.ts`:

```typescript
describe("capabilityBadges", () => {
  const zoneWith = (capabilities: Record<string, string>) =>
    ({
      zone_state: {
        entity_id: "sensor.a_state",
        state: "idle",
        attributes: { maestro_role: "zone_state", capabilities, degraded: [] },
      },
    }) as never;

  it("badges nothing when everything is configured", () => {
    expect(
      capabilityBadges(
        zoneWith({
          water_accounting: "measured",
          leak_detection: "configured",
          water_supply: "configured",
        }),
      ),
    ).toEqual([]);
  });

  it("declares an absent capability rather than staying silent", () => {
    const badges = capabilityBadges(
      zoneWith({
        water_accounting: "estimated",
        leak_detection: "unavailable",
        water_supply: "unavailable",
      }),
    );
    expect(badges.map((badge) => badge.key)).toEqual([
      "water_estimated",
      "leak_unavailable",
      "supply_unavailable",
    ]);
    expect(badges.every((badge) => badge.tone === "muted")).toBe(true);
  });

  it("invites configuration when the hardware could do it", () => {
    const badges = capabilityBadges(
      zoneWith({
        water_accounting: "measured",
        leak_detection: "candidate_available",
        water_supply: "configured",
      }),
    );
    expect(badges).toEqual([{ key: "leak_candidate", tone: "hint" }]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd card && npx vitest run src/discovery.test.ts`
Expected: FAIL — `capabilityBadges is not exported`.

- [ ] **Step 3: Implement the helper and render it**

Add `capabilityBadges` to `discovery.ts` returning `{key, tone}[]`, with `tone: "muted"` for a declared absence and `"hint"` for a candidate. Render the badges in `zone-row.ts` next to the existing degraded badges.

- [ ] **Step 4: The zone editor**

In `card/src/panel/zone-editor.ts`, inside the **Avanzate** drawer (which renders only when `isEdit`, `zone-editor.ts:234-244`), add two `ha-selector` entity pickers for `leak_sensor` and `water_supply_sensor`, each pre-filled from `discover_zone_sensors` and each showing the provenance through the existing `.field-note` "detected: X" idiom already used for the flow unit (`zone-editor.ts:281-308`). When neither a value nor a candidate exists, show the note that the capability is unavailable on this device — the user may still pick a sensor elsewhere.

Add both keys to the editor's patch whitelist at `zone-editor.ts:390-409`.

- [ ] **Step 5: The settings view**

In `card/src/panel/settings-view.ts`, add `leak_action` (a select over the three values), `leak_threshold_lpm`, `leak_confirm_s`, `leak_repeat_min` and `require_water_supply` to the collapsed Advanced drawer, and read them in `config-read.ts`.

- [ ] **Step 6: Localise**

Add every new key to `en.ts` and `it.ts` **at the identical index in both**. Italian, and note the terminology rule: *"flussometro"* for the meter; *"perdita"*, *"mancanza d'acqua"*, *"sensore di perdita non disponibile su questo dispositivo"*.

- [ ] **Step 7: Run the frontend checks and build**

```bash
cd card && npm run typecheck && npm test && npm run build && cd ..
```
Expected: typecheck clean, all tests pass including `localize.test.ts`'s key-order assertion, both bundles emitted.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(panel): configure the leak sensors, declare what is missing

The zone editor pre-fills both selectors from the backend discovery and
shows where the value came from, in the Avanzate drawer next to the flow
sensor -- the drawer only exists in edit mode, which is why creation writes
the detected sensors server-side instead.

The row now declares an absent capability instead of staying silent, and
distinguishes it from \"your hardware could do this and has not been told
to\", which reads as an invitation rather than an alarm.

Badge logic is a pure capabilityBadges() helper in discovery.ts: there is no
zone-row test harness, and factoring it out is cheaper than retrofitting one."
```

---

## Task 12: Documentation, changelog, release

**Files:**
- Modify: `README.md`, `docs/design/card-contract.md`, `MEMORY.md`, `CHANGELOG.md`, `manifest.json`, `INSTRUCTIONS.md`, `docs/it/*`

- [ ] **Step 1: Degradation-matrix rows**

Add to `README.md`:

| Feature | Requires | Without it |
|---|---|---|
| Leak detection — valve sensor | A `binary_sensor` with `device_class: moisture`, detected on the valve's device or chosen by the user | Declared unavailable for that zone: no alarm sits there looking armed |
| Leak detection — flow with valves closed | A flow meter (zone or line) whose unit can be determined | Declared unavailable for that zone; on hardware with no meter this is the source that would otherwise have provided detection |
| Water-supply diagnosis and pre-emptive block | A `binary_sensor` with `device_class: problem` (`on` = no water) | No pre-emptive block; a dry cycle is still interrupted, but diagnosed as generic zero-flow rather than as a supply failure |
| Self-close treated as legitimate | The zone's water-supply sensor configured and readable | An unledgered close is treated as manual intervention and aborts the session, as before |

- [ ] **Step 2: MEMORY entries**

Append to `MEMORY.md` under "Deliberate design decisions":

- **Capabilities are detected, never named (3.4.0).** The registry walk goes valve → device → sibling `binary_sensor` by `device_class`. Entity ids in field reports are examples from one installation. Do not add name matching, prefixes, or manufacturer assumptions anywhere.
- **Detection proposes, storage decides (3.4.0).** `add_zone` writes what it finds; the panel pre-fills. Nothing is adopted implicitly at runtime, and no migration adopts a sensor for an existing zone — a silently coupled device is a coupling nobody authorised.
- **Sources 1 and 2 are one alarm (3.4.0).** On SONOFF SWV the valve's `moisture` sensor is derived from its internal flow meter, so both sources see one physical event. A second source at an active alarm records itself and stays quiet. `first_source` is kept because the two are different diagnostic facts.
- **`water_supply` is `device_class: problem`: `on` means NO water (3.4.0).** Inverted with respect to the entity name. Uncertainty (`unavailable`, `unknown`, missing, unconfigured) never counts as evidence of a missing supply.
- **The self-close exemption is narrow on purpose (3.4.0).** The watering zone's own valve, unledgered close, its own supply sensor reading `on`. Nothing else. Without evidence there is no way to tell firmware from a hand on the switch, so the manual-intervention guarantee stands.
- **The default leak action re-closes and does not block (3.4.0).** Closing what is already closed is a no-op, and that is the honest position: the component cannot stop a leak it detects while idle. It recovers a valve left open by a lost command and dries nothing on a false positive. `close_and_block` exists for the burst-pipe case and is opt-in.

- [ ] **Step 3: Changelog and version**

Add a `## 3.4.0` section to `CHANGELOG.md`: capability detection, the three sources, the unified per-zone alarm, the `leak` notification event, `leak_action`, the water-supply gate, and the self-close exemption. Under a "Fixes" heading: the ledger entry leaked by closing an already-closed valve.

Bump `manifest.json` to `3.4.0`. Update `INSTRUCTIONS.md` and the Italian guides for the new zone fields and hub settings.

- [ ] **Step 4: Full verification**

```bash
.venv/bin/pytest -q
.venv/bin/ruff check .
.venv/bin/mypy
cd card && npm run typecheck && npm test && npm run build && cd ..
git status --short          # both frontend bundles staged
```

- [ ] **Step 5: Commit and open the PR**

```bash
git add -A
git commit -m "chore: release 3.4.0 -- per-zone leak detection

Docs, degradation matrix, changelog, manifest bump."
git push -u origin feat/leak-detection
```

Then open the PR against `main`, stating what the component does on leak detection and why that choice: it re-closes and notifies but does not block, because closing an already-closed valve is a no-op and the honest position is that a leak found while idle cannot be stopped by this component — only reported, with the closure re-asserted in case a command was lost. Blocking is available and opt-in, because a false positive that blocks dries the zone.

---

## Self-Review

**Spec coverage.** §2.1 detection → Tasks 3, 4, 5. §2.2 source 1 → Task 7; source 2 → Task 7; source 3 → Task 9. §2.3 one alarm → Tasks 7, 8; the `leak` event key → Task 6. §2.4 action → Task 8, with its prerequisite in Task 1. §2.5 self-close → Task 10. §2.6 degradation matrix → Task 12. §2.7 tests → Tasks 3, 7, 8, 9, 10, 11.

**Placeholders.** None. Two steps say "use whatever helper the file already provides" (Task 3 Step 4's zone resolution, Task 4 Step 3's local names) — that is a deliberate instruction to follow the existing convention rather than an unspecified decision, and the surrounding code is given in full.

**Type consistency.** `LeakState`'s four fields are constructed in Task 7 and read by name in Tasks 8 and 11. `note_flow(lpm, *, all_closed, now)` is defined in Task 7 and called with exactly that shape from `WaterAccountant._on_sample` in the same task. `water_supply_missing(zone_id) -> bool` is introduced in Task 9 and consumed in Tasks 9 and 10. `ZoneCapabilities`'s two status properties return the same three string literals used in Task 5's attribute block and Task 11's badge helper. `discover_sibling_sensors` returns `(leak, supply)` in that order in Tasks 3 and 4.
