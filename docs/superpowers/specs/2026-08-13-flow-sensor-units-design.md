# Flow sensor units — design

**Date**: 2026-08-13
**Scope**: feature B of two. Ships on `feat/flow-sensor-units`, branched from
`main` **after** the notification wizard PR is merged.

## The defect

The component assumes every flow sensor reports L/min and reads it without
looking at the declared unit.

```python
class FlowMonitor:
    """Integrates a flow sensor (L/min) during a run and detects anomalies."""
    ...
    def _read(self) -> float:
        state = self._runtime.hass.states.get(self._sensor)
        ...
        return max(float(state.state), 0.0)   # no unit, no conversion
    ...
    self.liters += self._last_lpm * minutes
```

On the field install the zones are wired to the Zigbee valve sensors, which
publish:

```
sensor.irrigazione_vasi_volume_flow_rate
  state: 0.0
  unit_of_measurement: "m³/h"
  device_class: volume_flow_rate
  state_class: measurement
```

m³/h read as L/min: litres come out understated by 1000/60 ≈ 16.7×. It has not
exploded yet only because that install set neither `nominal_flow_lpm` (so
anomaly detection is off) nor a monthly budget. Turning either on makes the
behaviour badly wrong — measured flow would sit permanently out of range, and
the budget would never be reached. The user had already built template sensors
in `configuration.yaml` doing exactly `× 1000 / 60`, which is the manual
workaround the component should not require.

## Canonical unit

**L/min, unchanged, throughout the engine**: `nominal_flow_lpm`, tolerances,
`expected_flow_range`, accumulated litres, volume curve targets, the monthly
consumption counter, and the anomaly text in `report_flow_out_of_range`.

Conversion happens at **one boundary**: a new `flow.py` module, the only place
that reads a flow sensor's state. Nothing downstream of it ever sees a foreign
unit, which is what keeps the conversion from spreading through the code.

## `flow.py`

```python
CANONICAL_UNIT: Final = UnitOfVolumeFlowRate.LITERS_PER_MINUTE

class FlowSensorReader:
    """Reads a flow sensor and returns L/min, or None when the unit is unknown."""

    def read(self) -> float | None: ...
    @property
    def unit_source(self) -> Literal["override", "declared", "unknown"]: ...
```

Resolution order, evaluated on **every read**:

1. an explicit override in configuration → wins, always, including against a
   declared unit that contradicts it;
2. otherwise `unit_of_measurement` from the state, converted with
   `homeassistant.util.unit_conversion.VolumeFlowRateConverter`;
3. otherwise `None` — the unit is unknown and no number is invented.

Re-reading the unit every time is a dict lookup on the state object, so a unit
that changes at runtime (an upstream integration update, an entity-settings
override) is picked up with no extra machinery.

`SUPPORTED_FLOW_UNITS` is defined in `flow.py` with a test asserting it equals
`VolumeFlowRateConverter.VALID_UNITS`, and mirrored in TypeScript for the
selector.

## Unknown unit = unusable meter

An unknown unit is handled at exactly the points where a *missing* meter is
already handled, so there is one degradation story rather than two.

- **`FlowMonitor`**: does not integrate litres, does not chase the volume
  target, does not range-check — and **does not fire zero-flow detection**.
  This last one is load-bearing: `_periodic_check` interrupts a cycle when
  fewer than `ZERO_FLOW_EPSILON_L` litres accrue in the grace window, so a
  monitor that cannot accumulate would interrupt every run. Unknown unit must
  disable the zero-flow guard, not trip it.
- **At plan time**: `has_flow_meter` is false, so a volume cycle is planned as
  a duration cycle for its safety-timeout minutes — the rule already in force
  when a meter disappears.
- **Mid-cycle**: litres freeze at the last certain value, a Repairs issue and
  an anomaly notification go out, and the run ends on its safety timeout. No
  crash, no interruption, no invented number.
- **Consumption**: falls back to `nominal_flow_lpm × minutes`, which is the
  documented row of the degradation matrix ("Consumption estimated as nominal
  flow × minutes"). That is a declared estimate, not a plausible-but-false
  measurement.

A deliberate distinction: `zone_has_flow_meter` stays **configuration only**
for the services that create volume curves (`set_curve`, program add/copy) — a
sensor that happens to be unavailable at that moment must not make the service
refuse. Actual usability, unit included, is evaluated at plan time and at read
time, where the consequence is a degraded run rather than a failed edit.

## Explicit override

- Zone: `flow_sensor_unit` in the zone subentry data (`CONF_FLOW_SENSOR_UNIT`).
- Hub: `line_flow_sensor_unit` in options (`CONF_LINE_FLOW_UNIT`).

Offered where the sensor is configured — the zone editor's Advanced drawer next
to the flow-sensor field, and the settings sensors section — with the detected
unit proposed as the default and a visible note saying which one won. Added to
`update_zone` and `set_weather_sources` (schema **and** `services.yaml`).

**Not** to `add_zone`, correcting this document's first draft: that service
deliberately accepts only `name` / `valve_entity` / `area_m2` / `icon` and
creates the zone with a default program — `flow_sensor` itself is not among
them, so a unit override there would have nothing to attach to. The card
guards against sending more (`card/src/panel/zone-editor.ts`, "defense in
depth"), and widening the schema would break a deliberate contract.

The override is also **clearable**: an empty string removes it and detection
resumes. No other zone field has clear-on-empty semantics, and this one does
because the panel offers "detected automatically" as a real choice — a picker
that cannot return to its own default is a lying control.

## Existing installations

**No migration.** The new keys are optional and absent means "detect", so every
existing configuration loads unchanged and the entry version does not move.

**The consumption counter is not rewritten**, and the reason is said out loud.
Two arguments:

1. the counter is monthly and resets at period start, so the distortion
   self-heals within 31 days;
2. the accumulated total mixes litres measured through the meter with litres
   estimated as `nominal × minutes`, and the estimate was never affected by the
   defect. Multiplying the whole total by 16.7 would be precisely the
   plausible-but-false number this work exists to remove.

Instead, on the first setup after the upgrade, a configured flow sensor
declaring a unit other than L/min raises a one-time Repairs issue
`flow_unit_corrected` naming the sensor, the old and the new scale, and warning
that the current period's total is understated and will be right from the next
period.

## Declared regression

A sensor with no declared unit and no override degrades — even though today it
works, because today it is read as L/min. This is the decision taken
deliberately: silently treating a number as L/min whatever it declares is the
defect, and grandfathering it would leave that assumption in place under a
different name. The Repairs issue `flow_unit_unknown_<entity_id>` names the
sensor and says what to set; the user sets the override once.

## Testing

- 0.45 m³/h → 7.5 L/min, and 75 L integrated over 10 minutes.
- A sensor in L/min behaves exactly as today (regression guard).
- No unit and no override → nothing accumulated, **no zero-flow interrupt**, a
  Repairs issue, volume mode degraded to duration, no range checks.
- An override contradicting the declared unit → the override wins, and which
  one won is visible.
- The unit changes mid-cycle → litres freeze, the cycle completes, no crash.
- Volume mode and the monthly budget with an m³/h sensor → the target is
  reached at real litres.
- `report_flow_out_of_range` still reads in L/min and the numbers are
  consistent after conversion.
- `expected_flow_range` is unchanged: its inputs are canonical config.
- `SUPPORTED_FLOW_UNITS` equals the converter's valid units.

Any existing test that encoded "always L/min" is corrected, with the commit
message explaining why the assumption was wrong.

## Out of scope

The decision engine: `engine/weather.py`, `engine/curves.py`,
`engine/evaluate.py`, `engine/history.py`, the `PRESET_POTS` / `PRESET_LAWN`
control points, and every weight, threshold, water budget, forecast credit and
weighted temperature. No YAML configuration, no blocking I/O.

## Delivery

`manifest.json` bumped to 3.2.0 (3.1.0 is the notification wizard, merged
first), `CHANGELOG.md` entry, both translation files complete,
PR against `main` stating the canonical unit, where conversion happens, and how
existing non-L/min installs are handled.
