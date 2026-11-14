import { DynamicColorIOS, Platform } from "react-native";

// Dark mode follows the phone (docs/plans/design-sweep.md). A colour written as a pair is
// iOS's own two-sided colour: the system swaps it when the phone changes, so the style
// sheets that read it need no hook and no re-render.
// ponytail: off until every screen is built for it. Turned on early, the screens not yet
// converted would show light text on their hard-coded white. While off, a pair is its light
// value: a plain string, as before. A pair can't be glued into a string (`${c}66`) or
// measured for contrast: give those a fixed colour.
export const DARK_READY = false;
const pair = (light: string, dark: string): string =>
  DARK_READY && Platform.OS === "ios" ? (DynamicColorIOS({ light, dark }) as unknown as string) : light;

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
    bgBase: "#EEF6F3",
    bgSurface: "#E2F0EB",
    bgCard: "#FFFFFF",
    bgElevated: "#D3ECE5",
    borderSubtle: "#CFE1DA",
    border: "#A9C6BC",
    borderStrong: "#3D6B5F",
    accent: "#095C65",
    accentDim: "rgba(9,92,101,0.12)",
    accentWarm: pair("#063F45", "#0B4B52"),
    // The design sweep's look (docs/plans/design-sweep.md), screen by screen: a white
    // page, a hairline round a photo so a pale sky doesn't melt into it, and one line
    // colour. `selected` marks the tab or category you're on: teal, with a line under it.
    page: pair("#FFFFFF", "#06191B"),
    line: pair("#CBD8D3", "#2F5257"),
    // The pale band between groups of rows (Profile): a band means "new group", a line
    // "next row in the same group".
    band: pair("#EEF3F1", "#0C2A2E"),
    // A drive on the Days view: a pale teal, so a fill there means "this can be dragged".
    driveFill: pair("#D9E9E4", "#173F45"),
    photoEdge: pair("rgba(10,31,27,0.14)", "rgba(238,246,243,0.16)"),
    selected: pair("#095C65", "#7FD0D6"),
    // The one warm colour: draws the eye to the important thing on a screen.
    // Opposite teal on the wheel, and not one of the map category colours
    // (components/map/SiteMarker.tsx). Too weak as text on bgElevated (4.2:1).
    highlight: HIGHLIGHT,
    highlightDim: "#FDEDE3",
    // For the dark brand bar at the top of a screen (accentWarm): the highlight
    // itself is only 2.3:1 there, so it gets a lighter twin, plus a muted
    // off-white for whatever isn't selected.
    highlightOnDark: "#FFB84D",
    onDarkMuted: "#BFD8D2",
    // Laid over a photo, behind text (the login screen). A much deeper teal
    // than accentWarm: on that, white was 11.6:1 and the on-dark highlight
    // 6.8:1; here they are 16:1 and 9.3:1.
    scrim: "#03262B",
    surf: "#2C4A36",
    surfDim: "rgba(44,74,54,0.12)",
    success: "#2C4A36",
    successDim: "rgba(44,74,54,0.10)",
    warning: "#8F6310",
    warningDim: "#FBF3DF",
    danger: "#B42318",
    dangerDim: "#FDF0EE",
    // Near-black, then neutral greys: the old green-on-green secondary text
    // blended into the page.
    text: pair("#0A1F1B", "#EEF6F3"),
    text2: pair("#33443F", "#C5D6D1"),
    textMuted: pair("#566661", "#9DB5AF"),
  },
} as const;

// The shared package's forms (the sign-in card, the review sheet) fill their
// fields with bgElevated and have no props for it. In the app that token is
// the brand mint, right for buttons and chips but hard to read typed text on.
// Building those components from these tokens instead (see lib/uiKit.ts) is
// the only way to restyle them from this app: near-white fields.
export const formTokens = {
  ...tokens,
  colors: { ...tokens.colors, bgElevated: "#F1F6F4" },
};

// The design sweep's colours and button for the engine's flat pieces (the "no trips"
// panel, the trip-choice sheet), which take them as props.
export const SWEEP_COLORS = {
  page: tokens.colors.page,
  line: tokens.colors.line,
  muted: tokens.colors.textMuted,
  link: tokens.colors.selected,
  pale: tokens.colors.bgSurface,
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
