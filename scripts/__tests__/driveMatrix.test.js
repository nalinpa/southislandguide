// The drive time scripts' working parts, against a fake maps service: one time per pair
// of areas (town centre to town centre), and one table per area of times between that
// area's own places. Never a table for the whole island.
const {
  areasOf,
  centreOf,
  pairKey,
  areaDriveTimes,
  areaTransit,
  transitLookups,
  parseDistanceMatrix,
  costUSD,
  transitIndex,
} = require("../lib/driveMatrix");

const place = (id, area, lat, lng, over = {}) => ({ id, area, lat, lng, active: true, ...over });

// Minutes from a to b in the fake: the difference in latitude, as if 1 degree took 100
// minutes, plus 1 minute when going south (a one-way detour), so direction shows.
const fakeMinutes = (a, b) => Math.round(Math.abs(a.lat - b.lat) * 100) + (b.lat < a.lat ? 1 : 0);
const fakeService = () => {
  const calls = [];
  const fetchMatrix = async (origins, destinations) => {
    calls.push({ origins: origins.length, destinations: destinations.length });
    return origins.map((o) => destinations.map((d) => fakeMinutes(o, d)));
  };
  return { fetchMatrix, calls };
};

describe("areasOf", () => {
  it("groups active places with an area and a position by area", () => {
    const groups = areasOf([
      place("a", "christchurch", -43.5, 172.6),
      place("b", "dunedin", -45.9, 170.5),
      place("c", "christchurch", -43.6, 172.7),
      place("closed", "christchurch", -43.5, 172.6, { active: false }),
      place("nowhere", undefined, -44, 171),
      place("lost", "dunedin", undefined, undefined),
    ]);

    expect([...groups.keys()]).toEqual(["christchurch", "dunedin"]);
    expect(groups.get("christchurch").map((p) => p.id)).toEqual(["a", "c"]);
    expect(groups.get("dunedin").map((p) => p.id)).toEqual(["b"]);
  });
});

describe("centreOf", () => {
  // The middle itself can land in bush with no road (Haast's did), and the maps service
  // can't route to that, so it is the place nearest the middle.
  it("is the area's place nearest the middle of its places", () => {
    const places = [place("a", "x", -43, 172), place("b", "x", -44, 174), place("c", "x", -43.6, 172.9)];
    expect(centreOf(places)).toEqual({ lat: -43.6, lng: 172.9 });
  });
});

describe("pairKey", () => {
  it("is the two ids in alphabetical order, as lib/areas.ts looks them up", () => {
    expect(pairKey("timaru", "christchurch")).toBe("christchurch|timaru");
  });
});

describe("areaDriveTimes", () => {
  const centres = {
    christchurch: { lat: -43.5, lng: 172.6 },
    timaru: { lat: -44.4, lng: 171.2 },
    dunedin: { lat: -45.9, lng: 170.5 },
  };

  it("asks once for each pair of areas and keys the times by pair", async () => {
    const { fetchMatrix, calls } = fakeService();

    const { minutes, failed } = await areaDriveTimes(centres, fetchMatrix);

    expect(minutes).toEqual({ "christchurch|timaru": 91, "christchurch|dunedin": 241, "dunedin|timaru": 151 });
    expect(failed).toEqual([]);
    expect(calls.reduce((n, c) => n + c.origins * c.destinations, 0)).toBe(3);
  });

  // A new area costs only its own pairs: what is in the file already is not asked again.
  it("asks only for pairs not already known", async () => {
    const { fetchMatrix, calls } = fakeService();

    const { minutes, asked } = await areaDriveTimes(centres, fetchMatrix, { "christchurch|timaru": 120 });

    expect(minutes).toEqual({ "christchurch|dunedin": 241, "dunedin|timaru": 151 });
    expect(asked).toBe(2);
    expect(calls.reduce((n, c) => n + c.origins * c.destinations, 0)).toBe(2);
  });

  it("asks for nothing when every pair is known", async () => {
    const { fetchMatrix, calls } = fakeService();

    const known = { "christchurch|timaru": 1, "christchurch|dunedin": 2, "dunedin|timaru": 3 };
    expect((await areaDriveTimes(centres, fetchMatrix, known)).asked).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("leaves out a pair the service has no route for, and says which", async () => {
    const fetchMatrix = async (origins, destinations) =>
      origins.map((o) => destinations.map((d) => (o.lat === -43.5 && d.lat === -45.9 ? null : fakeMinutes(o, d))));

    const { minutes, failed } = await areaDriveTimes(centres, fetchMatrix);

    expect(minutes["christchurch|dunedin"]).toBeUndefined();
    expect(failed).toEqual(["christchurch|dunedin"]);
  });
});

describe("areaTransit", () => {
  const town = Array.from({ length: 12 }, (_, i) => place("p" + i, "dunedin", -45.8 - i * 0.1, 170.5));

  it("times every place in the area to every other, both ways, in half-hour slots", async () => {
    const { fetchMatrix } = fakeService();

    const table = await areaTransit(town, fetchMatrix);

    expect(Object.keys(table)).toHaveLength(12);
    expect(table.p0.p0).toBeUndefined();
    // p0 to p1: 10 minutes south plus the detour = 11, one slot. p0 to p11: 111 minutes = 4 slots.
    expect(table.p0.p1).toBe(1);
    expect(table.p0.p11).toBe(4);
    expect(table.p11.p0).toBe(4);
  });

  // A place added to a town costs only its own times: to and from every other place there.
  it("asks only for times involving places not yet in the table, and keeps the rest", async () => {
    const { fetchMatrix, calls } = fakeService();
    const known = await areaTransit(town.slice(0, 10), fakeService().fetchMatrix);
    known.p0.p1 = 7; // what was there stays, even if the service would now say otherwise

    const table = await areaTransit(town, fetchMatrix, known);

    // p10 and p11 to all 12, and the 10 known places to p10 and p11.
    expect(calls.reduce((n, c) => n + c.origins * c.destinations, 0)).toBe(2 * 12 + 10 * 2);
    expect(table.p0.p1).toBe(7);
    expect(table.p0.p11).toBe(4);
    expect(table.p11.p0).toBe(4);
    expect(table.p10.p11).toBe(1);
  });

  it("counts what it would ask for before asking", () => {
    expect(transitLookups(town, {})).toBe(144);
    expect(transitLookups(town, { p0: {}, p1: {} })).toBe(10 * 12 + 2 * 10);
    expect(transitLookups(town.slice(0, 2), { p0: {}, p1: {} })).toBe(0);
  });

  it("never asks for more than 100 times at once, the service's limit", async () => {
    const { fetchMatrix, calls } = fakeService();

    await areaTransit(town, fetchMatrix);

    expect(calls.every((c) => c.origins * c.destinations <= 100)).toBe(true);
  });
});

describe("parseDistanceMatrix", () => {
  it("reads minutes from the maps service's answer, and null where it found no route", () => {
    const body = {
      status: "OK",
      rows: [{ elements: [{ status: "OK", duration: { value: 5400 } }, { status: "ZERO_RESULTS" }] }],
    };
    expect(parseDistanceMatrix(body)).toEqual([[90, null]]);
  });

  it("throws on an answer that failed as a whole", () => {
    expect(() => parseDistanceMatrix({ status: "REQUEST_DENIED", error_message: "bad key" })).toThrow(
      /REQUEST_DENIED.*bad key/,
    );
  });
});

describe("costUSD", () => {
  it("is about five dollars a thousand times", () => {
    expect(costUSD(1600)).toBe(8);
  });
});

describe("transitIndex", () => {
  it("lists each area's table for the app, in order", () => {
    expect(transitIndex(["dunedin", "christchurch"])).toContain(
      '"christchurch": require("./christchurch.json"),\n  "dunedin": require("./dunedin.json"),',
    );
  });

  it("is an empty list with no tables", () => {
    expect(transitIndex([])).toContain("export const TRANSIT: Transit = {};");
  });
});
