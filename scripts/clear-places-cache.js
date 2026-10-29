/**
 * Drop the api's copy of the place list (enginev1/api src/lib/cache.ts), so the next
 * list request re-reads Firestore. The api keeps that copy for 14 days and only the
 * writes it makes itself update it: anything written straight to Firestore (these
 * scripts, the Firebase console) stays hidden from the app until the copy is dropped.
 *
 *   node scripts/clear-places-cache.js    # after an edit in the Firebase console
 *
 * upload-places.js and set-area.js call it after --apply. It runs, from enginev1/api:
 *
 *   npx wrangler kv key delete --binding APP_CONFIG --remote "locations:southislandguide"
 *
 * Needs wrangler logged in on this machine (npx wrangler login).
 */
const { execSync } = require("child_process");
const path = require("path");

const ENGINE_API = path.resolve(__dirname, "../../enginev1/api");
const COMMAND = 'npx wrangler kv key delete --binding APP_CONFIG --remote "locations:southislandguide"';

// Never throws: by the time a script calls this, its Firestore write has gone through.
function clearPlacesCache() {
  try {
    execSync(COMMAND, { cwd: ENGINE_API, stdio: "inherit" });
    console.log("Cleared the api's copy of the place list.");
  } catch {
    console.error(`\nThe api's copy of the place list was NOT cleared, so the app won't show this write for up to 14 days. From ${ENGINE_API} run:\n  ${COMMAND}`);
    process.exitCode = 1;
  }
}

if (require.main === module) clearPlacesCache();
module.exports = { clearPlacesCache };
