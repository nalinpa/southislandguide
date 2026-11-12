# TASKS.md: put 1.2 — Polish in one chunk, and the rest in the backlog

Work in `C:\Users\User\source\south-island`. Change only `TASKS.md`.

## Why

1.0 is live (2026-11-02) and 1.1 was submitted on 2026-11-11. The owner's next milestone is **1.2 — Polish**: every open post-launch task except a fixed list, which goes to a backlog. Today the open work is spread over about 15 "After launch" sections, with finished work mixed in. After this change, someone opening TASKS.md sees the milestone first, then the backlog, then the finished history.

## The layout to end with

```
# South Island Guide — Tasks
## Release plan        ← keep, plus one line: 1.0 live 2026-11-02, 1.1 submitted 2026-11-11, next 1.2 — Polish
## 1.2 — Polish        ← every open item below that isn't backlog, grouped as listed
## Backlog             ← the owner's exclusions, one ### per topic
## Done                ← every finished section and [x] item, in today's order and wording
## Tooling             ← unchanged, stays last
```

## What goes where

Match items by their bold title; line numbers will have moved. **TASKS.md has 22 open `- [ ]` items today.** Each one must end up in exactly one place.

### 1.2 — Polish (the milestone)

Use these `###` groups, in this order.

**Watch and fix**
- "Watch Sentry daily for the first week" (now in "After launch — first weeks").
- "Add to Calendar fails on one calendar: 'Alarms cannot be changed'" (first weeks).
- **New item:** "Try Add to Calendar with a Google calendar." Take it from the note at the end of the done calendar item ("A Google calendar is still to try"). Leave the done item in Done.

**Trips**
- "Add to Trip doesn't say which days have room" and "'Find more things to do' forgets the slot". Both are in "Tester feedback, 2026-11-11". Bring that section's intro line with them.
- "Some legs between towns are far off", with its fix options and its "Related" bullet, from "After launch — drive times between stops". Bring that section's intro line.

**Saved map**
- **New item:** "Saved map v2: Standard or Detailed, background download, packs". Point it at `docs/plans/offline-map.md`, section "v2". It needs the owner's `LINZ_API_KEY` and an rclone upload.
- **New item:** "Change the guide's no-signal lines and the Milford and mobile-coverage posts to 'save the map on the Profile tab before you go'." The source is the last line of Task 6 in `docs/plans/offline-map.md`. Then add a line to `docs/plans/launch.md` "Already done"; that's a note inside the item, not a change you make now.
- The "After launch — saved map for no signal" section itself is all done, so it goes to Done.

**Quality**
- The whole "After launch — multi-device testing" section: its intro and its 3 items.
- **New item:** "Design sweep: square corners and a shadow on cards" (owner, recorded in Claude's memory, not in TASKS yet). Put "Login screen feels basic" under it as a sub-item, keeping its text. The login item is in "After launch — tester feedback, 2026-11-09", and the rest of that section is done.
- **New item:** "Ask for the second tester's screenshot and phone model, to confirm the tour cut-out fix." It's inside the done tour item in "Tester feedback, 2026-11-11".
- "CI for tests" (Housekeeping).

**Optional**
- "Stats without an analytics SDK (optional)", with its sub-bullets.

### Backlog

These are the owner's exclusions, one `###` each. Move each with its intro text and sub-bullets.
- **Apple and Google sign-in:** the section's 3 open items and its intro.
- **Home-screen widget and App Clip:** "The trip, live, outside the app: a widget and an App Clip" (now in "long term").
- **Sentry 8 upgrade:** "Upgrade `@sentry/react-native` 7.11 → 8.x".
- **North Island:** the whole "After launch — the North Island" section.
- **Paid unlock:** the whole "After launch — the paid unlock" section, including "Notes kept from before".
- **Emailing users:** the section's intro, its done privacy-line item, and its 5 open items.
- **Auto trip planner:** the "Parked" section.
- **Move to Cloudflare:** "Replace Firebase Auth and Firestore with Cloudflare" (now in "long term").
- **Places near a place:** the whole "After launch — places near a place" section (added 2026-11-11, after the count of 22 above).

### Done

Everything else goes here, unchanged and in today's order under its current heading:
- the 1.0 sections;
- "1.1 — drive times and multi-day";
- review fixes round 2;
- the done items of first weeks, the 2026-11-09 tester feedback and the 2026-11-11 tester feedback.

Rename "After launch — X" headings to "X" only if every heading in Done can be renamed the same way. Otherwise leave them.

## Rules

- **Keep the 1.0 section's `### Sign-in` heading as it is** when it moves to Done. Code comments in `app/(auth)/login.tsx` and `components/auth/SocialSignInButtons.tsx` point to "TASKS.md, Sign-in".
- **Move, don't rewrite.** Keep each item's words, dates, quotes, code spans and sub-bullets exactly. The only new words are the five new items above, the Release plan line, and the new `##` and `###` headings.
- **Open items stay unticked, done items stay ticked.** Don't tick or untick anything.
- **Don't drop anything.** Every line of today's file is either in the new file or deliberately replaced. A heading left empty by moving its items can go.
- Write the new items in the file's own style: `- [ ] **Title.** One or two plain sentences.`

## Check, then wait

1. **Count the open items.** `grep -c "^- \[ \]" TASKS.md` should give 27 (the 22 of today plus 5 new). Then check each of today's 22 bold titles appears exactly once with `grep -c`.
2. `git diff --stat TASKS.md`. The change should be mostly moved lines.
3. **Show the owner** the new outline (every `##` and `###`, with the item titles under 1.2 and Backlog) and both counts. **Don't commit until they say go.** Answering a question about the outline isn't a go.
4. On their go, commit on `main` as `docs(tasks): 1.2 — Polish milestone, backlog, and done history`. Push only if they ask.
