# Engine: the reviews pieces, as picked

Kiwi Guide (south-island) drew its three reviews screens, had them judged over four rounds, and the owner picked. The engine's flat review pieces (`@blacksands/components` 0.9.0) are close to the picked drawings but not the same. This prompt closes the gap, so the app can switch them on.

You are working in the engine, not the app.

- Engine: `C:\Users\User\source\enginev1\components` (its own git repo).
- The app: `C:\Users\User\source\south-island`, branch `design`. Read it, don't change it, until the last step.

## Read first

- `south-island/prompts/engine-design-sweep.md`: the first engine job. Its hard rules all apply here unchanged: opt-in only, follow `AuthPanel`'s pattern, no new dependencies, nothing native, colours handed on as given (they may be iOS paired colours), don't publish, PowerShell for npm, stop after each item.
- `south-island/docs/plans/design-sweep.md`: the look and its values.
- The picked drawings, in `south-island/design-refs/` (git-ignored):
  - `reviews-screen-picked.png`: the reviews screen
  - `reviews-place-picked.png`: the reviews part of a Place page
  - `reviews-form-picked.png`: the review form
  - `reviews-picked.html` (screen and Place: open with `?list` or `?summary`) and `reviews-form-picked.html` (open with `?form`): the drawings' source, 393 pt wide. Every size below was read from these; where this prompt and the CSS disagree, the CSS is what the owner saw.
- What is there today: `src/reviewLook.ts`, `src/ReviewsHeader.tsx` ("flat"), `src/ReviewListItem.tsx` ("row"), `src/ReviewsSummaryCard.tsx` ("flat"), `src/ReviewModal.tsx` ("sheet"), `src/ReviewsEmptyState.tsx` ("flat").

## One rule on top of the others

The variants named above shipped in 0.9.0 and no app passes them yet. Even so, don't change what they draw with no new prop: add props whose defaults keep 0.9.0's look, and test the default. If a clean result needs a new variant name instead of three more props, say so and show both before building.

## The work, in order

### 1. The reviews screen: `ReviewsHeader` "flat" and `ReviewListItem` "row"

Drawn with no initials circle and no lines; space groups each review.

Header:
- The rating line under the title is 17 pt semi-bold (it is 16), 10 pt under the title (it is 6), star 16.
- No line under the header (the app already has `showDivider`), 12 pt under the rating line.

Each review:
- A way to leave out the initials circle. The name then starts at the left edge.
- A way to leave out the line under each row. Row padding 16 above, 18 below.
- Name 16 pt semi-bold. Under it, 3 pt down: the five small stars (12 pt, 1 pt apart), then the date (13 pt, `muted`), 8 pt between them.
- The review's words 16 pt on a 24 pt line in `text`, 8 pt under the stars row. They are 15 on 22 in `text2`, and three critics said the words were the faintest thing on the screen.
- The empty star needs its own colour the app can set. Drawn `#9FB1AB` on white: light enough to read as empty, dark enough that four stars don't read as five.
- The ⋯ menu's mark at the top right of the row, level with the name, 22 pt, in a quiet colour the app can set, its right edge on the text's right edge. Its tap area must stay 44 pt.

### 2. The reviews part of a Place page: `ReviewsSummaryCard` "flat"

Drawn as: the rating as the heading, the latest review in an outlined box, two links under it.

- **The rating is the heading.** Star (18 pt) and "4.6 · 12 reviews" at 20 pt bold, letter-spacing -0.2. No separate "Reviews" title above it: critics found it said the word twice. With no reviews yet, the heading is "Reviews" and the empty words sit under it.
- **The latest review, in a box.** A new optional prop for one review (author's name, rating, words, date). When given: a box with a 1 pt outline in `line`, 12 pt corners, 16 pt padding, 16 pt under the heading. Inside, the same arrangement as a row in item 1, without the ⋯: name, stars and date, then the words, at most four lines. When not given, no box.
- **Two links under the box**, on one row, 10 pt under it, 44 pt tall: "See all 12 reviews" with a chevron on the left, "Write a review" on the right. Both 16 pt semi-bold in `link`. This replaces the outlined button: the owner chose links.
  - Already reviewed: the app's `reviewedLabel` in `muted` where "Write a review" was, not tappable.
  - Offline: "Reconnect to review" in `muted`, not tappable.
  - No reviews yet: "Write a review" alone.
- The count in "See all 12 reviews" comes from `ratingCount`; let the app give the words (a function of the count, or a label with the count already in it).
- The line above the section stays, with 22 pt under it.

The app will have to fetch the latest review to pass it in. That is the app's job at the last step; here, only take it as a prop.

### 3. The review form: `ReviewModal` "sheet"

This one passed its critics (3 of 5). What differs from 0.9.0:

- **No Cancel button.** A way to leave it out; the close mark in the corner is the way out. Save is then the full width, 50 pt tall, label 17 pt semi-bold.
- **No line under the title** when the app passes an empty `subtitle`: check nothing is drawn and no gap is left.
- **The stars span the sheet's width.** Five equal cells from the text's left edge to its right edge, a 40 pt star centred in each, so the first star's left point and the last star's right point sit on the same edges as the box and the button. They are 36 pt stars in 52 pt cells, left-aligned: critics marked the dead space to the right, then (centred) that they floated, then (spread at 36) that the gaps were wider than the stars. 40 in equal cells is the answer to all three; show the owner a screenshot before going on.
- Stars not yet chosen take the note box's outline colour (`boxBorder`), so the two outlines match. Chosen stars stay `starPicked`.
- Labels ("Your rating", "Your thoughts") 16 pt semi-bold in `text`, 20 pt above each, 8 pt under. They are 14 in `text2`.
- The close mark's circle: check the app can set its colour through `pale` without also changing something else that uses `pale`.

The title's capitals ("Share Your Experience") are the app's to pass; don't change the engine's default words.

### 4. `ReviewsEmptyState` "flat"

Not drawn. Bring it into line with what was picked and show the owner: the button from the first job, and no icon circle if the row has no initials circle. If you think it is fine as it is, say so and leave it.

## Tests

As the first job: `npm test` and `npm run typecheck` clean; for every new prop, one test that the default is 0.9.0's look and one that the new prop does what it says; no snapshot files.

## Handing back

After each item, and at the end:

- What changed, per component, a sentence each.
- The exact props the app passes to get each picked drawing, as a snippet per screen.
- What you did not do, and why.
- The version you'd give the package and one changelog line.

When the owner has published, and only then, the last step in the app:

1. Bump `@blacksands/components` in `south-island/package.json`.
2. Reviews screen (`app/(app)/(tabs)/sites/[siteId]/reviews.tsx`): the white page (drop the `background={tokens.colors.bgBase}` the first job left there), the flat header, the rows as picked.
3. Place (`app/(app)/(tabs)/sites/[siteId]/index.tsx`): the flat summary, with the latest review passed in. Find how the reviews screen reads reviews and reuse it; mind the Firestore read count (the free plan is 50,000 reads a day) and don't add a read per place opened if the place's data already carries what is needed. If it would add a read, stop and tell the owner the cost first.
4. The form: `variant="sheet"`, the title "Share Your Experience", an empty subtitle, no Cancel.
5. The app's tests and typecheck; the fingerprint still `4ad8daed…` (`npx @expo/fingerprint fingerprint:generate --platform ios`).
6. Don't commit, don't publish. Tell the owner it is ready for the development branch.

## Stop and ask

- A drawing can't be reached without changing what 0.9.0's variants draw by default.
- The latest review can't be shown without a new read per place.
- Anything in the drawings that the words above don't cover: show it, the owner picks.
