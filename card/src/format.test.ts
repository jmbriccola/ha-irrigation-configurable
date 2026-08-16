import { describe, expect, it } from "vitest";
import { describeLeakAlarm } from "./format";
import type { LeakStatus } from "./discovery";

/**
 * The sentence every surface shows for a standing leak alarm. It exists once
 * — the zone row and the card header both render it — precisely because the
 * two things it must not say are easy to get wrong independently in two
 * places.
 */
describe("describeLeakAlarm", () => {
  const CONFIRMED = "2026-08-16T05:25:00Z";
  const NOW = Date.parse("2026-08-16T05:30:00Z");

  const alarm = (extra: Partial<LeakStatus> = {}): LeakStatus => ({
    coverage: "alarm",
    confirmedAt: CONFIRMED,
    sources: ["valve_sensor"],
    describingSource: "valve_sensor",
    ...extra,
  });

  it("says the alarm was confirmed, never that the water has been running since", () => {
    // The evidence completing is the only instant anything measured. A leak
    // may have been running for hours before the window closed, or for the
    // five minutes of the window itself; the entity cannot tell, so neither
    // may this sentence.
    const line = describeLeakAlarm("en", "Leak", alarm(), NOW);
    expect(line).toContain("Confirmed 5 minutes ago");
    expect(line).not.toMatch(/leaking since/i);

    const italian = describeLeakAlarm("it", "Perdita", alarm(), NOW);
    expect(italian).toContain("Confermata 5 minuti fa");
    expect(italian).not.toMatch(/perde da/i);
  });

  it("translates the source instead of printing the contract key", () => {
    expect(describeLeakAlarm("en", "Leak", alarm(), NOW)).toContain(
      "the valve's own sensor reports a leak",
    );
    expect(
      describeLeakAlarm(
        "en",
        "System leak",
        alarm({ sources: ["no_flow_closed"], describingSource: "no_flow_closed" }),
        NOW,
      ),
    ).toContain("water measured with every valve closed");
    expect(describeLeakAlarm("en", "Leak", alarm(), NOW)).not.toContain("valve_sensor");
  });

  it("cites the source a description should cite, not merely the first one", () => {
    // `describing_source` is what the Repairs notice is keyed on. Reading the
    // two in the same breath and finding them naming different devices leaves
    // the user guessing which one to go and look at.
    const line = describeLeakAlarm(
      "en",
      "Leak",
      alarm({ sources: ["no_flow_closed", "valve_sensor"], describingSource: "valve_sensor" }),
      NOW,
    );
    expect(line).toContain("the valve's own sensor reports a leak");
    expect(line).not.toContain("water measured with every valve closed");
  });

  it("falls back to a contributing source when none is singled out", () => {
    const line = describeLeakAlarm(
      "en",
      "Leak",
      alarm({ sources: ["no_flow_closed"], describingSource: undefined }),
      NOW,
    );
    expect(line).toContain("water measured with every valve closed");
  });

  it("drops what it does not have rather than showing a gap", () => {
    // An alarm with no `since` and no source is reachable — a restart
    // re-earns the evidence, and a source can withdraw while the alarm
    // stands on another. The headline alone is then the whole sentence.
    expect(
      describeLeakAlarm(
        "en",
        "Leak",
        { coverage: "alarm", sources: [], describingSource: undefined },
        NOW,
      ),
    ).toBe("Leak");
  });
});
