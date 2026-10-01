// A place's detail screen: the add-to-itinerary flow (signed-in only, never for Stay, and
// which modal opens depends on how many trips the user has), and Share opening
// /share-frame with the place's id and name. Routed through expo-router's renderRouter
// rather than a hand-mocked expo-router, so the Share assertion is on the real pathname and
// params the share screen will read.
//
// south-island's screen has no premium gate (1.0 has no commerce — see the stub in
// lib/hooks/useEntitlementGate.ts), so none of rotorua-guide's paywall rows apply here.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("@/components/itinerary/CreateItineraryModal", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  return {
    CreateItineraryModal: ({ visible, onCreated }: any) =>
      visible
        ? React.createElement(
            TouchableOpacity,
            { onPress: () => onCreated("trip-new"), accessibilityRole: "button" },
            React.createElement(Text, null, "Create Trip Modal"),
          )
        : null,
  };
});
jest.mock("@/components/itinerary/AddToTripModal", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    AddToTripModal: ({ site, initialItineraryId }: any) =>
      site
        ? React.createElement(Text, null, `Add ${site.name} to ${initialItineraryId ?? "a trip"}`)
        : null,
  };
});

const mockSession = { status: "authed", uid: "uid-1" } as any;
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: mockSession }) }));

const mockSavedSites = { savedSiteIds: new Set<string>(), toggleSavedSite: jest.fn() };
jest.mock("@/lib/hooks/useSavedSites", () => ({ useSavedSites: () => mockSavedSites }));
const mockTrips = { itineraries: [] as unknown[] };
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));

const mockBag = {
  site: null as any,
  siteLoading: false,
  siteErr: null as string | null,
  myRating: null as number | null,
  sharedIds: new Set<string>(),
};
jest.mock("@/lib/hooksBag", () => ({
  hooksBag: {
    useLocation: () => ({ location: mockBag.site, loading: mockBag.siteLoading, err: mockBag.siteErr }),
    useMyCompletions: () => ({ sharedLocationIds: mockBag.sharedIds }),
    useLocationReviewsSummary: () => ({
      avgRating: 4.5,
      ratingCount: 12,
      myRating: mockBag.myRating,
      myText: "",
      saving: false,
      saveReview: jest.fn(),
    }),
    useDraftsStore: () => ({ drafts: {}, setDraft: jest.fn(), clearDraft: jest.fn() }),
  },
}));

const mockNet = { isConnected: true as boolean | null };
jest.mock("@react-native-community/netinfo", () => ({ useNetInfo: () => mockNet }));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 1, Error: 2 },
}));

import React from "react";
import { Text } from "react-native";
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import SiteDetailRoute from "@/app/(app)/(tabs)/sites/[siteId]/index";
import type { Site } from "@/lib/models";

const makeSite = (over: Partial<Site> = {}): Site => ({
  id: "site-1",
  name: "Riccarton Bush",
  slug: "riccarton-bush",
  lat: -43.53,
  lng: 172.6,
  category: ["Walks"],
  description: "Old-growth kahikatea forest in the middle of the city.\nLocal tip: go early for the birds.",
  active: true,
  imageUrl: "https://example.test/bush.jpg",
  ...over,
});

// renderRouter predates RNTL 14's async render: it attaches getPathname() and friends to the
// promise render now returns, and awaiting that promise drops them. So the promise itself is
// kept here and the route is read from it. (Its toHavePathname matchers work at runtime but
// aren't typed for @types/jest, so plain toBe/toEqual keep `npm run typecheck` clean.)
let route: ReturnType<typeof renderRouter>;
const openDetail = async (id = "site-1") => {
  route = renderRouter(
    {
      "(app)/(tabs)/sites/[siteId]/index": SiteDetailRoute,
      "(app)/(tabs)/sites/[siteId]/reviews": () => <Text>Reviews Route</Text>,
      "share-frame": () => <Text>Share Route</Text>,
    },
    { initialUrl: `/sites/${id}` },
  );
  await route;
};

// renderRouter switches jest to fake timers and leaves them on.
afterEach(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.status = "authed";
  mockSession.uid = "uid-1";
  mockSavedSites.savedSiteIds = new Set();
  mockTrips.itineraries = [];
  mockBag.site = makeSite();
  mockBag.siteLoading = false;
  mockBag.siteErr = null;
  mockBag.myRating = null;
  mockBag.sharedIds = new Set();
  mockNet.isConnected = true;
});

describe("what it shows", () => {
  it("waits on the session before deciding what to show", async () => {
    mockSession.status = "loading";
    await openDetail();
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("says the place wasn't found rather than rendering an empty page", async () => {
    mockBag.site = null;
    await openDetail();
    expect(screen.getByText("Location Not Found")).toBeTruthy();
  });

  it("shows the name, the category and the description, with the local tip pulled out", async () => {
    await openDetail();

    expect(screen.getByText("Riccarton Bush")).toBeTruthy();
    expect(screen.getByText("Walks")).toBeTruthy();
    expect(screen.getByText("Old-growth kahikatea forest in the middle of the city.")).toBeTruthy();
    expect(screen.getByText("Local tip")).toBeTruthy();
    expect(screen.getByText("go early for the birds.")).toBeTruthy();
  });

  it("puts each clause of the hours note on its own line", async () => {
    mockBag.site = makeSite({ hoursNote: "open daily 7am-dusk; dogs on lead" });
    await openDetail();

    expect(screen.getByText("Good to know")).toBeTruthy();
    expect(screen.getByText("Open daily 7am-dusk")).toBeTruthy();
    expect(screen.getByText("Dogs on lead")).toBeTruthy();
  });

  it("offers a website link only for an http(s) url", async () => {
    mockBag.site = makeSite({ website: "riccartonhouse.co.nz" });
    await openDetail();
    expect(screen.queryByLabelText("Open website")).toBeNull();
  });
});

describe("adding to an itinerary", () => {
  it("is not offered to a guest, who has nowhere to save a trip", async () => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
    await openDetail();
    expect(screen.queryByText("+ Add to Itinerary")).toBeNull();
  });

  it("is not offered for a Stay", async () => {
    mockBag.site = makeSite({ category: ["Stay"] });
    await openDetail();
    expect(screen.queryByText("+ Add to Itinerary")).toBeNull();
  });

  it("is not offered for a place with Stay among its categories", async () => {
    mockBag.site = makeSite({ category: ["Food", "Stay"] });
    await openDetail();
    expect(screen.queryByText("+ Add to Itinerary")).toBeNull();
  });

  it("goes straight to creating a trip when the user has none, then adds the place to it", async () => {
    await openDetail();

    await fireEvent.press(screen.getByText("+ Add to Itinerary"));
    expect(screen.getByText("Create Trip Modal")).toBeTruthy();

    await fireEvent.press(screen.getByText("Create Trip Modal"));
    expect(screen.getByText("Add Riccarton Bush to trip-new")).toBeTruthy();
  });

  it("asks whether to use an existing trip or a new one when under the trip limit", async () => {
    mockTrips.itineraries = [{ id: "t1" }];
    await openDetail();

    await fireEvent.press(screen.getByText("+ Add to Itinerary"));
    await fireEvent.press(screen.getByText("Add to Existing"));

    expect(screen.getByText("Add Riccarton Bush to a trip")).toBeTruthy();
  });

  it("can start a new trip from that choice instead", async () => {
    mockTrips.itineraries = [{ id: "t1" }];
    await openDetail();

    await fireEvent.press(screen.getByText("+ Add to Itinerary"));
    await fireEvent.press(screen.getByText("Create New"));

    expect(screen.getByText("Create Trip Modal")).toBeTruthy();
  });

  it("goes straight to picking a trip at the trip limit", async () => {
    mockTrips.itineraries = [{ id: "t1" }, { id: "t2" }, { id: "t3" }];
    await openDetail();

    await fireEvent.press(screen.getByText("+ Add to Itinerary"));

    expect(screen.queryByText("Add to Existing")).toBeNull();
    expect(screen.getByText("Add Riccarton Bush to a trip")).toBeTruthy();
  });

  it("says to reconnect, and does nothing, while offline", async () => {
    mockNet.isConnected = false;
    await openDetail();

    await fireEvent.press(screen.getByText("Reconnect to Add to Itinerary"));

    expect(screen.queryByText("Create Trip Modal")).toBeNull();
  });
});

describe("sharing", () => {
  it("opens the share screen with the place's id and name", async () => {
    await openDetail();

    await fireEvent.press(screen.getByText("Share"));

    expect(route.getPathname()).toBe("/share-frame");
    expect(route.getSearchParams()).toEqual({ entityId: "site-1", entityName: "Riccarton Bush" });
    expect(screen.getByText("Share Route")).toBeTruthy();
  });

  it("marks a place already shared, and doesn't open the share screen again", async () => {
    mockBag.sharedIds = new Set(["site-1"]);
    await openDetail();

    await fireEvent.press(screen.getByText("Shared"));

    expect(route.getPathname()).toBe("/sites/site-1");
  });
});

describe("saving and reviews", () => {
  it("saves an unsaved place", async () => {
    await openDetail();

    await fireEvent.press(screen.getByText("Save"));

    expect(mockSavedSites.toggleSavedSite).toHaveBeenCalledWith({ siteId: "site-1", isSaving: true });
  });

  it("unsaves a saved one", async () => {
    mockSavedSites.savedSiteIds = new Set(["site-1"]);
    await openDetail();

    await fireEvent.press(screen.getByText("Saved"));

    expect(mockSavedSites.toggleSavedSite).toHaveBeenCalledWith({ siteId: "site-1", isSaving: false });
  });

  it("opens the place's reviews", async () => {
    await openDetail();

    await fireEvent.press(screen.getByText("View All"));

    expect(route.getPathname()).toBe("/sites/site-1/reviews");
  });
});
