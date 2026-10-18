// The Explore tab. What south-island adds over rotorua-guide: the list shows one town at a
// time, named in the bar's title, which is a dropdown of the towns that have places; and the
// category tab row: "All" plus only the categories that have (active) places in that town,
// hidden entirely when there's just one, and combined with the name search. Also pinned: a
// guest's sign-in card and the location-denied card.

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
        // What's passed as `header` scrolls away with the rows; the testID lets a test tell
        // that apart from the bar fixed above the list.
        React.createElement(View, { testID: "list-header" }, header),
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

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
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
    await fireEvent.press(view.getByLabelText("Search Locations"));

    await fireEvent.changeText(view.getByPlaceholderText("Search Locations"), "surf");

    expect(rowNames(view)).toEqual(["Sumner Beach"]);
  });

  it("also matches a category by the label on its tab", async () => {
    const view = await render(<SiteListPage />);
    await fireEvent.press(view.getByLabelText("Search Locations"));

    // "drink" is in no name; it is in the Food category's label, "Food & Drink".
    await fireEvent.changeText(view.getByPlaceholderText("Search Locations"), "drink");

    expect(rowNames(view)).toEqual(["Riverside Market"]);
  });

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
    expect(view.getByText("No Locations in Christchurch match your search.")).toBeTruthy();
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
    it("starts on Christchurch with no position", async () => {
      const view = await render(<SiteListPage />);

      expect(rowNames(view)).toEqual(["Sumner Beach", "Riccarton Bush", "Riverside Market", "Port Hills Walk"]);
      expect(view.getByText("Christchurch")).toBeTruthy();
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

    it("starts on Christchurch for someone off the island", async () => {
      mockBag.storedLoc = AUCKLAND;
      const view = await render(<SiteListPage />);

      expect(view.getByText("Christchurch")).toBeTruthy();
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

    it("starts on the first town that has places when Christchurch has none", async () => {
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
      expect(within(titleRow).getByLabelText("Search Locations")).toBeTruthy();
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

    // A town's region is the one its places are in; the guide's region names head them.
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
      await fireEvent.press(view.getByLabelText("Search Locations"));

      await fireEvent.changeText(view.getByPlaceholderText("Search Locations"), "beach");

      expect(rowNames(view)).toEqual(["Sumner Beach"]);
    });

    it("names the town when a search finds nothing in it", async () => {
      const view = await render(<SiteListPage />);
      await fireEvent.press(view.getByLabelText("Search Locations"));

      await fireEvent.changeText(view.getByPlaceholderText("Search Locations"), "museum");

      expect(view.getByText("No Locations in Christchurch match your search.")).toBeTruthy();
    });
  });
});
