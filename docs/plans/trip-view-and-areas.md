# Plan: a trip view with the towns for each day, and the places the app still assumes one city

Written 2026-10-14, revised the same day with the owner's answers. Brief: `prompts/plan-trip-view-and-areas.md`. Builds on `docs/plans/area-drive-times.md`. Line numbers below were right on that date and drift; confirm each before relying on it.

Names used throughout:

- **Day timeline**: the existing screen, `components/itinerary/ItineraryDetailView.tsx`. Day tabs across the top, an 8 AM to 10 PM grid for the open day.
- **Trip view**: the new overview, one row per day with its towns. Part A.
- **Area**: the base town a place is visited from (`Site.area`: `christchurch`, `timaru`, `dunedin`). "Town" in anything the user reads.
- **Here**: the user is somewhere the app has places. Defined in Part B.

Sizes: **small** is one file and its test, **medium** is one screen and its tests, **large** is several screens.

## Decisions (owner, 2026-10-14)

The first draft asked five questions. These are the answers, and the plan below is written to them.

| Question | Decision |
|---|---|
| Where the trip view lives | On the trip screen in the Plans tab, with a worded two-part switch under the trip's title: **Trip** and **Days**. The switch is visible in both views. The day tabs show only under Days. |
| What a trip opens on | The trip view. A trip opened to add or show a particular day (`jumpToDay`) opens on that day. |
| How Explore offers the area choice | The bar's title is the town's name and is plainly a dropdown. |
| What the dropdown lists | Towns only. There is no "everything" view. |
| What Explore shows by default | The town nearest the user, wherever they are on the island; between towns that is the nearer one, not Christchurch. Christchurch only with no position, or a position off the island. |
| Where the map opens for someone between towns | On the nearest town, the same one Explore picks. |
| An untitled trip | "South Island Trip". |
| The map card's "DUNEDIN-OTAGO" line | Not a bug. Left as it is. |

No question is left that blocks the build. Three calls are mine and yours to overrule:

- "Here" on the map means within 30 km of any place (B2). It only decides whether the map opens on the user or on a town.
- Between towns, the map selects the nearest town's top featured place, not the single nearest place, which in Oamaru's case is a freedom camping area 74 km away (B2).
- The trip view shows no trip-wide total (Part A, point 4).
- The switch's two words, "Trip" and "Days".
- An "Other" row in the Explore menu, shown only while some place has no area, so that such a place cannot vanish (Part B, design 3).
- Explore changing town a moment after it opens, for anyone outside Christchurch, is accepted for now and judged on a device (Part B, design 3).

## Which part first

**B1 and B2, then Part A, then B3 and B4.**

B1 and B2 fix things that are wrong today for anyone outside Christchurch: a new trip is called "Christchurch Trip", and someone standing in Dunedin has the map open on a market in Christchurch. `TASKS.md` lists these as a decision to make before submitting 1.0. Both are small and independent.

Part A is new, not a fix, and nothing waits on it. The Explore dropdown (B3) is the largest piece of Part B and also new, so it follows.

The two parts share one tiny step (step 0). Whichever part is built first does it.

## Limits

As in the brief, repeated so the builder has them in one place:

- Do not change `../enginev1` or `../rotorua-guide`.
- No new native packages, no change to `app.config.ts`. Everything here ships as an over-the-air JS update.
- No new fields on places or stored trips. No api or Firestore changes.
- Near-white pages, white cards, burnt orange (`highlight`) for the main action, "you are here" and live facts, deep teal top bars. Every screen works at 375×667 points.
- Follow the code that is there. Write each test before the code it covers. Each step leaves `npm test` and `npx tsc --noEmit` passing.

## Step 0, shared. One name for an area (small)

`areaLabel(id)` returns nothing for an area the app does not know. Three places already fall back to the raw id, each in its own way (`tryEdit` has a private `areaName`; the day timeline writes `areaLabel(x) ?? x` twice). The trip view and the Explore dropdown need the same fallback.

- **Files:** `lib/areas.ts`, `lib/__tests__/areas.test.ts`, `lib/utils/itineraryPhysics.ts`, `components/itinerary/ItineraryDetailView.tsx`.
- **Change:** export `areaName(id: string): string` from `lib/areas.ts`: the label, or the id when there is none. Delete the private copy in `itineraryPhysics.ts` and use it in `renderLeg`.
- **Tests first:** `areaName("dunedin")` is "Dunedin"; `areaName("oamaru")` is "oamaru".
- **Worked if:** nothing visible changes and the existing refusal-message tests still pass.

---

# Part A: the trip view

## The design

### 1. Where it lives, and the switch

Inside `ItineraryDetailView`, which is the trip screen in the Plans tab. Under the trip's title sits a two-part switch, **Trip | Days**, always visible. The view holds one new piece of state, `view`, which is `"trip"` or `"days"`.

- **Trip:** the rows described below. No day tabs.
- **Days:** the day tabs and the timeline, exactly as today, one row lower.

The switch is a pill-shaped track with two halves, not another row of underlined tabs: it has to read as a different kind of control from the day tabs beneath it. The chosen half is filled with the on-dark highlight (`highlightOnDark`), which is how this app marks "you are here" on the teal bar, with near-black text; the other half is white text on the track. Each half is a `tab` to a screen reader, with its selected state, as `TopBarTabs` does it.

Placing it inside the component, not on a route of its own, matters for one case. `app/(app)/(tabs)/itinerary/index.tsx` draws a user's single trip by rendering `ItineraryDetailView` directly, with no route, so anything inside that component reaches that user too. That case cannot happen today, because the stand-in `useEntitlementGate` treats everyone as entitled and every user gets the "My Trips" list. It will happen when in-app purchases land (1.4), and this design is already right for it.

`view` is separate from the open day on purpose. The screen saves through refs keyed on the open day (`activeDayIdRef`, `latestItemsRef`), so the open day must stay set while the trip view is up. Do not model the trip view as "no day open".

**What opens first.** The trip view. The exception is a trip opened with `jumpToDay`, which `AddToTripModal` sends after adding a place: that opens on Days, on that day, so the user sees the place they just added.

**What "Days" opens.** The day that was last open; Day 1 the first time.

**Height.** In Days the bar is one switch row taller than today, about 44 points, so the timeline has about 408 of the 667 points where it had about 452. It scrolls and holds no primary button, so nothing can be hidden. In Trip the bar is shorter than today's, because the day tabs are gone.

### 2. What a row shows

One white card per day, in order. Up to four lines:

1. **Day and date:** "Day 2 · Thu 15 Oct". The weekday is added because this is the one place the whole trip is laid out. If the day is today, a "Today" label in the highlight colour.
2. **Towns, in the order visited,** joined by arrows: "Dunedin", or "Dunedin → Timaru → Christchurch". The same town twice in a row is written once. Going out and back keeps both: "Christchurch → Timaru → Christchurch". Labels come from `lib/areas.ts`.
3. **Places and driving:** "3 places · 4.5 hours driving". The driving is the total of the day's drives between towns, the opening drive included. It is left off when there is none. The half hours between places in one town are not driving and are not counted.
4. **Only when the day opens with a drive:** a car icon and "Starts with the drive from Christchurch", styled like the drive block (muted icon, secondary text). Without this line a day that reads "Dunedin · 3 places · 4.5 hours driving" would not explain itself.

Special cases:

- **An empty day:** line 1, then "Nothing planned yet" in muted text. It names no town. The towns are derived from the day's places, and guessing "still in Christchurch" would be the app choosing where the traveller sleeps, which is out of scope.
- **A place with no area, or no longer in the place list:** it is counted as a place, because it is still on the timeline, and left out of the towns. A day made only of such places shows its count and no town line.
- **A day that ends past 10 PM** (a trip stored before drive times and re-timed on open): one more line, "Runs past 10 PM", in the warning colour. `dayOverflows` already exists. This is the on-screen notice that `IMPLEMENTATION_SUMMARY.md` lists as missing (known limitation 3); the trip view is the natural place for it and it costs one line. Drop it if you would rather keep the row to four lines.

Considered and left out: the day's start and end times. The opening-drive line already explains a late start, and a fifth fact makes the row a table.

### 3. Tapping a row

Switches to Days on that day. The whole row is one button. Its screen-reader label is the row as a sentence: "Day 2, Thursday 15 October, Dunedin, 3 places, 4.5 hours driving, starts with the drive from Christchurch".

### 4. Anything for the trip as a whole

**Recommended: no.** The candidate is total driving for the trip. Against it: it would add up three times that are from memory and unchecked, it leaves out all travel inside a town, and so it would present a precise-looking number that understates the real driving. Each day already shows its own figure, next to the towns that explain it. Revisit when real drive times land.

### 5. Where the data comes from

One new pure function beside the helpers it uses, in `lib/utils/itineraryPhysics.ts`:

```ts
export type DaySummary = {
  dayId: string;
  placeCount: number;
  areas: string[]; // area ids in visit order; the same one twice in a row once; places with no known area left out
  openingDrive: { fromArea: string; slots: number } | null;
  driveSlots: number; // every drive in the day, the opening one included
  overflows: boolean;
};

// `days` are packed, as the day timeline holds them.
export function tripSummary(days: ItineraryDay[], places: PlaceLookup): DaySummary[];
```

For each day it calls `dayLegs(day.items, places, dayStartSiteId(days, i))` and `dayOverflows(day.items)`, and reads each place's area from the lookup. It contains no rule about travel of its own: what counts as a drive, how long it is and where a day starts all come from the functions the planner and the drive block already use. If a drive time changes in `lib/areas.ts`, the timeline and the trip view change together.

The trip view is given the days as they stand on screen: the stored days with the open day's items as edited. An edit made a moment ago shows in the trip view without waiting for a save.

**While the place list loads, and when it fails:** nothing new. `ItineraryDetailView` already returns its loading state until the list is in, and its "Couldn't load your trip" card with "Try Again" when the list failed. The trip view sits below those checks, so it is never drawn against an empty list. The switch is not shown in those states because the bar is not.

### The design rule the trip view must show, not fix

A Dunedin day after a Christchurch day opens with a 4.5 hour drive. The row shows exactly that: "Dunedin", "3 places · 4.5 hours driving", "Starts with the drive from Christchurch". Now that a trip opens here, this is the first thing a user sees of it, and it is what tells them to move a Dunedin place to the end of the day before if they would rather drive in the evening.

## Sketch

375 points wide. A four-day trip, as it opens.

```
┌───────────────────────────────────────────┐
│ South Island Trip                     ⋯   │  teal bar
│ ┌───────────────────┬───────────────────┐ │
│ │ ▓▓▓▓  Trip  ▓▓▓▓▓ │       Days        │ │  the switch; "Trip" filled
│ └───────────────────┴───────────────────┘ │
├───────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐ │  near-white page, white cards
│ │ Day 1 · Wed 14 Oct        Today     › │ │  "Today" in burnt orange
│ │ Christchurch                          │ │
│ │ 5 places                              │ │
│ └───────────────────────────────────────┘ │
│ ┌───────────────────────────────────────┐ │
│ │ Day 2 · Thu 15 Oct                  › │ │
│ │ Dunedin                               │ │
│ │ 3 places · 4.5 hours driving          │ │
│ │ (car) Starts with the drive from      │ │  car icon, muted
│ │       Christchurch                    │ │
│ └───────────────────────────────────────┘ │
│ ┌───────────────────────────────────────┐ │
│ │ Day 3 · Fri 16 Oct                  › │ │
│ │ Dunedin → Timaru → Christchurch       │ │
│ │ 4 places · 4.5 hours driving          │ │
│ └───────────────────────────────────────┘ │
│ ┌───────────────────────────────────────┐ │
│ │ Day 4 · Sat 17 Oct                  › │ │
│ │ Nothing planned yet                   │ │  muted
│ └───────────────────────────────────────┘ │
├───────────────────────────────────────────┤
│   Explore     Plans      Map     Profile  │
└───────────────────────────────────────────┘
```

After tapping "Days", or the Day 1 row:

```
┌───────────────────────────────────────────┐
│ South Island Trip                     ⋯   │
│ ┌───────────────────┬───────────────────┐ │
│ │       Trip        │ ▓▓▓▓  Days  ▓▓▓▓▓ │ │
│ └───────────────────┴───────────────────┘ │
│  Day 1    Day 2    Day 3    Day 4   + Add │  the day tabs, as today
│  14 Oct   15 Oct   16 Oct   17 Oct    Day │
│  ▔▔▔▔▔▔   ──────   ──────   ──────        │
├───────────────────────────────────────────┤
│  8 AM ─────────────────────────────────── │
│        ┌────────────────────────────────┐ │
│  9 AM  │ Christchurch Botanic Gardens   │ │
│        └────────────────────────────────┘ │
```

## Steps

### A1. The summary (small)

- **Files:** `lib/utils/itineraryPhysics.ts`, `lib/utils/__tests__/itineraryPhysics.test.ts`.
- **Tests first,** with the test file's existing stand-in lookup (`chc-a`, `chc-b`, `tim-a`, `dun-a`, `dun-b`):
  - a day in one town gives that one area and no driving;
  - Christchurch, Christchurch, Dunedin gives `["christchurch", "dunedin"]` and 9 drive slots;
  - Christchurch, Dunedin, Christchurch keeps all three;
  - day 2 in Dunedin after a Christchurch day has `openingDrive` `{ fromArea: "christchurch", slots: 9 }`, counted in `driveSlots`;
  - an empty day in between does not lose that opening drive;
  - an empty day gives 0 places, no areas, no drive;
  - a place missing from the lookup is counted, is left out of the areas, and brings no drive;
  - a day whose last place ends after slot 28 has `overflows` true.
- **Worked if:** tests pass. Nothing visible changes.

### A2. The trip view component (medium)

- **Files:** new `components/itinerary/TripOverview.tsx`, new `components/itinerary/__tests__/tripOverview.test.tsx`.
- **Shape:** props `days`, `places`, `onOpenDay(dayId)`. It calls `tripSummary` in a memo and draws the rows in a `ScrollView`. Card style as the trip cards in `itinerary/index.tsx` (`bgCard`, `borderSubtle`, `cardLift`, radius `lg`). `Car` and `ChevronRight` from `lucide-react-native`, both already used in the repo. Durations through `slotsToDurationLabel`, lower-cased as `DriveBlock` does for its screen-reader label.
- **Tests first:**
  - one row per day, each with its day number and its date with the weekday;
  - "Christchurch → Dunedin" for a two-town day;
  - "3 places · 4.5 hours driving", "1 place" in the singular, and no driving text when there is none;
  - "Starts with the drive from Christchurch" on a day that opens with one, and not otherwise;
  - an empty day reads "Nothing planned yet";
  - a day of unknown places shows its count and no town;
  - today's row carries "Today" in `tokens.colors.highlight`; other rows do not;
  - a day that overflows shows "Runs past 10 PM";
  - pressing a row calls `onOpenDay` with that day's id;
  - each row is one button with the sentence label.
- **Worked if:** tests pass. Not on screen yet.

### A3. The switch, and opening on the trip view (medium to large)

The existing 40 tests of this screen open a trip and expect the timeline. They are about the timeline and stay about it: change the test file's `openTrip` helper to press "Days" after rendering when it is there, and add an `openTripView` helper that does not. Make that change first, with the switch, and confirm all 40 still pass before writing anything new.

- **Files:** `components/itinerary/ItineraryDetailView.tsx`, new `components/itinerary/TripViewSwitch.tsx` (the two-part control, drawn only; about 40 lines), `components/itinerary/__tests__/itineraryDetailView.test.tsx`.
- **Changes:**
  - `view` state, starting at `"days"` when the screen was given a `jumpToDay` and `"trip"` otherwise.
  - The switch as the first row under the title, in both views. The day-tab strip is drawn only in Days. `flushBottom` on the bar only in Days, where the strip forms its bottom edge.
  - Pressing "Trip" calls `flushSave()` and then sets the view, the same order `handleSwitchDay` uses.
  - Pressing a row sets the view to Days and switches day. `handleSwitchDay` returns early when the day is already the open one, so set the view before that check.
  - The timeline `ScrollView` and `<TripOverview>` are alternates. The modals stay mounted either way.
  - The effect that scrolls today's timeline to "now" is keyed on the trip and the day; add `view`, so reaching today's timeline from the trip view scrolls to now instead of starting at 8 AM.
  - The effect that applies `jumpToDay` also sets the view to Days.
- **Tests first:**
  - a trip opens on the trip view: a row for each day, and none of the timeline's places;
  - "Trip" is the selected half of the switch, and there are no day tabs;
  - pressing "Days" shows Day 1's places and the day tabs, with "Days" selected;
  - pressing the Day 2 row shows Day 2's timeline, with "Day 2" highlighted;
  - opening with `jumpToDay: "day_2"` goes straight to Day 2's timeline;
  - a reorder followed by "Trip" saves the trip, once;
  - with a Christchurch day then a Dunedin day, the Day 2 row reads "Starts with the drive from Christchurch";
  - while the place list is not ready there is no switch, only the loading state.
- **Worked if:** on an iPhone, Plans, open a trip: it opens on the list of days with their towns. Tap Day 2: its timeline opens with the drive block at the top. Tap "Trip": back to the list. Add a place to Day 2 from Explore: the trip opens on Day 2. On an iPhone SE simulator (375×667) both views scroll and nothing is clipped. With VoiceOver each row reads as one sentence and the switch reads as two tabs.

### A4. A second jump to the same trip is honoured (small)

Found while reading, not yet confirmed by a test. `jumpAppliedRef` lets `jumpToDay` apply once for the life of the screen, and the screen for a trip stays mounted. So the second time a place is added to the same trip from Explore, the user would land on whatever was showing before. Until now that was some other day. With the trip view as home it would be the trip view, with no sign of the place just added.

- **Files:** `components/itinerary/ItineraryDetailView.tsx` and its test.
- **Test first:** open the trip with `jumpToDay: "day_2"`, press "Trip", then re-render with `jumpToDay: "day_3"` and a new `jumpToSlot`; the screen shows Day 3's timeline.
- **If that already passes,** the reading was wrong: keep the test, change nothing.
- **Otherwise:** remember the last jump applied (day and slot together) in the ref, not a yes or no, and apply any jump that differs.
- **Worked if:** on a device, add a place to Day 2 from Explore, go back to Explore, add another to Day 3: the trip opens on Day 3.

---

# Part B: the places the app still assumes one city

## The design

### 1. Where the map opens

**Today.** `isInCoverage` tests the user's position against one box around Christchurch. `app/(app)/(tabs)/map/index.tsx` uses the answer twice: to open on the user or on the places, and to select the nearest place or the top featured one. Selecting a place makes `SitesMapView` move to it, so in practice the selected place is where the map ends up. Someone in Dunedin is outside the box, gets the top featured place, which is Riverside Markets in Christchurch, and the map goes there.

**"Here" becomes: within 30 km of any place the map can show.** Worked out from the live places, not entered by hand.

- A hand-entered box per area is one more thing to keep in step with the admin panel. Places are added and re-homed there at any time, and a new town would be "not here" until an app update drew its box.
- Distance to the nearest place is right by construction for every town, including ones added later, and needs no area at all.
- 30 km is one number, in one constant, and a judgement. Against the live list on 2026-10-14 it counts Rolleston (15 km from the nearest place), Rangiora (18), Akaroa (27), Mosgiel (9), Middlemarch (8), Temuka (6) and both airports as here, and Ashburton (46), Waimate (39), Moeraki (44), Oamaru (74) and Queenstown (127) as not. Areas cannot blur into each other: the two closest places in different areas are 120 km apart.

**The nearest town** is the area of the nearest place, at any distance, for anyone on the island. "On the island" is the box the map can already be dragged within (`MAP_BOUNDS`: the South Island and Stewart Island with a margin; Picton is inside it, Wellington is not). The map and Explore both use this, so they always name the same town.

**What each user gets on the map:**

- **Here** (within 30 km of a place): the map opens on them, with the nearest place selected. Unchanged for Christchurch, new for Dunedin and Timaru.
- **On the island, between towns:** the top featured place in the nearest town. Someone in Oamaru gets Dunedin's, someone in Ashburton gets Timaru's. Not the single nearest place: from Oamaru that is a freedom camping area 74 km away, which is a poor way to open a guide.
- **Off the island, or no position:** the top featured place of all, as now. Today that is in Christchurch. Nearest means little from Auckland or Sydney, so this stays one fixed starting point for someone planning from home.

If the nearest place has no area, the user is treated as off the island.

`DEFAULT_CENTER` (central Christchurch) stays. It is only used when there is no position and no place at all.

### 2. The default trip title

"South Island Trip", in the saved title and in the placeholder: "Optional — defaults to South Island Trip". The first draft also proposed naming a trip after the suggested itinerary it was made from; that is dropped, as the simpler answer was the one chosen.

### 3. The town dropdown on Explore

**The title is the town.** The bar's title is the chosen town's name with a chevron after it, and tapping it opens a menu of towns: each area that has at least one active place, with its count, the current one ticked. Known areas come in the order of `AREAS`, any other after them by name. The list always shows one town. There is no "everything" row.

When only one area has places, the title is that town's name with no chevron and no menu.

**The starting town** is the nearest town, as the map works it out (B2): the area of the nearest place, for anyone on the island. The 30 km test plays no part here. Someone in Dunedin gets Dunedin; someone in Oamaru, between towns, also gets Dunedin; someone in Ashburton gets Timaru. With no position, or a position off the island, it is `DEFAULT_AREA`, a new constant in `lib/areas.ts` set to `"christchurch"` (owner, 2026-10-14). If that area has no active places, the first town in the menu is used.

Three rules keep this from fighting the user:

- **A choice by the user always wins.** Once they pick a town from the menu, their position never moves them again while the app is open.
- **The position is read once.** The screen already keeps the first position it gets (`lockedLoc`) so the list does not re-sort as the user walks; the starting town uses that same value. Driving from Timaru to Dunedin with Explore open does not switch towns under them.
- **The choice is not remembered between launches.** Each launch starts from where the user is.

**The position arrives after the list is drawn, on every launch.** The shared location store is held in memory only, so each launch starts with no position, and Explore is the first tab. For anyone whose nearest town is not Christchurch, Explore opens on Christchurch and changes town when the first fix comes in, which can be a second or several. The list already re-sorts at that moment, from by-name to nearest-first, but a change of town and title is more than a re-sort. Someone in Christchurch sees nothing.

This plan accepts that and asks for it to be judged on a device (step B3). If it looks wrong, the fix is small and goes in the same screen: hold the existing "Finding Locations..." state until the first fix, the permission is refused, or about a second and a half has passed, whichever is first. It is left out for now because it delays the list for everyone, Christchurch included, to spare the others a flicker.

**How it sits with the other two controls:**

- **Category tabs** are built from the places in the chosen town, so no tab is ever empty. If the chosen category has no places in a newly chosen town, the category goes back to All.
- **Search** looks inside the chosen town and category, as it combines with the category today. When it finds nothing, the message names the town: "No Locations in Christchurch match your search."

**A place with no area** would belong to no town and so never appear on Explore. All 96 live places have one, but the admin panel does not require it. So that such a place cannot vanish, the menu gains a last row, "Other", only while at least one active place has no area.

The word "Locations" stays in the empty and search messages; `TASKS.md` says that wording is being decided separately.

### Sketch: Explore

```
┌───────────────────────────────────────────┐
│ Christchurch ▾                ▢   ⌕   ▯   │  guide, search, saved
│ All   Scenic   Adventure   Walks   Water  │  Christchurch's categories only
│ ▔▔▔   ──────   ─────────   ─────   ─────  │
├───────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐ │
│ │ Christchurch Botanic Gardens ┌──────┐ │ │
│ │ Twenty-one hectares of       │ photo│ │ │
│ │ gardens in a loop of...      │      │ │ │
│ │ ➤ 1.2 km                     └──────┘ │ │
│ └───────────────────────────────────────┘ │

  tapping the title:

│ ┌──────────────────────────┐              │
│ │ Christchurch      46   ✓ │              │
│ │ Dunedin           35     │              │
│ │ Timaru            15     │              │
│ └──────────────────────────┘              │

  after choosing Dunedin:

│ Dunedin ▾                     ▢   ⌕   ▯   │
│ All   Walks   Nature   Attractions   Water│  only Dunedin's categories
```

The bar is no taller than today's.

### 4. The sweep: other one-city assumptions

| # | Where | What it assumes | Recommend |
|---|---|---|---|
| 1 | `app/(app)/(tabs)/map/index.tsx` (`HOT_WATER_BEACH_ID`, about lines 34 and 110 to 122) | A warning about the Tarawera Trail, carried over from the Rotorua app. That id is not in this app's places, so it never fires. The wrong city, not one city. | **Fix now** (in B2, which is already in this file). Delete it. |
| 2 | `app/(app)/saved-sites.tsx` | Lists saved places from every town together, with category tabs and no town on the row. | **Fix now, in part** (B4): name the town on each row. No dropdown: the list is short and the user built it. |
| 3 | `app/(app)/(tabs)/sites/[siteId]/index.tsx` (the line of facts under the title) | The place page shows rating, category, price and website, never the town. | **Fix later**, small: one more fact on that line. |
| 4 | `components/itinerary/AddToTripModal.tsx` (the day pills) | "Day 1", "Day 2", "Day 3" with nothing to say which town each day is in. Adding a Dunedin place, the user has to remember which day is the Dunedin one. | **Fix later**, after Part A: `tripSummary` gives each pill its towns. |
| 5 | `lib/itineraryTemplates.ts` | Both suggested itineraries are Christchurch. | **Fix later.** This is release 1.3 in `TASKS.md`: it needs content and re-baked times, and the templates test already fails a template that crosses areas without them. |
| 6 | `lib/guideContent.ts` | Region sections exist for Canterbury only, and they are about Christchurch; nothing for Dunedin & Otago Coast, and nothing specific to Timaru. | **Fix later.** It is writing, not code: the guide screen already lists whichever regions have sections. |
| 7 | `app/(app)/(tabs)/itinerary/index.tsx`, `components/account/ItinerariesCard.tsx` | A trip card shows title and dates, not where the trip goes. | **Leave.** Naming the towns there means loading the place list on two more screens. Reconsider if testers ask. |
| 8 | `components/map/MapOverlay.tsx` (the `metaLine`, about line 168) | Prints the place's region id, upper-cased, beside the category: "FOOD · CANTERBURY", "FOOD · DUNEDIN-OTAGO". | **Leave** (owner, 2026-10-14: not a bug). |
| 9 | `components/map/MapRegion.ts` (`DEFAULT_CENTER`) | Central Christchurch. | **Leave.** Only used with no position and no places. |
| 10 | `app/(app)/(tabs)/map/index.tsx` (`initialRegion`) | With no "here" it frames every place, which is now the whole east coast. | **Leave.** The map moves to the selected place straight away. See "Not confirmed". |
| 11 | `lib/categoryImages.ts` | One default photo per category for every town. 55 of the 96 live places have no photo of their own. | **Leave, but look.** If a default is recognisably a Christchurch scene it will sit on Dunedin places. I did not look at the images. |
| 12 | `components/map/MapOverlay.tsx` (nearby places), `components/share/CaptureCanvas.tsx` ("South Island") | Nearest three places from any town; the share card names the island. | **Leave.** Distance keeps the first local, and the second is already island-wide. |
| 13 | `scripts/upload-places.js` | Defaults to the Christchurch file. | **Leave.** Tooling, and it takes a file name. |

Not a code change: when B1 and B2 ship, the first item under "Bugs and gaps found on device" in `TASKS.md` (the four things that assumed one city) can be closed. Drive times closed the fourth.

## Steps

### B1. The default trip title (small)

- **Files:** `components/itinerary/CreateItineraryModal.tsx`, `components/itinerary/__tests__/createItineraryModal.test.tsx`.
- **Change:** "Christchurch Trip" becomes "South Island Trip" in `resolvedTitle` and in the placeholder.
- **Tests first:** an untitled trip is saved as "South Island Trip"; a typed title still wins, trimmed; the placeholder names the default. Two existing tests look for "Christchurch Trip" and change with it.
- **Worked if:** on a device, create a trip without typing a name; the trip screen's bar reads "South Island Trip".

### B2. "Here" is near a place (medium)

- **Files:** `lib/utils/geoDistance.ts`, `lib/utils/__tests__/geoDistance.test.ts`, `components/map/MapRegion.ts`, `app/(app)/(tabs)/map/index.tsx`, `components/map/__tests__/sitesMapView.test.tsx`, `app/(app)/(tabs)/map/__tests__/map.test.tsx`.
- **Change:** in `MapRegion.ts`, remove `COVERAGE_BOUNDS` and `isInCoverage`. In `lib/utils/geoDistance.ts`, beside `distanceMeters`, add

  ```ts
  export const NEAR_PLACES_METERS = 30_000;
  export function nearestSite<T extends { lat: number; lng: number }>(
    lat: number, lng: number, sites: T[],
  ): { site: T; meters: number } | null;
  ```

  They sit with `distanceMeters` because they are plain distance sums with nothing of the map in them. In `MapRegion.ts`, which holds the island's box, add `isOnIsland(lat, lng)`, a test against `MAP_BOUNDS`, and

  ```ts
  // The area of the place nearest a position on the island, or undefined off it,
  // with no position, or when that place has no area.
  export function nearestArea(
    lat: number | null | undefined, lng: number | null | undefined,
    sites: { lat: number; lng: number; area?: string }[],
  ): string | undefined;
  ```

  In the map screen, work out the nearest visible place once. "Here" is a position, a nearest place, and `meters <= NEAR_PLACES_METERS`; the initial region reads that as it read `isInCoverage`. The selection has three cases: here, the nearest place; otherwise, with a `nearestArea`, the top featured place among the visible places in that area; otherwise the top featured place of all. It no longer sorts every place by distance: the nearest is already in hand. Update the comment at the top of `MapRegion.ts`, which still says v1 is Christchurch only, and keep a `// ponytail:` note on the constant naming it as a judgement to tune.

  In the same file, delete `HOT_WATER_BEACH_ID` and the alert around it (sweep item 1), so `handleAddToItinerary` goes straight to its add flow.
- **Tests first:**
  - `nearestSite` returns the closest place and its distance, and null for an empty list (in `geoDistance.test.ts`);
  - a visitor in central Dunedin, with a Dunedin place among the fixtures, gets that place selected (this fails today: they get the featured Christchurch one);
  - `isOnIsland` is true for Christchurch, Picton and Oban and false for Wellington and Auckland;
  - `nearestArea` gives "dunedin" from Oamaru, and undefined from Auckland, with no position, and when the nearest place has no area;
  - a visitor in Oamaru, 74 km from anything, gets Dunedin's top featured place, not the nearest place and not Christchurch's (the fixtures gain two Dunedin places, the featured one farther from Oamaru);
  - the existing three (Auckland gets the featured place, Sumner gets Sumner Beach, location denied gets the featured place) still pass, as do the add-to-itinerary tests;
  - in `sitesMapView.test.tsx`, the test "still counts only the area with places as 'here'" is removed; the `nearestSite` tests replace it.
- **Worked if:** on a device or simulator with the location set to Dunedin (the Octagon, -45.874, 170.504), the map opens on the nearest Dunedin place. Set to Oamaru (-45.10, 170.97), it opens on a featured Dunedin place. Set to Christchurch, as before.

### B3. Explore: the town dropdown (medium)

Needs B2, for `nearestArea`.

- **Files:** `lib/areas.ts` and its test, `components/layout/TopBar.tsx`, new `components/sites/AreaMenu.tsx` and its test, `app/(app)/(tabs)/sites/index.tsx`, `app/(app)/(tabs)/sites/__tests__/sitesList.test.tsx`.
- **Changes:**
  - `DEFAULT_AREA` in `lib/areas.ts`, typed as an `AreaId`, with the comment described above.
  - `TopBar` takes an optional `onTitlePress`. With it, the title is a button with a `ChevronDown` after the text and the screen-reader label "{title}, choose a town". Without it, nothing changes for the other screens.
  - `AreaMenu`: a transparent `Modal` holding a white card of rows (label, count, a tick on the current one), dismissed by tapping outside. Model it on the trip menu in `ItineraryDetailView.tsx` (`menuOverlay`, `menuCard`, `menuRow`), aligned left under the title.
  - The screen holds the user's choice, empty until they make one. The town shown is their choice, or else `nearestArea` (from `components/map/MapRegion.ts`) for `lockedLoc`'s latitude and longitude over the active places, or else `DEFAULT_AREA`, or else the first town with places. Work it out during render from those values; do not copy the position's town into state with an effect.
  - The towns offered, the category tabs and the list are all worked out from the active places, in that order: town, then category, then search.
- **Tests first** (the fixtures gain an `area`, `lat` and `lng`, and the test file's stand-in for `useUserLocation` gains a position it can be given; the tests that look for the title "Locations" change to the town's name):
  - with no position the screen opens on Christchurch: its rows only, and the title "Christchurch";
  - with a position in central Dunedin it opens on Dunedin;
  - with a position in Oamaru, between towns, it opens on Dunedin, the nearer;
  - with a position in Auckland, off the island, it opens on Christchurch;
  - a position that arrives after the first draw moves the screen from Christchurch to Dunedin;
  - after the user picks Timaru, a position in Dunedin does not move them;
  - with no Christchurch places and no position it opens on the first town that has some;
  - with places in two areas the title is a button; with one, it is plain text and there is no menu;
  - the menu offers only areas that have an active place, in `AREAS` order, each with its count, and no "everything" row;
  - choosing Dunedin leaves only Dunedin's rows and makes the title "Dunedin";
  - the category tabs are then only Dunedin's;
  - a chosen category is kept when Dunedin has it, and goes back to All when it does not;
  - search looks inside the chosen town, and a search with no match names the town;
  - an area the app has no label for is offered under its id;
  - a place with no area is reachable under "Other", and "Other" is absent when every place has an area.
- **Worked if:** on a device in Christchurch, or with location off, Explore opens titled "Christchurch ▾" with 46 places (or whatever is live that day); the menu offers Dunedin and Timaru with their counts; choosing one changes the list and the category tabs. With the location set to Dunedin (the Octagon, -45.874, 170.504) and the app restarted, Explore opens titled "Dunedin ▾" and the map opens on Dunedin. On an iPhone SE simulator the bar is no taller than before and the menu fits above the tab bar. **To judge on the device:** with the location set to Dunedin, cold-start the app several times and watch Explore change from Christchurch to Dunedin. If that reads as a glitch, add the short wait described in the design.

### B4. Saved places name their town (small)

- **Files:** `components/sites/list/ListItem.tsx`, `components/sites/list/__tests__/listItem.test.tsx`, `app/(app)/saved-sites.tsx`, `app/(app)/__tests__/savedSites.test.tsx`.
- **Change:** `ListItem` takes an optional `area` label and draws it before the distance, in `text2`: "Dunedin · 3.2 km". With no distance it stands alone. Saved places passes `areaName(location.area)` when the saved places span more than one area. Explore does not pass it: its list is always one town, named in the title.
- **Tests first:** a row given an area shows it, and shows nothing extra without one; saved places shows towns when they span two areas and not when they are all in one.
- **Worked if:** on a device, save a place in Christchurch and one in Dunedin; each saved row ends with its town.

## Parked

- **Remembering the town a user last chose on Explore.** Each launch starts from where they are, or Christchurch. Someone at home planning a Dunedin trip picks Dunedin again each time they open the app. Remembering it needs somewhere to keep it, and a rule for when the remembered town should give way to the one they are standing in.
- **What the fallback town should be once the whole island is in.** Christchurch for now.
- **A way to see every town at once on Explore.** Not wanted now. If search across towns is missed, the smallest version is a line under an empty search result: "2 in Dunedin".
- **A trip-wide driving total** on the trip view, for when real drive times land.

## Rough sizes

In build order.

| Step | What | Size |
|---|---|---|
| 0 | `areaName` | small |
| B1 | Default trip title | small |
| B2 | "Here" is near a place, and the Rotorua leftover | medium |
| A1 | `tripSummary` | small |
| A2 | Trip view component | medium |
| A3 | The switch, and opening on the trip view | medium to large |
| A4 | Second jump | small |
| B3 | Explore town dropdown | medium |
| B4 | Saved places name their town | small |

A3 is the one to take slowly: `ItineraryDetailView` saves through refs and has had save-ordering bugs before, and this step changes what its 40 existing tests start from.

## Risks

### Checked

- **The tests and the type check pass before any of this.** Run 2026-10-14 with `node node_modules/jest/bin/jest.js` and `node node_modules/typescript/bin/tsc --noEmit`: 45 suites, 557 tests passed, 4 todo, no type errors.
- **The live place list.** `GET https://api.blacksands.app/v1/southislandguide/locations` on 2026-10-14: 96 places, all active, all with an area (46 christchurch, 35 dunedin, 15 timaru) and a region (`canterbury` for Christchurch and Timaru, `dunedin-otago` for Dunedin). 41 have a photo.
- **How far apart the towns' places are.** The two closest places in different areas are 120 km apart (Orana Wildlife Park and Talbot Forest Scenic Reserve). Within an area the most isolated place is Sutton Salt Lake, 43 km from its nearest neighbour. The town distances quoted in B2 were worked out from the same list.
- **The single trip drawn inside the Plans tab cannot happen today.** `lib/hooks/useEntitlementGate.ts` is a stand-in that entitles everyone, and the list screen's tests pin that every user gets "My Trips".
- **The trip view can never be drawn against an empty place list.** `ItineraryDetailView` returns its loading or error state before the bar when the list is not ready.
- **Selecting a place moves the map to it.** `SitesMapView`'s effect on `selectedSiteId` calls `animateToRegion` on the place.
- **The top featured place is in Christchurch.** Riverside Markets, `featured` 44; the next highest is 8.
- **`77e801056ee1453ebfb1`** (the Rotorua leftover) is not among the live places.
- **The user's position is not kept between launches.** The shared location store (`createLocationStore` in the installed `@blacksands/hooks`) is a plain in-memory store, so every launch starts without one.
- **Everything is JS only.** `Car`, `ChevronRight`, `ChevronDown` and `Check` are already imported from `lucide-react-native` elsewhere in the repo. No new package, no native change.

### Not confirmed

- **Anything on a device.** The look of the switch and the rows, the menu's position under the title, VoiceOver order, and the 375×667 checks all need a simulator or a phone. The heights quoted in Part A are added up from the styles, not measured.
- **That a second jump is ignored** (A4). It follows from reading `jumpAppliedRef`; step A4 starts by proving it with a test.
- **The map's opening sequence on a real phone.** From the code it frames a region and then moves to the selected place. Whether a user sees the whole east coast for a moment first, I could not tell.
- **30 km.** It sorts today's towns sensibly. It is still a judgement, not a measurement of anything. It now only decides whether the map opens on the user or on a town.
- **Which Dunedin and Timaru places are featured.** Checked live: Dunedin has four with a `featured` value (the highest is St Clair Hot Salt Water Pool, 4) and Timaru two (Caroline Bay, 2). Whether those are the places you would want the map to open on, I cannot judge.
- **The category default photos** (sweep item 11). Not looked at.
- **The three drive times** are still from memory, as in the last plan. The trip view repeats them in a second place.
- **Android** was not considered, as before.

### Known consequences

- **A trip now opens on its trip view,** one tap further from the timeline than today for a user who wants to edit a day. Adding a place from Explore or the map still lands on the day.
- **The trip view is where the morning drive shows up for the whole trip.** A run of days in alternating towns reads as a lot of driving, because it is. That is the design.
- **Outside Christchurch, Explore opens on Christchurch and changes town a moment later, on every launch,** when the first position comes in. The fix, if it looks wrong on a device, is described in Part B, design 3.
- **"Nearest town" is by straight line, not by road.** It reads right for today's three towns down one coast. Once the island fills in, a town across a range can be nearer on the map and further to drive.
- **Someone in Ashburton gets Timaru,** 46 km from its nearest place, though Christchurch is the bigger town and about as far by road.
- **Explore search only finds places in the chosen town.** Searching "albatross" while on Christchurch finds nothing, and the message says so by naming the town.
- **An unknown place between two towns** (deactivated after it went into a trip) breaks the drive in two flat half hours. The row then shows "Christchurch → Dunedin" with no driving time. Accepted in the last plan for the timeline; the trip view inherits it.
- **A town added in the admin panel before the app knows it** shows under its id in lower case ("oamaru") in the Explore menu and the trip view, and has no drive time. The fix is one line in `lib/areas.ts` and an update.
- **For 1.4 (in-app purchases).** The api strips `area` from a premium place for a user without the unlock. The last plan noted that this loses drive times. It would also move those places out of their town and into "Other" on Explore, take them out of the trip view's towns, and leave Explore unable to tell which town the user is in when the nearest place is a locked one. Same fix, outside this work: add `"area"` to `TEASER_FIELDS` in `enginev1/api/src/routes/locations.ts`.
- **The Explore choice is not remembered** between launches.

## Not in scope

Real drive times from a maps service; letting the user choose where they sleep; in-app purchases; new suggested itineraries; guide sections for Dunedin and Timaru; remembering the Explore choice between launches; an area filter on the map.
