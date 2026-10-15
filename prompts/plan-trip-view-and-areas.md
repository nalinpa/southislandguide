# Plan: a trip view with the towns for each day, and the places the app still assumes one city

You are planning two pieces of work for South Island Guide, an Expo / React Native travel app in this repo. **Produce a plan only.** Do not edit code, commit, build, or change anything outside this repo. The owner will read the plan, answer its questions, and then have it built.

## Background

The app launched its content with Christchurch only. Places in Timaru and Dunedin are now live, and every place carries an `area`: the base town it is visited from. The planner was updated on 2026-10-14 to know about areas: a hop between two areas takes that pair's drive time, and the day timeline draws it as a "Drive to Dunedin" block. That work is described in `docs/plans/area-drive-times.md` and `IMPLEMENTATION_SUMMARY.md`; read both first.

Two things are left.

## Part A: the trip view

The owner's words: "a new view to itinerary which has the city/cities per day".

Today a trip opens on the **day timeline** (`components/itinerary/ItineraryDetailView.tsx`): day tabs across the top and an 8 AM to 10 PM grid for the open day. There is no way to see the whole trip at once. The trip view is that overview: one row per day, saying which town or towns the day is in.

Already decided:

- The towns are **derived** from the places in each day. The user does not choose a town for a day, and nothing new is stored in the trip.
- It names areas using the labels in `lib/areas.ts`, the same ones the drive block uses.

Not decided, and for the plan to recommend:

1. **Where it lives and how the user reaches it.** A switch on the trip screen between the overview and the day timeline, a screen of its own, or something else. Account for the case where a user with one trip never sees the trip list: `app/(app)/(tabs)/itinerary/index.tsx` renders that single trip inline.
2. **What a row shows.** At least the day number, the date, and the town or towns in the order they are visited. Consider the number of places, the drives in the day and their length, and a day that opens with a drive from the town before. Say what an empty day shows, and what a day shows when one of its places has no area or is no longer in the place list.
3. **What tapping a row does.** The day timeline already accepts a day to jump to.
4. **Whether the view shows anything for the trip as a whole,** such as total driving time. Recommend for or against; do not add it just because it is possible.
5. **How it gets its data without a second copy of the logic.** The drive-times work left helpers for exactly this. The place list loads after the trip does, so say what the view shows while it waits and when the list failed to load.

## Part B: the places the app still assumes one city

Three are known. For each, say what should happen now that there are several areas, and recommend one answer.

1. **Where the map opens.** `components/map/MapRegion.ts` has one fixed box around Christchurch (`COVERAGE_BOUNDS`) and a default centre there. `app/(app)/(tabs)/map/index.tsx` uses the box twice: to decide whether to open on the user's position or on the places, and to decide whether to select the nearest place or a featured one. Someone standing in Dunedin is treated as outside the app's coverage. The file's own comment says the box should become a per-area lookup. Decide what "the user is somewhere the app has places" means with several areas, and whether that is worked out from the live places or entered by hand.
2. **The default trip title.** `components/itinerary/CreateItineraryModal.tsx` names an untitled trip "Christchurch Trip" and says so in its placeholder.
3. **Explore has no way to pick an area.** `app/(app)/(tabs)/sites/index.tsx` lists every place together, with category tabs and a search. With 96 places in three towns the list mixes them. Decide how an area choice sits alongside the category tabs and the search, what the default is (everything, or the area the user is in), and that only areas with places are offered.

Then **sweep the app for other one-city assumptions** and list each with its file. Do not plan them all: for each, recommend fix now, fix later, or leave. Candidates already noticed: the suggested itineraries are both Christchurch, the travel guide has region sections for Canterbury only, and the saved-places screen.

## What exists today

Checked on 2026-10-14. Line numbers drift, so confirm before relying on any.

- `lib/areas.ts`: `AREAS` (christchurch, timaru, dunedin), `AREA_LABELS`, `areaLabel(id)`, `areaDriveMinutes(a, b)`.
- `lib/utils/itineraryPhysics.ts`: `packTrip`, `dayLegs` (the legs of a day, each with its start, length and, for a drive, the two areas), `dayStartSiteId` (where the traveller was before a day), `tryEdit`.
- `lib/hooks/usePlaceLookup.ts`: the live place list as a lookup by id, with `ready`, `count`, `err` and `refresh`.
- `lib/models.ts`: `Site` has `area?` and `region?`. Trip items hold a place id and name, not an area.
- Live data: 96 places, all with an area: 46 christchurch, 35 dunedin, 15 timaru. Two regions in use: `canterbury` and `dunedin-otago`.
- Shared screen pieces in `components/layout/`: `TopBar`, `TopBarTabs`, `LightStatusBar`. Colours and spacing in `lib/ui/tokens.ts`.
- Every route under `app/(app)/(tabs)` is a tab screen that stays mounted and is reused with new params. Screens that take an id are keyed on it for that reason; a new one must be too.
- Tests: jest with `jest-expo` and React Native Testing Library; `test/uiKitMock.tsx` stands in for the shared kit. 45 suites, 557 tests, and `npx tsc --noEmit`, all passing.

## Limits the plan must stay inside

- **Do not change `../enginev1` or `../rotorua-guide`.** The shared kit and api live in `../enginev1` and another live app depends on them. Reading is fine.
- **No new native packages and no change to `app.config.ts`.** This must be shippable as an over-the-air JS update.
- **No new fields** on places or stored trips, and no api or Firestore changes.
- **Design rules the app already follows:** near-white pages with white cards; burnt orange (`highlight`) for the main action, "you are here" and live facts, with white text on filled orange buttons; deep teal for the top bars. Every screen must work at 375×667 points, the size App Review tests at; a sister app was rejected for a button hidden at that height.
- Follow the code that is there: its naming, comment style and test style. The repo works test-first.
- Not in scope: real drive times from a maps service, letting the user choose where they sleep, and in-app purchases.

## One behaviour to design around, not fix

The planner does not know where the traveller sleeps, so a change of town overnight is always driven on the morning of the later day. A Dunedin day after a Christchurch day opens with a 4.5 hour drive. The trip view should show this as it is, since it is the first place a user will see it for the whole trip.

## What to hand back

Write the plan to `docs/plans/trip-view-and-areas.md`, beside the last one, and nothing else.

- **Questions for the owner first,** only those that block the build, each with your recommended answer.
- **Part A and Part B as separate sections** that can be built and shipped independently, and say which you would do first and why.
- **For each part, the design in a few paragraphs,** then ordered steps small enough to build and check on their own. For each step: the files touched, the tests written first, and how to tell it worked.
- **A sketch of the trip view and of the Explore area choice** in plain text, so the owner can react to the layout before anything is built.
- **Risks,** and anything you could not confirm from the code. Keep what you verified separate from what you assumed.
- **A rough size** for each step.
