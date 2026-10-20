# Fix: Reviews ask guests to sign in, and say when a save fails

Finding #18 from the 2026-10-20 UX sweep.

## Files to change

1. `app/(app)/(tabs)/sites/[siteId]/index.tsx`
2. `test/uiKitMock.tsx`: let the mocked `ReviewModal` show its `error`
3. `app/(app)/(tabs)/sites/[siteId]/__tests__/siteDetail.test.tsx`

## Problem

On the place screen, a **guest** can tap Review (in the action bar, or "Add review" on the reviews card), pick stars, write a review and tap Save. The shared hook refuses it (`saveReview` returns `{ ok: false, err: "You must be logged in" }`, `node_modules/@blacksands/hooks/dist/index.js:676`). The screen then only plays an error haptic (lines 331–333). The modal stays open, nothing says why, and the review is never saved.

A signed-in user whose save fails (no connection, server error) gets the same silent haptic. The hook returns `{ ok: false, err }` with a message (`index.js:238`).

The kit's `ReviewModal` already shows an error: it takes `error?: string | null` (`node_modules/@blacksands/components/dist/index.d.ts:65`). The screen never passes one.

Saving a place already asks a guest to sign in (`handleToggleSave`, lines 129–138). Reviews should do the same.

## What to do

### 1. One sign-in prompt for both

Replace the comment block and `handleToggleSave` (lines 122–138) with:

```tsx
  // A guest has no account to save or review with, so they're asked to sign in — the
  // same prompt as reporting or blocking on the reviews screen. (useSavedSites and the
  // review hook also refuse the write itself.)
  const signedIn = (message: string) => {
    if (session.status === "authed") return true;
    Alert.alert("Sign In Required", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Sign In", onPress: () => router.push("/(auth)/login") },
    ]);
    return false;
  };

  const handleToggleSave = () => {
    if (!signedIn("Sign in to save places.")) return;
    toggleSavedSite({ siteId: id, isSaving: !isSaved });
  };
```

The GAP comment about a premium lock (old lines 122–125) is stale (v1 has no paid unlock), so it goes.

### 2. Open the review only for a signed-in user

Next to `reviewOpen` (line 70), add:

```tsx
  // Why the last save failed, shown in the review modal. Cleared on each open.
  const [reviewError, setReviewError] = useState<string | null>(null);
  const openReview = () => {
    if (!signedIn("Sign in to leave a review.")) return;
    setReviewError(null);
    setReviewOpen(true);
  };
```

`signedIn` is declared further down. Either move this block below it, or move `signedIn` up; both are plain functions, so the order only matters for readability. Then:

- `QuickActions`, line 195: `onOpenReview={() => setReviewOpen(true)}` → `onOpenReview={openReview}`
- `ReviewsSummaryCard`, line 227: `onAddReview={() => setReviewOpen(true)}` → `onAddReview={openReview}`

### 3. Show why a save failed

In the `ReviewModal` (lines 313–335):

- add the prop `error={reviewError}`
- in `onSave`, clear it first (`setReviewError(null);`). On failure, set it:

```tsx
          } else {
            setReviewError(res.err ?? "Couldn't save your review. Check your connection and try again.");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
```

- `onClose`: `() => { setReviewError(null); setReviewOpen(false); }`

## Test impact

### `test/uiKitMock.tsx`

The mocked `ReviewModal` (line 115) ignores `error`. Render it when it's set, e.g. add `error ? React.createElement(Text, null, error) : null` to its children and take `error` from its props. Other tests that use the mock don't pass `error`, so they're unaffected.

### `siteDetail.test.tsx`

The existing guest-save test (around line 368) asserts `Alert.alert("Sign In Required", "Sign in to save places.", …)` and must still pass unchanged. Add:

1. "asks a guest to sign in before reviewing": as a guest, press Review. Expect `Alert.alert("Sign In Required", "Sign in to leave a review.", expect.any(Array))`, and expect the review modal not to be shown (`queryByText("Review Modal")` is null).
2. "says why a review didn't save": signed in, mock `saveReview` to resolve `{ ok: false, err: "Failed to save review." }`. Open the review, press "Save Review", and expect `getByText("Failed to save review.")`.

Use the file's existing session and `mockBag` setup for both (see how the guest-save test switches session).

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass.
- Do not touch any file other than the three listed.
