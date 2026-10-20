# Fix: Deleting an account deletes the user's data

Finding #25 from the 2026-10-20 UX sweep. **Launch blocker** (App Store guideline 5.1.1(v): deleting an account must delete its data).

Two parts in two repos. **Part 1 is the shared api; stop after its tests pass. Do not deploy.** The owner deploys on their go. Part 2 is the app's wording; run it after the UX sweep prompts (fix-24 renames text, fix-26 edits `UserInfoCard.tsx`).

## Problem

`DELETE /v1/:appId/account` (`enginev1/api/src/routes/account.ts`) releases App Store purchases (commerce apps only), revokes the stored Apple token, and deletes the Firebase Auth user. It deletes no data. After an account is deleted, its trips, saved places and user doc stay in Firestore, and its reviews stay public. Meanwhile South Island's Profile screen promises "Permanently remove your visit history and reviews", which isn't true, and this app has no "visit history" anyway.

## Who calls this route (checked 2026-10-20)

- **south-island** and **rotorua-guide**: `lib/services/userService.ts` → `client.auth.deleteAccount()` (`enginev1/client/src/auth.ts:7`).
- **cones, eats and aklguide** delete their data in the client (`aklguide/mobile/lib/services/userService.ts:50-92` is the pattern) and never call this route. They're unaffected.

So Rotorua gets this fix too. That's intended: its delete copy makes the same promise. Rotorua's own wording is a separate change in its repo, not part of this prompt.

## Where a user's data lives

The route must read every collection name from `cfg`, never hard-code one: the same code serves every app.

| Data | Where | Owner field | Written by |
|---|---|---|---|
| Trips | `cfg.collections.itineraries ?? "itineraries"`, only when `cfg.features.itinerary.enabled` | `userId` | `routes/itineraries.ts` |
| Reviews | `cfg.collections.reviews ?? "coneReviews"` (the same default as `routes/reviews.ts:29`) | `userId` | `routes/reviews.ts` POST |
| A review's rating | `ratingSum` / `ratingCount` on the reviewed place, `${cfg.collections.locations}/${review[locIdField]}` | — | `routes/reviews.ts:111-139` |
| Check-ins | `cfg.features.completion.collection`, only when completion is enabled | `userId` | `routes/completion.ts` |
| Blocks the user made | `blocks` | `blockedByUid` | `routes/moderation.ts:73-80` |
| Profile, saved places, trip ids | `users/{uid}` (South Island's saved places are its `savedSites` array, `lib/hooks/useSavedSites.ts:20`) | doc id | client + `routes/itineraries.ts` |
| Apple token | `appleGrants/{uid}` | doc id | `routes/auth.ts` |

**Kept on purpose:** `reports` the user filed (`reportedByUid`). Those are moderation records about someone else's review, and once the account is gone the uid points to nobody. Neither app uses `users/{uid}` subcollections (checked), so deleting the doc is enough.

## Part 1: the api (`C:\Users\User\source\enginev1\api`)

### 1. `src/lib/firestore-admin.ts`: allow an `increment` transform

`FieldTransform` (lines 8–12) gets one more optional member:

```ts
export type FieldTransform = {
  fieldPath: string;
  appendMissingElements?: { values: any[] };
  removeAllFromArray?: { values: any[] };
  increment?: { integerValue: string };
};
```

### 2. `src/routes/account.ts`: delete the data before anything is revoked or deleted

Add a helper above the route:

```ts
import { getFirestoreAdmin, type FirestoreAdminClient, type FirestoreWrite } from "../lib/firestore-admin";
import type { AppConfig } from "../types";

// Everything the user made in this app, removed in one atomic commit (App Store guideline
// 5.1.1(v)): trips, reviews (with their ratings taken back off their places), check-ins,
// blocks they made, and users/{uid}, which holds saved places. Reports they filed are kept:
// they're moderation records about someone else's review.
// ponytail: one commit, which Firestore caps at 500 writes; chunk it if a user can ever own that many docs.
async function deleteUserData(admin: FirestoreAdminClient, cfg: AppConfig, uid: string): Promise<void> {
  const mine = (collection: string, field = "userId") => admin.query(collection, { field, value: uid });
  const del = (path: string): FirestoreWrite => ({ delete: admin.docName(path) });

  const reviewsCol = cfg.collections.reviews ?? "coneReviews";
  const tripsCol = cfg.collections.itineraries ?? "itineraries";
  const completion = cfg.features.completion;
  const locIdField = completion.enabled ? completion.fields.locationId : "locationId";

  const [reviews, trips, checkins, blocks] = await Promise.all([
    mine(reviewsCol),
    cfg.features.itinerary.enabled ? mine(tripsCol) : Promise.resolve([]),
    completion.enabled ? mine(completion.collection) : Promise.resolve([]),
    mine("blocks", "blockedByUid"),
  ]);

  const writes: FirestoreWrite[] = [
    ...trips.map((d) => del(`${tripsCol}/${d.id}`)),
    ...(completion.enabled ? checkins.map((d) => del(`${completion.collection}/${d.id}`)) : []),
    ...blocks.map((d) => del(`blocks/${d.id}`)),
    del(`users/${uid}`),
  ];

  // Posting a review added its rating to the place's totals (routes/reviews.ts); take it back off.
  // A place that no longer exists is skipped: a transform on a missing doc would re-create it.
  for (const r of reviews) {
    writes.push(del(`${reviewsCol}/${r.id}`));
    const placePath = `${cfg.collections.locations}/${r[locIdField]}`;
    if (typeof r.rating !== "number" || !(await admin.getDoc(placePath))) continue;
    writes.push({
      update: { name: admin.docName(placePath), fields: {} },
      updateMask: { fieldPaths: [] },
      updateTransforms: [
        { fieldPath: "ratingSum", increment: { integerValue: String(-r.rating) } },
        { fieldPath: "ratingCount", increment: { integerValue: "-1" } },
      ],
      currentDocument: { exists: true },
    });
  }

  await admin.commit(writes);
}
```

In the route, after the commerce block (ends line 36), move `const admin = …` (line 38) up and call the helper before the Apple grant is read:

```ts
  const admin = getFirestoreAdmin(c.env, cfg.firebaseProject);
  // Before Apple and Auth: if this throws (500 via app.onError), nothing has been revoked or
  // deleted, and the user can simply try again. Deleting a doc that's already gone is a no-op,
  // so a retry after a later failure is safe too.
  await deleteUserData(admin, cfg, user.uid);

  const grantDoc = await admin.getDoc(`appleGrants/${user.uid}`);
```

In the Apple block, replace the write that sets `refreshToken` to null (lines 52–63) with a delete of the grant doc. The comment's reasoning stays:

```ts
    // Delete the stored grant whenever one is present, regardless of whether revoke was
    // attempted — the account is about to be deleted, so this is the only chance to avoid an
    // orphaned token.
    await admin.commit([{ delete: admin.docName(`appleGrants/${user.uid}`) }]);
```

Update the route's header comment (lines 10–17) to add the data step between the commerce release and the Apple revoke.

The order is now: commerce release → delete data → revoke Apple → delete the Auth user. Purchases are still released first, and still keep the account if commerce fails.

### 3. `test/helpers.ts`: let a mocked route match on the request body

Every `:runQuery` call goes to the same URL, so the mock can't answer each collection differently. Add an optional predicate to `FetchRoute` (lines 137–142):

```ts
  when?: (body: any) => boolean; // optional: only match when the request body passes (every runQuery shares one URL)
```

and to the route lookup in `mockFetch` (lines 167–169), on the test routes:

```ts
      routes.find((r) => url.includes(r.match) && (!r.method || r.method === method) && (!r.when || r.when(body))) ??
```

### 4. `test/account.test.ts`

The `deleteAccount()` helper (lines 32–77):

- New options:
  - `queries?: Record<string, any[]>`: collection id → the docs it returns, each built with `fsDoc`
  - `places?: Record<string, any>`: place id → doc, answered for `GET /documents/cones/<id>`; every other place returns 404
  - `itinerary?: boolean`: turns on `features.itinerary` in the cones config
  - `commitStatus?: number`
- **Add a `:runQuery` route that answers every query, or every existing test now fails** (the unmatched query gets the mock's 404). Answer by collection:

  ```ts
  { match: ":runQuery", method: "POST", json: [] } // the catch-all: list it after the per-collection routes below
  ```

  with per-collection routes placed before it:

  ```ts
  ...Object.entries(opts.queries ?? {}).map(([collectionId, docs]) => ({
    match: ":runQuery", method: "POST",
    when: (b: any) => b?.structuredQuery?.from?.[0]?.collectionId === collectionId,
    json: docs.map((document) => ({ document })),
  })),
  ```

- The `:commit` route takes `status: opts.commitStatus ?? 200`.

The cones config has completion on (`coneCompletions`, place field `coneId`), itineraries off, no `collections.reviews` (so reviews are `coneReviews`), and places in `cones`.

**Existing tests to update:**

- The two Apple tests that inspect `writes[0]` of the first commit (lines 97–116 and 127–142) now see the data commit first. Find the commit that touches `appleGrants/test-user` instead, and assert it is `{ delete: …appleGrants/test-user }`, not the `refreshToken: null` update.
- "commerce release fails" (164–170): also assert there's no `:commit` call, so no data is deleted when the account is kept.

**New tests:**

1. **Deletes the user's data in one commit, before the Auth user.** Use `itinerary: true`, with one doc in each of `coneReviews` (`{ coneId: "c1", userId: "test-user", rating: 4 }`), `itineraries`, `coneCompletions` and `blocks`, and place `c1` present. The first commit deletes each of those docs and `users/test-user`. It also has a `cones/c1` write with `ratingSum` incremented by `-4`, `ratingCount` by `-1`, and `currentDocument: { exists: true }`. That commit comes before `accounts:delete`.
2. **Itineraries off: trips are never queried.** No `:runQuery` call has `collectionId` `itineraries`.
3. **A review whose place is gone** (no `places` entry): the review is deleted, and no write targets `cones/c1`.
4. **The data commit fails** (`commitStatus: 500`): returns 500, no `auth/revoke` call (use a stored Apple token), no `accounts:delete` call.
5. **Nothing to delete** (no queries return docs): still one commit holding just the `users/test-user` delete, then `accounts:delete`.

### Validation (Part 1)

From `C:\Users\User\source\enginev1\api`:

- `npx tsc --noEmit`: no type errors.
- `npm test`: all pass, old and new.
- **Do not run `npm run deploy` / `wrangler deploy`.** Stop here and report. The owner deploys on their go.

### After the owner deploys (owner, on a phone)

With `npx wrangler tail` running in `enginev1/api`:

1. In South Island, sign in with a throwaway email account. Make a trip, save a place, and post a review on a place, noting its rating count first.
2. Profile → Delete Account. The tail shows `DELETE /v1/southislandguide/account - Ok`.
3. The place's review is gone and its count is back where it was.
4. Sign up again with the same email: no trips, no saved places.
5. Rotorua uses the same route: one delete there too (throwaway account, one trip, one review), to confirm the commerce release still comes first and the data goes.

## Part 2: the app's wording (south-island, after the UX sweep)

Line numbers are from 2026-10-20 and may have moved after the sweep prompts; find the strings.

`components/account/DangerZoneCard.tsx`:

- The description (line 57): `Permanently remove your visit history and reviews. This cannot be undone.` → `Permanently delete your account, trips, saved places and reviews. This cannot be undone.`
- The confirm body (line 82): `All progress and reviews will be permanently erased.` → `Your trips, saved places and reviews will be permanently deleted.`
- The error (line 36): `Error deleting data. Please try again.` → `Couldn't delete your account. Please try again.`
- The comment (lines 12–14): say the api also deletes the user's trips, saved places and reviews, not only revokes Apple.

`components/account/UserInfoCard.tsx`, the guest line (line 64): `You're browsing as a guest. Sign in to save your progress.` → `You're browsing as a guest. Sign in to save places and plan trips.`

No test asserts any of these strings (checked), so there's nothing to update and nothing new to test.

### Validation (Part 2)

- `npx tsc --noEmit`: no type errors.
- `npm test`: all pass.
- Touch only those two files.

## Out of scope

- Rotorua's delete wording (rotorua-guide repo).
- Reports the user filed (kept, see above), and reports about the user's reviews (moderation history; the review itself is gone).
- Commerce entitlements: the existing release step handles those.
