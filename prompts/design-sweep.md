# Design sweep, screen by screen (gauntlet loop)

Restyle Kiwi Guide one screen at a time. Each screen goes through the gauntlet loop: a builder makes it, blind critics judge it against a bar, the owner sees the round and says go or stop. Nothing is built in the app until the owner picks a design for that screen.

Repo: south-island (Expo / React Native, SDK 57, iOS only, light and dark mode). Work on git branch `design` (cut from `dev` at `8e465ed`, 2026-11-12). Don't merge it anywhere; the owner does that.

## Read first

- `TASKS.md`: the design sweep items, and "Login screen feels basic".
- `lib/ui/tokens.ts`: colours, spacing, `radius: { sm: 10, md: 14, lg: 18 }`. About 100 `borderRadius` uses sit in `app/` and `components/`.
- `prompts/store-screenshots.md`, "The brand": teal `#095C65`, sign yellow `#FFC20E`, kiwi black `#0B0B0B`, warm `#C2410C` sparingly, Bahnschrift SemiBold headings on the store art.
- The live screenshots in `store/screenshots/source/`: what the app looks like now.

## What the owner has already said

- Cards with straight edges and a shadow looked better than rounded corners (2026-10-25). Not fixed on it any more (2026-11-12): it's one option, not a rule.
- The login screen feels basic next to the rest (tester, 2026-11-11).
- The Explore featured card is already square and edge to edge. It's the one piece of the new look that's live.

Everything is open, card corners included. The first step decides the look.

## Hard rules

- Looks only. No change to what a screen does, what it's called, or the order of things on it, unless the owner asks. Words on screen stay: Trip/Trips, place, Profile.
- Over the air only. Nothing that changes the build fingerprint: no new native package, no config plugin, no change to `app.config.ts`, `eas.json`, `.easignore`, the root `.gitignore`, or anything under `assets/` that the build reads. Check with `npx @expo/fingerprint fingerprint:generate --platform ios` before and after each screen's build; the hash must stay `4ad8daed…`.
- Engine first. Where a card or sheet comes from `@blacksands/components`, add an opt-in variant there and say so; the owner publishes the package. Don't copy the component into the app.
- Style values come from `lib/ui/tokens.ts`. Change the token, not 100 call sites, wherever the token is what's wrong.
- Light and dark mode both, every round.
- Text sizes and contrast don't get worse: body text stays at least as large, and text on its background stays at 4.5:1 or better.
- Don't commit, push, or publish unless the owner says so. Never publish to the `production` channel. A phone check goes out on the `development` branch only: `npx eas-cli update --branch development --platform ios --environment development --message "…" --non-interactive`.
- PowerShell for npm, npx and eas. Git Bash on this machine can't find node.
- Drafts, mock-ups and tools live in the session scratchpad, not the repo.
- After each round, stop. Update the progress page, give the link, wait for the owner's go. Answering your questions isn't a go.

## Step 0: the look (one gauntlet, before any screen)

Screens judged one at a time drift apart. So settle the shared pieces first, on one page:

- a place card, a trip card, a day's place block, a sheet with a button row, a text field, a primary and a secondary button, a tab bar
- each in light and dark

Round 1 shows three looks that are clearly different: one with straight-edged, shadowed cards, one rounded and soft like the bar, one somewhere else again. The owner picks one, with changes. That pick becomes the style sheet for every screen after it: card edge, shadow, spacing, heading style, button shape. Write it down in `docs/plans/design-sweep.md` as token values.

## The bar

The bar is Airbnb's iOS app (owner, 2026-11-12). The screenshots are in `design-refs/` (already out of git), from Mobbin, light mode only, 1179 × 2676:

| Kiwi Guide screen | Bar file |
|---|---|
| 1 Explore list and place cards | `airbnb-explore-list.png`; Saved Places: `airbnb-saved-places-grid.png` |
| 2 Place screen | `airbnb-place-top-with-sheet.png` (photo, title, rating), `airbnb-place-about-text.png` (text, photos, bottom button row) |
| 3 Trip screen, 4 Trips tab | none yet: ask the owner |
| 5 Pop-up sheets | `airbnb-sheet-add-to-trip.png`, `airbnb-sheet-new-trip-dates.png`, `airbnb-sheet-choices.png` |
| 6 Map | `airbnb-map-pins.png`, `airbnb-map-place-card.png` |
| 7 Guide | `airbnb-place-about-text.png` for the section text; no list yet |
| 8 Profile | `airbnb-profile.png`, `airbnb-profile-with-stats.png` |
| 9 Login | `airbnb-login.png` |
| 10 Tour and error screen, 11 share card | none: ask, or judge these against the screens already done |

- Every file has a "Airbnb · curated by Mobbin" strip along the bottom (about the last 125 px). Crop it off before a critic sees the image, or the test isn't blind. Cover Airbnb's logo on the login screen too.
- There's no dark-mode bar. Judge dark mode against our own light version and the contrast rule, not against Airbnb.
- No bar screenshot for a screen: ask, don't substitute one.

## The gauntlet loop, per screen

1. **Capture.** The owner's phone screenshot of the screen as it is now, light and dark, from the development build. Ask for it; don't redraw the current screen from the code and call it the "before".
2. **Build.** A builder agent makes the new screen as an HTML mock-up at iPhone size (393 × 852 pt, rendered at 3×), using the Step 0 style sheet, real place names and photos from the app's data, and the same words as the live screen. Render it to PNG with the scratchpad tools.
3. **Judge.** Five fresh critics, as parallel agents, each with no context but their own brief. Each gets a sheet with two screens side by side, ours and the bar's, the side chosen at random and recorded in a key file the critic never sees. A neutral line only: "two travel apps; say which screen is better made." One lens each:
   - c1 first glance: what the eye lands on, and whether that's the right thing
   - c2 type: sizes, weights, line lengths, what's hard to read
   - c3 spacing and alignment
   - c4 colour and contrast, light and dark
   - c5 does it look like one app: compared with the screens already done
   Each replies: which is better, by how much (1 to 5), the three weakest things about each, and what they think the screen is for.
4. **Unblind and score.** Read the keys. Record the gap per lens. List the weaknesses named for ours by two or more critics.
5. **Checkpoint.** Add the round to the progress page: before, ours, the bar, the scores, the repeated weaknesses, what the next round would change. Stop.
6. On go, the next round fixes the repeated weaknesses only. A weakness one critic names once is noted, not chased.
7. The owner ends the loop for a screen by picking a round. No fixed number of rounds, and no target score: the critics inform the owner, they don't decide.

## Building the picked design

Only after the owner picks, and says build:

- Make it in React Native on `design`. Tests updated where they check a style; full suite and typecheck clean.
- Fingerprint check, as in the hard rules.
- Publish to the `development` branch if the owner says so, and ask for a phone screenshot, light and dark.
- Put the phone screenshot next to the picked mock-up on the progress page. Fix differences that matter, list the ones that don't.
- Then the next screen.

## Screen order

Most seen first. One gauntlet each unless noted.

1. Explore list and place cards (`app/(app)/(tabs)/sites/index.tsx`, `components/sites/list/ListItem.tsx`; Saved Places uses the same card)
2. Place screen (`sites/[siteId]/index.tsx`), with its button row and reviews
3. Trip screen: day list, place, note and drive blocks (`components/itinerary/ItineraryDetailView.tsx`, `DriveBlock.tsx`)
4. Trips tab and trip cards (`itinerary/index.tsx`), with Start a New Trip
5. Pop-up sheets, as one set: Add to Trip, edit a stop, create and delete a trip
6. Map: the place card and the sheet (`components/map/MapOverlay.tsx`). The map itself can't be mocked: use the owner's capture as the backdrop.
7. Guide list and a guide section
8. Profile (`account.tsx`) and its cards, the saved map card included
9. Login (`app/(auth)/login.tsx`): the engine's `AuthPanel`, so most of it is an engine variant
10. The opening tour and the error screen
11. The photo share card last: it's the one thing other people see, and it's close to the store art

Tab bar and headers are settled in Step 0 and applied with screen 1.

## The progress page

One artifact for the whole sweep, newest round first, grouped by screen. For each round: the images, the scores per lens, the repeated weaknesses. A line at the top says which screen and round is waiting on the owner. Republish the same file each round so the link doesn't change.

## Stop and ask

- A design needs something the build doesn't have (a font file, a native blur, a new package).
- A screen's design only works if what the screen does changes.
- An engine component can't take the look as a variant.
- The critics and the owner's stated taste pull opposite ways: say so plainly on the progress page; the owner's taste wins.
