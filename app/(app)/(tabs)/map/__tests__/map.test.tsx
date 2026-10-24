// The Map tab. What south-island changes over rotorua-guide: the category chips are "All" plus
// every category (all nine, whether or not a place has it yet), "Add to Trip" is hidden
// for Stay via canAddToItinerary, the map opens on the user when a place is near them, and 1.0
// has no paid unlock — the real useEntitlementGate stub is used, so nothing is ever locked,
// there's no premium banner and no paywall before adding to a trip.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

// react-native-maps needs a native surface; the stand-in reports the markers it was given.
jest.mock("@/components/map/SitesMapView", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return {
    __esModule: true,
    initialRegionFrom: () => ({ latitude: -43.53, longitude: 172.63, latitudeDelta: 0.15, longitudeDelta: 0.15 }),
    SitesMapView: React.forwardRef(({ sites, mapType, onPressSite }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ recenter: jest.fn(), focusOn: jest.fn() }));
      return React.createElement(
        View,
        null,
        React.createElement(Text, null, "Map (" + mapType + ") with " + sites.length + " markers"),
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

jest.mock("@/components/map/MapOverlay", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return {
    MapOverlayCard: ({ site, onOpen, onAddToItinerary }: any) =>
      React.createElement(
        View,
        null,
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
  return { SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children) };
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

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import MapScreen from "@/app/(app)/(tabs)/map/index";
import { PLANNER } from "@/lib/constants/gameplay";
import { SITE_CATEGORIES, SITE_CATEGORY_LABELS } from "@/lib/models";
import { tokens } from "@/lib/ui/tokens";

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

// The filter toggle is icon-only with no accessibilityLabel, so there's no accessible name
// to query it by. It's the last child of the row the search field sits in.
const openFilters = async (view: any) => {
  const row = view.getByPlaceholderText("Search places...").parent;
  const kids = row.children.filter((c: any) => typeof c !== "string");
  await fireEvent.press(kids[kids.length - 1]);
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
});

describe("category chips", () => {
  it("marks the chosen category in the highlight colour, and only that one", async () => {
    const view = await render(<MapScreen />);
    await openFilters(view);

    await fireEvent.press(view.getByText("Scenic"));

    expect(view.getByRole("button", { name: "Scenic" })).toHaveStyle({ backgroundColor: tokens.colors.highlight });
    expect(view.getByRole("button", { name: "Culture" })).not.toHaveStyle({
      backgroundColor: tokens.colors.highlight,
    });
  });

  // Tapping the filter button shut mustn't hide the only sign that a filter is on.
  it("stay up while a category is chosen, even with the filter button tapped shut", async () => {
    const view = await render(<MapScreen />);
    await openFilters(view);
    await fireEvent.press(view.getByText("Scenic"));

    await openFilters(view);

    expect(view.getByText("Scenic")).toBeTruthy();
  });

  it("are hidden until the filter button is pressed", async () => {
    const view = await render(<MapScreen />);
    expect(view.queryByText("All")).toBeNull();

    await openFilters(view);

    expect(view.getByText("All")).toBeTruthy();
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
  it("isn't offered to a guest at all", async () => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
    mockMapStore.selectedLocationId = "s3";
    const view = await render(<MapScreen />);

    expect(view.getByText("Overlay: Riverside Market")).toBeTruthy();
    expect(view.queryByText("Add to Trip")).toBeNull();
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
