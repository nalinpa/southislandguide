import { AREAS, AREA_LABELS, AREA_REGIONS, DEFAULT_AREA, areaLabel, areaName, areaDriveMinutes } from "@/lib/areas";

describe("areas", () => {
  it("labels the areas whose names capitals can't make", () => {
    expect(AREAS.map((a) => a.id).sort()).toEqual([
      "aoraki-mount-cook",
      "arthurs-pass",
      "catlins",
      "christchurch",
      "dunedin",
      "kaikoura",
      "oamaru",
      "queenstown",
      "timaru",
      "wanaka",
    ]);
    expect(AREA_LABELS.christchurch).toBe("Christchurch");
    expect(AREA_LABELS.dunedin).toBe("Dunedin");
    expect(AREA_LABELS.timaru).toBe("Timaru");
    expect(AREA_LABELS.oamaru).toBe("Ōamaru");
    expect(AREA_LABELS.kaikoura).toBe("Kaikōura");
    expect(AREA_LABELS.wanaka).toBe("Wānaka");
    expect(AREA_LABELS["aoraki-mount-cook"]).toBe("Aoraki / Mount Cook");
    expect(AREA_LABELS.catlins).toBe("The Catlins");
    expect(AREA_LABELS["arthurs-pass"]).toBe("Arthur's Pass");
  });

  // The planner estimates a pair with no time and draws no drive block for it, so a new
  // area must come with a time to every other one. Checked against the generated file
  // itself (by its path: the "@/" import gives tests fixed sample times; jest.config.js).
  it("has a drive time for every pair of areas in the generated file", () => {
    const generated: Record<string, number> = require("../../assets/data/area-drive-minutes.json");
    for (const a of AREAS) {
      for (const b of AREAS) {
        const pair = [a.id, b.id].sort().join("|");
        if (a.id !== b.id) expect({ pair, minutes: generated[pair] }).toEqual({ pair, minutes: expect.any(Number) });
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
    expect(areaName("oamaru")).toBe("Ōamaru");
    expect(areaName("kaikoura")).toBe("Kaikōura");
    expect(areaName("hanmer-springs")).toBe("Hanmer Springs");
    expect(areaName("lake-tekapo")).toBe("Lake Tekapo");
  });

  // Where Explore opens for someone who isn't on the island, or has no position.
  it("starts from Queenstown, which is one of the areas", () => {
    expect(DEFAULT_AREA).toBe("queenstown");
    expect(AREAS.map((a) => a.id)).toContain(DEFAULT_AREA);
  });

  // A town with no region here goes under the one most of its places say, which is how the
  // Catlins ended up under Otago. Every town in the bundled place files has its own.
  it("gives every town in the place files a region", () => {
    const fs = require("fs");
    const path = require("path");
    const dir = path.join(__dirname, "../../assets/data");
    const towns = new Set<string>();
    for (const f of fs.readdirSync(dir).filter((f: string) => f.endsWith("_places.json") || f === "christchurch_places_all.json"))
      for (const p of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) if (p.area) towns.add(p.area);
    expect([...towns].filter((t) => !AREA_REGIONS[t])).toEqual([]);
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
