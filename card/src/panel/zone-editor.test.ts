import { describe, expect, it } from "vitest";
import { ImcZoneEditor } from "./zone-editor";
import type { ZoneSaveDetail } from "./zone-editor";
import type { ZoneData } from "./config-read";

/**
 * The editor's working state: private, with no public setters. Lit 3 resolves
 * its `node` export condition to @lit-labs/ssr-dom-shim, so the element
 * constructs and dispatches events under the plain node test environment —
 * the same trick settings-view.test.ts uses.
 */
interface EditorInternals {
  _name: string;
  _valve: string;
  _flowSensor: string;
  _flowSensorUnit: string;
  _save(): void;
}

/** The one patch a save produced, or undefined if it sent nothing. */
function savedPatch(
  zone: ZoneData | undefined,
  seed: (inner: EditorInternals) => void,
): ZoneSaveDetail | undefined {
  const element = new ImcZoneEditor();
  element.zone = zone;
  element.zoneId = zone ? "z1" : undefined;
  const inner = element as unknown as EditorInternals;
  inner._name = "Lawn";
  inner._valve = "valve.lawn";
  seed(inner);
  let detail: ZoneSaveDetail | undefined;
  element.addEventListener("imc-zone-save", (event) => {
    detail = (event as CustomEvent<ZoneSaveDetail>).detail;
  });
  inner._save();
  return detail;
}

describe("the zone's flow-sensor unit", () => {
  it("goes out with the rest of the advanced fields", () => {
    const detail = savedPatch({ name: "Lawn", flow_sensor: "sensor.f" }, (inner) => {
      inner._flowSensor = "sensor.f";
      inner._flowSensorUnit = "m³/h";
    });
    expect(detail?.mode).toBe("update");
    expect(detail?.patch.flow_sensor_unit).toBe("m³/h");
  });

  it("goes out as an empty string when detection is left to the entity", () => {
    // Every other advanced field is omitted when empty, meaning "unchanged".
    // This one cannot be: "detect automatically" is a choice the user makes in
    // the picker, and `update_zone` only clears a stored override on `""`.
    const detail = savedPatch({ name: "Lawn", flow_sensor: "sensor.f" }, (inner) => {
      inner._flowSensor = "sensor.f";
      inner._flowSensorUnit = "";
    });
    expect(detail?.patch.flow_sensor_unit).toBe("");
  });

  it("survives emptying the meter picker, which does not clear the meter", () => {
    // An empty `flow_sensor` is omitted from the patch, so the zone keeps the
    // meter it had. Dropping the unit here — as the hub's line meter does,
    // where the sensor really is cleared — would leave that meter read in
    // whatever unit it declares, which is the failure this feature removes.
    const detail = savedPatch({ name: "Lawn", flow_sensor: "sensor.f" }, (inner) => {
      inner._flowSensor = "";
      inner._flowSensorUnit = "m³/h";
    });
    expect(detail?.patch.flow_sensor).toBeUndefined();
    expect(detail?.patch.flow_sensor_unit).toBe("m³/h");
  });

  it("never reaches add_zone, whose schema would hard-fail on it", () => {
    // The Avanzate drawer does not render in create mode, so this can only
    // happen through a bug — which is exactly what the guard in `_save` is
    // for. `add_zone` has no ALLOW_EXTRA: one stray key fails the call.
    const detail = savedPatch(undefined, (inner) => {
      inner._flowSensorUnit = "m³/h";
    });
    expect(detail?.mode).toBe("add");
    expect(detail?.patch).toEqual({ name: "Lawn", valve_entity: "valve.lawn" });
  });
});
