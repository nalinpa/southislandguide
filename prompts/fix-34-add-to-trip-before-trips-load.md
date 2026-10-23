# Fix: "Add to Trip" waits until the trips are known

Finding 2 from the 2026-10-23 code review. Run it after fix-33, which also edits `useItineraries.ts`.

## Problem

`useItineraries` hands back `itineraries` as `[]` until the trips load (`const { data: itineraries = [] … }`, `useItineraries.ts:23`). Two screens pick the first step of "Add to Trip" from how many trips there are:

- the place screen: `startAddToItinerary` (`sites/[siteId]/index.tsx:86-90`)
- the map: `handleAddToItinerary` (`map/index.tsx:90-102`)

Both make the same three-way choice: no trips → make one; under `PLANNER.MAX_ITINERARIES` (3) → ask existing or new; at the limit → pick one.

Suppose a user with three trips taps "Add to Trip" before their trips arrive: on a cold start, while the saved copy is restored, or on the first load after the 14-day cache has lapsed. The list is empty, so they are sent to make a new trip and can end up with a fourth. The api doesn't enforce the limit (`enginev1/api/src/routes/itineraries.ts` has no cap), so the fourth trip is saved.

The Account screen's trip card has the same fault. `ItinerariesCard` decides `atLimit` from the same list (`components/account/ItinerariesCard.tsx:17`), and the card always renders (`account.tsx:106`). So "New Trip" shows before the trips arrive, and after a failed load it shows next to the error.

## What to do

### 1. `lib/hooks/useItineraries.ts`: the choice, once, and null until the trips are known

- Destructure `data` from `useQuery` instead of `data: itineraries = []`, and add `const itineraries = data ?? [];` below it.
- Add and return:

  ```ts
    // Which step "Add to Trip" opens on: no trips yet, make one; under the limit, ask whether
    // to use one or make one; at the limit, pick one. Null until the trips are known: an
    // empty list before they load sent someone with three trips off to make a fourth.
    const addFlow: "create" | "choose" | "pick" | null =
      data === undefined
        ? null
        : data.length === 0
          ? "create"
          : data.length < PLANNER.MAX_ITINERARIES
            ? "choose"
            : "pick";
  ```

  Import `PLANNER` from `@/lib/constants/gameplay`.

`data` stays `undefined` in three cases:
- while the trips load or the saved copy is restored;
- when signed out (the query is off);
- when the first load fails and nothing is cached.

In each of these `addFlow` is null.

### 2. `app/(app)/(tabs)/sites/[siteId]/index.tsx`

- Take `addFlow` from `useItineraries()` instead of `itineraries`. Nothing else here uses `itineraries`.
- `startAddToItinerary` becomes:

  ```ts
    const startAddToItinerary = () => {
      if (addFlow === "create") setIsCreatingItinerary(true);
      else if (addFlow === "choose") setShowTripChoice(true);
      else if (addFlow === "pick") setIsAddingToTrip(true);
    };
  ```

- The button (lines 270–276): `disabled={isOffline || !addFlow}`. Use the disabled style under the same condition. The label doesn't change: "Reconnect to Add to Trip" offline, "+ Add to Trip" otherwise.
- Update the comment at lines 76–78: the choice is made in `useItineraries` now.
- Remove the `PLANNER` import. Line 88 is its only use.

### 3. `app/(app)/(tabs)/map/index.tsx`

- Take `addFlow` as well as `itineraries` from `useItineraries()`. `todayItems` still needs `itineraries`.
- In `handleAddToItinerary`, keep the paywall check first, then branch on `addFlow` exactly as on the place screen. A null `addFlow` does nothing. Its dependency list becomes `[addFlow, entitledProductIds]`.
- Remove the `PLANNER` import. Line 97 is its only use.

The map's add button stays as it is. A tap before the trips arrive does nothing, and the wait is a moment. Greying it out would need a new prop on `MapOverlay`.

### 4. `components/account/ItinerariesCard.tsx`

- Take `addFlow` as well as `itineraries` and `error` from `useItineraries()`. Remove `atLimit` (line 17).
- Lines 61–68 become:

  ```tsx
        {/* Nothing until the trips are known: an empty list before they load, or after a failed
            load, showed "New Trip" to someone already at the limit. */}
        {addFlow === "pick" ? (
          <Text style={styles.limitText}>Up to {PLANNER.MAX_ITINERARIES} trips at a time.</Text>
        ) : addFlow ? (
          <TouchableOpacity style={styles.createBtn} onPress={() => setIsCreating(true)} activeOpacity={0.6}>
            <Plus size={13} color={tokens.colors.accent} strokeWidth={2.5} />
            <Text style={styles.createBtnText}>New Trip</Text>
          </TouchableOpacity>
        ) : null}
  ```

- `PLANNER` stays: the limit text still uses it.

## Tests

- `lib/hooks/__tests__/useItineraries.test.tsx`: one new test, three checks:
  - `addFlow` is `null` before the list resolves (use a `getMyItineraries` that hasn't resolved yet);
  - then `"create"` for `[]`, `"choose"` for one trip and `"pick"` for three;
  - `null` when signed out.
- `sites/[siteId]/__tests__/siteDetail.test.tsx`:
  - `mockTrips` gets `addFlow: "create"`, reset in `beforeEach` (line 129).
  - The tests at lines 286, 296 and 306 set `mockTrips.addFlow` (`"choose"`, `"choose"`, `"pick"`) instead of `itineraries`.
  - New: with `addFlow: null`, pressing "+ Add to Trip" opens nothing.
- `map/__tests__/map.test.tsx`:
  - The same `addFlow: "create"` default on `mockTrips`, reset in `beforeEach` (line 172).
  - Lines 437 and 448 set `addFlow` (`"choose"`, `"pick"`) as well as the `itineraries` they already set.
  - New: with `addFlow: null`, pressing "Add to Trip" opens no modal.
- `components/account/__tests__/itinerariesCard.test.tsx` (new; the card has no tests yet):
  - Mock `@/lib/hooks/useItineraries` with a `mockTrips` of `{ itineraries: [], error: null, addFlow: "create" }`.
  - Stub `@/components/itinerary/CreateItineraryModal` to render nothing.
  - Mock `expo-router` as `{ router: { push: jest.fn() } }`.
  - One test, three checks:
    - `"choose"` shows "New Trip";
    - `"pick"` shows "Up to 3 trips at a time." and no "New Trip";
    - `null` shows neither.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all pass.

## Files touched

- `lib/hooks/useItineraries.ts`, `lib/hooks/__tests__/useItineraries.test.tsx`
- `app/(app)/(tabs)/sites/[siteId]/index.tsx`, its `__tests__/siteDetail.test.tsx`
- `app/(app)/(tabs)/map/index.tsx`, its `__tests__/map.test.tsx`
- `components/account/ItinerariesCard.tsx`, new `components/account/__tests__/itinerariesCard.test.tsx`

## Not in this fix

- A three-trip limit enforced by the api. That's a change to the shared api, which serves other apps too.
- The Trips tab's own "New Trip" button (`itinerary/index.tsx:153`). It renders only once the list is there.
