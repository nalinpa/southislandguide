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

## Hard rules

- **Looks only.** Same words, same order, same actions. A wide layout may put two things side by side that a phone stacks (a place's photo beside its text); it doesn't change what a tap does, and there's no list-detail navigation. Words on screen stay: Trip/Trips, place, Profile.
- **Same components on every width.** Only the style switches, on one breakpoint: `useWide()` (Step 0 sets where it lives and its width). Never change a `key` on the breakpoint, so folding mid-screen keeps state and scroll position.
- **Nothing moves on a phone.** Folded, Split View and every other iPhone stay exactly as now. Jest checks that, and the owner's phone.
- **Over the air within the 1.3 runtime** (`f967a92f…`): no new native package, no config plugin. Check with `npx expo-updates runtimeversion:resolve --platform ios`.
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

`design-refs/` has no wide shots. Ask the owner for one: Airbnb on an iPad or an open foldable is the nearest match. With none, critics judge the wide screen against our own folded one (does the extra width earn its keep?) and against the look's rules.

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
