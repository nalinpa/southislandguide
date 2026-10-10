import { formTokens, tokens } from "@/lib/ui/tokens";

// WCAG 2 contrast ratio. 4.5 is the minimum for body text, 7 the enhanced level.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const c = tokens.colors;
const backgrounds = ["bgBase", "bgSurface", "bgCard", "bgElevated"] as const;

describe("palette", () => {
  // Secondary text used to be green on green and blended into the page.
  it.each(["text", "text2"] as const)("makes %s stand out on every background", (name) => {
    for (const bg of backgrounds) expect(contrast(c[name], c[bg])).toBeGreaterThanOrEqual(7);
  });

  it("keeps hint text readable on every background", () => {
    for (const bg of backgrounds) expect(contrast(c.textMuted, c[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it("has a highlight that carries white text and reads as text on a page or card", () => {
    expect(contrast("#FFFFFF", c.highlight)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.highlight, c.bgBase)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.highlight, c.bgCard)).toBeGreaterThanOrEqual(4.5);
  });

  // The brand bar at the top of a screen is accentWarm. The normal highlight is too dark
  // to read on it (2.3:1), hence the on-dark pair.
  it("keeps text readable on the dark brand bar", () => {
    expect(contrast("#FFFFFF", c.accentWarm)).toBeGreaterThanOrEqual(7);
    expect(contrast(c.highlightOnDark, c.accentWarm)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.onDarkMuted, c.accentWarm)).toBeGreaterThanOrEqual(4.5);
  });

  // The sign-in form comes from the shared package, which fills its fields with bgElevated
  // and colours its submit as the primary button. On the brand mint, typed text and the
  // grey placeholder were hard to read.
  it("gives the sign-in form near-white fields and a highlighted submit button", () => {
    expect(luminance(formTokens.colors.bgElevated)).toBeGreaterThan(0.85);
    expect(contrast(formTokens.colors.textMuted, formTokens.colors.bgElevated)).toBeGreaterThanOrEqual(4.5);
    expect(formTokens.button.primary.bg).toBe(c.highlight);
  });

  // variant="hero" is for a screen's one main action.
  it("makes the hero button the highlight colour, with readable text", () => {
    expect(tokens.button.hero.bg).toBe(c.highlight);
    expect(contrast(tokens.button.hero.text, tokens.button.hero.bg)).toBeGreaterThanOrEqual(4.5);
  });
});
