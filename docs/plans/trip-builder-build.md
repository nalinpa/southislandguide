# The trip builder on kiwiguide.app — build plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **One task at a time, each on the owner's go** (one builder, its review, then the next; no parallel worktrees).

**Goal:** The quiz at `kiwiguide.app/plan/` works well on an iPad, then asks nine questions and builds a trip for the visitor from the app's own hand-checked days and places, timed by the app's own code, saved and opened in the app as today.

**Architecture:** iPad is CSS in `kiwiguide-site/public/styles.css`. The builder is a plain script, `public/plan/builder.js`, in the quiz's existing style (pure functions on top, tested with `node --test`; no build step on the site). Its data, `public/plan/builder-data.json`, and the app's `packTrip` bundled as `public/plan/pack.js` both come from the app repo's export (`scripts/export-site-trips.mjs`). Two new place fields, `vibe` and `activities`, are the engine's existing custom fields (`locationFields`, `multiselect`).

**Tech Stack:** Static HTML/CSS/JS on Cloudflare Workers assets, `node --test`; esbuild (dev only, in the app repo's `scripts/`) for `pack.js`; firebase-admin for the one batch write; Jest in the app repo.

**Spec:** [docs/plans/trip-builder-design.md](trip-builder-design.md) (owner approved 2026-11-21: "write the plan").

## Global Constraints

- Wording on every screen: Trip/Trips and "place"; never Itinerary, Plans or Location.
- Site: static files in `kiwiguide-site/public`; scripts only self-hosted (no inline script, no script CDNs); the CSP (`public/_headers`) widens only by what a task names. This plan names none.
- No app code change and no api change. The app repo gets only the export script, its test and the place-field script. No OTA, no store build.
- Timing is the app's: `packTrip(days, lookup)` from `lib/utils/itineraryPhysics.ts`, bundled unchanged. A slot is 30 minutes, slot 0 is 8:00 AM, a day ends by slot 28 (10:00 PM). "Fits" means `packTrip` returns every stop at the slot it was given and no stop ends past slot 28.
- Saved trip shape as today (`tripBody` in `public/plan/account.js`): title, start and end dates, `day_<n>` days, `item_<uuid>` items with `siteId`, `siteName`, `slotIndex`, `durationSlots`, `timeLabel`, `durationLabel`. A free day is a day with `items: []`.
- Start cities: `christchurch`, `queenstown`, `picton`, `dunedin`, `nelson`, `invercargill`. Lengths 3 to 21 days. Drive limits 120, 240, 360 minutes a day. Vibes: `relax`, `sightseeing`, `nature`, `adventure`. "Into": `Scenic`, `Walks`, `Nature`, `Water`, `Culture`, `Attractions`, `Adventure` (place categories; no Food). Paces: `easy`, `some`, `hikes`.
- Never a trip stop: an inactive place, a `NOT_TRIP_STOPS` place (the list in `lib/__tests__/itineraryTemplates.test.ts`), or the same place twice in a trip.
- Same answers, same trip (no randomness, stable sort orders).
- Budget: everything the quiz loads is at most 300 KB gzipped. `builder-data.json` and `pack.js` load after the first question is answered, not before the first screen.
- Photos under the site's rule (`kiwiguide-site/docs/photo-sources.md`): a row there and the credit on the page; a new photo needs the owner's OK. Lines on breaks are only true facts from the data or the answers.
- Firestore: a full place-list read costs 559 reads (free plan 50k a day); the api's list is cached in KV. After any direct Firestore write, clear the cached list (`scripts/clear-places-cache.js`, from PowerShell: npx is missing in Git Bash) and re-check it live.
- Every deploy (`npx wrangler deploy`), the `locationFields` registry change and the Firestore batch write are on the owner's separate go. Commit only what the task names; never TASKS.md or the owner's untracked files; never the root `.gitignore`. enginev1 is not a git repo.
- The owner sees designs first (Task 2); no critics unless the owner asks.

## Review Focus

1. **A long trip with little driving from a far city** (21 days, Invercargill, 2 h): a trip comes back, with free days rather than repeated blocks, and no day over the limit unless marked. (Task 5, `long slow trip from Invercargill` test.)
2. **A start the blocks barely cover** (3 days from Nelson, Easy, 2 h): never a dead end; longer drive days are marked `overLimit`. (Task 5, `never empty` sweep.)
3. **The data not loaded yet when the last answer is tapped** (slow mobile data), or failing to load: the reveal waits with a loading line, then shows; a failure shows the plain error and the link to the suggested trips. (Task 6, `revealState` test.)
4. **An answer saved from the old quiz** in sessionStorage when the new quiz loads (a visitor mid-quiz at deploy time): the quiz starts clean at the first unanswered step, no error. (Task 6, `cleanState` old-shape test.)
5. **An activity the route can't offer** (surfing on a trip that never reaches the coast, skiing outside June to October): the trip is still built; the reveal says so in one line; skiing isn't offered at all outside its months. (Task 5 `activity not on route` test; Task 6 `activitiesFor` test.)

---

### Task 1: The quiz on iPad (CSS only)

**Files:**
- Modify: `kiwiguide-site/public/styles.css` (the "Trip quiz (/plan/)" block, from line 402)
- Test: `kiwiguide-site/test/styles.test.js` (create)

- [ ] **Step 1: Write the failing test** `quiz is wider on an iPad`: read `public/styles.css`; assert it has a `@media (min-width: 768px)` rule that sets `.quiz` `max-width` above `520px`, and a `@media (min-width: 1024px)` rule that lays the reveal's days out in two columns (a `grid-template-columns` with two tracks on the reveal's day list selector), and that the account form's selector keeps a `max-width` of `520px` or less at both widths. Match on the selectors the quiz already uses (read `public/plan/quiz.js` for the reveal's and account step's class names).
- [ ] **Step 2: Run it to see it fail.** `node --test test/styles.test.js` → FAIL.
- [ ] **Step 3: Add the rules.** From 768 px: `.quiz` up to about 760 px wide; town, season and month answers in two columns; type up a step (`.q-main h1`, `.q-btn`). From 1024 px: the reveal's days in two columns; the account step stays a centred column of at most 520 px. Under 768 px (phones, Split View): unchanged. Portrait and landscape both; the progress bar and back button stay in place.
- [ ] **Step 4: Run all checks.** `node --test` → all pass.
- [ ] **Step 5: Look at it.** `npx wrangler dev`, then the quiz from start to the "saved" screen at 390 × 844, 768 × 1024, 1024 × 768, 1024 × 1366 and 1366 × 1024 (browser device toolbar), light and dark. Screenshots to the owner.
- [ ] **Step 6: Commit** (kiwiguide-site): `public/styles.css`, `test/styles.test.js`, message `feat(plan): the quiz on iPad`.
- [ ] **Step 7 (owner's go): deploy.** `npx wrangler deploy` from `kiwiguide-site`; the owner checks the quiz on an iPad, both ways round.

---

### Task 2: Mocks (owner picks; no code)

**Files:** an artifact only (Claude's scratchpad), nothing in either repo until Step 3.

- [ ] **Step 1: Build a mocks page** in the site's look (the `styles.css` tokens, Overpass), each screen at 390 × 844 and 1024 × 1366, light and dark:
  - Every question, in the spec's order: start (six cities with photos), days, when (season, month), how active, how much driving, vibe, into, food tips, activities. For days, both ways side by side for the owner to pick: today's length bands (`BANDS` in `quiz.js`) and a 3–21 picker. For "into", both ways: today's swipe deck (`CARDS`) and a pick list of the seven categories.
  - The two photo breaks with the spec's draft lines, from the site's photos (`public/img/photo-*`), each with its credit.
  - The reveal: one built trip (Dunedin, 12 days, Some walking, 4 h, Nature + Relax, food on, hot pools) with a free day, a marked over-limit drive day and an activity line; the loop / one-way choice ("Loop · back in Queenstown" / "Ends in Christchurch"); a suggested trip shown as the choice.
  - A list for the owner to approve: the activity answers (surfing, skiing, plus Claude's proposals: hot pools, mountain biking, kayaking, wildlife, stargazing, wine), the title wording ("South Island in <n> Days"), the free-day line ("A free day in Wānaka"), the over-limit line, the no-activity line.
- [ ] **Step 2: Publish it and stop.** The owner picks.
- [ ] **Step 3: Write the picks into the spec** under a new "Design step (owner, <date>)" heading and commit only the spec: `docs(trip builder): the owner's picks`. Later tasks follow the picks where they differ from this plan's defaults.

---

### Task 3: The `vibe` and `activities` place fields

**Files:**
- Create: `scripts/set-place-tags.js`, `scripts/__tests__/set-place-tags.test.js` (app repo; run with the same runner as the other `scripts/__tests__`)
- Create: `docs/plans/trip-builder-tags.json` (the proposal, slug → `{ vibe: string[], activities: string[] }`, all active places)

**Interfaces:**
- Produces: every active place doc in Firestore (`southislandguide`) has `vibe: string[]` (values from `relax`, `sightseeing`, `nature`, `adventure`) and `activities: string[]` (values from the owner's list in the spec's Design step); the live place list returns both.

- [ ] **Step 1 (owner's go): the registry.** The owner adds two fields in the admin portal's custom fields (or `PUT /v1/southislandguide/admin/location-fields` with the whole list plus the two): `{ key: "vibe", label: "Vibe", type: "multiselect", options: ["relax", "sightseeing", "nature", "adventure"] }` and `{ key: "activities", label: "Activities", type: "multiselect", options: <the owner's list> }`. Then check one place's edit form shows both.
- [ ] **Step 2: Propose the values.** From each place's `category` and `description` (the live list, one fetch, KV-cached), write `docs/plans/trip-builder-tags.json` and a readable version for the owner (an artifact, grouped by town, each place one line: name, category, proposed vibes and activities). Rules: every active place gets at least one vibe; an activity only when the description says the place offers it; skiing only for ski fields. Stop; the owner checks and edits.
- [ ] **Step 3: Write the failing test** `buildUpdates`: `buildUpdates(tags, options)` returns one `{ slug, data: { vibe, activities } }` per slug; it throws on a value not in `options.vibe` or `options.activities`, and on an empty `vibe`; `data` has only those two keys (never touches another field).
- [ ] **Step 4: Run it to see it fail**, then **implement `buildUpdates(tags, options)` and the script.** The script reads the JSON, builds updates, and writes each with `set(data, { merge: true })` in batches of at most 500 (firebase-admin, credentials as in `scripts/upload-places.js`). Dry run by default (prints the count and three samples); writes only with `--apply`. After `--apply` it calls `clearPlacesCache` and prints how many places in the live list have `vibe`.
- [ ] **Step 5: Run the tests**, then **commit** (app repo): `scripts/set-place-tags.js`, `scripts/__tests__/set-place-tags.test.js`, `docs/plans/trip-builder-tags.json`, message `feat(scripts): vibe and activities for every place`.
- [ ] **Step 6 (owner's go): apply.** `node scripts/set-place-tags.js docs/plans/trip-builder-tags.json --apply` from PowerShell; if the cache clear fails from the script, clear it from PowerShell and re-check the live list. Then open Explore in the app (dev build) once: places still load.

---

### Task 4: The builder's data and `pack.js`

**Files:**
- Modify: `scripts/export-site-trips.mjs`, `scripts/package.json` (add `esbuild` as a devDependency)
- Create: `lib/__tests__/siteBuilderData.test.ts` (Jest, app repo)
- Writes (kiwiguide-site): `public/plan/builder-data.json`, `public/plan/pack.js`

**Interfaces:**
- Produces `builder-data.json`:
  ```
  {
    blocks: [{ id: string, startTown: AreaId, endTown: AreaId, driveMinutes: number,
               items: [{ siteId, siteName, slotIndex, durationSlots }] }],
    templates: [{ key, start, end: AreaId, label, blockIds: string[] }],
    places: { [siteId]: { id, name, area, lat, lng, category: string[], slots: number,
                          featured: boolean, vibe: string[], activities: string[], thumb, fallback } },
    towns: { [AreaId]: { name: string, placeIds: string[] } },
    starts: AreaId[]
  }
  ```
- Produces `pack.js`: one IIFE setting `window.KiwiPack = { packTrip, slotIndexToTimeLabel, slotsToDurationLabel }` (and `module.exports` the same under Node), built from the app's own `packTrip` with the drive tables inlined.

- [ ] **Step 1: Write the failing tests** in `lib/__tests__/siteBuilderData.test.ts`, against the export's pure function `builderData(templates, places)` (export it from the script's module, or move it to `scripts/lib/builderData.mjs`):
  - `blocks are the templates' distinct days`: one block per distinct day object across `ITINERARY_TEMPLATES` (the templates reuse the same day constants, so identity gives the 51), ids stable across runs.
  - `a block's towns chain in every template`: for every template, block 0's `startTown` is the template's `start`, and each block's `startTown` is the previous block's `endTown`.
  - `driveMinutes`: each block's is the sum of `getLeg` minutes from the start town's hub (`area-hubs.json`) through its stops in order.
  - `no place a trip must not use`: `places` has no inactive place and none of `NOT_TRIP_STOPS`; every block item's `siteId` is in `places`.
  - `the starts`: exactly the six start cities, each with at least one block starting there.
  - `the site's copy is current`: the export writes a `source` hash (of `lib/itineraryTemplates.ts`, `lib/utils/itineraryPhysics.ts`, `lib/utils/transitMatrix.ts`, `lib/areas.ts` and the drive and transit data files) into `builder-data.json` and the head of `pack.js`; the test recomputes it and compares with `../kiwiguide-site/public/plan/` (skipped with a note when that folder isn't there). Fails when the app's timing or trips change and the export wasn't re-run.
- [ ] **Step 2: Run them to see them fail.** `npx jest lib/__tests__/siteBuilderData.test.ts` → FAIL.
- [ ] **Step 3: Implement `builderData`.** A block's `endTown` is its last stop's area, except a short hand-set list keyed by block id for blocks where the last stop isn't where the night is spent (the tests above find them); `startTown` comes from the chain in the templates. Move `NOT_TRIP_STOPS` out of the test into `lib/notTripStops.ts` only if the export can't import it otherwise (the one allowed app-repo move; the test imports it back).
- [ ] **Step 4: Bundle `pack.js`** with esbuild from a small entry in `scripts/` that imports `packTrip` and the two label functions; resolve `@/` to the repo root; inline the JSON. If the bundle pulls in anything outside the files the spec lists (React Native, Expo), stop and bring it to the owner.
- [ ] **Step 5: Add the size check** to the test: gzipped `builder-data.json` + `pack.js` + today's `trips.json` + the quiz scripts ≤ 300 KB. If it's over, cut `places` to what the builder reads before anything else.
- [ ] **Step 6: Run** the tests and `node --no-warnings scripts/export-site-trips.mjs` (writes all three files); `node --test` in kiwiguide-site still passes.
- [ ] **Step 7: Commit** both repos: app repo `scripts/export-site-trips.mjs`, `scripts/package.json`, `scripts/package-lock.json`, the test (and `lib/notTripStops.ts` if moved), message `feat(export): the trip builder's data and pack.js`; kiwiguide-site the three written files, message `data(plan): builder data and pack.js`.

---

### Task 5: The builder

**Files:**
- Create: `kiwiguide-site/public/plan/builder.js`, `kiwiguide-site/test/builder.test.js`

**Interfaces:**
- Consumes: `builder-data.json` and `KiwiPack` (Task 4).
- Produces: `buildTrips(data, pack, answers) -> TripOption[]`, where
  - `answers = { start: AreaId, days: number, pace: "easy"|"some"|"hikes", drive: 120|240|360, vibes: string[], into: string[], food: boolean, activities: string[] }`
  - `TripOption = { kind: "suggested"|"built", key: string, label: string, start: AreaId, end: AreaId, days: [{ town: AreaId, free?: true, overLimit?: true, items: [{ siteId, siteName, slotIndex, durationSlots, timeLabel, durationLabel }] }], missing: string[] }` (`missing`: picked activities the trip doesn't reach)
  - one to three options, best first; a loop and a one-way only when both fit; suggested trips with the same start and length come first. `tripBody` (account.js) takes any option unchanged.
- Same script style as `quiz.js`: pure functions at the top, `module.exports` under Node, no page code.

- [ ] **Step 1: Write the failing tests** (`node --test test/builder.test.js`, loading the real `builder-data.json` and `pack.js`):
  - `every answer gets a trip`: for every start × days in {3, 4, 7, 10, 14, 21} × drive × pace, with food on and off: at least one option; each has exactly `days` days.
  - `days chain`: day 0 starts in `start`; each day's town is where the previous day ended; the option's `end` is the last day's town.
  - `the app would not move a thing`: running `pack.packTrip` on each option's days returns every item at its slot; no `slotIndex + durationSlots` > 28.
  - `no forbidden stops`: no stop outside `data.places`, no repeat within a trip.
  - `food off`: no stop whose only category is `Food`.
  - `drive limit`: a non-free day whose block `driveMinutes` is over `answers.drive` has `overLimit: true`; no `overLimit` when a route within the limit exists for those answers.
  - `suggested first`: `{ start: "queenstown", days: 10, … }` returns the 10-day Queenstown suggested trips first, `kind: "suggested"`.
  - `long slow trip from Invercargill`: 21 days, `drive: 120` → free days (`free: true, items: []`), no block used twice in a row.
  - `never empty`: 3 days from Nelson, `easy`, 120 → an option, with `overLimit` days if needed.
  - `activity not on route`: an activity no town on the route has is in `missing`; the trip is otherwise the same.
  - `same answers, same trip`: two calls deep-equal.
  - `fast`: the whole sweep above averages under 50 ms a call.
- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Implement `buildTrips`** per the spec's "How a trip is built": suggested trips first (then personalised); else a search over block sequences (start city, exact length, a town's extra days as free days, drive limit, then end back at the start or in another start city), scored by fewer town repeats, more matches on vibe, into and activities, and closeness to a template's route, ties broken by block id; then personalise (food off, pace, vibe/into/activity adds and trims), then `pack.packTrip`, dropping the last added stop of a day until it fits. Labels from `pack.slotIndexToTimeLabel` / `slotsToDurationLabel`.
- [ ] **Step 4: Run the tests** → pass; `node --test` all pass.
- [ ] **Step 5: Commit** (kiwiguide-site): `public/plan/builder.js`, `test/builder.test.js`, message `feat(plan): the trip builder`.

---

### Task 6: The new quiz screens, the breaks and the reveal

**Files:**
- Modify: `kiwiguide-site/public/plan/quiz.js`, `public/plan/index.html` (script tags for `builder.js`; `pack.js` and the data are fetched after the first answer), `public/plan/measure.js` (only if a new event name is needed), `public/styles.css` (new screens, both widths)
- Modify: `kiwiguide-site/test/quiz.test.js`
- Modify, if the photos used aren't there yet: `kiwiguide-site/docs/photo-sources.md`

**Interfaces:**
- Consumes: `buildTrips` (Task 5), `tripBody` and the account flow (unchanged).

- [ ] **Step 1: Write the failing tests** in `test/quiz.test.js`:
  - `steps in order`: the step list is the owner's order from the spec's Design step, with the two breaks where it put them.
  - `cleanState old shape`: a saved state from today's quiz (towns, band, liked cards, season, month) gives a clean state at the first unanswered step, no throw.
  - `activitiesFor`: skiing is offered only for start months June to October; an activity is offered only when `data` has it in at least one town.
  - `revealState`: data not loaded → `"loading"`; load failed → `"error"`; loaded → the options from `buildTrips`.
  - `breakLine`: the first break's line uses the start town and days; the second the vibe's photo (Adventure: Shotover Jet; Nature: Diamond Lake; Relax: Gore Bay; Sightseeing: Lake Pukaki, or the owner's picks).
  - `measure params`: `quiz_reveal` and `trip_saved` carry `kind`, `days`, `start`, `end`, `pace`, `drive`, and nothing typed.
- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Build the screens** per the owner's picks: the new questions (one per screen, progress bar, back, browser back via `stepFromHash`, answers in sessionStorage as today), the two breaks (full-screen photo, line, credit, Next; tap only), the reveal (options, free days, over-limit line, `missing` line, season line), then the existing save, account and App Store steps unchanged. Fetch `builder-data.json` and `pack.js` once the first answer is tapped. A GA step event per new question with fixed answer ids.
- [ ] **Step 4: Run** `node --test` → all pass.
- [ ] **Step 5: Look at it** with `npx wrangler dev` at the five sizes in Task 1, light and dark, from the first question to "Your trip is saved" with a test account on the dev host (test hosts send to GA DebugView only). Screenshots to the owner.
- [ ] **Step 6: Privacy check:** the policy (`public/privacy/`) already covers quiz answers sent to Google Analytics; add a line only if something new is collected. Commit (kiwiguide-site) the files above, message `feat(plan): the trip builder in the quiz`.

---

### Task 7: Deploy and check (owner)

- [ ] **Step 1 (owner's go):** `npx wrangler deploy` from `kiwiguide-site`.
- [ ] **Step 2 (owner):** on a phone and an iPad: three trips end to end (one suggested, one built loop, one built one-way), each saved to a fresh account and opened in the app; the app shows the same days, places and times, and moves nothing. GA Realtime shows the new step events and `quiz_reveal` / `trip_saved` with `kind`.
- [ ] **Step 3:** note the deploy in TASKS.md (not committed) and memory.
