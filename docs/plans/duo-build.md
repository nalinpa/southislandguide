# Duo Wide Layouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ten wide layouts the owner picked in the Duo sweep, so the open iPhone Duo (669 × 951 upright, 951 × 669 sideways) gets them, while every phone, the folded Duo and Split View stay exactly as they are.

**Architecture:** One hook, `useWide()` (window ≥ 600 pt), switches styles and arrangement inside the same components. It lives in the engine's UI kit, `@blacksands/ui` (owner, 2026-11-15). That package already holds the React Native pieces, and `@blacksands/components` depends on it. `@blacksands/hooks` is data-only and has no React Native. Each screen keeps its components and keys; on wide it lays the same pieces side by side. Pieces the app owns (top bar, tab strips, list cards, sheets) get wide styles in the app. Engine pieces get opt-in props that the app passes `useWide()` into. Every engine change waits for a renewed `GITHUB_TOKEN` and the owner's publish, so Task 1, and with it the whole build, starts once the token is renewed.

**Tech Stack:** Expo SDK 58, React Native 0.88, expo-router 58, react-native-maps 1.29, @gorhom/bottom-sheet 5.2, Jest (jest-expo) with @testing-library/react-native, engine `@blacksands/{ui,components,hooks}`.

**Spec:** `docs/plans/design-sweep.md`, section "## Wide". Each screen has a "picked" table there with its values; this plan points to those tables and doesn't repeat every number. Where a picked table and the Step 0 table at the top of "## Wide" disagree (Explore, Place), the picked table wins. Drawings: the [Duo progress page](https://claude.ai/artifact/5UiSmztCK67BT9KTvULvWb). Ground rules: `prompts/duo-sweep.md`, "Hard rules".

## Global Constraints

- **Breakpoint:** `useWide()` is true when the window is 600 pt wide or more. Folded (466), Split View (469) and every iPhone stay on the phone layout.
- **Nothing moves on a phone.** Every existing test passes unchanged. The phone screens are unchanged on the owner's phone.
- **Same components on every width.** Only styles and arrangement switch. Never change a React `key` on the breakpoint, so folding mid-screen keeps state and scroll position.
- **Over the air within runtime `a0bdc768…`.** No new native package, no config plugin. Check with `npx expo-updates runtimeversion:resolve --platform ios` at the end of every task.
- **Engine first.** A wide variant of an engine piece is an opt-in prop in `@blacksands/*`, source in `C:\Users\User\source\enginev1\<package>`. Don't copy engine code into the app. The owner publishes; installing needs a renewed `GITHUB_TOKEN` (`TASKS.md`, it has expired).
- **Behaviour changes the owner allowed (Duo only):**
  - The trip shows the list and the day together, with no Trip | Days switch.
  - The guide's list sits beside its section, and its region is a picker instead of tabs.
  - The map lists as many Nearby places as fit (the phone lists 3).

  Nothing else changes what a tap does.
- **Words on screen stay:** Trip/Trips, place, Profile. No new copy except what the picked tables give.
- **Light and dark:** every wide style takes its colours from `tokens.colors` through `pair()`. Text is no smaller than the phone's, and contrast is at least 4.5:1.
- **Status bar:** a wide screen with a white or tinted top uses the dark status bar (Explore, the trip, the guide, Profile). Screens with a photo or teal top keep the light one (the place, Login).
- **Commits:** one per task on `1.3`, only once the owner has said commits are on. No push. PowerShell for npm, npx and eas.

## Review Focus

1. **Folding or unfolding mid-screen** (the width crosses 600 while a screen is open) keeps the screen's state: the chosen day, the chosen guide section, the scroll position and any open sheet. Pinned by a "keeps state across the breakpoint" test in Tasks 4, 6 and 8.
2. **The edges of the breakpoint:** 469 (Split View) and 599 are phone, 600 is wide, and sideways 951 with an 84 pt rail is wide. Pinned in Task 1.
3. **Long names on wide:**
   - Town: "Aoraki / Mount Cook" takes two lines and shrinks, with the chevron on the last word.
   - Region: "Canterbury & Christchurch" makes the picker pill take two lines.
   - Place names take up to 2 lines.

   Pinned in Tasks 3 and 8.
4. **Empty and guest states on wide:**
   - A guest's Profile has no trip, saved places, email switch or Account.
   - The trip with no trip, and with the guest sample.
   - A guide region with no sections.
   - A Nearby list that's empty.

   Pinned in Tasks 5, 6, 7, 8 and 9.
5. **Deep links on wide:** `/guide/[slug]` opens the list with that section chosen. The place route never shows the tab bar. Pinned in Task 8.

## Open questions for the owner (before the task that needs the answer)

1. **Explore, Task 3:** the picked design shows the search button, but not where the search field opens. On the phone it opens inside the teal bar, and the Duo has no bar. Proposal: the field opens at the top of the places column, over the first card.
2. ~~Where `useWide()` lives~~ **Decided (owner):** in the engine, `@blacksands/ui`. It goes out as 0.7.2, a patch, so it stays inside `@blacksands/components`' peer range (`^0.5.0 || ^0.6.0 || ^0.7.0`). A 0.8.0 would need that range widened first.
3. **Engine first (owner):** all the engine work (Task 1's engine steps and Task 12's engine steps) is one job, done before the app tasks: `C:\Users\User\source\enginev1\duo-wide-engine-task-prompt.md`. It ends with `@blacksands/ui` 0.7.2 and `@blacksands/components` 0.13.0 committed in the engine repos. The owner renews `GITHUB_TOKEN` and publishes both. The app tasks start from there.

---

## File Structure

| File | Responsibility |
|---|---|
| `enginev1/ui/src/useWide.ts` (new), `enginev1/ui/src/index.ts` | `WIDE_MIN`, `useWide()`, `useHalves()`, exported from `@blacksands/ui` 0.7.2 |
| `lib/ui/useWideSheet.ts` (new) | The centred-card styles every app sheet and dialog takes when wide |
| `lib/ui/tokens.ts` | Adds `selFill` and `selEdgeDark` |
| `test/wideMock.js` (new) | A global mock of `@blacksands/ui`'s `useWide` and `useHalves`, false by default, with `__setWide(bool)` for wide tests |
| `jest.config.js` | Adds `test/wideMock.js` to `setupFiles` |
| `components/sites/AreaSheet.tsx`, `components/itinerary/{AddToTripModal,CreateItineraryModal,EditItemModal,DeleteTripModal,NoteCard,PremiumFeatureModal}.tsx`, `components/account/{DangerZoneCard,OfflineMapCard}.tsx` | Wide sheet and dialog styles (Task 2) |
| `app/(app)/(tabs)/sites/index.tsx`, `components/sites/list/{ListView,ListItem}.tsx`, new `components/sites/ExploreSide.tsx` | Explore wide (Task 3) |
| `app/(app)/(tabs)/sites/[siteId]/index.tsx`, `components/sites/detail/Hero.tsx` | The place wide (Task 4) |
| `components/itinerary/{ItineraryDetailView,TripOverview}.tsx` | The trip wide (Task 5) |
| `app/(app)/(tabs)/map/index.tsx`, `components/map/{MapOverlay,SitesMapView}.tsx`, new `components/map/MapPanel.tsx` | The map wide (Task 6) |
| `app/(app)/(tabs)/guide/{index,[slug]}.tsx`, new `components/guide/{GuideArticle,GuideList,RegionSheet}.tsx` | The guide wide (Task 7, 8) |
| `app/(app)/(tabs)/account.tsx` | Profile wide (Task 9) |
| `app/(auth)/login.tsx` | Login wide (Task 10) |
| `lib/tour/SpotlightOverlay.tsx`, `app/_layout.tsx` (ErrorBoundary) | The tour and the error screen (Task 11) |
| `enginev1/components/src/{AuthPanel,TripChoiceSheet,ReviewModal,TimelineBlock}.tsx` | Engine opt-in props (Task 12) |

---

### Task 1: The switch in the engine, the test mock and the tokens

**Files:**
- Engine (`C:\Users\User\source\enginev1\ui`):
  - Create: `src/useWide.ts`, and its test in the package's test folder
  - Modify: `src/index.ts` (export it), `package.json` (0.7.2)
- App:
  - Create: `test/wideMock.js`
  - Modify: `jest.config.js` (setupFiles), `lib/ui/tokens.ts` (two colours), `package.json` (`@blacksands/ui` ^0.7.2)

**Interfaces:**
- Produces, from `@blacksands/ui`:
  - `export const WIDE_MIN = 600`
  - `export function useWide(): boolean`
  - `export function useHalves(): { width: number; height: number; foldX: number; foldY: number; upright: boolean }`, where `foldX = width / 2`, `foldY = height / 2` and `upright = height > width`. The fold is inferred, not confirmed, so it's the window's middle.
- Produces, in the app:
  - `tokens.colors.selFill = pair("rgba(9,92,101,0.16)", "rgba(127,208,214,0.30)")`
  - `tokens.colors.selEdgeDark = pair("transparent", "rgba(127,208,214,0.55)")`
  - Jest: `require("@blacksands/ui").__setWide(true | false)`, reset to false before each test.
  - App code imports `useWide` and `useHalves` from `@blacksands/ui` directly. `lib/uiKit.ts` builds themed pieces, and this hook needs no theme.

Steps 1 to 4 are the engine prompt's part 1 (`enginev1/duo-wide-engine-task-prompt.md`), done before this plan's app tasks. The engine tests the pure `isWide()` and `halves()` the hooks wrap.

- [ ] **Step 1 (engine): Write the failing tests**, on `isWide` and `halves`:
  - `phone widths are not wide`: 393, 466 and 469 give `false`.
  - `599 is not wide, 600 is`.
  - `the open Duo is wide both ways`: 669 × 951 gives true with `upright` true; 951 × 669 gives true with `upright` false and `foldX` 475.5.
- [ ] **Step 2 (engine): Run** `npm test` in `enginev1/ui`. Expected: FAIL, not exported.
- [ ] **Step 3 (engine): Implement** `useWide()` and `useHalves()` from `useWindowDimensions()`. Export both and `WIDE_MIN` from `src/index.ts`. Bump to 0.7.2. Run `npm test`, `npm run typecheck` and `npm run build`. Expected: PASS. Commit in the engine repo: `feat: useWide and useHalves for wide windows`.
- [ ] **Step 4 (owner):** renew `GITHUB_TOKEN` and publish `@blacksands/ui` 0.7.2.
- [ ] **Step 5 (app):** `npm install @blacksands/ui@0.7.2` (PowerShell).
- [ ] **Step 6 (app): Add the global mock.** `test/wideMock.js` mocks `@blacksands/ui` as `jest.requireActual` plus:
  - `useWide()`, read from a module-level flag;
  - `useHalves()`, as 750 × 1334 (Jest's window);
  - `__setWide`;
  - a `beforeEach` that resets the flag.

  It goes in `setupFiles` in `jest.config.js`.
- [ ] **Step 7 (app): Add the two tokens** to `lib/ui/tokens.ts` beside `selected`.
- [ ] **Step 8 (app): Run** `npm test` and `npm run typecheck`. Expected: all pass, including every existing test, unchanged. `npx expo-updates runtimeversion:resolve --platform ios` still gives `a0bdc768…` (a JS-only package).
- [ ] **Step 9: Commit** `feat(duo): useWide from the engine, test mock, selection fill`

### Task 2: Sheets and dialogs as centred cards

**Files:**
- Create: `lib/ui/useWideSheet.ts`, `lib/ui/__tests__/useWideSheet.test.ts`
- Modify, in each sheet or dialog's overlay and card styles:
  - `components/sites/AreaSheet.tsx:48,101-108`
  - `components/itinerary/AddToTripModal.tsx:220,395-407`
  - `components/itinerary/CreateItineraryModal.tsx:229,521-533`
  - `components/itinerary/EditItemModal.tsx:132,256-269`
  - `components/itinerary/DeleteTripModal.tsx:19,45-46`
  - `components/itinerary/NoteCard.tsx:22,46-48`
  - `components/itinerary/PremiumFeatureModal.tsx:44,72-74`
  - `components/account/DangerZoneCard.tsx:72,138-139`
  - `components/account/OfflineMapCard.tsx:92,209-210`
- Test: one wide test per sheet in its existing `__tests__` file, plus `useWideSheet.test.ts`

**Interfaces:**
- Consumes: `useWide`, `useHalves` (Task 1)
- Produces: `export function useWideSheet(kind: "sheet" | "list" | "dialog"): { overlay: ViewStyle; card: ViewStyle; animation: "fade" | "slide" } | null`. It returns null on a phone, so callers keep their styles.
  - `sheet` and `list`: `card.width` 520, every corner 20, centred, the card shadow (0 20 60, black 30%), a 1 pt `darkEdge` in dark.
  - `list` also sets `maxHeight` 760.
  - `dialog`: `card.width` 400, its foot 24 above `foldY` when upright, centred sideways.
  - `animation` is `"fade"` when wide.

- [ ] **Step 1: Write the failing tests:**
  - `useWideSheet: null on a phone`.
  - `useWideSheet: sheet is 520 and centred, list caps at 760, dialog is 400 with its foot above the fold`.
  - In `areaSheet.test.tsx`, `wide: a centred 520 card that ends on a part row under the fade`: assert the card style width is 520 and the `area-sheet-fade` testID is present.
  - In `addToTripModal.test.tsx`, `wide: Day row inside the margin, 32 above Add`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** `useWideSheet` and apply it to each file: spread `overlay` and `card` over the existing styles when not null, and pass `animationType`. Wide-only additions, per "The pop-up sheets, picked":
  - **AddToTripModal:** labels 22 above and 10 under, 32 above Add, and the Day row stopping at the 24 pt margin under a fade.
  - **AreaSheet:** a 56 pt fade (`area-sheet-fade`), and the chosen town semibold.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: PASS, with the phone tests unchanged.
- [ ] **Step 5: Commit** `feat(duo): sheets and dialogs as centred cards`

### Task 3: Explore

**Spec:** "Explore, picked: round 6" plus the Explore exceptions under "## Wide".

**Files:**
- Create: `components/sites/ExploreSide.tsx` (the left band: town, buttons, categories) and its test
- Modify:
  - `app/(app)/(tabs)/sites/index.tsx`: TopBar at 223-282 and the tabs at 284-296 render only when not wide; on wide, the row of `ExploreSide` and the list.
  - `components/sites/list/ListView.tsx`: `numColumns` and side padding on wide.
  - `components/sites/list/ListItem.tsx`: name 18 bold up to 2 lines, photo 190 upright or 130 in two columns; the featured card like the others on wide.

**Interfaces:**
- Consumes: `useWide`, `useHalves`, `tokens.colors.selFill`
- Produces:
  - `ExploreSide({ town: string; onPickTown(): void; onGuide(): void; onSearch(): void; onSaved(): void; categories: { key: string | null; label: string }[]; selected: string | null; onSelect(key: string | null): void })`. It registers the tour targets `town` (on the name-and-chevron text, not the whole button), `guide` and `browse`.
  - `export const EXPLORE_SIDE = 200`, the band's width, which Task 11 uses to place the tour card.

- [ ] **Step 1: Write the failing tests** in `app/(app)/(tabs)/sites/__tests__/`:
  - `wide: no teal bar, the side band holds the town, the three buttons and the categories`.
  - `wide: a long town shrinks to two lines with the chevron on the last word`: "Aoraki / Mount Cook" gets `numberOfLines 2` and `adjustsFontSizeToFit`, with `minimumFontScale` 22/26.
  - `wide: upright one column (photo 190), sideways two columns (photo 130)`.
  - `wide: the featured card looks like the others`.
  - `wide: dark status bar, not LightStatusBar`.
  - `wide: tour targets town, guide, browse and place still register`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** to the picked table:
  - side 200, band `band`, 20 sides;
  - town 26/800 in `pair("#063F45", "#EEF6F3")`;
  - bare 22 pt icons with 44 taps, 4 apart;
  - category rows 40 tall, the selected one in `selFill`, corner 10, reaching 12 into the margin, 8 from both edges.

  Search follows the owner's answer to Open question 1.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(duo): Explore wide`

### Task 4: The place

**Spec:** "The place, picked: round 3 A".

**Files:**
- Modify: `app/(app)/(tabs)/sites/[siteId]/index.tsx` (render 184-405, styles 515-614), `components/sites/detail/Hero.tsx`
- Test: `app/(app)/(tabs)/sites/[siteId]/__tests__/` (the existing place test file)

**Interfaces:** Consumes `useWide`, `useHalves`. Produces nothing new.

- [ ] **Step 1: Write the failing tests:**
  - `wide upright: photo a third of the height, sheet from 300, left column 361 (name, facts, buttons, description) and right column 244 (Good to know, tip, reviews)`.
  - `wide upright: Add to Trip full width with a 36 pt fade`.
  - `wide: no tab bar, as on the phone`.
  - `wide sideways: photo is the left page to the fold, words one column on the right page`.
  - `keeps state across the breakpoint`: the open review sheet stays open and the scroll position holds when `__setWide` flips.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** The right column starts level with the four buttons, with no hairline after its last item. Back, clock and credit sit on the 20 pt margins. There's no tab bar, as on the phone.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(duo): the place wide`

### Task 5: The trip (and the Trips tab)

**Spec:** "The trip, picked: round 7 with softer times". This is the owner's behaviour change: no Trip | Days switch on wide.

**Files:**
- Modify:
  - `components/itinerary/ItineraryDetailView.tsx`: the switch at 782-792 only when not wide. On wide, a row of the trip list (left, tinted) and the selected day's timeline (right).
  - `components/itinerary/TripOverview.tsx`: day rows with a 56 photo, selected fill and × disc.
- Test: `components/itinerary/__tests__/itineraryDetailView.test.tsx`

**Interfaces:**
- Consumes: `useWide`, `useHalves`, `selFill`, `selEdgeDark`
- Produces: `TripOverview` gains `selectedDay?: number` and `onSelectDay?(n: number): void` (unused on a phone).

- [ ] **Step 1: Write the failing tests:**
  - `wide: list and day together, no Trip | Days switch`.
  - `wide: a tap on a day shows it on the right; the phone still switches to Days`.
  - `wide: upright half each, sideways 347 and 520`.
  - `wide: the opening day is the first day`.
  - `keeps state across the breakpoint`: the selected day survives `__setWide` flipping.
  - `wide: guest sample and no-trip states render beside an empty right side`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** to the picked table:
  - trip name 22, dates 14, ⋯ menu;
  - day rows: photo 56, "Day N · date" 13, route 15 bold (`routeLine` keeps an arrow starting a line), 13 details;
  - heading: date 14, route 22;
  - hour column 56 on the 16 pt edge, stops from 64 to 16;
  - drives on the stops' lines.

  The stop insides (icon 24, padding 12, grip 18, time 13 medium at 90% white) come from `TimelineBlock`'s `wide` prop (engine 0.13.0); pass `wide={wide}`.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(duo): the trip wide`

### Task 6: The map

**Spec:** "The map, picked: round 3". The owner allowed a change: Nearby lists as many as fit.

**Files:**
- Create: `components/map/MapPanel.tsx`, the left panel holding the place card and Nearby (the sheet's own pieces)
- Modify:
  - `components/map/MapOverlay.tsx`: the gorhom sheet only when not wide.
  - `app/(app)/(tabs)/map/index.tsx`: wide layout of the search card, panel, locate and layers, and the top fade.
  - `components/map/SitesMapView.tsx`: `mapPadding={{ left: 392, top: 0, right: 0, bottom: 0 }}` on wide.
  - `app/(app)/(tabs)/map/index.tsx:245-256`: the Nearby `slice(0, 3)` becomes `slice(0, wide ? 10 : 3)`; the panel shows the rows that fit.
- Test: `components/map/__tests__/mapOverlay.test.tsx`, new `mapPanel.test.tsx`

**Interfaces:**
- Consumes: `useWide`
- Produces: `MapPanel({ site, nearby, onSelectSite, onAddToTrip, onDetails, onDirections })`, with the same props `MapOverlay` passes to its sheet pieces.

- [ ] **Step 1: Write the failing tests:**
  - `wide: no bottom sheet; a 360 panel at 16 from the left, 12 under the search card`.
  - `wide: Nearby rows show the map pin's own icon (28 white disc, 2 pt ring in the category colour)`.
  - `wide: the panel ends on a whole row, at least 16 above the tab bar`.
  - `wide: mapPadding left 392`.
  - `wide: an empty Nearby shows the place card alone`.
  - `keeps state across the breakpoint`: the chosen place stays chosen.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** to the picked table:
  - search card 360 × 56, corner 16;
  - name 22 bold, Add to Trip and Details half each at 46;
  - the divider inset 16;
  - Nearby heading 19 bold, rows at least 48, names up to 2 lines;
  - the top fade at 96 pt.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(duo): the map wide`

### Task 7: The guide's region picker

**Spec:** "The guide, picked: round 3", the picker rows (B in light, A in dark, long names on two lines).

**Files:**
- Create: `components/guide/RegionSheet.tsx`, the regions list as a `list` sheet via `useWideSheet` from Task 2 (South Island plus each region with sections, current one ticked), and its test

**Interfaces:**
- Consumes: `useWideSheet` (Task 2), `REGIONS_WITH_CONTENT` from `lib/guideContent`
- Produces: `RegionSheet({ visible: boolean; selected: RegionId | null; onSelect(r: RegionId | null): void; onClose(): void })`

- [ ] **Step 1: Write the failing test**, `regionSheet.test.tsx`: `lists South Island first, then each region with sections, the current one ticked; a tap selects and closes`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(duo): guide region picker`

### Task 8: The guide

**Spec:** "The guide, picked: round 3". The owner allowed list-detail on wide.

**Files:**
- Create:
  - `components/guide/GuideArticle.tsx`: the article body moved out of `[slug].tsx`, which keeps its back row and uses this component.
  - `components/guide/GuideList.tsx`: the section rows, with phone and wide styles.
- Modify:
  - `app/(app)/(tabs)/guide/index.tsx`: on wide, the side (back, "Guide", picker pill, `GuideList`) beside `GuideArticle`.
  - `app/(app)/(tabs)/guide/[slug].tsx`: on wide, renders the same split with that slug chosen.
- Test: `app/(app)/(tabs)/guide/__tests__/guide.test.tsx`

**Interfaces:**
- Consumes: `useWide`, `useHalves`, `selFill`, `RegionSheet` (Task 7)
- Produces:
  - `GuideArticle({ category: GuideCategory; titleTop?: number })`
  - `GuideList({ categories: GuideCategory[]; selectedSlug?: string; onSelect(slug: string): void; wide: boolean })`

- [ ] **Step 1: Write the failing tests:**
  - `wide: list beside the first section; a tap shows the section on the right without navigating`.
  - `wide: upright 268 and 401, sideways 347 and 520`.
  - `wide: the picker pill shows the region; "Canterbury & Christchurch" wraps to two lines`.
  - `wide: a region with no sections falls back to South Island`.
  - `wide: deep link /guide/[slug] opens the split with that section chosen`.
  - `phone: the list and the article are unchanged`.
  - `keeps state across the breakpoint`: the chosen section survives `__setWide` flipping.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** to the picked table:
  - picker pill 40 tall, corner 12, 17 semibold with an 18 chevron:
    - light: `#095C65` fill (the light `selected`), white words;
    - dark: `bgElevated` (`#1A4247`) fill, 1 pt `border`, `selected` words;
  - rows: tile 40, name 16 semibold up to 2 lines, no chevrons, 2 apart;
  - chosen row: `selFill`, its tile on `bgCard` (dark `bgElevated`);
  - the article title's middle level with "Guide";
  - dark status bar.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(duo): the guide wide`

### Task 9: Profile

**Spec:** "Profile, picked: round 2 of A with the right side up 14 pt".

**Files:**
- Modify: `app/(app)/(tabs)/account.tsx` (render 58-161). On wide, one ScrollView holding a row of two columns with a hairline between. The groups are the existing card components, rearranged, not copied.
- Test: `app/(app)/(tabs)/__tests__/account.test.tsx` (create if absent)

**Interfaces:** Consumes `useWide`, `useHalves`. Produces nothing new.

- [ ] **Step 1: Write the failing tests:**
  - `wide signed in: left holds the guide card, who you are, My Trip, Show me around, Map for no signal; right holds Saved Places, the email switch, Account, Photo credits and the legal links`.
  - `wide guest: left holds the guide card, Access, Show me around, Map; right holds Photo credits and the legal links`.
  - `wide: the guide card's headline is 28/33; dark status bar`.
  - `phone: unchanged`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** to the picked table:
  - 40/60: 268 and 400 upright, 347 and 519 sideways;
  - card at 20 from the edges, 56 from the top (16 sideways), corner 20, padding 24;
  - "Saved Places" level with the card's top (the right column 14 pt higher).
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(duo): Profile wide`

### Task 10: Login

**Spec:** "Login, picked: round 5 with a hairline card edge in dark".

**Files:**
- Modify: `app/(auth)/login.tsx`. On wide, the photo fills the window and the form panel becomes a card.
- Test: `app/(auth)/__tests__/login.test.tsx` (create if absent)

**Interfaces:** Consumes `useWide`, `useHalves`. Uses `AuthPanel`'s `createAccountStyle="outline"` once Task 12 lands; until then, its current links.

- [ ] **Step 1: Write the failing tests:**
  - `wide upright: photo fills the window (1.6×, Aoraki's peak 120 pt from the top), a 480 card, its top at the fold, 56 under it`.
  - `wide sideways: photo on the left page, 360 card centred on the right page`.
  - `wide dark: card on bgCard with a 1 pt line edge, photo dimmed`.
  - `phone: unchanged`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** to the picked table:
  - the photo positioned from its 1280 × 686 size: `left = width/2 − 672 × 1.6`, `top = 120 − 354 × 1.6`;
  - the top shade 110 pt;
  - the fade from 30 pt above the lake's edge (photo y 537), solid at 190 pt;
  - the title 44/48 with the tagline, 28 above the card.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(duo): Login wide`

### Task 11: The tour and the error screen

**Spec:** "The tour and the error screen, picked: round 2 with two tour tweaks".

**Files:**
- Modify: `lib/tour/SpotlightOverlay.tsx` (card position 84-101, styles 196-221), `app/_layout.tsx` (ErrorBoundary 96-128, styles 136-176)
- Test: `lib/tour/__tests__/SpotlightOverlay.test.tsx`, new `app/__tests__/errorBoundary.test.tsx`

**Interfaces:** Consumes `useWide`, `useHalves`, and the band width that Task 3's `ExploreSide` exports as `EXPLORE_SIDE = 200`.

- [ ] **Step 1: Write the failing tests:**
  - `wide: the card is 360 wide`.
  - `wide: a target in the left band puts the card to its right, at the place column's left and the target's top, pointer on its left edge`.
  - `wide: the cut-out has a 2 pt selected ring`.
  - `wide: welcome sits centred with its foot 24 above the fold`.
  - `phone: unchanged`.
  - Error boundary: `wide upright: words end 16 above the fold, the 320 button starts 16 below`, and `wide sideways: words on the left page, button on the right`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(duo): tour and error screen wide`

### Task 12: Use the engine's wide variants

The engine half is done first, by `C:\Users\User\source\enginev1\duo-wide-engine-task-prompt.md`, and published by the owner as `@blacksands/components` 0.13.0 (installed with Task 1's ui 0.7.2). Its props:
- `AuthPanel`: `createAccountStyle: "link" | "outline"`.
- `TripChoiceSheet` and `ReviewModal`: `wide: boolean`, and an optional `edge` in their colours.
- `TimelineBlock`: `wide: boolean`.

This task is what's left in the app, if Tasks 5 and 10 didn't already pass these.

- [ ] **Step 1: Write the failing app tests:**
  - `login: wide shows Create an account as an outline button`.
  - `place: the trip-choice and review sheets are centred cards when wide`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Pass the props:**
  - `login.tsx`: `createAccountStyle={wide ? "outline" : "link"}`.
  - The place page's `TripChoiceSheet` and `ReviewModal`: `wide={wide}`, with `colors.edge = pair("transparent", "#567F84")`.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(duo): engine wide variants in use`

### Task 13: Check it on the Duo

- [ ] **Step 1:** `npx expo-updates runtimeversion:resolve --platform ios`. Expected: `a0bdc768…`.
- [ ] **Step 2 (owner):** the simulator build and session from `prompts/duo-sweep.md`, "First simulator session, check". Capture every screen on `iphone`, `duo-closed` and `duo-open`. Check:
  - the phone and folded captures show no change;
  - the real sizes match 669 × 951;
  - the fold sits at the window's middle.

  If the sizes or the fold differ, stop and ask.
- [ ] **Step 3:** publish an update to the `development` branch for the owner's phone check (`npx eas-cli update --branch development --platform ios`), only on the owner's go.
