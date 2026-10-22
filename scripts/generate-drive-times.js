/**
 * Travel times for the trip planner, from Google's Distance Matrix:
 *
 *   node scripts/generate-drive-times.js areas            # dry run: hubs, pairs, lookups, rough cost
 *   node scripts/generate-drive-times.js areas --apply    # ask, then write area-drive-minutes.json and area-hubs.json
 *   node scripts/generate-drive-times.js towns            # dry run for every area
 *   node scripts/generate-drive-times.js towns --area dunedin --apply   # one area's table
 *   node scripts/generate-drive-times.js far              # dry run: far-out places and their lookups
 *   node scripts/generate-drive-times.js far --apply      # ask, then write far-place-minutes.json
 *   ... --all                                             # ask again for what is already known
 *
 * areas: one time per pair of areas, hub to hub, read by lib/areas.ts. A town's hub is its
 *        pinned place (scripts/lib/areaCentres.js), or the place nearest the middle of its
 *        places for a town with no pin. A pair the service can't route keeps the time it
 *        had. Changing a hub changes all its pairs: run with --all.
 * towns: one table per area of times between that area's own places, both ways, in
 *        half-hour slots, at assets/data/transit/<area>.json, read by
 *        lib/utils/transitMatrix.ts.
 * far:   each far-out place's own time to the hub of every town within 4 hours of its own,
 *        read by lib/utils/transitMatrix.ts. Run after `towns` (far-out is read from the
 *        town tables) and after `areas --apply` (the hubs and the 4 hours come from it).
 *
 * Only what isn't known yet is asked for: a new area costs only its pairs with the other
 * areas, a new place only its times to and from the rest of its town, a far-out place only
 * the towns it lacks. --all asks again for everything (roads change), at the full cost.
 *
 * Places come from the live api, so run it after the admin panel is up to date. --apply
 * needs GOOGLE_MAPS_API_KEY in the environment (not on the command line, where it would
 * land in shell history). Without --apply nothing is asked for or written.
 */
const fs = require("fs");
const path = require("path");
const {
  areasOf,
  hubOf,
  areaDriveTimes,
  areaTransit,
  transitLookups,
  farPlaces,
  nearTowns,
  farLookups,
  farPlaceTimes,
  pairKey,
  googleFetchMatrix,
  costUSD,
  transitIndex,
} = require("./lib/driveMatrix");
const { HUBS, NO_CENTRE } = require("./lib/areaCentres");

const PLACES_URL = "https://api.blacksands.app/v1/southislandguide/locations";
const DATA = path.join(__dirname, "../assets/data");
const AREA_FILE = path.join(DATA, "area-drive-minutes.json");
const HUBS_FILE = path.join(DATA, "area-hubs.json");
const FAR_FILE = path.join(DATA, "far-place-minutes.json");
const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {});
const sortedJson = (obj) => JSON.stringify(obj, Object.keys(obj).sort(), 2) + "\n";
// Google's free allowance for Distance Matrix (checked 2026-10-16): the cost shown is only
// for lookups past it in a month, and only if nothing else on the key used it.
const FREE_PER_MONTH = 10000;
const priceNote = (lookups) =>
  lookups <= FREE_PER_MONTH
    ? `free: comes out of Google's ${FREE_PER_MONTH.toLocaleString()} free lookups a month` +
      ` (only if those were already used up this month would it cost about US$${costUSD(lookups)})`
    : `the first ${FREE_PER_MONTH.toLocaleString()} free, about US$${costUSD(lookups - FREE_PER_MONTH)} for the rest` +
      ` (more if some of this month's free lookups are already used)`;
const TRANSIT_DIR = path.join(DATA, "transit");
const tableFile = (id) => path.join(TRANSIT_DIR, `${id}.json`);

const args = process.argv.slice(2);
const mode = args[0];
const apply = args.includes("--apply");
const all = args.includes("--all");
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
  const hubs = Object.fromEntries([...groups].map(([id, places]) => [id, hubOf(places, HUBS[id])]));
  const ids = Object.keys(hubs);
  const before = readJson(AREA_FILE);
  const known = all ? {} : before;
  let lookups = 0;
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) if (!(pairKey(ids[i], ids[j]) in known)) lookups++;
  console.log(`${ids.length} areas, measured from:`);
  for (const id of ids) {
    const { place, pinned } = hubs[id];
    const lost = HUBS[id] && !pinned ? `  (pinned place "${HUBS[id]}" is gone, closed or has no position)` : "";
    console.log(`  ${id}: ${place.id}, ${pinned ? "pinned" : "middle"}${lost}`);
  }
  if (!lookups) return console.log("Every pair already has a time. Nothing to ask for (--all to ask again).");
  console.log(`${lookups} pairs to ask for, ${priceNote(lookups)}`);
  if (!apply) return console.log("Dry run. Add --apply to ask the maps service and write the files.");

  const centres = Object.fromEntries(ids.map((id) => [id, hubs[id].place]));
  const { minutes, failed } = await areaDriveTimes(centres, fetcher(), known);
  fs.writeFileSync(AREA_FILE, sortedJson({ ...before, ...minutes }));
  console.log(`Wrote ${Object.keys(minutes).length} times to ${path.relative(process.cwd(), AREA_FILE)}`);
  if (failed.length) console.log(`No route found, kept what was there: ${failed.join(", ")}`);
  // The app reads the hubs too: a far-out place's leg runs through the other town's hub.
  fs.writeFileSync(HUBS_FILE, sortedJson(Object.fromEntries(ids.map((id) => [id, hubs[id].place.id]))));
  console.log(`Wrote ${ids.length} hubs to ${path.relative(process.cwd(), HUBS_FILE)}`);
}

async function towns(groups) {
  const ids = onlyArea ? [onlyArea] : [...groups.keys()];
  if (onlyArea && !groups.has(onlyArea)) throw new Error(`No active places with a position in area "${onlyArea}".`);
  const knownFor = (id) => (all ? {} : readJson(tableFile(id)));
  let total = 0;
  const todo = [];
  for (const id of ids) {
    const n = groups.get(id).length;
    const lookups = transitLookups(groups.get(id), knownFor(id));
    total += lookups;
    if (lookups) todo.push(id);
    console.log(`${id}: ${n} places, ${lookups ? `${lookups} lookups` : "up to date"}`);
  }
  if (!total) return console.log("Every area is up to date. Nothing to ask for (--all to ask again).");
  console.log(`In all: ${total} lookups, ${priceNote(total)}`);
  if (!apply) return console.log("Dry run. Add --apply to ask the maps service and write the tables.");

  const fetchMatrix = fetcher();
  fs.mkdirSync(TRANSIT_DIR, { recursive: true });
  for (const id of todo) {
    const table = await areaTransit(groups.get(id), fetchMatrix, knownFor(id));
    fs.writeFileSync(path.join(TRANSIT_DIR, `${id}.json`), JSON.stringify(table) + "\n");
    console.log(`Wrote assets/data/transit/${id}.json`);
  }
  const present = fs.readdirSync(TRANSIT_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  fs.writeFileSync(path.join(TRANSIT_DIR, "index.ts"), transitIndex(present));
  console.log(`Listed ${present.length} area tables in assets/data/transit/index.ts`);
}

async function far(groups) {
  const hubIds = readJson(HUBS_FILE);
  if (!Object.keys(hubIds).length) throw new Error("No hubs yet: run `areas --all --apply` first.");
  const areaMinutes = readJson(AREA_FILE);
  const byId = new Map([...groups.values()].flat().map((p) => [p.id, p]));
  const hubs = {};
  for (const [town, id] of Object.entries(hubIds)) if (byId.has(id)) hubs[town] = byId.get(id);
  const hubTowns = Object.keys(hubs);

  const wanted = [];
  const notInTable = [];
  for (const [town, places] of groups) {
    if (!hubs[town]) {
      console.log(`${town}: its hub isn't in area-hubs.json or is gone, skipped (run areas --apply)`);
      continue;
    }
    const { far: farOut, missing } = farPlaces(places, hubs[town].id, readJson(tableFile(town)), NO_CENTRE.includes(town));
    notInTable.push(...missing);
    for (const place of farOut) wanted.push({ place, towns: nearTowns(town, hubTowns, areaMinutes) });
    if (farOut.length) console.log(`${town}: ${farOut.length} of ${places.length} places far-out`);
  }
  const before = readJson(FAR_FILE);
  const known = all ? {} : before;
  const lookups = farLookups(wanted, known);
  console.log(`${wanted.length} far-out places, ${lookups} lookups, ${priceNote(lookups)}`);
  if (notInTable.length) console.log(`Not in their town's table yet, skipped (run towns first): ${notInTable.join(", ")}`);
  if (!apply) return console.log("Dry run. Add --apply to ask the maps service and write the file.");

  // No key needed when there is nothing to ask: the file is still rewritten, which drops
  // places no longer far-out.
  const { minutes, failed } = await farPlaceTimes(wanted, hubs, lookups ? fetcher() : null, known);
  const sorted = Object.fromEntries(
    Object.keys(minutes)
      .sort()
      .map((id) => [id, Object.fromEntries(Object.entries(minutes[id]).sort(([a], [b]) => a.localeCompare(b)))]),
  );
  fs.writeFileSync(FAR_FILE, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`Wrote ${wanted.length} far-out places to ${path.relative(process.cwd(), FAR_FILE)}`);
  if (failed.length) console.log(`No route found: ${failed.join(", ")}`);
}

const MODES = { areas, towns, far };

async function main() {
  if (!MODES[mode]) {
    console.error("Usage: node scripts/generate-drive-times.js areas|towns|far [--area <id>] [--all] [--apply]");
    process.exitCode = 1;
    return;
  }
  await MODES[mode](areasOf(await livePlaces()));
}

// exitCode, not process.exit(): on Windows, exiting while fetch is still closing its
// connection crashes Node (a libuv assertion) instead of exiting cleanly.
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
