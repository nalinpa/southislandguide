# Fix: deleting an account also clears it from the phone

Finding 5 from the 2026-10-23 code review, plus the stale comment from finding 6. Run it after fix-33, whose queued trip writes this clears.

## Problem

### 1. The deleted user's data stays on the phone

`userService.deleteAccount()` (`lib/services/userService.ts:12-17`) has the api delete the account and its data, then signs out. It leaves the query cache alone. That cache is saved to AsyncStorage for 14 days (`AppProviders.tsx:16`). So after a delete, the user's trips (`["southislandguide", "itineraries", uid]`), saved places (`["savedSites", uid]`) and their review queries stay on the phone for two weeks. That's the data the delete screen says is "permanently deleted". In the cache nobody else sees it, because every key holds the uid. But it's still there. Once fix-33 is in, the cache can also hold trip writes waiting for signal, and they would be sent for an account that no longer exists.

Unsent review drafts are another matter. They're kept apart from the cache, under `southislandguide-review-drafts` (the shared hooks' drafts store), by place id, not by user. The place screen reads them back (`sites/[siteId]/index.tsx:91`). So the next account to sign in on the phone finds the deleted user's unsent rating and text in that place's review box.

### 2. A failed sign-out is reported as a failed delete

If `auth.signOut()` rejects after the api has deleted the account, `deleteAccount` rejects. `DangerZoneCard` (`components/account/DangerZoneCard.tsx:29-36`) then shows "Couldn't delete your account. Please try again." But the account is already gone, and trying again fails because it no longer exists.

### 3. A comment says the opposite of the code (finding 6)

`lib/auth/appleSignIn.ts:43-48` says:
- the Apple link "currently always fails for this app" because the api has no service account for `southislandguide`;
- account deletion "is still client-side";
- `userService` should be switched to `client.auth.deleteAccount()`.

None of that is true any more:
- `enginev1/api/src/lib/firestore-admin.ts:56` has the `southislandguide` case;
- `userService` calls `client.auth.deleteAccount()`;
- the api deletes the data and revokes the token (fix-25).

What's actually left is in TASKS.md, "Apple revocation": none of this can be tested until Apple fixes Sign in with Apple for this App ID.

## What to do

### 1. `lib/services/userService.ts`

```ts
import { client } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { hooksBag } from "@/lib/hooksBag";
import { queryClient } from "@/lib/providers/AppProviders";
import * as Sentry from "@sentry/react-native";

export const userService = {
  // (existing comment, unchanged)
  async deleteAccount(): Promise<void> {
    const uid = auth.currentUser?.uid;
    await client.auth.deleteAccount();
    // The account is gone from here on, so nothing below may fail the delete.
    // Server-side delete doesn't touch the local SDK session, so sign out
    // explicitly or the user stays "authed" client-side until token refresh.
    // Before the clearing below: signed out, no screen refetches the deleted account's data.
    try {
      await auth.signOut();
    } catch (e) {
      Sentry.captureException(e);
    }
    // What the account left on the phone. Its trips, saved places and reviews were saved with
    // the cache (every key holds the uid), and trip writes may be waiting for signal: the saved
    // copy follows the cache. Unsent review drafts are kept by place, not by user, so the next
    // account to sign in here would find them.
    if (uid) queryClient.removeQueries({ predicate: (q) => q.queryKey.includes(uid) });
    queryClient.getMutationCache().clear();
    hooksBag.useDraftsStore.setState({ drafts: {} });
  },
};
```

Sign-out comes first for a reason. A query removed while its screen still has the uid is rebuilt and fetched again on that screen's next render. For a deleted account, that fetch fails and reaches Sentry (`useItineraries`' `queryFn`). Once signed out, every key holds a null uid, and none of those queries asks for the deleted account's data.

`removeQueries` and `clear` each send a "removed" event for every query and write they drop. `PersistQueryClientProvider` saves the cache again on that event, so the copy on the phone loses them too. The places list has no uid in its key, so it stays: it's the same for everyone.

Every user query from `@blacksands/hooks` has the uid as a top-level key element (`myCompletions`, `myReviews`, `review`, `blockedUsers`, `entitlements`), so `includes(uid)` catches them all. The drafts store is persisted by zustand, so `setState` writes the empty drafts to the phone too.

### 2. `lib/auth/appleSignIn.ts`

Replace the `ponytail:` paragraph (lines 43–48) with:

```ts
  // Deleting the account (lib/services/userService.ts, then the api) revokes this token.
  // Untested until Apple fixes Sign in with Apple for this App ID: see TASKS.md,
  // "Apple revocation", for the check to run then.
```

## Tests

`lib/services/__tests__/userService.test.ts`:

- Mocks:
  - `@/lib/providers/AppProviders`: a `queryClient` with `removeQueries: jest.fn()` and `getMutationCache: () => ({ clear: mockClearMutations })`.
  - `@/lib/hooksBag`: `{ hooksBag: { useDraftsStore: { setState: mockSetDrafts } } }`.
  - `@sentry/react-native`.
  - Give the `@/lib/firebase` mock `currentUser: { uid: "user-1" }`.
- The four existing tests must pass unchanged.
- New: **removes the user's cached queries, queued writes and review drafts after a delete.**
  - Call the `predicate` passed to `removeQueries`. It's true for `["southislandguide", "itineraries", "user-1"]` and `["savedSites", "user-1"]`, and false for `["southislandguide", "locations"]`.
  - `clear` was called.
  - `setState` was called with `{ drafts: {} }`.
  - `signOut` was called before `removeQueries`: compare their `mock.invocationCallOrder`.
- New: **clears nothing when the server delete fails.**
- New: **still resolves when sign-out fails after the account is gone.** `signOut` rejects, `deleteAccount()` resolves, and Sentry captured the error.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all pass.
- Device (owner), with a throwaway email account:
  1. Make a trip, and start a review on a place without sending it.
  2. Delete the account. The app goes to the sign-in screen with no error.
  3. Sign in with another account and open that place: the review box is empty.

  The cached trips can't be inspected from the app, because a new account gets a new uid either way. The tests cover them.

## Files touched

- `lib/services/userService.ts`, `lib/services/__tests__/userService.test.ts`
- `lib/auth/appleSignIn.ts` (comment only)

## Not in this fix

- A normal sign-out (`UserInfoCard.tsx:23`) still leaves that user's cache on the phone. That's by design for now: signing back in offline still shows their trips, and no other account can read it, because each key holds the uid.
