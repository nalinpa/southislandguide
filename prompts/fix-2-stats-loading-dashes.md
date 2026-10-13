# Fix: Show dashes instead of "0" while stats are loading on the Account screen

## Files to change

1. `app/(app)/(tabs)/account.tsx` — the screen
2. `app/(app)/(tabs)/__tests__/account.test.tsx` — update the parked `test.todo`

## Problem

Lines 62 and 67 of `account.tsx` render `itineraries.length` and `savedSiteIds.size` immediately, without checking the hooks' loading flags. Both show "0 Trips" and "0 Saved" while the network requests are in flight. The test file at line 171 has a `test.todo` parked on this exact bug.

Both hooks already expose a `loading` boolean:
- `useItineraries()` returns `{ itineraries, loading, error, ... }` (see `lib/hooks/useItineraries.ts:68`)
- `useSavedSites()` returns `{ savedSiteIds, loading, ... }` (see `lib/hooks/useSavedSites.ts:64`)

## Current code (for reference)

`app/(app)/(tabs)/account.tsx` lines 22–23:
```tsx
const { itineraries } = useItineraries();
const { savedSiteIds } = useSavedSites();
```

Lines 59–71 (the stats row):
```tsx
          {isAuthed && (
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statNum}>{itineraries.length}</Text>
                <Text style={styles.statLabel}>{itineraries.length === 1 ? "Trip" : "Trips"}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statChip}>
                <Text style={styles.statNum}>{savedSiteIds.size}</Text>
                <Text style={styles.statLabel}>Saved</Text>
              </View>
            </View>
          )}
```

`app/(app)/(tabs)/__tests__/account.test.tsx` lines 27–31 (mocks):
```tsx
const mockTrips = { itineraries: [] as any[], loading: false };
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));

const mockSavedSites = { savedSiteIds: new Set<string>(), loading: false };
jest.mock("@/lib/hooks/useSavedSites", () => ({ useSavedSites: () => mockSavedSites }));
```

Line 171 (the parked test):
```tsx
test.todo("leaves a count blank while it is still loading, rather than showing a wrong zero (account.tsx:62,67)");
```

## What to do

### In `account.tsx`:

1. Destructure `loading` from both hooks:
   ```tsx
   const { itineraries, loading: itinerariesLoading } = useItineraries();
   const { savedSiteIds, loading: savedLoading } = useSavedSites();
   ```

2. Compute a combined flag:
   ```tsx
   const statsLoading = itinerariesLoading || savedLoading;
   ```

3. Replace the stats content to show an en dash `"–"` while loading. The layout must stay stable (no jump when data arrives):
   ```tsx
   {isAuthed && (
     <View style={styles.statsRow}>
       <View style={styles.statChip}>
         <Text style={styles.statNum}>{statsLoading ? "–" : itineraries.length}</Text>
         <Text style={styles.statLabel}>
           {statsLoading ? "Trips" : itineraries.length === 1 ? "Trip" : "Trips"}
         </Text>
       </View>
       <View style={styles.statDivider} />
       <View style={styles.statChip}>
         <Text style={styles.statNum}>{statsLoading ? "–" : savedSiteIds.size}</Text>
         <Text style={styles.statLabel}>Saved</Text>
       </View>
     </View>
   )}
   ```

### In `account.test.tsx`:

1. Replace the `test.todo` at line 171 with a real test:
   ```tsx
   it("shows a dash instead of a wrong zero while counts are loading", async () => {
     mockTrips.loading = true;
     mockSavedSites.loading = true;
     const view = await render(<AccountScreen />);

     expect(view.getByText("–")).toBeTruthy();
     expect(view.queryByText("0")).toBeNull();
   });
   ```

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — the new test passes, and the existing "counts the trips and saved places" test still passes (it sets `loading: false` in `beforeEach`).
- Do not touch any file other than these two.