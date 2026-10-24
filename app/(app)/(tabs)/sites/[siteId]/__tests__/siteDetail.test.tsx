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
const mockTrips = { itineraries: [] as unknown[], addFlow: "create" as "create" | "choose" | "pick" | null };
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));

const mockBag = {
  site: null as any,
  siteLoading: false,
  siteErr: null as string | null,
  myRating: null as number | null,
  avgRating: 4.5,
  ratingCount: 12,
  saveReview: jest.fn(),
};
jest.mock("@/lib/hooksBag", () => ({
  hooksBag: {
    useLocation: () => ({ location: mockBag.site, loading: mockBag.siteLoading, err: mockBag.siteErr }),
    useLocationReviewsSummary: () => ({
      avgRating: mockBag.avgRating,
      ratingCount: mockBag.ratingCount,
      myRating: mockBag.myRating,
      myText: "",
      saving: false,
      saveReview: mockBag.saveReview,
    }),
    useDraftsStore: () => ({ drafts: {}, setDraft: jest.fn(), clearDraft: jest.fn() }),
  },
}));

// The opening tour's hook (lib/tour). A target carries a testID naming its step, so a test
// can see what the tour would point at.
jest.mock("@/lib/tour/useTourTarget", () => ({
  useTourTarget: (id: string) => ({ ref: { current: null }, onLayout: () => {}, testID: "tour-target-" + id }),
}));

const mockNet = { isConnected: true as boolean | null };
jest.mock("@react-native-community/netinfo", () => ({ useNetInfo: () => mockNet }));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 1, Error: 2 },
}));

import React from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import SiteDetailRoute from "@/app/(app)/(tabs)/sites/[siteId]/index";
import type { Site } from "@/lib/models";
import { tokens } from "@/lib/ui/tokens";

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
  mockTrips.addFlow = "create";
  mockBag.site = makeSite();
  mockBag.siteLoading = false;
  mockBag.siteErr = null;
  mockBag.myRating = null;
  mockBag.avgRating = 4.5;
  mockBag.ratingCount = 12;
  mockBag.saveReview = jest.fn().mockResolvedValue({ ok: true });
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
    expect(screen.getByText("Place Not Found")).toBeTruthy();
  });

  it("shows the name, the category and the description, with the local tip pulled out", async () => {
    await openDetail();

    // Twice: the page title, and the bar that fades in at the top once the page scrolls,
    // so the back button never sits on top of the text and the place stays named.
    expect(screen.getAllByText("Riccarton Bush")).toHaveLength(2);
    expect(screen.getByText("Walks")).toBeTruthy();
    expect(screen.getByText("Old-growth kahikatea forest in the middle of the city.")).toBeTruthy();
    expect(screen.getByText("Local tip")).toBeTruthy();
    expect(screen.getByText("go early for the birds.")).toBeTruthy();
  });

  it("credits the photographer over the photo", async () => {
    mockBag.site = makeSite({ imageCredit: "Miles Holden" });
    await openDetail();

    expect(screen.getByText("Photo: Miles Holden")).toBeTruthy();
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

  it("links a proper website", async () => {
    mockBag.site = makeSite({ website: "https://riccartonhouse.co.nz" });
    await openDetail();
    expect(screen.getByLabelText("Open website")).toBeTruthy();
  });
});

// Under the title: rating, category, price and website as one quiet line of text,
// where there used to be three differently coloured pills.
describe("the facts line", () => {
  it("leads with the rating when the place has reviews", async () => {
    await openDetail();

    expect(screen.getByText("4.5")).toBeTruthy();
    expect(screen.getByText("(12)")).toBeTruthy();
  });

  it("leaves the rating out when nobody has reviewed the place", async () => {
    mockBag.ratingCount = 0;
    mockBag.avgRating = 0;
    await openDetail();

    expect(screen.queryByText("0.0")).toBeNull();
    expect(screen.queryByText("(0)")).toBeNull();
  });

  it("gives the price in words", async () => {
    mockBag.site = makeSite({ price: "Moderate" });
    await openDetail();
    expect(screen.getByText("Moderate")).toBeTruthy();
  });
});

// The highlight colour marks the page's best line (the local tip), its main action, and
// what the user has already done here.
describe("highlight", () => {
  it("sets the local tip in the highlight colour", async () => {
    await openDetail();
    expect(screen.getByText("Local tip")).toHaveStyle({ color: tokens.colors.highlight });
  });

  it("draws the add-to-itinerary button in the highlight colour", async () => {
    await openDetail();
    expect(screen.getByRole("button", { name: "+ Add to Trip" })).toHaveStyle({
      backgroundColor: tokens.colors.highlight,
    });
  });

  // The four actions share one white card that is raised off the sheet: it stands out by
  // being the only raised surface on the page, not by being a block of colour.
  it("puts the actions in one raised white bar", async () => {
    await openDetail();

    // getByRole only matches accessibility elements, and the bar deliberately isn't one:
    // that would merge its four buttons into a single VoiceOver stop. So walk up to it.
    let bar: any = screen.getByText("Directions");
    while (bar && bar.props.accessibilityRole !== "toolbar") bar = bar.parent;

    expect(bar).toHaveStyle({ backgroundColor: tokens.colors.bgCard });
    expect(StyleSheet.flatten(bar.props.style).shadowOpacity).toBeGreaterThan(0);
    expect(bar).not.toHaveStyle({ overflow: "hidden" });
  });

  it("leaves Save neutral until the place is saved", async () => {
    await openDetail();
    expect(screen.getByText("Save")).not.toHaveStyle({ color: tokens.colors.highlight });
  });

  it("marks a saved place in the highlight colour", async () => {
    mockSavedSites.savedSiteIds = new Set(["site-1"]);
    await openDetail();
    expect(screen.getByText("Saved")).toHaveStyle({ color: tokens.colors.highlight });
  });
});

describe("adding to an itinerary", () => {
  it("is not offered to a guest, who has nowhere to save a trip", async () => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
    await openDetail();
    expect(screen.queryByText("+ Add to Trip")).toBeNull();
  });

  it("is not offered for a Stay", async () => {
    mockBag.site = makeSite({ category: ["Stay"] });
    await openDetail();
    expect(screen.queryByText("+ Add to Trip")).toBeNull();
  });

  it("is not offered for a place with Stay among its categories", async () => {
    mockBag.site = makeSite({ category: ["Food", "Stay"] });
    await openDetail();
    expect(screen.queryByText("+ Add to Trip")).toBeNull();
  });

  it("goes straight to creating a trip when the user has none, then adds the place to it", async () => {
    await openDetail();

    await fireEvent.press(screen.getByText("+ Add to Trip"));
    expect(screen.getByText("Create Trip Modal")).toBeTruthy();

    await fireEvent.press(screen.getByText("Create Trip Modal"));
    expect(screen.getByText("Add Riccarton Bush to trip-new")).toBeTruthy();
  });

  it("asks whether to use an existing trip or a new one when under the trip limit", async () => {
    mockTrips.addFlow = "choose";
    await openDetail();

    await fireEvent.press(screen.getByText("+ Add to Trip"));
    await fireEvent.press(screen.getByText("Add to Existing"));

    expect(screen.getByText("Add Riccarton Bush to a trip")).toBeTruthy();
  });

  it("can start a new trip from that choice instead", async () => {
    mockTrips.addFlow = "choose";
    await openDetail();

    await fireEvent.press(screen.getByText("+ Add to Trip"));
    await fireEvent.press(screen.getByText("Create New"));

    expect(screen.getByText("Create Trip Modal")).toBeTruthy();
  });

  it("goes straight to picking a trip at the trip limit", async () => {
    mockTrips.addFlow = "pick";
    await openDetail();

    await fireEvent.press(screen.getByText("+ Add to Trip"));

    expect(screen.queryByText("Add to Existing")).toBeNull();
    expect(screen.getByText("Add Riccarton Bush to a trip")).toBeTruthy();
  });

  it("says to reconnect, and does nothing, while offline", async () => {
    mockNet.isConnected = false;
    await openDetail();

    await fireEvent.press(screen.getByText("Reconnect to Add to Trip"));

    expect(screen.queryByText("Create Trip Modal")).toBeNull();
  });

  // Before the trips arrive: an empty list used to send someone with three trips off to make a fourth.
  it("does nothing until the trips are known", async () => {
    mockTrips.addFlow = null;
    await openDetail();

    await fireEvent.press(screen.getByText("+ Add to Trip"));

    expect(screen.queryByText("Create Trip Modal")).toBeNull();
    expect(screen.queryByText("Add to Existing")).toBeNull();
    expect(screen.queryByText("Add Riccarton Bush to a trip")).toBeNull();
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

  // It used to lock to a highlighted "Shared" after the first share.
  it("opens the share screen again for a place already shared", async () => {
    await openDetail();

    await fireEvent.press(screen.getByText("Share"));

    expect(route.getPathname()).toBe("/share-frame");
    expect(screen.queryByText("Shared")).toBeNull();
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

  // A guest has no account to save to. Saving used to look like it worked: the heart
  // flipped to "Saved" on the device and nothing was stored anywhere.
  it("asks a guest to sign in instead of saving", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockSession.status = "guest";
    mockSession.uid = undefined;
    await openDetail();

    await fireEvent.press(screen.getByText("Save"));

    expect(mockSavedSites.toggleSavedSite).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith("Sign In Required", "Sign in to save places.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign In", onPress: expect.any(Function) },
    ]);
    alertSpy.mockRestore();
  });

  it("opens the place's reviews", async () => {
    await openDetail();

    await fireEvent.press(screen.getByText("View All"));

    expect(route.getPathname()).toBe("/sites/site-1/reviews");
  });

  // A guest could write a whole review, tap Save, and get only an error buzz: the hook
  // refuses a guest's review, and the screen said nothing.
  it("asks a guest to sign in before reviewing", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockSession.status = "guest";
    mockSession.uid = undefined;
    await openDetail();

    await fireEvent.press(screen.getByText("Review"));

    expect(alertSpy).toHaveBeenCalledWith("Sign In Required", "Sign in to leave a review.", expect.any(Array));
    expect(screen.queryByText("Review Modal")).toBeNull();
    alertSpy.mockRestore();
  });

  it("says why a review didn't save", async () => {
    mockBag.saveReview = jest.fn().mockResolvedValue({ ok: false, err: "Failed to save review." });
    await openDetail();

    await fireEvent.press(screen.getByText("Review"));
    await fireEvent.press(screen.getByText("Save Review"));

    // In plain words, not the hook's own message.
    expect(await screen.findByText("Couldn't save your review. Check your connection and try again.")).toBeTruthy();
    expect(screen.getByText("Review Modal")).toBeTruthy();
  });
});

// The opening tour's step on a place (lib/tour/tourSteps.ts): the add button for someone
// with the unlock, the heart for someone without.
describe("the tour", () => {
  const target = (id: string) => screen.queryByTestId("tour-target-" + id);

  it("points at + Add to Trip", async () => {
    await openDetail();

    expect(target("placeAdd")).toHaveTextContent("+ Add to Trip");
  });

  it("points at the heart", async () => {
    await openDetail();

    expect(target("placeSave")).toHaveTextContent("Save");
  });

  it("has no add button to point at for a guest", async () => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
    await openDetail();

    expect(target("placeAdd")).toBeNull();
    expect(target("placeSave")).toBeTruthy();
  });
});
