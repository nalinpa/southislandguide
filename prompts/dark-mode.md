# Dark mode for Kiwi Guide

Kiwi Guide (south-island, Expo, iOS only) has been restyled screen by screen in light. The phone already tells the app whether it is in light or dark (`userInterfaceStyle: "automatic"` in `app.config.ts`), but the app ignores it: a switch in code is off, because most of the app's colours have no dark partner yet. This job gives every colour one, checks each screen in dark on the owner's phone, and only then turns the switch on.

Work in `C:\Users\User\source\south-island`, branch `design`.

## Read first

- `docs/plans/design-sweep.md`: the look, its values, and the rules that came out of the critic rounds.
- `prompts/design-sweep.md`: the sweep's own prompt. Its hard rules apply here (they are repeated below where they matter).
- `lib/ui/tokens.ts`: the colours. Note `DARK_READY` (the switch, `false`) and `pair(light, dark)`, which returns an iOS paired colour (`DynamicColorIOS`) when the switch is on and the plain light colour when it is off.
- `lib/uiKit.ts`: how the shared engine's pieces are built from the tokens, and the sweep's defaults for them.
- The owner's progress page for the sweep is private; ask for a screenshot if you need one. Every screen was drawn in dark as well as light during the sweep, so the owner has a dark drawing for most screens.

## Where it stands (measured 2026-11-14; measure again before you start)

- In the main colour block of `lib/ui/tokens.ts`, **10 colours are paired and 21 are not**. Not paired: `bgBase`, `bgSurface`, `bgCard`, `bgElevated`, `borderSubtle`, `border`, `borderStrong`, `accent`, `accentDim`, `highlightDim`, `highlightOnDark`, `onDarkMuted`, `scrim`, `surf`, `surfDim`, `success`, `successDim`, `warning`, `warningDim`, `danger`, `dangerDim`. (`highlight`, the orange, is declared apart; check it.)
- **About 110 colours are written straight into screens and components**, 45 of them plain white. The most are in `app/(app)/(tabs)/map/index.tsx` (22), `components/map/SiteMarker.tsx` (14), `components/share/CaptureCanvas.tsx` (7), `components/auth/SocialSignInButtons.tsx` (7), `components/map/MapOverlay.tsx` (6).
  To count: search `app`, `components` and `lib/tour` (`.tsx`, not tests) for `"#…"` and `rgb(`/`rgba(`.
- The shared engine (`@blacksands/components` 0.11.0, `@blacksands/ui` 0.7.0, source at `C:\Users\User\source\enginev1`, each package its own git repo) no longer builds a colour by gluing strings together where the sweep touched it. Its other hard-coded colours were listed during the sweep, not fixed.

## Hard rules

- **The switch stays off in anything the public can get.** `DARK_READY` may be `true` only in a build of the `development` branch that the owner is checking. Never publish to the `production` channel. Don't commit `DARK_READY = true` until the owner says dark mode is done.
- **Over the air only.** No native package, no config plugin, no change to `app.config.ts`, `eas.json`, `.easignore`, the root `.gitignore`, or assets a build reads. The build fingerprint must stay `4ad8daed3af046d5e0a1c71697c62ca51a0c227c` (`npx @expo/fingerprint fingerprint:generate --platform ios`). If it moves, stop and say so.
- **Light must not change.** Every edit either adds a dark partner or moves a hard-coded colour to a token with the same light value. After each step, the light app looks exactly as it did. If a light value has to change for a pair to work, stop and ask.
- **Colours only.** No layout, no words, no behaviour.
- **Engine first.** Where an engine piece needs a colour it can't be given, that goes on a list for a separate engine prompt (see step 4); don't copy the component into the app.
- Don't commit, push or publish unless the owner says so. A phone check goes out with:
  `npx eas-cli update --branch development --platform ios --environment development --message "…" --non-interactive`
- PowerShell for npm, npx and eas on this machine; Git Bash can't find node. `npm install` of the private `@blacksands` packages needs the owner (their registry token is not available to you).
- Stop after each numbered step, say what changed and what you found, and wait for the owner's go. Answering your questions is not a go.
- Before you start: `git status`. The whole design sweep may still be uncommitted on `design`. Ask the owner whether to commit it first, so dark mode is its own set of changes. Leave `eas.json` out of any commit (it shows as changed by line endings only).

## What a paired colour can't do

A paired colour is not a string. It can go in a style, and that is all.

- It can't be glued to (`colour + "20"`), measured, or passed to anything that parses a colour.
- It can't be animated between (Reanimated or Moti colour interpolation), and you can't add see-through-ness to it in code. Anything that fades or tints a colour needs its own pair with the see-through-ness written in (`pair("rgba(…)", "rgba(…)")`).
- Some native props want a real colour string (a navigation bar tint, a map overlay, an SVG fill in some libraries). Check each; where a pair won't do, read the scheme with `useColorScheme()` and choose.

Search for these before step 1 and list what you find: string concatenation onto `tokens.colors.…`, colours passed to `Animated`/Reanimated/Moti, colours passed to SVG and to map components.

## The steps

### 1. Give the 21 a dark partner

One file, `lib/ui/tokens.ts`. The sweep's dark drawings used these, which is where to start:

| What | Light | Dark, as drawn |
|---|---|---|
| page | `#FFFFFF` | `#06191B` |
| text / second text / muted | `#0A1F1B` / `#33443F` / `#566661` | `#EEF6F3` / `#C5D6D1` / `#9DB5AF` |
| line | `#CBD8D3` | `#2F5257` |
| selected (teal) | `#095C65` | `#7FD0D6` |
| band | `#EEF3F1` | `#0C2A2E` |
| header bar | `#063F45` | `#0B4B52` |
| pale fill (`bgSurface`) | `#E2F0EB` | `#12363A` |
| outline (`border`) | `#A9C6BC` | `#3C6166` to `#4C7479` |
| drive fill | `#D9E9E4` | `#173F45` |
| danger / its tint | `#B42318` / `#FDF0EE` | `#FF8A7A` / `#3A1D1A` |

The first ten rows are already in the file; the rest are the drawings' values for colours not yet paired. Check text on each background reaches 4.5:1 (3:1 for large text and for outlines that carry meaning).

Four need the owner's eye, so show them as swatches on a dark page before going on:
- **The brand teal** (`accent`, `#095C65`): the solid place blocks on the Days view and other fills. On a dark page it nearly disappears. It needs a lighter fill, or to keep its value with a hairline round it.
- **The orange** (`highlight`, `#C2410C`, the main button): white words on it pass in light. Decide whether it stays or lifts a step on dark.
- **Red** for delete, and its tint.
- **The mint fills** (`bgBase`, `bgSurface`, `bgElevated`, `bgCard`): four near-whites in light that must become four distinguishable darks, in the right order of lift.

### 2. Sort the 110

Go file by file. Each hard-coded colour goes in one of three piles; record the pile in your notes, not in the code:

- **Fine in both.** White words on the orange button, on the teal header, on a photo; black behind a photo. Leave it.
- **Should be a token.** A white card or sheet background, a grey outline, a dim. Replace with the token whose light value it already equals (or add one), so light does not change.
- **Deliberate.** The share card (`components/share/CaptureCanvas.tsx`) stays light: it is a picture people post. Brand colours on the Apple and Google sign-in buttons follow those companies' rules. Leave it, with a one-line comment saying why.

Map pins (`components/map/SiteMarker.tsx`): the category colours are the app's own and stay. The white disc behind each pin and its outline are the question; see step 3.

### 3. What isn't a colour swap

- **The clock and battery.** Each screen sets light or dark status-bar content for its own top (teal header: light; white page: dark). On a dark page that flips. Find every place it is set (`LightStatusBar`, `statusBarStyle`, about a dozen) and make each follow its background.
- **Shadows.** A shadow lifts a white card off a white page; on a dark page it shows nothing. Where a shadow is the only thing separating a surface (`cardLift` in tokens, the map's sheet, the tour's card), add a hairline in the outline colour in dark.
- **The dim behind sheets** (`rgba(3,38,43,0.55)`): check it still reads as a dim over a dark page; it may need to be darker.
- **Map pins' white discs**, and the map itself (see the questions at the end).
- **Photo placeholders** and the hairline round photos (`photoEdge`).
- **The opening tour's cut-out and dim.**
- **The login photo and its sheet.**
- **The engine's forms** are built from a second set of tokens (`formTokens` in `lib/ui/tokens.ts`, near-white fields). They need pairs too.

### 4. The engine

For every engine piece the app shows, list each hard-coded colour and whether it is fine in both or needs to come from tokens or a prop. Start from the lists the earlier engine jobs handed back (ask the owner), then read the source. Don't change the engine: write `prompts/engine-dark.md` in the style of `prompts/engine-design-sweep.md`, and stop. The owner runs it and publishes; you pick up the new version after.

### 5. Turn it on for the phone, and walk every screen

Set `DARK_READY = true` in the working tree only, publish to the `development` branch, and give the owner a list of screens to walk in dark with the phone set to dark: Explore, the town picker, a place, reviews, the review form, Trips (guest, no trip, one trip, several), the Trip view, the Days view (with places, with an empty day), each sheet (add to trip, new trip, edit a stop, delete), the map and its sheet, the guide and a section, Profile (guest and signed in), saved places, photo credits, login and create account, the tour, the error screen, the offline banner.

Then the same list with the phone in light, to confirm nothing moved.

Take what the owner finds, fix, publish again. Expect two or three passes. Tests run as light and will not catch dark faults; the phone is the check.

### 6. A critic round in dark

As the sweep did: for each screen, the light drawing or screenshot beside the dark one, five critics, one lens each (first glance, type, spacing, colour, do the parts belong), asked whether the two are plainly the same app and where dark is weaker. `prompts/design-sweep.md` has the method. Fix what two or more name.

### 7. Done

When the owner says dark is done: `DARK_READY = true` is committed, `docs/plans/design-sweep.md` gets the dark values and what was decided, and the owner decides how it reaches users (it rides with the next release; it does not go to the `production` channel from this job).

## Tests

- `npx tsc --noEmit` and `npx jest` clean after every step. One or two heavy test files time out now and then under the full run and pass alone; rerun before calling it a failure.
- For each token given a pair: nothing to test (the light value is unchanged). For each hard-coded colour moved to a token: the existing test for that screen still passes.
- One new test: with the switch off, every colour in `tokens.colors` is a string (so nothing paired can leak into a public build by accident).

## Ask the owner before starting

- **The map in dark.** Apple's map turns dark on its own with the phone. Fine, or keep the map light always?
- **Photos.** Full brightness in dark on Explore and a place? (The usual answer is yes.)
- **Commit the design sweep first?** So dark mode is its own set of changes.

## Stop and ask

- A light value would have to change.
- A screen needs a layout change to work in dark.
- An engine piece can't be made right from the app.
- The fingerprint moves.
- Anything that would put `DARK_READY = true` where the public can get it.
