/**
 * Travel times for the trip planner, from Google's Distance Matrix, in two levels:
 *
 *   node scripts/generate-drive-times.js areas            # dry run: pairs, lookups, rough cost
 *   node scripts/generate-drive-times.js areas --apply    # ask, then write assets/data/area-drive-minutes.json
 *   node scripts/generate-drive-times.js towns            # dry run for every area
 *   node scripts/generate-drive-times.js towns --area dunedin --apply   # one area's table
 *
 * areas: one time per pair of areas, town centre (the middle of its places) to town centre,
 *        read by lib/areas.ts. A pair the service can't route keeps the time it had.
 * towns: one table per area of times between that area's own places, both ways, in
 *        half-hour slots, at assets/data/transit/<area>.json, read by
 *        lib/utils/transitMatrix.ts. Re-run one area after adding places there.
 *
 * Places come from the live api, so run it after the admin panel is up to date. --apply
 * needs GOOGLE_MAPS_API_KEY in the environment (not on the command line, where it would
 * land in shell history). Without --apply nothing is asked for or written.
 */
const fs = require("fs");
const path = require("path");
const {
  areasOf,
  centreOf,
  areaDriveTimes,
  areaTransit,
  googleFetchMatrix,
  costUSD,
  transitIndex,
} = require("./lib/driveMatrix");

const PLACES_URL = "https://api.blacksands.app/v1/southislandguide/locations";
const DATA = path.join(__dirname, "../assets/data");
const AREA_FILE = path.join(DATA, "area-drive-minutes.json");
// Google's free allowance for Distance Matrix (checked 2026-10-16): the cost shown is only
// for lookups past it in a month, and only if nothing else on the key used it.
const FREE_PER_MONTH = 10000;
const priceNote = (lookups) =>
  lookups <= FREE_PER_MONTH
    ? `within Google's ${FREE_PER_MONTH.toLocaleString()} free a month (US$${costUSD(lookups)} past that)`
    : `about US$${costUSD(lookups - FREE_PER_MONTH)} past Google's ${FREE_PER_MONTH.toLocaleString()} free a month`;
const TRANSIT_DIR = path.join(DATA, "transit");

const args = process.argv.slice(2);
const mode = args[0];
const apply = args.includes("--apply");
const onlyArea = args.includes("--area") ? args[args.indexOf("--area") + 1] : null;

async function livePlaces() {
  const res = await fetch(PLACES_URL);
  if (!res.ok) throw new Error(`places: HTTP ${res.status}`);
  const body = await res.json();
  return body.data.locations;
}

function fetcher() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("Set GOOGLE_MAPS_API_KEY in the environment to use --apply.");
  return googleFetchMatrix(key);
}

async function areas(groups) {
  const centres = Object.fromEntries([...groups].map(([id, places]) => [id, centreOf(places)]));
  const ids = Object.keys(centres);
  const lookups = (ids.length * (ids.length - 1)) / 2;
  console.log(`${ids.length} areas: ${ids.join(", ")}`);
  console.log(`${lookups} pairs to ask for, ${priceNote(lookups)}`);
  if (!apply) return console.log("Dry run. Add --apply to ask the maps service and write the file.");

  const { minutes, failed } = await areaDriveTimes(centres, fetcher());
  const before = fs.existsSync(AREA_FILE) ? JSON.parse(fs.readFileSync(AREA_FILE, "utf8")) : {};
  const merged = { ...before, ...minutes };
  fs.writeFileSync(AREA_FILE, JSON.stringify(merged, Object.keys(merged).sort(), 2) + "\n");
  console.log(`Wrote ${Object.keys(minutes).length} times to ${path.relative(process.cwd(), AREA_FILE)}`);
  if (failed.length) console.log(`No route found, kept what was there: ${failed.join(", ")}`);
}

async function towns(groups) {
  const ids = onlyArea ? [onlyArea] : [...groups.keys()];
  if (onlyArea && !groups.has(onlyArea)) throw new Error(`No active places with a position in area "${onlyArea}".`);
  let total = 0;
  for (const id of ids) {
    const n = groups.get(id).length;
    total += n * n;
    console.log(`${id}: ${n} places, ${n * n} lookups, about US$${costUSD(n * n)}`);
  }
  console.log(`In all: ${total} lookups, ${priceNote(total)}`);
  if (!apply) return console.log("Dry run. Add --apply to ask the maps service and write the tables.");

  const fetchMatrix = fetcher();
  fs.mkdirSync(TRANSIT_DIR, { recursive: true });
  for (const id of ids) {
    const table = await areaTransit(groups.get(id), fetchMatrix);
    fs.writeFileSync(path.join(TRANSIT_DIR, `${id}.json`), JSON.stringify(table) + "\n");
    console.log(`Wrote assets/data/transit/${id}.json`);
  }
  const present = fs.readdirSync(TRANSIT_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  fs.writeFileSync(path.join(TRANSIT_DIR, "index.ts"), transitIndex(present));
  console.log(`Listed ${present.length} area tables in assets/data/transit/index.ts`);
}

async function main() {
  if (mode !== "areas" && mode !== "towns") {
    console.error("Usage: node scripts/generate-drive-times.js areas|towns [--area <id>] [--apply]");
    process.exitCode = 1;
    return;
  }
  const groups = areasOf(await livePlaces());
  await (mode === "areas" ? areas(groups) : towns(groups));
}

// exitCode, not process.exit(): on Windows, exiting while fetch is still closing its
// connection crashes Node (a libuv assertion) instead of exiting cleanly.
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
