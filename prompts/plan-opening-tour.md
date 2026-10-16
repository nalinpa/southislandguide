# Plan: the opening tour for South Island Guide

You are planning the first-run tour for South Island Guide, an Expo / React Native travel app in this repo. **Produce a plan only.** Do not edit code, commit, build, or change anything outside this repo. The owner will read the plan, answer its questions, and then have it built.

## Background

The app launches once, with the whole island and a paid unlock (`docs/plans/launch.md`; read it first). The tour is item C4 there. The owner chose to "work through" the tour's stops and wording together, so the plan's job is to put a concrete proposal in front of them to react to, not to settle it alone.

There is **no tour plan in the Rotorua app** to copy: `rotorua-guide/docs/superpowers/` has plans and specs for other features, not the tour. There is a working tour in its **code**, which this app should reuse:

- `rotorua-guide/lib/tour/`, about 540 lines:
  - `TourContext.tsx`: steps, current step, start / next / skip, and moving between tabs;
  - `SpotlightOverlay.tsx`: dims the screen with a cut-out around the target and shows a caption card, using `react-native-svg` and `react-native-reanimated`;
  - `useTourTarget.ts`: a screen measures the element a step points at and registers it by step id;
  - `useTourStepRoute.ts`: for a step on a screen that isn't a tab, such as a place's detail page;
  - `tourSteps.ts`: the steps;
  - `__tests__/TourContext.test.tsx`.
- **What a step can say:** an `id`, the tab it is on (`tabKey`) or a route a screen supplies at run time (`dynamicRouteKey`), how dark the screen behind is (`dim`), the caption above or below the target (`tooltipPosition`), small offsets for a target that measures wrong, a `title` and a `body`. A step with no registered target shows a centred card.
- **Rotorua's nine steps**: Profile (read the guide); Explore; browse by category; tap a card; a place's detail; save it; add it to a plan; Plans; Map.
- **How it starts:** in `rotorua-guide/app/_layout.tsx`, once, on the first app open after sign-in (`TourAutoStartGate`: signed in and `useAppOpenCount() === 1`; `lib/hooks/useAppOpenCount.ts`).
- **What Rotorua learned** (`rotorua-guide/TASKS.md` and `docs/build-10-test-plan.md`):
  - the tour once started over the login screen, hence the sign-in gate;
  - the last card needed new words and a more opaque background;
  - the spotlight and caption positions need checking on a real phone;
  - a user with two or more trips needed a different target on Plans.

`react-native-svg`, `react-native-reanimated` and `@react-native-async-storage/async-storage` are all installed in this app, so the tour is JS only.

## What is different here

The tour must show this app, not Rotorua's. Read the screens before proposing steps; the ones that matter:

- **Explore** (`app/(app)/(tabs)/sites/index.tsx`):
  - the title is the town being shown, and tapping it opens a sheet of towns grouped by region (`components/sites/AreaSheet.tsx`);
  - it starts on the town nearest the user;
  - category tabs list a place under its main category only;
  - the top bar has buttons for the guide, search and saved places.
- **A place** (`app/(app)/(tabs)/sites/[siteId]/index.tsx`): save, and add to a trip.
- **Plans and the trip screen** (`components/itinerary/ItineraryDetailView.tsx`):
  - a trip opens on the trip view (`TripOverview.tsx`): one row per day with its town and a picture;
  - a Trip | Days switch (`TripViewSwitch.tsx`) leads to the day timeline;
  - on the timeline, places and drives can be dragged (`DriveBlock.tsx`), and a sideways swipe changes day (`daySwipe.ts`).
- **Map** (`app/(app)/(tabs)/map/index.tsx`): opens on the nearest town.
- **The guide**: reached from Explore's top bar and from Profile.

Two decisions in the launch plan shape what the tour can promise:

1. **Free users can use the suggested itineraries but not change them** (decision 2). Building or editing a trip, dragging stops and drives, and adding days need the unlock. A tour step that says "drag to rearrange" is wrong for a free user. The plan must say how the tour treats free and paid users.
2. **The tour is part of the launch build**, which includes the paywall. Say whether any tour step shows or mentions the unlock, and if so how, without the tour feeling like an advert.

Also account for:

- **Guests** ("Continue as Guest") can't plan trips at all. Does the tour run for them, and with which steps?
- A new user **has no trip**, so steps about the trip view, the switch and the timeline have nothing to point at. Options include a suggested itinerary, a mock preview (Rotorua has `ItineraryMockPreview.tsx`), or describing the feature without a spotlight. Recommend one.
- **The location permission prompt** appears early (Explore and the map ask for it). Say how it and the tour avoid landing on top of each other.
- Every route under `app/(app)/(tabs)` is a tab screen that **stays mounted** and is reused with new params; moving between steps must work with that.
- Screens that only exist in some states: the town sheet (a modal), the Days view, an empty Explore list.

## What the plan must decide

1. **When it runs:** first open after sign-in, as Rotorua does, or another moment; and for guests.
2. **Whether it can be run again**, and from where (e.g. a "Show me around" row on Profile).
3. **The steps:** for each, the screen, what it points at, its title and body (short: Rotorua's run 4 to 12 words), and whether it differs for free, paid and guest users. Aim for the fewest steps that leave someone able to find a town, a place, and their trip. Say what was left out and why.
4. **How each step gets its target**: which screen registers which id, and what happens when the target isn't there.
5. **What is copied from Rotorua as is, what is changed, and what is new.** Copying into this repo is expected; changing `../rotorua-guide` or `../enginev1` is not.

## Limits

- **Do not change `../enginev1` or `../rotorua-guide`.** Reading them is fine.
- **No new native packages and no change to `app.config.ts`**: the tour ships as an over-the-air update.
- **Design rules this app follows:**
  - near-white pages with white cards;
  - burnt orange (`highlight`) for the main action and "you are here", with white text on filled orange buttons;
  - deep teal for the top bars.
- Every screen must work at **375 × 667 points** (App Review tests at that size; Rotorua was rejected for a hidden button), including the caption card and its buttons.
- **VoiceOver:** say how the tour reads to a screen reader, and that it can always be skipped.
- Follow the code that is there: naming, comment style, test style. The repo works test-first (jest with `jest-expo` and React Native Testing Library; `test/uiKitMock.tsx` stands in for the shared kit).

## What to hand back

Write the plan to `docs/plans/opening-tour.md`, and nothing else.

- **Questions for the owner first**, only those that block the build, each with your recommended answer. Expect the step list and wording to be among them; that is the point.
- **The proposed steps as a table**: id, screen, target, title, body, and who sees it (free, paid, guest).
- **A plain-text sketch** of two or three steps at 375 × 667, so the owner can react to the look.
- **The design in a few paragraphs**, then ordered build steps small enough to check on their own. For each: files touched, tests written first, how to tell it worked, and a rough size (small: one file and its test; medium: one screen; large: several).
- **Risks**, keeping what you verified in the code separate from what you assumed.
