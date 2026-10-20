# Fix: Share works every time, not once per place

Finding #28 from the 2026-10-20 UX sweep. Owner's call (2026-10-20): "share should work any time they want to use it." The photo share card stays the only share. Don't add a link or text share.

## Files to change

1. `components/sites/detail/ActionsBar.tsx`
2. `app/(app)/(tabs)/sites/[siteId]/index.tsx`
3. `app/(app)/(tabs)/sites/[siteId]/__tests__/siteDetail.test.tsx`

## Problem

Once a user has shared a place, its Share button turns into a disabled, highlighted "Shared" (`ActionsBar.tsx:88-95`):

```tsx
      <QuickAction
        icon={Share2}
        label={shareBonus ? "Shared" : "Share"}
        onPress={onShareBonus}
        disabled={shareBonus}
        active={shareBonus}
        divided
      />
```

`shareBonus` comes from the user's completions (`sites/[siteId]/index.tsx:53-54`, `useMyCompletions(uid).sharedLocationIds`). That's the template's "share bonus" game mechanic. Here it means a second photo of the same place can never be shared.

## What to do

### `ActionsBar.tsx`

- The Share cell becomes:

```tsx
      <QuickAction icon={Share2} label="Share" onPress={onShare} divided />
```

- In `QuickActions`' props and their type (lines 58–77), remove `shareBonus` and rename `onShareBonus` to `onShare`. Nothing else in the file uses them. The unused `ActionsBar` component further down keeps its own `onShareBonus` prop; leave it alone.

### `sites/[siteId]/index.tsx`

- Delete lines 53–54 (`useMyCompletions` and `hasShareBonus`). `uid` is still used by the reviews hook on line 65, so keep it.
- In the `QuickActions` element (lines 193–204): delete `shareBonus={hasShareBonus}` and rename `onShareBonus=` to `onShare=`.

## Test impact

`siteDetail.test.tsx`:

- Lines 337–344, "marks a place already shared, and doesn't open the share screen again": replace it with "opens the share screen again for a place already shared". Set `mockBag.sharedIds = new Set(["site-1"])`, press `getByText("Share")` and expect `route.getPathname()` to be `"/share-frame"`. Also assert `queryByText("Shared")` is null.
- The `useMyCompletions` entry in the hooks mock (line 57) is now unused. Remove it, along with `mockBag.sharedIds` if nothing else reads it.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass.
- Do not touch any file other than the three listed.
