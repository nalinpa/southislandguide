import { AREAS, AREA_LABELS, DEFAULT_AREA, areaLabel, areaName, areaDriveMinutes } from "@/lib/areas";

describe("areas", () => {
  it("has three areas with ids and labels", () => {
    expect(AREAS).toHaveLength(3);
    expect(AREAS.map((a) => a.id).sort()).toEqual(["christchurch", "dunedin", "timaru"]);
    expect(AREA_LABELS.christchurch).toBe("Christchurch");
    expect(AREA_LABELS.dunedin).toBe("Dunedin");
    expect(AREA_LABELS.timaru).toBe("Timaru");
  });

  // The planner falls back to a flat half hour for a pair with no time, which is the bug
  // this table exists to fix. A new area must come with a time to every other one.
  it("has a drive time for every pair of areas", () => {
    for (const a of AREAS) {
      for (const b of AREAS) {
        if (a.id !== b.id) expect({ pair: `${a.id}-${b.id}`, minutes: areaDriveMinutes(a.id, b.id) }).toEqual({ pair: `${a.id}-${b.id}`, minutes: expect.any(Number) });
      }
    }
  });

  it("areaLabel returns the label for a known id and undefined otherwise", () => {
    expect(areaLabel("christchurch")).toBe("Christchurch");
    expect(areaLabel("not-an-area")).toBeUndefined();
  });

  // An area added in the admin panel before the app knows it still has to be shown as something.
  // A new town's name is nearly always its id with capitals, so it reads right from the
  // day it is entered. A label is only needed for what capitals can't do (a macron, an "&").
  it("areaName returns the label for a known id, and otherwise the id with capitals", () => {
    expect(areaName("dunedin")).toBe("Dunedin");
    expect(areaName("oamaru")).toBe("Oamaru");
    expect(areaName("lake-tekapo")).toBe("Lake Tekapo");
  });

  // Where Explore opens for someone who isn't on the island, or has no position.
  it("starts from Christchurch, which is one of the areas", () => {
    expect(DEFAULT_AREA).toBe("christchurch");
    expect(AREAS.map((a) => a.id)).toContain(DEFAULT_AREA);
  });

  it("areaDriveMinutes returns the listed time for a known pair in either order", () => {
    expect(areaDriveMinutes("christchurch", "timaru")).toBe(120);
    expect(areaDriveMinutes("timaru", "christchurch")).toBe(120);
    expect(areaDriveMinutes("christchurch", "dunedin")).toBe(270);
    expect(areaDriveMinutes("dunedin", "timaru")).toBe(150);
  });

  it("areaDriveMinutes returns undefined for an unknown pair or same area", () => {
    expect(areaDriveMinutes("christchurch", "christchurch")).toBeUndefined();
    expect(areaDriveMinutes("not-an-area", "christchurch")).toBeUndefined();
  });
});
