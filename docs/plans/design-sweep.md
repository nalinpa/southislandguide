# Design sweep: the look

Written 2026-11-12, updated 2026-11-13 after every screen but the share card had been drawn, and 2026-11-14 after the build. Follows [prompts/design-sweep.md](../../prompts/design-sweep.md). Rounds, scores and images are on the [progress page](https://claude.ai/artifact/Ur87RXUT1XmXAkPQmy9N6p) (private to the owner).

Built on `design`, 2026-11-13 and 14, and checked on the owner's phone through the `development` branch: every screen below but the share card. The last small changes (the ⋯ menu, a stop's note, photo credits, the offline banner, the Days view's gaps and hour labels, 2026-11-14) still need that check. The drawings are HTML mock-ups at iPhone size, kept outside the repo; the picked ones for reviews and the Days view are in `design-refs/` (git-ignored).

## How the look was reached

- Step 0: the owner picked Look C (photo first, deep teal) from three.
- Screen 1 (Explore), round 1: all three looks were judged against the bar. C scored 0 of 5, A 1 of 5 (colour), B 2 of 5 (first glance, spacing).
- The owner chose a mix: B's card and spacing, A's teal header. Rounds 2 and 3 each scored 4 of 5.
- Dark against light, same screen: dark preferred by 3 of 5.

Look C as first written (words on photos, yellow main button, teal tab bar) is dropped.

## The look in one line

White page, photo first with the words under it, a teal header for the place you're in, teal for whatever is selected, orange for the one main button.

## Pass line

As agreed 2026-11-12: at least 3 of 5 critics rate ours equal to or better than the bar, and no weakness named by two or more critics.

The second half was never met by any screen: each critic must name three weaknesses, so overlap is close to certain. Scores below are the first half only. The same drawing judged twice can move by about 2 of 5 (Login rounds 3 and 5), so a single round's score is a rough guide, not a measurement.

## Values

Names on the left are `lib/ui/tokens.ts` where the token exists. Dark values are new: the app has one palette today.

| Piece | Light | Dark | Token |
|---|---|---|---|
| Page | `#FFFFFF` | `#06191B` | `colors.bgBase` (now `#EEF6F3`) |
| Text | `#0A1F1B` | `#EEF6F3` | `colors.text` |
| Second text | `#33443F` | `#C5D6D1` | `colors.text2` |
| Idle (categories, tabs) | `#566661` | `#9DB5AF` | `colors.textMuted` |
| Selected, links | `#095C65` | `#7FD0D6` | `colors.accent` |
| Lines | `#CBD8D3` | `#2F5257` | `colors.borderSubtle` (now `#CFE1DA`) |
| Input box outline | `#6F8F86` | `#4F8275` | new |
| Placeholder text | `#7C8C87` | `#7F9690` | new |
| Band between groups | `#EEF3F1` | `#0C2A2E` | new |
| Header bar | `#063F45` | `#0B4B52` | `colors.accentWarm` |
| Icon circle, pale fill | `#E6F1EE` | `#12343A` | new |
| Main button | `#C2410C`, white label | same | `button.primary` (unchanged) |
| Danger | `#B42318` | `#FF8A7A` | `colors.danger` (dark is new) |
| Tour dim | `rgba(3,38,43,.82)` | same | `colors.scrim` at 82%, as today |
| Photo corner | 14 | 14 | `radius.md` |
| Sheet top corners | 20 | 20 | new: `radius.sheet` |
| Button and input corner | 12 | 12 | between `radius.sm` and `md`: add a token |
| Side margin | 16 (24 on Login) | same | `space` |

Measured contrast on Explore, all above the 4.5 floor: place name 17.1 / 16.4, description 10.3 / 12.0, idle 6.1 / 8.3, selected 7.7 / 10.2 (light / dark).

## Rules that came out of the rounds

- Words never sit on a photo, except the photo credit, the status bar on a full-width hero, and the title on the Login photo.
- One card shape per list. A featured first card may have a taller photo, nothing else different (owner, 2026-11-13).
- Selected is marked one way everywhere: teal, semi-bold, a 2 pt line under the word. Idle is one grey everywhere.
- Facts (a distance) are plain text.
- Orange is for what the owner wants people to tap: the one main button on a screen, and a link that is being pushed. Other tappable words are teal. The owner keeps orange although critics named it on every screen.
- Red means "this deletes things" and nothing else.
- Every photo on a white page gets a hairline edge.
- Tab bar: white (page colour), sentence-case labels.
- Text that is cut ends on a whole phrase, not mid-sentence. Nothing is half-cut by a bottom bar.
- A band means "new group"; a hairline means "next row in the same group".
- One filled button per screen at most. Second actions are an outline or a plain link.
- A control for leaving (Skip Tour) sits with the thing it leaves, not in a far corner.
- Capital letters are left as the app has them (owner, 2026-11-13): "Sign Out", "Delete Account", "Restart App" keep capitals on each word beside sentence-case rows.

## Where each screen stands

Best score is against the bar named. "Carry" is the drawing to build from.

| # | Screen | Bar | Rounds | Best | Carry |
|---|---|---|---|---|---|
| 1 | Explore | Airbnb explore list | 3 | 4 of 5 | Round 3 with the distance in plain text |
| 2 | Place | Airbnb place, about text | 5 judged | 2 of 5 | Owner to pick: round 5, or round 6 (round 5 with the app's own action bar, not judged) |
| 3 | Trip view | none | 0 | not judged | Mock-up only |
| 3b | Days view | Timepage (owner's screenshot) | 6 | 4 of 5; then each round beat the last | Round 5 (built) |
| 4 | Trips tab | our own Explore | 2 | 1 of 5 ("same app: yes") | Round 2 with two small fixes |
| 5 | Pop-up sheets | Airbnb sheets | 2 | 3 of 5 | Round 2 with two small fixes |
| 6 | Map | Airbnb map | 3 | 2 of 5 | Round 2 (owner: not the photo version of round 3) |
| 7 | Guide | Airbnb | 3 | 2 of 5 | List with the app's coloured icons (owner: keep the colours); section view from round 2, tightened |
| 8 | Profile | Airbnb profile | 3 | 1 of 5 | Round 3 with the map button back to an outline |
| 9 | Login | Airbnb log in | 5 | 2 of 5 | "The pick" (below) |
| 10 | Tour, error screen | Peloton tour card, Wise error sheet | 2 | 5 of 5 each | Round 2 with two tweaks (below) |
| 11 | Share card | none | 0 | parked | Owner has no reference yet (2026-11-13) |
| 12 | Reviews | Airbnb reviews (screen, Place part); Too Good To Go (form) | 4 | 1 of 5; form 3 of 5 | Round 4; form round 3 (built) |

### Screen 1, Explore

Approved by the owner, 2026-11-13, all five small fixes from the dark run:

- A hairline round every photo.
- Dark: a lighter teal header (`#0B4B52`), so it stands off the page.
- Stronger lines under the category row and over the tab bar.
- Idle words one grey in the category row and the tab bar.
- With that, a wider gap between selected and idle in the tab bar.

The three differences from today's app, settled by the owner, 2026-11-13:

- The featured first card stays at least slightly bigger. Drawn as the same card with a taller photo (204 pt against 160 pt): same width, corner, text and spacing. Critics marked a featured card that differs from the list in every look of round 1; the owner's taste wins.
- Cards show a distance: yes, it is useful.
- Descriptions end at a full stop or comma: yes. A small code change, not styling.

The drawing to build from is `explore-final` (round 3, these three, and the five fixes).

### Screen 2, Place

- Round 6 is the pick (owner, 2026-11-13): round 5 with the app's own action bar, untouched, from `components/sites/detail/ActionsBar.tsx`.
- No tab bar on the Place screen (owner, 2026-11-13): "+ Add to Trip" is docked in its own row at the very bottom. This changes behaviour: from a place, the other tabs are reached by going back.
- The line of key facts drawn in early rounds is gone (owner). The app's own facts line (rating, category, price, Website) stays.
- Links ("Website", "Details") are orange, by the owner's choice. See "Link colour" under Open.

### Screen 3, Trip

Judged 2026-11-13 against our own Explore as built, not against a reference: Trip view 2 of 5, Days view 0 of 5, "same app" 10 of 10.

- Owner's calls: the "Today" label and the now-line stay orange.
- Trip view, built: day rows flat on the page with a line under the words; the day label a step larger and darker; a route never leaves an arrow at the end of a line and a town's name never breaks (`routeLine`); day tabs on the white page with the teal line; the Trip / Days switch's chosen half a soft white tint, since a solid white pill was the loudest thing on the screen.
- The ⋯ menu (2026-11-14, no critics): a card lifted by `cardLift`, with the dark hairline; rows as Profile's (48 tall, 16 pt, medium, a `line` between); the sheets' teal dim at 25%. It was a warm brown dim.
- A stop's note (2026-11-14, no critics): the delete card's look (page colour, 20 pt corners, `dim`), the icon on `bgSurface`.

### Screen 3b, the Days view

Redrawn over six rounds, 2026-11-14, after the owner turned down a first build with flat blocks ("the old style was better"). Engine work in [prompts/engine-days.md](../../prompts/engine-days.md) (`@blacksands/components` 0.11.0).

| Round | Judged against | Result | What it settled |
|---|---|---|---|
| 1 | solid against pale blocks | solid 5 of 5 | Owner: pale was "too faint overall, places didn't stand out from the grid" |
| 2 | Timepage | 4 of 5 | Solid teal place blocks hold up against a calendar app |
| 3 | round 2 | 4 of 5 | Car for the short drive; a pill there read as a small drive block; long names cut in a half-hour block; the time line said the length twice |
| 4 | round 3 | 5 of 5 | |
| 5 | round 4 | 5 of 5 | **The pick** |
| 6 | round 5 | lost, 2 of 5 | The dotted line stopped at each hour line broke into stubs; a small pale car made the travel vanish |

Owner's words, kept:
- A short drive between two places in the same town reads **"30 min drive"**. "Transit" read as a bus or train; these are drives 99% of the time, but must look unlike the drive blocks.
- Drive blocks keep **"About"** ("11:00 AM · About 30 min"): a drive time is an estimate.

As built:
- One grammar: **a fill means it can be dragged; a dotted line means the app worked it out.** Place: solid teal (`accent`), white words. Drive between towns: pale teal (`driveFill`), no outline. Short drive: no fill, a car and "30 min drive" on a dotted 2 pt line in `border`, unbroken from the place above to the place below.
- Blocks start 64 pt in (`BLOCK_LEFT`); hour labels short ("11 AM"), 11 pt, idle grey, 16 pt from the edge; hour lines from the blocks' left edge to the right margin.
- Place blocks: the place's category icon, 22 pt, 14 pt in, words 46 pt in (the drive block's car and words use the same two numbers); the time as a range, "1:00 – 2:00 PM" (`slotRangeLabel`); drag dots white at 70% (60 was faint, 85 as loud as the name).
- Not to reopen: don't stop the dotted line short of the hour lines, don't shrink or fade the short drive's car, don't give the short drive a fill.
- Gaps: "Find more things to do" is the outline button with a +, as "Drive Day 1 in Google Maps" (2026-11-14). It was a dashed card.
- An empty day: one row on the first hour, "Nothing here yet" and an orange "Browse places", then two "Find more things to do" further down, each opening Add to Trip on its own time (owner, 2026-11-14: more than one reminder). The three cards before the sweep read as three things to do.

### Screen 4, Trips tab

Round 2: the trip first, the sign-in row docked above the tab bar, no "7 days", no lock on each row. Route lines follow screen 3's rule (an arrow goes with the town after it); the earlier rule here, that a line may end with an arrow, is dropped.

### Screen 5, Pop-up sheets

Round 2: the chosen box is solid teal, "Full" is dimmed, time boxes are equal width, the place name is bold, the day row fades at the edge, the stepper is two outlined buttons.

### Screen 7, Guide

Parked by the owner: the space above the section title (about 20 pt was proposed), and making web addresses in guide text real orange links, which is a code change.

### Screen 8, Profile

- The banner with "Open Guide" stays as it is. The owner means to highlight the Guide more later, and the layout may change then.
- No badge with the email's first letter (owner).
- Groups separated by a band; the email is the first and largest thing; "Sign Out" in teal; "Map for no signal" as a small grey section name like "My Trip"; "Show me around" in its own group.
- For the build: the map button as a teal outline (the filled teal of round 3 made too many loud things), one gap under every section name, section names one step smaller.

### Screen 9, Login

The pick, not judged as a whole:

- Photo at about 40% of the screen, the form on a white sheet with rounded top corners over it.
- Labels a step larger and darker than the placeholder.
- The password box is empty: no word, no dots. Critics marked the word, the dots and the empty box; empty drew the fewest marks.
- "Forgot password?" sits close under the password box, on the right.
- No second button. "Create an account" and "Continue as guest" are two teal links on one centre line. On Create account the first is "I have an account".
- The line under the title at medium weight (it was bold since 2026-10-26; the darker band behind it keeps it readable).

Changes beyond looks, each approved by the owner: "Forgot password?" moves up; the password placeholder goes; on Create account the photo is shorter so the whole form shows without scrolling.

The engine's `AuthPanel` already has a light tone. It needs the corner size and colours set, and a way to place "Forgot password?" under its box.

### Screen 10, Tour and error screen

Tour, round 2:

- "Skip Tour" is inside the card, a teal link under the dots (owner: yes). The `skipAtBottom` step option is no longer needed.
- A small pointer joins the card to the lit strip; both sit on the same side edges.
- The dot for the current step is teal; idle dots are darker than before.
- "Next" has 12 pt corners.
- For the build: a little more room around "Skip Tour", a wider gap between the strip and the card.

Error screen, round 2:

- Wording untouched (owner: ignore the wording). Critics named "Please try again." against "Restart App" in both rounds.
- A larger sign in a circle, the group a little above the middle, a full-width button close under the message.
- For the build: the sign back in red on a pale red circle. The grey sign of round 2 was marked for carrying no error colour.

Not drawn: the trip-preview step and the map step of the tour.

Built since: the tour's place step scrolls Explore to the top first; it pointed at nothing when the list was scrolled.

### Screen 12, Reviews

Four rounds, 2026-11-14. Engine work in [prompts/engine-reviews.md](../../prompts/engine-reviews.md) (`@blacksands/components` 0.10.0, the "open" variants).

- The reviews screen and the reviews part of a Place page stayed at 0 or 1 of 5 for four rounds: critics kept marking what can't change here (no reviewer photos, 16 pt margins, teal beside orange). The owner took round 4.
- The form reached 3 of 5 at round 3, the pick.
- Screen: white page; no initials circle and no lines, space groups each review; name 16 semi-bold, small stars, date in the idle grey; the words 16 on 24 in `text` (critics called the old `text2` the faintest thing on screen); the ⋯ bare, in the idle grey.
- Place: the rating is the heading; the latest review in an outlined box; "See all N reviews" and "Write a review" as teal links in place of a button. The latest review comes from the public reviews already fetched (no extra read) and skips authors the user has blocked (owner, 2026-11-14).
- Form: titled "Share Your Experience" (capitals, as the buttons; owner), no subtitle, the sweep's button at 17 pt. A chosen star is teal; an empty star and the note box's outline are `border`, the app's outline colour, not the drawing's own grey (owner: fine).

### Smaller things, no critics

- Explore: an orange "Details ›" at the foot of each card, right of the distance, so people know a card opens (owner, 2026-11-13).
- The town sheet: the chosen town is orange, word and tick (owner: clearer).
- Photo credits: the white page, `line`, the name 16 semi-bold, the town in the idle grey (2026-11-14).
- The offline banner: the pale `band` with the idle grey's words and line, not the engine's amber (2026-11-14). It sits over the status bar, so on a teal header the clock is light on a pale band; that was true of the amber too.

## Dark mode

Built 2026-11-14 from [prompts/dark-mode.md](../../prompts/dark-mode.md); checked on the owner's phone in dark and in light, signed off by the owner the same day. It follows the phone's setting: no switch in the app (owner, 2026-11-13). The dark critic round (step 6 of the prompt) was skipped: the owner signed off after the phone check. It reaches users with the next release; the owner decides when.

### How it's built

- Every colour in `lib/ui/tokens.ts` is a pair: `pair(light, dark)` gives iOS's own two-sided colour (`DynamicColorIOS`), so iOS swaps it when the phone changes and no screen re-renders. `DARK_READY` is the switch; with it off, a pair is its light colour.
- A pair can only go in a style. It can't be glued into a string (`${colour}66`), measured or parsed. A see-through colour gets its own pair with the see-through-ness written in. `scrim` stays a plain string for that reason: two photo gradients add to it.
- Tests check light: `test/lightColors.js` makes a pair its light side under Jest. Dark is checked on the phone.
- **Fill or words, never both.** Teal, orange, red and green each have a fill shade (white words on it) and a word shade (on the page), the same colour in light:
  - Teal: `accent` is the fill, `selected` the words and icons.
  - Orange: `highlight` is the words, `button.primary.bg` the fill.
  - Red: `danger` is the words, `dangerFill` the fill.
  - Green: `surf` is the words, `success` the fill.
- A surface that only a shadow lifted (the map's search bar, controls and sheet, the tour card, the place's back button) is `bgCard`, one step above the page in dark, with a hairline (`darkEdge`) that is see-through in light and takes no room.
- Map pins and clusters keep fixed colours: a pin is drawn once into a picture, so a pair would keep whichever look was on when it was drawn.
- The app's own colours outside the palette (categories) are `lifted()` in dark: the same hue 35% toward white, at least 4:1 on the page.
- The clock and battery follow the phone through `Screen` (`statusBarStyle` "default", `@blacksands/ui` 0.7.1). The teal headers, the place photo and login keep light ones in both.
- Stays light on purpose: the share card (it's a picture people post) and the Google and Apple sign-in colours (their rules; the buttons aren't shown at launch). The map follows the phone (owner, 2026-11-14); the saved map for no signal stays light. Photos are at full brightness (owner, 2026-11-14).
- The engine needed nothing: every piece the app shows takes its colours from the app. [prompts/engine-dark.md](../../prompts/engine-dark.md) lists them, and the older variants another app would meet.

### Values

The four marked * were picked by the owner from swatches, 2026-11-14.

| Token | Light | Dark |
|---|---|---|
| `page` | `#FFFFFF` | `#06191B` |
| `bgBase`* | `#EEF6F3` | `#081D20` |
| `bgCard`* | `#FFFFFF` | `#0E2A2E` |
| `bgSurface`* | `#E2F0EB` | `#12363A` |
| `bgElevated`* | `#D3ECE5` | `#1A4247` |
| `band` | `#EEF3F1` | `#0C2A2E` |
| `driveFill` | `#D9E9E4` | `#173F45` |
| `text` / `text2` / `textMuted` | `#0A1F1B` / `#33443F` / `#566661` | `#EEF6F3` / `#C5D6D1` / `#9DB5AF` |
| `line`, `borderSubtle` | `#CBD8D3`, `#CFE1DA` | `#2F5257` |
| `border` | `#A9C6BC` | `#567F84` (a step lighter than drawn, for 3:1 on a card) |
| `borderStrong` | `#3D6B5F` | `#8DB3A8` |
| `selected` | `#095C65` | `#7FD0D6` |
| `accent`* (teal fill) | `#095C65` | `#1A7882` (white on it 5.2:1) |
| `accentDim` | teal 12% | `#7FD0D6` at 14% |
| `accentWarm` (header) | `#063F45` | `#0B4B52` |
| `highlight`* (orange words) | `#C2410C` | `#FF9B66`; the button stays `#C2410C` |
| `highlightDim` | `#FDEDE3` | `#3A2418` |
| `danger` (red words) | `#B42318` | `#FF8A7A` |
| `dangerFill`* | `#B42318` | the same (owner: light's red button in dark) |
| `dangerDim` | `#FDF0EE` | `#3A1D1A` |
| `surf` / `success` | `#2C4A36` | `#8FD3A6` / `#2E7D4F` |
| `warning` / `warningDim` | `#8F6310` / `#FBF3DF` | `#E8B95A` / `#3A2E12` |
| `dim` (behind sheets) | `rgba(3,38,43,0.55)` | black 60% |
| `photoEdge` | ink 14% | `#EEF6F3` at 16% |
| form field (`formTokens.bgElevated`) | `#F1F6F4` | `#12363A` |
| `highlightOnDark`, `onDarkMuted`, `scrim` | unchanged | the same: they sit on the teal header or a photo |

## Open

- **Link colour.** Owner's rule (2026-11-13): orange is for what the owner wants people to tap. So orange is the main button and the links that are being pushed ("Website", "Details"); teal is for everything else that can be tapped ("Sign Out", "Forgot password?", "Skip Tour"). On Login, "Create an account" and "Continue as guest" are teal (owner, 2026-11-13).
- **Fonts.** The app uses the iPhone system font. Mock-ups use Inter in its place, so widths and line breaks on the phone will differ a little.
- **Engine.** Done, each under its own prompt, published by the owner: `@blacksands/components` 0.9.0 and `@blacksands/ui` 0.7.x ([prompts/engine-design-sweep.md](../../prompts/engine-design-sweep.md): `AuthPanel`, the button's shape, the flat "no trips" panel and trip-choice sheet, `ErrorCard`, `LoadingState`, `Screen`), 0.10.0 (reviews) and 0.11.0 (Days). The app sets the sweep's look as each kit piece's default in `lib/uiKit.ts`, so a screen doesn't have to ask.
- **Screen 3 (Trip view) and screen 11 (share card)** have no reference screenshot. The share card is parked and stays light.
- **Still open:** the share card; store screenshots retaken in the new look, in the locked order.
