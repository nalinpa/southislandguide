# Fix: after-launch items from the 2026-10-30 review

Round 2 of the fix pass before the Kiwi Guide 1.0.0 production build. Round 1 (the before-the-build items) was done on 2026-10-30. The owner moved these to after launch.

Repo: south-island (Expo / React Native, iOS only). App name "Kiwi Guide"; internal ids stay "southislandguide".

These findings come from a read-only review on 2026-10-30. Each one was traced in code, but re-read the code before changing it. Line numbers may have moved, and round 1 changed `lib/hooks/useItineraries.ts` and `lib/services/userService.ts` (`clearLocalUserData`).

## Hard rules

- Don't commit, push or deploy. When the round is done, stop and show the diff summary.
- Run nothing that touches live services: no scripts/ that read or write Firestore, no drive-times or Google Maps calls, no wrangler, no eas.
- Never print a key, token or service-account file.
- Use PowerShell for npx/npm. Git Bash on this machine can't find node.
- Engine first. If @blacksands/* or rotorua-guide already has a component or pattern for something, reuse it or pass it props. Don't make an app-local copy. If the engine itself needs a change, describe it and stop. The owner publishes the engine.
- On-screen wording: Trip/Trips, never Itinerary or Plan(s). Use "place", never Location, for a place.
- No styling changes before the post-launch design sweep. New buttons copy an existing button on the same screen.
- Every behaviour change gets a test, or an update to the test that pins the old behaviour.

## Items

12. **Bad live data crashes a screen.**
    - Every screen indexes `site.category[0]`. The detail screen calls `splitLocalTip(site.description)` unguarded (`app/(app)/(tabs)/sites/[siteId]/index.tsx`, around lines 165 and 466).
    - In `lib/hooksBag.ts` `normalizeLocation` (line 19), default `category` to `[]` and `name` and `description` to `""`.
    - Read the comment there first: it returns raw on purpose to keep `useLocations`' memo stable. Return the same object when nothing is missing, and a copy only when a field is missing.
    - Test both cases.

13. **Error screen** (`app/_layout.tsx` `ErrorBoundary`, around line 90).
    - Stop showing `error.message` to users. Show "Something went wrong. Please try again." Keep the Sentry capture.
    - "Restart App" re-renders the same route, so a data crash loops. Make the button return to Explore (`/(app)/(tabs)/sites`) if expo-router's ErrorBoundary allows it. If not, say what it allows.

14. **Sentry tracing.** `tracesSampleRate` 1.0 becomes 0.2 in `app/_layout.tsx`.

15. **Expired session** (`app/(app)/(tabs)/itinerary/index.tsx`, around lines 80-86).
    - On a 401, the "Your session expired" state shows only "Try Again". Add a "Sign In" button that goes to the login screen.

16. **Guest on Saved Places** (`app/(app)/saved-sites.tsx`, around lines 172-185).
    - A guest is told to "tap the heart", and the heart then asks them to sign in.
    - For a guest, say "Sign in to save places." and add a Sign In button. Signed-in users keep the current text.

17. **Account deletion retry** (`lib/services/userService.ts`, `deleteAccount`).
    - If DELETE /account times out after the server has already deleted the account, the retry fails and the user stays signed in with an error.
    - Read the enginev1 api's account route (read only) to see what a deleted user's token gets back.
    - If it's 401 or 404, treat that as done: clear data (`clearLocalUserData`), sign out, go to login.
    - Test it.

18. **An offline trip save that fails on resume is dropped silently.**
    - Restored paused writes run with the defaults from `registerTripWrites` (`lib/hooks/useItineraries.ts`) and have no `onError`.
    - Add an `onError` to the registered defaults that captures to Sentry and shows one alert: "A trip change couldn't be saved."
    - Don't change the scope or the ordering.

19. **Unguarded console.error** (`lib/hooks/useItineraries.ts`, the `getMyItineraries` catch).
    - Remove it. `Sentry.captureException` on the next line already reports it.

20. **Timaru's travel hub** (`assets/data/area-hubs.json`).
    - The hub is `south-canterbury-museum`, which is switched off. It works today.
    - Changing it means re-measuring drive times with Google Maps, which is off limits.
    - Make no data change. Add one line to TASKS.md under Later saying so.

21. **Trip modals at 375x667** (`components/itinerary/CreateItineraryModal.tsx` and `AddToTripModal.tsx`, the `wrapper` and `card` styles). Moved here from round 1, item 11.
    - The wrapper has `maxHeight: "90%"`, so with the calendar or trip list open, "Create Trip" can end up off screen on an iPhone SE.
    - `flexShrink: 1` on the card style alone doesn't fix it. The engine's `CardShell` (`@blacksands/ui`) puts `style` on its inner content View. That View sits inside an `outerWrapper` View, and the children are wrapped in a `Stack`. Neither the `outerWrapper` nor the `Stack` can shrink, so the inner ScrollView never gets a bounded height.
    - Engine change, for the owner to make and publish: an opt-in `shrink` prop on `CardShell` that adds `flexShrink: 1` to the `outerWrapper`, the content View and the `Stack`.
    - Once that is published: bump `@blacksands/ui`, pass `shrink` to both modals' `CardShell`, and add it to the iPhone SE device check. Until then, describe and stop.

## End of round

- Run `npx jest --ci` and `npx tsc --noEmit`, and report both.
- `addToTripModal.test.tsx` has timed out once in a full run under load and passed alone. Rerun any timeout alone before calling it a failure.
- Then stop. List each item: done, or not done and why. Give the files changed and anything the owner must check on the phone.
