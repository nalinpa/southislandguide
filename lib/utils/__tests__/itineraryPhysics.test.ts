import {
  slotsToDurationLabel,
  slotIndexToTimeLabel,
  runPhysicsEngine,
  timelineOffsetForMinutes,
  packTrip,
  dayOverflows,
  dayLegs,
  moveItemToDay,
  tryEdit,
} from "@/lib/utils/itineraryPhysics";
import type { PlaceLookup } from "@/lib/utils/transitMatrix";
import type { ItineraryDay, ItineraryItem } from "@/lib/models";

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

// The area each test place is visited from. A site id that isn't a key here ("site-a",
// "s1", "ghost") isn't in the place list, so its legs are the flat half hour.
const AREA: Record<string, string> = {
  "chc-a": "christchurch",
  "chc-b": "christchurch",
  "tim-a": "timaru",
  "dun-a": "dunedin",
  "dun-b": "dunedin",
};
const places: PlaceLookup = (id) => (id in AREA ? { area: AREA[id] } : undefined);

function makeDay(id: string, items: ItineraryItem[]): ItineraryDay {
  return { id, date: "2026-10-01", items };
}

const slots = (items: ItineraryItem[]) => items.map((i) => i.slotIndex);

describe("runPhysicsEngine", () => {
  it("returns an empty array unchanged", () => {
    expect(runPhysicsEngine([], places)).toEqual([]);
  });

  it("pushes a colliding item forward past the required transit gap", () => {
    const items = [
      makeItem({ id: "a", siteId: "site-a", slotIndex: 0, durationSlots: 2 }),
      makeItem({ id: "b", siteId: "site-b", slotIndex: 1, durationSlots: 2 }),
    ];

    const result = runPhysicsEngine(items, places);

    expect(result[0].slotIndex).toBe(0);
    expect(result[1].slotIndex).toBe(3);
    expect(result[1].timeLabel).toBe("9:30 AM");
  });

  it("clamps an item that overruns the 10 PM grid limit", () => {
    const items = [
      makeItem({ id: "a", siteId: "site-a", slotIndex: 27, durationSlots: 4 }),
    ];

    const result = runPhysicsEngine(items, places);

    expect(result[0].slotIndex).toBe(24);
    expect(result[0].timeLabel).toBe("8:00 PM");
  });

  it("cascades an overrun clamp backward through earlier items", () => {
    const items = [
      makeItem({ id: "a", siteId: "s1", slotIndex: 20, durationSlots: 2 }),
      makeItem({ id: "b", siteId: "s2", slotIndex: 23, durationSlots: 2 }),
      makeItem({ id: "c", siteId: "s3", slotIndex: 26, durationSlots: 4 }),
    ];

    const result = runPhysicsEngine(items, places);

    expect(result[0].slotIndex).toBe(18);
    expect(result[1].slotIndex).toBe(21);
    expect(result[2].slotIndex).toBe(24);
    expect(result[0].timeLabel).toBe("5:00 PM");
    expect(result[1].timeLabel).toBe("6:30 PM");
    expect(result[2].timeLabel).toBe("8:00 PM");
  });
});

// Christchurch to Dunedin is 9 slots (4.5 hours), Christchurch to Timaru 4, Timaru to Dunedin 5.
describe("runPhysicsEngine, between areas", () => {
  it("pushes a place in another area back by the drive", () => {
    const result = runPhysicsEngine(
      [makeItem({ id: "a", siteId: "chc-a", slotIndex: 0 }), makeItem({ id: "b", siteId: "dun-a", slotIndex: 1 })],
      places,
    );

    expect(slots(result)).toEqual([0, 11]);
    expect(result[1].timeLabel).toBe("1:30 PM");
  });

  it("keeps the drive when a day bounces back from 10 PM", () => {
    const result = runPhysicsEngine(
      [
        makeItem({ id: "a", siteId: "chc-a", slotIndex: 14 }),
        makeItem({ id: "b", siteId: "dun-a", slotIndex: 20, durationSlots: 4 }),
      ],
      places,
    );

    expect(slots(result)).toEqual([13, 24]);
  });

  it("holds the first place until the drive from where the day before ended", () => {
    const result = runPhysicsEngine([makeItem({ siteId: "dun-a", slotIndex: 1 })], places, "chc-a");
    expect(slots(result)).toEqual([9]);
  });

  it("adds nothing to the start of a day spent in the same area as the night before", () => {
    const result = runPhysicsEngine([makeItem({ siteId: "dun-a", slotIndex: 1 })], places, "dun-b");
    expect(slots(result)).toEqual([1]);
  });

  it("adds nothing to the start of a day when the place before it is unknown", () => {
    const result = runPhysicsEngine([makeItem({ siteId: "dun-a", slotIndex: 1 })], places, "ghost");
    expect(slots(result)).toEqual([1]);
  });

  it("never starts the first place inside the opening drive, even on a day that can't fit", () => {
    const result = runPhysicsEngine(
      [
        makeItem({ id: "a", siteId: "dun-a", slotIndex: 0, durationSlots: 10 }),
        makeItem({ id: "b", siteId: "dun-b", slotIndex: 0, durationSlots: 10 }),
      ],
      places,
      "chc-a",
    );

    expect(slots(result)).toEqual([9, 20]);
    expect(dayOverflows(result)).toBe(true);
  });
});

describe("dayOverflows", () => {
  it("is false for an empty day and for one ending at 10 PM exactly", () => {
    expect(dayOverflows([])).toBe(false);
    expect(dayOverflows([makeItem({ slotIndex: 24, durationSlots: 4 })])).toBe(false);
  });

  it("is true once the last place ends after 10 PM", () => {
    expect(dayOverflows([makeItem({ slotIndex: 25, durationSlots: 4 })])).toBe(true);
  });
});

// A day starts wherever the day before ended. Items are in visit order; packTrip keeps it.
describe("packTrip", () => {
  it("reserves a drive between two areas on the same day", () => {
    const days = packTrip(
      [makeDay("d1", [makeItem({ id: "a", siteId: "chc-a", slotIndex: 2 }), makeItem({ id: "b", siteId: "dun-a", slotIndex: 5 })])],
      places,
    );
    expect(slots(days[0].items)).toEqual([2, 13]);
  });

  it("opens a day with the drive when the day before ended in another area", () => {
    const days = packTrip(
      [
        makeDay("d1", [makeItem({ id: "a", siteId: "chc-a", slotIndex: 2 })]),
        makeDay("d2", [makeItem({ id: "b", siteId: "dun-a", slotIndex: 1 })]),
      ],
      places,
    );
    expect(slots(days[1].items)).toEqual([9]);
  });

  it("leaves a day alone when the day before ended in the same area", () => {
    const days = packTrip(
      [
        makeDay("d1", [makeItem({ id: "a", siteId: "chc-a", slotIndex: 2 }), makeItem({ id: "b", siteId: "dun-a", slotIndex: 13 })]),
        makeDay("d2", [makeItem({ id: "c", siteId: "dun-b", slotIndex: 1 })]),
      ],
      places,
    );
    expect(slots(days[1].items)).toEqual([1]);
  });

  it("looks past an empty day to the last day that had places", () => {
    const days = packTrip(
      [
        makeDay("d1", [makeItem({ id: "a", siteId: "chc-a", slotIndex: 2 })]),
        makeDay("d2", []),
        makeDay("d3", [makeItem({ id: "b", siteId: "dun-a", slotIndex: 0 })]),
      ],
      places,
    );
    expect(slots(days[2].items)).toEqual([9]);
  });

  it("adds no drive when the day before ended at a place it doesn't know", () => {
    const days = packTrip(
      [
        makeDay("d1", [makeItem({ id: "a", siteId: "ghost", slotIndex: 2 })]),
        makeDay("d2", [makeItem({ id: "b", siteId: "dun-a", slotIndex: 1 })]),
      ],
      places,
    );
    expect(slots(days[1].items)).toEqual([1]);
  });
});

// What the day view draws between places, and keeps "Find more things to do" cards out of.
describe("dayLegs", () => {
  it("gives the half-hour hop inside an area, ending where the next place starts", () => {
    const legs = dayLegs(
      [makeItem({ id: "a", siteId: "chc-a", slotIndex: 2 }), makeItem({ id: "b", siteId: "chc-b", slotIndex: 8 })],
      places,
    );
    expect(legs).toEqual([{ key: "a", startSlot: 7, slots: 1, drive: null }]);
  });

  it("gives a drive between areas, ending where the next place starts", () => {
    const legs = dayLegs(
      [makeItem({ id: "a", siteId: "chc-a", slotIndex: 2 }), makeItem({ id: "b", siteId: "dun-a", slotIndex: 20 })],
      places,
    );
    expect(legs).toEqual([{ key: "a", startSlot: 11, slots: 9, drive: { fromArea: "christchurch", toArea: "dunedin" } }]);
  });

  it("starts with the drive from where the day before ended", () => {
    const legs = dayLegs([makeItem({ id: "b", siteId: "dun-a", slotIndex: 12 })], places, "chc-a");
    expect(legs).toEqual([{ key: "opening", startSlot: 3, slots: 9, drive: { fromArea: "christchurch", toArea: "dunedin" } }]);
  });

  it("has no opening leg when the day before ended in the same area", () => {
    expect(dayLegs([makeItem({ id: "b", siteId: "dun-a", slotIndex: 12 })], places, "dun-b")).toEqual([]);
  });
});

describe("moveItemToDay", () => {
  it("takes a place out of its day and into the other, by its time", () => {
    const days = moveItemToDay(
      [
        makeDay("d1", [makeItem({ id: "x", slotIndex: 2 }), makeItem({ id: "y", slotIndex: 6 })]),
        makeDay("d2", [makeItem({ id: "w", slotIndex: 4 }), makeItem({ id: "z", slotIndex: 10 })]),
      ],
      "y",
      "d2",
    );

    expect(days[0].items.map((i) => i.id)).toEqual(["x"]);
    expect(days[1].items.map((i) => i.id)).toEqual(["w", "y", "z"]);
  });
});

// The gate every edit goes through: no edit may leave a day ending past 10 PM later than
// it already did. It looks at the whole trip, because changing one day's last place
// changes the drive the next day opens with.
describe("tryEdit", () => {
  it("packs and lets through an edit that fits", () => {
    const current = [makeDay("d1", [makeItem({ id: "a", siteId: "chc-a", slotIndex: 2 })])];
    const next = [makeDay("d1", [...current[0].items, makeItem({ id: "b", siteId: "dun-a", slotIndex: 6 })])];

    const result = tryEdit(current, next, "d1", places);

    expect(result.ok && slots(result.days[0].items)).toEqual([2, 13]);
  });

  it("refuses a place that leaves no room for the drive to it, and says so", () => {
    const current = [makeDay("d1", [makeItem({ id: "a", siteId: "chc-a", slotIndex: 0, durationSlots: 10 })])];
    const next = [makeDay("d1", [...current[0].items, makeItem({ id: "b", siteId: "dun-a", slotIndex: 18, durationSlots: 10 })])];

    expect(tryEdit(current, next, "d1", places)).toEqual({
      ok: false,
      reason: "There isn't time for the drive to Dunedin on this day. Try a different day or a shorter visit.",
    });
  });

  it("refuses a place on a day that is simply full", () => {
    const current = [makeDay("d1", [makeItem({ id: "a", siteId: "chc-a", slotIndex: 1, durationSlots: 27 })])];
    const next = [makeDay("d1", [...current[0].items, makeItem({ id: "b", siteId: "chc-b", slotIndex: 1 })])];

    expect(tryEdit(current, next, "d1", places)).toEqual({
      ok: false,
      reason: "This day is full. Try a different day or shorten the visit.",
    });
  });

  it("refuses taking away a day's last place when the next day then has no room for its drive", () => {
    const current = [
      makeDay("d1", [makeItem({ id: "a", siteId: "chc-a", slotIndex: 2 }), makeItem({ id: "b", siteId: "dun-a", slotIndex: 13 })]),
      makeDay("d2", [makeItem({ id: "c", siteId: "dun-b", slotIndex: 0, durationSlots: 20 })]),
    ];
    const next = [makeDay("d1", [current[0].items[0]]), current[1]];

    expect(tryEdit(current, next, "d1", places)).toEqual({
      ok: false,
      reason: "Day 2 would no longer fit after the drive from Christchurch. Make room on Day 2 first.",
    });
  });

  it("refuses deleting a day when the one after then has no room, naming it by its number today", () => {
    const current = [
      makeDay("d1", [makeItem({ id: "a", siteId: "chc-a", slotIndex: 2 })]),
      makeDay("d2", [makeItem({ id: "b", siteId: "dun-a", slotIndex: 13 })]),
      makeDay("d3", [makeItem({ id: "c", siteId: "dun-b", slotIndex: 0, durationSlots: 20 })]),
    ];
    const next = [current[0], current[2]];

    expect(tryEdit(current, next, "d2", places)).toEqual({
      ok: false,
      reason: "Day 3 would no longer fit after the drive from Christchurch. Make room on Day 3 first.",
    });
  });

  it("re-times the next day when an edit that fits changes the drive it opens with", () => {
    const current = [
      makeDay("d1", [makeItem({ id: "a", siteId: "chc-a", slotIndex: 2 }), makeItem({ id: "b", siteId: "dun-a", slotIndex: 13 })]),
      makeDay("d2", [makeItem({ id: "c", siteId: "dun-b", slotIndex: 1 })]),
    ];
    const next = [makeDay("d1", [current[0].items[0]]), current[1]];

    const result = tryEdit(current, next, "d1", places);

    expect(result.ok && slots(result.days[1].items)).toEqual([9]);
  });

  // A trip saved before drive times existed can already run late. It must stay editable.
  it("allows an edit to a day already past 10 PM, as long as it ends no later", () => {
    const current = [
      makeDay("d1", [
        makeItem({ id: "a", siteId: "chc-a", slotIndex: 0, durationSlots: 20 }),
        makeItem({ id: "b", siteId: "chc-b", slotIndex: 21, durationSlots: 10 }),
      ]),
    ];
    const next = [makeDay("d1", [current[0].items[0], { ...current[0].items[1], durationSlots: 9 }])];

    expect(tryEdit(current, next, "d1", places).ok).toBe(true);
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
