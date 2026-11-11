// The saved map's tile list and where each tile comes from (scripts/build-offline-map.js).
// The bounds are the map's own, MAP_BOUNDS in components/map/MapRegion.ts.
const { tilesFor, tileUrl, packTiles } = require("../lib/offlineTiles");

test("packs tiles back to back, and starts a new pack past the size limit", () => {
  const entries = [
    ["5/30/19", Buffer.from("aaaa")],
    ["5/30/20", Buffer.from("bbbbbb")],
    ["5/31/19", Buffer.from("cc")],
  ];
  const packs = packTiles(entries, 10);

  expect(packs.map((p) => p.tiles)).toEqual([
    [["5/30/19", 0, 4], ["5/30/20", 4, 6]],
    [["5/31/19", 0, 2]],
  ]);
  // Reading back by offset gives each tile's bytes.
  const read = packs.flatMap((p) => p.tiles.map(([tile, offset, length]) => [tile, p.data.subarray(offset, offset + length).toString()]));
  expect(read).toEqual([["5/30/19", "aaaa"], ["5/30/20", "bbbbbb"], ["5/31/19", "cc"]]);
});

test("a tile bigger than the limit gets a pack to itself", () => {
  const packs = packTiles([["5/30/19", Buffer.from("a")], ["5/30/20", Buffer.from("bbbbbbbbbbbb")], ["5/31/19", Buffer.from("c")]], 10);
  expect(packs.map((p) => p.tiles.length)).toEqual([1, 1, 1]);
});
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
