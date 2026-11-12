# Plan: crossing between the islands in the trip builder

You are planning a trip-builder feature for Kiwi Guide (internal id `southislandguide`), an Expo / React Native travel app in this repo. **Produce a plan only.** Do not edit code, commit, build, or change anything outside this repo. The owner will read the plan, answer its questions, and then have it built.

## Background

Kiwi Guide went live on the App Store on 2026-11-02 with the South Island only. North Island places are now being loaded into Firestore **switched off** (`active: false`), Wellington first, then up the island. Once North Island towns are switched on, a trip can hold places on both islands, and today nothing stops it.

**What the owner wants:** a user must not be able to add a place on the other island to a trip without a crossing between the islands. A crossing is:

- the **ferry**, Picton ↔ Wellington, or
- a **flight** between major airports,

plus the drive to the port or airport and from it, when the places either side aren't already there.

### How the trip builder works today (read these first)

- A trip is `Itinerary` → `days` → `items` (`lib/models.ts`). An item is a place (`siteId`) in half-hour slots. The only travel data stored on an item is `driveStartSlot`.
- Travel between places is **worked out, not stored**:
  - `lib/utils/transitMatrix.ts`: in-town tables, hub-to-hub times between towns (`assets/data/area-drive-minutes.json`, hubs in `assets/data/area-hubs.json`), and far-out places' own times (`far-place-minutes.json`). A `Leg` gets `drive` set when it crosses from one area to another.
  - `lib/utils/itineraryPhysics.ts`: `runPhysicsEngine`, `packTrip`, `dayLegs`, `tripSummary`, `moveItemToDay`, and `tryEdit`. `tryEdit` is the gate every edit goes through, and it returns a `reason` when it refuses.
  - `components/itinerary/DriveBlock.tsx`: a drive drawn on the day timeline. The user can move it, but can't change its length.
- **Where places get added and moved:**
  - `components/itinerary/AddToTripModal.tsx` adds a place through `tryEdit` and shows its `reason`.
  - `components/itinerary/CreateItineraryModal.tsx` creates trips, including from suggested trips.
  - `components/itinerary/ItineraryDetailView.tsx` and `TripOverview.tsx` handle drag, moving between days, and day swipes (`daySwipe.ts`).
- **Places:** each has a `region` (the ids in `lib/guideContent.ts`) and an `area` (its town; `lib/areas.ts`). Nothing in the app records which island a place is on.
- **Trips are saved through the shared api** in `../enginev1/api`, which other live apps also use. TASKS.md notes that its create parser drops fields it doesn't know. Check what it keeps for days and items before proposing anything that stores new data.

### Facts to work from

These are the owner's choices plus approximate figures. Check the figures against current schedules, and say which ones you checked.

- **Ferry:** Interislander and Bluebridge, Wellington ↔ Picton. About 3h30 sailing, and about 1h to check in with a car. Many rental companies don't allow their cars on the ferry, so people swap cars at the terminals. Picton is already a town (`picton`); Wellington will be one.
- **Flights, major airports only.** No small-plane or regional routes (owner). South: Christchurch, Queenstown, Dunedin. North: Auckland, Wellington.
  - Approximate times: CHC–AKL 1h25, CHC–WLG 45m, ZQN–AKL 1h50, ZQN–WLG 1h20, DUD–AKL 1h45, DUD–WLG 1h10.
  - Airport time: about 1h before departure, about 45m after landing for bags and the car.
  - Whether Nelson, Blenheim and Invercargill count as major airports is open. The recommendation so far is to start without them.
- **No booking, live schedules or prices.** No flights within one island.

## What the plan must decide

1. **Which island a place is on.** Derive it from something reliable (a region → island map, for example), not from latitude guesses. Say where it lives and how a new North Island region gets added.
2. **Every path that can put places on two islands in one trip**, and what each path does:
   - adding a place;
   - moving a place to another day;
   - dragging a place within a day;
   - editing a trip;
   - creating a trip from a suggested trip;
   - trips saved before this ships.

   Is the rule enforced in one place (`tryEdit`?) or in each path? What does the user see when it bites?
3. **The flow:** does the app refuse with a message, or offer "Add a crossing" (choose ferry or flight, then which airports) and build the legs itself? Recommend one, with the screens it needs at 375 × 667.
4. **How a crossing is represented:**
   - worked out from the trip, as drives are, with only the user's choice stored;
   - or stored as its own item;
   - or something else.

   This decision depends on what the shared api keeps (see above). Changing `../enginev1` is not allowed, so the representation must fit what the api stores today. Say what you verified there.
5. **The time it takes.**
   - **Ferry:** the drive to Picton or Wellington, check-in, sailing, and the drive on.
   - **Flight:** the drive to the airport, airport time, flight, airport time, and the drive on.

   Say how this sits on the 8am–10pm day grid: what happens when a crossing doesn't fit in what's left of a day, and whether it can span the end of one day and the start of the next. Times are durations only, with no sailing schedules, unless you argue otherwise.
6. **On screen.**
   - **Timeline:** a crossing block on the day timeline, with a ship or plane icon (`lucide-react-native` has both, so no new package is needed).
   - **Trip overview:** the crossing day's row on the trip view (`TripOverview.tsx`).
   - **Summary:** the town list in `tripSummary`.
   - **Engine first:** if `../enginev1` has a shared timeline or travel-block component, use an opt-in variant of it rather than an app-only copy.
7. **Tests.** North Island places are switched off live, so the feature must be testable with fixtures before any North Island town goes on. Trips entirely on one island must behave exactly as today, and the plan must show how that's proven.
8. **What's left out and why.**

## Limits

- **Do not change `../enginev1` or `../rotorua-guide`.** Reading them is fine.
- **No new native packages and no change to `app.config.ts`:** this ships as an over-the-air update. 1.0.0 is live, and native changes need a new build.
- **iOS only:** skip Android-specific work.
- **Wording on screen:** "Trip" / "Trips" and "place". Never "Itinerary", "Plans", or "Location" for a place.
- **Styling:** follow the existing look. No wider design changes; those wait for the post-launch design sweep.
- **Layout and accessibility:**
  - Every screen and sheet must work at **375 × 667 points**.
  - With VoiceOver, a crossing block must read as one item, for example "Ferry, Picton to Wellington, 4 hours 30".
- **Code style and tests:** follow the code that's there (naming, comments, tests). The repo works test-first, with jest (`jest-expo`) and React Native Testing Library.

## What to hand back

Write the plan to `docs/plans/island-crossings.md`, and nothing else.

- **Questions for the owner first**, only those that block the build, each with your recommended answer.
- **The rule in one paragraph**, as a user would meet it.
- **A plain-text sketch** at 375 × 667 of a crossing on the day timeline, and of the add-a-crossing flow if you recommend one.
- **The design in a few paragraphs**, then ordered build steps small enough to check on their own. For each step:
  - files touched;
  - tests written first;
  - how to tell it worked;
  - a rough size: small (one file and its test), medium (one screen), or large (several).
- **Risks**, keeping what you verified in the code separate from what you assumed.
