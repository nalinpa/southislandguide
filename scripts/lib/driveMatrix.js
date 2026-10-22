// The working parts of scripts/generate-drive-times.js, kept apart so they can be tested
// against a fake maps service (scripts/__tests__/driveMatrix.test.js).
//
// Travel time as the app reads it (lib/utils/transitMatrix.ts):
// - one time per pair of areas, hub to hub (lib/areas.ts);
// - one table per area of times between that area's own places;
// - for each far-out place (one far from its own hub), its own time to the hubs near it.
// Never one table for the whole island: it would grow with the square of every place.
//
// `fetchMatrix(origins, destinations)` takes two lists of { lat, lng } and resolves to a
// grid of minutes (null where there is no route), origins by destinations.

const SLOT_MINUTES = 30;
// The maps service answers at most 100 origin-destination times per request, and takes
// at most 25 origins or 25 destinations.
const MAX_ELEMENTS = 100;
const MAX_SIDE = 25;
// Google's list price for Distance Matrix, per time asked for. Check before a big run.
const USD_PER_ELEMENT = 5 / 1000;
// A far-out place gets its own time to the hub of every town within this of its own town.
// Further away, a few tens of minutes either way matter little.
const FAR_REACH_MINUTES = 240;

function areasOf(places) {
  const groups = new Map();
  for (const p of places) {
    if (p.active === false || !p.area || typeof p.lat !== "number" || typeof p.lng !== "number") continue;
    if (!groups.has(p.area)) groups.set(p.area, []);
    groups.get(p.area).push(p);
  }
  return groups;
}

// The area's place nearest the middle of its places. Not the middle itself: the maps
// service snaps a point to a road only if one is near, and Haast's middle was in bush it
// couldn't route to. A place is somewhere people get to. ponytail: flat lat/lng distance,
// fine at town scale.
function centreOf(places) {
  const lat = places.reduce((sum, p) => sum + p.lat, 0) / places.length;
  const lng = places.reduce((sum, p) => sum + p.lng, 0) / places.length;
  const off = (p) => (p.lat - lat) ** 2 + (p.lng - lng) ** 2;
  return places.reduce((best, p) => (off(p) < off(best) ? p : best));
}

// The place a town's drive times are measured from: its pinned hub
// (scripts/lib/areaCentres.js) while the town has that place (areasOf leaves out closed
// places and ones with no position), else the place nearest the middle, as for a town
// added since the pins were picked.
function hubOf(places, pinnedId) {
  const pinned = places.find((p) => p.id === pinnedId);
  return pinned ? { place: pinned, pinned: true } : { place: centreOf(places), pinned: false };
}

function pairKey(a, b) {
  return [a, b].sort().join("|");
}

function chunks(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// Each pair of areas once (the app uses one time both ways), except pairs already in
// `known`: adding an area costs only its own pairs. Pairs the service has no route for
// are left out and listed in `failed`. `asked` is how many pairs it asked for.
async function areaDriveTimes(centres, fetchMatrix, known = {}) {
  const ids = Object.keys(centres);
  const minutes = {};
  const failed = [];
  let asked = 0;
  for (let i = 0; i < ids.length - 1; i++) {
    const todo = ids.slice(i + 1).filter((id) => !(pairKey(ids[i], id) in known));
    for (const batch of chunks(todo, MAX_SIDE)) {
      asked += batch.length;
      const [row] = await fetchMatrix([centres[ids[i]]], batch.map((id) => centres[id]));
      batch.forEach((id, j) => {
        const key = pairKey(ids[i], id);
        if (row[j] == null) failed.push(key);
        else minutes[key] = row[j];
      });
    }
  }
  return { minutes, failed, asked };
}

// A place is in an area's table once it has been asked for (as a key, even with no
// routes found), so the next run knows not to ask again.
function splitByKnown(places, known) {
  const fresh = places.filter((p) => !(p.id in known));
  const old = places.filter((p) => p.id in known);
  return { fresh, old };
}

// How many times areaTransit would ask for: each new place to every place, and every
// place already known to each new one.
function transitLookups(places, known) {
  const { fresh, old } = splitByKnown(places, known);
  return fresh.length * places.length + old.length * fresh.length;
}

// Every place in one area to every other, both ways (one-way streets and hills make them
// differ), in half-hour slots, at least one, kept with what `known` already has. Only
// times involving a place not yet in `known` are asked for: a place added to a town
// costs only its own times. Places the service can't route between are left out; the
// app estimates those.
async function areaTransit(places, fetchMatrix, known = {}) {
  const table = JSON.parse(JSON.stringify(known));
  const { fresh, old } = splitByKnown(places, known);
  for (const p of fresh) table[p.id] = table[p.id] || {};
  const side = Math.floor(Math.sqrt(MAX_ELEMENTS));
  const fill = async (origins, destinations) => {
    for (const from of chunks(origins, side)) {
      for (const to of chunks(destinations, side)) {
        const grid = await fetchMatrix(from, to);
        from.forEach((a, i) =>
          to.forEach((b, j) => {
            if (a.id === b.id || grid[i][j] == null) return;
            table[a.id][b.id] = Math.max(1, Math.ceil(grid[i][j] / SLOT_MINUTES));
          }),
        );
      }
    }
  };
  await fill(fresh, places);
  await fill(old, fresh);
  return table;
}

// The places hub-to-hub times don't fit: more than half an hour from the hub either way
// in the town's own table (2 slots or more), or every place but the hub in a town with no
// centre (the Catlins: a route, not a town). Places the table doesn't have yet are listed
// apart: run `towns` for them first.
function farPlaces(places, hubId, table, noCentre = false) {
  const far = [];
  const missing = [];
  for (const p of places) {
    if (p.id === hubId) continue;
    if (!(p.id in table)) missing.push(p.id);
    else if (noCentre || Math.max(table[p.id][hubId] ?? 0, table[hubId]?.[p.id] ?? 0) >= 2) far.push(p);
  }
  return { far, missing };
}

// The towns a far-out place gets its own time to: every other town within
// FAR_REACH_MINUTES of its own, by the town-to-town times.
function nearTowns(town, towns, areaMinutes) {
  return towns.filter((t) => t !== town && areaMinutes[pairKey(town, t)] <= FAR_REACH_MINUTES);
}

// `wanted` is [{ place, towns }]: the towns each far-out place should have a time to.
const farTodo = (wanted, known) =>
  wanted.map(({ place, towns }) => ({ place, towns: towns.filter((t) => !(t in (known[place.id] || {}))) }));

function farLookups(wanted, known = {}) {
  return farTodo(wanted, known).reduce((n, w) => n + w.towns.length, 0);
}

// Each far-out place's own time, in minutes, to the hub of each of its towns, one way (the
// app uses it both ways, as it does town to town), kept with what `known` has. Only what
// a place lacks is asked for. The result holds every place in `wanted`, even with no times
// (the app still needs to know it is far-out), and only those: a place no longer far-out
// drops out. Times the service has no route for are left out and listed in `failed`.
async function farPlaceTimes(wanted, hubs, fetchMatrix, known = {}) {
  const minutes = {};
  const failed = [];
  for (const { place, towns } of farTodo(wanted, known)) {
    minutes[place.id] = { ...known[place.id] };
    for (const batch of chunks(towns, MAX_SIDE)) {
      const [row] = await fetchMatrix([place], batch.map((t) => hubs[t]));
      batch.forEach((t, j) => {
        if (row[j] == null) failed.push(`${place.id} → ${t}`);
        else minutes[place.id][t] = row[j];
      });
    }
  }
  return { minutes, failed };
}

// Google Distance Matrix's JSON answer, as minutes.
function parseDistanceMatrix(body) {
  if (body.status !== "OK") throw new Error(`Distance Matrix ${body.status}: ${body.error_message || "no detail"}`);
  return body.rows.map((row) =>
    row.elements.map((el) => (el.status === "OK" ? Math.round(el.duration.value / 60) : null)),
  );
}

function googleFetchMatrix(apiKey, fetchImpl = fetch) {
  const points = (list) => list.map((p) => `${p.lat},${p.lng}`).join("|");
  return async (origins, destinations) => {
    const url =
      "https://maps.googleapis.com/maps/api/distancematrix/json" +
      `?origins=${encodeURIComponent(points(origins))}` +
      `&destinations=${encodeURIComponent(points(destinations))}` +
      `&mode=driving&key=${encodeURIComponent(apiKey)}`;
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`Distance Matrix HTTP ${res.status}`);
    return parseDistanceMatrix(await res.json());
  };
}

function costUSD(elements) {
  return Math.round(elements * USD_PER_ELEMENT * 100) / 100;
}

// The app's list of area tables (assets/data/transit/index.ts). Metro needs a static
// require for each file, so the list is written out rather than read at run time.
function transitIndex(areaIds) {
  const lines = [...areaIds].sort().map((id) => `  "${id}": require("./${id}.json"),`);
  return [
    "// Written by scripts/generate-drive-times.js (towns). Don't edit by hand: run it again.",
    "// One table per area of travel times between that area's own places, in half-hour",
    "// slots, read by lib/utils/transitMatrix.ts.",
    "type Transit = Record<string, Record<string, Record<string, number>>>;",
    "",
    lines.length ? `export const TRANSIT: Transit = {\n${lines.join("\n")}\n};` : "export const TRANSIT: Transit = {};",
    "",
  ].join("\n");
}

module.exports = {
  MAX_ELEMENTS,
  areasOf,
  centreOf,
  hubOf,
  pairKey,
  areaDriveTimes,
  areaTransit,
  transitLookups,
  farPlaces,
  nearTowns,
  farLookups,
  farPlaceTimes,
  parseDistanceMatrix,
  googleFetchMatrix,
  costUSD,
  transitIndex,
};
