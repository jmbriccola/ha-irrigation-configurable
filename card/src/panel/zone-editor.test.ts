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

/** `willUpdate` is protected, and seeding is the only thing it does here. */
interface EditorSeeding {
  willUpdate(changed: Map<string, unknown>): void;
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

  it("round-trips a stored override through seeding, untouched", () => {
    // What makes sending the field on every save safe: the panel reads a
    // fresh `export_config` before opening the editor, so an override the
    // user set earlier is seeded back in and re-sent unchanged. Without the
    // seeding line in `_seedFromZone` -- or without `flow_sensor_unit` on
    // `ZoneData` -- every zone save would silently clear it, and no other
    // test in this file would notice, because they all write the state
    // `_seedFromZone` is responsible for producing.
    const element = new ImcZoneEditor();
    element.zone = {
      name: "Lawn",
      valve_entity: "valve.lawn",
      flow_sensor: "sensor.f",
      flow_sensor_unit: "m³/h",
    };
    element.zoneId = "z1";
    (element as unknown as EditorSeeding).willUpdate(new Map([["zoneId", undefined]]));

    let detail: ZoneSaveDetail | undefined;
    element.addEventListener("imc-zone-save", (event) => {
      detail = (event as CustomEvent<ZoneSaveDetail>).detail;
    });
    (element as unknown as EditorInternals)._save();

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
