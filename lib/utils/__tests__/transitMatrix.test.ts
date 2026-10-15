// One leg between two places. Places in different areas take that pair of areas' drive
// time (lib/areas.ts), and only those legs count as a drive. Places in one area take that
// area's own table of times (assets/data/transit/<area>.json), generated per area, never
// one table for the island. Anything neither covers is estimated from the distance, and
// with no position to go on it is the flat half hour.

// Christchurch has a table, with two times in it; no other area has one.
jest.mock("@/assets/data/transit", () => ({
  TRANSIT: { christchurch: { "chc-a": { "chc-b": 3, "tim-a": 2 } } },
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
