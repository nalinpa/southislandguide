/**
 * The saved map's tiles, for when there's no signal (docs/plans/offline-map.md):
 *
 *   node scripts/build-offline-map.js           # dry run: tiles per zoom and in all
 *   node scripts/build-offline-map.js --apply   # download them from LINZ, then write the list
 *
 * LINZ topographic maps (CC BY 4.0) for the map's whole rectangle, zoom MIN_Z to MAX_Z,
 * into offline-map-site/offline-map/v1/{z}/{x}/{y}.png, with manifest.json beside them:
 * { bytes, tiles }. Firebase Hosting serves that folder and phones download from it, so no
 * LINZ key ships in the app. Tiles already in the folder aren't downloaded again, so
 * raising MAX_Z downloads only the new zoom. A tile LINZ still answers with an error on the
 * second try is left out of the folder and the list, and named at the end; a run again
 * tries it again.
 *
 * --apply needs LINZ_API_KEY in the environment (not on the command line, where it would
 * land in shell history; LINZ asks that keys not be shown). Without --apply nothing is
 * downloaded or written.
 */
const fs = require("fs");
const path = require("path");
const { tilesFor, tileUrl } = require("./lib/offlineTiles");

// The map's own bounds, MAP_BOUNDS in components/map/MapRegion.ts, copied because that
// file is the app's TypeScript. Change both together.
// ponytail: South Island only. A North Island set is its own bounds and its own folder.
const BOUNDS = { minLat: -47.5, maxLat: -40.3, minLng: 166.2, maxLng: 174.6 };
// At zoom 6 the island about fills a phone's width; 5 leaves room to zoom out.
const MIN_Z = 5;
// 11 until the owner picks by size after a run (the plan's Decisions table): 12 if the
// set is 150 MB or less. The app's OFFLINE_MAP_MAX_Z must match.
const MAX_Z = 11;

// ponytail: one set, v1. Hosting tells phones v1 never changes, so a rebuilt set goes
// under v2.
const OUT = path.join(__dirname, "../offline-map-site/offline-map/v1");
// Four at a time: quick enough for a one-off run, and gentle on LINZ's free service.
const PARALLEL = 4;
const PROGRESS_EVERY = 500;

const fileOf = (tile) => path.join(OUT, `${tile}.png`);
const count = (n) => n.toLocaleString("en-NZ");
// Decimal MB, as iOS shows storage.
const mb = (bytes) => (bytes / 1e6).toFixed(1);

const apply = process.argv.slice(2).includes("--apply");

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
async function download(todo, key) {
  const failed = [];
  let next = 0;
  let done = 0;
  let refused = null;
  const worker = async () => {
    while (next < todo.length && !refused) {
      const tile = todo[next++];
      const got = await fetchTile(tile, key);
      if (got.png) {
        fs.mkdirSync(path.dirname(fileOf(tile)), { recursive: true });
        fs.writeFileSync(fileOf(tile), got.png);
      } else if (got.status === 401 || got.status === 403) refused = got.status;
      else failed.push(`${tile} (${got.why})`);
      if (++done % PROGRESS_EVERY === 0) console.log(`  ${count(done)} of ${count(todo.length)}`);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  if (refused) throw new Error(`LINZ refused the key (HTTP ${refused}). Check LINZ_API_KEY. manifest.json not written.`);
  return failed;
}

async function main() {
  const tiles = tilesFor(BOUNDS, MIN_Z, MAX_Z);
  const todo = tiles.filter((tile) => !fs.existsSync(fileOf(tile)));
  if (!apply) {
    for (const [z, list] of byZoom(tiles)) console.log(`z${z}: ${count(list.length)} tiles`);
    console.log(`In all: ${count(tiles.length)} tiles, zoom ${MIN_Z} to ${MAX_Z}, ${count(todo.length)} not downloaded yet`);
    return console.log("Dry run. Add --apply to download them from LINZ and write manifest.json.");
  }

  const key = process.env.LINZ_API_KEY;
  if (!key) throw new Error("Set LINZ_API_KEY in the environment to use --apply.");
  console.log(`Downloading ${count(todo.length)} tiles, ${PARALLEL} at a time`);
  const failed = await download(todo, key);

  // The list is what's in the folder, so tiles from an earlier run count and failed ones don't.
  const size = new Map(tiles.filter((t) => fs.existsSync(fileOf(t))).map((t) => [t, fs.statSync(fileOf(t)).size]));
  const saved = [...size.keys()];
  const bytes = saved.reduce((sum, t) => sum + size.get(t), 0);
  for (const [z, list] of byZoom(saved))
    console.log(`z${z}: ${count(list.length)} tiles, ${mb(list.reduce((sum, t) => sum + size.get(t), 0))} MB`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify({ bytes, tiles: saved }));
  console.log(`In all: ${count(saved.length)} tiles, ${mb(bytes)} MB. Wrote ${path.relative(process.cwd(), OUT)}/manifest.json`);
  if (failed.length) {
    const more = failed.length > 20 ? `, and ${count(failed.length - 20)} more` : "";
    console.log(`${count(failed.length)} failed twice, left out (run again to retry): ${failed.slice(0, 20).join(", ")}${more}`);
  }
}

// exitCode, not process.exit(): on Windows, exiting while fetch is still closing its
// connection crashes Node (a libuv assertion) instead of exiting cleanly.
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
