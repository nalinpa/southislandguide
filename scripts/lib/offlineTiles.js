// The working parts of scripts/build-offline-map.js, kept apart so they can be tested
// (scripts/__tests__/offlineTiles.test.js).
//
// A tile is "z/x/y" in Web Mercator XYZ, y counted from the top: the layout
// react-native-maps' UrlTile reads from the phone (AIRMapUrlTileCachedOverlay.m).

// LINZ Data Service layers, each drawn for its own scale: NZ Topo250 (1:250,000) for zoom
// 11 and out, NZ Topo50 (1:50,000) from 12 in.
const TOPO250 = 50798;
const TOPO50 = 50767;

function tileX(lng, z) {
  return Math.floor(((lng + 180) / 360) * 2 ** z);
}

function tileY(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * 2 ** z);
}

// Every tile touching the rectangle, at each zoom from minZ to maxZ, both corners
// included. North is the smaller y, so maxLat gives the first row.
function tilesFor(bounds, minZ, maxZ) {
  const tiles = [];
  for (let z = minZ; z <= maxZ; z++) {
    const [x0, x1] = [tileX(bounds.minLng, z), tileX(bounds.maxLng, z)];
    const [y0, y1] = [tileY(bounds.maxLat, z), tileY(bounds.minLat, z)];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) tiles.push(`${z}/${x}/${y}`);
  }
  return tiles;
}

// LINZ's address for one tile. The subdomain (a to d) comes from the tile, so a run spreads
// its requests across all four and the same tile always asks the same one. LINZ's own
// data-cdn.linz.govt.nz: tiles-cdn.koordinates.com's certificate doesn't cover the tiles-a
// to -d names, so every request there failed (ERR_TLS_CERT_ALTNAME_INVALID, 2026-11-07).
function tileUrl(tile, key) {
  const [z, x, y] = tile.split("/").map(Number);
  const layer = z <= 11 ? TOPO250 : TOPO50;
  const sub = "abcd"[(x + y) % 4];
  return `https://tiles-${sub}.data-cdn.linz.govt.nz/services;key=${key}/tiles/v4/layer=${layer}/EPSG:3857/${z}/${x}/${y}.png`;
}

// Tiles written back to back into packs of at most `limit` bytes (v2: iOS downloads a few
// big files in the background, not thousands of small ones). `entries` is [tile, Buffer]
// pairs; each pack is { data, tiles: [[tile, offset, length], …] }. A tile bigger than the
// limit gets a pack to itself.
function packTiles(entries, limit) {
  const packs = [];
  let parts = [];
  let tiles = [];
  let offset = 0;
  const close = () => {
    if (tiles.length) packs.push({ data: Buffer.concat(parts), tiles });
    parts = [];
    tiles = [];
    offset = 0;
  };
  for (const [tile, png] of entries) {
    if (offset && offset + png.length > limit) close();
    tiles.push([tile, offset, png.length]);
    parts.push(png);
    offset += png.length;
  }
  close();
  return packs;
}

module.exports = { tilesFor, tileUrl, packTiles };
