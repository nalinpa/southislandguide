# Finish the place-list cache and the once-a-day app refresh

The South Island Guide app (this repo) reads its places through the shared engine API (`C:\Users\User\source\enginev1\api`, a Cloudflare Worker at https://api.blacksands.app). Every call to `GET /v1/southislandguide/locations` reads all 559 place docs from Firestore. The southislandguide Firebase project is on the free plan: 50,000 reads a day, reset at midnight US Pacific (8pm NZDT until 1 Nov, then 9pm). On 2026-10-27 the limit ran out, and the app and the admin panel were down until the reset. Two fixes were agreed: the API keeps a copy of the list for 14 days, and the app downloads the list at most once a day.

## What already exists (written 2026-10-27, not yet working)
- `enginev1/api/src/lib/cache.ts`: `getLocations` keeps a copy in the `APP_CONFIG` KV namespace (id `8ed749a4efbe47548969ecf7a2e4c78a`) under `locations:<appId>`. It is opt-in per app through the registry field `locationsCacheDays`; when that is absent the behaviour is unchanged. Also `editCachedLocations` (admin create, edit and delete, plus review ratings, patch the copy) and `clearCachedLocations`.
- `enginev1/api/src/routes/admin.ts`: `DELETE /v1/:appId/admin/locations-cache` (needs an admin token) drops the copy.
- `enginev1/api/src/routes/locations.ts`: the list route uses `getLocations`. The single-place route still reads Firestore directly, which is deliberate: the admin edit form loads from it.

There is evidence it isn't live for South Island Guide yet. On 2026-10-29 a list fetch in the morning would have filled the copy, yet a fetch after a direct Firestore upload that afternoon returned the new text for all 558 places. So either the Worker isn't deployed with this code, or `locationsCacheDays` isn't set on the `apps/southislandguide` registry doc (the default Firebase project, `FIREBASE_PROJECT_ID`).

## What's left
1. **Find out the state.** Is the deployed Worker running this code (`npx wrangler deployments list` in `enginev1/api`), and is `locationsCacheDays` set for southislandguide? Report before changing anything.
2. **Clear the copy after uploads that skip the API.** `scripts/upload-places.js` (this repo) writes straight to Firestore, so once the copy is on, an upload stays hidden for up to 14 days. After a successful `--apply`, the script must drop `locations:southislandguide`. Pick the simplest way that needs no manual step: call the admin clear route (see `enginev1/api/get-token.mjs` for how an admin token is made), or run `npx wrangler kv key delete ... --remote` from `enginev1/api`. Also put the manual command in the script's header for edits made in the Firebase console.
3. **Make the app download the list at most once a day.** In `lib/providers/AppProviders.tsx`, add `queryClient.setQueryDefaults(["southislandguide", "locations"], { staleTime: 24h })` (the prefix comes from `lib/hooksBag.ts`). Leave the one-minute default for trips and reviews, and don't change the shared engine hook. Add or extend a test. This reaches phones only with a new app build.
4. **Switch it on:** set `locationsCacheDays: 14` on the `apps/southislandguide` registry doc. Only South Island Guide; the other apps stay off.
5. **Deploy** the Worker (`npm run deploy` in `enginev1/api`) after its tests pass (`npm test` there; this repo's `npm test` must pass too).
6. **Check it end to end** on a read budget:
   - One list fetch fills the copy.
   - A second fetch costs no Firestore reads.
   - An admin edit appears in the list straight away.
   - An upload followed by the clear shows the new data.

## Rules
- Show me the plan after step 1 and wait for my "build" before changing code.
- Deploying (step 5) and the registry write (step 4) happen only when I say so.
- Budget Firestore reads: each full read or list call costs 559. Never loop full reads, and reuse a saved copy of the live list.
- Never print the service-account keys.
- `enginev1` is not a git repo; this repo is. Commit this repo's changes only when I say so.
- KV allows one write a second per key, and the free Workers plan allows 1,000 KV writes a day. Mention it if either matters for your choice.
