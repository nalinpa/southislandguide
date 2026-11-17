// The Map tab. What south-island changes over rotorua-guide: the category chips are "All" plus
// every category (all nine, whether or not a place has it yet), "Add to Trip" is hidden
// for Stay via canAddToItinerary, the map opens on the user when a place is near them, and 1.0
// has no paid unlock — the real useEntitlementGate stub is used, so nothing is ever locked,
// there's no premium banner and no paywall before adding to a trip.

// The engine's TripChoiceSheet records the props the screen hands it, so a test can see the
// wide card and the dark edge. Everything else is the shared stand-in.
const mockSheets: { trip?: any } = {};
jest.mock("@/lib/uiKit", () => {
  const kit = require("@/test/uiKitMock");
  return {
    ...kit,
    components: {
      ...kit.components,
      TripChoiceSheet: (p: any) => {
        mockSheets.trip = p;
        return kit.components.TripChoiceSheet(p);
      },
    },
  };
});

// react-native-maps needs a native surface; the stand-in reports the markers it was given.
jest.mock("@/components/map/SitesMapView", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return {
    __esModule: true,
    initialRegionFrom: () => ({ latitude: -43.53, longitude: 172.63, latitudeDelta: 0.15, longitudeDelta: 0.15 }),
    SitesMapView: React.forwardRef(({ sites, mapType, onPressSite, offlineTilesDir }: any, ref: any) => {
      // A fold mustn't mount the map again: it would lose its zoom and where it is looking.
      React.useEffect(() => {
        mockMapMounts.count++;
      }, []);
      React.useImperativeHandle(ref, () => ({
        recenter: mockMapHandle.recenter,
        focusOn: jest.fn(),
        showIsland: mockMapHandle.showIsland,
      }));
      return React.createElement(
        View,
        null,
        React.createElement(Text, null, "Map (" + mapType + ") with " + sites.length + " markers"),
        offlineTilesDir ? React.createElement(Text, null, "Saved map from " + offlineTilesDir) : null,
        sites.map((s: any) =>
          React.createElement(
            TouchableOpacity,
            { key: s.id, onPress: () => onPressSite(s.id), accessibilityRole: "button" },
            React.createElement(Text, null, "Marker " + s.name),
          ),
        ),
      );
    }),
  };
});

let mockInsetTop = 0;

jest.mock("@/components/map/MapOverlay", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return {
    MapOverlayCard: ({ site, onOpen, onAddToItinerary, nearbySites, chipsOpen }: any) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, "Nearby count: " + nearbySites.length),
        React.createElement(Text, null, "Nearby: " + nearbySites.map((n: any) => n.name).join(", ")),
        React.createElement(Text, null, "Chips open: " + !!chipsOpen),
        React.createElement(Text, null, site ? "Overlay: " + site.name : "Overlay: nothing selected"),
        React.createElement(
          TouchableOpacity,
          { onPress: onOpen, accessibilityRole: "button" },
          React.createElement(Text, null, "Open site"),
        ),
        // Absent, not disabled, when the screen passes no handler.
        onAddToItinerary
          ? React.createElement(
              TouchableOpacity,
              { onPress: onAddToItinerary, accessibilityRole: "button" },
              React.createElement(Text, null, "Add to Trip"),
            )
          : null,
      ),
  };
});

const stubModal = (label: string, prop = "visible") => (props: any) => {
  const React = require("react");
  const { Text } = require("react-native");
  return props[prop] ? React.createElement(Text, null, label) : null;
};
jest.mock("@/components/itinerary/CreateItineraryModal", () => ({
  CreateItineraryModal: stubModal("Create Trip Modal"),
}));
jest.mock("@/components/itinerary/AddToTripModal", () => ({ AddToTripModal: stubModal("Add To Trip Modal", "site") }));
jest.mock("@/components/itinerary/PremiumFeatureModal", () => ({
  PremiumFeatureModal: stubModal("Premium Modal"),
}));

jest.mock("@gorhom/bottom-sheet", () => ({ __esModule: true, default: () => null }));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaView: ({ children, style, testID }: any) => React.createElement(View, { style, testID }, children),
    useSafeAreaInsets: () => ({ top: mockInsetTop, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 1, Error: 2 },
}));

const mockSession = { status: "authed", uid: "uid-1" } as any;
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: mockSession }) }));

const mockIap = { requestBuy: jest.fn() };
jest.mock("@/lib/iap/PurchaseProvider", () => ({ usePurchaseContext: () => mockIap }));

const mockTrips = { itineraries: [] as any[], addFlow: "create" as "create" | "choose" | "pick" | null };
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));

const mockMapStore = { selectedLocationId: null as string | null, setSelectedLocationId: jest.fn() };
const mockMapMounts = { count: 0 };
const mockMapHandle = { recenter: jest.fn(), showIsland: jest.fn() };
const mockBag = {
  locations: [] as any[],
  loading: false,
  err: null as string | null,
  loc: null as any,
  locErr: null as string | null,
  locStatus: "granted" as string,
};
jest.mock("@/lib/hooksBag", () => ({
  hooksBag: {
    useLocations: () => ({ locations: mockBag.locations, loading: mockBag.loading, err: mockBag.err }),
    useUserLocation: () => ({ loc: mockBag.loc, err: mockBag.locErr, status: mockBag.locStatus }),
    useMapStore: () => ({
      selectedLocationId: mockMapStore.selectedLocationId,
      setSelectedLocationId: (id: string) => {
        mockMapStore.selectedLocationId = id;
        mockMapStore.setSelectedLocationId(id);
      },
    }),
  },
}));

const mockNet = { isConnected: true as boolean | null, isInternetReachable: true as boolean | null };
jest.mock("@react-native-community/netinfo", () => ({ useNetInfo: () => mockNet }));

// The map saved for no signal: whether it's on the phone (useOfflineMap.test.tsx), and where.
const mockOfflineMap = { level: null as "standard" | "detailed" | null };
jest.mock("@/lib/hooks/useOfflineMap", () => ({ useOfflineMap: () => mockOfflineMap }));
jest.mock("@/lib/offlineMap", () => ({ offlineMapDir: () => ({ uri: "file:///c/offline-map" }) }));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

import React from "react";
import { Alert, Linking, StyleSheet, TextInput } from "react-native";
import { act, fireEvent, render, within } from "@testing-library/react-native";

import MapScreen from "@/app/(app)/(tabs)/map/index";
import { PLANNER } from "@/lib/constants/gameplay";
import { SITE_CATEGORIES, SITE_CATEGORY_LABELS } from "@/lib/models";
import { darkEdge, tokens } from "@/lib/ui/tokens";

const makeSite = (id: string, name: string, category: string[], over: Record<string, unknown> = {}) => ({
  id,
  name,
  lat: -43.53,
  lng: 172.63,
  category,
  active: true,
  featured: 0,
  description: "",
  ...over,
});

// The filter toggle is icon-only; its accessible name is the way to find it.
const openFilters = async (view: any) => {
  await fireEvent.press(view.getByLabelText("Filter by category"));
};

// The search box debounces by 300ms before the markers rebuild.
const settleSearch = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 350));
  });
};

const markers = (view: any): string[] =>
  view.queryAllByText(/^Marker /).map((n: any) => String(n.props.children).replace(/^Marker /, ""));

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.status = "authed";
  mockSession.uid = "uid-1";
  mockTrips.itineraries = [];
  mockTrips.addFlow = "create";
  mockMapStore.selectedLocationId = null;
  mockBag.locations = [
    makeSite("s1", "Sumner Beach", ["Water", "Scenic"], { lat: -43.57, lng: 172.76 }),
    makeSite("s2", "Riccarton Bush", ["Walks", "Nature"], { lat: -43.525, lng: 172.6, featured: 5 }),
    makeSite("s3", "Riverside Market", ["Food"], { lat: -43.531, lng: 172.634 }),
    makeSite("s4", "The George", ["Stay"], { lat: -43.528, lng: 172.625 }),
  ];
  mockBag.loading = false;
  mockBag.err = null;
  mockBag.loc = null;
  mockBag.locErr = null;
  mockBag.locStatus = "granted";
  mockNet.isConnected = true;
  mockNet.isInternetReachable = true;
  mockOfflineMap.level = null;
  mockMapMounts.count = 0;
  mockSheets.trip = undefined;
});

// Online, Apple Maps is clearer and has names; the saved map is only for no signal.
describe("the saved map", () => {
  it.each([
    [false, false, false],
    [false, true, false],
    [true, false, false],
    [true, true, true],
  ])("passes the folder only when offline and saved (offline %s, saved %s)", async (offline, saved, passed) => {
    mockNet.isConnected = !offline;
    mockOfflineMap.level = saved ? "standard" : null;
    const view = await render(<MapScreen />);

    expect(view.queryByText("Saved map from file:///c/offline-map") !== null).toBe(passed);
    // CC BY 4.0 asks for the credit wherever the LINZ map shows.
    expect(view.queryByText("Map: LINZ Data Service, CC BY 4.0") !== null).toBe(passed);
  });

  // Under the search bar, where the bottom sheet can't cover it (owner, 2026-11-11).
  it("puts the credit in the top stack, and a tap opens the licence", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    mockNet.isConnected = false;
    mockOfflineMap.level = "standard";
    const view = await render(<MapScreen />);

    expect(within(view.getByTestId("map-top-stack")).getByText("Map: LINZ Data Service, CC BY 4.0")).toBeTruthy();
    await fireEvent.press(view.getByRole("link", { name: "Map: LINZ Data Service, CC BY 4.0" }));
    expect(openURL).toHaveBeenCalledWith("https://creativecommons.org/licenses/by/4.0/");
    openURL.mockRestore();
  });
});

describe("loading and failure", () => {
  it("waits for the places", async () => {
    mockBag.loading = true;
    const view = await render(<MapScreen />);
    expect(view.getByText("Loading map...")).toBeTruthy();
  });

  it("shows an error when nothing could be loaded", async () => {
    mockBag.err = "offline";
    mockBag.locations = [];
    const view = await render(<MapScreen />);
    expect(view.getByText("Map Error")).toBeTruthy();
  });

  it("keeps the map up when a refetch fails but places are cached", async () => {
    mockBag.err = "offline";
    const view = await render(<MapScreen />);
    expect(view.queryByText("Map Error")).toBeNull();
    expect(markers(view)).toHaveLength(4);
  });
});

describe("markers", () => {
  it("draws every active place and leaves out inactive ones", async () => {
    mockBag.locations.push(makeSite("s5", "Closed Gallery", ["Culture"], { active: false }));
    const view = await render(<MapScreen />);

    expect(markers(view)).toEqual(["Sumner Beach", "Riccarton Bush", "Riverside Market", "The George"]);
  });

  it("locks nothing in 1.0, so there is no premium banner", async () => {
    const view = await render(<MapScreen />);
    expect(view.queryByText(/Premium/)).toBeNull();
  });
});

describe("map controls", () => {
  // They used to be pinned 40% down the screen, where the bottom sheet grows up over them
  // and they covered its distance and Directions button. They now flow under the search bar.
  it("sit in the stack under the search bar, not pinned over the sheet", async () => {
    const view = await render(<MapScreen />);

    const controls = view.getByLabelText("Centre on my location").parent;

    expect(view.getByLabelText("Switch map type")).toBeTruthy();
    expect(controls).not.toHaveStyle({ position: "absolute" });
  });

  // Tester, 2026-11-14, in the US: the map couldn't zoom out far enough to find the island.
  it("shows the island, and says why, for someone overseas", async () => {
    mockBag.loc = { coords: { latitude: 37.77, longitude: -122.42 } }; // San Francisco
    const view = await render(<MapScreen />);

    await fireEvent.press(view.getByLabelText("Centre on my location"));

    expect(mockMapHandle.showIsland).toHaveBeenCalled();
    expect(mockMapHandle.recenter).not.toHaveBeenCalled();
    expect(view.getByText("You're not in New Zealand yet")).toBeTruthy();
  });

  it("centres on the phone anywhere in New Zealand, the North Island too", async () => {
    mockBag.loc = { coords: { latitude: -41.29, longitude: 174.78 } }; // Wellington
    const view = await render(<MapScreen />);

    await fireEvent.press(view.getByLabelText("Centre on my location"));

    expect(mockMapHandle.recenter).toHaveBeenCalledWith(-41.29, 174.78);
    expect(mockMapHandle.showIsland).not.toHaveBeenCalled();
    expect(view.queryByText("You're not in New Zealand yet")).toBeNull();
  });
});

describe("category chips", () => {
  it("marks the chosen category in the highlight colour, and only that one", async () => {
    const view = await render(<MapScreen />);
    await openFilters(view);

    await fireEvent.press(view.getByText("Scenic"));

    expect(view.getByRole("button", { name: "Scenic" })).toHaveStyle({ backgroundColor: tokens.colors.accent });
    expect(view.getByRole("button", { name: "Culture" })).not.toHaveStyle({
      backgroundColor: tokens.colors.accent,
    });
  });

  // Changed in round 3 (owner, 2026-11-16): this used to assert the chips stayed up with the
  // button tapped shut. Now tapping it while the row is open clears the category and closes it.
  it("the filter button, tapped with a category chosen, clears it back to All and closes the row", async () => {
    const view = await render(<MapScreen />);
    await openFilters(view);
    await fireEvent.press(view.getByText("Scenic"));
    expect(markers(view)).toEqual(["Sumner Beach"]);

    await openFilters(view);

    expect(view.queryByTestId("map-chips")).toBeNull();
    expect(markers(view).length).toBeGreaterThan(1);
    // Tapped again while closed: it opens, with All chosen.
    await openFilters(view);
    expect(view.getByRole("button", { name: "All" })).toHaveStyle({ backgroundColor: tokens.colors.accent });
  });

  it("the filter button on the Duo does the same", async () => {
    require("@blacksands/ui").__setWide(true, { width: 669, height: 951 });
    const view = await render(<MapScreen />);
    await openFilters(view);
    await fireEvent.press(view.getByText("Scenic"));
    expect(markers(view)).toEqual(["Sumner Beach"]);

    await openFilters(view);

    expect(view.queryByTestId("map-chips")).toBeNull();
    expect(view.getByText("Chips open: false")).toBeTruthy();
    expect(markers(view).length).toBeGreaterThan(1);
  });

  it("are hidden until the filter button is pressed", async () => {
    const view = await render(<MapScreen />);
    expect(view.queryByText("All")).toBeNull();

    await openFilters(view);

    expect(view.getByText("All")).toBeTruthy();
  });

  // Tester, 2026-11-11: the map couldn't show just the trip's places. Owner: out on the
  // map, not behind the filter button.
  it("leave My Trip out on the map, where a tap shows only the trip's places", async () => {
    mockTrips.itineraries = [{ id: "t1", days: [{ id: "d1", items: [{ siteId: "s1" }, { siteId: "s3" }] }] }];
    const view = await render(<MapScreen />);

    await fireEvent.press(view.getByRole("button", { name: "My Trip" }));
    expect(markers(view).sort()).toEqual(["Riverside Market", "Sumner Beach"]);
    expect(view.queryByText("All")).toBeNull();

    await fireEvent.press(view.getByRole("button", { name: "My Trip" }));
    expect(markers(view)).toHaveLength(4);
  });

  it("turn My Trip off when the trip loses its last place, so the pins come back", async () => {
    mockTrips.itineraries = [{ id: "t1", days: [{ id: "d1", items: [{ siteId: "s1" }] }] }];
    const view = await render(<MapScreen />);
    await fireEvent.press(view.getByRole("button", { name: "My Trip" }));
    expect(markers(view)).toEqual(["Sumner Beach"]);

    mockTrips.itineraries = [{ id: "t1", days: [{ id: "d1", items: [] }] }];
    await view.rerender(<MapScreen />);
    expect(markers(view)).toHaveLength(4);
    expect(view.queryByText("My Trip")).toBeNull();

    // Back again, it starts off.
    mockTrips.itineraries = [{ id: "t1", days: [{ id: "d1", items: [{ siteId: "s3" }] }] }];
    await view.rerender(<MapScreen />);
    expect(markers(view)).toHaveLength(4);
  });

  it("don't include My Trip, which has its own button", async () => {
    mockTrips.itineraries = [{ id: "t1", days: [{ id: "d1", items: [{ siteId: "s1" }] }] }];
    const view = await render(<MapScreen />);
    await openFilters(view);

    expect(view.getAllByText("My Trip")).toHaveLength(1);
  });

  it("have no My Trip without places in a trip", async () => {
    mockTrips.itineraries = [{ id: "t1", days: [{ id: "d1", items: [] }] }];
    const view = await render(<MapScreen />);

    expect(view.queryByText("My Trip")).toBeNull();
  });

  it("offer All plus every category, including ones with no places yet", async () => {
    const view = await render(<MapScreen />);
    await openFilters(view);

    for (const c of SITE_CATEGORIES) expect(view.getByText(SITE_CATEGORY_LABELS[c])).toBeTruthy();
    expect(view.getByText("Culture")).toBeTruthy();
  });

  it("narrow the markers to a category, matching any of a place's categories", async () => {
    const view = await render(<MapScreen />);
    await openFilters(view);

    await fireEvent.press(view.getByText("Scenic"));

    expect(markers(view)).toEqual(["Sumner Beach"]);
  });

  it("show no markers for a category with no places, rather than all of them", async () => {
    const view = await render(<MapScreen />);
    await openFilters(view);

    await fireEvent.press(view.getByText("Culture"));

    expect(markers(view)).toEqual([]);
  });

  it("go back to everything on All", async () => {
    const view = await render(<MapScreen />);
    await openFilters(view);
    await fireEvent.press(view.getByText("Food & Drink"));

    await fireEvent.press(view.getByText("All"));

    expect(markers(view)).toHaveLength(4);
  });
});

describe("search", () => {
  it("narrows the markers to what was typed", async () => {
    const view = await render(<MapScreen />);

    await fireEvent.changeText(view.getByPlaceholderText("Search places..."), "RIC");
    await settleSearch();

    expect(markers(view)).toEqual(["Riccarton Bush"]);
  });

  // The same search as Explore's. It used to match names only, so "beach" or "food" found
  // places on Explore and nothing here.
  it("finds a place by its description or its category, not just its name", async () => {
    mockBag.locations[1] = { ...mockBag.locations[1], description: "Old-growth kahikatea forest." };
    const view = await render(<MapScreen />);

    await fireEvent.changeText(view.getByPlaceholderText("Search places..."), "kahikatea");
    await settleSearch();
    expect(markers(view)).toEqual(["Riccarton Bush"]);

    await fireEvent.changeText(view.getByPlaceholderText("Search places..."), "drink");
    await settleSearch();
    expect(markers(view)).toEqual(["Riverside Market"]);
  });

  it("selects the place when the search leaves exactly one", async () => {
    const view = await render(<MapScreen />);

    await fireEvent.changeText(view.getByPlaceholderText("Search places..."), "sumner");
    await settleSearch();

    expect(mockMapStore.setSelectedLocationId).toHaveBeenLastCalledWith("s1");
  });

  it("clears an active category filter as soon as a search is typed", async () => {
    const view = await render(<MapScreen />);
    await openFilters(view);
    await fireEvent.press(view.getByText("Food & Drink"));
    expect(markers(view)).toEqual(["Riverside Market"]);

    // Sumner Beach isn't Food: with the filter still on, this would match nothing.
    await fireEvent.changeText(view.getByPlaceholderText("Search places..."), "sumner");
    await settleSearch();

    expect(markers(view)).toEqual(["Sumner Beach"]);
  });
});

describe("what opens selected", () => {
  it("picks the featured place for a visitor outside the coverage area", async () => {
    mockBag.loc = { coords: { latitude: -36.85, longitude: 174.76 } }; // Auckland
    await render(<MapScreen />);
    expect(mockMapStore.setSelectedLocationId).toHaveBeenCalledWith("s2");
  });

  it("picks the nearest place for a visitor inside it", async () => {
    mockBag.loc = { coords: { latitude: -43.569, longitude: 172.759 } }; // Sumner
    await render(<MapScreen />);
    expect(mockMapStore.setSelectedLocationId).toHaveBeenCalledWith("s1");
  });

  // The box around Christchurch used to be the only "here": someone in Dunedin got the
  // featured place, 300 km away.
  it("picks the nearest place for a visitor in another town", async () => {
    mockBag.locations.push(makeSite("d1", "Otago Museum", ["Culture"], { lat: -45.8656, lng: 170.5107, area: "dunedin" }));
    mockBag.loc = { coords: { latitude: -45.874, longitude: 170.504 } }; // the Octagon
    await render(<MapScreen />);
    expect(mockMapStore.setSelectedLocationId).toHaveBeenCalledWith("d1");
  });

  // Oamaru is 74 km from anything. Not the nearest place (a camping area up the coast) and
  // not the Christchurch favourite either: the nearest town's own.
  it("picks the nearest town's featured place for a visitor between towns", async () => {
    mockBag.locations.push(
      makeSite("d1", "Warrington Domain", ["Stay"], { lat: -45.71, lng: 170.59, area: "dunedin" }),
      makeSite("d2", "St Clair Pool", ["Water"], { lat: -45.912, lng: 170.489, area: "dunedin", featured: 4 }),
    );
    mockBag.loc = { coords: { latitude: -45.1, longitude: 170.97 } }; // Oamaru
    await render(<MapScreen />);
    expect(mockMapStore.setSelectedLocationId).toHaveBeenCalledWith("d2");
  });

  // Queenstown is the town Explore opens on for them too (lib/areas.ts DEFAULT_AREA), so
  // the map starts there, not on a higher-ranked place in another town.
  it("picks Queenstown's featured place for a visitor off the island", async () => {
    mockBag.locations.push(
      makeSite("q1", "Queenstown Gardens", ["Walks"], { lat: -45.036, lng: 168.66, area: "queenstown" }),
      makeSite("q2", "Skyline Queenstown", ["Scenic"], { lat: -45.03, lng: 168.65, area: "queenstown", featured: 2 }),
    );
    mockBag.loc = { coords: { latitude: -36.85, longitude: 174.76 } }; // Auckland
    await render(<MapScreen />);
    expect(mockMapStore.setSelectedLocationId).toHaveBeenCalledWith("q2");
  });

  it("picks Queenstown's featured place when location is denied", async () => {
    mockBag.locations.push(
      makeSite("q2", "Skyline Queenstown", ["Scenic"], { lat: -45.03, lng: 168.65, area: "queenstown", featured: 2 }),
    );
    mockBag.locStatus = "denied";
    await render(<MapScreen />);
    expect(mockMapStore.setSelectedLocationId).toHaveBeenCalledWith("q2");
  });

  it("falls back to the featured place when location is denied", async () => {
    mockBag.locStatus = "denied";
    await render(<MapScreen />);
    expect(mockMapStore.setSelectedLocationId).toHaveBeenCalledWith("s2");
  });

  it("opens the selected place's detail screen", async () => {
    mockMapStore.selectedLocationId = "s3";
    const view = await render(<MapScreen />);

    await fireEvent.press(view.getByText("Open site"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/sites/s3");
  });
});

describe("adding to an itinerary", () => {
  it("asks a guest to sign in, opening nothing", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockSession.status = "guest";
    mockSession.uid = undefined;
    mockTrips.addFlow = null;
    mockMapStore.selectedLocationId = "s3";
    const view = await render(<MapScreen />);

    await fireEvent.press(view.getByText("Add to Trip"));

    expect(alertSpy).toHaveBeenCalledWith("Sign In Required", "Sign in to plan your trip.", expect.any(Array));
    expect(view.queryByText("Create Trip Modal")).toBeNull();
    alertSpy.mockRestore();
  });

  it("isn't offered for a Stay", async () => {
    mockMapStore.selectedLocationId = "s4";
    const view = await render(<MapScreen />);

    expect(view.getByText("Overlay: The George")).toBeTruthy();
    expect(view.queryByText("Add to Trip")).toBeNull();
  });

  it("goes straight to creating a trip, with no paywall, when the user has none", async () => {
    mockMapStore.selectedLocationId = "s3";
    const view = await render(<MapScreen />);

    await fireEvent.press(view.getByText("Add to Trip"));

    expect(view.queryByText("Premium Modal")).toBeNull();
    expect(view.getByText("Create Trip Modal")).toBeTruthy();
  });

  it("asks existing-or-new under the trip limit", async () => {
    mockMapStore.selectedLocationId = "s3";
    mockTrips.itineraries = [{ id: "t1", days: [] }];
    mockTrips.addFlow = "choose";
    const view = await render(<MapScreen />);

    await fireEvent.press(view.getByText("Add to Trip"));
    await fireEvent.press(view.getByText("Add to Existing"));

    expect(view.getByText("Add To Trip Modal")).toBeTruthy();
  });

  it("goes straight to picking a trip at the limit", async () => {
    mockMapStore.selectedLocationId = "s3";
    mockTrips.itineraries = Array.from({ length: PLANNER.MAX_ITINERARIES }, (_, i) => ({ id: "t" + i, days: [] }));
    mockTrips.addFlow = "pick";
    const view = await render(<MapScreen />);

    await fireEvent.press(view.getByText("Add to Trip"));

    expect(view.queryByText("Add to Existing")).toBeNull();
    expect(view.getByText("Add To Trip Modal")).toBeTruthy();
  });

  // Before the trips arrive: an empty list used to send someone with three trips off to make a fourth.
  it("does nothing until the trips are known", async () => {
    mockMapStore.selectedLocationId = "s3";
    mockTrips.addFlow = null;
    const view = await render(<MapScreen />);

    await fireEvent.press(view.getByText("Add to Trip"));

    expect(view.queryByText("Create Trip Modal")).toBeNull();
    expect(view.queryByText("Add to Existing")).toBeNull();
    expect(view.queryByText("Add To Trip Modal")).toBeNull();
  });
});

describe("Nearby follows the filter", () => {
  const withExtras = () => {
    mockBag.locations.push(
      makeSite("s5", "Corner Cafe", ["Food"], { lat: -43.54, lng: 172.64 }),
      makeSite("s6", "Canterbury Museum", ["Culture"], { lat: -43.5312, lng: 172.6342 }),
    );
    mockMapStore.selectedLocationId = "s3";
  };

  it("with a category filter on, Nearby lists only that category", async () => {
    withExtras();
    const view = await render(<MapScreen />);
    expect(view.getByText(/^Nearby: .*Canterbury Museum/)).toBeTruthy();

    await openFilters(view);
    await fireEvent.press(view.getByText("Food & Drink"));

    expect(view.getByText("Nearby: Corner Cafe")).toBeTruthy();
  });

  it("with My Trip on, Nearby lists only the trip's places", async () => {
    withExtras();
    mockTrips.itineraries = [{ id: "t1", days: [{ id: "d1", items: [{ siteId: "s1" }, { siteId: "s3" }] }] }];
    const view = await render(<MapScreen />);

    await fireEvent.press(view.getByRole("button", { name: "My Trip" }));

    expect(view.getByText("Nearby: Sumner Beach")).toBeTruthy();
  });

  it("the search text doesn't narrow Nearby", async () => {
    withExtras();
    const view = await render(<MapScreen />);
    const before = view.getByText(/^Nearby: /).props.children;

    await fireEvent.changeText(view.getByPlaceholderText("Search places..."), "cafe");
    await settleSearch();

    expect(markers(view)).toEqual(["Corner Cafe"]);
    expect(view.getByText(/^Nearby: /).props.children).toEqual(before);
  });
});

// The open Duo (docs/plans/design-sweep.md, "The map, picked: round 3"): the search card is
// 360 x 56 at 16 from the left, and the map's sheet becomes a panel in MapOverlay.
describe("wide", () => {
  const ui = () => require("@blacksands/ui");
  const flat = (node: any) => StyleSheet.flatten(node.props.style);

  it("lists the nearest ten places, where the phone lists three", async () => {
    for (let i = 0; i < 12; i++) mockBag.locations.push(makeSite(`x${i}`, `Extra ${i}`, ["Walks"], { lat: -43.5 - i / 100 }));
    mockMapStore.selectedLocationId = "s2";
    const view = await render(<MapScreen />);
    expect(view.getByText("Nearby count: 3")).toBeTruthy();

    ui().__setWide(true);
    await view.rerender(<MapScreen />);
    expect(view.getByText("Nearby count: 10")).toBeTruthy();
  });

  it("draws the search card 360 by 56, 60 from the top upright and 32 sideways", async () => {
    ui().__setWide(true, { width: 669, height: 951 });
    const upright = await render(<MapScreen />);
    expect(flat(upright.getByTestId("map-search-card"))).toMatchObject({ width: 360, height: 56, borderRadius: 16 });
    expect(flat(upright.getByTestId("map-search-row")).paddingTop).toBe(60);

    ui().__setWide(true, { width: 951, height: 669 });
    await upright.rerender(<MapScreen />);
    expect(flat(upright.getByTestId("map-search-row")).paddingTop).toBe(32);
  });

  it("fades the top upright only", async () => {
    ui().__setWide(true, { width: 669, height: 951 });
    const upright = await render(<MapScreen />);
    expect(flat(upright.getByTestId("map-top-fade")).height).toBe(96);

    ui().__setWide(true, { width: 951, height: 669 });
    await upright.rerender(<MapScreen />);
    expect(upright.queryByTestId("map-top-fade")).toBeNull();

    ui().__setWide(false);
    await upright.rerender(<MapScreen />);
    expect(upright.queryByTestId("map-top-fade")).toBeNull();
  });

  it("puts locate and layers 52 wide, 16 from the edge, level with the search card", async () => {
    ui().__setWide(true, { width: 669, height: 951 });
    const view = await render(<MapScreen />);

    expect(flat(view.getByLabelText("Centre on my location").parent)).toMatchObject({ width: 52, marginRight: 16 });
    expect(flat(view.getByTestId("map-controls-row")).top).toBe(60);
  });

  it("sideways, locate and layers are 32 from the top too (the status bar is in the rail)", async () => {
    ui().__setWide(true, { width: 951, height: 669 });
    const view = await render(<MapScreen />);
    expect(flat(view.getByTestId("map-controls-row")).top).toBe(32);
  });

  it("keeps locate and layers 8 under the status bar's inset when that is below the search card's top", async () => {
    mockInsetTop = 59;
    ui().__setWide(true, { width: 669, height: 951 });
    const view = await render(<MapScreen />);
    expect(flat(view.getByTestId("map-controls-row")).top).toBe(67);
    mockInsetTop = 0;
  });

  it("gives the category chips their own row under the search card, clear of locate and layers", async () => {
    ui().__setWide(true, { width: 669, height: 951 });
    const view = await render(<MapScreen />);
    expect(view.queryByTestId("map-chips")).toBeNull();
    expect(view.getByText("Chips open: false")).toBeTruthy();

    await openFilters(view);

    expect(view.getByText("Chips open: true")).toBeTruthy();
    expect(flat(view.getByTestId("map-chips"))).toMatchObject({ marginTop: 12, height: 36, marginRight: 80 });
    expect(view.getByTestId("map-chips").props.contentContainerStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ paddingHorizontal: 16 })]),
    );
  });

  it("leaves the phone's chips and panel flag alone", async () => {
    const view = await render(<MapScreen />);
    await openFilters(view);
    expect(view.getByText("Chips open: false")).toBeTruthy();
    expect(view.getByTestId("map-chips").props.style).toBeFalsy();
  });

  it("opening the filter on the Duo does not open the phone's: folded, it is as the phone left it", async () => {
    ui().__setWide(true, { width: 669, height: 951 });
    const view = await render(<MapScreen />);
    await openFilters(view);
    expect(view.getByTestId("map-chips")).toBeTruthy();

    ui().__setWide(false);
    await view.rerender(<MapScreen />);
    expect(view.queryByTestId("map-chips")).toBeNull();

    // And the phone's own opening survives a trip to the Duo and back (the Duo keeps its own).
    await openFilters(view);
    ui().__setWide(true, { width: 669, height: 951 });
    await view.rerender(<MapScreen />);
    expect(view.getByText("Chips open: true")).toBeTruthy();
    ui().__setWide(false);
    await view.rerender(<MapScreen />);
    expect(view.getByTestId("map-chips")).toBeTruthy();
  });

  it("keeps the chosen place, and the same map, across the breakpoint", async () => {
    mockMapStore.selectedLocationId = "s3";
    const view = await render(<MapScreen />);
    expect(view.getByText("Overlay: Riverside Market")).toBeTruthy();
    expect(mockMapMounts.count).toBe(1);

    ui().__setWide(true);
    await view.rerender(<MapScreen />);
    expect(view.getByText("Overlay: Riverside Market")).toBeTruthy();
    expect(mockMapMounts.count).toBe(1);

    ui().__setWide(false);
    await view.rerender(<MapScreen />);
    expect(view.getByText("Overlay: Riverside Market")).toBeTruthy();
    expect(mockMapMounts.count).toBe(1);
  });

  // iOS drops first responder when the window resizes; the text survives, the keyboard doesn't.
  describe("the search across a fold", () => {
    let focus: jest.SpyInstance;
    beforeEach(() => {
      focus = jest.spyOn(TextInput.prototype as any, "focus").mockImplementation(() => {});
    });
    afterEach(() => focus.mockRestore());

    it("keeps typing across a fold", async () => {
      const view = await render(<MapScreen />);
      const input = view.getByPlaceholderText("Search places...");
      await fireEvent.changeText(input, "ric");
      await fireEvent(input, "focus");
      await fireEvent(input, "blur"); // what the resize does
      ui().__setWide(true);
      await view.rerender(<MapScreen />);

      expect(focus).toHaveBeenCalledTimes(1);
      expect(view.getByPlaceholderText("Search places...").props.value).toBe("ric");
    });

    it("keeps typing when the blur comes just after the fold", async () => {
      const view = await render(<MapScreen />);
      const input = view.getByPlaceholderText("Search places...");
      await fireEvent(input, "focus");
      ui().__setWide(true);
      await view.rerender(<MapScreen />);
      // Still focused at the fold: focusing now would be a no-op the blur then undoes.
      expect(focus).not.toHaveBeenCalled();
      await fireEvent(view.getByPlaceholderText("Search places..."), "blur");

      expect(focus).toHaveBeenCalledTimes(1);
    });

    it("doesn't grab focus after a submit that follows a fold", async () => {
      const view = await render(<MapScreen />);
      const input = view.getByPlaceholderText("Search places...");
      await fireEvent(input, "focus");
      ui().__setWide(true);
      await view.rerender(<MapScreen />);
      await fireEvent(view.getByPlaceholderText("Search places..."), "submitEditing");
      await fireEvent(view.getByPlaceholderText("Search places..."), "blur");
      expect(focus).not.toHaveBeenCalled();
    });

    it("doesn't grab focus after the search was submitted or cleared", async () => {
      const view = await render(<MapScreen />);
      const input = view.getByPlaceholderText("Search places...");
      await fireEvent.changeText(input, "ric");
      await fireEvent(input, "focus");
      await fireEvent(input, "submitEditing");
      await fireEvent(input, "blur");
      ui().__setWide(true);
      await view.rerender(<MapScreen />);
      expect(focus).not.toHaveBeenCalled();
    });

    it("doesn't grab focus when the field wasn't in use", async () => {
      const view = await render(<MapScreen />);
      ui().__setWide(true);
      await view.rerender(<MapScreen />);
      expect(focus).not.toHaveBeenCalled();
    });
  });

  it("keeps an open Add to Trip sheet across the breakpoint, wide card and dark edge on wide", async () => {
    mockMapStore.selectedLocationId = "s3";
    mockTrips.itineraries = [{ id: "t1", days: [] }];
    mockTrips.addFlow = "choose";
    const view = await render(<MapScreen />);
    await fireEvent.press(view.getByText("Add to Trip"));
    expect(view.getByText("Add to Existing")).toBeTruthy();
    expect(mockSheets.trip.wide).toBeFalsy();

    ui().__setWide(true);
    await view.rerender(<MapScreen />);

    expect(view.getByText("Add to Existing")).toBeTruthy();
    expect(mockSheets.trip.wide).toBe(true);
    expect(mockSheets.trip.colors.edge).toBe(darkEdge.borderColor);
  });
});
