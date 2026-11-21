# The trip builder on kiwiguide.app — design

Owner's decisions, 2026-11-21. Design only: the build plan comes after the owner approves this, and each task runs on the owner's go.

## Why

The quiz at `kiwiguide.app/plan/` gives every visitor one of the app's 26 suggested trips, picked by start town and length. Most visitors don't fit those: a different number of days, another city to start from, hikers or not, food tips or not, things they want to do (surfing, skiing), how much they're willing to drive (owner, 2026-11-21). The builder makes a trip for them from their answers, so the ad funnel's promise ("your trip, already in the app") holds for everyone.

Second, iPad downloads are growing (owner): the quiz must work well on an iPad.

## What it is

1. **iPad-friendly quiz** (first, small, CSS): the quiz and the reveal use a wide screen instead of a 520 px phone column.
2. **The trip builder:** more questions, then a trip built for the visitor, in the browser, from the app's own hand-checked days and places. Saved to an account and opened in the app exactly as today.

**Free** (owner: "custom is free for now"). No paywall, no app change, no api change.

## Goals

- Any start city on the list, any length from 3 to 21 days, a pace, a drive limit, food on or off, activities: each answer changes the trip itself, not only what's highlighted.
- The trip on the site is exactly the trip the app opens: same places, days, times.
- Instant: the trip shows as soon as the last answer is tapped.
- Good trips: built from the app's 51 hand-checked days wherever they fit.
- On an iPad, the quiz and the reveal use the screen.

## Non-goals

- No AI in this release (owner picked rules, 2026-11-21). An AI "why this day" line can be added on top later (approach C).
- No free-text wishes.
- **No events for now** (owner, 2026-11-21): a trip built around fixed days in one town (a wedding, a concert) is later. When it comes back: one event, one town, consecutive days kept free, arriving the night before; it needs real dates instead of season and month.
- No editing the trip on the site (the app's Edit Trip does that).
- No payment.
- No North Island, no app or api code change. The only data change is two new place fields (below), through the engine's existing custom fields.
- The in-app planner (owner's parked idea, 2026-10-21) isn't in this; the builder is written so it can move into the app later.

## Anti-goals (fails even if it works)

- A trip on the site that isn't the one in the app.
- A day the app would re-time on first open (stops overlapping, a drive that doesn't fit), or past 10 PM.
- A drive day longer than the visitor's limit without saying so.
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

 Where do you start?         Christchurch · Queenstown · Picton · Dunedin · Nelson · Invercargill
 How many days?              3 … 21
 When?                       season, then month (as today)
 How active?                 Easy · Some walking · Big hikes
 How much driving?           A little (≤ 2 h a day) · Some (≤ 4 h) · Happy to drive (≤ 6 h)
 What are you into?          Relax · Sightseeing · Nature · Adventure (any, Next)
 Food tips?                  Yes · No
 Anything to do?             Surfing · Skiing · Hot pools · … (any, optional, Next)
 ──── the reveal: your trip day by day → Save → account → App Store, as today
```

- Order and wording are the owner's to settle in the mocks.
- **One start question, no end question** (owner, 2026-11-21: "could be where you start"). The builder picks where the trip ends. When both fit, the reveal offers the choice, as it does today between suggested trips: back where you started ("Loop · back in Queenstown") or the best one-way trip ("Ends in Christchurch"), one tap to pick. One-way only when it's at least as good a trip and a city on the list (Claude's call).
- One question per screen, progress bar, back, as today. Answers that don't apply are skipped (no skiing outside June to October).
- The reveal is today's reveal: the trip's title, from/to, dates, each day's town, stops, times and photos, and the season line. When a drive day is over the visitor's limit, the reveal says so on that day.

### How a trip is built

1. **Hand-checked trip first.** Suggested trips with the same start and length exist: those are the choices on the reveal, then step 3.
2. **Route from the day blocks.** `lib/itineraryTemplates.ts` is built from 51 hand-checked day blocks: town days (`WANAKA_DAY`, `GLENORCHY_DAY`…) and travel days (`QUEENSTOWN_TO_TE_ANAU_DAY`…), each with its stops, times and opening hours checked. Each block starts the day in one town and ends it in another (or the same). The builder strings blocks together: starts in the start city, ends back there or in another city on the list, exactly the asked number of days, travel days within the drive limit.
   - **A block's towns:** blocks are only lists of stops, so the export works out each block's start and end town from its first and last stops' areas, with a short hand-set list in the export for blocks where that's wrong (as `start` is set by hand on the templates today: Christchurch to Queenstown starts at Rakaia). A test checks every block's towns against the suggested trips that use it (Claude's call).
   - **Weekdays and seasons:** every block's stops are inside opening hours on every day of the week (the templates' rule), so a block fits any date and the search needs no weekday. Seasons are handled as today: the season line on the reveal (Claude's call).
3. **Personalise:**
   - **Food off:** remove the stops whose only category is Food.
   - **Pace:** Easy drops a day's longest walk where the day has more than about three stops; Big hikes adds or swaps in the town's long walks (Walks places of two hours or more).
   - **Into (vibe) and activities:** a town day with room gets a place from that town whose `vibe` matches (featured first), and the day's own stops that don't match any picked vibe are the first to go when a day is trimmed; an activity the visitor picked is placed on a day in a town that has it.
   - Never a `NOT_TRIP_STOPS` place, an inactive place, or the same place twice.
   - Pace, interests and activities are preferences, not filters: a Big hikes visitor on a route with no long walks still gets a trip (Claude's call).
4. **Time it with `packTrip`** and check every day fits: `packTrip` returns every stop at the slot it was given (nothing moved) and nothing ends past slot 28 (10 PM). That is the whole check, the same one the suggested-trips test makes. A day that doesn't fit drops its last added stop and is timed again.
5. **When nothing fits** (say 3 days from Invercargill, a little driving): allow longer drive days, marked on the reveal. Never change the number of days, never a dead end (Claude's call).

- **More days in a town than it has blocks** (21 days, a little driving): a free day in that town ("A free day in Wānaka", nothing planned), not a repeated block.
- **Choosing between routes that fit:** prefer fewer repeats of a town, more of the visitor's interests and activities, and the hand-checked trips' own routes; equal scores pick the same route every time (same answers, same trip).

### Data

- The export (`scripts/export-site-trips.mjs`) also writes the builder's data: the day blocks with their start and end towns, the candidate places per town (id, name, category, area, stop length, featured, vibe, activities, thumbnail), and the drive and leg tables `packTrip` reads.
- **Two new place fields** (owner, 2026-11-21), as custom fields in the app's `locationFields` registry (the engine's `multiselect` type), so they're edited in the admin panel's place form like any other field:
  - `vibe`: Relax · Sightseeing · Nature · Adventure, any number. It answers "What are you into?" (owner: keep the "into" wording; vibe makes the match tighter than the eight categories). Categories stay as they are for Explore and the map.
  - `activities`: surfing, skiing, …
  - **Filling them:** Claude proposes both for all 1,034 places from category and description, as a list the owner checks; then one batch write, and the cached place list cleared after (direct writes need it). Adding the fields to the registry is a live config change: on the owner's go.
  - The app ignores both fields until it has a use for them (the in-app planner, later).
- An activity shows as an answer only when enough towns on reachable routes have it; the first list is the owner's to pick in the mocks (surfing and skiing named; Claude proposes hot pools, mountain biking, kayaking, wildlife, stargazing, wine).
- **`packTrip` on the site:** bundled from the app's own code into one self-hosted script by the export (one esbuild step, from south-island), not rewritten for the site. Its imports are plain TypeScript and JSON, no React Native (`itineraryPhysics.ts` → `transitMatrix.ts`, `areas.ts`, `areaNames.ts`, `slotLabels.ts`, `geoDistance.ts`, `gameplay.ts`, the data files; `models` and `guideContent` are type-only); if the bundle pulls in anything else, stop and bring it to the owner. A check fails when the site's copy differs from the app's.
- **Size:** today's `trips.json` is 587 KB. The timing tables are 437 KB raw, 28 KB gzipped. The builder's data loads while the visitor answers (after the first question), not before the first screen. Budget for everything the quiz loads: 300 KB gzipped.

### Saving

- As today: the same account step, the same trip shape (title, dates, `day_<n>` days, `item_<uuid>` items, site id and name, slot, duration, both labels), the same replace-my-trip question.
- Title: the suggested trip's label when step 1 picked one; else "South Island in <n> Days" — owner to word in the mocks.
- Dates: season and month, as today.
- Once saved, the trip is the visitor's and the app's: never rebuilt when the data changes, so no seed or version is stored (Claude's call).

### Measuring

- A Google Analytics step event for each new question, as the quiz's steps today, with fixed answer ids only (no typed text).
- `quiz_reveal` and `trip_saved` gain `kind` (`suggested` or `built`), `days`, `start`, `end`, `pace`, `drive`.

## Order

1. iPad (CSS only), deploy on the owner's go.
2. Mocks of the new questions and the reveal, phone and iPad, owner picks.
3. The `vibe` and `activities` fields: registry (owner's go), Claude's proposed values, owner checks, batch write, cache cleared.
4. The export: blocks, places, tables, `packTrip` bundle, drift check.
5. The builder and its tests.
6. The quiz screens and the reveal, measurement, privacy policy line if anything new is collected.
7. Deploy on the owner's go.

## Decided by the owner (2026-11-21)

- The builder: more questions, a trip built for the visitor. Rules in the browser (A), not AI.
- What the answers change: number of days, start city, hikers or not, food tips or not, activities (surfing, skiing), how much driving.
- A `vibe` field on places (Relax, Sightseeing, Nature, Adventure) behind the "What are you into?" question, which keeps its wording.
- Free.
- The quiz works well on iPad.

## Calls made by Claude (owner to check)

- Start cities: Christchurch, Queenstown, Picton, Dunedin, Nelson, Invercargill.
- The builder picks the end: back at the start or one-way, both offered when both fit.
- 3 to 21 days.
- Drive limits 2 h, 4 h, 6 h a day; over-limit days marked.
- A hand-checked trip wins whenever the answers fit one.
- Free days when a town has more days than blocks.
- `activities` is a second place field, beside `vibe`, not a separate file.
- A place can have more than one vibe; Claude proposes them all, the owner checks.
- iPad first, as its own deploy.
- When nothing fits: longer drive days, marked; never fewer days.
- Pace, interests and activities are preferences, not filters.
- A saved trip is never rebuilt.

## Left to the builder

- The route search (it's small: about 20 overnight towns, 51 blocks, up to 21 days) and its scoring weights.
- File layout in kiwiguide-site; the export's shape.
- Exactly which stops Easy drops and Big hikes adds, within the rules above.
- The iPad breakpoints' exact numbers.
