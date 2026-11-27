# The trip builder quiz in the app (1.6) — plan

Status: plan read by the owner and its questions answered, 2026-11-26. Stage 0 (speed check) done 2026-11-27. Stage 1 (the rules and data in the app) done 2026-11-27, committed on branch `1.6` (2d29cb3). Stage 2 (the quiz's memory) built and reviewed 2026-11-27, not committed. No stage starts without the owner's go.

## What it is

The quiz on kiwiguide.app/plan/ rebuilt as app screens: the same questions, the same rules, the same trips. Someone answers, sees a trip built for them, and saves it as a normal trip in the Trips tab.

## What's there today

- **The rules are plain JavaScript with no browser code:** `kiwiguide-site/public/plan/builder.js` (897 lines), called as `buildTrips(data, pack, answers)`. The app can run this file as it is.
- **The three things the builder needs from `pack` are already app code:** `getLeg`, the town hubs and `packTrip`. The site's `pack.js` is a bundle of them.
- **The builder's data is made by the app** (`scripts/lib/builderData.ts`, written to the site as `builder-data.json`, 212 KB).
- **The quiz is one file in two halves** (`quiz.js`): lines 1–369 are the logic (step order, towns, minimum days per start and finish, the card deck, saved answers, the summary lines), tested, no browser code. Lines 370–1047 draw the web page. The logic can be copied; the screens have to be built again for the app.
- **The app already has the rest:** sign-in, the trip view (a guest already sees a locked sample trip drawn by it), and the call that saves a trip.
- **No new native code is needed:** the swipe deck and the days picker can use the gesture and animation packages already in the app.

## Decided by the owner

- **The web quiz is finished enough to copy** (2026-11-26).
- **No "How did you hear about us?" in the app** (2026-11-26: "drop it"). The app's step list leaves that step out; the copied quiz logic isn't edited.
- **The opening tour ends with the quiz** (2026-11-26): "add it to the tour as a final thing after the map". A new last step after "See It on the Map" offers it.
  - How (Claude's calls): a centred card like the map's, on the Trips tab, so closing the quiz lands where the trip will be. Title "Build Your Trip", body "Answer a few questions and we'll plan your days." The main button, "Build My Trip", ends the tour and opens the quiz. A quiet "Not Now" ends the tour as Done does today. Everyone sees it, guests included.
  - Someone who taps Skip Tour earlier doesn't see the card, and people who took the tour before 1.6 never see it again. Both find the quiz on the Trips tab.
  - `tour_finished` still logs on either button, with which one was tapped.
- **Two ways in** (2026-11-27): "new trip building button on the trip page when trip is empty plus run it at the end of the tour". Read as: a "Build My Trip" button on the Trips tab while it has no trips (a guest's Trips screen too), and the tour's last step. Not in the New Trip sheet, so someone who already has trips has no way in unless the owner adds one.

## Calls made here (Claude's; the owner can change any)

1. **The website stays the home of the rules. The app takes a stamped copy.** A script (`scripts/copy-site-builder.mjs`) copies `builder.js`, the quiz logic and the data into the app with the site commit in a header ("copied, don't edit here"). The owner keeps tuning on the web as now; the app picks the rules up when the script is re-run. The other way (move the rules into the app, the site takes the copy) means moving 170 tests and the scan scripts while the web builder is still being tuned. Not now.
2. **Guests can take the quiz and see their trip. Saving asks them to sign in.** Same as the web, where Save is the last hurdle (owner's standing call). Answers and the built trip are kept on the phone, so they come back from sign-in to the same trip.
3. **Same questions in the same order as the web**, less "How did you hear about us?" (owner). "Who's travelling?" and "How old are you?" stay, analytics only, as on the web.
4. **The trip screen is the app's own trip view** with Save at the top, not a copy of the web's.
5. **The builder's data ships inside the app** (works on a first open with no signal). A new export plus an over-the-air update refreshes it.
6. **Quiz photos load from the api**, as on the web, with a plain card when there's no signal. Each photo's licence is checked for in-app use and added to the app's photo credits.
7. **Existing design only:** engine components and today's colours and type. No restyle (that's 2.0).
8. **The suggested-trip picker in New Trip stays as it is.** The quiz is a second way to start a trip.
9. **1.6 is a store build.** Not tied to the school holidays event: those trips go out first on 1.5.

## Stages

One builder at a time, each reviewed before the next. The owner sees each stage on a phone before the next starts.

| # | Stage | What the owner sees at the end |
|---|-------|--------------------------------|
| 0 | **Speed check.** Run the copied builder in a development build and time the slowest cases (21 days, every start). | A table of seconds per build on a real iPhone. Decides how the waiting screen works. |
| 1 | **Bring the rules over.** The copy script; `builder.js`, the quiz logic and the data in the app. The script leaves out `quiz.js`'s web page half, so the site isn't touched. A test that the app builds the same trips as the website for a fixed set of answers. | Tests green. Nothing on screen yet. |
| 2 | **The quiz's memory.** Answers, step order, back rules, kept on the phone. Tests only. | Nothing on screen yet. |
| 3 | **Screens, first half:** where you start, how long, how many days, where you finish, the photo breaks, when. | Tap through the first half on a phone. |
| 4 | **Screens, second half:** pace, driving, who, age, the 11-card "What are you into?" swipe deck, food. | Tap through every question. |
| 5 | **The trip:** the waiting screen, the choice between trips, the trip in the app's trip view. | Answer the quiz, see the trip. |
| 6 | **Save.** Signed in: saved and opened in Trips. Guest: sign in, back to the same trip, saved. | A quiz trip in Trips, editable like any other. |
| 7 | **Ways in** (owner). The tour's new last step after the map. A "Build My Trip" button on the Trips tab while it has no trips. | A fresh install ends the tour on the quiz offer; anyone with no trips reaches it from Trips. |
| 8 | **Checks:** iPad, Duo (folded and open), dark mode, VoiceOver, no signal, quiz analytics events, the same-trips set run on a phone. | A checklist with a screenshot per layout. |
| 9 | **Ship:** development-channel testing, then the 1.6 store build. | 1.6 in review. |

## Stage 0 results (2026-11-26, the owner's go)

- **On this PC (Node):** 20,412 answer sets, 7 ms a build on average, 80 ms at worst (21 days, Lots of walking, 2 hours' driving).
- **Same trips:** the app's own `getLeg`, hubs and `packTrip` build exactly the website's trips for 24 answer sets (the 12 slowest and two everyday trips per start town). No `pack.js` needed in the app.
- **For stage 1's test:** jest swaps the drive tables for fixtures (`jest.config.js`), which changes the trips. The same-trips test has to load the real tables (`jest.requireActual` by relative path).
- **On the phone (iPhone XR):** a timing screen went to the `development` branch as an update (runtime 6d4de70d). The first send (group 98393c00) stuck on the splash screen: the root layout holds the splash up and only the `(app)` and `(auth)` layouts take it down, and the timing screen is outside both. Fixed and sent again 2026-11-27 (group 109ed0b6).
- **The owner's iPhone XR, 2026-11-27 (24 answer sets, 3 runs each):**
  - The 12 slowest answer sets (17 to 21 days): 137 to 238 ms usual, 288 ms at worst. That worst one was also the very first build after opening.
  - Everyday trips (7 and 10 days, every start town): 16 to 36 ms usual, 41 ms at worst.
  - About 2 to 3 times this PC's times.
  - Same trips as the website: 24 of 24, on the phone's own JavaScript engine.
- **What it decides:** the build runs straight away on the phone, with no background thread and no progress bar. An XR is a 2018 phone; one twice as slow still builds in about half a second. The waiting screen in stage 5 is for feel only: a short fixed pause, as on the web, not a wait for the work.
- **For stage 3 on:** any quiz screen outside `(app)` and `(auth)` that can be the first screen has to hide the splash itself. Simplest is to put the quiz inside `(app)`.
- **The development build on the phone is behind main.** It was built on 20 Nov (a0c52db); 805d79b then added an Info.plist key (`FIREBASE_ANALYTICS_COLLECTION_ENABLED`), which changes the runtime, so updates from main don't load in it. The spike was sent without that key to match. Stage 3 on needs a new development build.
- The spike is kept in a stash ("SPIKE builder speed"), never merged.

## Stage 1 results (2026-11-27, the owner's go)

- **The copy script:** `node scripts/copy-site-builder.mjs` takes `builder.js`, `quiz.js` (less its web page half) and `builder-data.json` as the site has them committed, and writes `lib/tripBuilder/builder.js`, `lib/tripBuilder/quizLogic.js` and `assets/data/builder-data.json`, each stamped with the site commit (ce3f894).
- **The site isn't touched.** The plan had `quiz.js` split in two on the site. The script cuts the page half off instead, and stops if it can't find where that half starts. No site change, no deploy.
- **The app's way in to the builder:** `buildTrips(answers)` in `lib/tripBuilder/index.ts`, with the app's own `getLeg`, hubs and `packTrip`.
- **The same-trips test** (`lib/__tests__/tripBuilder.test.ts`): 153 answer sets: the 24 from stage 0, and every start town at every length from 2 to 21 days, with the finish, pace, driving and interests turned through. They build 204 trips that reach every finish town, Milford, Doubtful Sound, Hanmer, Kaikōura and the West Coast, rest days and over-the-limit days, and 239 of the 398 places. The trips to match come from the site's own builder and `pack.js`, written by the script to `test/fixtures/site-trips.json`. One more test builds a trip from the copied quiz's answers.
- **When the web rules change:** commit on the site, run the script, run the tests. `node scripts/copy-site-builder.mjs --check` says whether the app's copy is what the site has now; it isn't in CI (CI has no copy of the site).
- **If the same-trips test fails after a drive-times change in the app:** the site's `pack.js` is older than the app's tables. Export to the site again, then copy again.
- **Reviewed** (one reviewer, 2026-11-27): no blockers. Fixed: the day and stop types, a check on the quiz's answers, the wider answer sets, and a note from the script when the site has uncommitted edits. Left: the reviewer's worry that the phone's JavaScript engine might order two equal-cost routes differently. The phone matched 24 of 24 in stage 0; stage 8 runs the full set on a phone.
- Whole suite 103 files green, typecheck clean. No `package.json` change (its scripts are part of the runtime fingerprint).

## Stage 2 results (2026-11-27, the owner's go)

- **The quiz's memory** (`lib/tripBuilder/quizFlow.ts`): the answers in the website's shape, the app's steps (the website's less "heard", "account" and "done"), where each answer leads, what it clears, where Back goes, and where a saved quiz opens again. The rules were read off the website's page code (its click handler, Back and render) and run over the copied logic.
- **Kept on the phone** (`lib/tripBuilder/quizStorage.ts`): the answers and the step, so a half-done quiz comes back after the app is closed. The website forgets its quiz with the tab. It never expires (Claude's call); Start again clears it. A saved month that has passed is dropped, and the quiz opens on the first question with no answer.
- **The built trips aren't saved**: they are built again from the answers.
- **The copy script now hands out five more of the website's lists** the screens need (vibes, kinds of place, driving, seasons, month names). The website's own export line leaves them out; the script adds one line to the copy rather than changing the site.
- **Reviewed** (one reviewer): the step, clear and Back rules match the website line for line. Fixed: days kept between the fewest for the start town and 21, vibes kept in the website's order, lists copied, trips "not built yet" told apart from "none fit", a type.
- **Back skips the driving question when the way in skipped it** (owner, 2026-11-27: "i want that fixed in both"). Fixed on the website in the copied logic (`backStep` now takes the answers; site branch `quiz-back-skips-driving`, 190334c, local: not merged, pushed or deployed) and brought into the app by the copy script (the app's copy is stamped 190334c). Left as the website has it: the "Happy to drive" that the skip sets stays chosen if the trip is later changed to a short one, where the question is asked again.
- **For stage 5:** the website drops activities not on offer for the start month (skiing) before it builds; the app has to do the same to build the same trips.
- Tests: 59 for the flow, 7 for the storage.

## Catches

- **Speed.** Measured in stage 0: under 0.3 s at worst on an iPhone XR. Not a catch any more.
- **A place switched off after the data was made.** The builder could pick it. The app drops a stop it has no place for, and a test fails the build if the bundled data names a place the bundled list lacks.
- **Web and app can drift.** After a rule change on the web, the app builds the old trip until the copy script is re-run and an update goes out. A check in the app repo says when its copy is behind the site.
- **A guest who never signs in** keeps one built trip on the phone, not on their account.
- **Website-only days and moves** (the Catlins, West Coast and Te Anau days, Mt John before the springs) come along with the rules and the data, so the app's built trips match the web's. The app's 26 suggested trips don't change.
- **Timed trips** (the school holidays family trips) stay out of the builder's data, as planned.

## Still open on the web

The small-circle rule, Lots of walking after 6 PM and the Wānaka lakefront favourite. They reach the app later through the copy script.

## Not in 1.6

- Apple AI in the builder, and Siri (TASKS.md backlog).
- Suggested trips edited in the admin panel (TASKS.md backlog).
- A paywall on saving. Payments come straight after 1.6 (owner, 2026-11-27): full access paid as in Rotorua, and a custom trip costing more on top (TASKS.md, After launch: the paid unlock).
