# Engine: dark mode

Kiwi Guide (south-island) is getting a dark mode: every colour in `lib/ui/tokens.ts` now has a dark partner, built with `pair()` (an iOS paired colour, `DynamicColorIOS`, while the app's `DARK_READY` switch is on). The engine pieces the app shows were read for colours that would be wrong in dark. Every one of them can be made right from the app, through tokens or props it already passes, and the app now does so. This prompt holds the one engine change that would tidy the app's side, and the full list, so a later job for another app doesn't have to read it all again.

**The app doesn't need this job to ship dark mode.** Run it if you want the tidier status bar (item 1); otherwise keep it as the record.

You are working in the engine, not the app.

- Engine: `C:\Users\User\source\enginev1`. Each package is its own git repo. The one that matters: `ui` (`@blacksands/ui`, 0.7.0). `components` (0.11.0) needs nothing.
- The app: `C:\Users\User\source\south-island`, branch `design`. Read it, don't change it, until the last step.

## Read first

- `south-island/lib/ui/tokens.ts`: `pair()`, `DARK_READY`, and the comments on `accent`, `highlight`, `danger`, `surf` and `success`. In this app's dark palette each of those colours is either a fill (white words on it) or words (on the page), not both. The engine's older variants use some of them both ways; see "What other apps will meet" below.
- `south-island/lib/uiKit.ts`: `Screen`, and how it picks the status bar today.

## Hard rules

- **Opt-in only.** Rotorua Guide and aklguide use the same packages. With no new prop passed, every component must render exactly as it does today, and a test must prove it.
- **No new dependencies, nothing native.** The app ships over the air; its build fingerprint must not move.
- **Colours may be iOS paired colours.** Such a value can go in a style but can't be added to a string, measured or parsed. Don't introduce any code that does.
- **Don't publish, don't bump the app.** The owner publishes. Commit in the package's repo only when the owner says so.
- **Check the repo before you start.** `git status` in `ui`. On 2026-11-14 it was clean; if it isn't, ask the owner what the changes are.
- PowerShell for npm and npx on this machine.
- Stop after the item, say what changed, and wait for the owner's go.

## The work

### 1. `Screen` (ui): let the status bar follow the phone

`Screen` renders `<StatusBar barStyle={statusBarStyle} />` with a default of `"dark-content"`, and its prop type allows only `"dark-content" | "light-content"`. React Native's `StatusBar` also takes `"default"`, which on iOS lets the system choose light or dark content to match the phone's setting.

- Widen the prop type to include `"default"`. Keep the default `"dark-content"`.
- Test: no prop gives `"dark-content"`; `"default"` is passed through.

How the app would use it: `lib/uiKit.ts` `Screen` now reads `useColorScheme()` and passes `"light-content"` or `"dark-content"`, gated on `DARK_READY`. With this, it could pass `DARK_READY ? "default" : "dark-content"` and drop the hook.

Version: `ui` 0.7.1. Changelog: "Screen's statusBarStyle also takes "default", which lets iOS match the clock to the phone's light or dark setting."

## The list: every engine piece Kiwi Guide shows

The variant the app uses, each hard-coded colour in it, and whether it's right in dark. "From the app" means a token or prop the app passes; those follow the phone through `pair()`.

| Piece | Variant the app uses | Colours | In dark |
|---|---|---|---|
| `Screen` (ui) | default, with `background` | `StatusBar` `"dark-content"` default | From the app: `statusBarStyle` (item 1 tidies it) |
| `AppText` (ui) | `status="control"` on fills | `"#FFFFFF"` | Fine in both: always on a fill |
| `AppButton` (ui) | `primary`, `hero`, `secondary`, `ghost` | primary/hero label `"#FFFFFF"` fallback; the app sets `button.primary` | Fine in both. Secondary and ghost are all tokens |
| `CardShell` (ui) | `status="basic"`, `flat` | `"transparent"` (flat) | Fine: basic is `border` + `bgCard`, both paired |
| `ErrorCard` (ui) | `flat` | none; icon in `danger` / `warning` / `text2` | Fine: those are word colours in the app |
| `LoadingState` (ui) | `color`, `labelColor` | none | From the app |
| `OfflineBanner` (ui) | default `warning` tone | none; `warning` on `warningDim` | Fine: both paired, 7.3:1 |
| `RatingStars` (ui) | default | `"transparent"` for an empty star's fill | Fine: stars are `surf`, empty ones `border` |
| `AuthPanel` | `tone="light"`, `radius`, `colors` | dark tone's whites and `#FFD2C7` (unused here); `shadowColor: "#000000"` | Fine. The app now passes `notice: surf`: the default `success` is a fill colour in its dark palette |
| `ReviewModal` | `openSheet`, `colors` | white on the chosen chip (on `accent`) | Fine. The app now passes `scrim`; the card variant's `rgba(2, 15, 40, 0.75)` is unused here |
| `TripChoiceSheet` | `sheet`, `colors` | none in the sheet | Fine. The app now passes `scrim`; the card variant's `rgba(15, 23, 42, 0.6)` is unused here |
| `ReviewsSummaryCard`, `ReviewListItem`, `ReviewsHeader`, `ReviewsEmptyState` | `open`, `colors` | `"transparent"` star fills | Fine: all from the app's `REVIEW_COLORS` |
| `EmptyItineraryState` | `flat`, `colors`, button looks | none | Fine: from the app |
| `ReviewOptionsMenu` | `triggerVariant="bare"`, `triggerColor` | none; the menu is `bgCard` + `borderSubtle`, the flag `danger` | Fine |
| `TimelineBlock` | `card`, `colors={{ grip, note }}` | stripe `rgba(255, 255, 255, 0.55)`, grip strip `rgba(0,0,0,0.12)`, note words `"#FFFFFF"`, icon `"#FFFFFF"`, shadow `#001A42` | Fine: all on the `accent` fill. The app now passes `note: success`: the default `surf` is a word colour in its dark palette |
| `TransitBlock` | `column`, `colors` | none | From the app |
| `reviewLook` | via the pieces above | default `scrim: "rgba(3,38,43,0.55)"` | From the app (`SWEEP_COLORS.scrim`) |

## What other apps will meet

Not this job. For whoever gives Rotorua Guide or aklguide a dark mode: if their palette splits a colour into a fill shade and a word shade, as Kiwi Guide's does, these older variants read one colour both ways and will need a `colors` prop or a second token.

- `AppButton` `danger` and `success`: white words on `danger` / `success`.
- `AppText` `status="success"` and `"danger"`: the same tokens as words.
- `CardShell` `surf` / `success` / `warning` / `danger`: the colour as an outline over its `Dim` tint.
- `Pill`: the status colour as outline and words.
- `ReviewsSummaryCard` card variant: `accent` and `success` as words.
- `ReviewsHeader` and `ReviewsEmptyState` card variants: `accent` as words and outline.
- `ReviewListItem` `avatar`: `accent` words on `accentDim`.
- `TripChoiceSheet` card variant: `accent` and `surf` icons.
- `ReviewModal` and `TripChoiceSheet` card variants: a dim written as an `rgba` string.
- `AppButton` `white`: `"#FFFFFF"` fill.
- `AppIconButton`: a `"#00000008"` press tint.
- `TimelineBlock`'s default note chip: `surf` under white words.

## Tests

- `npm test` (runs `scripts/run-tests.mjs`) and `npm run typecheck` in `ui`, both clean.
- One test that the default is unchanged, one that `"default"` passes through.
- No snapshot files.

## Handing back

- What changed, in a sentence.
- The version and changelog line.
- What you did not do, and why.

When the owner has published, and only then, the last step is in the app: bump `@blacksands/ui` in `south-island/package.json`, change `Screen` in `lib/uiKit.ts` to pass `DARK_READY ? "default" : "dark-content"` without the hook, run the app's tests and typecheck, and check the fingerprint is still `4ad8daed…` (`npx @expo/fingerprint fingerprint:generate --platform ios`). If it moves, stop and say so.

## Stop and ask

- The change can't be made without changing what `Screen` does for the other apps.
- You find uncommitted work in `ui` that isn't yours.
