// Saved Places. Its branches: loading, a connection error only when nothing is cached, the
// empty state, opening a place, and the swipe-to-remove that unsaves it. It reads the
// unfiltered useAllLocations on purpose, so a place saved before it was deactivated still
// shows up here.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

// FlashList and Swipeable both want native measurement; stand them in with the parts these
// tests drive — the rows, the header, the empty state, and the right-swipe action.
jest.mock("@shopify/flash-list", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    FlashList: ({ data, renderItem, keyExtractor, ListHeaderComponent, ListEmptyComponent, numColumns, contentContainerStyle }: any) => {
      React.useEffect(() => {
        (globalThis as any).flashMounts = ((globalThis as any).flashMounts ?? 0) + 1;
      }, []);
      return React.createElement(
        View,
        { testID: "saved-list", numColumns, contentContainerStyle },
        ListHeaderComponent,
        data.length === 0
          ? ListEmptyComponent
          : data.map((item: any, index: number) =>
              React.createElement(View, { key: keyExtractor(item) }, renderItem({ item, index })),
            ),
      );
    },
  };
});
jest.mock("react-native-gesture-handler/ReanimatedSwipeable", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: React.forwardRef(({ children, renderRightActions }: any, _ref: any) =>
      React.createElement(View, null, children, renderRightActions()),
    ),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/components/sites/list/ListItem", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  return {
    ListItem: ({ id, name, area, onPress }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress: () => onPress(id), accessibilityRole: "button" },
        React.createElement(Text, null, name),
        area ? React.createElement(Text, null, "in " + area) : null,
      ),
  };
});

const mockSavedSites = { savedSiteIds: new Set<string>(), toggleSavedSite: jest.fn() };
jest.mock("@/lib/hooks/useSavedSites", () => ({ useSavedSites: () => mockSavedSites }));

const mockBag = { locations: [] as any[], loading: false, err: null as string | null };
jest.mock("@/lib/hooksBag", () => ({
  useAllLocations: () => ({ locations: mockBag.locations, loading: mockBag.loading, err: mockBag.err }),
  hooksBag: {
    useUserLocation: () => ({ loc: null }),
    // The real hook sorts by distance; order is not what this screen is responsible for.
    useSortedRows: (locations: any[]) => locations.map((l) => ({ location: l, distanceMeters: null })),
  },
}));

const mockSession = { status: "authed" } as { status: string };
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: mockSession }) }));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  // TopBar's LightStatusBar needs this; the saved page is always focused here.
  useFocusEffect: (effect: () => void) => require("react").useEffect(effect, []),
}));

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import SavedSitesPage from "@/app/(app)/saved-sites";

const makeSite = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id,
  name,
  description: "",
  category: ["Walks"],
  active: true,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockBag.locations = [
    makeSite("s1", "Sumner Beach"),
    makeSite("s2", "Riccarton Bush"),
    makeSite("s3", "Riverside Market"),
  ];
  mockBag.loading = false;
  mockBag.err = null;
  mockSavedSites.savedSiteIds = new Set(["s1", "s3"]);
  mockSession.status = "authed";
});

describe("loading and failure", () => {
  it("waits for the places", async () => {
    mockBag.loading = true;
    const view = await render(<SavedSitesPage />);
    expect(view.getByText("Loading saved places...")).toBeTruthy();
  });

  it("says so when nothing could be loaded", async () => {
    mockBag.err = "offline";
    mockBag.locations = [];
    const view = await render(<SavedSitesPage />);
    expect(view.getByText("Connection Issue")).toBeTruthy();
  });

  it("keeps showing cached places when a refetch fails", async () => {
    mockBag.err = "offline";
    const view = await render(<SavedSitesPage />);

    expect(view.queryByText("Connection Issue")).toBeNull();
    expect(view.getByText("Sumner Beach")).toBeTruthy();
  });
});

describe("the list", () => {
  it("shows only the saved places, with a count", async () => {
    const view = await render(<SavedSitesPage />);

    expect(view.getByText("Saved Places")).toBeTruthy();
    expect(view.getByText("Sumner Beach")).toBeTruthy();
    expect(view.getByText("Riverside Market")).toBeTruthy();
    expect(view.queryByText("Riccarton Bush")).toBeNull();
    expect(view.getByText("2")).toBeTruthy();
  });

  it("still shows a saved place that has since been deactivated", async () => {
    mockBag.locations[0] = makeSite("s1", "Sumner Beach", { active: false });
    const view = await render(<SavedSitesPage />);
    expect(view.getByText("Sumner Beach")).toBeTruthy();
  });

  it("shows an empty state and no count when nothing is saved", async () => {
    mockSavedSites.savedSiteIds = new Set();
    const view = await render(<SavedSitesPage />);

    expect(view.getByText("No saved places yet")).toBeTruthy();
    expect(view.getByText("Tap the heart on any place to save it here.")).toBeTruthy();
    expect(view.queryByText("Sign In")).toBeNull();
    expect(view.queryByText("0")).toBeNull();
  });

  it("asks a guest to sign in rather than tap the heart", async () => {
    mockSession.status = "guest";
    mockSavedSites.savedSiteIds = new Set();
    const view = await render(<SavedSitesPage />);

    expect(view.getByText("Sign in to save places.")).toBeTruthy();
    expect(view.queryByText("Tap the heart on any place to save it here.")).toBeNull();
    await fireEvent.press(view.getByText("Sign In"));
    expect(mockRouter.push).toHaveBeenCalledWith("/(auth)/login");
  });

  it("opens a saved place", async () => {
    const view = await render(<SavedSitesPage />);

    await fireEvent.press(view.getByText("Riverside Market"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/sites/s3");
  });

  it("unsaves a place from its swipe action", async () => {
    const view = await render(<SavedSitesPage />);

    await fireEvent.press(view.getAllByText("Remove")[1]);

    expect(mockSavedSites.toggleSavedSite).toHaveBeenCalledWith({ siteId: "s3", isSaving: false });
  });

  it("goes back", async () => {
    const view = await render(<SavedSitesPage />);

    await fireEvent.press(view.getByLabelText("Back"));

    expect(mockRouter.back).toHaveBeenCalled();
  });
});

// Explore shows one town at a time; this list is whatever the user saved, from anywhere.
describe("towns", () => {
  it("names each place's town when the saved places are in more than one", async () => {
    mockBag.locations = [
      makeSite("s1", "Sumner Beach", { area: "christchurch" }),
      makeSite("s2", "Riccarton Bush", { area: "christchurch" }),
      makeSite("s3", "Tunnel Beach", { area: "dunedin" }),
    ];
    const view = await render(<SavedSitesPage />);

    expect(view.getByText("in Christchurch")).toBeTruthy();
    expect(view.getByText("in Dunedin")).toBeTruthy();
  });

  it("leaves the town off when every saved place is in the same one", async () => {
    mockBag.locations = [
      makeSite("s1", "Sumner Beach", { area: "christchurch" }),
      makeSite("s2", "Tunnel Beach", { area: "dunedin" }),
      makeSite("s3", "Riverside Market", { area: "christchurch" }),
    ];
    const view = await render(<SavedSitesPage />);

    expect(view.queryByText(/^in /)).toBeNull();
  });
});

describe("category tabs", () => {
  const textOf = (node: any): string =>
    typeof node === "string" ? node : (node?.children ?? []).map(textOf).join("");
  const tabLabels = (view: any): string[] => view.queryAllByRole("tab").map(textOf);

  it("hides tabs when every saved place shares one category", async () => {
    const view = await render(<SavedSitesPage />);

    // Both saved places are Walks, so no tabs appear.
    expect(view.queryAllByRole("tab")).toHaveLength(0);
  });

  it("shows All plus each category that has saved places", async () => {
    mockBag.locations = [
      makeSite("s1", "Sumner Beach", { category: ["Water"] }),
      makeSite("s2", "Riccarton Bush", { category: ["Nature"] }),
      makeSite("s3", "Riverside Market", { category: ["Food"] }),
    ];
    mockSavedSites.savedSiteIds = new Set(["s1", "s2", "s3"]);

    const view = await render(<SavedSitesPage />);

    expect(tabLabels(view)).toEqual(["All", "Nature", "Water", "Food & Drink"]);
  });

  it("filters the list to the selected category", async () => {
    mockBag.locations = [
      makeSite("s1", "Sumner Beach", { category: ["Water"] }),
      makeSite("s2", "Riccarton Bush", { category: ["Nature"] }),
      makeSite("s3", "Riverside Market", { category: ["Food"] }),
    ];
    mockSavedSites.savedSiteIds = new Set(["s1", "s2", "s3"]);

    const view = await render(<SavedSitesPage />);

    await fireEvent.press(view.getByText("Nature"));

    expect(view.queryByText("Riccarton Bush")).toBeTruthy();
    expect(view.queryByText("Sumner Beach")).toBeNull();
    expect(view.queryByText("Riverside Market")).toBeNull();
    // Count updates to match the filter.
    expect(view.getByText("1")).toBeTruthy();
  });

  it("resets to All when the All tab is pressed", async () => {
    mockBag.locations = [
      makeSite("s1", "Sumner Beach", { category: ["Water"] }),
      makeSite("s2", "Riccarton Bush", { category: ["Nature"] }),
      makeSite("s3", "Riverside Market", { category: ["Food"] }),
    ];
    mockSavedSites.savedSiteIds = new Set(["s1", "s2", "s3"]);

    const view = await render(<SavedSitesPage />);

    await fireEvent.press(view.getByText("Nature"));
    expect(view.queryByText("Sumner Beach")).toBeNull();

    await fireEvent.press(view.getByText("All"));
    expect(view.getByText("Sumner Beach")).toBeTruthy();
    expect(view.getByText("Riccarton Bush")).toBeTruthy();
    expect(view.getByText("Riverside Market")).toBeTruthy();
  });

  it("orders tabs by SITE_CATEGORIES (tourist priority), not by save order", async () => {
    mockBag.locations = [
      makeSite("s1", "Sumner Beach", { category: ["Food"] }),
      makeSite("s2", "Riccarton Bush", { category: ["Scenic"] }),
      makeSite("s3", "Riverside Market", { category: ["Adventure"] }),
    ];
    mockSavedSites.savedSiteIds = new Set(["s1", "s2", "s3"]);

    const view = await render(<SavedSitesPage />);

    // Scenic before Adventure before Food & Drink — the SITE_CATEGORIES order,
    // regardless of which site was saved first.
    expect(tabLabels(view)).toEqual(["All", "Scenic", "Adventure", "Food & Drink"]);
  });
});

// The open Duo: two columns, upright and sideways, 24 at the sides, 16 between.
describe("on the open Duo", () => {
  const { StyleSheet } = require("react-native");
  const wide = (size = { width: 669, height: 951 }) => require("@blacksands/ui").__setWide(true, size);
  afterEach(() => require("@blacksands/ui").__setWide(false));

  it.each([
    ["upright", { width: 669, height: 951 }],
    ["sideways", { width: 951, height: 669 }],
  ])("is a grid of two columns with 24 sides, a 16 gutter and 16 between rows, %s", async (_n, size) => {
    wide(size);
    const view = await render(<SavedSitesPage />);

    expect(view.getByTestId("saved-list").props.numColumns).toBe(2);
    expect(StyleSheet.flatten(view.getByTestId("saved-list").props.contentContainerStyle).paddingHorizontal).toBe(16);
    const cell = StyleSheet.flatten(view.getAllByTestId("saved-cell")[0].props.style);
    expect(cell).toMatchObject({ paddingHorizontal: 8, marginBottom: 16 }); // 16 + 8 = 24 at the edge; 8 + 8 = 16 between
  });

  it("still opens a place and removes one from a cell", async () => {
    wide();
    const view = await render(<SavedSitesPage />);

    await fireEvent.press(view.getByText("Riverside Market"));
    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/sites/s3");
    await fireEvent.press(view.getAllByText("Remove")[0]);
    expect(mockSavedSites.toggleSavedSite).toHaveBeenCalledWith({ siteId: "s1", isSaving: false });
  });

  it.each([[669, 951, 2], [951, 669, 2], [820, 1180, 2], [1180, 820, 3], [1376, 1032, 4]])(
    "columns by width: %i x %i is %i columns",
    async (width, height, cols) => {
      wide({ width, height });
      const view = await render(<SavedSitesPage />);
      expect(view.getByTestId("saved-list").props.numColumns).toBe(cols);
    },
  );

  it("a new column count gives the list a new key, the same count keeps it", async () => {
    const ui = require("@blacksands/ui");
    const mounts = () => (globalThis as any).flashMounts ?? 0;
    (globalThis as any).flashMounts = 0;
    wide({ width: 1180, height: 820 });
    const view = await render(<SavedSitesPage />);
    expect(mounts()).toBe(1);
    ui.__setWide(true, { width: 1200, height: 820 }); // still 3
    await view.rerender(<SavedSitesPage />);
    expect(mounts()).toBe(1);
    ui.__setWide(true, { width: 1376, height: 1032 }); // 4
    await view.rerender(<SavedSitesPage />);
    expect(mounts()).toBe(2);
    ui.__setWide(true, { width: 669, height: 951 }); // 2, then the same as folded phone (no remount)
    await view.rerender(<SavedSitesPage />);
    expect(mounts()).toBe(3);
    ui.__setWide(false, { width: 390, height: 844 }); // the Duo folding: as today, no new key
    await view.rerender(<SavedSitesPage />);
    expect(mounts()).toBe(3);
  });

  it("a phone is unchanged at 390", async () => {
    require("@blacksands/ui").__setWide(false, { width: 390, height: 844 });
    const view = await render(<SavedSitesPage />);
    expect(view.getByTestId("saved-list").props.numColumns).toBe(1);
  });

  it("is one column with the phone's margins on a phone", async () => {
    const view = await render(<SavedSitesPage />);

    expect(view.getByTestId("saved-list").props.numColumns).toBe(1);
    expect(StyleSheet.flatten(view.getByTestId("saved-list").props.contentContainerStyle).paddingHorizontal).toBe(16);
    expect(StyleSheet.flatten(view.getAllByTestId("saved-cell")[0].props.style)).toEqual({ marginBottom: 24 });
  });
});
