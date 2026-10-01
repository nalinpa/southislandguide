// Both guide screens, rendering lib/guideContent.ts. south-island's index adds a scope row —
// "South Island" (island-wide sections) plus each region that has sections written — and
// its category page promotes a punctuation-free line to a subheading. A removed slug has to
// land on "Guide Not Found" with a working way back rather than a blank page. Back from the
// index goes to the Home (account) tab and back from a section goes to the index, both by
// explicit route: these are tab screens, and router.back() resets the Tabs navigator to
// Explore.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children) };
});

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() };
const mockParams = { slug: "" as string | undefined };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
}));

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import GuideIndexPage from "@/app/(app)/(tabs)/guide/index";
import GuideCategoryPage from "@/app/(app)/(tabs)/guide/[slug]";
import { GUIDE_CATEGORIES, ISLAND_CATEGORIES, REGIONS_WITH_CONTENT } from "@/lib/guideContent";

const first = ISLAND_CATEGORIES[0];
const paragraphs = (body: string) => body.split("\n\n");
// The category page's own rule: no sentence-ending punctuation means a subheading.
const isHeading = (p: string) => !/[.!?]$/.test(p.trim());

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.slug = first.slug;
});

describe("the content", () => {
  it("has a unique slug for every section, because the detail route is a flat /guide/[slug]", () => {
    const slugs = GUIDE_CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
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
        expect({ slug: c.slug, heading: p, short: p.length <= 60 }).toEqual({ slug: c.slug, heading: p, short: true });
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
    expect(view.queryByText("Fiordland")).toBeNull();
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

  it("opens the section that was tapped", async () => {
    const view = await render(<GuideIndexPage />);

    await fireEvent.press(view.getByText(first.title));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/guide/" + first.slug);
  });

  it("goes back to the Home tab, not to Explore", async () => {
    const view = await render(<GuideIndexPage />);

    await fireEvent.press(view.getByLabelText("Back to Home"));

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

  it("goes back to the guide index, not to Explore", async () => {
    const view = await render(<GuideCategoryPage />);

    await fireEvent.press(view.getByLabelText("Back to the guide"));

    expect(mockRouter.navigate).toHaveBeenCalledWith("/(app)/(tabs)/guide");
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("says a removed slug is gone instead of rendering a blank page", async () => {
    mockParams.slug = "no-such-guide";
    const view = await render(<GuideCategoryPage />);

    expect(view.getByText("Guide Not Found")).toBeTruthy();
    expect(view.getByText("This guide page doesn't exist anymore.")).toBeTruthy();
  });

  it("leaves a working way back off the not-found page", async () => {
    mockParams.slug = "no-such-guide";
    const view = await render(<GuideCategoryPage />);

    await fireEvent.press(view.getByText("Go Back"));

    expect(mockRouter.navigate).toHaveBeenCalledWith("/(app)/(tabs)/guide");
  });
});
