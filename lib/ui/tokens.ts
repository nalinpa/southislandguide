import { DynamicColorIOS, Platform } from "react-native";

// Dark mode follows the phone (docs/plans/design-sweep.md). A colour written as a pair is
// iOS's own two-sided colour: the system swaps it when the phone changes, so the style
// sheets that read it need no hook and no re-render.
// On since 2026-11-14, after the owner checked every screen in dark on the phone. Turned off,
// a pair is its light value, a plain string: the way back if a release needs light only.
// The rules dark mode follows are in docs/plans/design-sweep.md. A pair can't be glued into a string (`${c}66`) or
// measured for contrast: give those a fixed colour. A one-off see-through colour in a
// screen takes its own pair there, with the see-through-ness written into both sides.
export const DARK_READY = true;
export const pair =(light: string, dark: string): string =>
  DARK_READY && Platform.OS === "ios" ? (DynamicColorIOS({ light, dark }) as unknown as string) : light;

// For the app's own colours outside the palette (a category's): the same hue a third of the
// way to white. On the dark page the darkest of them (Culture's brown) was 1.9:1; lifted,
// every one is at least 4:1, on the page and on its own tint.
export const towardWhite = (hex: string): string =>
  "#" + [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(c + (255 - c) * 0.35).toString(16).padStart(2, "0");
  }).join("");
export const lifted = (hex: string): string => pair(hex, towardWhite(hex));

// Named here because both the palette and the hero button below use it.
const HIGHLIGHT = "#C2410C";

// The shadow that lifts a white card off the page. Don't pair it with
// overflow: "hidden" on the same view: iOS then clips the shadow away.
export const cardLift = {
  shadowColor: "#0A1F1B",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 14,
  elevation: 4,
} as const;

// A shadow shows nothing on a dark page, so a surface that only a shadow lifts (the map's
// floating controls, the tour's card) gets a hairline in dark: a view laid over it with
// this style and the surface's own corner radius. Over the surface, not a border on it,
// so it takes no room, and it's see-through in light: light is unchanged.
export const darkEdge = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  borderWidth: 1,
  borderColor: pair("transparent", "#567F84"),
} as const;

// The card colour's two sides, for a gradient (the map's top fade), which can't take a pair.
export const CARD_SIDES = { light: "#FFFFFF", dark: "#0E2A2E" } as const;

// The login photo's brand teal, light and dark, for its shade and lake fade (gradients can't take a pair).
export const LAKE_SIDES = { light: "#063F45", dark: "#041416" } as const;

// The login photo is dimmed in dark by a black layer (brightness .68), and its card has the
// `line` colour for an edge in dark, none in light.
export const photoDim = pair("rgba(0,0,0,0)", "rgba(0,0,0,0.32)");
// The pale band, both sides, for Explore's list fade (a gradient can't take a pair).
export const BAND_SIDES = { light: "#EEF3F1", dark: "#0C2A2E" } as const;
const LINE_SIDES = { light: "#CBD8D3", dark: "#2F5257" } as const;
export const cardEdge = pair("transparent", LINE_SIDES.dark);

// The raised colour in dark and the selected teal in light, named for the guide's region pill
// (solid teal in light, raised with an edge in dark) and the chosen section's tile.
const ELEV_DARK = "#1A4247";
const SELECTED_LIGHT = "#095C65";
const SELECTED_DARK = "#7FD0D6";
const BORDER_DARK = "#567F84";

export const tokens = {
  // A filled button is a screen's main action, so it's the highlight with a
  // white label, not the kit's default teal. Setting it here also reaches the
  // shared package's own buttons (Save Review, Create a Trip, the sign-in
  // card). "hero" is the same colour with a glow, for a button on a bare page.
  button: {
    primary: { bg: HIGHLIGHT, text: "#FFFFFF" },
    hero: { bg: HIGHLIGHT, text: "#FFFFFF" },
  },
  space: {
    xxs: 2,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28
  },
  radius: { sm: 10, md: 14, lg: 18 },
  border: { thin: 1, thick: 1 },
  tap: { min: 48, primary: 56 },
  colors: {
    // Pages are near-white and cards pure white so text stands out; the brand
    // mint (#D3ECE5) is now only the fill for chips and search bars. The app
    // icon's tile and the splash background are the accent colour.
    // lib/ui/__tests__/tokens.test.ts holds the contrast floors.
    // Dark: four steps of lift off the page, page < bgBase < bgCard < bgSurface < bgElevated.
    bgBase: pair("#EEF6F3", "#081D20"),
    bgSurface: pair("#E2F0EB", "#12363A"),
    bgCard: pair(CARD_SIDES.light, CARD_SIDES.dark),
    bgElevated: pair("#D3ECE5", ELEV_DARK),
    borderSubtle: pair("#CFE1DA", "#2F5257"),
    // Dark is a step lighter than drawn (#4C7479) to keep 3:1 on a card as well as the page.
    border: pair("#A9C6BC", BORDER_DARK),
    borderStrong: pair("#3D6B5F", "#8DB3A8"),
    // A fill with white on it. Dark is a mid teal: white on it 5.2:1, and 3.5:1 off the
    // page (the light teal there was 2.4:1). Teal words and icons are `selected`.
    accent: pair("#095C65", "#1A7882"),
    accentDim: pair("rgba(9,92,101,0.12)", "rgba(127,208,214,0.14)"),
    accentWarm: pair("#063F45", "#0B4B52"),
    // The design sweep's look (docs/plans/design-sweep.md), screen by screen: a white
    // page, a hairline round a photo so a pale sky doesn't melt into it, and one line
    // colour. `selected` marks the tab or category you're on: teal, with a line under it.
    page: pair("#FFFFFF", "#06191B"),
    line: pair(LINE_SIDES.light, LINE_SIDES.dark),
    // The pale band between groups of rows (Profile): a band means "new group", a line
    // "next row in the same group".
    band: pair(BAND_SIDES.light, BAND_SIDES.dark),
    // A drive on the Days view: a pale teal, so a fill there means "this can be dragged".
    driveFill: pair("#D9E9E4", "#173F45"),
    photoEdge: pair("rgba(10,31,27,0.14)", "rgba(238,246,243,0.16)"),
    selected: pair(SELECTED_LIGHT, SELECTED_DARK),
    // The guide's region picker on the Duo: solid teal with white words in light; raised, a
    // 1 pt border and `selected` words in dark. And the chosen section's tile: white, raised in dark.
    pillFill: pair(SELECTED_LIGHT, ELEV_DARK),
    pillInk: pair("#FFFFFF", SELECTED_DARK),
    pillEdge: pair("transparent", BORDER_DARK),
    tileOnSel: pair(CARD_SIDES.light, ELEV_DARK),
    // The fill behind the row you are on at a wide width, and the dark-only edge that keeps it visible.
    selFill: pair("rgba(9,92,101,0.16)", "rgba(127,208,214,0.30)"),
    selEdgeDark: pair("transparent", "rgba(127,208,214,0.55)"),
    // The softer fill of Explore's selected category on the Duo (dark .18 against selFill's .30).
    selFillSoft: pair("rgba(9,92,101,0.16)", "rgba(127,208,214,0.18)"),
    // The one warm colour: draws the eye to the important thing on a screen.
    // Opposite teal on the wheel, and not one of the map category colours
    // (components/map/SiteMarker.tsx). Too weak as text on bgElevated (4.2:1).
    // Words and icons: lighter in dark (8.7:1 on the page). The main button's fill is
    // button.primary.bg, which stays this orange in dark (white on it 5.2:1).
    highlight: pair(HIGHLIGHT, "#FF9B66"),
    highlightDim: pair("#FDEDE3", "#3A2418"),
    // For the dark brand bar at the top of a screen (accentWarm): the highlight
    // itself is only 2.3:1 there, so it gets a lighter twin, plus a muted
    // off-white for whatever isn't selected. The bar stays dark teal in dark mode, so
    // these need no dark partner (5.7:1 and 6.5:1 on it).
    highlightOnDark: "#FFB84D",
    onDarkMuted: "#BFD8D2",
    // Laid over a photo, behind text (the login screen). A much deeper teal
    // than accentWarm: on that, white was 11.6:1 and the on-dark highlight
    // 6.8:1; here they are 16:1 and 9.3:1. Only ever over a photo, so the same in
    // dark, and glued into gradients (`${scrim}66`), so it must stay a plain string.
    scrim: "#03262B",
    // The dim behind a pop-up sheet. Dark is black: the teal dim is lighter than the dark
    // page and would brighten it.
    dim: pair("rgba(3,38,43,0.55)", "rgba(0,0,0,0.6)"),
    // surf is words, icons and stars; success is a fill with white on it.
    surf: pair("#2C4A36", "#8FD3A6"),
    surfDim: pair("rgba(44,74,54,0.12)", "rgba(143,211,166,0.14)"),
    success: pair("#2C4A36", "#2E7D4F"),
    successDim: pair("rgba(44,74,54,0.10)", "rgba(143,211,166,0.12)"),
    warning: pair("#8F6310", "#E8B95A"),
    warningDim: pair("#FBF3DF", "#3A2E12"),
    // Words and icons. A button filled red is dangerFill, light's red in dark too (owner,
    // 2026-11-14): white on it 6.6:1, where on dark mode's light red it would be 2.2:1.
    danger: pair("#B42318", "#FF8A7A"),
    dangerFill: "#B42318",
    dangerDim: pair("#FDF0EE", "#3A1D1A"),
    // Near-black, then neutral greys: the old green-on-green secondary text
    // blended into the page.
    text: pair("#0A1F1B", "#EEF6F3"),
    text2: pair("#33443F", "#C5D6D1"),
    // The town's name and its icons on Explore's side band at a wide width.
    townInk: pair("#063F45", "#EEF6F3"),
    textMuted: pair("#566661", "#9DB5AF"),
  },
} as const;

// The shared package's forms (the sign-in card, the review sheet) fill their
// fields with bgElevated and have no props for it. In the app that token is
// the brand mint, right for buttons and chips but hard to read typed text on.
// Building those components from these tokens instead (see lib/uiKit.ts) is
// the only way to restyle them from this app: near-white fields. In dark the field is the
// pale fill, a step above a sheet (bgCard).
export const formTokens = {
  ...tokens,
  colors: { ...tokens.colors, bgElevated: pair("#F1F6F4", "#12363A") },
};

// The design sweep's colours and button for the engine's flat pieces (the "no trips"
// panel, the trip-choice sheet), which take them as props.
export const SWEEP_COLORS = {
  page: tokens.colors.page,
  line: tokens.colors.line,
  muted: tokens.colors.textMuted,
  link: tokens.colors.selected,
  pale: tokens.colors.bgSurface,
  // Behind the engine's sheets: its default is this teal written as a string, with no dark.
  scrim: tokens.colors.dim,
};
export const SWEEP_BUTTON = { radius: 12, height: 50, labelSize: 16, labelWeight: "600", shadow: false } as const;

// The same, for the engine's "open" reviews pieces (docs/plans/design-sweep.md, reviews):
// teal for a star someone has chosen, the outline colour for the note box, for a star not
// yet chosen and for the small star a rating didn't reach.
export const REVIEW_COLORS = {
  ...SWEEP_COLORS,
  starPicked: tokens.colors.selected,
  starEmpty: tokens.colors.border,
  boxBorder: tokens.colors.border,
  placeholder: tokens.colors.textMuted,
  pale: tokens.colors.band,
};
