// The Explore tab. What south-island adds over rotorua-guide is the category tab row: "All"
// plus only the categories that have (active) places, hidden entirely when there's just one,
// and combined with the name search. Also pinned: a guest's sign-in card and the
// location-denied card.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

// The list is a FlashList wrapper with its own file; here it only has to show the rows it
// was handed, in order, and pass taps back.
jest.mock("@/components/sites/list/ListView", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return {
    ListView: ({ rows, header, onPressItem, ListEmptyComponent }: any) =>
      React.createElement(
        View,
        null,
        header,
        rows.length === 0
          ? ListEmptyComponent
          : rows.map((r: any) =>
              React.createElement(
                TouchableOpacity,
                { key: r.location.id, onPress: () => onPressItem(r.location.id), accessibilityRole: "button" },
                React.createElement(Text, null, "Row " + r.location.name),
              ),
            ),
      ),
  };
});

const mockSession = { status: "authed", uid: "uid-1" } as any;
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: mockSession }) }));

const mockBag = {
  locations: [] as any[],
  loading: false,
  err: null as string | null,
  locStatus: "granted" as string,
};
jest.mock("@/lib/hooksBag", () => ({
  hooksBag: {
    useLocations: () => ({ locations: mockBag.locations, loading: mockBag.loading, err: mockBag.err }),
    useUserLocation: () => ({ loc: null, status: mockBag.locStatus }),
    useLocationStore: { getState: () => ({ location: null }) },
    // Distance ordering belongs to the shared hook, not this screen.
    useSortedRows: (locations: any[]) => locations.map((l) => ({ location: l, distanceMeters: null })),
  },
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

import React from "react";
import { Linking } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import SiteListPage from "@/app/(app)/(tabs)/sites/index";

const makeSite = (id: string, name: string, category: string[], over: Record<string, unknown> = {}) => ({
  id,
  name,
  description: "",
  category,
  active: true,
  ...over,
});

const rowNames = (view: any) => view.queryAllByText(/^Row /).map((n: any) => n.props.children.replace(/^Row /, ""));
const textOf = (node: any): string =>
  typeof node === "string" ? node : (node?.children ?? []).map(textOf).join("");
const tabLabels = (view: any): string[] => view.queryAllByRole("tab").map(textOf);
const selectedTab = (view: any): string =>
  textOf(view.getAllByRole("tab").find((t: any) => t.props.accessibilityState?.selected));

let openSettings: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.status = "authed";
  mockSession.uid = "uid-1";
  mockBag.locations = [
    makeSite("s1", "Sumner Beach", ["Water", "Scenic"]),
    makeSite("s2", "Riccarton Bush", ["Walks", "Nature"]),
    makeSite("s3", "Riverside Market", ["Food"]),
    makeSite("s4", "Port Hills Walk", ["Walks", "Scenic"]),
  ];
  mockBag.loading = false;
  mockBag.err = null;
  mockBag.locStatus = "granted";
  openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined as never);
});

afterEach(() => openSettings.mockRestore());

describe("loading and failure", () => {
  it("waits for the places", async () => {
    mockBag.loading = true;
    const view = await render(<SiteListPage />);
    expect(view.getByText("Finding Locations...")).toBeTruthy();
  });

  it("waits for the session", async () => {
    mockSession.status = "loading";
    const view = await render(<SiteListPage />);
    expect(view.getByText("Finding Locations...")).toBeTruthy();
  });

  it("says when the places couldn't be fetched", async () => {
    mockBag.err = "Network request failed";
    const view = await render(<SiteListPage />);
    expect(view.getByText("Connection Issue")).toBeTruthy();
  });

  it("says so when there are no places at all", async () => {
    mockBag.locations = [];
    const view = await render(<SiteListPage />);
    expect(view.getByText("No Locations Found")).toBeTruthy();
  });
});

describe("the list", () => {
  it("lists every active place and leaves out inactive ones", async () => {
    mockBag.locations.push(makeSite("s5", "Closed Gallery", ["Culture"], { active: false }));
    const view = await render(<SiteListPage />);

    expect(rowNames(view)).toEqual(["Sumner Beach", "Riccarton Bush", "Riverside Market", "Port Hills Walk"]);
  });

  it("opens the place that was tapped", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByText("Row Riccarton Bush"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/sites/s2");
  });

  it("links to saved places", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Saved places"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/saved-sites");
  });
});

describe("category tabs", () => {
  it("offers All plus only the categories that have places, in the app's category order", async () => {
    const view = await render(<SiteListPage />);

    expect(tabLabels(view)).toEqual(["All", "Food & Drink", "Walks", "Water", "Scenic", "Nature"]);
  });

  it("ignores inactive places when deciding which tabs to show", async () => {
    mockBag.locations.push(makeSite("s5", "Closed Gallery", ["Culture"], { active: false }));
    const view = await render(<SiteListPage />);

    expect(tabLabels(view)).not.toContain("Culture");
  });

  it("hides the row when every place is in one category", async () => {
    mockBag.locations = [makeSite("s1", "A", ["Food"]), makeSite("s2", "B", ["Food"])];
    const view = await render(<SiteListPage />);

    expect(view.queryAllByRole("tab")).toHaveLength(0);
  });

  it("starts on All", async () => {
    const view = await render(<SiteListPage />);

    expect(selectedTab(view)).toBe("All");
  });

  it("filters to a category, matching any of a place's categories", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByText("Scenic"));

    expect(rowNames(view)).toEqual(["Sumner Beach", "Port Hills Walk"]);
    expect(selectedTab(view)).toBe("Scenic");
  });

  it("goes back to everything on All", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByText("Food & Drink"));
    await fireEvent.press(view.getByText("All"));

    expect(rowNames(view)).toHaveLength(4);
  });
});

describe("search", () => {
  it("opens a search box and matches names case-insensitively", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Search Locations"));
    await fireEvent.changeText(view.getByPlaceholderText("Search Locations"), "  RIC ");

    expect(rowNames(view)).toEqual(["Riccarton Bush"]);
  });

  it("combines with the category tab", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByText("Walks"));
    await fireEvent.press(view.getByLabelText("Search Locations"));
    await fireEvent.changeText(view.getByPlaceholderText("Search Locations"), "port");

    expect(rowNames(view)).toEqual(["Port Hills Walk"]);
  });

  it("says nothing matched rather than showing an empty page", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Search Locations"));
    await fireEvent.changeText(view.getByPlaceholderText("Search Locations"), "zzz");

    expect(rowNames(view)).toEqual([]);
    expect(view.getByText("No Locations match your search.")).toBeTruthy();
  });

  it("clears the query when the search box is closed", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Search Locations"));
    await fireEvent.changeText(view.getByPlaceholderText("Search Locations"), "ric");
    await fireEvent.press(view.getByLabelText("Search Locations"));

    expect(view.queryByPlaceholderText("Search Locations")).toBeNull();
    expect(rowNames(view)).toHaveLength(4);
  });
});

describe("guest and location", () => {
  it("shows a guest a sign-in card, not a login wall", async () => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
    const view = await render(<SiteListPage />);

    expect(view.getByText("Sign In for More")).toBeTruthy();
    expect(rowNames(view)).toHaveLength(4);
  });

  it("has no sign-in card for a signed-in user", async () => {
    const view = await render(<SiteListPage />);
    expect(view.queryByText("Sign In for More")).toBeNull();
  });

  it("explains a denied location and links to Settings", async () => {
    mockBag.locStatus = "denied";
    const view = await render(<SiteListPage />);

    expect(view.getByText("Location Disabled")).toBeTruthy();
    await fireEvent.press(view.getByText("Open Settings"));
    expect(openSettings).toHaveBeenCalled();
  });
});
