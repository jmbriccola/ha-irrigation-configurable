import { describe, expect, it } from "vitest";
import { FLOW_UNITS, detectedFlowUnit, effectiveFlowUnit, flowUnitNote } from "./flow-units";

describe("FLOW_UNITS", () => {
  it("mirrors the converter's unit list, canonical first", () => {
    // Pinned whole, not sampled: a typo in any one of these -- "ft3/min" for
    // "ft³/min", "ml/s" for "mL/s" -- type-checks, and surfaces only as
    // `detectedFlowUnit` reporting "no usable unit" about a meter the backend
    // reads perfectly well. These eleven are byte-for-byte
    // VolumeFlowRateConverter.VALID_UNITS, canonical first.
    expect(FLOW_UNITS).toEqual([
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
    ]);
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

  it("ignores an override the converter cannot handle, like the backend does", () => {
    // import_config validates a zone only through ZoneConfig.from_subentry,
    // which never checks this field, so a hand-edited payload really can
    // store "widgets/s". flow.py then ignores it and uses the declared unit.
    // Claiming the override won would be the panel contradicting the engine.
    expect(effectiveFlowUnit("widgets/s", "m³/h")).toEqual({ unit: "m³/h", source: "detected" });
  });

  it("reports unknown when an unusable override is all there is", () => {
    expect(effectiveFlowUnit("widgets/s", undefined)).toEqual({
      unit: undefined,
      source: "unknown",
    });
  });
});

describe("flowUnitNote", () => {
  // The note is what makes the override *visible* rather than merely
  // possible, and both places a meter is configured render the same sentence
  // -- so the source -> key mapping lives here, once, instead of in each view.
  it("names the unit and says the user chose it", () => {
    expect(flowUnitNote("en", "m³/h", "L/min")).toBe(
      "Using m³/h — you set this, overriding the entity",
    );
  });

  it("names the unit and credits the entity when nothing overrides it", () => {
    expect(flowUnitNote("en", "", "L/min")).toBe("Using L/min, declared by the entity");
  });

  it("warns that readings are ignored when no unit is usable", () => {
    expect(flowUnitNote("en", "", undefined)).toBe(
      "No usable unit: readings are ignored until you set one",
    );
  });

  it("speaks the panel's language", () => {
    expect(flowUnitNote("it", "", "m³/h")).toBe("Uso m³/h, dichiarata dall'entità");
  });
});
