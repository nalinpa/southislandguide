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

## Wide

The open iPhone Duo, 1.3's Duo sweep ([prompts/duo-sweep.md](../../prompts/duo-sweep.md)). The owner picked Step 0's Look C, side by side, with Look B's centred pop-up instead of C's side panel (2026-11-15). Drawn at 669 × 951 pt, open portrait; the sizes are unofficial until the simulator confirms them.

| Piece | Wide value |
|---|---|
| Breakpoint | Window 600 pt wide or more. Folded (466), Split View (469) and every other iPhone keep the phone layout. |
| Switch | `useWide()`, one hook for the app and the engine's wide variants. Proposed home: the engine, beside the other shared hooks; settled when the first screen is built. |
| Top bar, tab bar | Edge to edge, as on the phone. |
| Side margin | 24 on grid screens, 20 inside a half. |
| Explore | Two columns, 16 pt gutter, 24 pt between rows. The featured card spans both columns (photo 280 tall); the others have a 190 photo. |
| Place | Photo on the left half, full height under the status bar, hairline edge on its inner side. Words on the right half, each half scrolling on its own. Add to Trip at the foot of the right half only. Back button on the photo, top left. |
| Pop-ups | A centred card 520 pt wide, every corner 20, lifted with a shadow, over the dim. Same contents and order as the phone sheet. |
| Beside a phone-width column | Nothing: no screen keeps a lone phone column. Two things that stack on the phone sit side by side instead (Trip days beside the day's stops, the guide's list beside its section, the Login photo beside the form). |

Landscape (951 × 669) follows the same rules; a screen whose layout depends on height gets a landscape drawing in its own round.

Exceptions on the open Duo only (owner, 2026-11-15, Explore round 2):
- The featured place is a normal card on the Duo for now: no taller photo, no bigger name, nothing different from the other cards. The owner first allowed a bigger name, then took it back the same day after seeing it drawn. On the phone the 13 Nov rule stands.
- Explore has no teal title bar. The town and its picker go at the top of the left side, with the guide, search and saved buttons straight under it. The owner first put the buttons at the foot, then moved them up after round 3's critics.
- Every place name is one step bigger on the Duo (18 pt against 16), all alike, up to 2 lines as on the phone (owner, round 4). A long town name ("Aoraki / Mount Cook") shrinks to fit two lines, with the chevron kept on the last word.

- The trip shows the Trip list and the selected day's timeline together, half each, with no Trip | Days switch (owner, 2026-11-15, trip round 2). That's a change of behaviour, at the owner's word, against the sweep's "no list-detail" rule: on the Duo a tap on a day shows it on the right, where the phone switches to Days.

### Explore, picked: round 6 (owner, 2026-11-15)

Drawings and scores on the [Duo progress page](https://claude.ai/artifact/5UiSmztCK67BT9KTvULvWb).

| Piece | Upright 669 × 951 | Sideways 951 × 669 (rail 84 on the right) |
|---|---|---|
| Left side | 200 pt, band tint (`#EEF3F1` / `#0C2A2E`), 20 pt sides, top lined up with the first photo | Same |
| Town | 26 pt, weight 800, `#063F45` / `#EEF6F3`; up to 2 lines, shrinks to fit down to 22 (`adjustsFontSizeToFit`), chevron kept on the last word | Same |
| Guide, search, saved | Bare 22 pt icons in the town's colour, 44 pt tap areas, 4 pt apart, the first icon's edge on the town's edge, straight under the town | Same |
| Categories | 16 pt, weight 500, `text2`; rows 40 tall. Selected: teal, semi-bold, fill `rgba(9,92,101,.16)` / `rgba(127,208,214,.18)`, corner 10, reaching 12 pt into the margin so the label keeps the town's edge, and 8 pt from both edges of the side (the drawing's 8/20 was lopsided). No underline, no bar | Same |
| Places | One column, 20 pt sides; photo 190; name 18 pt bold, up to 2 lines; description 3 lines; 24 between cards. Every card the same, featured included | Two columns, 16 gutter; photo 130 |
| Top bar | None: the phone's teal bar doesn't show on the Duo | None |
| Tab bar | As on the phone | As on the phone, stopping at the rail |

### The place, picked: round 3 A (owner, 2026-11-15)

Scored 7.2 against the benchmark's 7.4, the closest of any screen; it won against B with every critic.

| Piece | Upright 669 × 951 | Sideways 951 × 669 (rail 84 on the right) |
|---|---|---|
| Photo | Full width, a third of the height (320 pt incl. the status bar), as taken; a dark fade under the status bar (55% to clear over 120 pt) and under the credit | The left page, to the fold (475 pt), full height; a fade under the credit |
| Sheet | Over the photo from 300 pt, the phone's 20 pt top corners | The right page, to the rail |
| Columns | Left, the phone's 361 pt: name, facts, the four buttons, the description. Right, the rest of the width less a 24 gutter (244 pt): Good to know, the local tip, reviews. The right column starts level with the four buttons (so the name leads), no hairline after its last item | One column: everything in the phone's order |
| Add to Trip | Full width at the foot, as on the phone (owner's default; two critics wanted it under the left column), with a 36 pt fade above it so no line looks cut | Under the words only |
| Back, clock, credit | On the 20 pt margins | Same |
| Tab bar | None, as on the phone | None |

### The trip, picked: round 7 with softer times (owner, 2026-11-15)

Trip and Days together (the Trips tab opens the one trip, so this covers screen 4 too). Round 5 came within 0.2 of the benchmark; rounds 6 and 7 each beat the one before.

| Piece | Upright 669 × 951 | Sideways 951 × 669 (rail 84 on the right) |
|---|---|---|
| Split | Half each (334.5) | 40/60: the list 347, the day 520 |
| Left, tinted | The trip's name 22 pt bold, its dates 14, the ⋯ menu; then the day rows: photo 56, "Day N · date" 13, the route 15 bold (an arrow always starts a line, a town never breaks), places and driving 13, the opening drive 12 | Same, photo 56 |
| Selected day | The fill `rgba(9,92,101,.16)`; in dark `rgba(127,208,214,.30)` with a 1 pt `rgba(127,208,214,.55)` inner edge; its details in `text2`; the phone's pale × disc (`surface`) with a 1 pt `border` edge and a dark × | Same |
| Right | The day's heading on the left side's top line: "Day 19 · Thu 3 Dec" 14, the route 22 bold. The day opens at its start | Same |
| Timeline | The phone's hour scale (136 pt an hour); hour labels in a 56 pt column, on the heading's 16 pt edge; stops from 64 to 16 pt off the right edge | Same |
| A stop | The phone's teal block, its insides slimmer so a name fits one line: icon 24, padding 12, drag strip 18 with white dots; the time 13 pt, medium, 90% white, normal spacing (the phone keeps its spaced times: a "Later" item) | Same |
| A drive | The car on the stops' icon line, the words on their names' line | Same |
| Switch | No Trip \| Days switch on the Duo: both show at once, and a tap on a day shows it on the right (owner, against the sweep's no-list-detail rule) | Same |

Critics' last word on Explore, for the record: round 5 (bare bar, no fill) scored a little higher in the final run and fitted the phone best. The owner prefers round 6's fill. The repeated asks not taken up: two columns upright, and the teal band back.

The map: the owner likes Apple's overlay arrangement (2026-11-15, [the example](https://github.com/artemnovichkov/iPhone-Duo-by-Examples/blob/main/iPhoneDuoByExamples/Examples/OverlayArrangementExample.swift)). The map fills the window and its sheet floats over it as a card, about 360 pt wide, on one side. It uses our card look, not Liquid Glass. Apple's version also goes side by side when the phone is half-folded; JS can't read the fold in 1.3, so that part waits for a native build. Settled in the map's own round.

### The map, picked: round 3 (owner, 2026-11-15)

Round 2 beat round 1 with every critic (6.4 against 4.8; benchmark 7.4, beaten on colour); round 3, round 2 with the critics' fixes, beat round 2 with all five.

| Piece | Upright 669 × 951 | Sideways 951 × 669 (rail 84 on the right) |
|---|---|---|
| Map | The whole window under the status bar, down to the tab bar; its padding set to the panel (react-native-maps `mapPadding`, left 392) so the chosen place centres in the open part | Same, to the rail |
| Top fade | 96 pt under the status bar, the panel colour at 85% to clear | None (the status bar is in the rail) |
| Search | Its own card, 360 × 56, corner 16, at 16 from the left and 60 from the top; the filter button 40 square, corner 10, `soft` fill | Same, 16 from the top |
| Panel | 360 wide, corner 20, 12 under the search card. Its height follows its rows and ends on a whole row, at least 16 above the tab bar | Same |
| Place card | Name 22 bold; "category · town · distance" 15 `text2`; Add to Trip and Details half each, 46 tall, corner 12; Get Directions full width under them, 10 apart | Same |
| Divider | Inset 16 each side, as the phone's `nearbySep` | Same |
| Nearby | Heading 19 bold. Rows at least 48 tall: the map pin's own icon (white 28 pt disc, 2 pt ring in the category colour, 15 pt icon), the name 16 medium up to 2 lines, the distance 15 `text2`, the chevron. As many of the nearest as fit (the phone lists 3) | Same |
| Chosen pin | The phone's selected marker, clear of the "you are here" dot | Same |
| Locate, layers | Top right, 52 wide, 16 from the edge, level with the search card | Same, 16 from the rail |
| Tab bar | As on the phone | As on the phone, stopping at the rail |

Not taken up: in dark the white icon discs are the panel's brightest thing (one critic); they stay white like the map's pins.

### The guide, picked: round 3 (owner, 2026-11-15)

Round 3 beat round 2 with all five critics and tied the benchmark (6.8 each), beating it on colour and on fitting the phone app. Two changes of behaviour on the Duo only, at the owner's go: the list beside the section (a tap shows the section on the right, where the phone opens a page), and the region as a picker in place of the phone's tab strip.

| Piece | Upright 669 × 951 | Sideways 951 × 669 (rail 84 on the right) |
|---|---|---|
| Split | 40/60: the list 268, the section 401 (about 50 characters a line) | 40/60: 347 and 520 |
| Left, tinted | The trip's band; 20 pt sides. A 44 pt row: the phone article's bare back chevron (26, its stroke on the 20 pt edge), "Guide" 22 bold | Same |
| Region picker | Under "Guide", 8 pt down: a pill 40 tall, corner 12, 14 pt in on the left and 12 on the right; the region 17 semibold and an 18 pt down chevron. **Light: solid `accent` (`#095C65`), white words. Dark: the raised colour (`elev`, `#1A4247`) with a 1 pt `border` edge, words in `selected`** (owner: B in light, A in dark). The pill hugs its name up to the column's width; a longer name takes two lines (line 21) and the pill grows, the chevron at its right end, centred: "Canterbury & Christchurch", the longest, takes two upright. Opens the regions as a pop-up, the sheets' centred card | Same; "Canterbury & Christchurch" fits one line |
| Sections | 16 pt under the picker. Rows 2 pt apart, padding 8/12: the app's icon tile (40, corner 10, its category tint), the name 16 semibold up to 2 lines. No chevrons, no lines | Same |
| Chosen section | Explore's fill (`rgba(9,92,101,.16)` / `rgba(127,208,214,.18)`), corner 12, reaching 12 into the margins; its name in `selected`; its tile on white (dark: `elev`) | Same |
| Right | The phone's article: title 26/31 bold, its middle level with "Guide"'s; text 16/25; subheadings 20; web addresses in the highlight. The first section opens with the guide | Same |
| Tab bar | As on the phone (Profile lit) | As on the phone, stopping at the rail |

The pill was judged after the pick: all five critics preferred round 3's plain picker (7.3, the benchmark 7.2, the pill 6.4): the solid pill is the loudest thing on the screen and sits on the teal chosen row. The owner kept B in light and A in dark (2026-11-15).

Not taken up: "Guide" and the section title side by side at nearly one size (two critics; the trip's two titles stood); the space under the list; the split not on the fold (upright the fold runs across; sideways, a simulator check).

### Profile, picked: round 2 of A with the right side up 14 pt (owner, 2026-11-15)

Drawn from the code (no capture). Round 1: A (the guide card on the left) against B (the banner across the top, the groups in two columns under it): A 5.6, B 5.4, the benchmark 7.0; the owner took A. Round 2 rebalanced it, with Saved Places kept on the right (owner), and beat round 1 with four of five critics (5.8 against 5.2; the benchmark 7.4), beating the benchmark on colour (7 to 5).

| Piece | Upright 669 × 951 | Sideways 951 × 669 (rail 84 on the right) |
|---|---|---|
| Page | White from the clock down, so the status bar is dark. 40/60 with a hairline between: left 268, right 400 | 40/60: 347 and 519 |
| Left | The guide banner as a card: `accentWarm` (`#063F45` / `#0B4B52`), 20 pt from the edges and 56 from the top, corner 20, padding 24; the headline 28/33, weight 800, white (three lines; the phone's 32 made four), and the phone's Open Guide button (52 tall, the card's width). Then the phone's groups: who you are and Sign Out (the email shrinking to fit, as on the phone), My Trip, Show me around, Map for no signal | Same, 16 from the top; the headline on two lines |
| Right | Saved Places, the email switch, Account (Delete), Photo credits and the legal links. "Saved Places" (the first group name) level with the card's top | Same |
| Balance | The two sides end within about 60 pt of each other (round 1 left a 200 pt hole at the bottom left) | Same |
| Groups | The phone's: 8 pt bands between groups, 48 pt rows, names 13/600 `textMuted`, 20 pt sides | Same |
| Tab bar | As on the phone (Profile lit) | As on the phone, stopping at the rail |

Not taken up: the guide card leads and Delete Account in red is the next loudest (three critics; the owner's banner and the red-deletes rule); three button styles and a flat type scale (two; the phone's own pieces); Sign Out and Delete Account on different sides (one).

### Explore with the place, picked: 1.3.1 round 5 (owner, 2026-11-17)

For 1.3.1, open Duo only; it replaces "Explore, picked: round 6" there. Five rounds, drawings on the [1.3.1 mocks page](https://claude.ai/artifact/6NR3pWF54NL36rgoNvfZhX). Round 2 beat the benchmark 7.2 to 6.2 and 1.3's two screens 7.4 to 6.2; round 5 beat round 4 with all five critics (7.4 to 6.6). Build plan: `docs/plans/duo-131.md`.

| Piece | Value |
|---|---|
| Split | Upright 268 list, 401 place. Sideways 347 list, 520 place (867 content; the rail is outside it). Hairline between. The list side is on `band`; the place side on `page`. |
| Top | Town's line top at 53 upright, at the 32 pt wide top sideways (`wideTop`). The place's photo card top is 8 below the town's line top (61 and 40). |
| Head, both orientations | Line 1: the town, 26/800 `townInk`, the picker chevron as in 1.3 (short name, step-down sizing). Line 2, 8 under: the category pill on the left; guide, search and saved icons on the right, 22 pt glyphs in 44 pt taps, 4 apart, last glyph on the 20 pt edge. Rows start 16 under line 2. |
| Category pill | 40 tall, corner 12, padding 14 left and 12 right, 8 before an 18 pt chevron. Shows "All" (17 semibold) when nothing is filtered, otherwise the category's map-pin icon (`CATEGORY_CONFIG`, 20 pt, stroke 2) and no name. Light: fill `rgba(9,92,101,.12)`, 1.5 pt `#095C65` edge, content `#095C65`. Dark: fill `#1A4247`, 1.5 pt `rgba(127,208,214,.55)`, content `#7FD0D6`. Accessibility label names the category. Hidden when the town has one category. |
| Category pop-up | A centred card 520 wide, corner 20, the sheets' shadow and × disc, no title (as the guide's region picker). Rows 48 tall, 17/500: a 20 pt icon in a 22 pt slot, 14 before the name, in the pin's colour; "All" uses lucide `layout-grid` in `text2`. The chosen row is ticked, `highlight`, semibold. |
| Row | Padding 8 top and bottom, 14 left, 6 right. Photo 48 square, corner 10, hairline, 8 before the words. Name 16/21 semibold, up to 2 lines. Under it "category · distance", 15/20 `text2`. Minimum height 48. |
| Chosen row | Fill corner 12 reaching 12 into the margins. Light `selFill` `rgba(9,92,101,.16)`; dark `rgba(127,208,214,.30)` with a 1 pt `rgba(127,208,214,.55)` inner edge. A bar 4 wide, corner 2, 4 in from the fill's left edge, 8 in from top and bottom: `selected` in light, `#7FD0D6` in dark. The name in `selected`. |
| List foot | A 40 pt fade to `band` above the tab bar. |
| Place pane | Photo as a rounded card: 20 from the pane's sides, 240 tall upright and 140 sideways, corner 20, the credit on it as on the place screen. Under it, 22 down (16 sideways), one column in the phone's order: name, facts line, the four quick actions, description, Good to know, Local tip, reviews. No back button, no teal bar on scroll, no parallax. |
| Add to Trip | Pinned to the pane's foot, 12 above and below, 20 at the sides, with the 36 pt fade above it that 1.3's upright place has. |
| Known, left as drawn | The description can be cut above Add to Trip (the fade covers it) and the last row sits under the list's fade. |

### Profile two-pane, picked: 1.3.1 round 5 (owner, 2026-11-17)

For 1.3.1, open Duo only; it replaces "Profile, picked: round 2 of A" there. The owner's pick over the critics: round 4 beat round 5 with four of five (7.0 to 6.6), and 1.3's Profile beat round 4 with three of five (6.5 to 5.9), mostly on the left column overflowing. Saved Places and Photo credits on the right are round 2's.

| Piece | Value |
|---|---|
| Split | Upright 268 and 400, sideways 347 and 519, hairline between, as 1.3. |
| Left, signed in, in order | Who you are (no gap above; top at 56 upright, the wide top sideways), Show me around, Map for no signal, My Trip, Saved Places, the email switch, Photo credits and the three legal rows, Account with Delete Account last. No guide card. |
| Left, guest, in order | The teal guide card with a **white** Open Guide button (`#FFFFFF`, words `#063F45`), Access, Show me around, Map for no signal, Photo credits and the legal rows. The phone keeps its orange button. |
| Left foot | The column scrolls; a 40 pt fade to `page` above the tab bar. |
| Right, the photo card | 20 from the pane's sides, top level with the left's top (56 upright, the wide top sideways), 20 above the tab bar, corner 20. A wash over the photo: `rgba(6,63,69,.38)` in light, `rgba(3,18,20,.62)` in dark. |
| Right, signed in, nothing picked | The guide card centred on the photo both ways: width the smaller of 350 and the photo's width less 40, padding 24, corner 20, `#063F45` (dark `#0B4B52`), shadow 0 12 32 at 28%. "Your guide to the South Island" 28/33 800 white, 16 under it the orange Open Guide button, 52 tall, full pill. Photo: `assets/guide-road.webp` (Decided 1). |
| Right, guest | A card centred on the Login photo (`assets/login.webp`) with the same wash: width the smaller of 380 and the photo's width less 40, padding 24, corner 20, `page`, the same shadow. "Sign In for More" 22/27 700; "Sign in to save places, plan trips and leave reviews." 16/22 `text2`; then the Login screen's form with "Create an account" as the teal outline button. |
| Right, Saved Places or Photo credits | No photo. A title row at the pane's top: the name 26/31 700, the count beside "Saved Places" 15/600 `muted`, and an × in a 44 pt tap on the right that goes back to the guide card. Saved Places: its category strip under the title, then the cards, one column with 190 photos upright, two columns with 130 photos sideways. Photo credits: its rows as on the phone. |
| Picked row | "View All Saved Places" and "Photo credits" take `selFill` with corner 12 while their pane is open. |

### Login, picked: round 5 with a hairline card edge in dark (owner, 2026-11-15)

Five rounds. The sweep's plan was "the photo beside the form", but a photo on one half and a white form on the other needs two status bar styles; iOS has one. So the photo fills the window and the form floats on a card. Round 5 beat round 3 with four of five critics (6.0 against 5.6; the benchmark 7.4) and beat the benchmark on colour (7 to 5).

| Piece | Upright 669 × 951 | Sideways 951 × 669 (rail 84 on the right) |
|---|---|---|
| Photo | The login photo (`assets/login.webp`, 1280 × 686) at 1.6×, Aoraki's peak 120 pt from the top, centred. A top shade under the status bar (110 pt, `#063F45` at 55% to clear). From 30 pt above the lake's edge, a fade to the brand teal `#063F45` (dark `#041416`): clear, then 55% at 70 pt, solid at 190 pt, ending behind the card | The left page (to the fold, 475), with the phone's scrim |
| Status bar | White over the photo everywhere | In the rail |
| Title | The phone's "Kiwi Guide" (44/48, weight 800) and tagline (20/500), white, on a soft local teal shade, 28 pt above the card | On the left page, centred |
| Card | 480 wide, centred, corner 20, padding 24, a soft shadow; 56 pt from the bottom, so its top sits at the fold and no box is on the crease. `card` colour (dark: `#0E2A2E` with a 1 pt `line` edge) | 360 wide, centred on the right page |
| Form | The phone's stacked AuthPanel: Email, Password, "Forgot password?" with 18 pt under it, Sign In (orange, 52), **"Create an account" as a teal outline button (52)** (an opt-in variant of the engine's AuthPanel), "Continue as guest" a plain link | Same |
| Dark | The photo dimmed (brightness .68), the card on the deep teal `card` colour, not the page's near-black | Same |
| Tab bar | None, as on the phone | None |

Not taken up: a phone-width form with photo either side (three critics, "acceptable" for a form); the boxes' edges 1.83:1, measured (the phone's `border` colour: a phone fix, not 1.3); "Sign In" in Title Case beside sentence-case links (the engine's words).

### The tour and the error screen, picked: round 2 with two tour tweaks (owner, 2026-11-15)

Drawn from the code (lib/tour, app/_layout.tsx's ErrorBoundary). Round 2 beat round 1 with all five critics on both: the tour 6.1 against 4.2, the error screen 6.9 against 5.6 (the benchmark 7.4); the error screen beat the benchmark on colour (8 to 7).

| Piece | Upright 669 × 951 | Sideways 951 × 669 (rail 84 on the right) |
|---|---|---|
| Tour card | The phone's card (corner 20, title 20/25, body 15/21, dots, Skip Tour in teal under them, Next orange with 12 corners, the pointer), **360 wide** (the phone's width-less-12-a-side would be 645) | Same |
| Placing | A target in Explore's left band: the card to its right, over the places, its left and top lined up with the place column, the pointer on the card's left edge at the target's middle; the band stays in view. Any other target: below it if it fits, else above, the pointer over its middle. Welcome (no target): centred across, its foot 24 above the fold | Same; Welcome centred |
| Cut-out | The phone's dim (`rgba(3,38,43,.82)`) and cut-out (corner 12), **hugging the target's words** (for the town, the name and its chevron, not the wider button), with a **2 pt ring in `selected`** (lifted in dark) so the lit part reads in both modes | Same |
| Error screen | The phone's group (88 pt pale red circle, the red sign, title 22, message 16, Restart App 52 tall). The sign and words just above the fold, the button just below, 32 apart; the button 320 wide | The sign and words on the left page, the button on the right, both centred; as Login |

Not taken up: the teal dim (the phone's), the red sign by the orange button (the phone's picked error screen), the wording (the owner's rule), the ring and Skip Tour in teal beside the orange Next (one critic).

### The pop-up sheets, picked: round 2 with two spacing fixes (owner, 2026-11-15)

Drawn from the phone captures (14 Nov). Round 2 beat round 1 with all five critics on both sheets judged: Add to Trip 6.7 against 5.8, Choose a town 6.5 against 5.1 (the benchmark 7.4); both beat the benchmark on colour (7 to 5) and fit the phone app 4 of 5. This settles the last screen of the Duo sweep.

| Piece | Upright 669 × 951 | Sideways 951 × 669 (rail 84 on the right) |
|---|---|---|
| Card | Step 0's rule: a centred card, **520 wide**, every corner 20, a soft shadow (0 20 60, black 30%), over the phone's dim (`dim`). The sheet colour (dark: `#0E2A2E` with a 1 pt `#567F84` edge). The phone sheet's contents in its order; the title 22/27 bold and the phone's pale 32 pt × disc | Centred across the window |
| Placing | A card taller than half the window is centred on the fold (Add to Trip). A long list (Choose a town, New Trip) is up to 760 tall from 96 pt down and scrolls inside, cut through a row (never a region band) under a 56 pt fade, so it reads as scrolling. A short dialog ("Are you absolutely sure?") is 400 wide, its foot 24 above the fold | Centred |
| Add to Trip | The Day row kept inside the 24 pt margin, fading at the margin as the phone cuts it; labels 22 above and 10 under; **32 above Add**, as between the groups | Same |
| Choose a town | The phone's region bands and rows; the town Explore shows ticked, orange and semibold | Same |

Not taken up for 1.3: "Full" and "No room" look as tappable as open slots (four critics; the phone's picked sheet, so a phone change); the centred stepper; orange for the chosen town where Add to Trip selects in teal; the counts far from the names in a 520 card (the phone's pieces).

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
