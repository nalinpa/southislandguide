/**
 * The saved map's tiles, for when there's no signal (docs/plans/offline-map.md):
 *
 *   node scripts/build-offline-map.js           # dry run: tiles per set and zoom
 *   node scripts/build-offline-map.js --apply   # download the missing ones from LINZ
 *   node scripts/build-offline-map.js --pack    # write v2's packs and manifest.json
 *
 * LINZ topographic maps (CC BY 4.0) in two sets (v2, owner 2026-11-11):
 *   standard: the whole country, zoom 5 to 11, in offline-map-site/offline-map/v1/{z}/{x}/{y}.png
 *             with v1's manifest.json ({ bytes, tiles }) beside them, as phones on the old
 *             code read it;
 *   detailed: zoom 12 (Topo50) over the app's map area, in offline-map-tiles-z12/, which
 *             isn't hosted: phones get those tiles only inside packs.
 *
 * --pack writes each set's tiles back to back into offline-map-site/offline-map/v2/
 * {set}-N.bin, 40 MB or less each, and v2/manifest.json:
 *   { sets: { standard: { bytes, packs: [{ file, bytes, tiles: [[tile, offset, length]] }] }, detailed: … } }
 * A Cloudflare R2 bucket serves offline-map-site and phones download from it, so no LINZ
 * key ships in the app.
 *
 * Tiles already on disk aren't downloaded again. A tile LINZ still answers with an error
 * on the second try is left out, and named at the end; a run again tries it again.
 *
 * --apply needs LINZ_API_KEY in the environment (not on the command line, where it would
 * land in shell history; LINZ asks that keys not be shown). --pack needs no key. With
 * neither, nothing is downloaded or written.
 */
const fs = require("fs");
const path = require("path");
const { tilesFor, tileUrl, packTiles } = require("./lib/offlineTiles");

const SITE = path.join(__dirname, "../offline-map-site/offline-map");
const V2 = path.join(SITE, "v2");

const SETS = {
  // Both islands, Stewart Island to Cape Reinga and Fiordland to East Cape, in one set
  // (owner, 2026-11-07), so the map needn't be saved again when the North Island goes
  // live. At zoom 6 the island about fills a phone's width; 5 leaves room to zoom out.
  // 77.7 MB in 9,849 tiles (2026-11-07).
  // ponytail: one rectangle, so the Tasman between the islands is in it too. Sea tiles are
  // small; drop identical ones if the count makes saving too slow.
  standard: {
    bounds: { minLat: -47.5, maxLat: -34.3, minLng: 166.2, maxLng: 178.7 },
    minZ: 5,
    maxZ: 11,
    dir: path.join(SITE, "v1"),
  },
  // Zoom 12 over the app's MAP_BOUNDS (components/map/MapRegion.ts), the South Island.
  // The North Island's zoom 12 goes in as one more set with its release.
  detailed: {
    bounds: { minLat: -47.5, maxLat: -40.3, minLng: 166.2, maxLng: 174.6 },
    minZ: 12,
    maxZ: 12,
    dir: path.join(__dirname, "../offline-map-tiles-z12"),
  },
};
// The app's zoom limits (lib/offlineMap.ts) must match the sets' maxZ.

// If iOS cancels a background download, at most one pack is lost.
const PACK_BYTES = 40e6;
// Four at a time: quick enough for a one-off run, and gentle on LINZ's free service.
const PARALLEL = 4;
const PROGRESS_EVERY = 500;

const count = (n) => n.toLocaleString("en-NZ");
// Decimal MB, as iOS shows storage.
const mb = (bytes) => (bytes / 1e6).toFixed(1);
const rel = (p) => path.relative(process.cwd(), p);

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const pack = args.includes("--pack");

const fileOf = (set, tile) => path.join(set.dir, `${tile}.png`);
const allTiles = (set) => tilesFor(set.bounds, set.minZ, set.maxZ);
const onDisk = (set) => allTiles(set).filter((tile) => fs.existsSync(fileOf(set, tile)));

function byZoom(tiles) {
  const groups = new Map();
  for (const tile of tiles) {
    const z = tile.split("/")[0];
    if (!groups.has(z)) groups.set(z, []);
    groups.get(z).push(tile);
  }
  return groups;
}

// One tile, asked twice before giving up: { png } or { status, why }. Error messages
// never carry the address, which holds the key.
async function fetchTile(tile, key) {
  let failure;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(tileUrl(tile, key));
      if (res.ok) return { png: Buffer.from(await res.arrayBuffer()) };
      failure = { status: res.status, why: `HTTP ${res.status}` };
    } catch (e) {
      failure = { status: null, why: e.message };
    }
  }
  return failure;
}

// Downloads `todo` PARALLEL at a time from a shared queue and resolves to the tiles that
// failed. A refused key stops the run: every tile would fail the same way.
async function download(set, todo, key) {
  const failed = [];
  let next = 0;
  let done = 0;
  let refused = null;
  const worker = async () => {
    while (next < todo.length && !refused) {
      const tile = todo[next++];
      const got = await fetchTile(tile, key);
      if (got.png) {
        fs.mkdirSync(path.dirname(fileOf(set, tile)), { recursive: true });
        fs.writeFileSync(fileOf(set, tile), got.png);
      } else if (got.status === 401 || got.status === 403) refused = got.status;
      else failed.push(`${tile} (${got.why})`);
      if (++done % PROGRESS_EVERY === 0) console.log(`  ${count(done)} of ${count(todo.length)}`);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  if (refused) throw new Error(`LINZ refused the key (HTTP ${refused}). Check LINZ_API_KEY.`);
  return failed;
}

// The zoom 12 folder ignores itself. Not a line in the root .gitignore: that file is part
// of the app's fingerprint, so editing it changes the runtime version and over-the-air
// updates stop matching the builds on phones (2026-11-11).
function ignoreInGit(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, ".gitignore"), "*\n");
}

async function applySet(name, set, key) {
  if (name === "detailed") ignoreInGit(set.dir);
  const todo = allTiles(set).filter((tile) => !fs.existsSync(fileOf(set, tile)));
  console.log(`${name}: downloading ${count(todo.length)} tiles, ${PARALLEL} at a time`);
  const failed = await download(set, todo, key);

  // What's on disk counts, so tiles from an earlier run do and failed ones don't.
  const size = new Map(onDisk(set).map((t) => [t, fs.statSync(fileOf(set, t)).size]));
  const saved = [...size.keys()];
  const bytes = saved.reduce((sum, t) => sum + size.get(t), 0);
  for (const [z, list] of byZoom(saved))
    console.log(`  z${z}: ${count(list.length)} tiles, ${mb(list.reduce((sum, t) => sum + size.get(t), 0))} MB`);
  console.log(`  In all: ${count(saved.length)} tiles, ${mb(bytes)} MB`);
  // v1's list, for phones on the old code. An empty one would let a phone "save" a map
  // with nothing in it.
  if (name === "standard" && saved.length) {
    fs.writeFileSync(path.join(set.dir, "manifest.json"), JSON.stringify({ bytes, tiles: saved }));
    console.log(`  Wrote ${rel(set.dir)}/manifest.json`);
  }
  if (failed.length) {
    const more = failed.length > 20 ? `, and ${count(failed.length - 20)} more` : "";
    console.log(`  ${count(failed.length)} failed twice, left out (run again to retry): ${failed.slice(0, 20).join(", ")}${more}`);
  }
}

function writePacks() {
  // A set with tiles missing would be a map with holes in it on every phone. Checked for
  // every set before anything is written.
  for (const [name, set] of Object.entries(SETS)) {
    const missing = allTiles(set).length - onDisk(set).length;
    if (missing) throw new Error(`${name}: ${count(missing)} tiles aren't downloaded yet. Run --apply first. Nothing written.`);
  }
  const sets = {};
  for (const [name, set] of Object.entries(SETS)) {
    const tiles = onDisk(set);
    const packs = packTiles(tiles.map((t) => [t, fs.readFileSync(fileOf(set, t))]), PACK_BYTES);
    sets[name] = { bytes: 0, packs: [] };
    packs.forEach((p, i) => {
      const file = `${name}-${i + 1}.bin`;
      fs.mkdirSync(V2, { recursive: true });
      fs.writeFileSync(path.join(V2, file), p.data);
      sets[name].packs.push({ file, bytes: p.data.length, tiles: p.tiles });
      sets[name].bytes += p.data.length;
    });
    console.log(`${name}: ${count(tiles.length)} tiles, ${mb(sets[name].bytes)} MB in ${packs.length} packs`);
  }
  fs.writeFileSync(path.join(V2, "manifest.json"), JSON.stringify({ sets }));
  console.log(`Wrote ${rel(V2)}/manifest.json`);
}

async function main() {
  if (apply) {
    const key = process.env.LINZ_API_KEY;
    if (!key) throw new Error("Set LINZ_API_KEY in the environment to use --apply.");
    for (const [name, set] of Object.entries(SETS)) await applySet(name, set, key);
  }
  if (pack) writePacks();
  if (apply || pack) return;

  for (const [name, set] of Object.entries(SETS)) {
    const tiles = allTiles(set);
    for (const [z, list] of byZoom(tiles)) console.log(`${name} z${z}: ${count(list.length)} tiles`);
    console.log(`${name}: ${count(tiles.length)} tiles, ${count(tiles.length - onDisk(set).length)} not downloaded yet`);
  }
  console.log("Dry run. --apply downloads the missing tiles from LINZ; --pack writes v2's packs.");
}

// exitCode, not process.exit(): on Windows, exiting while fetch is still closing its
// connection crashes Node (a libuv assertion) instead of exiting cleanly.
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
