// The Map tab. What south-island changes over rotorua-guide: the category chips are "All" plus
// every category (all nine, whether or not a place has it yet), "Add to Itinerary" is hidden
// for Stay via canAddToItinerary, the map centres on the Christchurch coverage box, and 1.0
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
              React.createElement(Text, null, "Add to Itinerary"),
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

const mockTrips = { itineraries: [] as any[] };
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

describe("category chips", () => {
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
    expect(view.queryByText("Add to Itinerary")).toBeNull();
  });

  it("isn't offered for a Stay", async () => {
    mockMapStore.selectedLocationId = "s4";
    const view = await render(<MapScreen />);

    expect(view.getByText("Overlay: The George")).toBeTruthy();
    expect(view.queryByText("Add to Itinerary")).toBeNull();
  });

  it("goes straight to creating a trip, with no paywall, when the user has none", async () => {
    mockMapStore.selectedLocationId = "s3";
    const view = await render(<MapScreen />);

    await fireEvent.press(view.getByText("Add to Itinerary"));

    expect(view.queryByText("Premium Modal")).toBeNull();
    expect(view.getByText("Create Trip Modal")).toBeTruthy();
  });

  it("asks existing-or-new under the trip limit", async () => {
    mockMapStore.selectedLocationId = "s3";
    mockTrips.itineraries = [{ id: "t1", days: [] }];
    const view = await render(<MapScreen />);

    await fireEvent.press(view.getByText("Add to Itinerary"));
    await fireEvent.press(view.getByText("Add to Existing"));

    expect(view.getByText("Add To Trip Modal")).toBeTruthy();
  });

  it("goes straight to picking a trip at the limit", async () => {
    mockMapStore.selectedLocationId = "s3";
    mockTrips.itineraries = Array.from({ length: PLANNER.MAX_ITINERARIES }, (_, i) => ({ id: "t" + i, days: [] }));
    const view = await render(<MapScreen />);

    await fireEvent.press(view.getByText("Add to Itinerary"));

    expect(view.queryByText("Add to Existing")).toBeNull();
    expect(view.getByText("Add To Trip Modal")).toBeTruthy();
  });
});
