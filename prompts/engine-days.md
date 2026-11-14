# Engine: the Days view blocks, as picked

Kiwi Guide (south-island) redrew its Days view (one day of a trip on the hours of the day) over six judged rounds. It went from 0 of 5 against the app's own Explore screen to beating a reference calendar app 4 of 5, then improved four rounds running. The owner picked round 5. Two of its pieces are the engine's: the place block (`TimelineBlock`) and the short drive between two stops (`TransitBlock`). This prompt adds what they need.

You are working in the engine, not the app.

- Engine: `C:\Users\User\source\enginev1\components` (its own git repo, `@blacksands/components`, 0.10.0).
- The app: `C:\Users\User\source\south-island`, branch `design`. Read it, don't change it, until the last step.

## Read first

- `south-island/prompts/engine-design-sweep.md`: the first engine job. Its hard rules all apply here unchanged: opt-in only (Rotorua Guide and aklguide use these two components and must look the same with no new prop), follow `AuthPanel`'s pattern, no new dependencies, nothing native, colours handed on as given (they may be iOS paired colours, so never build one into a string), don't publish, PowerShell for npm, stop after each item.
- The picked drawing, in `south-island/design-refs/` (git-ignored):
  - `days-picked.png` and `days-picked-dark.png`: round 5, the pick.
  - `days-picked.html`: its source, 393 pt wide (open with `?days`, add `&dark` for dark). Sizes below were read from it; where this prompt and the CSS disagree, the CSS is what the owner saw.
  - `days-round6-lost.png`: round 6, which lost. It shows two things **not** to do (see "What the critics settled").
  - `days-empty-picked.png`: an empty day. The app's own; here only so you know what sits beside your blocks.
- What is there today: `src/TimelineBlock.tsx` (variants "card" and "flat", `colors`, `textInset`) and `src/TransitBlock.tsx` (variants "pill" and "plain", `label`, `icon`, `colors`).
- How the app uses them: `south-island/components/itinerary/ItineraryDetailView.tsx` (search for `components.TimelineBlock` and `components.TransitBlock`), and the app's own drive block beside them, `south-island/components/itinerary/DriveBlock.tsx`.

## What the picked drawing is

Three kinds of row down the hours, and the point of the design is telling them apart at a glance:

- **A place**: a solid block in the app's deep teal, white words. It can be dragged. This is `TimelineBlock` "card", which the owner chose to keep after turning down a pale version: places must stand out from the grid.
- **A long drive between towns**: a pale teal block, dark words. It can be dragged. The app's own `DriveBlock`; not your job.
- **A short drive between two stops in the same town**: no block at all. A car and "30 min drive" in plain words, hung on a dotted line that runs from the place above to the place below. It cannot be dragged. This is `TransitBlock`.

So a fill means "you can drag this", and the dotted line means "the app worked this out".

## The work, in order

### 1. `TimelineBlock`: a leading icon, and where the block starts

- **A leading icon.** A new optional prop for an icon component (as `TransitBlock`'s `icon` is typed), drawn at the block's left, vertically centred, 22 pt, stroke 2, in the title's colour at about 90%. With an icon the words start 46 pt in from the block's left edge and the icon sits 14 pt in: the same two numbers the app's `DriveBlock` uses for its car and its words, so place and drive share one icon column and one text edge. With no icon given, nothing changes. Check `textInset` still does what it did; an app passing both should get the icon's inset, not the sum.
- **The block's left edge.** It is fixed at 82 pt. The picked drawing shortens the hour labels ("11 AM", not "11:00 AM"), which hands 18 pt back to the blocks: they start at 64. A new optional prop for the left offset, default 82. The right edge stays where it is.
- **A long name in a short block.** In a block an hour or taller the name may wrap to two lines. In a half-hour block it stays on one line at 15 pt (it is 16), so "Crown Range Summit Lookout" fits beside the icon. Check what the component does today for a single-slot block and keep that unless the new icon prop is passed.
- **The drag dots** on the solid block: let the app set their colour (there is already `grip` in the colours; check it reaches the dots on "card"). Drawn white at about 70%: round 5 had them at 60% and was told they were faint, round 6 at 85% and was told they were as loud as the place's name.

The time line under the name is already the app's words (`item.timeLabel` and `item.durationLabel`, joined with a dot). The app will pass the range as `timeLabel` and leave `durationLabel` out. Nothing to do here, but don't break it.

### 2. `TransitBlock`: the short drive

The owner's words for it: these are short drives between two places in the same town, drives 99% of the time, and they must look different from the drive blocks. "Transit" read as a bus or a train to three critics.

- **The words.** Today it renders `{label} {minutes} min`. The app wants "30 min drive": the minutes first. A new optional prop that is a function of the minutes returning the whole line; when given, it replaces the label-and-minutes pattern. Default unchanged.
- **The left offset**, as in item 1: a prop, default 82, so the two components move together. The app will pass 64 to both.
- **One icon column.** With the "plain" variant, or a new variant if that is cleaner, the icon sits on the same centre line as `TimelineBlock`'s leading icon (14 pt in, 22 pt box, so centred 25 pt from the block column's left edge) and the words start 46 pt in, as the blocks' words do. Today the icon is 13 pt and the words start 40 pt in.
- **The icon's own colour.** A new colour, separate from the text's. Drawn 22 pt, stroke 2, the same drawing size as a drive block's car. The app will pass a soft grey-teal for it (the dotted line's colour) and a darker grey for the words.
- **The dotted line.** There is already a dashed line down the gap (`transitLine`, 24 pt in). The picked drawing has it dotted, 2 pt, centred on the icon column (25 pt in), running the full height of the gap from the block above to the block below, broken only behind the icon (the icon sits on a patch of the page colour, about 3 pt clear all round). Let the app choose dotted or dashed and set the patch colour; default as today.
- **Words**: 13 pt, medium weight, sentence case, no letter-spacing. Today's `label` text variant brings spaced capitals; the new look must not.

### What the critics settled (so don't reopen it)

- **Don't shorten the dotted line to avoid the hour lines.** Round 6 stopped it short of each hour line; it broke into uneven stubs and four critics called them broken fragments. It runs unbroken, as round 5.
- **Don't shrink or fade the short drive's car.** Round 6 drew it small, thin and pale; three critics said the travel nearly vanished. Full size, in the column, in a soft colour.
- **Don't give the short drive a fill or an outline.** Round 3 gave it the drive block's pale fill; four critics read it as a small drive block and counted seven items in a day of five.

## Tests

As the first job: `npm test` and `npm run typecheck` clean; for every new prop, one test that the default is 0.10.0's look and one that the new prop does what it says; no snapshot files.

Dragging, snapping, the edit tap, the note chip and every hit area must not change. Say how you checked.

## Handing back

After each item, and at the end:

- What changed, per component, a sentence each.
- The exact props the app passes to get the picked drawing, as one snippet per component.
- What you did not do, and why.
- The version you'd give the package and one changelog line.

When the owner has published, and only then, the last step in the app. It all goes in together, because the hour column and the blocks must move as one:

1. Bump `@blacksands/components` in `south-island/package.json`.
2. `components/itinerary/ItineraryDetailView.tsx`:
   - Hour labels as "11 AM", "12 PM". Hour lines from the blocks' left edge (64) to their right edge, no further either side.
   - `TimelineBlock`: left 64; the leading icon from the place's first category (`CATEGORY_CONFIG` in `components/map/SiteMarker.tsx` has an icon per category; use its `Icon`, not its colour); `timeLabel` as a range ("11:30 AM – 12:30 PM", or "1:00 – 2:00 PM" when both ends share AM or PM) and no `durationLabel`.
   - `TransitBlock`: left 64, a car, "30 min drive", the dotted line, the colours above.
   - An empty day: one row across the hours with "Nothing here yet", a line under it, and an orange "Browse places" button, in place of the three cards (`design-refs/days-empty-picked.png`).
3. `components/itinerary/DriveBlock.tsx`: left 64; a pale teal fill with no outline (drawn `#D9E9E4` light, `#173F45` dark; use or add a paired token, don't hard-code); the car 22 pt, 14 pt in; words 46 pt in. Its time line keeps its words, "11:00 AM · About 30 min": the owner chose to keep "About", since a drive time is an estimate.
4. The app's tests and typecheck; the fingerprint still `4ad8daed…` (`npx @expo/fingerprint fingerprint:generate --platform ios`).
5. Don't commit, don't publish. Tell the owner it is ready for the development branch, and that dragging a place and a drive needs checking on the phone.

## Stop and ask

- A new prop can't be added without changing what "card", "pill" or "plain" draw by default.
- The leading icon or the left offset would move a hit area or change how a drag snaps.
- Anything in the drawing the words above don't cover: show it, the owner picks.
