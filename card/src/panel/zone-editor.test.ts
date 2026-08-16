import { describe, expect, it } from "vitest";
import { ImcZoneEditor, sensorNote } from "./zone-editor";
import type { ZoneSaveDetail, ZoneSensorDiscovery } from "./zone-editor";
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
  _leakSensor: string;
  _waterSupplySensor: string;
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

describe("the zone's leak and water-supply sensors", () => {
  it("go out with the rest of the advanced fields", () => {
    const detail = savedPatch({ name: "Lawn" }, (inner) => {
      inner._leakSensor = "binary_sensor.lawn_leak";
      inner._waterSupplySensor = "binary_sensor.lawn_supply";
    });
    expect(detail?.patch.leak_sensor).toBe("binary_sensor.lawn_leak");
    expect(detail?.patch.water_supply_sensor).toBe("binary_sensor.lawn_supply");
  });

  it("go out as empty strings so a distrusted sensor can be un-chosen", () => {
    // Clearing a leak sensor is a thing users do — it is the likely reaction
    // to a sensor they have stopped believing, and the backend was given a
    // withdrawal path for exactly that (an alarm whose source is
    // de-configured is withdrawn rather than left standing for ever).
    // Omitting the key when empty, the way every other advanced field does,
    // would leave a chosen sensor unremovable from this panel.
    // `update_zone` stores "" verbatim and every consumer reads these two
    // keys with truthiness, so "" is what "no sensor" looks like.
    const detail = savedPatch({ name: "Lawn", leak_sensor: "binary_sensor.old" }, (inner) => {
      inner._leakSensor = "";
      inner._waterSupplySensor = "";
    });
    expect(detail?.patch.leak_sensor).toBe("");
    expect(detail?.patch.water_supply_sensor).toBe("");
  });

  it("round-trip stored sensors through seeding, untouched", () => {
    // The counterpart of the flow-unit seeding test above, and the reason
    // sending these on every save is safe: the panel reads a fresh
    // `export_config` before opening the editor, so a sensor chosen earlier
    // is seeded back into the form and re-sent unchanged. Drop the seeding
    // line — or these keys from `ZoneData` — and saving anything in this
    // editor silently un-configures both sensors.
    const element = new ImcZoneEditor();
    element.zone = {
      name: "Lawn",
      valve_entity: "valve.lawn",
      leak_sensor: "binary_sensor.lawn_leak",
      water_supply_sensor: "binary_sensor.lawn_supply",
    };
    element.zoneId = "z1";
    (element as unknown as EditorSeeding).willUpdate(new Map([["zoneId", undefined]]));

    let detail: ZoneSaveDetail | undefined;
    element.addEventListener("imc-zone-save", (event) => {
      detail = (event as CustomEvent<ZoneSaveDetail>).detail;
    });
    (element as unknown as EditorInternals)._save();

    expect(detail?.patch.leak_sensor).toBe("binary_sensor.lawn_leak");
    expect(detail?.patch.water_supply_sensor).toBe("binary_sensor.lawn_supply");
  });

  /** Seed one editor the way the panel does, and read back what it holds. */
  function seeded(zone: ZoneData, discovery?: ZoneSensorDiscovery): EditorInternals {
    const element = new ImcZoneEditor();
    element.zone = zone;
    element.zoneId = "z1";
    element.sensorDiscovery = discovery;
    (element as unknown as EditorSeeding).willUpdate(new Map([["zoneId", undefined]]));
    return element as unknown as EditorInternals;
  }

  it("offers the device's candidate for a zone that was never asked", () => {
    // Detection proposes: a zone created before this feature existed has no
    // key at all, and no migration adopted one for it, so the editor is
    // where the offer is made — visibly, in a field the user can empty
    // before saving.
    const inner = seeded({ name: "Lawn", valve_entity: "valve.lawn" }, {
      leak_candidate: "binary_sensor.valve_water_leak",
      supply_candidate: "binary_sensor.valve_water_supply",
    });
    expect(inner._leakSensor).toBe("binary_sensor.valve_water_leak");
    expect(inner._waterSupplySensor).toBe("binary_sensor.valve_water_supply");
  });

  it("leaves a deliberately cleared sensor cleared, candidate or not", () => {
    // The other half of the same rule, and the one that makes clearing
    // stick: "" is a stored decision, `undefined` is an unasked question.
    // Re-proposing the candidate over a stored "" would put the sensor back
    // on the next save of any other field, and no amount of clearing would
    // ever hold.
    const inner = seeded({ name: "Lawn", leak_sensor: "", water_supply_sensor: "" }, {
      leak_candidate: "binary_sensor.valve_water_leak",
      supply_candidate: "binary_sensor.valve_water_supply",
    });
    expect(inner._leakSensor).toBe("");
    expect(inner._waterSupplySensor).toBe("");
  });

  it("never reach add_zone either", () => {
    const detail = savedPatch(undefined, (inner) => {
      inner._leakSensor = "binary_sensor.lawn_leak";
      inner._waterSupplySensor = "binary_sensor.lawn_supply";
    });
    expect(detail?.patch).toEqual({ name: "Lawn", valve_entity: "valve.lawn" });
  });
});

describe("the note under each sensor picker", () => {
  const found: ZoneSensorDiscovery = {
    leak_candidate: "binary_sensor.valve_water_leak",
    supply_candidate: "binary_sensor.valve_water_supply",
  };

  it("names what the valve's own device offers", () => {
    expect(sensorNote("en", "leak", "", found)).toBe(
      "Found on this valve's device: binary_sensor.valve_water_leak",
    );
    expect(sensorNote("en", "supply", "", found)).toBe(
      "Found on this valve's device: binary_sensor.valve_water_supply",
    );
  });

  it("declares the absence when the device offers nothing and nothing is chosen", () => {
    expect(sensorNote("en", "leak", "", {})).toMatch(/no leak sensor/i);
    expect(sensorNote("it", "leak", "", {})).toMatch(/non offre un sensore di perdita/i);
    expect(sensorNote("en", "supply", "", {})).toMatch(/no water-supply sensor/i);
  });

  it("says which one wins when the user picked a different sensor", () => {
    // The note would otherwise name the device's sensor while the picker
    // above it holds another, with nothing saying which the zone acts on.
    const note = sensorNote("en", "leak", "binary_sensor.bed_probe", found);
    expect(note).toBe(
      "Using the sensor you picked; this valve's device also offers binary_sensor.valve_water_leak",
    );
    expect(sensorNote("it", "leak", "binary_sensor.bed_probe", found)).toMatch(
      /Uso il sensore che hai scelto/,
    );
  });

  it("treats an empty picker as no competing choice", () => {
    // Nothing is chosen — including right after the user cleared it — so the
    // candidate is an offer, not a runner-up.
    expect(sensorNote("en", "leak", "", found)).toBe(
      "Found on this valve's device: binary_sensor.valve_water_leak",
    );
    expect(sensorNote("en", "leak", "binary_sensor.valve_water_leak", found)).toBe(
      "Found on this valve's device: binary_sensor.valve_water_leak",
    );
  });

  it("says nothing about a sensor chosen elsewhere", () => {
    // A ground probe in the bed is a deliberate, legitimate choice — the
    // capability model says so in as many words. Warning about it would
    // push the user to "fix" a configuration that is already right.
    expect(sensorNote("en", "leak", "binary_sensor.bed_probe", {})).toBeUndefined();
  });

  it("declares nothing at all when the discovery was never read", () => {
    // `discover_zone_sensors` can fail, or not have answered yet. "This
    // device offers no leak sensor" would then be a claim about hardware
    // nobody asked — the same unsupported assertion the leak entity spends
    // its whole availability rule refusing to make.
    expect(sensorNote("en", "leak", "", undefined)).toBeUndefined();
    expect(sensorNote("en", "supply", "", undefined)).toBeUndefined();
  });
});
