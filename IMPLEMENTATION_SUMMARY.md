# Area Drive Times Implementation - Summary

**Date:** 2026-10-14 (rewritten the same day, after a review of the first build found a crash and gaps in the fit check; this describes the code as it stands)
**Plan:** `docs/plans/area-drive-times.md`
**State:** not committed. Not yet run on a device.

## What Was Implemented

Travel between two places in different areas (Christchurch, Timaru, Dunedin) now takes that pair's drive time, and the day timeline draws the drive as a block. Inside one area nothing changes: the flat 30 minutes and the small connector.

### Core Features

1. **Area drive times.** Used in both directions.
   - Christchurch ↔ Timaru: 120 minutes
   - Timaru ↔ Dunedin: 150 minutes
   - Christchurch ↔ Dunedin: 270 minutes

   These are from memory and **have not been checked against a map**.

2. **Drive block on the day timeline.** Between two consecutive places in different areas: "Drive to Dunedin", "Christchurch to Dunedin", and the leaving time and length. It ends where the next place starts.

3. **Opening drive.** A day that starts in a different area from where the day before ended opens with the drive, counted from 8 AM. "The day before" is the nearest earlier day that has places, so an empty day in between does not lose the drive.

4. **Refusals.** An edit is refused, with the reason, when it would leave any day of the trip ending past 10 PM later than it already does. This covers adding a place, reordering, a longer visit, removing a place, moving a place to another day, and deleting a day.

5. **Re-timing on open.** A stored trip whose days left no room for a drive is re-timed and saved once when it is opened.

6. **Waiting for the place list.** Nothing is packed, drawn or edited until the place list is loaded. The day timeline shows its loading state, or a "Try Again" card if the list failed; the add sheet's button waits.

## Files Created

### Data and logic
- `lib/areas.ts` - the areas, their labels, and the drive time for each pair
- `lib/hooks/usePlaceLookup.ts` - the live place list as a lookup by id, with `ready`, `count`, `err` and `refresh`
- `components/itinerary/DriveBlock.tsx` - the drive block

### Tests
- `lib/__tests__/areas.test.ts` - 5 tests
- `lib/hooks/__tests__/usePlaceLookup.test.tsx` - 7 tests
- `components/itinerary/__tests__/driveBlock.test.tsx` - 5 tests

## Files Modified

### Core logic
- `lib/utils/transitMatrix.ts` - `getLeg(from, to, places)` replaces `getRequiredTransitSlots`. It returns the slots and, only for a listed pair of different areas, the two areas (`drive`). That, not the length of the leg, is what makes it a drive.
- `lib/utils/itineraryPhysics.ts` - the engine takes the place lookup and the place the traveller was at before the day. New: `packTrip`, `dayStartSiteId`, `dayOverflows`, `dayLegs`, `moveItemToDay`, and `tryEdit` (the gate).
- `lib/hooksBag.ts` - a fixed `normalizeLocation`, so the place list keeps its identity between renders. Corrected the comment that said inactive places reach the app (the api's list never returns them).
- `lib/itineraryTemplates.ts` - comment only.

### Screens
- `components/itinerary/ItineraryDetailView.tsx`
  - Reads the place lookup, and waits for it
  - Works out the open day's legs once (`dayLegs`); the drawing and the free-gap cards both read that list
  - Every edit handler goes through one helper that calls `tryEdit`
  - An applied edit replaces every day, because it can re-time the day after
  - The stop editor's "move to" list offers a day only if that exact move passes the gate
  - Draws each place followed by the leg that leaves it, so a screen reader reads the day in order
- `components/itinerary/AddToTripModal.tsx`
  - Adds through `tryEdit`, so it checks the next day too and shows the gate's message
  - Button disabled, reading "Loading Places...", until the place list is in

### Tests
- `lib/utils/__tests__/transitMatrix.test.ts` - rewritten for `getLeg`: 11 tests (was 2)
- `lib/utils/__tests__/itineraryPhysics.test.ts` - 39 tests (was 14): drives, the opening drive, whole-trip packing, legs, moving a place, the gate
- `lib/__tests__/itineraryTemplates.test.ts` - packs each template whole, against the three bundled place files, and checks every stop has an area
- `components/itinerary/__tests__/addToTripModal.test.tsx` - 16 tests (was 12)
- `components/itinerary/__tests__/itineraryDetailView.test.tsx` - 40 tests (was 27)

### Removed
- `lib/legRules.ts` and its test, and `createTransitLookup`, from the first build. `getLeg` covers them.

## Test Results

Run 2026-10-14 with `node node_modules/jest/bin/jest.js` and `node node_modules/typescript/bin/tsc --noEmit`:

- 45 test suites, all passing
- 557 tests passed, 4 todo
- TypeScript: no errors
- 71 more tests than the last commit

The day timeline's new tests passed the first time they ran, so each was checked the other way: nine behaviours were broken on purpose, one at a time, and each break was caught by the test written for it.

## Key Design Decisions

1. **Area data source.** The live place list, never a bundled copy: the bundled files do not match live (53 Christchurch places bundled, 46 live).
2. **Drive time storage.** Hand-entered in `lib/areas.ts`. A test fails if any two areas lack a time.
3. **Fallback.** A place with no area, a place missing from the list, or a pair of areas with no listed time: 30 minutes and the small connector, no drive block.
4. **One gate.** `tryEdit` packs the trip before and after an edit and returns either the packed days or the refusal message. It checks the whole trip, because changing a day's last place changes the drive the next day opens with.
5. **Refusal rule.** Refused only when a day would end past 10 PM *later than it already does*. A trip that already runs late (saved before drive times) can therefore still be edited back into shape; a strict rule would refuse even removing a place from it.
6. **Where a drive sits.** It ends where the next place starts, so spare time stays in the town being left.

## Implementation Notes

### Refusal messages
- The day being edited is full and has no drive: "This day is full. Try a different day or shorten the visit."
- The day being edited has a drive: "There isn't time for the drive to Dunedin on this day. Try a different day or a shorter visit."
- A different day breaks: "Day 2 would no longer fit after the drive from Christchurch. Make room on Day 2 first."

On the day timeline these appear in an alert titled "Not Enough Time". In the add sheet they appear as its error line.

### What each refused edit does
- **Reorder:** the place springs back to where it was.
- **Longer visit:** the length is kept; a note typed with it is still saved.
- **Remove a place, delete a day:** nothing is removed.
- **Move to another day:** a day the place would not fit on is not offered.
- **Add a place:** nothing is saved and the sheet stays open.

### The drive block
Flat fill, solid border, no shadow and no grip, a car icon, text at the top of the block. A plain view with no handlers and no z-order, so a dragged place passes over it. One screen-reader label: "Drive from Christchurch to Dunedin, about 4.5 hours, leaving 1:30 PM".

## Known Limitations

1. Drive times are from memory, not checked against a map.
2. The app does not know where the traveller sleeps, so an overnight change of area is always driven on the morning of the later day. A Dunedin day after a Christchurch day cannot start before 12:30 PM. To drive the evening before, add a place in the next town to the end of the earlier day.
3. A stored day with more in it than fits is re-timed on open and saved ending past 10 PM, with nothing on screen to say so. Marked with a `ponytail:` comment in `ItineraryDetailView.tsx`.
4. A place deactivated after it went into a trip is unknown to the lookup: its legs are 30 minutes, with no drive block.
5. No scaling by where a place sits inside its area (parked).
6. For 1.4 (in-app purchases): the api strips `area` from premium places for users without the unlock. `"area"` will need adding to `TEASER_FIELDS` in `enginev1/api/src/routes/locations.ts`.

## Not Checked

- Nothing has been run on a device. To check on an iPhone: the look of the drive block, dragging a place across it, VoiceOver reading order, and the refusal alert appearing over the open stop editor.
- The tests use a stand-in place lookup. That the live list keeps its identity between renders comes from reading the shared hook's code, not from running it.
- Android was left out of this work.

## Future Work (Not in Scope)

- Real drive times from a maps service
- Real place-to-place times inside an area
- A per-place "extra minutes" field
- The trip view with the towns for each day (will reuse `lib/areas.ts` labels and `dayLegs`)
- Other single-city assumptions (where the map opens, the default trip title)
