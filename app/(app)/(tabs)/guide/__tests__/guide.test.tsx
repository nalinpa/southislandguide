// Both guide screens, rendering lib/guideContent.ts. south-island's index adds a scope row —
// "South Island" (island-wide sections) plus each region that has sections written — and
// its category page promotes a punctuation-free line to a subheading. A removed slug has to
// land on "Guide Not Found" with a working way back rather than a blank page. Back pops the
// tab history (the Tabs navigator keeps one, app/(app)/(tabs)/_layout.tsx), so it returns to
// wherever the screen was opened from. Opened cold, with nothing to go back to, the index
// goes to Profile and a section to the index.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  setParams: jest.fn(),
  canGoBack: jest.fn(() => true),
};
// slug for a section page; region, handed over by Explore, for the index.
const mockParams = { slug: "" as string | undefined, region: undefined as string | undefined };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
  // LightStatusBar uses it to own the status bar while its screen is in front. Here the
  // screen is always "focused".
  useFocusEffect: (effect: () => void) => require("react").useEffect(effect, []),
}));

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import GuideIndexPage from "@/app/(app)/(tabs)/guide/index";
import GuideCategoryPage from "@/app/(app)/(tabs)/guide/[slug]";
import { GUIDE_CATEGORIES, ISLAND_CATEGORIES, REGIONS, REGIONS_WITH_CONTENT } from "@/lib/guideContent";
import { tokens } from "@/lib/ui/tokens";

const first = ISLAND_CATEGORIES[0];
const paragraphs = (body: string) => body.split("\n\n");
// The category page's own rule: no sentence-ending punctuation means a subheading.
const isHeading = (p: string) => !/[.!?]$/.test(p.trim());

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.canGoBack.mockReturnValue(true);
  mockParams.slug = first.slug;
  mockParams.region = undefined;
});

describe("the content", () => {
  it("has a unique slug for every section, because the detail route is a flat /guide/[slug]", () => {
    const slugs = GUIDE_CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every region with sections the same five slots, in order", () => {
    const slots = ["why", "getting-around", "when", "hazards", "book-ahead"];
    for (const r of REGIONS_WITH_CONTENT) {
      const slugs = GUIDE_CATEGORIES.filter((c) => c.region === r.id).map((c) => c.slug);
      expect(slugs).toEqual(slots.map((s) => `${r.id}-${s}`));
    }
  });

  it("has a title and a body for every section", () => {
    for (const c of GUIDE_CATEGORIES) {
      expect(c.title.trim()).toBeTruthy();
      expect(c.body.trim()).toBeTruthy();
    }
  });

  it("never has a real paragraph that the page would mistake for a subheading", () => {
    // A long unpunctuated paragraph would render in the subheading style. Headings are short.
    for (const c of GUIDE_CATEGORIES) {
      for (const p of paragraphs(c.body).filter(isHeading)) {
        expect({ slug: c.slug, heading: p, short: p.length < 40 }).toEqual({ slug: c.slug, heading: p, short: true });
      }
    }
  });
});

describe("the guide index", () => {
  it("opens on the island-wide sections only", async () => {
    const view = await render(<GuideIndexPage />);

    expect(view.getByText("Guide")).toBeTruthy();
    for (const c of ISLAND_CATEGORIES) expect(view.getByText(c.title)).toBeTruthy();
    for (const c of GUIDE_CATEGORIES.filter((g) => g.region)) expect(view.queryByText(c.title)).toBeNull();
  });

  it("offers a scope for the island and for each region with sections written", async () => {
    const view = await render(<GuideIndexPage />);

    expect(view.getByText("South Island")).toBeTruthy();
    for (const r of REGIONS_WITH_CONTENT) expect(view.getByText(r.label)).toBeTruthy();
    // A region with nothing written yet gets no pill.
    for (const r of REGIONS.filter((r) => !REGIONS_WITH_CONTENT.includes(r))) {
      expect(view.queryByText(r.label)).toBeNull();
    }
  });

  it("switches to a region's own sections, and back", async () => {
    const region = REGIONS_WITH_CONTENT[0];
    const regional = GUIDE_CATEGORIES.filter((c) => c.region === region.id);
    const view = await render(<GuideIndexPage />);

    await fireEvent.press(view.getByText(region.label));

    for (const c of regional) expect(view.getByText(c.title)).toBeTruthy();
    expect(view.queryByText(first.title)).toBeNull();

    await fireEvent.press(view.getByText("South Island"));

    expect(view.getByText(first.title)).toBeTruthy();
    expect(view.queryByText(regional[0].title)).toBeNull();
  });

  // Explore's guide button hands over the region of the town it shows (owner, 2026-10-25).
  // Taken once, then cleared: this tab screen keeps its params, and the same region sent
  // again later must still count.
  describe("a region handed over by another screen", () => {
    const westCoast = () => GUIDE_CATEGORIES.filter((c) => c.region === "west-coast");

    it("opens on that region's sections", async () => {
      mockParams.region = "west-coast";
      const view = await render(<GuideIndexPage />);

      for (const c of westCoast()) expect(view.getByText(c.title)).toBeTruthy();
      expect(view.queryByText(first.title)).toBeNull();
      expect(mockRouter.setParams).toHaveBeenCalledWith({ region: undefined });
    });

    it("opens on the island-wide sections for a region with none written", async () => {
      mockParams.region = "not-a-region";
      const view = await render(<GuideIndexPage />);

      expect(view.getByText(first.title)).toBeTruthy();
    });

    it("moves to a new region handed over on a later visit", async () => {
      mockParams.region = "west-coast";
      const view = await render(<GuideIndexPage />);

      mockParams.region = "fiordland";
      await view.rerender(<GuideIndexPage />);

      const fiordland = GUIDE_CATEGORIES.filter((c) => c.region === "fiordland");
      for (const c of fiordland) expect(view.getByText(c.title)).toBeTruthy();
      expect(view.queryByText(westCoast()[0].title)).toBeNull();
    });
  });

  it("titles the screen in white on the brand bar", async () => {
    const view = await render(<GuideIndexPage />);

    expect(view.getByText("Guide")).toHaveStyle({ color: "#FFFFFF" });
  });

  // The scopes are a tab strip in the brand bar, like Explore's categories.
  it("marks the current scope in the highlight colour, and moves it with the scope", async () => {
    const region = REGIONS_WITH_CONTENT[0];
    const view = await render(<GuideIndexPage />);

    expect(view.getByText("South Island")).toHaveStyle({ color: tokens.colors.highlightOnDark });
    expect(view.getByText(region.label)).toHaveStyle({ color: "#FFFFFF" });

    await fireEvent.press(view.getByText(region.label));

    expect(view.getByText(region.label)).toHaveStyle({ color: tokens.colors.highlightOnDark });
    expect(view.getByText("South Island")).toHaveStyle({ color: "#FFFFFF" });
  });

  it("opens the section that was tapped", async () => {
    const view = await render(<GuideIndexPage />);

    await fireEvent.press(view.getByText(first.title));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/guide/" + first.slug);
  });

  it("goes back to the screen it was opened from", async () => {
    const view = await render(<GuideIndexPage />);

    await fireEvent.press(view.getByLabelText("Back"));

    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it("goes to the Profile tab when it was opened cold, with nothing to go back to", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const view = await render(<GuideIndexPage />);

    await fireEvent.press(view.getByLabelText("Back"));

    expect(mockRouter.navigate).toHaveBeenCalledWith("/(app)/(tabs)/account");
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

describe("a section page", () => {
  it.each(GUIDE_CATEGORIES.map((c) => [c.slug, c] as const))("renders %s: its title and every paragraph", async (slug, c) => {
    mockParams.slug = slug;
    const view = await render(<GuideCategoryPage />);

    expect(view.getByText(c.title)).toBeTruthy();
    for (const p of paragraphs(c.body)) expect(view.getByText(p)).toBeTruthy();
  });

  it("sets subheadings in the highlight colour, and paragraphs not", async () => {
    const withHeading = GUIDE_CATEGORIES.find((c) => paragraphs(c.body).some(isHeading))!;
    const heading = paragraphs(withHeading.body).find(isHeading)!;
    const paragraph = paragraphs(withHeading.body).find((p) => !isHeading(p))!;
    mockParams.slug = withHeading.slug;
    const view = await render(<GuideCategoryPage />);

    expect(view.getByText(heading)).toHaveStyle({ color: tokens.colors.highlight });
    expect(view.getByText(paragraph)).toHaveStyle({ color: tokens.colors.text });
  });

  // The same round arrow as the guide list, beside the title. It used to be a white
  // "Guide" pill on a row of its own under the title.
  it("has an arrow for going back, not a labelled pill", async () => {
    const view = await render(<GuideCategoryPage />);

    expect(view.getByLabelText("Back to the guide")).toBeTruthy();
    expect(view.queryByText("Guide")).toBeNull();
  });

  // router.back(), not navigate: navigating to the index would put it after this section in
  // the tab history, and the index's own back would then return here.
  it("goes back to the guide index it was opened from", async () => {
    const view = await render(<GuideCategoryPage />);

    await fireEvent.press(view.getByLabelText("Back to the guide"));

    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it("goes to the guide index when it was opened cold", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const view = await render(<GuideCategoryPage />);

    await fireEvent.press(view.getByLabelText("Back to the guide"));

    expect(mockRouter.navigate).toHaveBeenCalledWith("/(app)/(tabs)/guide");
  });

  it("says a removed slug is gone instead of rendering a blank page", async () => {
    mockParams.slug = "no-such-guide";
    const view = await render(<GuideCategoryPage />);

    expect(view.getByText("Guide Not Found")).toBeTruthy();
    expect(view.getByText("This guide page doesn't exist anymore.")).toBeTruthy();
  });

  it("leaves a working way back off the not-found page", async () => {
    mockParams.slug = "no-such-guide";
    mockRouter.canGoBack.mockReturnValue(false);
    const view = await render(<GuideCategoryPage />);

    await fireEvent.press(view.getByText("Go Back"));

    expect(mockRouter.navigate).toHaveBeenCalledWith("/(app)/(tabs)/guide");
  });
});
