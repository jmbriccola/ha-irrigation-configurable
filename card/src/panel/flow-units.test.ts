import { describe, expect, it } from "vitest";
import { FLOW_UNITS, detectedFlowUnit, effectiveFlowUnit, flowUnitNote } from "./flow-units";

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
