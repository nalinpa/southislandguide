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
  tripSummary,
  redateTrip,
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

  it("says half an hour in minutes, and the rest in hours", () => {
    expect(slotsToDurationLabel(1)).toBe("30 min");
    expect(slotsToDurationLabel(3)).toBe("1.5 Hours");
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

  // The one place a stop's labels are set, so a stored one can't disagree with its slots.
  it("labels each stop's time and length from its slots, whatever was stored", () => {
    const [stop] = runPhysicsEngine(
      [makeItem({ id: "a", siteId: "site-a", slotIndex: 2, durationSlots: 1, timeLabel: "", durationLabel: "0.5 Hours" })],
      places,
    );

    expect({ time: stop.timeLabel, length: stop.durationLabel }).toEqual({ time: "9:00 AM", length: "30 min" });
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
    expect(legs).toEqual([
      {
        key: "a",
        startSlot: 11,
        slots: 9,
        drive: { fromArea: "christchurch", toArea: "dunedin" },
        move: { intoId: "b", earliest: 4, latest: 11 },
      },
    ]);
  });

  it("starts with the drive from where the day before ended", () => {
    const legs = dayLegs([makeItem({ id: "b", siteId: "dun-a", slotIndex: 12 })], places, "chc-a");
    expect(legs).toEqual([
      {
        key: "opening",
        startSlot: 3,
        slots: 9,
        drive: { fromArea: "christchurch", toArea: "dunedin" },
        move: { intoId: "b", earliest: 0, latest: 3 },
      },
    ]);
  });

  // A drive can be moved anywhere between the place before it and the place it leads
  // to, so the spare time can be spent in the new town. Where it was put is kept on the
  // place it leads to (driveStartSlot).
  it("starts a drive where the user moved it", () => {
    const legs = dayLegs(
      [makeItem({ id: "a", siteId: "chc-a", slotIndex: 2 }), makeItem({ id: "b", siteId: "dun-a", slotIndex: 20, driveStartSlot: 6 })],
      places,
    );
    expect(legs[0].startSlot).toBe(6);
  });

  it("keeps a moved drive after the place before it and ending by the place it leads to", () => {
    const day = (driveStartSlot: number) => [
      makeItem({ id: "a", siteId: "chc-a", slotIndex: 2 }),
      makeItem({ id: "b", siteId: "dun-a", slotIndex: 20, driveStartSlot }),
    ];
    expect(dayLegs(day(1), places)[0].startSlot).toBe(4);
    expect(dayLegs(day(15), places)[0].startSlot).toBe(11);
  });

  it("starts a moved morning drive where the user put it", () => {
    const legs = dayLegs([makeItem({ id: "b", siteId: "dun-a", slotIndex: 12, driveStartSlot: 0 })], places, "chc-a");
    expect(legs[0].startSlot).toBe(0);
  });

  it("leaves the half-hour hop inside an area where it is, and not movable", () => {
    const legs = dayLegs(
      [makeItem({ id: "a", siteId: "chc-a", slotIndex: 2 }), makeItem({ id: "b", siteId: "chc-b", slotIndex: 8, driveStartSlot: 4 })],
      places,
    );
    expect(legs).toEqual([{ key: "a", startSlot: 7, slots: 1, drive: null }]);
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

// What the trip view shows for each day. Built on the same legs the day timeline draws,
// so the two can't disagree about what is a drive or how long it is.
describe("tripSummary", () => {
  const at = (id: string, siteId: string, slotIndex = 0) => makeItem({ id, siteId, slotIndex });
  const summary = (...days: ItineraryItem[][]) =>
    tripSummary(packTrip(days.map((items, i) => makeDay("d" + (i + 1), items)), places), places);

  it("gives a day in one town that town and no driving", () => {
    expect(summary([at("a", "chc-a"), at("b", "chc-b")])).toEqual([
      { dayId: "d1", placeCount: 2, areas: ["christchurch"], openingDrive: null, driveSlots: 0, overflows: false },
    ]);
  });

  it("lists the towns in the order visited, each once in a row, with the drive between them", () => {
    const [day] = summary([at("a", "chc-a"), at("b", "chc-b"), at("c", "dun-a")]);

    expect(day.areas).toEqual(["christchurch", "dunedin"]);
    expect(day.driveSlots).toBe(9);
  });

  it("keeps a town that is come back to", () => {
    const [day] = summary([at("a", "chc-a"), at("b", "tim-a"), at("c", "chc-b")]);

    expect(day.areas).toEqual(["christchurch", "timaru", "christchurch"]);
    expect(day.driveSlots).toBe(8);
  });

  it("gives a day that starts in a new town its opening drive, counted in the day's driving", () => {
    const [, day2] = summary([at("a", "chc-a")], [at("b", "dun-a")]);

    expect(day2.areas).toEqual(["dunedin"]);
    expect(day2.openingDrive).toEqual({ fromArea: "christchurch", slots: 9 });
    expect(day2.driveSlots).toBe(9);
  });

  // The planner takes it that the traveller stays where the day before ended, so an empty
  // day is in that town.
  it("gives an empty day the town the day before ended in, and no drive", () => {
    const [, day2, day3] = summary([at("a", "chc-a")], [], [at("b", "dun-a")]);

    expect(day2).toEqual({ dayId: "d2", placeCount: 0, areas: ["christchurch"], openingDrive: null, driveSlots: 0, overflows: false });
    expect(day3.openingDrive).toEqual({ fromArea: "christchurch", slots: 9 });
  });

  it("names no town for an empty day with nothing before it to go on", () => {
    const [day1, day2] = summary([], [at("a", "ghost")], []);

    expect(day1.areas).toEqual([]);
    expect(summary([at("a", "ghost")], [])[1].areas).toEqual([]);
    expect(day2.placeCount).toBe(1);
  });

  it("counts a place that isn't in the place list, without a town or a drive for it", () => {
    const [day] = summary([at("a", "chc-a"), at("b", "ghost"), at("c", "chc-b")]);

    expect(day.placeCount).toBe(3);
    expect(day.areas).toEqual(["christchurch"]);
    expect(day.driveSlots).toBe(0);
  });

  it("flags a day with more in it than fits before 10 PM", () => {
    const long = (id: string) => makeItem({ id, siteId: "chc-a", durationSlots: 12 });
    const [fits] = summary([long("a"), makeItem({ id: "b", siteId: "chc-b", durationSlots: 12 })]);
    const [over] = summary([long("a"), makeItem({ id: "b", siteId: "chc-b", durationSlots: 12 }), makeItem({ id: "c", siteId: "chc-a", durationSlots: 6 })]);

    expect(fits.overflows).toBe(false);
    expect(over.overflows).toBe(true);
  });
});

describe("redateTrip", () => {
  const stop = (id: string) => ({ id, siteId: "chc-a", siteName: "A", slotIndex: 2, durationSlots: 2, timeLabel: "", durationLabel: "" });
  const trip: ItineraryDay[] = [
    { id: "d1", date: "2026-11-02", items: [stop("a")] },
    { id: "d2", date: "2026-11-03", items: [] },
    { id: "d3", date: "2026-11-04", items: [stop("b")] },
  ];
  let n = 0;
  const newId = () => `new_${++n}`;
  beforeEach(() => {
    n = 0;
  });

  it("moves every day with a new start, keeping its id and places", () => {
    const days = redateTrip(trip, "2026-12-10", 3, newId);

    expect(days.map((d) => d.date)).toEqual(["2026-12-10", "2026-12-11", "2026-12-12"]);
    expect(days.map((d) => d.id)).toEqual(["d1", "d2", "d3"]);
    expect(days[2].items).toBe(trip[2].items);
  });

  it("adds empty days at the end for a longer trip", () => {
    const days = redateTrip(trip, "2026-11-02", 5, newId);

    expect(days.slice(3)).toEqual([
      { id: "new_1", date: "2026-11-05", items: [] },
      { id: "new_2", date: "2026-11-06", items: [] },
    ]);
  });

  it("drops days from the end for a shorter trip", () => {
    expect(redateTrip(trip, "2026-11-02", 2, newId).map((d) => d.id)).toEqual(["d1", "d2"]);
  });

  it("dates across a month's end", () => {
    expect(redateTrip(trip, "2026-10-30", 4, newId).map((d) => d.date)).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });
});
