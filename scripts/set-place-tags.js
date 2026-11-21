/**
 * Set the trip builder's `vibe` and `activities` on place docs in Firestore `locations`.
 *
 *   node scripts/set-place-tags.js [file]            # dry run (default) - writes nothing
 *   node scripts/set-place-tags.js [file] --apply    # write
 *
 * [file] defaults to docs/plans/trip-builder-tags.json: { "<slug>": { vibe: [], activities: [] } }.
 * Only those two fields are written (update), so nothing else on a place changes, and a slug with
 * no doc fails rather than making one. Both runs fetch the live list once (the api's KV cache, no
 * Firestore reads) and list any slug not in it; --apply refuses while there are any.
 *
 * Credentials: GOOGLE_APPLICATION_CREDENTIALS, as in upload-places.js. The dry run needs none.
 * After --apply it drops the api's copy of the place list and prints how many places in
 * the live list have `vibe`.
 */
const fs = require("fs");
const path = require("path");

const EXPECTED_PROJECT = "southislandguide";
const COLLECTION = "locations";
const LIVE_LIST = "https://api.blacksands.app/v1/southislandguide/locations";
const OPTIONS = {
  vibe: ["relax", "sightseeing", "nature", "adventure"],
  activities: ["surfing", "skiing", "hot-pools", "mountain-biking", "kayaking", "wildlife", "stargazing", "wine"],
};

function buildUpdates(tags, options) {
  return Object.entries(tags).map(([slug, t]) => {
    const { vibe, activities } = t;
    if (!Array.isArray(vibe) || vibe.length === 0) throw new Error(`${slug}: vibe must be a non-empty array`);
    for (const v of vibe) if (!options.vibe.includes(v)) throw new Error(`${slug}: unknown vibe "${v}"`);
    if (!Array.isArray(activities)) throw new Error(`${slug}: activities must be an array`);
    for (const a of activities) if (!options.activities.includes(a)) throw new Error(`${slug}: unknown activity "${a}"`);
    return { slug, data: { vibe, activities } };
  });
}

// The slugs with no doc in the live list (by doc id: update() writes to the doc with that id).
function missingSlugs(updates, live) {
  const ids = new Set(live.map((p) => p.id));
  return updates.map((u) => u.slug).filter((slug) => !ids.has(slug));
}

async function liveList() {
  const res = await fetch(LIVE_LIST);
  if (!res.ok) throw new Error(`live list: HTTP ${res.status}`);
  return (await res.json()).data.locations;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const file = path.resolve(args.find((a) => !a.startsWith("--")) ?? path.join(__dirname, "../docs/plans/trip-builder-tags.json"));
  const updates = buildUpdates(JSON.parse(fs.readFileSync(file, "utf8")), OPTIONS);

  console.log(`${apply ? "APPLY" : "DRY RUN"} -> ${EXPECTED_PROJECT}/${COLLECTION}`);
  console.log(`  source:  ${path.relative(process.cwd(), file)} (${updates.length} places)`);
  const missing = missingSlugs(updates, await liveList());
  console.log(missing.length ? `  not in the live list (${missing.length}): ${missing.join(", ")}` : "  every slug is in the live list");
  if (apply && missing.length) throw new Error("Refusing --apply: fix or drop the slugs not in the live list first.");
  if (!apply) {
    for (const i of [0, Math.floor(updates.length / 2), updates.length - 1]) {
      if (updates[i]) console.log(`  e.g. ${updates[i].slug}: ${JSON.stringify(updates[i].data)}`);
    }
    console.log("\nNothing written. Re-run with --apply.");
    return;
  }

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set - see the header of upload-places.js.");
  const key = require(path.resolve(keyPath));
  if (key.project_id !== EXPECTED_PROJECT) throw new Error(`Refusing: key is for "${key.project_id}", expected "${EXPECTED_PROJECT}".`);
  const { initializeApp, cert } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");
  const { clearPlacesCache } = require("./clear-places-cache");
  initializeApp({ credential: cert(key) });
  const db = getFirestore();
  const col = db.collection(COLLECTION);

  for (let i = 0; i < updates.length; i += 500) {
    const batch = db.batch();
    for (const u of updates.slice(i, i + 500)) batch.update(col.doc(u.slug), u.data);
    await batch.commit();
  }
  console.log(`Wrote ${updates.length} docs.`);
  clearPlacesCache();

  const live = await liveList();
  console.log(`Live list: ${live.filter((p) => p.vibe !== undefined).length} of ${live.length} places have vibe.`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
module.exports = { buildUpdates, missingSlugs, OPTIONS };
