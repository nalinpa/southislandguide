# The quiz's trip as the app shows it — build plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. One task at a time; the owner said to run without waiting per stage. Nothing goes live: both repos on `trip-builder`; a preview link at the end (`npx wrangler versions upload`).

**Goal:** The quiz's reveal shows the built trip with the app's Trip | Days view, with the app's own numbers and words.

**Architecture:** The app's pure helpers (`tripSummary`, `dayLegs` in `lib/utils/itineraryPhysics.ts`; `routeLine`, `dateParts`, moved from `components/itinerary/TripOverview.tsx` to `lib/utils/tripLines.ts`) are bundled into the site's `public/plan/pack.js` by the existing export, with the app's colour tokens. The site renders both views in plain HTML/CSS/JS (`public/plan/tripview.js`, pure render functions tested with `node --test`).

**Tech Stack:** As the trip builder: static site, `node --test`; esbuild in the app repo's `scripts/`; Jest.

**Spec:** [docs/plans/trip-view-design.md](trip-view-design.md) (owner approved 2026-11-22: "leave [the map] out of this build").

## Global Constraints

- Everything in `docs/plans/trip-builder-build.md` Global Constraints still holds (static site, self-hosted scripts, no CSP change, 300 KB gzipped budget, Trip/Trips and "place" wording, save flow unchanged, nothing live, commit only named files).
- The only app-repo code change is the move of `routeLine` and `dateParts` into `lib/utils/tripLines.ts`, re-exported/imported by `TripOverview.tsx` with no behaviour change; the app's Jest suites for `TripOverview` must still pass.
- Same words as the app: "Day N · <dateParts(date, 'short')>", `routeLine(areaNames)`, "<n> places · <h> hours driving" and "Starts with the drive from <town>" exactly as `TripOverview.tsx` builds them (read its row code; reuse its label rules, e.g. singular "1 place", "1 hour", half hours).
- No drag handles, nothing editable. No map.
- iPad (≥ 1024 px): list and day side by side, no switch. Phone: the Trip | Days switch.

## Review Focus

1. A free day (no items): the Trip row and the Days view show it the way the app shows an empty day, never a blank or an error. (Task 2, `free day` tests.)
2. Day 1 and the day after a long drive: "Starts with the drive from <town>" appears exactly when `tripSummary` gives an `openingDrive`. (Task 2, `opening drive` test.)
3. Switching loop / one-way after opening Days on day 7 of a 12-day trip, when the other option is shorter or different: the Days view resets to a day that exists. (Task 2, `option switch` test.)
4. A long place name and a 21-day trip on a 375 px phone: nothing overflows sideways; the tab strip scrolls inside itself. (Task 2, screenshots at 375 × 667.)
5. Dark mode: the teal blocks and text keep contrast (the app's dark tokens). (Task 2, screenshots dark.)

---

### Task 1: The app's trip helpers in `pack.js`

**Files:**
- Create: `lib/utils/tripLines.ts` (app repo) — `routeLine(towns: string[]): string`, `dateParts(iso: string, length: "short" | "long"): string`, moved verbatim from `components/itinerary/TripOverview.tsx` with their comments.
- Modify: `components/itinerary/TripOverview.tsx` (import them back; keep exporting them from there too so existing imports work), `scripts/pack-entry.ts` (add `tripSummary`, `dayLegs`, `routeLine`, `dateParts`, `areaName`, and the app's colour tokens from `lib/ui/tokens.ts` as `tokens`), the export's source-hash list (add `tripLines.ts`, `tokens.ts`).
- Test: `lib/__tests__/siteBuilderData.test.ts` (add), the existing `components/itinerary/__tests__/tripOverview.test.tsx` (unchanged, must pass).

**Interfaces:**
- Produces: `window.KiwiPack` (and `module.exports` under Node) gains `tripSummary(days, lookup) -> DaySummary[]`, `dayLegs(items, lookup, startFromSiteId?) -> DayLeg[]`, `routeLine`, `dateParts`, `areaName(id) -> string`, `tokens` (the light and dark colour values the app uses for the trip screen).

- [ ] **Step 1: Write the failing test** `pack.js exposes the trip helpers`: load the site's `pack.js` with `require`; assert the six names exist; `routeLine(["Dunedin","Aoraki / Mount Cook"])` equals the app's own `routeLine` output for the same input; `tripSummary` on one suggested trip's days (from `builder-data.json`) deep-equals the app's `tripSummary` run in Jest on the same days and lookup.
- [ ] **Step 2: Run it to see it fail.** `npx jest lib/__tests__/siteBuilderData.test.ts` (PowerShell).
- [ ] **Step 3: Move the two helpers, extend `pack-entry.ts` and the hash list, re-run the export** (`node --no-warnings scripts/export-site-trips.mjs`). If the bundle pulls in React Native (tokens.ts must stay plain), stop and report.
- [ ] **Step 4: Run** the Jest file above plus `components/itinerary/__tests__/tripOverview.test.tsx` and `lib/__tests__/itineraryTemplates.test.ts`; `node --test` in kiwiguide-site; the size test stays under 300 KB.
- [ ] **Step 5: Commit** app repo (`lib/utils/tripLines.ts`, `components/itinerary/TripOverview.tsx`, `scripts/pack-entry.ts`, `scripts/lib/builderData.ts` if the hash list lives there, the test) `feat(export): the app's trip helpers in pack.js`; site repo (`public/plan/pack.js`, `public/plan/builder-data.json`) `data(plan): trip helpers in pack.js`.

---

### Task 2: The Trip | Days view on the reveal

**Files:**
- Create: `kiwiguide-site/public/plan/tripview.js` (pure render functions + `module.exports`), `kiwiguide-site/public/img/icons.svg` (a sprite of the Lucide icons the app uses per category; read `components/itinerary/ItineraryDetailView.tsx` `iconFor` for the mapping; Lucide is ISC-licensed: keep its licence line in the file), `kiwiguide-site/test/tripview.test.js`
- Modify: `public/plan/quiz.js` (the reveal uses tripview; Save, Start again, the loop/one-way switch, "Built for you", the season line and the long-drive line stay), `public/plan/index.html` (script tag), `public/styles.css`

**Interfaces:**
- Consumes: `KiwiPack.tripSummary`, `dayLegs`, `routeLine`, `dateParts`, `areaName`, `tokens` (Task 1); a TripOption from `buildTrips` with dated days (the quiz adds dates as `tripBody` does).
- Produces: `tripRows(option, pack, lookup) -> [{ day, dateLabel, route, meta, opening, overLimit, photo }]`, `dayTimeline(day, prevDay, pack, lookup) -> [{ kind: "stop" | "drive" | "hour", … }]`, `renderTrip(rows) -> string`, `renderDay(timeline) -> string`.

- [ ] **Step 1: Write the failing tests** in `test/tripview.test.js` (real `builder-data.json` and `pack.js`):
  - `rows match the app`: for one built 12-day Dunedin option, each row's `route` equals `routeLine(summary.areas.map(areaName))` and `meta` equals the app's "<n> places · <h> hours driving" for that day's `tripSummary`.
  - `opening drive`: `opening` is "Starts with the drive from <town>" exactly when `openingDrive` is set.
  - `free day`: a free day gives a row and a day view in the app's empty-day form (read TripOverview/GuestDayView for its text), not an error.
  - `timeline`: stops at their slots (8 AM = slot 0, 30-minute slots, labels "3:30 – 4:00 PM" as the app's `slotRangeLabel`), a "<n> min drive" / "<h> hour drive" item for each `dayLegs` drive, hour lines 8 AM to 10 PM.
  - `option switch`: switching to an option with fewer days keeps an open day that exists (clamped).
  - `no editing`: the rendered Days HTML has no drag handle or editable control.
- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Build `tripview.js`** and wire the reveal: phone = Trip | Days switch (Trip first; a row tap opens Days on that day); ≥ 1024 px = list and day side by side. Colours as CSS custom properties from `KiwiPack.tokens` (light and dark), photos from the day's first stop with a photo (the existing `stopPhoto`).
- [ ] **Step 4: Run** `node --test` (all pass).
- [ ] **Step 5: Look at it:** serve `public/` and shoot the reveal (Trip and Days) at 375 × 667, 390 × 844, 1024 × 1366, 1366 × 1024, light and dark, for Dunedin 12 days and Invercargill 21 days (with free days); no account created.
- [ ] **Step 6: Commit** (site repo) `public/plan/tripview.js`, `public/img/icons.svg`, `public/plan/quiz.js`, `public/plan/index.html`, `public/styles.css`, `test/tripview.test.js` — `feat(plan): the trip as the app shows it`.
- [ ] **Step 7 (controller):** `npx wrangler versions upload` from kiwiguide-site on `trip-builder`; send the owner the preview link.

---

## After the final review (2026-11-23)

Built on `trip-builder`: app cdbc0f9; site b87eb3b (data), 86f1a3e (view), af523b4 (open-row contrast), 7f7cc31 (final fixes). The final review (four lenses, each finding verified, then triaged) found the words, numbers, dates, icons and colours match the app; its 17 must-fix items plus D9, D11, D15 and a dead-photo pin were fixed in 7f7cc31 and re-reviewed clean, checked in Chromium and WebKit. Preview (not deployed): https://69bfdeb1-kiwiguide.blacksands.workers.dev/plan/

**Owner calls, after the preview:**
1. iPad held upright: the app puts the list and the day side by side from 600 pt; the site switches at 1024 px, as the spec says. One media query if yes.
2. The Days blocks' look: the app centres the name, adds a pale stripe down the left and a line every half hour; the site's blocks are plain. The CSS is ready if yes.
3. The activity lines ("Hot pools: …"): now under the trip so Day 1 is on the first phone screen; or on each day's row.
4. Drive words are the app's ("Drive to X", "A to B", "8:00 AM · About 1.5 hours", "60 min drive"), not the mock's "1.5 hour drive".
5. Free days read as the app's empty day ("Nothing planned yet" / "Nothing here yet"); the old reveal's warmer line is gone.
6. Focus ring: the site's kiwi ring is 1.48:1 on the light page, on every quiz control. Change it site-wide or leave it.
7. Paywall: if the view fails, "Your days would not show" sits above Save. Revisit when Save leads to paying.
8. End to end: nobody has saved a trip from this reveal and opened it in the app (needs a test account; writes to live Firestore).

**Deferred (minor):** D3 wide rows keep the phone's type sizes, no band behind the list; D4 the Trip | Days switch scrolls away on the phone (the day strip stays); D6 screen-reader labels for rows (port the app's spoken rules, TripOverview.tsx:114-125); D7 at 320 px the route can break inside a town name; D8 `slotRangeLabel` and the previous-day rule are copies of app code (export them at the next export); D10 on wide screens the pinned day panel rides up at the end of a long trip; D12 tripview.js borrows quiz.js's `stopPhoto`; D13 `aria-current` on the phone's row; D14 the option-switch test covers `clampDay` only; D16 the open-row contrast test is long; D17 a dead `RN_STUB` exemption in the bundle guard; D18 pack-entry.ts imports itineraryPhysics twice.

**Device checks left:** iPhone Safari and the in-app browsers (Instagram, Facebook, TikTok); VoiceOver; tap speed on an older phone (180-306 ms per tap at 4× CPU throttle); iOS page zoom, and the tap highlight on the day panel; Firefox; short laptop windows (1366×650, 1280×600); iPad Split View, Slide Over and Stage Manager sizes; a reveal shown before midnight and saved after.
