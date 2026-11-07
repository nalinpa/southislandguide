// The saved map's tile list and where each tile comes from (scripts/build-offline-map.js).
// The bounds are the map's own, MAP_BOUNDS in components/map/MapRegion.ts.
const { tilesFor, tileUrl } = require("../lib/offlineTiles");
const BOUNDS = { minLat: -47.5, maxLat: -40.3, minLng: 166.2, maxLng: 174.6 };

test("covers the island's rectangle at each zoom", () => {
  expect(tilesFor(BOUNDS, 5, 5)).toEqual(["5/30/19", "5/30/20", "5/31/19", "5/31/20"]);
  expect(tilesFor(BOUNDS, 5, 11)).toHaveLength(3851);
  expect(tilesFor(BOUNDS, 5, 12)).toHaveLength(15006);
});

test("includes Milford Sound at zoom 11", () => {
  expect(tilesFor(BOUNDS, 11, 11)).toContain("11/1979/1308");
});

test("Topo250 up to zoom 11, Topo50 from 12", () => {
  expect(tileUrl("11/1979/1308", "K")).toMatch(/layer=50798\/EPSG:3857\/11\/1979\/1308\.png$/);
  expect(tileUrl("12/3958/2617", "K")).toMatch(/layer=50767\//);
  expect(tileUrl("12/3958/2617", "K")).toContain("key=K");
});

test("asks LINZ's own tile servers, whose certificate covers tiles-a to -d", () => {
  expect(tileUrl("11/1979/1308", "K")).toMatch(/^https:\/\/tiles-[a-d]\.data-cdn\.linz\.govt\.nz\/services;key=K\//);
});
