// The Explore tab. What south-island adds over rotorua-guide: the list shows one town at a
// time, named in the bar's title, which is a dropdown of the towns that have places; and the
// category tab row: "All" plus only the categories that have (active) places in that town,
// hidden entirely when there's just one, and combined with the name search. Also pinned: a
// guest's sign-in card and the location-denied card.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

// The featured card is the list's own card (components/sites/list/ListItem.tsx), which
// fades in with moti and formats its distance with the shared hooks.
jest.mock("moti", () => {
  const { View } = require("react-native");
  return { MotiView: View };
});

jest.mock("@blacksands/hooks", () => ({
  formatDistanceMeters: (m: number) => (m / 1000).toFixed(1) + " km",
}));

// The list is a FlashList wrapper with its own file; here it only has to show the rows it
// was handed, in order, and pass taps back.
// How many times the list has mounted: folding must not remount it.
let mockListMounts = 0;
// What the screen last handed the list: compact rows and the chosen id on the open Duo.
let mockListProps: any = {};
jest.mock("@/components/sites/list/ListView", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return {
    ListView: ({ rows, header, onPressItem, ListEmptyComponent, firstRowTarget, compact, selectedId, tripIds, jumpKey }: any) => {
      mockListProps = { compact, selectedId, jumpKey };
      React.useEffect(() => {
        mockListMounts += 1;
      }, []);
      return React.createElement(
        View,
        null,
        // What's passed as `header` scrolls away with the rows; the testID lets a test tell
        // that apart from the bar fixed above the list.
        React.createElement(View, { testID: "list-header" }, header),
        rows.length === 0
          ? ListEmptyComponent
          : rows.map((r: any, i: number) =>
              React.createElement(
                View,
                { key: r.location.id, ...(i === 0 ? firstRowTarget : null) },
                React.createElement(
                  TouchableOpacity,
                  {
                    onPress: () => onPressItem(r.location.id),
                    accessibilityRole: "button",
                    ...(compact && r.location.id === selectedId ? { testID: "chosen-row" } : null),
                  },
                  React.createElement(Text, null, "Row " + r.location.name),
                  tripIds?.has(r.location.id) ? React.createElement(Text, null, "Row in trip " + r.location.name) : null,
                ),
              ),
            ),
      );
    },
  };
});

// The place beside the list: its own tests cover what it shows; here it only has to say which
// place it was handed and whether as a pane.
jest.mock("@/components/sites/detail/SiteDetail", () => ({
  SiteDetail: ({ id, pane }: any) =>
    require("react").createElement(require("react-native").Text, { testID: "pane-place" }, `Place ${id}${pane ? " pane" : ""}`),
}));

// The light status bar, as a marker: wide Explore has no teal top, so it mustn't mount.
jest.mock("@/components/layout/LightStatusBar", () => ({
  LightStatusBar: () => require("react").createElement(require("react-native").View, { testID: "light-status-bar" }),
}));

let mockInsetTop = 0;
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    // The town menu sits in one, to clear the status bar.
    SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children),
    useSafeAreaInsets: () => ({ top: mockInsetTop, bottom: 0, left: 0, right: 0 }),
  };
});

const mockSession = { status: "authed", uid: "uid-1" } as any;
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: mockSession }) }));

const mockBag = {
  locations: [] as any[],
  loading: false,
  err: null as string | null,
  locStatus: "granted" as string,
  // The live position, and the one kept from earlier in the session.
  loc: null as any,
  storedLoc: null as any,
};
jest.mock("@/lib/hooksBag", () => ({
  hooksBag: {
    useLocations: () => ({ locations: mockBag.locations, loading: mockBag.loading, err: mockBag.err }),
    useUserLocation: () => ({ loc: mockBag.loc, status: mockBag.locStatus }),
    useLocationStore: { getState: () => ({ location: mockBag.storedLoc }) },
    // Distance ordering belongs to the shared hook, not this screen.
    useSortedRows: (locations: any[]) => locations.map((l) => ({ location: l, distanceMeters: null })),
  },
  // Pull to refresh; the real one invalidates the locations query.
  useRefreshLocations: () => jest.fn().mockResolvedValue(undefined),
}));

// The opening tour's hooks (lib/tour). A target carries a testID naming its step, so a
// test can see what the tour would point at; a step's route is recorded.
jest.mock("@/lib/tour/useTourTarget", () => ({
  useTourTarget: (id: string) => ({ ref: { current: null }, onLayout: () => {}, testID: "tour-target-" + id }),
}));
const mockStepRoutes: Record<string, string | undefined> = {};
jest.mock("@/lib/tour/useTourStepRoute", () => ({
  useTourStepRoute: (key: string, route: string | undefined) => {
    mockStepRoutes[key] = route;
  },
}));

// The trips, for a day's "Find more things to do".
let mockTrips: any[] = [];
const trip = (...siteIds: string[]) => [{ id: "t1", days: [{ id: "d1", date: "2026-12-01", items: siteIds.map((siteId) => ({ siteId })) }] }];
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => ({ itineraries: mockTrips }) }));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn() };
// A town handed over by another screen (a trip's "Find more things to do").
const mockParams: { area?: string } = {};
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
  // The top bar uses it to own the status bar while its screen is in front. Here the
  // screen is always "focused".
  useFocusEffect: (effect: () => void) => require("react").useEffect(effect, []),
}));

import React from "react";
import { Linking, StyleSheet } from "react-native";
import { fireEvent, render, within } from "@testing-library/react-native";

import SiteListPage from "@/app/(app)/(tabs)/sites/index";
import { tokens } from "@/lib/ui/tokens";
import { clearPendingSlot, setPendingSlot } from "@/lib/pendingSlot";
import { SITE_CATEGORY_LABELS } from "@/lib/models";

// In Christchurch unless a test says otherwise, so the tests that aren't about towns see
// one town: no dropdown, and every place listed.
const makeSite = (id: string, name: string, category: string[], over: Record<string, unknown> = {}) => ({
  id,
  name,
  description: "",
  category,
  active: true,
  area: "christchurch",
  region: "canterbury",
  lat: -43.53,
  lng: 172.63,
  ...over,
});

// The places shown, in order: the featured card's at the top, then the rows under it.
const rowsOnly = (view: any): string[] =>
  view.queryAllByText(/^Row /).map((n: any) => n.props.children.replace(/^Row /, ""));
const rowNames = (view: any): string[] => {
  const card = view.queryByTestId("featured-card");
  return [...(card ? [card.props.accessibilityLabel] : []), ...rowsOnly(view)];
};
const textOf = (node: any): string =>
  typeof node === "string" ? node : (node?.children ?? []).map(textOf).join("");
const tabLabels = (view: any): string[] => view.queryAllByRole("tab").map(textOf);
const selectedTab = (view: any): string =>
  textOf(view.getAllByRole("tab").find((t: any) => t.props.accessibilityState?.selected));

let openSettings: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockInsetTop = 0;
  mockListMounts = 0;
  mockListProps = {};
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
  mockBag.loc = null;
  mockBag.storedLoc = null;
  delete mockParams.area;
  mockTrips = [];
  clearPendingSlot();
  openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined as never);
});

afterEach(() => openSettings.mockRestore());

describe("loading and failure", () => {
  it("waits for the places", async () => {
    mockBag.loading = true;
    const view = await render(<SiteListPage />);
    expect(view.getByText("Finding places...")).toBeTruthy();
  });

  it("waits for the session", async () => {
    mockSession.status = "loading";
    const view = await render(<SiteListPage />);
    expect(view.getByText("Finding places...")).toBeTruthy();
  });

  it("says when the places couldn't be fetched", async () => {
    mockBag.err = "Network request failed";
    mockBag.locations = [];
    const view = await render(<SiteListPage />);
    expect(view.getByText("Connection Issue")).toBeTruthy();
    expect(view.getByText("Try Again")).toBeTruthy();
  });

  // The card used to replace the whole list, and the pull to refresh with it.
  it("keeps its places when a refresh fails", async () => {
    mockBag.err = "Network request failed";
    const view = await render(<SiteListPage />);
    expect(rowNames(view)).toContain("Sumner Beach");
    expect(view.queryByText("Connection Issue")).toBeNull();
  });

  it("says so when there are no places at all", async () => {
    mockBag.locations = [];
    const view = await render(<SiteListPage />);
    expect(view.getByText("No Places Found")).toBeTruthy();
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

  // The guide was only reachable from the Profile tab, where few people would find it.
  // Open on the guide for the town shown (owner, 2026-10-25).
  it("opens the travel guide on the region of the town shown", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Travel guide"));

    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/(app)/(tabs)/guide", params: { region: "canterbury" } });
  });

  // The town list files Kaikōura under Canterbury, but the guide gives it sections of its own.
  it("opens Kaikōura's own guide sections from Kaikōura", async () => {
    mockBag.locations = [makeSite("k1", "Whale Watch", ["Water"], { area: "kaikoura", region: "canterbury" })];
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Travel guide"));

    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/(app)/(tabs)/guide", params: { region: "kaikoura" } });
  });

  it("opens the island-wide guide for places with no town", async () => {
    mockBag.locations = [makeSite("x1", "Somewhere", ["Scenic"], { area: undefined, region: undefined })];
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Travel guide"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/guide");
  });

  it("links to saved places", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Saved places"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/saved-sites");
  });
});

describe("category tabs", () => {
  // A place is listed under its main (first) category only, so a tab is offered only for
  // a category that is some place's main one. Scenic and Nature are only second here.
  it("offers All plus only the categories that are some place's main one, in the app's order", async () => {
    const view = await render(<SiteListPage />);

    expect(tabLabels(view)).toEqual(["All", "Walks", "Water", "Food & Drink"]);
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

  // Since the design sweep the tabs sit on the white page under the bar: the selected one
  // teal, the rest one grey, the same marks as the tab bar at the foot of the screen
  // (docs/plans/design-sweep.md).
  it("marks the selected tab in the selected colour, and the rest in grey", async () => {
    const view = await render(<SiteListPage />);

    expect(view.getByText("All")).toHaveStyle({ color: tokens.colors.selected });
    expect(view.getByText("Walks")).toHaveStyle({ color: tokens.colors.textMuted });
  });

  it("puts a line under the selected tab only", async () => {
    const view = await render(<SiteListPage />);
    const underlineOf = (label: string) => {
      const tab = view.getAllByRole("tab").find((t: any) => textOf(t) === label)!;
      const kids = tab.children.filter((c: any) => typeof c !== "string");
      return kids[kids.length - 1];
    };

    expect(underlineOf("All")).toHaveStyle({ backgroundColor: tokens.colors.selected });
    expect(underlineOf("Walks")).toHaveStyle({ backgroundColor: "transparent" });
  });

  // Sumner Beach and Port Hills Walk are both Scenic too, but second: under Scenic only
  // the place that is Scenic first.
  it("lists a place under its main category only", async () => {
    mockBag.locations.push(makeSite("s5", "Godley Head", ["Scenic"]));
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByText("Scenic"));

    expect(rowNames(view)).toEqual(["Godley Head"]);
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
  // Someone typing "surf" or "food" should find places whose names don't say so.
  it("also matches a place's description", async () => {
    mockBag.locations = [
      makeSite("s1", "Sumner Beach", ["Water"], { description: "A long surf beach." }),
      makeSite("s2", "Riccarton Bush", ["Walks"], { description: "Old-growth forest." }),
    ];
    const view = await render(<SiteListPage />);
    await fireEvent.press(view.getByLabelText("Search places"));

    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "surf");

    expect(rowNames(view)).toEqual(["Sumner Beach"]);
  });

  it("also matches a category by the label on its tab", async () => {
    const view = await render(<SiteListPage />);
    await fireEvent.press(view.getByLabelText("Search places"));

    // "drink" is in no name; it is in the Food category's label, "Food & Drink".
    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "drink");

    expect(rowNames(view)).toEqual(["Riverside Market"]);
  });

  it("opens a search box and matches names case-insensitively", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Search places"));
    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "  RIC ");

    expect(rowNames(view)).toEqual(["Riccarton Bush"]);
  });

  it("combines with the category tab", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByText("Walks"));
    await fireEvent.press(view.getByLabelText("Search places"));
    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "port");

    expect(rowNames(view)).toEqual(["Port Hills Walk"]);
  });

  it("says nothing matched rather than showing an empty page", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Search places"));
    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "zzz");

    expect(rowNames(view)).toEqual([]);
    expect(view.getByText("No places in Christchurch match your search.")).toBeTruthy();
  });

  it("clears the query when the search box is closed", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Search places"));
    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "ric");
    // Open, the toggle is an X, and VoiceOver says so.
    await fireEvent.press(view.getByLabelText("Close search"));

    expect(view.queryByPlaceholderText("Search places")).toBeNull();
    expect(rowNames(view)).toHaveLength(4);
  });
});

describe("top bar", () => {
  it("sets the title in white on the brand bar", async () => {
    const view = await render(<SiteListPage />);

    expect(view.getByText("Christchurch")).toHaveStyle({ color: "#FFFFFF" });
  });

  // Fixed, so the list scrolls under it and the category tabs stay in reach however far
  // down the list someone is.
  it("keeps the title and category tabs out of the part that scrolls with the list", async () => {
    const view = await render(<SiteListPage />);
    const scrolling = within(view.getByTestId("list-header"));

    expect(view.getByText("Christchurch")).toBeTruthy();
    expect(scrolling.queryByText("Christchurch")).toBeNull();
    expect(scrolling.queryAllByRole("tab")).toHaveLength(0);
    expect(view.getAllByRole("tab").length).toBeGreaterThan(1);
  });
});

describe("guest and location", () => {
  it("shows a guest a sign-in card, not a login wall", async () => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
    const view = await render(<SiteListPage />);

    // In the scrolling part, so it doesn't permanently take room from the list.
    expect(within(view.getByTestId("list-header")).getByText("Sign In for More")).toBeTruthy();
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

// The list shows one town at a time. The bar's title names it and, when more than one town
// has places, opens the menu to change it.
describe("towns", () => {
  const at = (latitude: number, longitude: number) => ({ coords: { latitude, longitude } });
  const OCTAGON = at(-45.874, 170.504); // central Dunedin
  const PALMERSTON = at(-45.48, 170.72); // 45 km north of Dunedin: between towns, Dunedin nearest
  const AUCKLAND = at(-36.85, 174.76);

  const chooseTown = async (view: any, row: RegExp) => {
    await fireEvent.press(view.getByLabelText(/, choose a town$/));
    await fireEvent.press(view.getByLabelText(row));
  };
  const menuRows = (view: any): string[] =>
    view.getAllByLabelText(/, \d+ places?$/).map((r: any) => r.props.accessibilityLabel);

  beforeEach(() => {
    mockBag.locations.push(
      makeSite("d1", "Otago Museum", ["Culture"], { area: "dunedin", region: "dunedin-otago", lat: -45.8656, lng: 170.5107 }),
      makeSite("d2", "Tunnel Beach", ["Walks"], { area: "dunedin", region: "dunedin-otago", lat: -45.92, lng: 170.46 }),
      makeSite("t1", "Caroline Bay", ["Water"], { area: "timaru", lat: -44.39, lng: 171.25 }),
    );
  });

  describe("where it starts", () => {
    const QUEENSTOWN_PLACE = () =>
      makeSite("q1", "Queenstown Gardens", ["Walks"], { area: "queenstown", region: "queenstown-wanaka", lat: -45.036, lng: 168.66 });

    it("starts on Queenstown with no position", async () => {
      mockBag.locations.push(QUEENSTOWN_PLACE());
      const view = await render(<SiteListPage />);

      expect(rowNames(view)).toEqual(["Queenstown Gardens"]);
      expect(view.getByText("Queenstown")).toBeTruthy();
    });

    it("starts on the town the user is in", async () => {
      mockBag.storedLoc = OCTAGON;
      const view = await render(<SiteListPage />);

      expect(rowNames(view)).toEqual(["Otago Museum", "Tunnel Beach"]);
      expect(view.getByText("Dunedin")).toBeTruthy();
    });

    it("starts on the nearest town for someone between towns, not on Christchurch", async () => {
      mockBag.storedLoc = PALMERSTON;
      const view = await render(<SiteListPage />);

      expect(rowNames(view)).toEqual(["Otago Museum", "Tunnel Beach"]);
    });

    // A trip's "Find more things to do" for a day in another town. Taken once, then
    // cleared, so the same town sent again later still counts.
    it("opens on a town another screen hands over, wherever the user is", async () => {
      mockBag.storedLoc = OCTAGON;
      mockParams.area = "timaru";
      const view = await render(<SiteListPage />);

      expect(rowNames(view)).toEqual(["Caroline Bay"]);
      expect(view.getByLabelText("Timaru, choose a town")).toBeTruthy();
      expect(mockRouter.setParams).toHaveBeenCalledWith({ area: undefined });
    });

    // The tab stays mounted with its old scroll offset, so each hand-over sends the list back
    // to the top, the same town a second time included.
    it("opened from a trip day, hands the list a new jumpKey", async () => {
      const view = await render(<SiteListPage />);
      const first = mockListProps.jumpKey;

      mockParams.area = "timaru";
      await view.rerender(<SiteListPage />);
      const second = mockListProps.jumpKey;
      expect(second).not.toBe(first);

      mockParams.area = undefined;
      await view.rerender(<SiteListPage />);
      mockParams.area = "timaru";
      await view.rerender(<SiteListPage />);
      expect(mockListProps.jumpKey).not.toBe(second);
    });

    // "Find more things to do" means the town's whole list, even where a filter left on from
    // before would still have matches.
    it("drops a category left on from before when a town is handed over", async () => {
      const view = await render(<SiteListPage />);
      await fireEvent.press(view.getByText("Walks"));
      expect(rowNames(view)).toEqual(["Riccarton Bush", "Port Hills Walk"]);

      mockParams.area = "christchurch";
      await view.rerender(<SiteListPage />);

      expect(rowNames(view)).toEqual(["Sumner Beach", "Riccarton Bush", "Riverside Market", "Port Hills Walk"]);
    });

    it("starts on Queenstown for someone off the island", async () => {
      mockBag.locations.push(QUEENSTOWN_PLACE());
      mockBag.storedLoc = AUCKLAND;
      const view = await render(<SiteListPage />);

      expect(view.getByText("Queenstown")).toBeTruthy();
    });

    // The position isn't kept between launches, so on a cold start it comes in after the
    // list is drawn.
    it("moves to the user's town when their position comes in", async () => {
      const view = await render(<SiteListPage />);
      expect(view.getByText("Christchurch")).toBeTruthy();

      mockBag.loc = OCTAGON;
      await view.rerender(<SiteListPage />);

      expect(rowNames(view)).toEqual(["Otago Museum", "Tunnel Beach"]);
    });

    it("leaves the user on the town they chose when their position comes in", async () => {
      const view = await render(<SiteListPage />);
      await chooseTown(view, /^Timaru, /);

      mockBag.loc = OCTAGON;
      await view.rerender(<SiteListPage />);

      expect(rowNames(view)).toEqual(["Caroline Bay"]);
    });

    it("starts on the first town that has places when Queenstown and Christchurch have none", async () => {
      mockBag.locations = mockBag.locations.filter((l) => l.area !== "christchurch");
      const view = await render(<SiteListPage />);

      expect(rowNames(view)).toEqual(["Caroline Bay"]);
    });
  });

  describe("the dropdown", () => {
    it("makes the title a button when more than one town has places", async () => {
      const view = await render(<SiteListPage />);

      expect(view.getByLabelText("Christchurch, choose a town")).toBeTruthy();
    });

    // One row with the buttons, so the bar stays short: at the smaller title size, and
    // shrinking further for a long name rather than cutting it off.
    it("keeps the town on the buttons' row, small, shrinking to fit", async () => {
      const view = await render(<SiteListPage />);

      const titleRow = view.getByLabelText("Christchurch, choose a town").parent!;
      expect(within(titleRow).getByLabelText("Search places")).toBeTruthy();
      expect(view.getByText("Christchurch")).toHaveStyle({ fontSize: 24 });
      expect(view.getByText("Christchurch").props.adjustsFontSizeToFit).toBe(true);
    });

    it("leaves the title as plain text when only one town has places", async () => {
      mockBag.locations = mockBag.locations.filter((l) => l.area === "christchurch");
      const view = await render(<SiteListPage />);

      expect(view.getByText("Christchurch")).toBeTruthy();
      expect(view.queryByLabelText(/choose a town/)).toBeNull();
    });

    it("offers only the towns that have an active place, with their counts, and no way to list everything", async () => {
      mockBag.locations.push(makeSite("o1", "Closed Gallery", ["Culture"], { area: "oamaru", active: false }));
      const view = await render(<SiteListPage />);

      await fireEvent.press(view.getByLabelText("Christchurch, choose a town"));

      expect(menuRows(view)).toEqual(["Christchurch, 4 places", "Timaru, 1 place", "Dunedin, 2 places"]);
    });

    // Each town has its region in lib/areas.ts: what its places say can be split or wrong.
    // Most of the Catlins' places are filed under Otago, but the town is Southland's.
    it("puts a town under its own region, whatever most of its places say", async () => {
      mockBag.locations.push(
        makeSite("c1", "Nugget Point", ["Scenic"], { area: "catlins", region: "dunedin-otago" }),
        makeSite("c2", "Purakaunui Falls", ["Walks"], { area: "catlins", region: "dunedin-otago" }),
        makeSite("c3", "Curio Bay", ["Nature"], { area: "catlins", region: "southland-catlins" }),
        makeSite("r1", "Howells Point", ["Walks"], { area: "riverton", region: "fiordland" }),
        makeSite("k1", "Lake Tekapo", ["Scenic"], { area: "tekapo", region: "canterbury" }),
      );
      const view = await render(<SiteListPage />);

      await fireEvent.press(view.getByLabelText("Christchurch, choose a town"));

      const southland = view.getByText("Southland & the Catlins").parent!;
      expect(within(southland).getByText("The Catlins")).toBeTruthy();
      expect(within(southland).getByText("Riverton")).toBeTruthy();
      expect(within(view.getByText("Aoraki & Mackenzie").parent!).getByText("Tekapo")).toBeTruthy();
    });

    // A town added in the admin panel before the app has a region for it goes by its places.
    it("puts a town the app has no region for under the one most of its places are in", async () => {
      mockBag.locations.push(
        makeSite("n1", "Somewhere New", ["Scenic"], { area: "lake-new", region: "west-coast" }),
        makeSite("n2", "Somewhere Else", ["Scenic"], { area: "lake-new", region: "west-coast" }),
        makeSite("n3", "Somewhere Odd", ["Scenic"], { area: "lake-new", region: "canterbury" }),
      );
      const view = await render(<SiteListPage />);

      await fireEvent.press(view.getByLabelText("Christchurch, choose a town"));

      expect(within(view.getByText("West Coast").parent!).getByText("Lake New")).toBeTruthy();
    });

    it("groups the towns under their region", async () => {
      const view = await render(<SiteListPage />);

      await fireEvent.press(view.getByLabelText("Christchurch, choose a town"));

      expect(view.getAllByRole("header").map((h: any) => h.props.children)).toEqual([
        "Canterbury & Christchurch",
        "Dunedin & Otago Coast",
      ]);
    });

    it("shows the chosen town, names it in the title, and closes", async () => {
      const view = await render(<SiteListPage />);

      await chooseTown(view, /^Dunedin, /);

      expect(rowNames(view)).toEqual(["Otago Museum", "Tunnel Beach"]);
      expect(view.getByLabelText("Dunedin, choose a town")).toBeTruthy();
      expect(view.queryByLabelText(/, \d+ places?$/)).toBeNull();
    });

    // An area added in the admin panel before the app has a label for it.
    it("offers a town it has no label for under its id, with capitals", async () => {
      // An id with no entry in AREAS (Oamaru was the example until it got its macron label).
      mockBag.locations.push(makeSite("t2", "Church of the Good Shepherd", ["Culture"], { area: "lake-tekapo" }));
      const view = await render(<SiteListPage />);

      await fireEvent.press(view.getByLabelText("Christchurch, choose a town"));

      expect(menuRows(view)).toContain("Lake Tekapo, 1 place");
    });

    // The admin panel doesn't require an area, and a place in no town would otherwise
    // never be listed.
    it("keeps a place with no town reachable under Other", async () => {
      mockBag.locations.push(makeSite("x1", "Somewhere", ["Scenic"], { area: undefined }));
      const view = await render(<SiteListPage />);

      await chooseTown(view, /^Other, 1 place$/);

      expect(rowNames(view)).toEqual(["Somewhere"]);
    });

    it("has no Other while every place has a town", async () => {
      const view = await render(<SiteListPage />);

      await fireEvent.press(view.getByLabelText("Christchurch, choose a town"));

      expect(view.queryByLabelText(/^Other, /)).toBeNull();
    });
  });

  describe("with the category tabs and the search", () => {
    it("offers only the chosen town's categories", async () => {
      const view = await render(<SiteListPage />);

      await chooseTown(view, /^Dunedin, /);

      expect(tabLabels(view)).toEqual(["All", "Walks", "Culture"]);
    });

    it("keeps the chosen category when the new town has it", async () => {
      const view = await render(<SiteListPage />);
      await fireEvent.press(view.getByText("Walks"));

      await chooseTown(view, /^Dunedin, /);

      expect(selectedTab(view)).toBe("Walks");
      expect(rowNames(view)).toEqual(["Tunnel Beach"]);
    });

    it("goes back to All when the new town has nothing in the chosen category", async () => {
      const view = await render(<SiteListPage />);
      await fireEvent.press(view.getByText("Food & Drink"));

      await chooseTown(view, /^Dunedin, /);

      expect(selectedTab(view)).toBe("All");
      expect(rowNames(view)).toEqual(["Otago Museum", "Tunnel Beach"]);
    });

    it("searches inside the chosen town", async () => {
      const view = await render(<SiteListPage />);
      await fireEvent.press(view.getByLabelText("Search places"));

      await fireEvent.changeText(view.getByPlaceholderText("Search places"), "beach");

      expect(rowNames(view)).toEqual(["Sumner Beach"]);
    });

    it("names the town when a search finds nothing in it", async () => {
      const view = await render(<SiteListPage />);
      await fireEvent.press(view.getByLabelText("Search places"));

      await fireEvent.changeText(view.getByPlaceholderText("Search places"), "museum");

      expect(view.getByText("No places in Christchurch match your search.")).toBeTruthy();
    });
  });
});

// The opening tour points at the town, the guide button, the category tabs and the first
// place, and opens that place for the steps that follow (lib/tour/tourSteps.ts).
// rotorua-guide's and aklguide's hero card: the place with the highest `featured` value
// (higher is more featured) among those shown, in a card at the top of the list and not
// again in the rows under it (owner, 2026-10-25).
describe("the featured place", () => {
  const card = (view: any) => view.queryByTestId("featured-card");
  const rank = (id: string, featured: number) => {
    mockBag.locations.find((l) => l.id === id)!.featured = featured;
  };

  it("shows the highest-ranked place in a card above the list, and not again in it", async () => {
    rank("s2", 3);
    rank("s4", 1);
    mockBag.locations[1].description = "Old-growth forest in the city.";
    const view = await render(<SiteListPage />);

    const header = within(view.getByTestId("list-header"));
    expect(header.getByTestId("featured-card").props.accessibilityLabel).toBe("Riccarton Bush");
    expect(header.getByText("Riccarton Bush")).toBeTruthy();
    expect(header.getByText("Old-growth forest in the city.")).toBeTruthy();
    expect(rowsOnly(view)).toEqual(["Sumner Beach", "Riverside Market", "Port Hills Walk"]);
  });

  // The photo and the name say enough (owner, 2026-10-25).
  it("doesn't label the card Featured", async () => {
    rank("s2", 3);
    const view = await render(<SiteListPage />);

    expect(view.queryByText(/featured/i)).toBeNull();
  });

  // Its top edge meets the bottom of the teal bar, with nothing above it: the sign-in and
  // location notices come after it (owner, 2026-10-25).
  it("sits right under the top bar, above any notice", async () => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
    mockBag.locStatus = "denied";
    const view = await render(<SiteListPage />);

    const header = view.getByTestId("explore-header");
    expect(header).not.toHaveStyle({ paddingTop: expect.any(Number) });
    const shown = JSON.stringify(view.toJSON());
    expect(shown.indexOf("featured-card")).toBeLessThan(shown.indexOf("Sign In for More"));
    expect(shown.indexOf("featured-card")).toBeLessThan(shown.indexOf("Location Disabled"));
  });

  // It ran edge to edge with square corners (owner, 2026-10-25). Since the design sweep it
  // is the list's own card, inside the list's side padding, with only a taller photo to
  // mark it (owner, 2026-11-13; docs/plans/design-sweep.md).
  it("is the list's card with a taller photo, inside the list's padding", async () => {
    rank("s2", 3);
    const view = await render(<SiteListPage />);
    const photo = view.getByTestId("featured-photo").parent;

    expect(card(view)).not.toHaveStyle({ marginHorizontal: -tokens.space.md });
    expect(photo).toHaveStyle({ height: 204, borderRadius: tokens.radius.md });
  });

  it("opens the featured place when its card is tapped", async () => {
    rank("s2", 3);
    const view = await render(<SiteListPage />);

    await fireEvent.press(card(view));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/sites/s2");
  });

  // A bundled default photo comes with its file's own size, which would beat the card's
  // edges alone and show only its top-left corner (owner, 2026-10-31).
  it("sizes the photo to the card, not to the photo file", async () => {
    rank("s2", 3);
    const view = await render(<SiteListPage />);

    expect(view.getByTestId("featured-photo")).toHaveStyle({ width: "100%", height: "100%" });
  });

  // A place's own photo makes a better hero than a stock default (owner, 2026-10-30).
  it("features the highest-ranked place with its own photo over one without", async () => {
    rank("s2", 3);
    rank("s4", 1);
    mockBag.locations.find((l) => l.id === "s4")!.imageUrl = "https://img/port-hills.webp";
    const view = await render(<SiteListPage />);

    expect(card(view).props.accessibilityLabel).toBe("Port Hills Walk");
  });

  it("features a place from the town shown, not a higher-ranked one elsewhere", async () => {
    rank("s2", 3);
    mockBag.locations.push(makeSite("d1", "Otago Museum", ["Culture"], { area: "dunedin", featured: 9 }));
    const view = await render(<SiteListPage />);

    expect(card(view).props.accessibilityLabel).toBe("Riccarton Bush");
  });

  it("features the highest-ranked place in the chosen category", async () => {
    rank("s1", 5);
    rank("s2", 3);
    const view = await render(<SiteListPage />);
    expect(card(view).props.accessibilityLabel).toBe("Sumner Beach");

    await fireEvent.press(view.getByText("Walks"));

    expect(card(view).props.accessibilityLabel).toBe("Riccarton Bush");
    expect(rowsOnly(view)).toEqual(["Port Hills Walk"]);
  });

  // Every place has a value, 0 when none is set: the highest wins, and a tie goes to the
  // place listed first.
  it("features the first place listed when none shown is ranked higher", async () => {
    rank("s4", 2);
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByText("Food & Drink"));

    expect(card(view).props.accessibilityLabel).toBe("Riverside Market");
    expect(rowsOnly(view)).toEqual([]);
  });

  it("features the first place listed when nothing is ranked", async () => {
    const view = await render(<SiteListPage />);

    expect(card(view).props.accessibilityLabel).toBe("Sumner Beach");
    expect(rowsOnly(view)).toEqual(["Riccarton Bush", "Riverside Market", "Port Hills Walk"]);
  });

  it("puts the featured place back among the rows while searching", async () => {
    rank("s2", 3);
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Search places"));
    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "riccarton");

    expect(card(view)).toBeNull();
    expect(rowsOnly(view)).toEqual(["Riccarton Bush"]);
  });
});

// "Find more things to do" on a trip day: the town's places closest first to the stop before the
// free time, straight-line.
describe("from a trip day", () => {
  const FAR = { lat: -43.9, lng: 172.9 };
  // Sumner Beach is the stop; Port Hills Walk is next to it, Riverside Market a bit further,
  // Riccarton Bush furthest, and Godley Head has no position.
  beforeEach(() => {
    const at = (id: string, lat: number, lng: number) => {
      Object.assign(mockBag.locations.find((l) => l.id === id)!, { lat, lng });
    };
    at("s1", -43.5, 172.6);
    at("s4", -43.51, 172.61);
    at("s3", -43.6, 172.7);
    Object.assign(mockBag.locations.find((l) => l.id === "s2")!, FAR);
    mockTrips = [
      { id: "t1", days: [{ id: "d1", items: [{ siteId: "s1", slotIndex: 10 }] }] },
    ];
  });
  const openFromDay = (slot = 20) => {
    setPendingSlot({ tripId: "t1", dayId: "d1", slot });
    mockParams.area = "christchurch";
  };
  const line = (view: any) => view.queryByText("Closest places to Sumner Beach");

  it("lists the town closest first to the stop before the free time, under 'Closest places to {stop}'", async () => {
    openFromDay();
    const view = await render(<SiteListPage />);

    expect(line(view)).toBeTruthy();
    expect(line(view).props.accessibilityRole).toBe("text");
    // The featured card (none ranked: the first listed) stays; the rows are closest first.
    expect(view.getByTestId("featured-card").props.accessibilityLabel).toBe("Sumner Beach");
    expect(rowsOnly(view)).toEqual(["Port Hills Walk", "Riverside Market", "Riccarton Bush"]);
  });

  it("opened normally keeps the usual order and no line", async () => {
    const view = await render(<SiteListPage />);

    expect(view.queryByText(/^Closest places to /)).toBeNull();
    expect(rowNames(view)).toEqual(["Sumner Beach", "Riccarton Bush", "Riverside Market", "Port Hills Walk"]);
  });

  it("with no stop to measure from, keeps the usual order", async () => {
    openFromDay(5);
    const view = await render(<SiteListPage />);

    expect(view.queryByText(/^Closest places to /)).toBeNull();
    expect(rowNames(view)).toEqual(["Sumner Beach", "Riccarton Bush", "Riverside Market", "Port Hills Walk"]);
  });

  it("search and the category still filter the closest-first list", async () => {
    mockBag.locations.push(makeSite("s5", "Godley Head", ["Walks"], { lat: -43.6, lng: 172.8 }));
    openFromDay();
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByText("Walks"));
    expect(line(view)).toBeTruthy();
    // Riccarton Bush stays the featured card (first listed); the rows under it are closest first.
    expect(rowNames(view)).toEqual(["Riccarton Bush", "Port Hills Walk", "Godley Head"]);

    await fireEvent.press(view.getByLabelText("Search places"));
    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "head");
    expect(rowNames(view)).toEqual(["Godley Head"]);
  });

  it("puts places with no position last, in the usual order", async () => {
    mockBag.locations.push(makeSite("s5", "Godley Head", ["Walks"], { lat: undefined, lng: undefined }));
    openFromDay();
    const view = await render(<SiteListPage />);

    expect(rowsOnly(view)).toEqual(["Port Hills Walk", "Riverside Market", "Riccarton Bush", "Godley Head"]);
  });

  it("stops when another town is chosen", async () => {
    mockBag.locations.push(makeSite("d1", "Otago Museum", ["Culture"], { area: "dunedin" }));
    openFromDay();
    const view = await render(<SiteListPage />);
    await fireEvent.press(view.getByLabelText(/, choose a town$/));
    await fireEvent.press(view.getByLabelText(/^Dunedin, /));

    expect(view.queryByText(/^Closest places to /)).toBeNull();
  });
});

describe("the tour", () => {
  const target = (view: any, id: string) => within(view.getByTestId("tour-target-" + id));

  it("points at the featured place, and opens it for the next step", async () => {
    mockBag.locations[3].featured = 2;
    const view = await render(<SiteListPage />);

    expect(target(view, "place").getByTestId("featured-card").props.accessibilityLabel).toBe("Port Hills Walk");
    expect(mockStepRoutes.place).toBe("/(app)/(tabs)/sites/s4");
  });

  it("points at the town in the title", async () => {
    mockBag.locations.push(makeSite("d1", "Otago Museum", ["Culture"], { area: "dunedin" }));
    const view = await render(<SiteListPage />);

    expect(target(view, "town").getByText("Christchurch")).toBeTruthy();
  });

  it("points at the guide button", async () => {
    const view = await render(<SiteListPage />);

    expect(target(view, "guide").getByLabelText("Travel guide")).toBeTruthy();
  });

  it("points at the category tabs", async () => {
    const view = await render(<SiteListPage />);

    expect(target(view, "browse").getAllByRole("tab")).toHaveLength(4);
  });

  // With nothing ranked, the card holds the first place listed.
  it("points at the first place, and opens it for the next step", async () => {
    const view = await render(<SiteListPage />);

    expect(target(view, "place").getByTestId("featured-card").props.accessibilityLabel).toBe("Sumner Beach");
    expect(mockStepRoutes.place).toBe("/(app)/(tabs)/sites/s1");
  });

  it("follows the list as it is filtered", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByText("Food & Drink"));

    expect(target(view, "place").getByTestId("featured-card").props.accessibilityLabel).toBe("Riverside Market");
    expect(mockStepRoutes.place).toBe("/(app)/(tabs)/sites/s3");
  });

  // Searching hides the card, so the tour falls back to the first row.
  it("points at the first row while searching", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Search places"));
    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "riv");

    expect(target(view, "place").getByText("Row Riverside Market")).toBeTruthy();
  });

  it("has no place to open when the list is empty", async () => {
    mockBag.locations = [];
    await render(<SiteListPage />);

    expect(mockStepRoutes.place).toBeUndefined();
  });
});

// The open Duo (docs/plans/duo-131.md, "Explore with the place"): the list of compact rows on
// the left under the town's head, the chosen place beside it.
describe("wide (the open Duo)", () => {
  const wide = (size?: { width: number; height: number }) => require("@blacksands/ui").__setWide(true, size);
  const UPRIGHT = { width: 669, height: 951 };
  const SIDEWAYS = { width: 951, height: 669 };
  const pane = (view: any) => view.queryByTestId("pane-place");
  const paneText = (view: any): string | undefined => pane(view)?.props.children;
  const order = (view: any, ...needles: string[]) => {
    const shown = JSON.stringify(view.toJSON());
    return needles.map((n) => shown.indexOf(n));
  };

  it("is list 268 and place 401 upright, 347 and 520 sideways, with a hairline between", async () => {
    wide(UPRIGHT);
    const upright = await render(<SiteListPage />);
    // The window is 669 wide, so the place's flex takes the 401 left of the list.
    expect(upright.getByTestId("explore-places")).toHaveStyle({ width: 268, backgroundColor: tokens.colors.band });
    expect(upright.getByTestId("explore-pane")).toHaveStyle({
      flex: 1,
      backgroundColor: tokens.colors.page,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: tokens.colors.line,
    });
    await upright.unmount();

    wide(SIDEWAYS);
    const sideways = await render(<SiteListPage />);
    // The content is 867 beside the rail: 867 less 347 is the place's 520.
    expect(sideways.getByTestId("explore-places")).toHaveStyle({ width: 347 });
    expect(sideways.getByTestId("explore-pane")).toHaveStyle({ flex: 1 });
  });

  it("is the town, then the pill and the three icons, with no teal bar", async () => {
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);

    const head = within(view.getByTestId("explore-head"));
    expect(head.getByText("Christchurch")).toBeTruthy();
    expect(head.getByLabelText("All, choose a category")).toBeTruthy();
    for (const l of ["Travel guide", "Search places", "Saved places"]) expect(head.getByLabelText(l)).toBeTruthy();
    expect(view.queryByTestId("light-status-bar")).toBeNull();
    expect(view.queryAllByRole("tab")).toHaveLength(0);
  });

  it("registers the tour targets town, guide, browse and place once each", async () => {
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);

    for (const id of ["town", "guide", "browse", "place"]) expect(view.getAllByTestId("tour-target-" + id)).toHaveLength(1);
    expect(within(view.getByTestId("tour-target-town")).getByText("Christchurch")).toBeTruthy();
    expect(within(view.getByTestId("tour-target-guide")).getByLabelText("Travel guide")).toBeTruthy();
    expect(within(view.getByTestId("tour-target-browse")).getByLabelText("All, choose a category")).toBeTruthy();
    expect(within(view.getByTestId("tour-target-place")).getByText("Row Sumner Beach")).toBeTruthy();
  });

  it("has no pill when the town has one category", async () => {
    mockBag.locations = [makeSite("s1", "A", ["Food"]), makeSite("s2", "B", ["Food"])];
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);

    expect(view.queryByLabelText(/choose a category/)).toBeNull();
  });

  it("hands the list compact rows, and chooses the first on open and shows it in the pane", async () => {
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);

    expect(mockListProps).toEqual({ compact: true, selectedId: "s1", jumpKey: 0 });
    expect(paneText(view)).toBe("Place s1 pane");
  });

  // The featured place leads the rows on a wide screen, so it is the one chosen first.
  it("chooses the featured place on open", async () => {
    mockBag.locations[2] = { ...mockBag.locations[2], featured: 5 };
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);

    expect(rowNames(view)[0]).toBe("Riverside Market");
    expect(paneText(view)).toBe("Place s3 pane");
    expect(within(view.getByTestId("tour-target-place")).getByText("Row Riverside Market")).toBeTruthy();
    expect(mockStepRoutes.place).toBe("/(app)/(tabs)/sites/s3");
    expect(view.queryByTestId("featured-card")).toBeNull();
  });

  it("shows a tapped row in the pane and does not navigate", async () => {
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByText("Row Riccarton Bush"));

    expect(paneText(view)).toBe("Place s2 pane");
    expect(mockListProps.selectedId).toBe("s2");
    expect(within(view.getByTestId("chosen-row")).getByText("Row Riccarton Bush")).toBeTruthy();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("shows the first row when the chosen place leaves the rows, and nothing with no rows", async () => {
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);
    await fireEvent.press(view.getByText("Row Riccarton Bush"));
    await fireEvent.press(view.getByLabelText("Search places"));

    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "port");
    expect(paneText(view)).toBe("Place s4 pane");

    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "zzz");
    expect(pane(view)).toBeNull();
    expect(view.getByText("No places in Christchurch match your search.")).toBeTruthy();
  });

  it("remembers the chosen place when it comes back to the rows", async () => {
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);
    await fireEvent.press(view.getByText("Row Riccarton Bush"));
    await fireEvent.press(view.getByLabelText("Search places"));
    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "port");

    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "");

    expect(paneText(view)).toBe("Place s2 pane");
  });

  it("opens the search under the head, over the rows", async () => {
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Search places"));
    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "riv");

    const [head, field, firstRow] = order(view, "explore-head", "Search places", "Row Riverside Market");
    expect(within(view.getByTestId("explore-places")).getByPlaceholderText("Search places")).toBeTruthy();
    expect(head).toBeLessThan(field);
    expect(field).toBeLessThan(firstRow);
    expect(rowNames(view)).toEqual(["Riverside Market"]);
  });

  it("keeps the guest banner and the location notice at the top of the list", async () => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
    mockBag.locStatus = "denied";
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);

    const header = within(view.getByTestId("list-header"));
    expect(header.getByText("Sign In for More")).toBeTruthy();
    expect(header.getByText("Location Disabled")).toBeTruthy();
    expect(header.queryByTestId("featured-card")).toBeNull();
  });

  it("opens the guide, and Saved places, from the head", async () => {
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Travel guide"));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/(app)/(tabs)/guide", params: { region: "canterbury" } });
    await fireEvent.press(view.getByLabelText("Saved places"));
    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/saved-sites");
  });

  it("keeps state across the breakpoint: fold keeps the list and the chosen id, unfold shows it again", async () => {
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);
    await fireEvent.press(view.getByText("Row Riccarton Bush"));
    expect(mockListMounts).toBe(1);

    require("@blacksands/ui").__setWide(false);
    await view.rerender(<SiteListPage />);
    expect(pane(view)).toBeNull();
    expect(mockListProps.compact).toBeFalsy();
    expect(mockRouter.push).not.toHaveBeenCalled();

    wide(UPRIGHT);
    await view.rerender(<SiteListPage />);

    expect(paneText(view)).toBe("Place s2 pane");
    expect(mockListMounts).toBe(1);
  });

  it("opens the category pop-up from the pill, and choosing a category filters the rows and closes it", async () => {
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);
    expect(view.queryByTestId("category-sheet")).toBeNull();

    await fireEvent.press(view.getByLabelText("All, choose a category"));
    const sheet = within(view.getByTestId("category-sheet"));
    expect(sheet.getAllByRole("button").map((b: any) => b.props.accessibilityLabel)).toEqual([
      "Close",
      "All",
      ...(["Walks", "Water", "Food"] as const).map((c) => SITE_CATEGORY_LABELS[c]),
    ]);

    await fireEvent.press(sheet.getByLabelText(SITE_CATEGORY_LABELS.Food));
    expect(view.queryByTestId("category-sheet")).toBeNull();
    expect(rowsOnly(view)).toEqual(["Riverside Market"]);
    expect(view.getByLabelText("Food & Drink, choose a category")).toBeTruthy();
  });

  it("folding closes the pop-up and keeps the chosen category", async () => {
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);
    await fireEvent.press(view.getByLabelText("All, choose a category"));
    await fireEvent.press(within(view.getByTestId("category-sheet")).getByLabelText("Food & Drink"));
    await fireEvent.press(view.getByLabelText("Food & Drink, choose a category"));
    expect(view.getByTestId("category-sheet")).toBeTruthy();

    require("@blacksands/ui").__setWide(false);
    await view.rerender(<SiteListPage />);

    expect(view.queryByTestId("category-sheet")).toBeNull();
    expect(selectedTab(view)).toBe("Food & Drink");
    expect(rowNames(view)).toEqual(["Riverside Market"]);
  });

  it("keeps the search field with the list across the fold", async () => {
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);
    await fireEvent.press(view.getByLabelText("Search places"));

    require("@blacksands/ui").__setWide(false);
    await view.rerender(<SiteListPage />);

    expect(view.getByPlaceholderText("Search places")).toBeTruthy();
    expect(mockListMounts).toBe(1);
  });

  it("starts the head at the status bar's inset plus 16, and the place's photo 8 under that", async () => {
    mockInsetTop = 37;
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);

    expect(view.getByTestId("explore-head")).toHaveStyle({ paddingTop: 53 });
    expect(view.getByTestId("explore-pane")).toHaveStyle({ paddingTop: 61 });
  });

  it("sideways, with no inset, starts the head 32 from the top and the place 40", async () => {
    mockInsetTop = 0;
    wide(SIDEWAYS);
    const view = await render(<SiteListPage />);

    expect(view.getByTestId("explore-head")).toHaveStyle({ paddingTop: 32 });
    expect(view.getByTestId("explore-pane")).toHaveStyle({ paddingTop: 40 });
  });

  it("keeps the light status bar and the plain list on a phone, and no light bar on the Duo", async () => {
    const phone = await render(<SiteListPage />);
    expect(phone.getByTestId("light-status-bar")).toBeTruthy();
    expect(pane(phone)).toBeNull();
    expect(mockListProps.compact).toBeFalsy();
    await phone.unmount();

    wide(UPRIGHT);
    const duo = await render(<SiteListPage />);
    expect(duo.queryByTestId("light-status-bar")).toBeNull();
  });

  // Last in the describe: the town it shows is picked by the places' area.
  it("shows Aoraki / Mount Cook as Mt Cook in the head on the Duo", async () => {
    mockBag.locations = [makeSite("m1", "Hooker Valley", ["Walks"], { area: "aoraki-mount-cook", region: "aoraki-mackenzie" })];
    wide(UPRIGHT);
    const view = await render(<SiteListPage />);
    expect(within(view.getByTestId("explore-head")).getByText("Mt Cook")).toBeTruthy();
    expect(view.queryByText(/Aoraki/)).toBeNull();
  });

  it("keeps Aoraki / Mount Cook's full name on the phone", async () => {
    mockBag.locations = [makeSite("m1", "Hooker Valley", ["Walks"], { area: "aoraki-mount-cook", region: "aoraki-mackenzie" })];
    const view = await render(<SiteListPage />);
    expect(view.queryByText("Mt Cook")).toBeNull();
    expect(view.getAllByText("Aoraki / Mount Cook").length).toBeGreaterThan(0);
  });
});

describe("the trip's places", () => {
  afterEach(() => require("@blacksands/ui").__setWide(false));

  it("marks the trip's places In trip, on cards and on the Duo's rows", async () => {
    mockTrips = trip("s2", "s3");
    const phone = await render(<SiteListPage />);
    const rows = phone.queryAllByText(/^Row in trip /).map((n: any) => n.props.children);
    // The featured card is the real card; the rows are the list's.
    expect(rows).toHaveLength(2);
    // Sumner Beach is the featured card: not in the trip, so no badge on it.
    expect(phone.queryByText("In trip")).toBeNull();
    expect(phone.queryAllByText("Row in trip Sumner Beach")).toHaveLength(0);
    phone.unmount();

    require("@blacksands/ui").__setWide(true, { width: 669, height: 951 });
    const duo = await render(<SiteListPage />);
    expect(duo.queryAllByText(/^Row in trip /)).toHaveLength(2);
  });

  it("marks nothing for a guest", async () => {
    mockSession.status = "guest";
    mockTrips = [];
    const view = await render(<SiteListPage />);

    expect(view.queryByText("In trip")).toBeNull();
    expect(view.queryAllByText(/^Row in trip /)).toHaveLength(0);
  });
});
