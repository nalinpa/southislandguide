/**
 * Upload a places JSON file into the app's Firestore `locations` collection.
 *
 *   node scripts/upload-places.js [file]            # dry run (default) — writes nothing
 *   node scripts/upload-places.js [file] --apply    # write
 *
 * [file] defaults to assets/data/christchurch_places_all.json.
 *
 * Credentials: GOOGLE_APPLICATION_CREDENTIALS must point at the southislandguide
 * service-account key. It lives in enginev1/api/scripts/ — deliberately not
 * copied into this repo:
 *
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\User\source\enginev1\api\scripts\southislandguide-firebase-adminsdk-fbsvc-a2c89b2fb0.json"
 *
 * Idempotent: each doc's id is its slug, so re-running overwrites the same docs
 * instead of duplicating them. A slug change therefore creates a NEW doc and
 * leaves the old one behind — delete it by hand if you rename.
 */
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const EXPECTED_PROJECT = "southislandguide";
const COLLECTION = "locations"; // registry collections.locations
const PRICES = new Set(["Free", "Cheap", "Moderate", "Expensive"]);

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const file = path.resolve(args.find((a) => !a.startsWith("--")) ?? path.join(__dirname, "../assets/data/christchurch_places_all.json"));

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS is not set — see the header of this file.");
  process.exit(1);
}
const key = require(path.resolve(keyPath));
// Guard against writing another app's locations with the wrong key in scope.
if (key.project_id !== EXPECTED_PROJECT) {
  console.error(`Refusing: key is for "${key.project_id}", expected "${EXPECTED_PROJECT}".`);
  process.exit(1);
}

const places = JSON.parse(fs.readFileSync(file, "utf8"));
if (!Array.isArray(places)) {
  console.error("Expected a JSON array of places.");
  process.exit(1);
}

// Refuse bad data rather than writing half of it.
const problems = [];
const seen = new Set();
places.forEach((p, i) => {
  const at = `#${i} ${p.name ?? "(no name)"}`;
  if (!p.name) problems.push(`${at}: missing name`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug ?? "")) problems.push(`${at}: bad slug "${p.slug}"`);
  if (seen.has(p.slug)) problems.push(`${at}: duplicate slug "${p.slug}"`);
  seen.add(p.slug);
  if (typeof p.lat !== "number" || typeof p.lng !== "number") problems.push(`${at}: lat/lng must be numbers`);
  if (!Array.isArray(p.category) || p.category.length === 0) problems.push(`${at}: category must be a non-empty array`);
  if (p.price != null && !PRICES.has(p.price)) problems.push(`${at}: unknown price "${p.price}"`);
  if (typeof p.description !== "string" || !p.description.trim()) problems.push(`${at}: missing description`);
});
if (problems.length) {
  console.error(`Refusing to write — ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}

// `premium`/`isPremium` is deliberately NOT written. enginev1/api's locations
// route strips isPremium docs to teasers for any caller without an unlock, and
// that check is not gated on the app having commerce configured — so for an
// app with no product, isPremium blanks every description (or 503s the whole
// list). Set it deliberately, per place, once commerce exists.
const toDoc = ({ premium, isPremium, ...rest }) => ({ ...rest, id: rest.slug });

initializeApp({ credential: cert(key) });
const db = getFirestore();

(async () => {
  const col = db.collection(COLLECTION);
  const existing = new Set((await col.get()).docs.map((d) => d.id));
  const docs = places.map(toDoc);
  const updates = docs.filter((d) => existing.has(d.id)).length;

  console.log(`${apply ? "APPLY" : "DRY RUN"} → ${EXPECTED_PROJECT}/${COLLECTION}`);
  console.log(`  source:   ${path.relative(process.cwd(), file)} (${docs.length} places)`);
  console.log(`  new:      ${docs.length - updates}`);
  console.log(`  replace:  ${updates}`);
  const untouched = [...existing].filter((id) => !docs.some((d) => d.id === id));
  if (untouched.length) console.log(`  left as-is (not in this file): ${untouched.join(", ")}`);

  if (!apply) {
    console.log("\nNothing written. Re-run with --apply.");
    return;
  }

  const batch = db.batch(); // one atomic commit; Firestore allows up to 500 writes
  for (const d of docs) batch.set(col.doc(d.id), d);
  await batch.commit();
  console.log(`\nWrote ${docs.length} docs.`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
