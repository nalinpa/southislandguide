# New Year Trip Implementation Plan

**Superseded 2026-11-25:** not built. The owner switched to school holiday family trips ([school-holidays-trips-design.md](school-holidays-trips-design.md)).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One dated suggested trip, "New Year in Queenstown and Wānaka" (Mon 28 Dec 2026 – Sat 2 Jan 2027, 30 and 31 Dec free, 1 Jan a recovery day), plus the art and copy for an App Store in-app event that points at it.

**Architecture:** Suggested trips gain an optional `startDate`. A pure helper decides which trips the picker lists (a dated trip only up to its start date, listed first). Picking a dated trip sets the start date. Free days are empty days (the api keeps only a day's date and stops). The website export leaves dated trips out. JS only: it ships as an over-the-air update on 1.5 and in 1.5's next store build.

**Tech Stack:** TypeScript, React Native (Expo SDK 58), Jest 30 + @testing-library/react-native; Node + `@resvg/resvg-js` for the card image (as `store/screenshots/search/build.js`).

**Spec:** [docs/plans/new-year-trip-design.md](new-year-trip-design.md)

## Global Constraints

- No festival or brand names anywhere: app copy, store copy, image (owner).
- On-screen words: "Trip"/"trip" and "place"; never Itinerary, Plans or Location.
- The trip's dates exactly: Mon 28 Dec 2026 to Sat 2 Jan 2027. 30 and 31 Dec have no stops and no drives.
- JS only: no native change, no new app dependency, no change to the root `.gitignore` (it's in the runtime fingerprint).
- No api change. Not on the website: dated trips stay out of `scripts/export-site-trips.mjs`'s output.
- Never edit a shared day const (`QUEENSTOWN_TOWN_DAY` etc.) for this trip: other suggested trips use them. A changed day is a new const.
- Branch `new-year-trip`, cut from `1.5`. One task at a time, each reviewed before the next. Nothing goes to the `production` channel or App Store Connect without the owner's go.

## Review Focus

- **The date boundary:** the trip shows while today (the phone's local date) is on or before 28 Dec 2026, and is gone from 29 Dec. Pinned in Task 1 (fixtures) and Task 3 (modal on 1 Dec and 29 Dec).
- **Tests rotting after New Year:** any test that loops over every suggested trip through the picker would fail once the trip is hidden. The modal's `it.each` loops over undated trips only; the dated cases run on a fixed clock (Task 3).
- **A stop closed on its date:** 1 and 2 Jan are public holidays, and 28–29 Dec is peak season. Nothing checks hours automatically; Task 2's hours table is the check, and the reviewer reads it.
- **The event outliving the trip:** the trip can't be picked from 29 Dec, so the App Store event must end on 28 Dec (Task 5).
- **The website picking it up after a merge:** on `trip-builder`, the export uses the template list twice (trips and `builderData`). When `1.5` is merged into `trip-builder`, both must take the filtered list (Task 5 note; Task 2's check covers `1.5`).

---

### Task 1: Dated suggested trips and the picker's list

**Files:**
- Modify: `lib/itineraryTemplates.ts` (type at line 37, new export after `defaultTemplateKey`)
- Test: `lib/__tests__/itineraryTemplates.test.ts`

**Interfaces:**
- Produces:
  - `ItineraryTemplate.startDate?: string`: local date `"YYYY-MM-DD"`. Set only on an event's trip. Comment: the trip lands on these dates and can be picked only up to this day.
  - `pickableTemplates(templates: ItineraryTemplate[], start: TripStart, today: string): ItineraryTemplate[]`: that town's trips. A dated trip only while `today <= startDate`; dated trips first (earliest `startDate` first), then the undated ones shortest first, as the modal sorts today (`CreateItineraryModal.tsx:117`). `today` is `"YYYY-MM-DD"`, so plain string comparison works.

- [ ] **Step 1: Write the failing tests** in a new `describe("pickableTemplates")`, with fixtures built in the test (no dated trip exists yet):

```ts
const t = (key: string, start: TripStart, days: number, startDate?: string): ItineraryTemplate =>
  ({ key, start, label: key, description: "", days: Array.from({ length: days }, () => ({ items: [] })), startDate });
const list = [t("long", "queenstown", 5), t("short", "queenstown", 2), t("nye", "queenstown", 6, "2026-12-28"), t("chch", "christchurch", 1)];

it("lists a dated trip first, then the rest shortest first", () => {
  expect(pickableTemplates(list, "queenstown", "2026-12-01").map((x) => x.key)).toEqual(["nye", "short", "long"]);
});
it("still lists a dated trip on its start date", () => {
  expect(pickableTemplates(list, "queenstown", "2026-12-28").map((x) => x.key)).toContain("nye");
});
it("drops a dated trip the day after it starts", () => {
  expect(pickableTemplates(list, "queenstown", "2026-12-29").map((x) => x.key)).toEqual(["short", "long"]);
});
it("keeps to the chosen town", () => {
  expect(pickableTemplates(list, "christchurch", "2026-12-01").map((x) => x.key)).toEqual(["chch"]);
});
```

- [ ] **Step 2: Make the existing "ends inside the 8am to 10pm grid" test skip empty days** (`const last = …` is `undefined` on a free day), and add the rule that only a dated trip may have them:

```ts
it.each(ITINERARY_TEMPLATES.map((t) => [t.key, t] as const))("%s: has free (empty) days only if it is dated", (_k, t) => {
  if (!t.startDate) expect(t.days.every((d) => d.items.length > 0)).toBe(true);
});
```

- [ ] **Step 3: Run:** `npx jest lib/__tests__/itineraryTemplates.test.ts`. Expected: FAIL, `pickableTemplates` is not exported.
- [ ] **Step 4: Add `startDate` and `pickableTemplates`** (signatures above). Update the file's header comment: trips are dateless except an event's, which carries `startDate`.
- [ ] **Step 5: Run:** `npx jest lib/__tests__/itineraryTemplates.test.ts && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Commit:** `feat(trips): suggested trips can carry a start date`

---

### Task 2: The New Year trip

**Files:**
- Modify: `lib/itineraryTemplates.ts` (new day consts near `WANAKA_TO_QUEENSTOWN_DAY`, line ~206; the entry after `queenstown-and-wanaka-in-four-days`, line ~901)
- Modify: `scripts/export-site-trips.mjs:22`
- Test: `lib/__tests__/itineraryTemplates.test.ts`

**Interfaces:**
- Consumes: `startDate`, `pickableTemplates` (Task 1).
- Produces: the template with key `"new-year-in-queenstown-and-wanaka"`, which Task 3's tests find by key.

- [ ] **Step 1: Write the failing tests:**

```ts
describe("the New Year trip", () => {
  const nye = ITINERARY_TEMPLATES.find((t) => t.key === "new-year-in-queenstown-and-wanaka")!;
  it("runs Mon 28 Dec 2026 to Sat 2 Jan 2027, starting in Queenstown", () => {
    expect(nye.start).toBe("queenstown");
    expect(nye.startDate).toBe("2026-12-28");
    expect(nye.days).toHaveLength(6);
  });
  it("leaves 30 and 31 Dec free, and every other day has stops", () => {
    expect(nye.days.map((d) => d.items.length > 0)).toEqual([true, true, false, false, true, true]);
  });
  it("is Queenstown's first trip up to 28 Dec, and gone on the 29th", () => {
    expect(pickableTemplates(ITINERARY_TEMPLATES, "queenstown", "2026-12-28")[0].key).toBe(nye.key);
    expect(pickableTemplates(ITINERARY_TEMPLATES, "queenstown", "2026-12-29").map((t) => t.key)).not.toContain(nye.key);
  });
  it("names no festival", () => {
    expect(`${nye.label} ${nye.description}`).not.toMatch(/rhythm|alps|festival/i);
  });
});
```

- [ ] **Step 2: Run:** `npx jest lib/__tests__/itineraryTemplates.test.ts -t "New Year"`. Expected: FAIL (`nye` is undefined).
- [ ] **Step 3: Add the day consts:**
  - `FREE_DAY: ItineraryTemplateDay = { items: [] }`, with a comment: a free day in an event's trip; the day view shows "Nothing here yet" there.
  - `NEW_YEARS_DAY_RECOVERY`: a slow Wānaka morning, then back to Queenstown for the hot pools. Start from `big-fig-wanaka` "Big Fig" at slot 5 for 2 slots (10:30, open daily 8am–8.30pm), then `onsen-hot-pools` "Onsen Hot Pools" at slot 14 for 2 slots (3:00 PM; daily 9am–11pm, bookings essential). Move slots only as far as the packing test needs for the Crown Range drive.
- [ ] **Step 4: Add the entry:**

```ts
{
  key: "new-year-in-queenstown-and-wanaka",
  start: "queenstown",
  label: "New Year in Queenstown and Wānaka",
  description:
    "Day one in Queenstown: the gardens, the Earnslaw and the gondola. Day two: the Shotover Jet and Arrowtown, then over the Crown Range to Wānaka. The 30th and 31st are left free. New Year's Day: a slow breakfast in Wānaka, then the hot pools back in Queenstown. Day six up the lake to Glenorchy.",
  free: true,
  startDate: "2026-12-28",
  days: [QUEENSTOWN_TOWN_DAY, QUEENSTOWN_TO_WANAKA_DAY, FREE_DAY, FREE_DAY, NEW_YEARS_DAY_RECOVERY, GLENORCHY_DAY],
},
```

- [ ] **Step 5: Check every stop's hours on its date.** Mon 28 Dec: `QUEENSTOWN_TOWN_DAY`. Tue 29 Dec: `QUEENSTOWN_TO_WANAKA_DAY`. Fri 1 Jan (public holiday): the recovery day. Sat 2 Jan (public holiday): `GLENORCHY_DAY`. Use each operator's own page, and the booking page for set times (the Earnslaw's 1pm sailing in late December). Put the results in a table in the task's report: stop, date, hours found, source URL, OK or not. If a stop in a shared day is closed or mistimed on its date, copy that day into a new const for this trip with a swap. Never edit the shared const. Name each swap in the report for the owner.
- [ ] **Step 6: Leave dated trips out of the website export.** In `scripts/export-site-trips.mjs`, `const templates = ITINERARY_TEMPLATES.filter((t) => !t.startDate);`, and map `templates`.
- [ ] **Step 7: Run:** `npx jest lib/__tests__/itineraryTemplates.test.ts && npm run typecheck`. Expected: PASS, including the packing tests for the new trip.
- [ ] **Step 8: Run the export into the scratchpad:** `node --no-warnings scripts/export-site-trips.mjs <scratchpad>/trips.json`. Expected: `26 trips -> …`, and the file has no `new-year-in-queenstown-and-wanaka`. It reads the api's cached list, which costs 0 Firestore reads.
- [ ] **Step 9: Commit:** `feat(trips): New Year in Queenstown and Wānaka, with the 30th and 31st free`

---

### Task 3: The picker, the start date and the analytics key

**Files:**
- Modify: `components/itinerary/CreateItineraryModal.tsx:117` (list), `:481-485` (option press), `:232` (event)
- Test: `components/itinerary/__tests__/createItineraryModal.test.tsx`

**Interfaces:**
- Consumes: `pickableTemplates`, `startDate` (Task 1); key `"new-year-in-queenstown-and-wanaka"` (Task 2).
- Produces: `suggested_trip_picked` params `{ start_town, days, trip_key }`.

- [ ] **Step 1: Update and add the tests:**
  - `it.each` in "creating from a template" loops over `ITINERARY_TEMPLATES.filter((t) => !t.startDate)`, so it holds after New Year.
  - The analytics test expects `{ start_town: template.start, days: template.days.length, trip_key: template.key }`.
  - New `describe("a dated trip")` on a fixed clock: `beforeEach(() => jest.useFakeTimers({ now: new Date("2026-12-01T09:00:00"), advanceTimers: true }))` and `afterEach(() => jest.useRealTimers())`:
    - `it("is listed first among Queenstown's trips")`: press "Queenstown", then "Blank". The first option after Blank reads "New Year in Queenstown and Wānaka".
    - `it("sets the start date when picked, and saves 28 Dec to 2 Jan with the 30th and 31st empty")`: pick it, press "Create Trip". The payload has `startDate: "2026-12-28"` and `endDate: "2027-01-02"`, `days[2].items` and `days[3].items` are `[]`, and `days[2].date` is `"2026-12-30"`.
    - `it("is gone from the list on 29 Dec")`: `jest.setSystemTime(new Date("2026-12-29T09:00:00"))` before opening. `queryByText("New Year in Queenstown and Wānaka")` is null after opening the list.
- [ ] **Step 2: Run:** `npx jest components/itinerary/__tests__/createItineraryModal.test.tsx`. Expected: FAIL (list order, start date, `trip_key`).
- [ ] **Step 3: Wire it:**
  - `startTemplates = pickableTemplates(ITINERARY_TEMPLATES, start, isoDate(new Date()))`, and update the comment.
  - In the option's `onPress`, when that option's template has a `startDate`, `setStartDate(new Date(`${startDate}T00:00:00`))`. Picking Blank or another trip afterwards leaves the date as it is.
  - Add `trip_key: template.key` to the event.
- [ ] **Step 4: Run:** `npx jest components/itinerary && npm run typecheck`. Expected: PASS. Then the full suite, `npm test -- --ci`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(trips): a dated trip sets its own start date in the picker`

---

### Task 4: The event card image and store copy

No app code. Rendered the way the search result asset is (`store/screenshots/search/build.js`; setup in the header of `store/screenshots/duo/build.js`).

**Files:**
- Create: `store/screenshots/event/build.js`, `store/screenshots/event/kiwi-guide-nye-card.png` (1920 × 1080), `store/screenshots/event/kiwi-guide-nye-details.png` (1080 × 1920, for the event's details page)

- [ ] **Step 1: Find 2–3 candidate photos** of Lake Wakatipu/Queenstown or Lake Wānaka, CC0 or CC BY (Wikimedia Commons), each at least 1920 px on the long side, with nothing branded in shot. **Stop and show them to the owner. The owner picks.**
- [ ] **Step 2: Write `build.js`** from the search build: photo backdrop covering the whole canvas, the same darkening gradients and text shadow, Bahnschrift 600, `TEAL = "#095C65"`, `YELLOW = "#FFC20E"`. Copy: line 1 `New Year in` (white), line 2 `Queenstown & Wānaka` (yellow), chip `6 days · 28 Dec – 2 Jan`. The photo's credit goes in an SVG comment. Text at least 80 px from every edge. Render both sizes as 8-bit RGB with no alpha.
- [ ] **Step 3: Verify:** both PNGs are the stated sizes, with IHDR colour type 2. The headline is readable at 1/5 scale.
- [ ] **Step 4: Show the owner both images**, with the copy drafts below. Make their changes. Commit on their OK: `store(event): New Year event card`.

**Copy drafts for App Store Connect** (owner edits; lengths counted):
- Event name (26): `NYE in Queenstown & Wānaka`
- Short description (42): `A 6-day trip with New Year’s Eve left free`
- Long description (111): `Queenstown and Wānaka over New Year: adventure first, 30 and 31 December free, a slow 1 January, then the lake.`

---

### Task 5: Ship (owner)

- [ ] Merge `new-year-trip` into `1.5`. Check the runtime still matches 1.5's live build (`npx eas-cli fingerprint:compare`, or compare against the store build's runtime).
- [ ] Over the air: `npx eas-cli update --channel production --platform ios --message "New Year in Queenstown and Wānaka"` from `1.5`.
- [ ] Put it in 1.5's next store build, so a new install sees the trip on its first open. If the version bump changes the fingerprint, later updates must be published for both runtimes.
- [ ] App Store Connect → In-App Events:
  - The copy and images from Task 4.
  - Badge: Special Event.
  - No deep link.
  - Regions: New Zealand and Australia.
  - Start: once the update is live, about 1 Dec 2026. **End: Mon 28 Dec 2026**, the last day the trip can be picked.
  - Publish as soon as it's approved.
- [ ] When `1.5` is next merged into `trip-builder`: in `scripts/export-site-trips.mjs`, both the trips map and `builderData(…)` take the filtered `templates`. Re-run the export there.
- [ ] TASKS.md: tick the New Year trip; add "next year: move `startDate` to 2027 and recheck hours" under Later.
