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
    // mint (#D3ECE5, still the splash and icon background) is now only the fill
    // for chips and search bars. lib/ui/__tests__/tokens.test.ts holds the
    // contrast floors.
    bgBase: "#EEF6F3",
    bgSurface: "#E2F0EB",
    bgCard: "#FFFFFF",
    bgElevated: "#D3ECE5",
    borderSubtle: "#CFE1DA",
    border: "#A9C6BC",
    borderStrong: "#3D6B5F",
    accent: "#095C65",
    accentDim: "rgba(9,92,101,0.12)",
    accentWarm: "#063F45",
    // The one warm colour: draws the eye to the important thing on a screen.
    // Opposite teal on the wheel, and not one of the map category colours
    // (components/map/SiteMarker.tsx). Too weak as text on bgElevated (4.2:1).
    highlight: HIGHLIGHT,
    highlightDim: "#FDEDE3",
    // For the dark brand bar at the top of a screen (accentWarm): the highlight
    // itself is only 2.3:1 there, so it gets a lighter twin, plus a muted
    // off-white for whatever isn't selected.
    highlightOnDark: "#FF9A62",
    onDarkMuted: "#BFD8D2",
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
    text: "#0A1F1B",
    text2: "#33443F",
    textMuted: "#566661"
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
