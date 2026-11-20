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

// Counts how many times the article mounts, to catch a remount across the fold on /guide/[slug].
const mockArticleMounts = { count: 0 };
jest.mock("@/components/guide/GuideArticle", () => {
  const React = require("react");
  const actual = jest.requireActual("@/components/guide/GuideArticle");
  return {
    ...actual,
    GuideArticle: (props: any) => {
      React.useEffect(() => {
        mockArticleMounts.count++;
      }, []);
      return React.createElement(actual.GuideArticle, props);
    },
  };
});

// Counts how many times the section list mounts, to catch a remount across the breakpoint.
const mockListMounts = { count: 0 };
jest.mock("@/components/guide/GuideList", () => {
  const React = require("react");
  const actual = jest.requireActual("@/components/guide/GuideList");
  return {
    ...actual,
    GuideList: (props: any) => {
      React.useEffect(() => {
        mockListMounts.count++;
      }, []);
      return React.createElement(actual.GuideList, props);
    },
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

jest.mock("@/lib/analytics", () => ({ logEvent: jest.fn() }));

import React from "react";
import { fireEvent, render, within as within_ } from "@testing-library/react-native";

import GuideIndexPage from "@/app/(app)/(tabs)/guide/index";
import GuideCategoryPage from "@/app/(app)/(tabs)/guide/[slug]";
import { GUIDE_CATEGORIES, ISLAND_CATEGORIES, REGIONS, REGIONS_WITH_CONTENT } from "@/lib/guideContent";
import { logEvent } from "@/lib/analytics";
import { tokens } from "@/lib/ui/tokens";
import { GUIDE_EDGE, GUIDE_LIST_PAD } from "@/components/guide/GuideList";

const first = ISLAND_CATEGORIES[0];
const paragraphs = (body: string) => body.split("\n\n");
// The category page's own rule: no sentence-ending punctuation means a subheading.
const isHeading = (p: string) => !/[.!?]$/.test(p.trim());

beforeEach(() => {
  jest.clearAllMocks();
  mockListMounts.count = 0;
  mockArticleMounts.count = 0;
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

  // Queenstown is the town the app opens on, so its region leads, as in Explore's town list
  // (owner, 2026-10-25); the rest keep the guide's order.
  it("lists Queenstown & Wānaka first after the island", async () => {
    const view = await render(<GuideIndexPage />);

    const labels = view.getAllByRole("tab").map((t: any) => {
      const text = (n: any): string => (typeof n === "string" ? n : (n?.children ?? []).map(text).join(""));
      return text(t);
    });
    expect(labels.slice(0, 2)).toEqual(["South Island", "Queenstown & Wānaka"]);
    expect(labels.slice(2)).toEqual(REGIONS_WITH_CONTENT.filter((r) => r.id !== "queenstown-wanaka").map((r) => r.label));
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

  // The scopes are a tab strip on the white page under the bar, like Explore's categories:
  // the current one teal, the rest one grey (docs/plans/design-sweep.md).
  it("marks the current scope in the selected colour, and moves it with the scope", async () => {
    const region = REGIONS_WITH_CONTENT[0];
    const view = await render(<GuideIndexPage />);

    expect(view.getByText("South Island")).toHaveStyle({ color: tokens.colors.selected });
    expect(view.getByText(region.label)).toHaveStyle({ color: tokens.colors.textMuted });

    await fireEvent.press(view.getByText(region.label));

    expect(view.getByText(region.label)).toHaveStyle({ color: tokens.colors.selected });
    expect(view.getByText("South Island")).toHaveStyle({ color: tokens.colors.textMuted });
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

  // Dark and bold, not the orange they were: orange is kept for what to tap.
  it("opening the section page logs guide_section_opened once, with its slug; a missing slug logs nothing", async () => {
    const view = await render(<GuideCategoryPage />);
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith("guide_section_opened", { section: first.slug });
    await view.unmount();
    (logEvent as jest.Mock).mockClear();
    mockParams.slug = "no-such-section";
    await render(<GuideCategoryPage />);
    expect(logEvent).not.toHaveBeenCalled();
  });

  it("sets subheadings bold in the text colour, larger than a paragraph", async () => {
    const withHeading = GUIDE_CATEGORIES.find((c) => paragraphs(c.body).some(isHeading))!;
    const heading = paragraphs(withHeading.body).find(isHeading)!;
    const paragraph = paragraphs(withHeading.body).find((p) => !isHeading(p))!;
    mockParams.slug = withHeading.slug;
    const view = await render(<GuideCategoryPage />);

    expect(view.getByText(heading)).toHaveStyle({ color: tokens.colors.text, fontWeight: "700", fontSize: 20 });
    expect(view.getByText(paragraph)).toHaveStyle({ color: tokens.colors.text, fontSize: 16 });
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

// Web addresses written in the guide's text are links (owner, 2026-11-13). They are written
// bare, so https:// is added when one is opened.
describe("web addresses in a section", () => {
  const { Linking } = require("react-native");
  const withAddress = GUIDE_CATEGORIES.find((c) => c.body.includes("journeys.nzta.govt.nz"))!;

  it("opens the address when it is tapped, and leaves the full stop after it out", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
    mockParams.slug = withAddress.slug;
    const view = await render(<GuideCategoryPage />);

    await fireEvent.press(view.getByText("journeys.nzta.govt.nz"));

    expect(open).toHaveBeenCalledWith("https://journeys.nzta.govt.nz");
    open.mockRestore();
  });

  it("finds every address in the guide, and nothing that isn't one", () => {
    const found = new Set<string>();
    for (const c of GUIDE_CATEGORIES) {
      for (const m of c.body.matchAll(/\b(?:[a-z0-9-]+\.)+(?:govt\.nz|org\.nz|co\.nz|nz|com)(?:\/[A-Za-z0-9/_-]*)?/g)) found.add(m[0]);
    }
    expect([...found].sort()).toEqual(["beacons.org.nz", "checkitsalright.nz", "journeys.nzta.govt.nz"]);
  });
});

// The open Duo: the list beside the section, the region a picker (docs/plans/design-sweep.md,
// "The guide, picked: round 3").
describe("on the open Duo", () => {
  const { StyleSheet } = require("react-native");
  const wide = (size ={ width: 669, height: 951 }) => require("@blacksands/ui").__setWide(true, size);
  const flexOf = (node: any) => StyleSheet.flatten(node.props.style).flex;
  const second = ISLAND_CATEGORIES[1];

  it("a tap on a section logs guide_section_opened once, with its slug", async () => {
    wide();
    const view = await render(<GuideIndexPage />);
    const { within } = require("@testing-library/react-native");
    expect(logEvent).not.toHaveBeenCalled();

    await fireEvent.press(within(view.getByTestId("guide-list-pane")).getByText(second.title));

    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith("guide_section_opened", { section: second.slug });
  });

  it("lists the sections beside the first one, and a tap shows a section without navigating", async () => {
    wide();
    const view = await render(<GuideIndexPage />);
    const { within } = require("@testing-library/react-native");

    expect(within(view.getByTestId("guide-article-pane")).getByText(first.title)).toBeTruthy();
    expect(within(view.getByTestId("guide-list-pane")).getByText(second.title)).toBeTruthy();

    await fireEvent.press(within(view.getByTestId("guide-list-pane")).getByText(second.title));

    expect(within(view.getByTestId("guide-article-pane")).getByText(second.title)).toBeTruthy();
    expect(within(view.getByTestId("guide-article-pane")).queryByText(first.title)).toBeNull();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  // Sideways the status bar is in the rail (inset 0): the strip's back row and the title start 32 down.
  // The back row sits 8 further from the top and from the left than the 32 / 20 base (owner).
  it("keeps 32 from the top with no inset: the strip (+8) and the article's title", async () => {
    wide({ width: 951, height: 669 });
    const view = await render(<GuideIndexPage />);

    expect(StyleSheet.flatten(view.getByTestId("guide-list-pane").props.style).paddingTop).toBe(40);
    expect(StyleSheet.flatten(view.getByTestId("guide-head").props.style).paddingHorizontal).toBe(28);
    expect(StyleSheet.flatten(view.getByTestId("guide-article").props.contentContainerStyle).paddingTop).toBe(32);
  });

  it("puts the list's tiles on the head's edge: the list's pad and the row's own pad make GUIDE_EDGE", async () => {
    wide();
    const view = await render(<GuideIndexPage />);
    const { within } = require("@testing-library/react-native");
    const listPane = view.getByTestId("guide-list-pane");
    let row = within(listPane).getByText(second.title);
    while (row && !row.props.accessibilityState) row = row.parent;
    let list = row;
    while (list && !list.props.contentContainerStyle) list = list.parent;
    const listStyle = StyleSheet.flatten(list.props.contentContainerStyle);
    const rowStyle = StyleSheet.flatten(row.props.style);

    expect(StyleSheet.flatten(view.getByTestId("guide-head").props.style).paddingHorizontal).toBe(GUIDE_EDGE);
    expect(GUIDE_EDGE).toBe(28);
    expect(listStyle.paddingHorizontal).toBe(GUIDE_LIST_PAD);
    expect(rowStyle.paddingHorizontal).toBe(GUIDE_EDGE - GUIDE_LIST_PAD);
    expect(listStyle.paddingHorizontal + rowStyle.paddingHorizontal).toBe(GUIDE_EDGE);
  });

  it.each([
    ["upright", { width: 669, height: 951 }],
    ["sideways", { width: 951, height: 669 }],
  ])("splits the width 2:3 (268/401 upright, 347/520 sideways of the content), %s", async (_n, size) => {
    wide(size);
    const view = await render(<GuideIndexPage />);

    expect(flexOf(view.getByTestId("guide-list-pane"))).toBe(2);
    expect(flexOf(view.getByTestId("guide-article-pane"))).toBe(3);
  });

  it("shows the region in a pill, with no tab strip and no teal bar", async () => {
    wide();
    const view = await render(<GuideIndexPage />);

    expect(view.getByTestId("region-pill")).toBeTruthy();
    expect(within_(view.getByTestId("region-pill")).getByText("South Island")).toBeTruthy();
    expect(view.queryAllByRole("tab")).toHaveLength(0);
    expect(StyleSheet.flatten(view.getByTestId("region-pill").props.style).minHeight).toBe(40);
  });

  it("lets a long region name wrap to two lines in the pill", async () => {
    wide();
    mockParams.region = "canterbury";
    const view = await render(<GuideIndexPage />);
    const name = REGIONS_WITH_CONTENT.find((r) => r.id === "canterbury")!.label;

    expect(within_(view.getByTestId("region-pill")).getByText(name).props.numberOfLines).toBe(2);
  });

  it("changes region from the picker", async () => {
    wide();
    const region = REGIONS_WITH_CONTENT[0];
    const view = await render(<GuideIndexPage />);

    await fireEvent.press(view.getByTestId("region-pill"));
    await fireEvent.press(within_(view.getByTestId("region-sheet")).getByLabelText(region.label));

    const regional = GUIDE_CATEGORIES.filter((c) => c.region === region.id);
    expect(within_(view.getByTestId("guide-list-pane")).getByText(regional[1].title)).toBeTruthy();
    // The first section of the region opens on the right.
    expect(within_(view.getByTestId("guide-article-pane")).getByText(regional[0].title)).toBeTruthy();
  });

  it("falls back to South Island for a region with no sections", async () => {
    wide();
    mockParams.region = "not-a-region";
    const view = await render(<GuideIndexPage />);

    expect(within_(view.getByTestId("region-pill")).getByText("South Island")).toBeTruthy();
    expect(within_(view.getByTestId("guide-article-pane")).getByText(first.title)).toBeTruthy();
  });

  it("opens the split with the section of a deep link chosen", async () => {
    wide();
    mockParams.slug = second.slug;
    const view = await render(<GuideCategoryPage />);

    expect(within_(view.getByTestId("guide-article-pane")).getByText(second.title)).toBeTruthy();
    expect(within_(view.getByTestId("guide-list-pane")).getByText(first.title)).toBeTruthy();
  });

  it("opens a deep link to a regional section with its region picked", async () => {
    wide();
    const c = GUIDE_CATEGORIES.find((g) => g.region)!;
    mockParams.slug = c.slug;
    const view = await render(<GuideCategoryPage />);

    expect(within_(view.getByTestId("guide-article-pane")).getByText(c.title)).toBeTruthy();
    expect(within_(view.getByTestId("guide-list-pane")).getAllByText(c.title).length).toBeGreaterThan(0);
  });

  it("keeps the list mounted and the chosen section across the breakpoint, both ways", async () => {
    const ui = require("@blacksands/ui");
    ui.__setWide(true, { width: 669, height: 951 });
    const view = await render(<GuideIndexPage />);
    await fireEvent.press(view.getByText(second.title));
    expect(mockListMounts.count).toBe(1);

    ui.__setWide(false);
    await view.rerender(<GuideIndexPage />);
    expect(mockListMounts.count).toBe(1);
    ui.__setWide(true, { width: 669, height: 951 });
    await view.rerender(<GuideIndexPage />);

    expect(mockListMounts.count).toBe(1);
    expect(within_(view.getByTestId("guide-article-pane")).getByText(second.title)).toBeTruthy();
    expect(within_(view.getByTestId("guide-article-pane")).queryByText(first.title)).toBeNull();
  });
});

describe("the section route across the fold", () => {
  it("keeps the same article mounted, and the chosen section, phone to Duo and back", async () => {
    const ui = require("@blacksands/ui");
    const c = ISLAND_CATEGORIES[1];
    mockParams.slug = c.slug;
    const view = await render(<GuideCategoryPage />);
    expect(mockArticleMounts.count).toBe(1);
    expect(view.getByLabelText("Back to the guide")).toBeTruthy();

    ui.__setWide(true, { width: 669, height: 951 });
    await view.rerender(<GuideCategoryPage />);
    expect(view.queryByLabelText("Back to the guide")).toBeNull();
    expect(within_(view.getByTestId("guide-article-pane")).getByText(c.title)).toBeTruthy();

    ui.__setWide(false);
    await view.rerender(<GuideCategoryPage />);
    expect(view.getByLabelText("Back to the guide")).toBeTruthy();
    expect(view.getByText(c.title)).toBeTruthy();
    expect(mockArticleMounts.count).toBe(1);
  });
});

describe("on a wide iPad", () => {
  const { StyleSheet } = require("react-native");
  it("reading text is at most 640 wide", async () => {
    require("@blacksands/ui").__setWide(true, { width: 1376, height: 1032 });
    mockParams.slug = GUIDE_CATEGORIES[0].slug;
    const view = await render(<GuideCategoryPage />);
    const p = paragraphs(GUIDE_CATEGORIES[0].body).find((x) => !isHeading(x))!;

    expect(StyleSheet.flatten(view.getByText(p).props.style).maxWidth).toBe(640);
    require("@blacksands/ui").__setWide(false);
  });

  it("a phone is unchanged: the same words, still no tighter cap than 640", async () => {
    mockParams.slug = GUIDE_CATEGORIES[0].slug;
    const view = await render(<GuideCategoryPage />);
    const p = paragraphs(GUIDE_CATEGORIES[0].body).find((x) => !isHeading(x))!;

    expect(StyleSheet.flatten(view.getByText(p).props.style)).toMatchObject({ fontSize: 16, lineHeight: 25 });
    expect(StyleSheet.flatten(view.getByTestId("guide-article").props.contentContainerStyle).paddingHorizontal).toBe(16);
  });
});

describe("on a phone", () => {
  it("keeps the tab strip, the bar and the list as they were", async () => {
    const view = await render(<GuideIndexPage />);

    expect(view.queryByTestId("region-pill")).toBeNull();
    expect(view.queryByTestId("guide-article-pane")).toBeNull();
    expect(view.getAllByRole("tab").length).toBe(REGIONS_WITH_CONTENT.length + 1);
  });

  it("still opens a section page from a deep link, with a back arrow", async () => {
    mockParams.slug = ISLAND_CATEGORIES[1].slug;
    const view = await render(<GuideCategoryPage />);

    expect(view.getByLabelText("Back to the guide")).toBeTruthy();
    expect(view.queryByTestId("guide-list-pane")).toBeNull();
  });
});
