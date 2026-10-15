/**
 * Copy `region` and `area` from the places JSON files onto the matching Firestore docs.
 *
 *   node scripts/set-area.js            # dry run (default) — writes nothing
 *   node scripts/set-area.js --apply    # write
 *
 * Unlike upload-places.js this only touches those two fields, so it is safe to run
 * over places that have since been edited in the admin panel (photos, shorter
 * names). A place with no `area` in the JSON is left alone. Credentials: as
 * upload-places.js.
 */
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const FILES = ["christchurch_places_all.json", "timaru_places.json", "dunedin_places.json", "akaroa_banks_peninsula_places.json"];
// Docs entered by hand in the admin panel, so not in any file.
const EXTRA = { DXWpQTSPRQQKPt7SIcVi: { region: "canterbury", area: "christchurch" } }; // Riverside Markets

const apply = process.argv.includes("--apply");
const key = require(path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS));
if (key.project_id !== "southislandguide") throw new Error(`Refusing: key is for "${key.project_id}".`);

const want = { ...EXTRA };
for (const f of FILES) {
  for (const p of JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/data", f), "utf8"))) {
    want[p.slug] = { region: p.region, ...(p.area ? { area: p.area } : {}) };
  }
}

initializeApp({ credential: cert(key) });
const col = getFirestore().collection("locations");

(async () => {
  const docs = new Map((await col.get()).docs.map((d) => [d.id, d.data()]));
  const batch = getFirestore().batch();
  const changes = [];
  for (const [id, fields] of Object.entries(want)) {
    const cur = docs.get(id);
    if (!cur) { console.log(`  no such doc, skipped: ${id}`); continue; }
    const diff = Object.fromEntries(Object.entries(fields).filter(([k, v]) => cur[k] !== v));
    if (Object.keys(diff).length) { changes.push([id, diff]); batch.update(col.doc(id), diff); }
  }
  const tally = {};
  for (const [, d] of changes) for (const [k, v] of Object.entries(d)) tally[`${k}=${v}`] = (tally[`${k}=${v}`] || 0) + 1;
  console.log(`${apply ? "APPLY" : "DRY RUN"}: ${changes.length} docs to change`, tally);
  console.log(`  in Firestore but not in any file: ${[...docs.keys()].filter((id) => !want[id]).join(", ") || "none"}`);
  if (apply) { await batch.commit(); console.log("Written."); }
})().catch((e) => { console.error(e); process.exit(1); });
