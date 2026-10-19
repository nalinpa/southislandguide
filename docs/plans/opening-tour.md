# Plan: the opening tour

Written 2026-10-19. Brief: `prompts/plan-opening-tour.md`. Launch plan item C4 (`docs/plans/launch.md`). Line numbers below were right on this date and drift; confirm each before relying on it.

## What it is

The first time someone reaches the app's main screens, the screen dims and a short card points at one thing at a time: where to pick a town, where to browse, how a place works, what a trip looks like, the map. A handful of taps; Skip at any point.

The machinery comes from Rotorua (`rotorua-guide/lib/tour/`, about 600 lines with its test), copied into this repo and changed where this app differs. The steps and the wording are new.

## Decisions (owner, 2026-10-19)

| Question | Decision |
|---|---|
| 1. Who sees it | **Everyone, guests included.** Guests see the trip preview in the card, as in Rotorua, not a step on the sign-in card. |
| 2. The steps and wording | **As in the table.** |
| 3. Mention the unlock | **No.** Nothing in the tour about the unlock, or about anything being free. |
| 4. The card's look | **White card, burnt-orange Next, dark teal dim.** |
| 5. Run it again | **Yes, "Show me around" on Profile.** |
| 6. When it starts | **First time on the main tabs, signed in or guest, after the location prompt is answered.** |

With decisions 1 and 3, step 6 has one wording for everyone, and there is no guest step on Plans (the `tripGuest` row and its target are gone).

## The steps

`free` is a signed-in user without the unlock, `paid` one with it, `guest` someone who chose "Continue as Guest". Bodies are kept to Rotorua's 4 to 12 words.

| # | id | Screen | Points at | Title | Body | Who |
|---|---|---|---|---|---|---|
| 1 | `town` | Explore | the title (the town, with its chevron) | Pick a Town | You start in the nearest town. Tap here to see another. | all |
| 2 | `guide` | Explore | the book button in the top bar | Before You Go | Driving, weather and safety, from people who live here. | all |
| 3 | `browse` | Explore | the category tabs | Browse by Type | Walks, food, beaches and more. Search is up top. | all |
| 4 | `place` | Explore | the first place in the list | Tap a Place | Photos, hours, directions and reviews, all in one place. | all |
| 5a | `placeAdd` | that place | "+ Add to Itinerary" | Add It to a Trip | Drop it into any day. We work out the drive. | paid |
| 5b | `placeSave` | that place | the heart (save) | Save It for Later | Tap the heart to keep it on your list. | free |
| 6 | `trip` | Plans | a preview card (below), no spotlight | Your Trip, Day by Day | Each day's towns and the drives between, worked out for you. | all |
| 7 | `map` | Map | the whole map, lightly dimmed | See It on the Map | Every place around you. Tap a pin for details. | all |

**What a new user has no trip for.** Step 6 can't point at a real trip, because a new user has none. Recommended: a **preview inside the card**. It is the real trip view (`TripOverview`) showing a fixed two-day sample, a Christchurch day, then a Dunedin day that opens with the drive, so it shows exactly what they'll get. That is Rotorua's approach (its `ItineraryMockPreview`), using this app's own component instead of a mock. The alternatives were worse: making a sample trip in their account leaves something to delete, and a card with no picture says little.

**Left out, and why:**

- **Dragging stops and drives, the Trip | Days switch, swiping between days.** All on the day timeline, which a new user can't reach without a trip, and editing needs the unlock. The preview's body points at the timeline ("Tap a day for its timeline"); the rest is found by using it.
- **Saved places and search** as steps of their own: they are one button each in a bar step 2 already shows, and step 3's body mentions search.
- **The town sheet itself.** Step 1 points at the title; opening a sheet mid-tour would need closing again, and the sheet explains itself.
- **Profile.** Nothing there a newcomer needs first; the guide is reached from step 2.

## Sketches

375 × 667 (iPhone SE). Recommended look: white card, burnt-orange Next, dark teal dim.

Step 1, `town`, on Explore:

```
┌───────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░[Skip Tour]░│  dim, Skip top right
│░┌──────────────────┐░░░░░░░░░░░░░░░░░░░░░│
│░│ Christchurch ▾   │░░░░▢░░░⌕░░░▯░░░░░░░░│  the title, lit
│░└──────────────────┘░░░░░░░░░░░░░░░░░░░░░│
│░░┌─────────────────────────────────────┐░░│
│░░│ Pick a Town                         │░░│  white card
│░░│ You start in the nearest town. Tap  │░░│
│░░│ here to see another.                │░░│
│░░│                                     │░░│
│░░│ ━ ● ● ● ● ● ●           [  Next  ]  │░░│  dots; orange Next
│░░└─────────────────────────────────────┘░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
├───────────────────────────────────────────┤
│   Explore     Plans      Map     Profile  │  (dimmed too)
└───────────────────────────────────────────┘
```

Step 6, `trip`, on Plans, with the preview in the card:

```
┌───────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░[Skip Tour]░│
│░░┌─────────────────────────────────────┐░░│
│░░│ ┌─────────────────────────────────┐ │░░│  the real trip view,
│░░│ │ ▣ Day 1 · Sat 14 Feb          › │ │░░│  sample days, scaled down
│░░│ │   Christchurch · 4 places       │ │░░│
│░░│ ├─────────────────────────────────┤ │░░│
│░░│ │ ▣ Day 2 · Sun 15 Feb          › │ │░░│
│░░│ │   Dunedin · 3 places · 5 hours  │ │░░│
│░░│ │   driving                       │ │░░│
│░░│ │   (car) Starts with the drive   │ │░░│
│░░│ │   from Christchurch             │ │░░│
│░░│ └─────────────────────────────────┘ │░░│
│░░│ Your Trip, Day by Day               │░░│
│░░│ Each day's towns and the drives     │░░│
│░░│ between, worked out for you.        │░░│
│░░│ ━ ━ ━ ━ ━ ● ●           [  Next  ]  │░░│
│░░└─────────────────────────────────────┘░░│
├───────────────────────────────────────────┤
│   Explore     Plans      Map     Profile  │
└───────────────────────────────────────────┘
```

Step 7, `map`: lighter dim, card near the bottom, button reads **Done**, no Skip.

## The design

**Copied from Rotorua, then changed.**

- **Copied as is:**
  - `useTourTarget` (a screen spreads `{ ref, onLayout }` onto the thing a step points at; it measures and registers it, and re-measures when its step comes up);
  - `useTourStepRoute` (a screen hands the tour a route for a step on a non-tab screen: here, the first place in Explore's list);
  - the core of `TourContext`: steps, start / next / skip, moving to a tab with `router.navigate`, or pushing a registered route.
- **Changed:**
  - **Steps depend on who is looking.** Each step lists who sees it: step 5 is the add button for paid, the heart for free, and nothing for a guest. `TourProvider` takes the audience (guest, free, paid) and walks only that person's steps.
  - **The "seen" flag** is `southislandguide:tourSeen`, set when the tour starts, as Rotorua does: someone who kills the app mid-tour isn't shown it again.
  - **How it starts** (below).
  - **The overlay's look and its screen-reader behaviour** (below).
- **New:**
  - the steps and wording;
  - the trip preview (the real `TripOverview` with a fixed sample trip, taking no place list from the network);
  - the "Show me around" row on Profile.

**When it starts.** Rotorua starts the tour when the user is signed in **and** it is the first app start-up (`openCount === 1`). That misses anyone who opens the app once, leaves at the login screen, and signs in on a later start-up: they never get the tour. Here the "seen" flag alone decides, and the tour starts when all of these hold:

- the session has resolved to signed in or guest (not loading, not on the login screen);
- the main tabs are showing;
- the flag isn't set;
- **the location prompt has been answered.** Explore asks for location as soon as it opens (`useUserLocation({ autoRequest: true })`, `app/(app)/(tabs)/sites/index.tsx:34`), so on first sign-in the system's location alert appears at once. The tour waits until the permission is no longer "undetermined": checked with `Location.getForegroundPermissionsAsync()` on mount and each time the app becomes active again. The alert makes the app inactive and then active while it is up, so answering it is itself the cue. Step 1 also says "You start in the nearest town", which only makes sense once the location question has been answered.

`useAppOpenCount` (now being added for the review prompt) isn't needed by the tour.

**The overlay.**

- **Kept from Rotorua:** a full-screen layer that takes every touch, so nothing behind can be tapped mid-tour; an SVG dim with a rounded cut-out that glides between targets; the card placed above or below its target depending on room (re-measured per step, since the preview card is tall).
- **Changed:**
  - **Look:** a white card with dark text and a burnt-orange Next with white text; a dark teal dim; the current dot in the highlight; Skip as a white outlined pill on the dim.
  - **Screen reader:** the layer is marked as a modal (`accessibilityViewIsModal`), so VoiceOver can't wander onto the dimmed screen. The title is a header and is announced when each step appears. Next (or Done) and Skip are buttons with plain labels. Skip is on every step but the last, where Done does the same.
  - **Fallback:** a step whose target hasn't registered (a list still loading, a town with no places) shows the card centred with no cut-out, as Rotorua's does. If the target arrives later the cut-out glides to it.
- **At 375 × 667:**
  - the card is at most the screen height less the safe areas and 32pt, and the preview inside it scrolls if needed, so Next is never pushed off the screen;
  - the card's buttons are at least 44pt tall.

**Getting each target.**

| Step | Who registers it | How |
|---|---|---|
| `town` | Explore, through `TopBar` | `TopBar` takes an optional `titleTarget` (the `{ ref, onLayout }` from `useTourTarget`) and spreads it onto the title button |
| `guide` | Explore | a `View` around the book `AppIconButton` (the kit's button can't take a ref) |
| `browse` | Explore | a `View` around `TopBarTabs` |
| `place` | Explore, through `ListView` | the first row only: `ListView` takes a `firstRowTarget` and passes it to that row |
| `placeAdd`, `placeSave` | the place screen | a `View` around "+ Add to Itinerary", and one around the heart in `QuickActions` |
| `trip`, `map` | nobody | the card is the content; no cut-out (`trip`), or a light dim over the whole map (`map`, `dim: 0.4`) |

Explore registers the route for steps 4 and 5 with `useTourStepRoute("place", ...)`: the first place in the list of the town being shown.

**Things this app does that the tour must live with.**

- **Tab screens stay mounted**, and the place screen is keyed on its id: moving with `router.navigate` / `router.push`, as Rotorua does, works with that.
- **Leaving a place:** step 6 navigates to Plans from the place screen, which stays in Explore's tab history; going back to Explore later shows that place. Rotorua behaves the same.
- **The town sheet, the Days view and the paywall** are never opened by the tour.

## Build steps

Each step leaves `npm test` and `npx tsc --noEmit` passing.

1. **The engine** (medium).
   - **Files:** new `lib/tour/TourContext.tsx`, `useTourTarget.ts`, `useTourStepRoute.ts`, `lib/tour/__tests__/TourContext.test.tsx`; all copied from Rotorua, then changed for audiences and the new seen key.
   - **Tests first** (start from Rotorua's test):
     - starts inactive;
     - `start()` shows the audience's first step;
     - `next()` walks only that audience's steps, then finishes;
     - `skip()` ends it;
     - a step with a tab navigates to it;
     - a step with a route pushes the registered route, and does nothing if none is registered;
     - a registered target is the current step's rect.
   - **Worked if:** tests pass; nothing visible yet.
2. **The steps** (small).
   - **Files:** new `lib/tour/tourSteps.ts` and its test.
   - **Tests first:**
     - a guest gets 6 steps, free and paid 7;
     - each audience gets the words in the table;
     - every step that points at something has a screen that registers it: a test listing the ids each screen registers, so a renamed id fails.
3. **The overlay** (medium).
   - **Files:** new `lib/tour/SpotlightOverlay.tsx` and its test.
   - **Tests first:**
     - nothing renders while inactive;
     - the title and body show;
     - Next moves on; Skip ends;
     - the last step says Done and has no Skip;
     - the layer is a modal for screen readers, the title a header, both buttons labelled;
     - with no target the card is centred.
4. **The trip preview** (small).
   - **Files:** new `lib/tour/TourTripPreview.tsx` and its test.
   - **Tests first:** it shows two days, Christchurch then Dunedin, with "Starts with the drive from Christchurch"; it needs no network (a fixed place lookup).
5. **Targets on Explore** (medium).
   - **Files:** `components/layout/TopBar.tsx`, `components/sites/list/ListView.tsx`, `app/(app)/(tabs)/sites/index.tsx`, and their tests.
   - **Tests first:**
     - `TopBar` spreads `titleTarget` onto the title button;
     - `ListView` gives `firstRowTarget` to the first row only;
     - Explore registers `town`, `guide`, `browse` and `place`, and the route of the first place.
6. **Targets on the place screen** (small).
   - **Files:** `app/(app)/(tabs)/sites/[siteId]/index.tsx`, `components/sites/detail/ActionsBar.tsx`, and their tests.
   - **Tests first:**
     - the place screen registers `placeAdd` when "+ Add to Itinerary" shows, and `placeSave` on the heart.
7. **Starting it** (small).
   - **Files:** `app/_layout.tsx` (mount `TourProvider` and `SpotlightOverlay` inside `AppProviders`, so it can read the session and the unlock), a new `lib/tour/TourAutoStart.tsx` and its test.
   - **Tests first:**
     - doesn't start while the session is loading or on the login screen;
     - doesn't start while location is undetermined;
     - starts once both have settled;
     - never starts again once seen;
     - picks the audience from the session and the unlock.
   - `app/_layout.tsx` is being changed for the review prompt right now. Do this step after that lands.
8. **Show me around** (small).
   - **Files:** `app/(app)/(tabs)/account.tsx` and its test.
   - **Tests first:** the row starts the tour from step 1, for the current audience.
9. **On a phone** (check, no code).
   - Fresh install on an iPhone SE simulator and on a phone; once as a guest, once free, once paid.
   - Every cut-out on its target, every card on screen, Next always reachable.
   - VoiceOver: reads the card, can't reach the screen behind, Skip works.
   - The location alert never sits over the tour.

## Risks

### Verified (2026-10-19)

- **Rotorua's tour:** about 600 lines with its test.
  - It starts on `loggedIn && openCount === 1` (`rotorua-guide/app/_layout.tsx`).
  - It marks itself seen when it starts (`rotoruaguide:tourSeen`, in `TourContext.tsx`).
  - Its overlay has no accessibility props: no modal marking, no roles or labels on Skip and Next.
  - It shows its itinerary mock only on the `plansPreview` step.
- **Installed here:** `react-native-svg`, `react-native-reanimated` and AsyncStorage, so the tour is JS only.
- **Explore and the Map** both ask for location on opening (`useUserLocation({ autoRequest: true })`).
- **Explore is the first tab**, so it is where a newly signed-in user lands.
- **The place screen** shows "+ Add to Itinerary" only to signed-in users, for places that can go in a trip (`[siteId]/index.tsx:254`). The save heart is in `QuickActions` (`components/sites/detail/ActionsBar.tsx`).
- **Plans shows a guest** the "Sign In to Plan a Trip" card (`itinerary/index.tsx:38`).
- **`useAppOpenCount` and the review prompt** are being added in uncommitted changes to `app/_layout.tsx` (2026-10-19). The tour's change to that file has to follow them.

### Assumed

- **The location alert takes the app inactive and back to active**, so checking the permission on each return to active catches the answer. If it doesn't on some iOS version, a short re-check after the first check would.
- **The kit's `AppIconButton` can't take a ref**, hence the wrapping `View`s. If it does forward refs, they can go.
- **Free and paid are told apart by the real unlock code** (launch item C1). Until it lands, the stand-in treats everyone as paid, so the free wording can only be tested by forcing the audience in a test.
- **The preview fits the card at 375 × 667** with two days. If not, one day plus the drive line, or the card scrolls.
