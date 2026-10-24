// The Explore tab. What south-island adds over rotorua-guide: the list shows one town at a
// time, named in the bar's title, which is a dropdown of the towns that have places; and the
// category tab row: "All" plus only the categories that have (active) places in that town,
// hidden entirely when there's just one, and combined with the name search. Also pinned: a
// guest's sign-in card and the location-denied card.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { LinearGradient: ({ children, style }: any) => React.createElement(View, { style }, children) };
});

// The list is a FlashList wrapper with its own file; here it only has to show the rows it
// was handed, in order, and pass taps back.
jest.mock("@/components/sites/list/ListView", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return {
    ListView: ({ rows, header, onPressItem, ListEmptyComponent, firstRowTarget }: any) =>
      React.createElement(
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
                  { onPress: () => onPressItem(r.location.id), accessibilityRole: "button" },
                  React.createElement(Text, null, "Row " + r.location.name),
                ),
              ),
            ),
      ),
  };
});

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    // The town menu sits in one, to clear the status bar.
    SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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
import { Linking } from "react-native";
import { fireEvent, render, within } from "@testing-library/react-native";

import SiteListPage from "@/app/(app)/(tabs)/sites/index";
import { tokens } from "@/lib/ui/tokens";

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
  mockBag.loc = null;
  mockBag.storedLoc = null;
  delete mockParams.area;
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
  it("links to the travel guide", async () => {
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

  // The tabs sit on the dark brand bar. The selected one takes the highlight's on-dark
  // twin; the rest are full white, not muted, so they're easy to read.
  it("marks the selected tab in the highlight colour, and the rest in white", async () => {
    const view = await render(<SiteListPage />);

    expect(view.getByText("All")).toHaveStyle({ color: tokens.colors.highlightOnDark });
    expect(view.getByText("Walks")).toHaveStyle({ color: "#FFFFFF" });
  });

  // Plain words with nothing under them didn't look like something to tap.
  it("underlines every tab, so the unselected ones still read as tabs", async () => {
    const view = await render(<SiteListPage />);
    const underlineOf = (label: string) => {
      const tab = view.getAllByRole("tab").find((t: any) => textOf(t) === label)!;
      const kids = tab.children.filter((c: any) => typeof c !== "string");
      return kids[kids.length - 1];
    };

    expect(underlineOf("All")).toHaveStyle({ backgroundColor: tokens.colors.highlightOnDark });
    expect(underlineOf("Walks")).not.toHaveStyle({ backgroundColor: "transparent" });
    expect(underlineOf("Walks")).not.toHaveStyle({ backgroundColor: tokens.colors.highlightOnDark });
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
// rotorua-guide's and aklguide's hero card: the place ranked highest by `featured` (higher
// is more featured) among those shown, in a card at the top of the list and not again in
// the rows under it.
describe("the featured place", () => {
  const card = (view: any) => view.queryByLabelText(/^Featured: /);
  const rank = (id: string, featured: number) => {
    mockBag.locations.find((l) => l.id === id)!.featured = featured;
  };

  it("shows the highest-ranked place in a card above the list, and not again in it", async () => {
    rank("s2", 3);
    rank("s4", 1);
    mockBag.locations[1].description = "Old-growth forest in the city.";
    const view = await render(<SiteListPage />);

    const header = within(view.getByTestId("list-header"));
    expect(header.getByLabelText("Featured: Riccarton Bush")).toBeTruthy();
    expect(header.getByText("Riccarton Bush")).toBeTruthy();
    expect(header.getByText("Old-growth forest in the city.")).toBeTruthy();
    expect(rowNames(view)).toEqual(["Sumner Beach", "Riverside Market", "Port Hills Walk"]);
  });

  it("opens the featured place when its card is tapped", async () => {
    rank("s2", 3);
    const view = await render(<SiteListPage />);

    await fireEvent.press(card(view));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/sites/s2");
  });

  it("features a place from the town shown, not a higher-ranked one elsewhere", async () => {
    rank("s2", 3);
    mockBag.locations.push(makeSite("d1", "Otago Museum", ["Culture"], { area: "dunedin", featured: 9 }));
    const view = await render(<SiteListPage />);

    expect(card(view).props.accessibilityLabel).toBe("Featured: Riccarton Bush");
  });

  it("features the highest-ranked place in the chosen category", async () => {
    rank("s1", 5);
    rank("s2", 3);
    const view = await render(<SiteListPage />);
    expect(card(view).props.accessibilityLabel).toBe("Featured: Sumner Beach");

    await fireEvent.press(view.getByText("Walks"));

    expect(card(view).props.accessibilityLabel).toBe("Featured: Riccarton Bush");
    expect(rowNames(view)).toEqual(["Port Hills Walk"]);
  });

  // "Featured" is a pick someone made. With none made here, no place is passed off as one.
  it("has no card when no place shown is ranked", async () => {
    rank("s1", 0);
    rank("s4", 2);
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByText("Food & Drink"));

    expect(card(view)).toBeNull();
    expect(rowNames(view)).toEqual(["Riverside Market"]);
  });

  it("puts the featured place back among the rows while searching", async () => {
    rank("s2", 3);
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByLabelText("Search places"));
    await fireEvent.changeText(view.getByPlaceholderText("Search places"), "riccarton");

    expect(card(view)).toBeNull();
    expect(rowNames(view)).toEqual(["Riccarton Bush"]);
  });
});

describe("the tour", () => {
  const target = (view: any, id: string) => within(view.getByTestId("tour-target-" + id));

  it("points at the featured place when there is one, and opens it for the next step", async () => {
    mockBag.locations[3].featured = 2;
    const view = await render(<SiteListPage />);

    expect(target(view, "place").getByLabelText("Featured: Port Hills Walk")).toBeTruthy();
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

  it("points at the first place, and opens it for the next step", async () => {
    const view = await render(<SiteListPage />);

    expect(target(view, "place").getByText("Row Sumner Beach")).toBeTruthy();
    expect(mockStepRoutes.place).toBe("/(app)/(tabs)/sites/s1");
  });

  it("follows the list as it is filtered", async () => {
    const view = await render(<SiteListPage />);

    await fireEvent.press(view.getByText("Food & Drink"));

    expect(target(view, "place").getByText("Row Riverside Market")).toBeTruthy();
    expect(mockStepRoutes.place).toBe("/(app)/(tabs)/sites/s3");
  });

  it("has no place to open when the list is empty", async () => {
    mockBag.locations = [];
    await render(<SiteListPage />);

    expect(mockStepRoutes.place).toBeUndefined();
  });
});
