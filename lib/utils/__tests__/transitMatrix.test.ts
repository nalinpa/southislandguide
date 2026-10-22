// One leg between two places. Places in different areas take that pair of areas' drive
// time, hub to hub (lib/areas.ts), unless one end is a far-out place with its own time to
// the other area's hub; only those legs count as a drive. Places in one area take that
// area's own table of times (assets/data/transit/<area>.json), generated per area, never
// one table for the island. Anything neither covers is estimated from the distance, and
// with no position to go on it is the flat half hour.

// Christchurch has a table with two times in it. Te Anau, Milford Sound and Queenstown
// have tables with their hubs in them, for the far-out places below; no other area has one.
jest.mock("@/assets/data/transit", () => ({
  TRANSIT: {
    christchurch: { "chc-a": { "chc-b": 3, "tim-a": 2 } },
    "te-anau": { "ta-hub": { "ta-x": 1, lumsden: 4 }, "ta-x": { "ta-hub": 1 }, lumsden: { "ta-hub": 4 } },
    "milford-sound": { "mf-hub": { mirror: 2 }, mirror: { "mf-hub": 2 } },
    queenstown: { "qt-hub": { "qt-a": 1 }, "qt-a": { "qt-hub": 1 } },
  },
}));
// The test fixture's three pairs (jest.config.js), and three for the far-out places.
jest.mock("@/assets/data/area-drive-minutes.json", () => ({
  "christchurch|timaru": 120,
  "dunedin|timaru": 150,
  "christchurch|dunedin": 270,
  "milford-sound|te-anau": 120,
  "milford-sound|queenstown": 250,
  "queenstown|te-anau": 120,
}));
jest.mock("@/assets/data/area-hubs.json", () => ({ "te-anau": "ta-hub", "milford-sound": "mf-hub", queenstown: "qt-hub" }));
// Mirror Lakes is a Milford Sound place 40 minutes from Te Anau's hub, with no time to
// Queenstown's (more than 4 hours from Milford Sound). Lumsden is a Te Anau place.
jest.mock("@/assets/data/far-place-minutes.json", () => ({
  mirror: { "te-anau": 40 },
  lumsden: { "milford-sound": 200 },
}));

import { getLeg, type PlaceLookup } from "@/lib/utils/transitMatrix";

// The area each test place is visited from. "nowhere" is listed but has no area; an id
// that isn't a key here ("ghost") isn't in the place list at all. "oamaru" is an area the
// app has no drive times for.
const AREA: Record<string, string | undefined> = {
  "chc-a": "christchurch",
  "chc-b": "christchurch",
  "chc-c": "christchurch",
  "tim-a": "timaru",
  "dun-a": "dunedin",
  "oam-a": "oamaru",
  nowhere: undefined,
  "ta-hub": "te-anau",
  "ta-x": "te-anau",
  lumsden: "te-anau",
  "mf-hub": "milford-sound",
  mirror: "milford-sound",
  "qt-hub": "queenstown",
  "qt-a": "queenstown",
};
const places: PlaceLookup = (id) => (id in AREA ? { area: AREA[id] } : undefined);

describe("getLeg", () => {
  it("needs no travel between a place and itself", () => {
    expect(getLeg("chc-a", "chc-a", places)).toEqual({ slots: 0, drive: null });
  });

  it("keeps the flat half hour inside one area with no time or position to go on, and doesn't call it a drive", () => {
    expect(getLeg("chc-a", "chc-c", places)).toEqual({ slots: 1, drive: null });
  });

  it("takes the time from the area's own table", () => {
    expect(getLeg("chc-a", "chc-b", places)).toEqual({ slots: 3, drive: null });
  });

  it("never uses an area's table between two areas", () => {
    expect(getLeg("chc-a", "tim-a", places)).toEqual({ slots: 4, drive: { fromArea: "christchurch", toArea: "timaru" } });
  });

  it.each([
    ["chc-a", "tim-a", 4, "christchurch", "timaru"],
    ["tim-a", "chc-a", 4, "timaru", "christchurch"],
    ["tim-a", "dun-a", 5, "timaru", "dunedin"],
    ["dun-a", "tim-a", 5, "dunedin", "timaru"],
    ["chc-a", "dun-a", 9, "christchurch", "dunedin"],
    ["dun-a", "chc-a", 9, "dunedin", "christchurch"],
  ])("takes the area drive time from %s to %s: %i slots", (from, to, slots, fromArea, toArea) => {
    expect(getLeg(from, to, places)).toEqual({ slots, drive: { fromArea, toArea } });
  });

  it("falls back to the half hour when a place has no area", () => {
    expect(getLeg("chc-a", "nowhere", places)).toEqual({ slots: 1, drive: null });
    expect(getLeg("nowhere", "dun-a", places)).toEqual({ slots: 1, drive: null });
  });

  it("falls back to the half hour when a place isn't in the list", () => {
    expect(getLeg("chc-a", "ghost", places)).toEqual({ slots: 1, drive: null });
  });

  it("falls back to the half hour for a pair of areas with no listed time", () => {
    expect(getLeg("chc-a", "oam-a", places)).toEqual({ slots: 1, drive: null });
  });

  // A far-out place is far from its own town's hub (Mirror Lakes is a Milford Sound place
  // 40 minutes from Te Anau). Hub to hub would count Milford Sound to Te Anau, 2 hours.
  // A place's way to or from its own hub counts the middle of its half-hour slot: 15
  // minutes for 1 slot, 45 for 2, 105 for 4. (Counting the whole slot would tip each of
  // these into the next half hour.)
  describe("a far-out place", () => {
    const TE_ANAU_TO_MILFORD = { fromArea: "te-anau", toArea: "milford-sound" };
    const MILFORD_TO_TE_ANAU = { fromArea: "milford-sound", toArea: "te-anau" };

    it("takes its own time from a town near it: 40 minutes from the hub, 15 + 40 from a place a slot from it", () => {
      expect(getLeg("ta-hub", "mirror", places)).toEqual({ slots: 2, drive: TE_ANAU_TO_MILFORD });
      expect(getLeg("ta-x", "mirror", places)).toEqual({ slots: 2, drive: TE_ANAU_TO_MILFORD });
    });

    it("takes its own time to a town near it, then the town's own table: 40 + 15", () => {
      expect(getLeg("mirror", "ta-x", places)).toEqual({ slots: 2, drive: MILFORD_TO_TE_ANAU });
    });

    // Mirror Lakes to Lumsden: 40 to Te Anau's hub + 105 on to Lumsden = 145, or 45 to
    // Milford's hub + Lumsden's own 200 = 245.
    it("takes the shorter way when both ends are far-out", () => {
      expect(getLeg("mirror", "lumsden", places)).toEqual({ slots: 5, drive: MILFORD_TO_TE_ANAU });
      expect(getLeg("lumsden", "mirror", places)).toEqual({ slots: 5, drive: TE_ANAU_TO_MILFORD });
    });

    // Errs long, never far short: 250 hub to hub + 45 between Mirror Lakes and its hub.
    it("adds its way to its own hub to the hub-to-hub time for a town it has no time for", () => {
      expect(getLeg("mirror", "qt-a", places)).toEqual({ slots: 10, drive: { fromArea: "milford-sound", toArea: "queenstown" } });
      expect(getLeg("qt-a", "mirror", places)).toEqual({ slots: 10, drive: { fromArea: "queenstown", toArea: "milford-sound" } });
    });

    it("leaves a leg between two plain places hub to hub", () => {
      expect(getLeg("ta-x", "qt-a", places)).toEqual({ slots: 4, drive: { fromArea: "te-anau", toArea: "queenstown" } });
    });
  });

  // About 1.6 minutes a kilometre as the crow flies: roads wind (about 1.3 times the
  // straight line) at about 50 km/h, rounded up to the half hour.
  describe("with positions to go on", () => {
    const KM_LAT = 1 / 111.2; // degrees of latitude in a kilometre
    const at = (area: string | undefined, km: number) => ({ area, lat: -43.5 - km * KM_LAT, lng: 172.6 });
    const PLACES: Record<string, ReturnType<typeof at>> = {
      "chc-a": at("christchurch", 0),
      "chc-b": at("christchurch", 60), // far, but the table says 3
      near: at("christchurch", 5),
      far: at("christchurch", 25),
      oamaru: at("oamaru", 200),
      loose: at(undefined, 40),
    };
    const withPositions: PlaceLookup = (id) => PLACES[id];

    it("estimates a hop inside an area from the distance", () => {
      expect(getLeg("chc-a", "near", withPositions)).toEqual({ slots: 1, drive: null });
      expect(getLeg("chc-a", "far", withPositions)).toEqual({ slots: 2, drive: null });
    });

    it("uses the table over the estimate when it has the pair", () => {
      expect(getLeg("chc-a", "chc-b", withPositions)).toEqual({ slots: 3, drive: null });
    });

    it("estimates between areas with no listed time, without calling it a drive", () => {
      expect(getLeg("chc-a", "oamaru", withPositions)).toEqual({ slots: 11, drive: null });
    });

    it("estimates for a place with no area", () => {
      expect(getLeg("chc-a", "loose", withPositions)).toEqual({ slots: 3, drive: null });
    });
  });
});
