// One leg between two places. Two levels: places in the same area take the flat half hour
// (until real in-area times are generated); places in different areas take that pair of
// areas' drive time from lib/areas.ts, and only those legs count as a drive.
import { getLeg, type PlaceLookup } from "@/lib/utils/transitMatrix";

// The area each test place is visited from. "nowhere" is listed but has no area; an id
// that isn't a key here ("ghost") isn't in the place list at all. "oamaru" is an area the
// app has no drive times for.
const AREA: Record<string, string | undefined> = {
  "chc-a": "christchurch",
  "chc-b": "christchurch",
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

  it("keeps the flat half hour inside one area, and doesn't call it a drive", () => {
    expect(getLeg("chc-a", "chc-b", places)).toEqual({ slots: 1, drive: null });
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
});
