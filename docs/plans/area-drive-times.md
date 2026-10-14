# Plan: drive times between areas, and a drive block on the day timeline

Written 2026-10-14. Brief: `prompts/plan-area-drive-times.md`. Line numbers below were right on that date and drift; confirm each before relying on it.

Two names used throughout:

- **Day timeline**: the existing screen, `components/itinerary/ItineraryDetailView.tsx`. Day tabs across the top, an 8 AM to 10 PM grid for the open day, draggable place cards.
- **Trip view**: the planned view with one row per day showing its towns (TASKS.md, 1.1). Not built, not part of this plan. It will reuse the area labels and drive legs built here.

## What this delivers

1. Travel between two places in different areas takes the real drive time for that pair of areas, not a flat 30 minutes.
2. The day timeline draws that drive as a full block: "Drive to Dunedin".
3. A day that starts in a different area from where the day before ended opens with the drive.
4. Any edit that would push a day past 10 PM is refused.

Within one area nothing changes: 30 minutes and the small connector.

## Decisions (owner, 2026-10-13 and 2026-10-14)

| Question | Decision |
|---|---|
| Drive times | Christchurch–Timaru 120 min, Timaru–Dunedin 150 min, Christchurch–Dunedin 270 min. From memory, **not checked against a map**. Whole half hours. Same time in both directions. |
| A day that cannot fit before 10 PM | The edit is refused, with a message saying why. As built: refused when it would leave any day ending past 10 PM *later than it already does*, so a trip that already runs late (saved before drive times) can still be edited back into shape. |
| Removing a place or deleting a day that makes the *next* day not fit | Also refused. Revisit if testers find it annoying (the alternative is to allow it and show a "this day doesn't fit" notice). |
| Two different areas with no time listed | 30 minutes and the small connector. No estimate. |
| Overnight change of town | Counted. The later day opens with the drive from the last place of the day before. |
| Trips made before this ships | No handling. The app is in testing; delete a trip that looks wrong. |
| Scaling the time by where a place sits in its area | Parked. If it is built later, round up to the half hour. |
| Towns in the trip view | Derived from the places in each day. Nothing new is stored. |
| Android | Not checked for this work. |

## Limits

- Do not change `../enginev1` or `../rotorua-guide`. The drive block is a local component.
- No new native packages, no change to `app.config.ts`. This must ship as an over-the-air JS update.
- No new fields on places or stored trips. No api or Firestore changes.
- Follow the existing naming, comment style and test style. Write each test before the code it covers.

## The design

### Area data: `lib/areas.ts` (new)

Same shape as `REGIONS` in `lib/guideContent.ts`. TypeScript, not JSON, so it ships over the air and can carry comments.

```ts
export const AREAS = [
  { id: "christchurch", label: "Christchurch" },
  { id: "timaru", label: "Timaru" },
  { id: "dunedin", label: "Dunedin" },
] as const;

export type AreaId = (typeof AREAS)[number]["id"];
export const AREA_LABELS: Record<AreaId, string> = /* built from AREAS, as REGION_LABELS is */;

// Minutes by road, town to town, used in both directions. One entry per pair:
// the two ids in alphabetical order, joined with "|".
// From memory, not checked against a map (owner, 2026-10-14). Confirm before release.
const AREA_DRIVE_MINUTES: Record<string, number> = {
  "christchurch|timaru": 120,
  "dunedin|timaru": 150,
  "christchurch|dunedin": 270,
};

export function areaLabel(id: string): string | undefined;
export function areaDriveMinutes(a: string, b: string): number | undefined; // either order
```

`Site.area` stays a plain `string`: the admin panel can add an area before the app knows it.

### Working out one leg: `lib/utils/transitMatrix.ts`

```ts
export type PlaceLookup = (siteId: string) => Pick<Site, "area"> | undefined; // lat/lng join it if scaling is ever built
export type Leg = { slots: number; drive: { fromArea: string; toArea: string } | null };

export function getLeg(fromSiteId: string, toSiteId: string, places: PlaceLookup): Leg;
```

Rules, in order:

1. Same place: 0 slots, no drive.
2. Both places are found, both have an area, the areas differ, **and the pair has a listed time**: `slots = Math.max(1, Math.ceil(minutes / 30))`, and `drive` names the two areas.
3. Anything else: the per-place matrix (`assets/data/southisland-transit.json`) if it has the pair, otherwise 1 slot. No drive.

Rule 3 is where real in-area times plug in later. A per-place "extra minutes" field, if it is ever added, goes inside rule 2.

The existing `getRequiredTransitSlots` is deleted in step 3, once nothing calls it.

### Where the lookup comes from: `lib/hooks/usePlaceLookup.ts` (new)

Trip items carry only a place id, so the caller supplies a lookup built from the live place list.

- `usePlaceLookup()` reads `useAllLocations()` from `lib/hooksBag.ts` and returns `{ places, ready, count, err, refresh }`. `places` is a `PlaceLookup` over a `Map` by id, `count` is how many places it holds, `ready` is `count > 0`, `err` is the list's error text, and `refresh` reloads the list (for "Try Again").
- The list is the same query the map and the place list already load. It is saved to device storage, so it is there offline after a first load.
- **Effects must depend on `ready` and `count`, never on `places` itself.** Today the shared `useLocations` returns a new array on every render: it builds a new `normalize` function each render when the config has none, and `lib/hooksBag.ts` passes none. An effect keyed on the list would loop. Step 1 also adds one fixed `normalizeLocation: (raw) => raw` to the `createHooks` config in `lib/hooksBag.ts`, which makes the list stable so memos work.

A place that is not in the list falls under rule 3. That covers a deleted place, a deactivated one (the app's client only ever receives active places) and a list that has not loaded. The engine only pushes places later and never closes gaps, so time already reserved for a drive stays as stored.

### Packing a day and a trip: `lib/utils/itineraryPhysics.ts`

```ts
export function runPhysicsEngine(items: ItineraryItem[], places: PlaceLookup, startFromSiteId?: string): ItineraryItem[];
export function packTrip(days: ItineraryDay[], places: PlaceLookup): ItineraryDay[];
export function dayOverflows(items: ItineraryItem[]): boolean;          // last place ends after MAX_GRID_SLOTS
export function dayStartSiteId(days: ItineraryDay[], dayIndex: number): string | undefined;
export function dayLegs(items: ItineraryItem[], places: PlaceLookup, startFromSiteId?: string): DayLeg[];
export function moveItemToDay(days: ItineraryDay[], itemId: string, toDayId: string): ItineraryDay[];
export function tryEdit(current: ItineraryDay[], next: ItineraryDay[], editedDayId: string, places: PlaceLookup): EditResult;
```

As built (2026-10-14), two things differ from the bullets below. The gate is one function, `tryEdit`: it packs the trip before and after an edit and returns the packed days or the refusal message, so `firstDayThatOverflows` does not exist on its own. And `packTrip` keeps each day's items in the order given (visit order) instead of sorting by `slotIndex`, because a drop orders places by their centres; callers that insert by time sort first.

- `runPhysicsEngine`: `places` is required, so the compiler finds every caller. `startFromSiteId` is where the traveller was before this day. If `getLeg(startFromSiteId, firstItem.siteId, places).drive` is set, the first place cannot start before that many slots. Enforce it at the top of `forwardCascade`; that function also runs after the reverse pass, so the 10 PM bounce respects it with no other change. A night in the same area adds nothing, not even 30 minutes.
- `packTrip`: sorts each day by `slotIndex`, works out its starting place, and packs it. A day's starting place is the place with the highest `slotIndex` on the nearest earlier day that has any places. Packing never reorders, so one day's result does not change the next day's starting place.
- **App code calls `packTrip`, not the engine**, so no caller can forget the day before. Tests may call the engine directly.
- `dayLegs`: one entry per pair of consecutive places, plus an opening entry when the day starts with a drive. Each is `{ key, startSlot, slots, drive }`. A leg ends where the next place starts, as the connector does today, so spare time stays in the town being left. This one helper feeds both the free-gap cards and the drawing.
- `moveItemToDay`: the one way a place changes day (out of its day, into the target, target sorted by `slotIndex`). Used for the real move and for deciding which days to offer.

What the two passes do with a long drive, for reference: the forward pass pushes the next place to "previous end + drive" and moves nothing earlier. If the last place ends after 10 PM, the reverse pass pins it to end at 10 PM and pulls earlier places back only as far as needed, stopping at the day's earliest start; a final forward pass pushes again. If visits plus travel exceed the day, the result still ends past 10 PM and is returned unflagged. The passes need no change. What is missing today is the check on the result, which only `AddToTripModal` makes.

### The gate: no edit may leave a day past 10 PM

Every edit builds the trip as it would be, runs `packTrip`, and is refused if `firstDayThatOverflows` finds a day. It looks at the whole trip because changing the last place of one day changes the next day's opening drive.

| Edit | Where | What can stop fitting | What the user sees |
|---|---|---|---|
| Add a place | `AddToTripModal` `handleAdd` | That day, or the next if the new place becomes the last | Refused in the sheet |
| Reorder | `handleDrop` | That day, or the next if the last place changes | The place springs back (return its current slot, as the locked-drag branch does) and an alert |
| Longer visit | `handleSaveEdit` | That day | The note is saved, the length is kept, and an alert |
| Move to another day | `handleMoveDay`, and `availableDays` for `EditItemModal` | Either day, or the day after each | A day is offered only if `moveItemToDay` + `packTrip` fits. This replaces the simulation that appends the place at the end, which no longer matches the real move |
| Remove a place | `handleRemoveItem` | The next day, if it now opens with a drive | Refused, with an alert naming the day |
| Delete a day | `handleDeleteDay` | The following day | Refused, with an alert naming the day |

Messages:

- Keep the existing "This day is full. Try a different day or shorten the visit." when the day that overflows has no drive in it. A test already asserts that text.
- When it has a drive: "There isn't time for the drive to Dunedin on this day. Try a different day or a shorter visit."
- When a different day breaks: "Day 3 would no longer fit after the drive from Christchurch. Make room on Day 3 first."

Saving: `flushSave` and the handlers that save directly (`handleMoveDay`, `handleDeleteDay`, the fix-on-open effect) run `packTrip` over the whole `days` array before `saveTrip`. An edit that fits can still shift the next day later, and this keeps the stored times and the map's "Today's Plan" right.

While the place list is not `ready`: the day timeline shows its existing loading state, and the add sheet's button is disabled, so nothing is packed or checked against an empty lookup. If the list failed to load (`err` is set and it is still not `ready`), the day timeline shows its existing error card, and "Try Again" also calls `useRefreshLocations()` from `lib/hooksBag.ts`. No edit is ever made without the drive check.

`// ponytail:` comment to leave at the fix-on-open effect: a trip stored before this shipped, or packed against older times, can overflow when re-packed, and nothing handles that. Add a notice on the day if drive times start changing after release.

### The drive block: `components/itinerary/DriveBlock.tsx` (new)

Drawn for every leg whose `drive` is set, the opening one included. The kit's `TransitBlock` still draws every other leg; it has no props for its label or icon, so it cannot be reworded from this repo.

- **Props:** `fromLabel`, `toLabel`, `startSlot`, `slots`. Labels come from `areaLabel`.
- **Content, top-aligned:** "Drive to Dunedin", then "Christchurch to Dunedin", then "1:30 PM · About 4.5 Hours" using `slotIndexToTimeLabel` and `slotsToDurationLabel`. A one-slot block shows the first and last lines only.
- **Position:** absolute, `left: 82`, `right: tokens.space.md`, `top: startSlot * SLOT_HEIGHT`, `height: slots * SLOT_HEIGHT`, `paddingVertical: 2`, matching the kit's `TimelineBlock`.
- **Look:** flat `bgSurface` fill, solid 1px `borderSubtle` edge, radius 12, no shadow, no grip column. Title in `text`, the other lines in `text2`, a `Car` icon from `lucide-react-native` in `textMuted`. No highlight orange and no teal: a drive is neither the main action nor a live fact. The edge is solid because a dashed edge already means "tap to add" on this screen.
- **Touch:** a plain `View` with no handlers. No `zIndex`, so a dragged place (10) passes over it.
- **Screen reader:** `accessible`, with one label: "Drive from Christchurch to Dunedin, about 4.5 hours, leaving 1:30 PM". No button role.
- **Reading order:** render each place followed by the leg that leaves it, with the opening drive first, so the day reads top to bottom.
- **Free-gap cards:** the `freeGaps` memo marks slots as taken from `dayLegs`, the same list that draws the blocks, so a "Find more things to do" card can only use slots no place or leg occupies.

### Suggested itineraries

Not affected. All 11 stops in `lib/itineraryTemplates.ts` are `christchurch` in the bundled place files, so every leg stays at 1 slot and no day opens with a drive. To keep `lib/__tests__/itineraryTemplates.test.ts` meaningful it must:

- pack each template with `packTrip`, not day by day;
- build its lookup from `assets/data/christchurch_places_all.json`, `timaru_places.json` and `dunedin_places.json`, not an empty one;
- assert every stop has an `area`.

A future template that crosses areas then fails until its slots are re-baked. Update the "re-bake" comments in the test and in `lib/itineraryTemplates.ts` to name the area times as well as the matrix.

## Steps

Each step leaves `npm test` and `npx tsc --noEmit` passing. Steps 1 to 5 ship together as one update.

### Step 1. Place lookup (small)

- **Files:** `lib/hooksBag.ts` (the one `normalizeLocation` line), new `lib/hooks/usePlaceLookup.ts`, new `lib/hooks/__tests__/usePlaceLookup.test.tsx`.
- **Tests first:** returns area, lat and lng for a listed place; `undefined` for an unknown id; `ready` is false until the list holds at least one place; `count` matches the list; `err` carries the list's error.
- **Worked if:** nothing visible changes, and the map and place list still load.

### Step 2. Area table and `getLeg` (small)

- **Files:** new `lib/areas.ts`, new `lib/__tests__/areas.test.ts`, `lib/utils/transitMatrix.ts`, `lib/utils/__tests__/transitMatrix.test.ts`.
- **Tests first:**
  - every pair of areas in `AREAS` has a time, and every area has a label;
  - `areaDriveMinutes` gives the same answer in either order;
  - `getLeg`: same place gives 0; same area gives 1 slot and no drive; Christchurch–Timaru, Timaru–Dunedin and Christchurch–Dunedin give 4, 5 and 9 slots both ways with both areas named; a place with no area, a place missing from the lookup, and an unlisted pair each give 1 slot and no drive.
- **Worked if:** tests pass. `getRequiredTransitSlots` is untouched, so the app behaves as before.

### Step 3. The planner uses it, across days (medium to large)

- **Files:** `lib/utils/itineraryPhysics.ts`, `components/itinerary/ItineraryDetailView.tsx`, `components/itinerary/AddToTripModal.tsx`, `lib/utils/transitMatrix.ts` (delete the old function), `lib/itineraryTemplates.ts` (comment only), and the tests: `itineraryPhysics.test.ts`, `transitMatrix.test.ts`, `itineraryTemplates.test.ts`, `itineraryDetailView.test.tsx`, `addToTripModal.test.tsx` (the last two mock `usePlaceLookup`).
- **Tests first:**
  - a Dunedin place straight after a Christchurch one is pushed back 9 slots;
  - a day that overruns bounces back from 10 PM with the drive still honoured;
  - day 2's first place, in another area from day 1's last, is held to the drive length; in the same area it is untouched;
  - an empty day between them still counts the drive;
  - an unknown last place on the day before gives no opening drive;
  - the templates test as described above.
- **Worked if:** on a device, a Christchurch + Dunedin day shows the right arrival time, and a Dunedin day after a Christchurch day starts no earlier than 12:30 PM. The drive is still drawn by the old connector at this point, as a tall dashed line.

### Step 4. The drive block (medium)

- **Files:** new `components/itinerary/DriveBlock.tsx`, new `components/itinerary/__tests__/driveBlock.test.tsx`, `lib/utils/itineraryPhysics.ts` (`dayLegs`), `components/itinerary/ItineraryDetailView.tsx`, and their tests.
- **Tests first:**
  - `dayLegs` gives each leg's start slot, length and areas, including the opening drive;
  - the block shows its three lines, has the one screen-reader label, and contains no button;
  - a mixed day shows "Drive to Dunedin"; a Christchurch-only day does not;
  - day 2 after a Christchurch day shows the drive above its first place;
  - a free-gap card ends where a drive starts.
- **Worked if:** on an iPhone, the block reads as "time taken up" and not as something to tap; a place dragged across it passes over it; VoiceOver reads the day in order.

### Step 5. The gate (medium to large)

- **Files:** `lib/utils/itineraryPhysics.ts` (`firstDayThatOverflows`, `moveItemToDay`), `components/itinerary/ItineraryDetailView.tsx`, `components/itinerary/AddToTripModal.tsx`, and their tests.
- **Tests first:** one per row of the gate table, the three messages, and "an edit that fits re-times the next day in the saved trip".
- **How:** change one handler at a time, each behind its own test. This screen saves through refs and has had save-ordering bugs before.
- **Worked if:** on a device, none of the six edits can produce a place below the 10 PM line.

### Parked: scaling by position inside an area

Not planned. For the record: it would multiply the listed time by (distance between the two places ÷ distance between the two area centres) inside rule 2. With today's three areas it moves a leg by about one half-hour slot. It only sees how far along the line between two towns a place is, so it gets a place off the main road wrong, and it moves the wrong way for a place that is nearer as the crow flies but further by road (the Royal Albatross Centre from Christchurch). Those are the cases a per-place "extra minutes" field would fix.

## Risks

### Checked

- **The live api returns `area`.** `GET https://api.blacksands.app/v1/southislandguide/locations` on 2026-10-14: 96 places, all with `area` (46 `christchurch`, 35 `dunedin`, 15 `timaru`) and numeric `lat`/`lng`.
- **The app never receives inactive places.** The list route drops them unless called with `includeInactive=true`, and the app's client does not send it. The comment above `useAllLocations` in `lib/hooksBag.ts` says otherwise and is wrong. 10 inactive places exist live. A place deactivated after it went into a trip gets 30-minute legs and no drive block, and if it is the last place of a day the next day gets no opening drive. Accepted.
- **The place list is a new array on every render** until step 1's fix (installed `@blacksands/hooks` 0.4.7, `dist/index.js` lines 401 and 421).
- **All 11 template stops are `christchurch`** in the bundled files.
- **The bundled place files do not match live** (53 Christchurch places bundled, 46 live), so a bundled place-to-area map would be wrong.
- **Everything is JS only.** `Car` is already imported from `lucide-react-native` in `lib/guideContent.ts`.

### Not checked

- The three drive times.
- VoiceOver order and the look of the block, which need a device.
- Whether any test trip already has a mixed-area day. It will be re-packed and saved when opened.

### Known consequences

- **The drive is always put on the morning of the later day.** The app does not know where the traveller sleeps. A Dunedin day after a Christchurch day cannot start before 12:30 PM, and "Morning" in the add sheet lands a place there. To drive the evening before, add a Dunedin place to the end of the earlier day; the drive then shows on that day and the next morning is free.
- **A removal can be refused.** Taking the last Dunedin place off day 1 can give day 2 an opening drive it has no room for. It only bites when day 2 already holds more than about 9.5 hours of visits.
- **The saved copy of trips and places expires together.** Both sit in one saved cache, which the query library discards if it was last written more than 24 hours ago (`maxAge` default; `lib/providers/AppProviders.tsx` sets none). So an offline user never has a trip without the place list: after that gap they have neither, and the trip screen cannot open. That is how the app behaves today and is not changed here; it is worth its own task, since a traveller without signal for a day loses their plan.
- **For 1.4 (in-app purchases):** the api reduces a premium place to a fixed list of fields for a user without the unlock. That list has `region`, `lat` and `lng` but not `area`. Once places are premium, locked users and guests would lose drive times. The fix is to add `"area"` to `TEASER_FIELDS` in `enginev1/api/src/routes/locations.ts`, which is outside this work.

## Not in scope

Real drive times from a maps service; real place-to-place times inside an area; a per-place "extra minutes" field; the trip view; the other places the app assumes one city (where the map opens, the default trip title); a day that starts before 8 AM.
