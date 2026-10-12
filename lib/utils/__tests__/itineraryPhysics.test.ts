import {
  slotsToDurationLabel,
  slotIndexToTimeLabel,
  runPhysicsEngine,
  timelineOffsetForMinutes,
} from "@/lib/utils/itineraryPhysics";
import type { ItineraryItem } from "@/lib/models";

describe("slotsToDurationLabel", () => {
  it("pluralizes multi-hour durations", () => {
    expect(slotsToDurationLabel(4)).toBe("2 Hours");
  });

  it("keeps singular for exactly one hour", () => {
    expect(slotsToDurationLabel(2)).toBe("1 Hour");
  });

  it("handles half-hour durations", () => {
    expect(slotsToDurationLabel(1)).toBe("0.5 Hours");
  });
});

describe("slotIndexToTimeLabel", () => {
  it("labels slot 0 as the 8:00 AM grid start", () => {
    expect(slotIndexToTimeLabel(0)).toBe("8:00 AM");
  });

  it("labels the noon boundary correctly", () => {
    expect(slotIndexToTimeLabel(8)).toBe("12:00 PM");
  });

  it("labels the 10:00 PM grid end correctly", () => {
    expect(slotIndexToTimeLabel(28)).toBe("10:00 PM");
  });
});

function makeItem(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id: "item-1",
    siteId: "site-a",
    siteName: "Site",
    slotIndex: 0,
    timeLabel: "",
    durationLabel: "",
    durationSlots: 2,
    ...overrides,
  };
}

describe("runPhysicsEngine", () => {
  it("returns an empty array unchanged", () => {
    expect(runPhysicsEngine([])).toEqual([]);
  });

  it("pushes a colliding item forward past the required transit gap", () => {
    const items = [
      makeItem({ id: "a", siteId: "site-a", slotIndex: 0, durationSlots: 2 }),
      makeItem({ id: "b", siteId: "site-b", slotIndex: 1, durationSlots: 2 }),
    ];

    const result = runPhysicsEngine(items);

    expect(result[0].slotIndex).toBe(0);
    expect(result[1].slotIndex).toBe(3);
    expect(result[1].timeLabel).toBe("9:30 AM");
  });

  it("clamps an item that overruns the 10 PM grid limit", () => {
    const items = [
      makeItem({ id: "a", siteId: "site-a", slotIndex: 27, durationSlots: 4 }),
    ];

    const result = runPhysicsEngine(items);

    expect(result[0].slotIndex).toBe(24);
    expect(result[0].timeLabel).toBe("8:00 PM");
  });

  it("cascades an overrun clamp backward through earlier items", () => {
    const items = [
      makeItem({ id: "a", siteId: "s1", slotIndex: 20, durationSlots: 2 }),
      makeItem({ id: "b", siteId: "s2", slotIndex: 23, durationSlots: 2 }),
      makeItem({ id: "c", siteId: "s3", slotIndex: 26, durationSlots: 4 }),
    ];

    const result = runPhysicsEngine(items);

    expect(result[0].slotIndex).toBe(18);
    expect(result[1].slotIndex).toBe(21);
    expect(result[2].slotIndex).toBe(24);
    expect(result[0].timeLabel).toBe("5:00 PM");
    expect(result[1].timeLabel).toBe("6:30 PM");
    expect(result[2].timeLabel).toBe("8:00 PM");
  });
});

// The "now" line on today's plan. The grid runs 8:00 AM to 10:00 PM in 72pt half-hour rows.
describe("timelineOffsetForMinutes", () => {
  it("puts 8:00 AM at the top of the grid", () => {
    expect(timelineOffsetForMinutes(8 * 60)).toBe(0);
  });

  it("moves one row down for every half hour, and part of a row for part of one", () => {
    expect(timelineOffsetForMinutes(8 * 60 + 30)).toBe(72);
    expect(timelineOffsetForMinutes(10 * 60 + 15)).toBe(72 * 4.5);
  });

  it("reaches the foot of the grid at 10:00 PM", () => {
    expect(timelineOffsetForMinutes(22 * 60)).toBe(72 * 28);
  });

  it("has no position outside the grid's hours", () => {
    expect(timelineOffsetForMinutes(7 * 60 + 59)).toBeNull();
    expect(timelineOffsetForMinutes(22 * 60 + 1)).toBeNull();
  });
});
