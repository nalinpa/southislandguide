# Plan: drive times between areas, and a drive block in the day view

You are planning a feature for South Island Guide, an Expo / React Native travel app in this repo. **Produce a plan only.** Do not edit code, commit, build, or change anything outside this repo. The owner will read the plan, answer its questions, and then have it built.

## What the owner wants

A trip day is a timeline of places. Today the planner assumes every hop between two places takes 30 minutes, which was fine while every place was in Christchurch. Places in Timaru and Dunedin are now live, so a day can run Christchurch → Dunedin and still show 30 minutes.

The owner's design, already decided:

1. **Two levels of travel time.**
   - Between two places in the same *area*: keep the flat 30 minutes for now. Real place-to-place times inside an area will be generated later and are not part of this work.
   - Between two places in different areas: one drive time per pair of areas, from a short list entered by hand.
2. **A drive block.** When two consecutive places in a day are in different areas, the day view shows the drive as a full block on the timeline, like a place: a card reading "Drive to Dunedin", with from and to, and the duration. It takes up its real time in the day. It is placed automatically. The user does not add, move or edit it, and nothing new is stored in the trip.
3. **The card names areas, not places.** "Drive to Dunedin", not "Drive to Otago Museum".
4. **Within one area nothing changes.** The existing small connector between places stays.
5. **A refinement to make the time less rough.** One time per pair of areas means north Christchurch → south Dunedin reads the same as south Christchurch → north Dunedin. To correct that without new data fields: give each area one centre point, and scale the area-to-area time by (straight-line distance between the two actual places) ÷ (straight-line distance between the two area centres), then round to the half hour. Plan this as a separate, later step that the first step does not depend on.

## What exists today

Checked on 2026-10-13. Line numbers drift, so confirm each one before relying on it.

- `lib/models.ts`: `Site` has `lat`, `lng`, `region?` and `area?`. `area` is an id for the base town a place is visited from, one level below `region`. `ItineraryItem` holds `siteId`, `siteName`, `slotIndex`, `durationSlots` and a few labels. It has **no** area and no coordinates.
- Live data: 96 places, every one with an `area`: 46 `christchurch`, 35 `dunedin`, 15 `timaru`. More areas will follow.
- `lib/constants/gameplay.ts`: the day grid runs 8 AM to 10 PM in 30-minute slots, 28 slots, each `SLOT_HEIGHT` 72 px.
- `lib/utils/transitMatrix.ts`: `getRequiredTransitSlots(fromSiteId, toSiteId)` reads `assets/data/southisland-transit.json`, which is `{}`, so every pair falls back to 1 slot. It takes two site ids and nothing else.
- `lib/utils/itineraryPhysics.ts`: `runPhysicsEngine` packs a day. Its forward pass pushes each place back by the travel slots; if the day runs past 10 PM a reverse pass pulls places earlier. So the time for a drive is already reserved; only its length is wrong.
- Callers of `getRequiredTransitSlots`: `itineraryPhysics.ts` (twice) and `components/itinerary/ItineraryDetailView.tsx` (twice: once to work out free gaps, once to draw the connector).
- Callers of `runPhysicsEngine`: `ItineraryDetailView.tsx` (many), `components/itinerary/AddToTripModal.tsx`, and `lib/__tests__/itineraryTemplates.test.ts`.
- The connector drawn today is `components.TransitBlock` from the shared kit `@blacksands/components`: a dashed line and a small badge with a train icon reading "Transit 30 min". Places are drawn with the kit's `TimelineBlock`.
- `lib/utils/geoDistance.ts`: `distanceMeters(a, b)`, straight-line.
- `lib/itineraryTemplates.ts`: two suggested Christchurch itineraries with slot times baked in. Their test fails if the times stop fitting.
- `lib/guideContent.ts`: `REGIONS` holds region ids and display labels. There is nothing equivalent for areas yet.
- Tests: jest with `jest-expo` and React Native Testing Library. `test/uiKitMock.tsx` stands in for the shared kit. `npm test` and `npx tsc --noEmit` both pass today.

## Limits the plan must stay inside

- **Do not change `../enginev1` or `../rotorua-guide`.** The shared kit lives in `../enginev1` and another live app depends on it. Reading them is fine. Anything new, such as the drive block, is a local component in this repo.
- **No new native packages and no change to `app.config.ts`.** This has to be shippable as an over-the-air JS update.
- **No new fields** on places or on stored trips, and no api or Firestore changes. `area`, `lat` and `lng` are what there is.
- Not in scope: generating real drive times with a maps service, an optional per-place "extra minutes" field, the planned trip view that lists the towns for each day, and the other places the app still assumes one city (map opening position, default trip title). Mention any of these only where the design should leave room for them. The towns-per-day view will need the same area labels, so put them somewhere it can reuse.
- Follow the code that is there: its naming, comment style and test style. The repo works test-first.

## Questions the plan has to answer

Give a recommendation for each, with the reason, not a list of options.

1. **How does the lookup learn a place's area and coordinates?** It receives two site ids, and trip items carry neither. Places can be added in the admin panel at any time, so a file bundled with the app goes stale. Say where the data comes from, how it reaches both the planner and the day view, and what happens when a place in a trip is no longer in the loaded list.
2. **Where do the area-to-area times, the area labels and (for step two) the area centres live,** and in what shape? List the pairs needed for today's three areas. Do not invent the drive times: mark them as values for the owner to supply or confirm.
3. **Fallbacks.** One or both places have no `area`. The pair of areas is not in the list. Say what the time is and whether a drive block shows in each case.
4. **Long drives in a 14-hour day.** A drive of several hours plus the places either side may not fit before 10 PM. Work out what the planner's two passes do with it today, whether that is acceptable, and what the user sees if a day cannot fit. Include reordering, moving a place to another day, and adding a place from the "add to trip" flow.
5. **The drive block itself.** What it shows, how it differs visually from a place so it does not look tappable or draggable, how it reads to a screen reader, and how it sits with the free-gap cards ("Find more things to do") so one never draws over the other. The app's rule for colour: burnt orange marks the main action or a live fact, deep teal is for brand bars.
6. **The suggested itineraries.** Confirm whether the two Christchurch templates are affected, and what keeps their test meaningful.
7. **The scaling step.** Where it plugs in, how it rounds, and its limits. State plainly where it gives a wrong answer (a place a long way off the main road) so the owner knows when the per-place field would become worth adding.

## What to hand back

Reply with the plan; do not write files.

- **Questions for the owner first,** only those that block the build, each with your recommended answer.
- **The design in a few paragraphs:** where the data lives, how a travel time is worked out, what draws the block.
- **Ordered steps,** each small enough to build and check on its own. For each: the files touched, the tests written first, and how to tell it worked. Step one is the hand-entered times and the drive block. The scaling refinement is a later step.
- **Risks,** and anything you could not confirm from the code. Keep what you verified separate from what you assumed.
- **A rough size** for each step.
