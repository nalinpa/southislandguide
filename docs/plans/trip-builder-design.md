# The trip builder on kiwiguide.app — design

Owner's decisions, 2026-11-21. Design only: the build plan comes after the owner approves this, and each task runs on the owner's go.

## Why

The quiz at `kiwiguide.app/plan/` gives every visitor one of the app's 26 suggested trips, picked by start town and length. Most visitors don't fit those: a different number of days, an event they're building the trip around (a wedding, a concert, a conference), another city to start from, hikers or not, food tips or not, things they want to do (surfing, skiing), how much they're willing to drive (owner, 2026-11-21). The builder makes a trip for them from their answers, so the ad funnel's promise ("your trip, already in the app") holds for everyone.

Second, iPad downloads are growing (owner): the quiz must work well on an iPad.

## What it is

1. **iPad-friendly quiz** (first, small, CSS): the quiz and the reveal use a wide screen instead of a 520 px phone column.
2. **The trip builder:** more questions, then a trip built for the visitor, in the browser, from the app's own hand-checked days and places. Saved to an account and opened in the app exactly as today.

**Free** (owner: "custom is free for now"). No paywall, no app change, no api change.

## Goals

- Any start city on the list, any length from 3 to 21 days, an event on fixed days, a pace, a drive limit, food on or off, activities: each answer changes the trip itself, not only what's highlighted.
- The trip on the site is exactly the trip the app opens: same places, days, times.
- Instant: the trip shows as soon as the last answer is tapped.
- Good trips: built from the app's 51 hand-checked days wherever they fit.
- On an iPad, the quiz and the reveal use the screen.

## Non-goals

- No AI in this release (owner picked rules, 2026-11-21). An AI "why this day" line can be added on top later (approach C).
- No free-text wishes.
- No editing the trip on the site (the app's Edit Trip does that).
- No payment.
- No North Island, no app or api change, no Firestore schema change.
- The in-app planner (owner's parked idea, 2026-10-21) isn't in this; the builder is written so it can move into the app later.

## Anti-goals (fails even if it works)

- A trip on the site that isn't the one in the app.
- A day the app would re-time on first open (stops overlapping, a drive that doesn't fit), or past 10 PM.
- A drive day longer than the visitor's limit without saying so.
- An event day with something planned on it, or the trip not in the event town those nights.
- A place the app keeps out of trips (`NOT_TRIP_STOPS` in `lib/__tests__/itineraryTemplates.test.ts`) or an inactive place.
- A slow page on a phone on mobile data.
- Questions that change nothing.

## Constraints

- Everything in the 1.5 funnel's constraints still holds (`docs/plans/1.5-design.md`, Part 1): Trip/Trips and "place" wording; static files on Cloudflare, self-hosted scripts only, CSP widens only by what's named; same Firebase project; the api as it is; the saved trip has the shape the app's Create Trip sheet sends; the replace-my-trip question; the owner sees mocks first.
- **Timing is the app's own:** the trip is timed with the app's `packTrip` (`lib/utils/itineraryPhysics.ts`), the same function `lib/__tests__/itineraryTemplates.test.ts` checks the suggested trips with, and its data (`area-drive-minutes.json`, `area-hubs.json`, `far-place-minutes.json`, `leg-minutes.json`, the town tables in `assets/data/transit/`). A slot is 30 minutes, slot 0 is 8:00 AM, 28 slots to 10:00 PM.
- **Whole island** (memory: one launch with every area): nothing tuned to three towns.

## Approaches considered

- **A. Rules in the browser (picked, owner, 2026-11-21).** The site gets the app's day blocks, places and drive times as data; code builds the trip on the phone. Instant, free per visitor, no server, can't invent a place, times always match the app. Needs careful route rules; no free text.
- B. AI picks, code checks: a worker call to Claude with the answers and the candidate places; every id, drive and day checked, retried if wrong. Better at free text and taste; cents per ad visitor, 5–15 s wait, bots, varies run to run, and every rule of A is still needed to check it.
- C. A with an AI line per day: later, on top of A.

## Part 1: iPad

- Today `.quiz` is `max-width: 520px` (`kiwiguide-site/public/styles.css:403`) and the reveal is a single column: an iPad shows a phone strip.
- From 768 px wide: a wider quiz column, answers in two columns where they're short (towns, seasons, months), bigger type. From 1024 px (and iPad landscape): the reveal's days in two columns; the account step stays a narrow, centred form.
- Portrait and landscape both; the progress bar and back button stay where they are. Split View narrow widths get the phone layout.
- The builder's new screens follow the same rules (mocks show both phone and iPad).

## Part 2: the builder

### What the visitor sees

```
kiwiguide.app/plan/

 Where do you arrive?        Christchurch · Queenstown · Picton · Dunedin · Nelson · Invercargill
 Where do you leave from?    Same place · (the other cities)
 How many days?              3 … 21
 Building around an event?   No · Yes → which town · which days of the trip (or dates)
 When?                       event → the trip's real dates · no event → season, then month (as today)
 How active?                 Easy · Some walking · Big hikes
 How much driving?           A little (≤ 2 h a day) · Some (≤ 4 h) · Happy to drive (≤ 6 h)
 Into?                       Scenic · Walks · Food & wine · Culture · Water · Adventure … (any, Next)
 Food tips?                  Yes · No
 Anything to do?             Surfing · Skiing · Hot pools · … (any, optional, Next)
 ──── the reveal: your trip day by day (event days marked) → Save → account → App Store, as today
```

- Order and wording are the owner's to settle in the mocks. "Where do you leave from?" is Claude's addition: a trip that ends in another city is a different route.
- One question per screen, progress bar, back, as today. Answers that don't apply are skipped (no month screen with an event, no skiing outside June to October).
- The reveal is today's reveal: the trip's title, from/to, dates, each day's town, stops, times and photos, event days marked ("Your event in Wānaka"), and the season line. When a drive day is over the visitor's limit, the reveal says so on that day.

### How a trip is built

1. **Hand-checked trip first.** No event, and a suggested trip with the same start, end and length exists: that trip, then step 4.
2. **Route from the day blocks.** `lib/itineraryTemplates.ts` is built from 51 hand-checked day blocks: town days (`WANAKA_DAY`, `GLENORCHY_DAY`…) and travel days (`QUEENSTOWN_TO_TE_ANAU_DAY`…), each with its stops, times and opening hours checked. Each block starts the day in one town and ends it in another (or the same). The builder strings blocks together: starts in the arrival city, ends in the leaving city, exactly the asked number of days, travel days within the drive limit, the event town on the event days.
   - **A block's towns:** blocks are only lists of stops, so the export works out each block's start and end town from its first and last stops' areas, with a short hand-set list in the export for blocks where that's wrong (as `start` is set by hand on the templates today: Christchurch to Queenstown starts at Rakaia). A test checks every block's towns against the suggested trips that use it (Claude's call).
   - **Weekdays and seasons:** every block's stops are inside opening hours on every day of the week (the templates' rule), so a block fits any date and the search needs no weekday. Seasons are handled as today: the season line on the reveal (Claude's call).
3. **Event days** are days in the event town with nothing planned. The trip arrives there by the night before and leaves the morning after. One event, in one town, on consecutive days, at most the trip's length minus one day (Claude's call).
4. **Personalise:**
   - **Food off:** remove the stops whose only category is Food.
   - **Pace:** Easy drops a day's longest walk where the day has more than about three stops; Big hikes adds or swaps in the town's long walks (Walks places of two hours or more).
   - **Interests and activities:** a town day with room gets a matching place from that town (featured first); an activity the visitor picked is placed on a day in a town that has it.
   - Never a `NOT_TRIP_STOPS` place, an inactive place, or the same place twice.
   - Pace, interests and activities are preferences, not filters: a Big hikes visitor on a route with no long walks still gets a trip (Claude's call).
5. **Time it with `packTrip`** and check every day fits: `packTrip` returns every stop at the slot it was given (nothing moved) and nothing ends past slot 28 (10 PM). That is the whole check, the same one the suggested-trips test makes. A day that doesn't fit drops its last added stop and is timed again.
6. **When nothing fits** (say 3 days, arrive Nelson, leave Invercargill, a little driving): first allow longer drive days (marked on the reveal); if still nothing, end in the nearest city that works and say so ("Ends in Dunedin: Invercargill doesn't fit in 3 days"). Never change the number of days, never a dead end (Claude's call).

- **More days in a town than it has blocks** (21 days, a little driving): a free day in that town ("A free day in Wānaka", nothing planned), not a repeated block.
- **Choosing between routes that fit:** prefer fewer repeats of a town, more of the visitor's interests and activities, and the hand-checked trips' own routes; equal scores pick the same route every time (same answers, same trip).

### Data

- The export (`scripts/export-site-trips.mjs`) also writes the builder's data: the day blocks with their start and end towns, the candidate places per town (id, name, category, area, stop length, featured, activities, thumbnail), and the drive and leg tables `packTrip` reads.
- **Activities:** a new file in south-island, `assets/data/activity-tags.json` (place slug → activities), filled from the place descriptions and checked by the owner. No Firestore change. An activity shows as an answer only when enough towns on reachable routes have it; the first list is the owner's to pick in the mocks (surfing and skiing named; Claude proposes hot pools, mountain biking, kayaking, wildlife, stargazing, wine).
- **`packTrip` on the site:** bundled from the app's own code into one self-hosted script by the export (one esbuild step, from south-island), not rewritten for the site. Its imports are plain TypeScript and JSON, no React Native (`itineraryPhysics.ts` → `transitMatrix.ts`, `areas.ts`, `areaNames.ts`, `slotLabels.ts`, `geoDistance.ts`, `gameplay.ts`, the data files; `models` and `guideContent` are type-only); if the bundle pulls in anything else, stop and bring it to the owner. A check fails when the site's copy differs from the app's.
- **Size:** today's `trips.json` is 587 KB. The timing tables are 437 KB raw, 28 KB gzipped. The builder's data loads while the visitor answers (after the first question), not before the first screen. Budget for everything the quiz loads: 300 KB gzipped.

### Saving

- As today: the same account step, the same trip shape (title, dates, `day_<n>` days, `item_<uuid>` items, site id and name, slot, duration, both labels), the same replace-my-trip question.
- Title: the suggested trip's label when step 1 picked one; else "South Island in <n> Days" (with "around <event town>" when there's an event) — owner to word in the mocks.
- Dates: an event gives real dates; otherwise season and month, as today.
- Once saved, the trip is the visitor's and the app's: never rebuilt when the data changes, so no seed or version is stored (Claude's call).

### Measuring

- A Google Analytics step event for each new question, as the quiz's steps today, with fixed answer ids only (no typed text).
- `quiz_reveal` and `trip_saved` gain `kind` (`suggested` or `built`), `days`, `start`, `end`, `event` (yes or no), `pace`, `drive`.

## Order

1. iPad (CSS only), deploy on the owner's go.
2. Mocks of the new questions and the reveal, phone and iPad, owner picks.
3. Activity tags (owner checks the list).
4. The export: blocks, places, tables, `packTrip` bundle, drift check.
5. The builder and its tests.
6. The quiz screens and the reveal, measurement, privacy policy line if anything new is collected.
7. Deploy on the owner's go.

## Decided by the owner (2026-11-21)

- The builder: more questions, a trip built for the visitor. Rules in the browser (A), not AI.
- What the answers change: number of days, an event the trip is built around, start city, hikers or not, food tips or not, activities (surfing, skiing), how much driving.
- Free.
- The quiz works well on iPad.

## Calls made by Claude (owner to check)

- Arrival cities: Christchurch, Queenstown, Picton, Dunedin, Nelson, Invercargill.
- A "Where do you leave from?" question.
- 3 to 21 days.
- Drive limits 2 h, 4 h, 6 h a day; event and last days excepted, and over-limit days marked.
- A hand-checked trip wins whenever the answers fit one.
- Free days when a town has more days than blocks.
- Activities tagged in a file, not in Firestore.
- iPad first, as its own deploy.
- One event, one town, consecutive days.
- When nothing fits: longer drives first, then the nearest end city; never fewer days.
- Pace, interests and activities are preferences, not filters.
- A saved trip is never rebuilt.

## Left to the builder

- The route search (it's small: about 20 overnight towns, 51 blocks, up to 21 days) and its scoring weights.
- File layout in kiwiguide-site; the export's shape.
- Exactly which stops Easy drops and Big hikes adds, within the rules above.
- The iPad breakpoints' exact numbers.
