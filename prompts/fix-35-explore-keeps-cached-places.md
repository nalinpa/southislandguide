# Fix: Explore keeps showing its places when a refresh fails

Finding 3 from the 2026-10-23 code review.

## Problem

`app/(app)/(tabs)/sites/index.tsx:179-185`:

```tsx
  if (entitiesErr) {
    return (
      <Screen>
        <ErrorCard title="Connection Issue" message={entitiesErr} />
      </Screen>
    );
  }
```

When a refetch fails, React Query keeps the places it already has and also sets `error`. The shared `useLocations` passes that through as `err` (`@blacksands/hooks`, `useLocations`). Explore then swaps its whole list for "Connection Issue". There's no way back from there, because the pull-to-refresh lives on the list the card has replaced. The causes include a server error, a failed pull to refresh, and, until fix-33, any refetch with no signal.

The map (`map/index.tsx:245`) and Saved Places (`saved-sites.tsx:115`) already block only when there's nothing to show: `err && locations.length === 0`.

## What to do

`sites/index.tsx`, lines 179–185:

```tsx
  // Only when there's nothing to show: a refresh that fails keeps the places already here,
  // as the map and Saved Places do.
  if (entitiesErr && locations.length === 0) {
    return (
      <Screen>
        <ErrorCard
          title="Connection Issue"
          message={entitiesErr}
          action={{ label: "Try Again", onPress: handleRefresh }}
        />
      </Screen>
    );
  }
```

`handleRefresh` is already defined above (lines 46–53), for pull to refresh. `ErrorCard` takes `action` the same way the Trips tab uses it (`itinerary/index.tsx:83`).

## Tests

`app/(app)/(tabs)/sites/__tests__/sitesList.test.tsx`:

- "says when the places couldn't be fetched" (line 163): set `mockBag.locations = []` as well, and also expect a "Try Again" button.
- New: **keeps its places when a refresh fails.** Use the default places with `mockBag.err = "Network request failed"`. A place name is shown, and "Connection Issue" isn't.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all pass.
- Touch only those two files.
