# Duo sweep: wide layouts for the open iPhone Duo (Phase 3 of 1.3)

Lay Kiwi Guide out for the open iPhone Duo, one screen at a time, by the gauntlet loop in `prompts/design-sweep.md`: a builder draws it, blind critics judge it, the owner sees the round and says go or stop. Nothing is built in the app until the owner picks a design for that screen.

Repo: south-island, branch `1.3`. Plan: the doc "Kiwi Guide 1.3 Plan" (https://claude.ai/artifact/1qoZN26ADdcgrQPRm1iB3C), Phase 3. The look itself is settled: `docs/plans/design-sweep.md` ("The look in one line", Values, Rules). This sweep decides layout on a wide window, not colours, type or shapes.

## Where things stand (2026-11-15)

- Phase 2 (fit) is built: nothing sits under the Duo's side rail. `app/_layout.tsx` keeps every screen clear of the sides once, and each modal's overlay does the same (`aaa04a4`, engine `@blacksands/components` 0.12.1).
- **Sizes**, from Xcode 27.1's iPhone Duo device type (unofficial write-ups, confirm on the simulator):

  | State | Size |
  |---|---|
  | Folded (outer screen) | 466 × 678 pt |
  | Open, portrait | 669 × 951 pt |
  | Open, landscape | 951 × 669 pt |
  | Split View, left window | 469 pt wide |

  Folded and Split View are compact: they keep today's phone layouts. Open is regular width: it's what this sweep lays out.
- **The rail:** 84 pt on one side, folded or open landscape. Open portrait has no rail.
- **Our own bars stay:** the tab bar at the bottom and the teal top bars at the top. Expo calls custom JS bars "classic"; they don't move into the rail.
- **First simulator session, check:**
  - The real sizes against the table above.
  - What the open Duo held sideways does with a portrait-only app (`orientation: "portrait"`).
  - Where the fold is. Inferred, not confirmed: the Duo opens like a book, so open sideways (951 × 669, the book pose, with the rail) the fold runs down the middle at x ≈ 475. Split View's two 469 pt windows fit that. Open upright (669 × 951) it runs across at y ≈ 475. A left/right split on the upright screen doesn't follow the fold. Turn on Reserved regions' `division` frame to confirm.
  - The top inset on the open display in portrait. Expo's guide says JS bars there sit under "a large empty top inset"; the drawings assume 44 pt.
- **Seeing the fold** ([Expo's iPhone Duo guide](https://expo.dev/blog/supporting-iphone-duo), 2026-10-23):
  - `expo-hinge` reports the hinge status (`closed`, `partiallyOpen`, `fullyOpen`) and its angle.
  - `react-native-reserved-regions` reports the fold's frame in points.
  - Both are native packages, not installed: adding them needs a new 1.3 dev build and a new runtime, so the owner decides.
  - `useVerticalBarEdgeIOS()` in `expo-status-bar` (installed, 58) says which edge the rail is on. It doesn't detect the fold.
  - Apple's tip for grids: an even number of columns, so the fold falls between them.

## Hard rules

- **Looks only.** Same words, same order, same actions. A wide layout may put two things side by side that a phone stacks (a place's photo beside its text); it doesn't change what a tap does, and there's no list-detail navigation. Words on screen stay: Trip/Trips, place, Profile.
- **Same components on every width.** Only the style switches, on one breakpoint: `useWide()` (Step 0 sets where it lives and its width). Never change a `key` on the breakpoint, so folding mid-screen keeps state and scroll position.
- **Nothing moves on a phone.** Folded, Split View and every other iPhone stay exactly as now. Jest checks that, and the owner's phone.
- **Over the air within the 1.3 runtime** (`a0bdc768…`, with `@expo/ui` for `ArrangementView`; owner added it 2026-11-15): no other new native package, no config plugin. Check with `npx expo-updates runtimeversion:resolve --platform ios`.
- **Engine first.** A wide variant of an engine piece is an opt-in prop in `@blacksands/*`; the owner publishes. Don't copy it into the app.
- **Light and dark, every round.** Text no smaller, contrast at least 4.5:1.
- **Don't commit, push or publish** unless the owner says so. A phone check goes to the `development` branch only.
- PowerShell for npm, npx and eas. Drafts and tools in the session scratchpad, not the repo.
- **Stop after each round.** Update the progress page, give the link, wait for the owner's go. Answering questions isn't a go.

## Step 0: the wide rules (one round, before any screen)

On one page, three clearly different answers to the shared questions:
- the breakpoint
- how wide a column of text may run
- grids: how many columns, and the gutter
- how a sheet looks when wide: a centred card or a side panel
- what fills the space beside a phone-width column

Draw each on Explore, a place and the Add to Trip sheet, open portrait (669 × 951), light and dark, using real place names and photos. The owner picks, with changes. The pick goes in `docs/plans/design-sweep.md` under a new "Wide" heading, as values.

No critics for Step 0: it's the owner's pick, as Step 0 of the first sweep was.

## The bar

The owner's benchmark, `design-refs/duo/` (2026-11-15): one wellness app concept, open (`wellness-open.webp`) and folded (`wellness-folded.webp`). It matches none of our screens one to one; critics judge our screen's *look* against it. What it shows:
- Open, the folded screen stays whole on one half and the new space gets the next thing (a grid of four, a list). Two panes, told apart by a tinted page on one and white on the other, not by a line.
- Lots of air: wide margins, big type for the one headline, small labels, cards with soft corners and a hairline.
- Nothing stretched: no row runs the full width of the open screen.

Not for scoring: its tab bar sits in the Duo's side rail and it's shown open in landscape. Our tab bar stays at the bottom, and the app is portrait only (`orientation: "portrait"` in `app.config.ts`). Critics also judge the wide screen against our own folded one (does the extra width earn its keep?) and against the look's rules.

## Each screen

Same gauntlet as `prompts/design-sweep.md`: capture, build, five blind critics, unblind, checkpoint. Changes from that loop:
- The "before" is the open Duo as it is now, captured on the simulator: today's phone layout stretched. On Expo Simulators: `eas simulator:control hinge.set unfold`, then a `screenshot.capture` with `display=3`. Or use an Explore capture with `--target duo-open`.
- The canvas is 669 × 951 pt at 3×. Also draw landscape (951 × 669) for any screen whose wide layout depends on height.
- Built designs are checked with an Explore capture on `iphone`, `duo-closed` and `duo-open`. The phone targets must show no change.

## Screen order

Most seen first:
1. Explore, as a grid
2. Place: photo beside the text
3. Trip: days beside the day's stops
4. Trips tab
5. The sheets, as one set
6. Map: its sheet as a side panel
7. Guide: list beside the section
8. Profile
9. Login: photo beside the form
10. The tour and the error screen

The share card doesn't change: it's a fixed 1080 × 1350 image.

## Stop and ask

- A layout needs a screen to behave differently.
- An engine piece can't take the wide look as a variant.
- The simulator's real sizes differ from the table above.
- The critics and the owner's stated taste pull opposite ways. The owner's taste wins.
