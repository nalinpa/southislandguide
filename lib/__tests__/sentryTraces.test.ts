import { dropImpossibleTraces } from "@/lib/sentryTraces";

describe("dropImpossibleTraces", () => {
  it("drops a trace over a minute (seconds, as Sentry stamps them)", () => {
    expect(dropImpossibleTraces({ start_timestamp: 1000, timestamp: 1000 + 77.4 })).toBeNull(); // the 1.29 min one
    expect(dropImpossibleTraces({ start_timestamp: 1000, timestamp: 1000 + 5.18 * 3600 })).toBeNull();
  });

  it("sends anything a real screen could take, and a trace it can't measure", () => {
    const quick = { start_timestamp: 1000, timestamp: 1000.62 };
    expect(dropImpossibleTraces(quick)).toBe(quick);
    expect(dropImpossibleTraces({ start_timestamp: 1000, timestamp: 1060 })).not.toBeNull();
    expect(dropImpossibleTraces({ timestamp: 5000 })).not.toBeNull();
  });
});
