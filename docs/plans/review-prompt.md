# Plan: the App Store review prompt

Written 2026-10-17. Launch plan item C5 (`docs/plans/launch.md`). Adapted from Rotorua's spec and plan:

- `rotorua-guide/docs/superpowers/specs/2026-08-19-review-prompt-integration-design.md`
- `rotorua-guide/docs/superpowers/plans/2026-08-19-review-prompt-integration.md`

Line numbers below were right on this date and drift; confirm each before relying on it.

## What it does

At a good moment, the app asks the system to show Apple's own "Enjoying South Island Guide?" rating sheet. The app never decides whether the sheet actually appears: iOS shows it at most three times a year per person, and may show nothing. So the app keeps no "asked already" record of its own.

The shared hook does the asking: `useReviewPrompt` in `@blacksands/hooks` (`enginev1/hooks/src/useReviewPrompt.ts`). Its `requestReview()` checks the store review service is available, asks, and swallows every failure, so a call site needs no `await`, no try/catch and no error message.

## What changes from Rotorua's plan

| Rotorua's plan | Here |
|---|---|
| Tasks 1 and 2: release `@blacksands/hooks` 0.4.5 and bump to it | **Not needed.** The installed copy is 0.4.7, which has `useReviewPrompt` (`node_modules/@blacksands/hooks/dist/index.d.ts`). Only the version range in `package.json` (`^0.4.1`) should be raised to `^0.4.7`, so the requirement is written down. |
| Task 3: `npx expo install expo-store-review` | **Already installed** (`~57.0.3`, commit `0680045`). Only the adapter in `lib/hooksBag.ts` is missing. |
| One trigger, first trip created | Rotorua has since added two more (commit `562d136`): the **second app open** (`app/_layout.tsx`, with `lib/hooks/useAppOpenCount.ts`) and the **first review posted** (`app/(app)/(tabs)/sites/[siteId]/index.tsx`). Question 1 below. |
| No test harness: manual QA only | **This repo works test-first** (jest, React Native Testing Library). Every trigger gets its tests first; manual checks only for what a device shows. |
| `useItineraries` `onSuccess` is synchronous | Here it awaits the list refetch, and saves go through an offline queue. The prompt is asked **before** the refetch is awaited, so it isn't held up by it. |

The launch plan had suggested "once a trip first has three or more places". Under launch decision 2 a free user can't add places, so that moment would never reach them. Creating a trip from a suggested itinerary does, which is one reason to keep Rotorua's "first trip created".

## Questions for the owner

1. **Which moments ask?** Recommended: **the first trip created, and the first review posted.** Both come after the person has got something out of the app.
   - **Not the second app open**, which Rotorua also uses. It asks before the person has done anything, and with only three sheets a year per person, an early one is wasted.
   - Who each moment reaches:
     - **First trip created:** free users (from a suggested itinerary) and paid users.
     - **First review posted:** anyone signed in.
     - **Guests:** neither, since they can't make trips or post reviews.
2. **Anything to hold it back?** Recommended: **no extra rule.** The system already limits it, and both moments are deliberate actions the person has just finished. (If the opening tour is built to start on first open, neither moment can fall inside it: you can't create a trip or post a review mid-tour.)

## Steps

Each step leaves `npm test` and `npx tsc --noEmit` passing.

### 1. The adapter (small)

- **Files:** `lib/hooksBag.ts`, `package.json` (the `@blacksands/hooks` range), a new `lib/__tests__/reviewPrompt.test.ts`.
- **Change:** as Rotorua's Task 3, steps 2 and 3. Import `* as StoreReview from "expo-store-review"`. Add to the `createHooks(...)` config, after `netInfo`:

  ```ts
  storeReview: {
    isAvailable: () => StoreReview.isAvailableAsync(),
    requestReview: () => StoreReview.requestReview(),
  },
  ```

  Append `useReviewPrompt` to the export list at the bottom of the file.
- **Tests first** (mock `expo-store-review`):
  - `requestReview()` asks the store when it is available;
  - it does not ask when it isn't;
  - a failure inside the store call doesn't reach the caller.

  If `lib/hooksBag.ts` turns out too heavy to load in a test, test the adapter object on its own and say so in the step's report.
- **Worked if:** tests pass; nothing visible changes.

### 2. First trip created (small)

- **Files:** `lib/hooks/useItineraries.ts`, `lib/hooks/__tests__/useItineraries.test.tsx`. That test's opening comment says the prompt was dropped; reword it.
- **Change**, following Rotorua's Task 4:
  - Call `hooksBag.useReviewPrompt()` at the top of `useItineraries()`. It is a hook, so it can't be called inside `onSuccess`.
  - Keep the number of trips in a ref, updated on every render:

    ```ts
    const tripCountRef = useRef(itineraries.length);
    tripCountRef.current = itineraries.length;
    ```

  - In `saveMutation`'s `onSuccess: async (_data, variables) => { ... }`, before awaiting the refetch:

    ```ts
    if (!variables.id && tripCountRef.current === 0) requestReview();
    ```

    No `id` means a new trip: `itineraryService.saveItinerary` takes the same branch.
- **Tests first:**
  - creating a trip with none before asks, once;
  - creating one with a trip already there doesn't;
  - saving an existing trip (it has an `id`) doesn't;
  - a failed create doesn't;
  - deleting doesn't.
- **Worked if:** tests pass. On a development build, making a first trip, from a suggested itinerary or blank, shows the rating sheet.

### 3. First review posted (small)

- **Files:** `app/(app)/(tabs)/sites/[siteId]/index.tsx`, `app/(app)/(tabs)/sites/[siteId]/__tests__/siteDetail.test.tsx`.
- **Change**, as Rotorua's detail screen:
  - Read the user's review count with `hooksBag.useMyReviews(uid)` and keep it in a ref, as in step 2.
  - Call `hooksBag.useReviewPrompt()` at the top of the screen.
  - In the review sheet's `onSave`, when `res.ok` and the count was 0, call `requestReview()` after closing the sheet.
- **Tests first:**
  - a first review saved asks;
  - a review when the user already has one doesn't;
  - a failed save doesn't.
- **Worked if:** tests pass. On a development build, posting a first review closes the review sheet and then shows the rating sheet.

### 4. Only if question 1 says so: the second app open (small)

- **Files:** a new `lib/hooks/useAppOpenCount.ts` (Rotorua's, with the storage key `southislandguide:appOpenCount`) and its test; `app/_layout.tsx`.
- The opening tour's plan may want the same counter (Rotorua's tour starts on the first open). If both are built, they share this one hook.
- **Tests first:** the count goes up by one each launch and survives a restart; the prompt is asked on the second open only.

## Checking on a phone

- **Development build:** the system shows the sheet **every time** it is asked. That is how to see each trigger fire, and how to see a trigger that shouldn't fire stay quiet.
- **TestFlight:** the sheet **never** appears. Testers seeing nothing is expected, not a fault.
- **App Store:** the system decides; at most three times a year per person.
- `expo-store-review` is native. The prompt only works in a build made after it was added on 2026-10-14 (commit `0680045`). The development build made on 14 Oct is believed to be later; check before testing (see Risks).

## Out of scope

- Any change to `@blacksands/hooks` or `../enginev1`: the hook is already published.
- An in-app "Rate us" button. Apple doesn't allow its rating sheet to be opened from a button: the system may show nothing, which looks broken. A link to the App Store review page could be added later, separately.
- Any record of "asked already" in the app: deliberately absent; the system does that.

## Risks

### Verified (2026-10-17)

- **Hook present:** the installed `@blacksands/hooks` is 0.4.7 and exports `useReviewPrompt`; `createHooks()`'s result has it too, read from `config.storeReview`.
- **Package installed:** `expo-store-review` `~57.0.3` is in `package.json`. `lib/hooksBag.ts` has no `storeReview` adapter yet.
- **New vs edit:** `itineraryService.saveItinerary` creates when there is no `id` and updates when there is one.
- **Creating a trip from a suggested itinerary** goes through `saveItinerary` without an `id` (`CreateItineraryModal`), so it counts as a first trip.
- **Rotorua today** asks on the second open, on the first trip and on the first review (commit `562d136`).

### Assumed

- **The 14 Oct development build includes `expo-store-review`.** The package was added at 14:09 that day and the build was made that evening, but the build's contents weren't checked. If the sheet never appears on a development build, this is the first suspect: a new build fixes it.
- **How the sheet behaves** in development, TestFlight and the App Store, as described above. This is from Apple's documentation for `SKStoreReviewController`; check there if testing contradicts it.
- **An offline-queued first trip:** creating a trip is turned off while offline (`CreateItineraryModal`), so it can't happen. If that changes, the sheet would appear whenever the queued save finally goes through.
