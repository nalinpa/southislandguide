# Fix: "Find more things to do" opens Explore on that day's town

Finding #20 from the 2026-10-20 UX sweep.

## Files to change

1. `app/(app)/(tabs)/sites/index.tsx`: Explore takes a town handed to it
2. `components/itinerary/ItineraryDetailView.tsx`: the day timeline hands over the day's town
3. `app/(app)/(tabs)/sites/__tests__/sitesList.test.tsx`
4. `components/itinerary/__tests__/itineraryDetailView.test.tsx`

## Problem

On a trip's day timeline, the empty-day card ("Nothing here yet", line 836) and every free-gap card ("+ Find more things to do", line 856) do `router.push("/(app)/(tabs)/sites")`. Explore then shows the town the user has chosen, else the town nearest them, else Christchurch (`sites/index.tsx:95-104`). It has no way to be told a town.

So someone at home in Christchurch planning a Te Anau day taps "Find more things to do" and gets Christchurch places. This is a whole-island trip planner (one launch with every area), so most days in most trips are somewhere other than where the user is.

## What to do

### 1. Explore: take a town from the route's params

`sites/index.tsx` is a tab screen: one instance stays mounted, and its params persist. So the handed-in town is applied once and then cleared. A later hand-over of the *same* town must still read as a change.

- Import `useLocalSearchParams` from `expo-router` (line 3 already imports `router`).
- Pull the sheet's `onSelect` body (lines 320–327) out into a function both paths use. Put it after the `area` / `areaLocations` hooks:

```tsx
  // A town chosen in the sheet, or handed over by a trip's "Find more things to do". A
  // category chosen in one town isn't carried to a town that has nothing in it, to come
  // back unasked when the user returns.
  const chooseArea = (id: string) => {
    setChosenArea(id);
    if (!activeLocations.some((l) => (l.area ?? "") === id && category && l.category[0] === category)) {
      setCategory(null);
    }
  };

  // Handed over by another screen: taken once, then cleared. This tab screen keeps its
  // params, and the same town sent again later must still count as new. It opens on the
  // town's whole list: a search left open from before is closed.
  const { area: areaParam } = useLocalSearchParams<{ area?: string }>();
  useEffect(() => {
    if (!areaParam) return;
    chooseArea(areaParam);
    setSearchQuery("");
    setSearchOpen(false);
    router.setParams({ area: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaParam]);
```

- The sheet's `onSelect` becomes `(id) => { chooseArea(id); setAreaMenuOpen(false); }`.
- All of this must sit **above** the early `return`s (line 156 on), like the other hooks.

A town id that has no places (not in `areaOptions`) is harmless: the `area` resolution at line 101 skips it and falls through to the nearest town, as it does today.

### 2. The day timeline: hand over the town the traveller is in

In `ItineraryDetailView.tsx`, add a plain function (not a hook) after the `if (!placesReady)` early return (line 642) and before `renderLeg`:

```tsx
  // The town someone is in at a slot of the open day: where the last place or drive to
  // start before it left them, else where the day starts from (the day before's last
  // place). Explore opens on it from the day's "Find more things to do".
  const townAt = (slot: number): string | undefined => {
    const before = [
      ...localItems.map((item) => ({ start: item.slotIndex ?? 0, area: places(item.siteId)?.area })),
      ...legs.flatMap((leg) => (leg.drive ? [{ start: leg.startSlot, area: leg.drive.toArea }] : [])),
    ]
      .filter((e) => e.start < slot && e.area)
      .sort((a, b) => b.start - a.start);
    if (before[0]) return before[0].area;
    const dayIndex = localTrip.days.findIndex((d) => d.id === activeDay?.id);
    const startId = dayStartSiteId(localTrip.days, dayIndex);
    return startId ? places(startId)?.area : undefined;
  };
  const browseFrom = (slot: number) => {
    const area = townAt(slot);
    router.push(area ? { pathname: "/(app)/(tabs)/sites", params: { area } } : "/(app)/(tabs)/sites");
  };
```

`dayStartSiteId` is already imported (line 36). `places` is the `PlaceLookup` function from `usePlaceLookup` (`(siteId) => { area, … } | undefined`, `lib/utils/transitMatrix.ts:9`).

Then:

- Empty-day card, line 836: `onPress={() => browseFrom(MAX_GRID_SLOTS)}`. A day with nothing on it is in the town the day before ended in. On the trip's first day, with nothing before it, `townAt` returns `undefined` and Explore opens as it does today.
- Gap card, line 856: `onPress={() => browseFrom(gap.start)}`

Why the last place *or drive*: a gap after a drive into a new town and before the first place there is in the new town. The drive's `toArea` covers that.

## Test impact

### `sitesList.test.tsx`

The `expo-router` mock (lines 85–93) has no `useLocalSearchParams`, and `mockRouter` has no `setParams`. Add a mutable `mockParams = {} as { area?: string }`, return it from `useLocalSearchParams`, and add `setParams: jest.fn()` to `mockRouter`. Reset both in `beforeEach`.

Add:

1. "opens on a town another screen hands over": the user is in Christchurch (follow the file's location setup), with places in Christchurch and Dunedin. Set `mockParams.area = "dunedin"` and render. The title row reads Dunedin (the town title's label is `"Dunedin, choose a town"`), and `mockRouter.setParams` was called with `{ area: undefined }`.

### `itineraryDetailView.test.tsx`

Line 342 expects `mockRouter.push("/(app)/(tabs)/sites")` for the empty `day_2`. It now gets day 1's last place's town if the fixture's place lookup gives that place an area. Check the fixture: if it does, expect `{ pathname: "/(app)/(tabs)/sites", params: { area: "<that area>" } }`; if not, the plain path still holds. Add one gap test: press a `free-gap` card (testID, see line 561) on a day with a place and expect that place's area in the params.

## Device check

Make a trip with a Te Anau day while located elsewhere. Open that day and tap "Find more things to do": Explore shows Te Anau. Choose another town in the sheet, go back to the trip and tap it again: Te Anau again.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass.
- Do not touch any file other than the four listed.
