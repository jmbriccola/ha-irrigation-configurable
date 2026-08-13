# Flow Sensor Units Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read a flow sensor's declared unit and convert it to L/min at one boundary, so an m³/h meter stops being counted as L/min — and declare a degradation instead of inventing a number when the unit cannot be determined.

**Architecture:** A new `flow.py` module owns the only code that reads a flow sensor's state. It resolves the unit on every read — explicit override first, then the state's `unit_of_measurement` through `VolumeFlowRateConverter`, then unknown — and returns `float | None`. L/min stays the canonical unit everywhere else, so nothing downstream changes shape. An unknown unit is treated exactly like a missing meter at every point where a missing meter is already handled, including the zero-flow guard, which would otherwise interrupt every run.

**Tech Stack:** Python 3.13-compatible syntax (mypy parses at 3.14), Home Assistant 2025.7+ APIs, `homeassistant.util.unit_conversion.VolumeFlowRateConverter`, `homeassistant.const.UnitOfVolumeFlowRate`, `homeassistant.helpers.issue_registry`, pytest + pytest-homeassistant-custom-component, Lit 3 + TypeScript + Vite + vitest for the card.

**Spec:** `docs/superpowers/specs/2026-08-13-flow-sensor-units-design.md`

## Global Constraints

- Branch: `feat/flow-sensor-units`, branched from `main` at `0e8d3d3` (after the 3.1.0 notification wizard merged). The notification work is done and released — do not touch it.
- Code, comments and docstrings in **English**. Translations complete in `custom_components/irrigation_maestro/translations/en.json` **and** `it.json`, with identical key structure; the card has its own IT+EN layer in `card/src/localize/{en,it}.ts`, also key-identical.
- **Italian register**, enforced repeatedly on the previous branch: `watchdog` stays an untranslated loanword, prose is direct and formal, no invented terminology. Unit symbols (`L/min`, `m³/h`) are never translated.
- Everything async, no blocking I/O, no YAML configuration.
- Every new service must be declared in `services.yaml` **and** registered in `async_setup_services` — two distinct places. This feature adds fields to existing services only, so only the `services.yaml` declarations change.
- Backwards compatible: existing configurations keep loading. The new keys are optional and absent means "detect", so **no config-entry version bump and no migration**.
- **Do not touch the decision engine**: `engine/weather.py`, `engine/curves.py`, `engine/evaluate.py`, `engine/history.py`, weights, thresholds, water budget, forecast credit, weighted temperature, immediate skips, `PRESET_POTS` / `PRESET_LAWN` control points.
- Line length 100, ruff `target-version = py313`, mypy strict.
- Commands from the repo root: `.venv/bin/pytest`, `.venv/bin/ruff check .`, `.venv/bin/ruff format --check .`, `.venv/bin/mypy`, `npm --prefix card run test`, `npm --prefix card run typecheck`, `npm --prefix card run build`.
- The suite is **425 pytest / 132 vitest** green at the branch point.
- **Two existing tests encode the assumption this feature removes** and are corrected in Task 3, with the reason in the commit message.

---

### Task 1: `flow.py` — the single conversion boundary

**Files:**
- Create: `custom_components/irrigation_maestro/flow.py`
- Test: `tests/components/test_flow.py` (create)

**Interfaces:**
- Consumes: nothing from this plan.
- Produces: `CANONICAL_UNIT`, `SUPPORTED_FLOW_UNITS: frozenset[str]`, `FlowUnitSource` (`"override" | "declared" | "unknown"`), `FlowReading`, `FlowSensorReader(hass, entity_id, override=None)` with `.read() -> FlowReading` and `.unit_known -> bool`.

- [ ] **Step 1: Write the failing tests**

Create `tests/components/test_flow.py`:

```python
"""Unit resolution at the one boundary that reads a flow sensor.

The component used to read float(state.state) and call it L/min whatever the
sensor declared. On the field install the zone meters publish m3/h, which made
every litre 16.7x too small.
"""

import pytest
from custom_components.irrigation_maestro.flow import (
    CANONICAL_UNIT,
    SUPPORTED_FLOW_UNITS,
    FlowSensorReader,
)
from homeassistant.const import UnitOfVolumeFlowRate
from homeassistant.core import HomeAssistant
from homeassistant.util.unit_conversion import VolumeFlowRateConverter


def test_the_canonical_unit_is_litres_per_minute() -> None:
    assert CANONICAL_UNIT == UnitOfVolumeFlowRate.LITERS_PER_MINUTE


def test_the_supported_units_are_exactly_what_the_converter_handles() -> None:
    # A hand-maintained list would drift the moment HA adds a unit.
    assert SUPPORTED_FLOW_UNITS == frozenset(VolumeFlowRateConverter.VALID_UNITS)


async def test_a_cubic_metres_per_hour_sensor_is_converted(hass: HomeAssistant) -> None:
    # The exact case from the field install.
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    reading = FlowSensorReader(hass, "sensor.flow").read()
    assert reading.lpm == pytest.approx(7.5)
    assert reading.source == "declared"


async def test_a_litres_per_minute_sensor_passes_through(hass: HomeAssistant) -> None:
    hass.states.async_set("sensor.flow", "7.5", {"unit_of_measurement": "L/min"})
    reading = FlowSensorReader(hass, "sensor.flow").read()
    assert reading.lpm == pytest.approx(7.5)
    assert reading.source == "declared"


async def test_a_sensor_with_no_declared_unit_is_unknown(hass: HomeAssistant) -> None:
    # Deliberately NOT assumed to be L/min: assuming silently is the defect.
    hass.states.async_set("sensor.flow", "7.5")
    reading = FlowSensorReader(hass, "sensor.flow").read()
    assert reading.lpm is None
    assert reading.source == "unknown"
    assert reading.unit is None


async def test_a_unit_the_converter_cannot_handle_is_unknown(hass: HomeAssistant) -> None:
    hass.states.async_set("sensor.flow", "7.5", {"unit_of_measurement": "widgets/s"})
    reading = FlowSensorReader(hass, "sensor.flow").read()
    assert reading.lpm is None
    assert reading.source == "unknown"


async def test_an_override_wins_over_the_declared_unit(hass: HomeAssistant) -> None:
    # The sensor claims L/min, the user says it is really m3/h. The user wins,
    # and the reading says so.
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "L/min"})
    reading = FlowSensorReader(hass, "sensor.flow", override="m³/h").read()
    assert reading.lpm == pytest.approx(7.5)
    assert reading.source == "override"
    assert reading.unit == "m³/h"


async def test_an_override_rescues_a_sensor_that_declares_nothing(hass: HomeAssistant) -> None:
    hass.states.async_set("sensor.flow", "0.45")
    reading = FlowSensorReader(hass, "sensor.flow", override="m³/h").read()
    assert reading.lpm == pytest.approx(7.5)


async def test_an_unsupported_override_falls_back_to_the_declared_unit(
    hass: HomeAssistant,
) -> None:
    # A stored override the converter does not know must not blind a sensor
    # that declares a unit perfectly well.
    hass.states.async_set("sensor.flow", "7.5", {"unit_of_measurement": "L/min"})
    reading = FlowSensorReader(hass, "sensor.flow", override="widgets/s").read()
    assert reading.lpm == pytest.approx(7.5)
    assert reading.source == "declared"


async def test_a_missing_sensor_reads_unknown(hass: HomeAssistant) -> None:
    reading = FlowSensorReader(hass, "sensor.nope").read()
    assert reading.lpm is None
    assert reading.source == "unknown"


@pytest.mark.parametrize("state", ["unavailable", "unknown", "not a number"])
async def test_an_unusable_state_reads_zero_when_the_unit_is_known(
    hass: HomeAssistant, state: str
) -> None:
    # Unit known, value not: that is zero flow, which the zero-flow guard is
    # entitled to act on. It is NOT the same as an unknown unit.
    hass.states.async_set("sensor.flow", state, {"unit_of_measurement": "L/min"})
    reading = FlowSensorReader(hass, "sensor.flow").read()
    assert reading.lpm == 0.0
    assert reading.source == "declared"


async def test_a_negative_reading_is_clamped_to_zero(hass: HomeAssistant) -> None:
    hass.states.async_set("sensor.flow", "-3", {"unit_of_measurement": "L/min"})
    assert FlowSensorReader(hass, "sensor.flow").read().lpm == 0.0


async def test_the_unit_is_re_read_every_time(hass: HomeAssistant) -> None:
    # An upstream integration update or an entity-settings override can change
    # it while the system runs.
    reader = FlowSensorReader(hass, "sensor.flow")
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    assert reader.read().lpm == pytest.approx(7.5)
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "L/min"})
    assert reader.read().lpm == pytest.approx(0.45)
    hass.states.async_set("sensor.flow", "0.45")
    assert reader.read().lpm is None
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_flow.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'custom_components.irrigation_maestro.flow'`.

- [ ] **Step 3: Implement `flow.py`**

Create `custom_components/irrigation_maestro/flow.py`:

```python
"""The one place a flow sensor's state is read, and the one place a unit is converted.

Every flow number inside this integration is litres per minute: `nominal_flow_lpm`,
the tolerance band, accumulated litres, volume-curve targets and the monthly
consumption counter. Conversion happens here, at the boundary, so no downstream
code ever sees a foreign unit and no downstream code has to know one exists.

Before this module the component read `float(state.state)` and called it L/min
whatever the sensor declared. On a real install the zone meters publish m³/h,
which made every litre 1000/60 ≈ 16.7 times too small.

When the unit cannot be determined the reading is None rather than a guess.
Callers must treat that as "no usable meter" — see the degradation matrix in
README.md — because a plausible number that is silently wrong is worse than a
declared absence.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Final, Literal

from homeassistant.const import ATTR_UNIT_OF_MEASUREMENT, UnitOfVolumeFlowRate
from homeassistant.core import HomeAssistant
from homeassistant.util.unit_conversion import VolumeFlowRateConverter

_LOGGER = logging.getLogger(__name__)

CANONICAL_UNIT: Final = UnitOfVolumeFlowRate.LITERS_PER_MINUTE

#: Derived from the converter rather than hand-listed, so it cannot drift when
#: Home Assistant adds a unit.
SUPPORTED_FLOW_UNITS: Final = frozenset(VolumeFlowRateConverter.VALID_UNITS)

type FlowUnitSource = Literal["override", "declared", "unknown"]

_UNUSABLE_STATES: Final = frozenset({"unavailable", "unknown"})


@dataclass(frozen=True, slots=True)
class FlowReading:
    """One reading in canonical units, or None when the unit is unknown."""

    lpm: float | None
    unit: str | None
    source: FlowUnitSource

    @property
    def unit_known(self) -> bool:
        return self.source != "unknown"


class FlowSensorReader:
    """Reads a flow sensor and returns L/min, or None when the unit is unknown.

    The unit is resolved on every read — it is a dict lookup on the state
    object, so a unit that changes at runtime (an upstream integration update,
    an entity-settings override) is picked up with no extra machinery.
    """

    def __init__(self, hass: HomeAssistant, entity_id: str, override: str | None = None) -> None:
        self._hass = hass
        self._entity_id = entity_id
        self._override = override

    @property
    def entity_id(self) -> str:
        return self._entity_id

    def read(self) -> FlowReading:
        """The current flow in L/min, with the unit that produced it."""
        state = self._hass.states.get(self._entity_id)
        declared = None if state is None else state.attributes.get(ATTR_UNIT_OF_MEASUREMENT)

        # The override wins even against a unit the sensor declares perfectly
        # well: the user is correcting a sensor they know lies. An override the
        # converter cannot handle is ignored rather than allowed to blind a
        # sensor that does declare something usable.
        unit: str
        source: FlowUnitSource
        if self._override in SUPPORTED_FLOW_UNITS:
            unit, source = str(self._override), "override"
        elif declared in SUPPORTED_FLOW_UNITS:
            unit, source = str(declared), "declared"
        else:
            return FlowReading(None, None, "unknown")

        if state is None or state.state in _UNUSABLE_STATES:
            # Unit known, value not: that is zero flow, and the zero-flow guard
            # is entitled to act on it. Not the same as an unknown unit.
            return FlowReading(0.0, unit, source)
        try:
            raw = float(state.state)
        except ValueError:
            return FlowReading(0.0, unit, source)

        lpm = VolumeFlowRateConverter.convert(max(raw, 0.0), unit, CANONICAL_UNIT)
        return FlowReading(max(lpm, 0.0), unit, source)

    @property
    def unit_known(self) -> bool:
        return self.read().unit_known
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/bin/pytest tests/components/test_flow.py -v`
Expected: PASS, 15 tests (three of them parametrised).

- [ ] **Step 5: Lint and typecheck**

Run: `.venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy`
Expected: clean. Note `type FlowUnitSource = ...` is a 3.12+ statement; if ruff's py313 target or mypy objects in this position, use `FlowUnitSource: TypeAlias = Literal[...]` instead.

- [ ] **Step 6: Commit**

```bash
git add custom_components/irrigation_maestro/flow.py tests/components/test_flow.py
git commit -m "feat(flow): one boundary that reads a sensor and converts its unit

L/min stays the canonical unit of the whole engine; conversion happens here,
on the way in, so no downstream code sees a foreign unit or has to know one
exists. 0.45 m3/h now reads as 7.5 L/min instead of 0.45.

A unit that cannot be determined returns None rather than a guess. Treating a
number as L/min whatever it declares is the defect this module removes, so
replacing it with a different silent assumption would not be a fix.

SUPPORTED_FLOW_UNITS is derived from VolumeFlowRateConverter.VALID_UNITS
rather than hand-listed, with a test pinning the equality."
```

---

### Task 2: The explicit override, stored and editable

**Files:**
- Modify: `custom_components/irrigation_maestro/const.py:86` (zone keys) and `:17` (hub keys)
- Modify: `custom_components/irrigation_maestro/models.py:175-195` (`ZoneConfig`), `:247-285` (`HubConfig`)
- Modify: `custom_components/irrigation_maestro/services.py:296-298` (zone schema), `:452-454` (zone key map), `:303-310` (`_SET_WEATHER_SOURCES_SCHEMA`), `:336-340` (`_WEATHER_OPT_KEYS`)
- Modify: `custom_components/irrigation_maestro/services.yaml` (`add_zone`, `update_zone`, `set_weather_sources`)
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `it.json`
- Test: `tests/components/test_models.py`, `tests/components/test_services.py` (append)

**Interfaces:**
- Consumes: `SUPPORTED_FLOW_UNITS` from Task 1.
- Produces: `const.CONF_FLOW_SENSOR_UNIT = "flow_sensor_unit"`, `const.CONF_LINE_FLOW_UNIT = "line_flow_sensor_unit"`, `ZoneConfig.flow_sensor_unit: str | None`, `HubConfig.line_flow_sensor_unit: str | None`, and the service fields `flow_sensor_unit` (on `add_zone` / `update_zone`) and `line_flow_sensor_unit` (on `set_weather_sources`).

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/test_models.py`:

```python
def test_a_zone_without_a_unit_override_reports_none() -> None:
    config = ZoneConfig.from_subentry(
        "z1",
        {"name": "Pots", "valve_entity": "valve.pots", "flow_sensor": "sensor.f"},
        templates={},
    )
    assert config.flow_sensor_unit is None


def test_a_zone_carries_its_unit_override() -> None:
    config = ZoneConfig.from_subentry(
        "z1",
        {
            "name": "Pots",
            "valve_entity": "valve.pots",
            "flow_sensor": "sensor.f",
            "flow_sensor_unit": "m³/h",
        },
        templates={},
    )
    assert config.flow_sensor_unit == "m³/h"


def test_the_hub_carries_the_line_meter_unit_override() -> None:
    hub = HubConfig.from_options(
        {
            "weather_entity": "weather.x",
            "line_flow_sensor": "sensor.line",
            "line_flow_sensor_unit": "m³/h",
        }
    )
    assert hub.line_flow_sensor_unit == "m³/h"
```

Append to `tests/components/test_services.py`:

```python
async def test_add_zone_stores_a_flow_unit_override(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [])
    await hass.services.async_call(
        DOMAIN,
        "add_zone",
        {
            "name": "Vasi",
            "valve_entity": "valve.vasi",
            "flow_sensor": "sensor.vasi_flow",
            "flow_sensor_unit": "m³/h",
        },
        blocking=True,
    )
    zone = next(iter(entry.subentries.values()))
    assert zone.data["flow_sensor_unit"] == "m³/h"


async def test_a_unit_the_converter_cannot_handle_is_refused(hass: HomeAssistant) -> None:
    await setup_hub(hass, [])
    with pytest.raises(vol.Invalid):
        await hass.services.async_call(
            DOMAIN,
            "add_zone",
            {"name": "Vasi", "valve_entity": "valve.vasi", "flow_sensor_unit": "widgets/s"},
            blocking=True,
        )


async def test_set_weather_sources_stores_the_line_meter_unit(hass: HomeAssistant) -> None:
    entry = await setup_hub(hass, [])
    await hass.services.async_call(
        DOMAIN,
        "set_weather_sources",
        {
            "weather_entity": "weather.test",
            "line_flow_sensor": "sensor.line",
            "line_flow_sensor_unit": "m³/h",
        },
        blocking=True,
    )
    assert entry.options["line_flow_sensor_unit"] == "m³/h"


async def test_clearing_the_line_meter_clears_its_unit_override(hass: HomeAssistant) -> None:
    # An override that outlived its sensor would silently apply to whatever
    # sensor is configured next.
    entry = await setup_hub(
        hass, [], {"line_flow_sensor": "sensor.line", "line_flow_sensor_unit": "m³/h"}
    )
    await hass.services.async_call(
        DOMAIN,
        "set_weather_sources",
        {"weather_entity": "weather.test", "line_flow_sensor": ""},
        blocking=True,
    )
    assert "line_flow_sensor" not in entry.options
    assert "line_flow_sensor_unit" not in entry.options
```

Match the existing import style in each file; both already import `pytest`, `vol` and the `setup_hub` / `zone_data` helpers.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_models.py tests/components/test_services.py -v -k "unit or flow_unit or line_meter"`
Expected: FAIL — `ZoneConfig` has no `flow_sensor_unit`, and the services reject the unknown field.

- [ ] **Step 3: Add the constants**

In `custom_components/irrigation_maestro/const.py`, next to `CONF_LINE_FLOW_SENSOR` (line 17):

```python
CONF_LINE_FLOW_UNIT: Final = "line_flow_sensor_unit"
```

and next to `CONF_FLOW_SENSOR` (line 86):

```python
#: Explicit unit for this zone's flow sensor, used when the entity declares
#: nothing or declares something the converter cannot handle. Absent means
#: "read the unit from the entity".
CONF_FLOW_SENSOR_UNIT: Final = "flow_sensor_unit"
```

- [ ] **Step 4: Add the model fields**

In `models.py`, `ZoneConfig` gains a field after `flow_sensor`:

```python
    flow_sensor_unit: str | None
```

and in `from_subentry`, after the `flow_sensor=` line:

```python
            flow_sensor_unit=data.get(const.CONF_FLOW_SENSOR_UNIT),
```

`HubConfig` gains a field after `line_flow_sensor`:

```python
    line_flow_sensor_unit: str | None = None
```

and in `from_options`, after the `line_flow_sensor=` line:

```python
            line_flow_sensor_unit=options.get(const.CONF_LINE_FLOW_UNIT),
```

`ZoneConfig` is a frozen slotted dataclass with no defaults, so the new field must be declared in the same position it is passed. Check every other construction site of `ZoneConfig` compiles.

- [ ] **Step 5: Add the service fields**

In `services.py`, next to the other zone attribute constants:

```python
ATTR_FLOW_SENSOR_UNIT: Final = "flow_sensor_unit"
ATTR_LINE_FLOW_SENSOR_UNIT: Final = "line_flow_sensor_unit"
```

Add a shared validator near them, so a stored override is always one the converter accepts:

```python
# Validated against the converter itself: an override it cannot handle would
# be stored and then silently ignored at read time, which is the class of
# defect this feature exists to remove.
_FLOW_UNIT = vol.In(sorted(SUPPORTED_FLOW_UNITS))
```

importing `SUPPORTED_FLOW_UNITS` from `.flow`.

Add `vol.Optional(ATTR_FLOW_SENSOR_UNIT): _FLOW_UNIT` to both the `add_zone` and `update_zone` schemas, and `ATTR_FLOW_SENSOR_UNIT: const.CONF_FLOW_SENSOR_UNIT` to the zone key map at line 452.

Add `vol.Optional(ATTR_LINE_FLOW_SENSOR_UNIT): _FLOW_UNIT` to `_SET_WEATHER_SOURCES_SCHEMA` and `ATTR_LINE_FLOW_SENSOR_UNIT: const.CONF_LINE_FLOW_UNIT` to `_WEATHER_OPT_KEYS`.

Then, in `_async_set_weather_sources`, drop the unit whenever the sensor itself is cleared:

```python
    # An override that outlived its sensor would silently apply to whatever
    # sensor is configured next.
    if not options.get(const.CONF_LINE_FLOW_SENSOR):
        options.pop(const.CONF_LINE_FLOW_UNIT, None)
```

placed after the merge loop and before `_write_hub_options`. Read that function first: the existing merge semantics are "present and non-empty sets, present and empty clears, absent unchanged", and this addition must not disturb them.

- [ ] **Step 6: Declare the fields in `services.yaml`**

Under `add_zone` and `update_zone`, beside `flow_sensor`:

```yaml
    flow_sensor_unit:
      example: m³/h
      selector:
        select:
          options:
            - L/min
            - L/h
            - L/s
            - mL/s
            - m³/h
            - m³/min
            - m³/s
            - ft³/min
            - gal/h
            - gal/min
            - gal/d
```

and the same block under `set_weather_sources` as `line_flow_sensor_unit`. The list is `SUPPORTED_FLOW_UNITS`; the Task 1 test pins it against the converter, so if HA ever adds a unit that test fails first and this list is updated in the same change.

- [ ] **Step 7: Translate the fields**

`en.json`, under `services.add_zone.fields` and `services.update_zone.fields`:

```json
"flow_sensor_unit": {
  "name": "Flow sensor unit",
  "description": "Only needed when the sensor does not declare a unit, or declares one that cannot be converted. Leave empty to use the unit the entity declares. Set here, it wins over the entity's own unit."
}
```

Under `services.set_weather_sources.fields`:

```json
"line_flow_sensor_unit": {
  "name": "Line flow sensor unit",
  "description": "Only needed when the line meter does not declare a unit, or declares one that cannot be converted. Leave empty to use the unit the entity declares."
}
```

`it.json`, same keys:

```json
"flow_sensor_unit": {
  "name": "Unità del flussometro",
  "description": "Serve solo se il sensore non dichiara un'unità, o ne dichiara una non convertibile. Lascia vuoto per usare quella dichiarata dall'entità. Se la imposti qui, vince sull'unità dell'entità."
}
```

```json
"line_flow_sensor_unit": {
  "name": "Unità del flussometro di linea",
  "description": "Serve solo se il flussometro di linea non dichiara un'unità, o ne dichiara una non convertibile. Lascia vuoto per usare quella dichiarata dall'entità."
}
```

- [ ] **Step 8: Run the tests, lint, typecheck**

Run: `.venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy`
Expected: all clean, 425 + 7 tests.

- [ ] **Step 9: Commit**

```bash
git add custom_components/irrigation_maestro/const.py \
        custom_components/irrigation_maestro/models.py \
        custom_components/irrigation_maestro/services.py \
        custom_components/irrigation_maestro/services.yaml \
        custom_components/irrigation_maestro/translations/en.json \
        custom_components/irrigation_maestro/translations/it.json \
        tests/components/test_models.py tests/components/test_services.py
git commit -m "feat(config): an explicit unit for a meter that does not declare one

Per sensor, on the zone and on the hub's line meter, validated against the
converter's own unit list -- an override it cannot handle would be stored and
then silently ignored at read time, which is the class of defect this feature
exists to remove.

Clearing the line meter clears its override too: one that outlived its sensor
would silently apply to whatever sensor was configured next.

Absent means 'read the unit from the entity', so every existing configuration
loads unchanged and no migration is needed."
```

---

### Task 3: `FlowMonitor` reads through the boundary — and an unknown unit disables the guards

**Files:**
- Modify: `custom_components/irrigation_maestro/session.py:103-214` (`FlowMonitor`), `:877-888` (its construction)
- Modify: `custom_components/irrigation_maestro/runtime.py:216-220` (`flow_sensor_for`)
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `it.json` (issues)
- Modify: `tests/components/test_safety_extra.py:146-220` (two existing tests)
- Test: `tests/components/test_safety_extra.py` (append)

**Interfaces:**
- Consumes: `FlowSensorReader`, `FlowReading` from Task 1; `ZoneConfig.flow_sensor_unit`, `HubConfig.line_flow_sensor_unit` from Task 2.
- Produces: `IrrigationRuntime.flow_reader_for(zone) -> FlowSensorReader | None`; `FlowMonitor.unit_known: bool`; repair id `flow_unit_unknown_<entity_id>` with translation key `flow_unit_unknown`.

- [ ] **Step 1: Correct the two existing tests that encode the old assumption**

In `tests/components/test_safety_extra.py`, `test_volume_mode_closes_at_target` and `test_zero_flow_interrupts_cycle` both set the sensor with no unit:

```python
    hass.states.async_set("sensor.flow", "0.0")
```

That worked only because the component read any number as L/min. A real L/min meter declares its unit, so give these sensors the unit they are meant to have — every `async_set` on `sensor.flow` in both tests:

```python
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
```

including the mid-test `hass.states.async_set("sensor.flow", "10.0")` and the `force_update=True` one in the volume test. Their assertions are unchanged: an L/min sensor must behave exactly as before, which is the regression guard the spec asks for.

- [ ] **Step 2: Write the failing tests**

Append to `tests/components/test_safety_extra.py`:

```python
async def test_a_cubic_metres_per_hour_meter_reaches_the_volume_target(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """0.45 m³/h is 7.5 L/min: the 20 L target arrives in under three minutes.

    Read as L/min it would have been 0.45 L/min and the run would have hit its
    safety timeout instead, 16.7x short.
    """
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "m³/h"})
    mock_weather(hass)
    zone = zone_data(
        "Alpha",
        "valve.a",
        flow_sensor="sensor.flow",
        nominal_flow_lpm=7.5,
        cycles=[
            {
                "id": "cy_vol",
                "name": "Volume",
                "enabled": True,
                "trigger": {"kind": "time", "at": "05:30"},
                "curve": {
                    "points": [[20.0, 20.0]],
                    "min_value": 5.0,
                    "max_value": 100.0,
                    "kind": "volume",
                },
                "volume_safety_timeout_min": 30,
            }
        ],
    )
    entry = await setup_hub(hass, [zone])

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"

    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    await advance(hass, freezer, 150)
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"}, force_update=True)
    await advance(hass, freezer, 60)

    assert hass.states.get("valve.a").state == "closed"
    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "completed"
    assert outcome["volume_l"] >= 20


async def test_a_unit_override_beats_the_declared_unit_end_to_end(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The sensor claims L/min but really reports m³/h. The user says so."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    zone = zone_data(
        "Alpha",
        "valve.a",
        flow_sensor="sensor.flow",
        flow_sensor_unit="m³/h",
        nominal_flow_lpm=7.5,
        cycles=[
            {
                "id": "cy_vol",
                "name": "Volume",
                "enabled": True,
                "trigger": {"kind": "time", "at": "05:30"},
                "curve": {
                    "points": [[20.0, 20.0]],
                    "min_value": 5.0,
                    "max_value": 100.0,
                    "kind": "volume",
                },
                "volume_safety_timeout_min": 30,
            }
        ],
    )
    entry = await setup_hub(hass, [zone])
    await advance(hass, freezer, 31 * 60)
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "L/min"})
    await advance(hass, freezer, 150)
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "L/min"}, force_update=True)
    await advance(hass, freezer, 60)

    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["volume_l"] >= 20


async def test_a_meter_with_no_unit_does_not_interrupt_the_cycle(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """An unknown unit accumulates nothing, so it must not trip the zero-flow
    guard — which would otherwise interrupt every single run."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "7.5")  # no unit declared
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")],
    )

    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    await advance(hass, freezer, 3 * 60)
    # Still watering: the guard is off, not tripped.
    assert hass.states.get("valve.a").state == "open"

    await advance(hass, freezer, 8 * 60)
    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "completed"

    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "flow_unit_unknown_sensor.flow") is not None


async def test_a_unit_lost_mid_cycle_freezes_litres_without_crashing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "10.0", {"unit_of_measurement": "L/min"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [
            zone_data(
                "Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow", nominal_flow_lpm=10.0
            )
        ],
    )

    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 120)
    # An upstream update drops the unit halfway through.
    hass.states.async_set("sensor.flow", "10.0")
    await advance(hass, freezer, 10 * 60)

    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "completed"  # no crash, no interrupt
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "flow_unit_unknown_sensor.flow") is not None
```

`ir` and `DOMAIN` are already imported in this file.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_safety_extra.py -v`
Expected: the four new tests FAIL; the two corrected ones PASS (declaring L/min changes nothing today).

- [ ] **Step 4: Add the runtime accessor**

In `runtime.py`, replace `flow_sensor_for` and add the reader factory beside it:

```python
    def flow_sensor_for(self, zone: ZoneRuntime) -> str | None:
        return zone.config.flow_sensor or self.hub.line_flow_sensor

    def flow_reader_for(self, zone: ZoneRuntime) -> FlowSensorReader | None:
        """A reader for whichever meter serves this zone, with its own override.

        The override that applies belongs to the sensor being read: a zone
        falling back to the shared line meter takes the hub's override, not its
        own — its own describes a sensor it does not have.
        """
        if zone.config.flow_sensor is not None:
            return FlowSensorReader(
                self.hass, zone.config.flow_sensor, zone.config.flow_sensor_unit
            )
        if self.hub.line_flow_sensor is not None:
            return FlowSensorReader(
                self.hass, self.hub.line_flow_sensor, self.hub.line_flow_sensor_unit
            )
        return None
```

and add the repair reporter in the Repairs section, next to `report_flow_out_of_range`:

```python
    def report_flow_unit_unknown(self, entity_id: str) -> None:
        """The meter's unit cannot be determined, so its readings are unusable.

        Not an assumption of L/min: a plausible number that is silently wrong
        is worse than a declared absence (see the degradation matrix).
        """
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            f"flow_unit_unknown_{entity_id}",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="flow_unit_unknown",
            translation_placeholders={"entity_id": entity_id},
        )

    def clear_flow_unit_unknown(self, entity_id: str) -> None:
        ir.async_delete_issue(self.hass, DOMAIN, f"flow_unit_unknown_{entity_id}")
```

Import `FlowSensorReader` from `.flow`.

- [ ] **Step 5: Rewrite `FlowMonitor` to read through the boundary**

In `session.py`, change the class docstring and constructor to take a reader instead of an entity id, and make every guard conditional on the unit being known:

```python
class FlowMonitor:
    """Integrates a flow sensor during a run and detects anomalies.

    Litres are canonical L/min throughout; the reader converts at the boundary.
    A reading whose unit cannot be determined is not a number — it accumulates
    nothing, chases no volume target, checks no range, and above all does NOT
    trip the zero-flow guard, which fires when too few litres accrue in the
    grace window and would otherwise interrupt every run on such a meter.
    """

    ZERO_FLOW_GRACE_S = 120
    ZERO_FLOW_EPSILON_L = 0.1
    RANGE_SUSTAIN_S = 120

    def __init__(
        self,
        runtime: IrrigationRuntime,
        reader: FlowSensorReader,
        *,
        volume_target_l: int | None,
        expected_lpm: Callable[[], tuple[float, float] | None],
        on_no_flow: Callable[[], None],
        on_volume_reached: Callable[[], None],
    ) -> None:
        self._runtime = runtime
        self._reader = reader
        self._sensor = reader.entity_id
        ...
        self.unit_known = True

    def _read(self) -> float:
        """Current flow in L/min; 0.0 and unit_known=False when unresolvable."""
        reading = self._reader.read()
        if reading.lpm is None:
            if self.unit_known:
                # Report once per transition, not once per state change.
                self._runtime.report_flow_unit_unknown(self._sensor)
            self.unit_known = False
            return 0.0
        if not self.unit_known:
            self._runtime.clear_flow_unit_unknown(self._sensor)
        self.unit_known = True
        return reading.lpm
```

`_integrate` must not accumulate while the unit is unknown — freeze at the last certain value:

```python
    def _integrate(self, now: datetime) -> None:
        if self._last_at is not None and self.unit_known:
            minutes = (now - self._last_at).total_seconds() / 60
            self.liters += self._last_lpm * minutes
        self._last_at = now
```

`_periodic_check` must skip the zero-flow verdict and the volume target while the unit is unknown, and must keep rescheduling so a unit that comes back is picked up:

```python
    @callback
    def _periodic_check(self, _now: Any) -> None:
        self._integrate(dt_util.utcnow())
        self._last_lpm = self._read()
        if not self.unit_known:
            # No usable meter: this run finishes on its duration or its volume
            # safety timeout, exactly as it would with no meter at all.
            self._liters_at_last_check = self.liters
            self._schedule_periodic_check()
            return
        if self._volume_target is not None and self.liters >= self._volume_target:
            self._on_volume_reached()
            return
        delta = self.liters - self._liters_at_last_check
        self._liters_at_last_check = self.liters
        if delta < self.ZERO_FLOW_EPSILON_L:
            self._on_no_flow()
            return
        self._schedule_periodic_check()
```

`_on_state` and `_check_range` gain the same guard: return early when `not self.unit_known`.

Then update the construction site at `session.py:877-888`:

```python
        monitor: FlowMonitor | None = None
        reader = self._runtime.flow_reader_for(zone)
        if reader is not None:
            monitor = FlowMonitor(
                self._runtime,
                reader,
                volume_target_l=segment.run.volume_l,
                expected_lpm=self._runtime.expected_flow_range,
                on_no_flow=lambda: _finish("no_flow"),
                on_volume_reached=lambda: _finish("done"),
            )
            monitor.start()
```

Note that `start()` calls `_read()` before the first `_integrate`, so a meter whose unit is unknown from the outset sets `unit_known = False` and raises the repair immediately.

- [ ] **Step 6: Translate the repair**

`en.json`, under `issues`:

```json
"flow_unit_unknown": {
  "title": "Flow sensor unit unknown",
  "description": "The sensor {entity_id} does not declare a unit of measurement, or declares one that cannot be converted to litres per minute. Its readings are not being used: volume mode and flow anomaly detection are off for it, and consumption falls back to the nominal flow rate. Set the unit explicitly on the zone (or on the line meter) to turn them back on."
}
```

`it.json`:

```json
"flow_unit_unknown": {
  "title": "Unità del flussometro sconosciuta",
  "description": "Il sensore {entity_id} non dichiara un'unità di misura, o ne dichiara una non convertibile in litri al minuto. Le sue letture non vengono usate: per lui la modalità volume e il rilevamento delle anomalie di portata sono spenti, e il consumo ricade sulla portata nominale. Imposta l'unità esplicitamente sulla zona (o sul flussometro di linea) per riattivarli."
}
```

- [ ] **Step 7: Run the tests, lint, typecheck**

Run: `.venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy`
Expected: all clean.

- [ ] **Step 8: Commit**

```bash
git add custom_components/irrigation_maestro/session.py \
        custom_components/irrigation_maestro/runtime.py \
        custom_components/irrigation_maestro/translations/en.json \
        custom_components/irrigation_maestro/translations/it.json \
        tests/components/test_safety_extra.py
git commit -m "fix(session): integrate converted litres, and stand down when the unit is unknown

An unknown unit must DISABLE the zero-flow guard rather than trip it. The
periodic check interrupts a cycle when fewer than ZERO_FLOW_EPSILON_L litres
accrue in the grace window, so a monitor that cannot accumulate would have
interrupted every run on such a meter -- turning a reporting gap into an
outage.

Two existing tests set sensor.flow with no unit_of_measurement at all and
relied on any number being read as L/min. That assumption is the defect; a
real L/min meter declares its unit, so the tests now declare it. Their
assertions are unchanged, which is the regression guard: an L/min sensor
behaves exactly as it did before.

A zone falling back to the shared line meter takes the HUB's unit override,
not its own -- its own describes a sensor it does not have."
```

---

### Task 4: Plan-time degradation and the zone's declared state

**Files:**
- Modify: `custom_components/irrigation_maestro/runtime.py:219-220` (`zone_has_flow_meter`), `:494` (planner input)
- Modify: `custom_components/irrigation_maestro/sensor.py:275-295` (degraded list)
- Modify: `card/src/types.ts` (degraded reason), `card/src/localize/en.ts`, `it.ts`
- Test: `tests/components/test_entities.py` (append), `tests/components/test_session.py` (append)

**Interfaces:**
- Consumes: `flow_reader_for` from Task 3.
- Produces: `IrrigationRuntime.zone_flow_meter_usable(zone_id) -> bool`; degraded reason `flow_unit_unknown` on the zone sensor.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/test_entities.py`:

```python
async def test_a_meter_with_an_unresolvable_unit_is_declared_degraded(
    hass: HomeAssistant,
) -> None:
    hass.states.async_set("sensor.flow", "7.5")  # no unit
    entry = await setup_hub(
        hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")]
    )
    runtime = entry.runtime_data
    state = hass.states.get(f"sensor.{slugify('Alpha')}_state")
    assert state is not None
    assert "flow_unit_unknown" in state.attributes["degraded"]
    assert "no_flow_meter" not in state.attributes["degraded"]


async def test_a_meter_with_a_convertible_unit_is_not_degraded(hass: HomeAssistant) -> None:
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    state = hass.states.get(f"sensor.{slugify('Alpha')}_state")
    assert state is not None
    assert "flow_unit_unknown" not in state.attributes["degraded"]
```

Follow the entity-id and helper conventions already used in that file rather than the sketch above — read a neighbouring test first and match it.

Append to `tests/components/test_session.py`:

```python
async def test_a_volume_cycle_on_an_unresolvable_meter_runs_as_a_duration(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Same degradation as a meter that disappeared: run the safety timeout."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "7.5")  # no unit
    mock_weather(hass)
    zone = zone_data(
        "Alpha",
        "valve.a",
        flow_sensor="sensor.flow",
        cycles=[
            {
                "id": "cy_vol",
                "name": "Volume",
                "enabled": True,
                "trigger": {"kind": "time", "at": "05:30"},
                "curve": {
                    "points": [[20.0, 20.0]],
                    "min_value": 5.0,
                    "max_value": 100.0,
                    "kind": "volume",
                },
                "volume_safety_timeout_min": 5,
            }
        ],
    )
    entry = await setup_hub(hass, [zone])
    await advance(hass, freezer, 31 * 60)
    assert hass.states.get("valve.a").state == "open"
    await advance(hass, freezer, 6 * 60)
    assert hass.states.get("valve.a").state == "closed"
    runtime = entry.runtime_data
    outcome = runtime.state.last_outcome(runtime.zone_ids[0])
    assert outcome["result"] == "completed"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_entities.py tests/components/test_session.py -v -k "unit or unresolvable"`
Expected: FAIL.

- [ ] **Step 3: Add the usability check without changing the configuration check**

In `runtime.py`, leave `zone_has_flow_meter` exactly as it is — it answers "is a meter configured", and the services that create volume curves must keep using it. A sensor that happens to be unavailable while the user edits a curve must not make `set_curve` refuse.

Add beside it:

```python
    def zone_flow_meter_usable(self, zone: ZoneRuntime) -> bool:
        """Is there a meter AND can its unit be determined right now?

        Deliberately separate from zone_has_flow_meter, which is configuration
        only: this one reads live state, so it belongs at plan time and in the
        zone's declared status, not in the services that create a volume curve
        (a momentarily unavailable sensor must not make an edit fail).
        """
        reader = self.flow_reader_for(zone)
        return reader is not None and reader.read().unit_known
```

At line 494, the planner input becomes the usable check:

```python
            has_flow_meter=self.zone_flow_meter_usable(zone),
```

Read the surrounding code first: line 494 currently passes `self.zone_has_flow_meter(zone.config)` and may need the `ZoneRuntime` rather than the `ZoneConfig` in scope.

- [ ] **Step 4: Declare it on the zone sensor**

In `sensor.py`, in the degraded-list property:

```python
        has_meter = runtime.zone_has_flow_meter(config)
        if not has_meter:
            degraded.append("no_flow_meter")
        elif not runtime.zone_flow_meter_usable(runtime.zones[config.zone_id]):
            # A meter is configured but its unit cannot be resolved, so it is
            # not usable. Distinct from no_flow_meter: the fix is different --
            # set the unit, do not buy a meter.
            degraded.append("flow_unit_unknown")
        elif config.flow_sensor is None and runtime.hub.line_flow_sensor is not None:
            degraded.append("line_meter_shared")
```

and the volume-mode line below it must use the usable check too, so a volume cycle on an unresolvable meter still reports `volume_mode_unavailable`.

- [ ] **Step 5: Add the card-side reason**

In `card/src/types.ts`, add `"flow_unit_unknown"` to the degraded-reason union beside `"no_flow_meter"`. In `card/src/localize/en.ts` and `it.ts`, beside `degraded.no_flow_meter`:

```ts
  "degraded.flow_unit_unknown": "Flow meter unit unknown",
```

```ts
  "degraded.flow_unit_unknown": "Unità del flussometro sconosciuta",
```

- [ ] **Step 6: Run everything**

Run: `.venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy && npm --prefix card run test && npm --prefix card run typecheck`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add custom_components/irrigation_maestro/runtime.py \
        custom_components/irrigation_maestro/sensor.py \
        card/src/types.ts card/src/localize/en.ts card/src/localize/it.ts \
        tests/components/test_entities.py tests/components/test_session.py
git commit -m "feat(runtime): an unresolvable unit degrades like a missing meter, and says so

zone_has_flow_meter stays configuration-only, on purpose: the services that
create a volume curve must not start failing because a sensor happened to be
unavailable while the user was editing. The new zone_flow_meter_usable reads
live state and is used where the consequence is a degraded run rather than a
refused edit -- at plan time and in the zone's declared status.

flow_unit_unknown is a distinct degraded reason from no_flow_meter because the
remedy is different: set the unit, do not buy a meter."
```

---

### Task 5: Consumption, budget, and the notice for installs that were undercounting

**Files:**
- Modify: `custom_components/irrigation_maestro/runtime.py` (setup hook + reporter)
- Modify: `custom_components/irrigation_maestro/translations/en.json`, `it.json` (issues)
- Test: `tests/components/test_session.py` (append), `tests/components/test_flow.py` (append)

**Interfaces:**
- Consumes: `flow_reader_for`, `SUPPORTED_FLOW_UNITS`, `CANONICAL_UNIT`.
- Produces: `IrrigationRuntime._report_rescaled_flow_meters()`; repair id `flow_unit_corrected` with translation key `flow_unit_corrected`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/test_session.py`:

```python
async def test_consumption_counts_real_litres_from_a_cubic_metre_meter(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """0.45 m³/h for ten minutes is 75 L, not 4.5 L."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10, flow_sensor="sensor.flow")],
        {"consumption_budget": {"liters_per_month": 1000, "action": "notify"}},
    )
    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 11 * 60)

    runtime = entry.runtime_data
    # ~7.5 L/min for ~10 min. Generous bounds: the exact figure depends on when
    # the integrator samples, but 4.5 L (the un-converted answer) is far below.
    assert 60 <= runtime.state.consumption_liters <= 90


async def test_a_zone_without_a_meter_still_estimates_from_the_nominal_rate(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The fallback path is canonical L/min too, so both roads agree."""
    freezer.move_to(START)
    park = MockValvePark(hass)
    park.add("valve.a")
    mock_weather(hass)
    entry = await setup_hub(
        hass,
        [zone_data("Alpha", "valve.a", minutes=10, nominal_flow_lpm=7.5)],
    )
    await advance(hass, freezer, 31 * 60)
    await advance(hass, freezer, 11 * 60)
    runtime = entry.runtime_data
    assert 70 <= runtime.state.consumption_liters <= 80
```

Append to `tests/components/test_flow.py`:

```python
async def test_an_install_with_a_non_canonical_meter_gets_a_scale_notice(
    hass: HomeAssistant,
) -> None:
    hass.states.async_set("sensor.flow", "0.45", {"unit_of_measurement": "m³/h"})
    await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    registry = ir.async_get(hass)
    issue = registry.async_get_issue(DOMAIN, "flow_unit_corrected")
    assert issue is not None
    assert issue.translation_placeholders is not None
    assert "sensor.flow" in issue.translation_placeholders["sensors"]


async def test_an_install_already_in_litres_per_minute_gets_no_notice(
    hass: HomeAssistant,
) -> None:
    hass.states.async_set("sensor.flow", "7.5", {"unit_of_measurement": "L/min"})
    await setup_hub(hass, [zone_data("Alpha", "valve.a", flow_sensor="sensor.flow")])
    registry = ir.async_get(hass)
    assert registry.async_get_issue(DOMAIN, "flow_unit_corrected") is None
```

Add the imports this file needs (`ir`, `DOMAIN`, `setup_hub`, `zone_data`) at the top.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/bin/pytest tests/components/test_flow.py tests/components/test_session.py -v -k "litres or notice or nominal"`
Expected: FAIL.

- [ ] **Step 3: Add the one-time scale notice**

In `runtime.py`, in the Repairs section:

```python
    def _report_rescaled_flow_meters(self) -> None:
        """Tell an upgrading install that its counter changed scale.

        The stored consumption counter is deliberately NOT rewritten. It is
        monthly and resets at period start, so the distortion self-heals within
        31 days; and the accumulated total mixes litres measured through the
        meter with litres estimated as nominal x minutes, which were never
        affected. Multiplying the whole total by a single factor would be
        exactly the plausible-but-false number this feature removes.
        """
        rescaled: list[str] = []
        for zone in self.zones.values():
            reader = self.flow_reader_for(zone)
            if reader is None:
                continue
            reading = reader.read()
            if reading.unit is not None and reading.unit != CANONICAL_UNIT:
                if reader.entity_id not in rescaled:
                    rescaled.append(reader.entity_id)
        if not rescaled:
            ir.async_delete_issue(self.hass, DOMAIN, "flow_unit_corrected")
            return
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            "flow_unit_corrected",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="flow_unit_corrected",
            translation_placeholders={"sensors": ", ".join(rescaled)},
        )
```

Call it at the end of `async_setup` and of `async_config_updated`, next to `_refresh_notification_issues`.

Note: at `async_setup` a sensor may still be `unavailable`, but its `unit_of_measurement` attribute is normally present anyway. If a sensor has no state at all yet, it simply is not listed, and the next config update re-evaluates. Do not add a startup delay for this.

- [ ] **Step 4: Translate the notice**

`en.json`, under `issues`:

```json
"flow_unit_corrected": {
  "title": "Flow readings changed scale",
  "description": "These meters report in a unit other than litres per minute and were previously read as if they were L/min: {sensors}. Their readings are now converted, so measured litres, volume targets and the consumption counter are correct from here on. The current period's consumption total is understated and will be right from the next period; it is deliberately not rewritten, because it mixes measured litres with estimates that were never affected."
}
```

`it.json`:

```json
"flow_unit_corrected": {
  "title": "Le letture di portata hanno cambiato scala",
  "description": "Questi contatori riportano in un'unità diversa dai litri al minuto ed erano letti come se fossero L/min: {sensors}. Ora le letture vengono convertite, quindi litri misurati, target di volume e contatore dei consumi sono corretti d'ora in avanti. Il totale del periodo in corso è sottostimato e sarà corretto dal prossimo periodo; non viene riscritto di proposito, perché mescola litri misurati e stime che il difetto non toccava."
}
```

- [ ] **Step 5: Run everything and commit**

Run: `.venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy`

```bash
git add custom_components/irrigation_maestro/runtime.py \
        custom_components/irrigation_maestro/translations/en.json \
        custom_components/irrigation_maestro/translations/it.json \
        tests/components/test_flow.py tests/components/test_session.py
git commit -m "feat(runtime): tell an upgrading install its counter changed scale

The stored counter is deliberately not rewritten. It is monthly and resets at
period start, so the distortion self-heals within 31 days; and the accumulated
total mixes litres measured through the meter with litres estimated as nominal
x minutes, which the defect never touched. Applying one factor to the whole
total would be exactly the plausible-but-false number this feature removes.

Both consumption roads are canonical L/min, so the measured path and the
nominal-rate fallback now agree -- tested from both directions."
```

---

### Task 6: The unit field where the sensor is configured

**Files:**
- Modify: `card/src/panel/zone-editor.ts:34-36`, `:67-69`, `:178-180`, `:258-290`, `:339-343`
- Modify: `card/src/panel/settings-view.ts` (the weather/sensors section), `card/src/panel/config-read.ts:6-8`, `:36`
- Modify: `card/src/localize/en.ts`, `it.ts`
- Create: `card/src/panel/flow-units.ts`, `card/src/panel/flow-units.test.ts`

**Interfaces:**
- Consumes: the `flow_sensor_unit` / `line_flow_sensor_unit` service fields from Task 2.
- Produces: `FLOW_UNITS`, `detectedFlowUnit(hass, entityId)`, `effectiveFlowUnit(override, detected)` returning `{unit, source}`.

- [ ] **Step 1: Write the failing tests**

Create `card/src/panel/flow-units.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FLOW_UNITS, detectedFlowUnit, effectiveFlowUnit } from "./flow-units";

describe("FLOW_UNITS", () => {
  it("mirrors the converter's unit list, canonical first", () => {
    expect(FLOW_UNITS[0]).toBe("L/min");
    expect(FLOW_UNITS).toHaveLength(11);
    expect(FLOW_UNITS).toContain("m³/h");
  });
});

describe("detectedFlowUnit", () => {
  it("reads the unit the entity declares", () => {
    const hass = {
      states: { "sensor.f": { attributes: { unit_of_measurement: "m³/h" } } },
    };
    expect(detectedFlowUnit(hass as never, "sensor.f")).toBe("m³/h");
  });

  it("is undefined when the entity declares nothing", () => {
    const hass = { states: { "sensor.f": { attributes: {} } } };
    expect(detectedFlowUnit(hass as never, "sensor.f")).toBeUndefined();
  });

  it("is undefined when the entity declares something unconvertible", () => {
    const hass = {
      states: { "sensor.f": { attributes: { unit_of_measurement: "widgets/s" } } },
    };
    expect(detectedFlowUnit(hass as never, "sensor.f")).toBeUndefined();
  });

  it("is undefined for an entity that does not exist", () => {
    expect(detectedFlowUnit({ states: {} } as never, "sensor.nope")).toBeUndefined();
  });
});

describe("effectiveFlowUnit", () => {
  it("reports the override and says the user set it", () => {
    expect(effectiveFlowUnit("m³/h", "L/min")).toEqual({ unit: "m³/h", source: "override" });
  });

  it("reports the detected unit when there is no override", () => {
    expect(effectiveFlowUnit(undefined, "m³/h")).toEqual({ unit: "m³/h", source: "detected" });
  });

  it("reports unknown when neither is available", () => {
    expect(effectiveFlowUnit(undefined, undefined)).toEqual({ unit: undefined, source: "unknown" });
  });

  it("treats an empty override as no override", () => {
    expect(effectiveFlowUnit("", "L/min")).toEqual({ unit: "L/min", source: "detected" });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm --prefix card run test -- flow-units`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

Create `card/src/panel/flow-units.ts`:

```ts
import type { HomeAssistant } from "../types";

/**
 * Flow-unit helpers for the two places a meter is configured.
 *
 * The canonical unit of the whole engine is L/min; this is only about telling
 * the backend what a sensor reports when the sensor itself does not say, or
 * says something wrong. Conversion happens server-side, in flow.py.
 */

/** Mirrors SUPPORTED_FLOW_UNITS in flow.py, canonical first. A Python test
 *  pins that set against VolumeFlowRateConverter.VALID_UNITS. */
export const FLOW_UNITS: readonly string[] = [
  "L/min",
  "L/h",
  "L/s",
  "mL/s",
  "m³/h",
  "m³/min",
  "m³/s",
  "ft³/min",
  "gal/h",
  "gal/min",
  "gal/d",
];

export type FlowUnitSource = "override" | "detected" | "unknown";

/** The unit the entity declares, if the backend could convert it. */
export function detectedFlowUnit(hass: HomeAssistant, entityId: string): string | undefined {
  const declared = hass.states?.[entityId]?.attributes?.unit_of_measurement;
  const unit = typeof declared === "string" ? declared : undefined;
  return unit && FLOW_UNITS.includes(unit) ? unit : undefined;
}

/** Which unit will actually be used, and who decided it. */
export function effectiveFlowUnit(
  override: string | undefined,
  detected: string | undefined,
): { unit: string | undefined; source: FlowUnitSource } {
  if (override) return { unit: override, source: "override" };
  if (detected) return { unit: detected, source: "detected" };
  return { unit: undefined, source: "unknown" };
}
```

- [ ] **Step 4: Wire it into the zone editor**

In `card/src/panel/zone-editor.ts`, in the Advanced drawer immediately after the flow-sensor field, add a unit select bound to `this._flowSensorUnit`, seeded from `zone?.flow_sensor_unit`, with `detectedFlowUnit(this.hass, this._flowSensor)` shown as the placeholder/default and a line below stating which unit will be used and why — `effectiveFlowUnit(...)`'s `source` maps to `zone.flow_unit_from_override` / `zone.flow_unit_from_entity` / `zone.flow_unit_unknown`. Add `flow_sensor_unit` to the patch builder at line 339 the same way `flow_sensor` is added, and to the `ZoneData` interface in `config-read.ts`.

In `card/src/panel/settings-view.ts`'s weather/sensors section, add the same control for the hub's line meter, bound to a `line_flow_sensor_unit` field on the weather save detail, and add the field to `HubOptions` in `config-read.ts`.

Follow each file's existing idiom rather than inventing markup; the zone editor's other selects and the settings view's `_optionalPicker` are the models.

- [ ] **Step 5: Add the locale keys**

Both `en.ts` and `it.ts` (key-identical):

```ts
  "zone.field_flow_unit": "Flow sensor unit",
  "zone.flow_unit_auto": "Detected from the entity",
  "zone.flow_unit_from_override": "Using {unit} — you set this, overriding the entity",
  "zone.flow_unit_from_entity": "Using {unit}, declared by the entity",
  "zone.flow_unit_unknown": "No usable unit: readings are ignored until you set one",
  "settings.field_line_flow_unit": "Line flow sensor unit",
```

```ts
  "zone.field_flow_unit": "Unità del flussometro",
  "zone.flow_unit_auto": "Rilevata dall'entità",
  "zone.flow_unit_from_override": "Uso {unit} — l'hai impostata tu, e vince sull'entità",
  "zone.flow_unit_from_entity": "Uso {unit}, dichiarata dall'entità",
  "zone.flow_unit_unknown": "Nessuna unità utilizzabile: le letture sono ignorate finché non ne imposti una",
  "settings.field_line_flow_unit": "Unità del flussometro di linea",
```

- [ ] **Step 6: Run the card checks and commit**

Run: `npm --prefix card run test && npm --prefix card run typecheck`
Expected: clean. Do **not** run the build — Task 7 rebuilds the bundle once.

```bash
git add card/src/panel/flow-units.ts card/src/panel/flow-units.test.ts \
        card/src/panel/zone-editor.ts card/src/panel/settings-view.ts \
        card/src/panel/config-read.ts card/src/localize/en.ts card/src/localize/it.ts
git commit -m "feat(card): set the unit where the sensor is set, and show which one won

The detected unit is offered as the default and the line below always states
which unit will actually be used and who decided it -- the spec asks for the
override to be visible, not merely possible."
```

---

### Task 7: Bundle, docs, version, release

**Files:**
- Modify: `custom_components/irrigation_maestro/frontend/*` (built output)
- Modify: `custom_components/irrigation_maestro/manifest.json`
- Modify: `CHANGELOG.md`, `README.md`, `INSTRUCTIONS.md`, `docs/it/guida-rapida.md`, `docs/it/istruzioni.md`
- Modify: `MEMORY.md`

- [ ] **Step 1: Rebuild the bundle**

Run: `npm --prefix card run build`

- [ ] **Step 2: Bump the version**

`manifest.json` → `"version": "3.2.0"`.

- [ ] **Step 3: Update the degradation matrix**

`README.md`'s degradation matrix is a load-bearing reference table. Every row that says "Requires: Flow meter" now requires a flow meter **whose unit can be determined**. Update those rows and add one:

```markdown
| Flow readings in the right scale | A meter that declares a convertible unit, or an explicit unit override | Readings are ignored entirely rather than assumed to be L/min: volume mode and flow anomalies are off for that meter and consumption falls back to nominal flow × minutes, with a Repairs issue naming the sensor |
```

- [ ] **Step 4: Write the changelog entry**

Add at the top of `CHANGELOG.md`, keeping the established header format:

```markdown
## [3.2.0] - 2026-08-13

### Flow sensors are read in the unit they declare

- **Automatic conversion.** A meter reporting m³/h, L/h, gal/min or any other
  unit `VolumeFlowRateConverter` handles is now converted on the way in.
  Previously every reading was treated as L/min whatever the sensor declared,
  so an m³/h meter undercounted litres by a factor of 1000/60 ≈ 16.7.
- **L/min stays canonical** throughout the engine — `nominal_flow_lpm`,
  tolerances, accumulated litres, volume targets, the monthly counter and the
  anomaly messages. Conversion happens at one boundary, on read.
- **An explicit unit per sensor**, on the zone and on the hub's line meter,
  for a sensor that declares nothing or declares something unconvertible. The
  detected unit is offered as the default, the override wins over it, and the
  panel states which one is in use.
- **No silent assumption.** A meter whose unit cannot be determined has its
  readings ignored rather than guessed: volume mode and flow anomaly detection
  switch off for it, consumption falls back to nominal flow × minutes, and a
  Repairs issue names the sensor. In particular the zero-flow guard stands
  down instead of firing — otherwise every run on such a meter would have been
  interrupted.
- **A unit that changes at runtime** is picked up on the next read. If it
  becomes unresolvable mid-cycle the litres freeze at the last certain value
  and the cycle finishes on its timeout, without a crash or an interruption.
- **Upgrading with a non-L/min meter**: a Repairs notice names the sensors and
  explains that the current period's consumption total is understated and will
  be correct from the next period. The stored counter is deliberately not
  rewritten — see the release notes.
```

- [ ] **Step 5: Update the remaining docs**

`INSTRUCTIONS.md` and `docs/it/istruzioni.md`: the flow-meter sections must mention the unit field and what happens without one. `docs/it/guida-rapida.md`: one line in the zone setup sequence. Find the passages that describe flow meters and rewrite them rather than appending.

- [ ] **Step 6: Record the decisions in `MEMORY.md`**

Under "Deliberate design decisions (beyond the spec)":

```markdown
- **L/min is canonical and `flow.py` is the only converter (3.2.0).** Every
  flow number in the engine is litres per minute; conversion happens once, on
  read, so no downstream code sees a foreign unit or has to know one exists.
  Do not convert anywhere else, and do not add a second canonical unit.
- **An unknown unit disables the zero-flow guard rather than tripping it
  (3.2.0).** `FlowMonitor._periodic_check` interrupts a cycle when fewer than
  `ZERO_FLOW_EPSILON_L` litres accrue in the grace window. A monitor that
  cannot accumulate would therefore have interrupted every run on a meter
  whose unit is unresolvable — turning a reporting gap into an outage. An
  unresolvable unit degrades exactly like a missing meter, at every point
  where a missing meter is already handled.
- **`zone_has_flow_meter` stays configuration-only; `zone_flow_meter_usable`
  reads live state (3.2.0).** The services that create a volume curve use the
  first, so an edit cannot fail because a sensor was momentarily unavailable.
  Plan time and the zone's declared status use the second, where the
  consequence is a degraded run rather than a refused edit. Do not merge them.
- **The consumption counter was not rescaled for existing installs (3.2.0).**
  It is monthly and resets at period start, so the distortion self-heals
  within 31 days; and the accumulated total mixes litres measured through the
  meter with litres estimated as nominal × minutes, which the defect never
  touched. Applying one factor to the whole total would be exactly the
  plausible-but-false number this feature removes. A Repairs notice states the
  scale change instead.
```

- [ ] **Step 7: Full verification**

```bash
.venv/bin/pytest -q
.venv/bin/ruff check .
.venv/bin/ruff format --check .
.venv/bin/mypy
npm --prefix card run test
npm --prefix card run typecheck
npm --prefix card run build
```

Expected: every command clean, and `git status` shows no unexpected diff beyond the rebuild.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "release: 3.2.0 -- flow sensor unit conversion

Bundle rebuilt, degradation matrix and docs updated, decisions recorded."
```

Do **not** push and do **not** open a PR — that happens after a whole-branch review.

---

## Self-Review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| Automatic conversion when the unit is declared | 1 |
| L/min canonical, conversion at one boundary | 1 (module), enforced by 3 |
| `SUPPORTED_FLOW_UNITS` pinned against the converter | 1 |
| Explicit override per sensor, zone and hub line meter | 2 |
| Override offered where the sensor is configured, detected unit as default | 6 |
| Override wins, and which one won is visible | 1 (`source`), 6 (UI) |
| Unknown unit → no accumulation, **no zero-flow trip**, no range check, no volume target | 3 |
| Unknown unit → Repairs | 3 |
| Unknown unit → volume cycle degrades to duration at plan time | 4 |
| Unknown unit → declared on the zone (degradation matrix) | 4, 7 |
| Unit changes at runtime, including mid-cycle | 1 (re-read), 3 (freeze) |
| `report_flow_out_of_range` stays coherent in L/min | 3 (values are canonical; no message change needed — verify) |
| Nominal-rate fallback agrees with the measured road | 5 |
| Volume mode and budget reach real litres | 3, 5 |
| Existing installs: notice, counter not rewritten | 5 |
| Declared regression for unit-less sensors | 3 (tests), 7 (docs) |
| Both translation files, card IT+EN | 2, 3, 4, 5, 6 |
| No migration, no version bump of the entry | 2 |
| Version bump + changelog | 7 |

**Placeholder scan**: Task 4 Step 1 and Task 6 Step 4 tell the implementer to match a neighbouring file's conventions rather than reproducing whole render methods; in both cases the behaviour is pinned by the tests given in the same task, and the files named are the models to copy. Everything else carries actual content.

**Type consistency**: `FlowReading.lpm: float | None` (Task 1) is what `FlowMonitor._read` narrows to `float` plus a `unit_known` flag (Task 3). `FlowSensorReader(hass, entity_id, override)` is constructed only in `runtime.flow_reader_for` (Task 3), which is the only consumer of `ZoneConfig.flow_sensor_unit` / `HubConfig.line_flow_sensor_unit` (Task 2). `zone_flow_meter_usable` (Task 4) takes a `ZoneRuntime`, matching `flow_reader_for`'s signature. The TypeScript `FLOW_UNITS` (Task 6) mirrors the `services.yaml` select list (Task 2), both of which mirror `SUPPORTED_FLOW_UNITS` (Task 1), which is the only one pinned by a test — the mirrors are documented as such at each site.

**Known risk, stated rather than hidden**: Task 3 changes `FlowMonitor`'s constructor signature. Anything constructing it outside `session.py:877` will break; grep before editing.
