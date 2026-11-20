// The place as a pane, beside Explore's list on the open Duo (docs/plans/duo-131.md, "Place
// pane"): a parent narrower than the window gives it its width; it leaves the route's chrome
// and the tour's targets to the full place screen.

// The route's chrome: the Stack.Screen options and the status bar.
const mockScreen = jest.fn();
jest.mock("expo-router", () => {
  const actual = jest.requireActual("expo-router");
  return { ...actual, Stack: Object.assign(actual.Stack, { Screen: (p: any) => (mockScreen(p), null) }) };
});
jest.mock("@/lib/analytics", () => ({ logEvent: jest.fn() }));
jest.mock("@/components/layout/LightStatusBar", () => {
  const { Text } = require("react-native");
  return { LightStatusBar: () => require("react").createElement(Text, null, "Light Status Bar") };
});

// The engine's two sheets on this page record the props the page hands them, so a test can
// see whether it asked for the wide card. Everything else is the shared stand-in.
const mockSheets: { trip?: any; review?: any } = {};
jest.mock("@/lib/uiKit", () => {
  const kit = require("@/test/uiKitMock");
  const ReviewModal = (p: any) => {
    mockSheets.review = p;
    return kit.ReviewModal(p);
  };
  return {
    ...kit,
    ReviewModal,
    components: {
      ...kit.components,
      ReviewModal,
      TripChoiceSheet: (p: any) => {
        mockSheets.trip = p;
        return kit.components.TripChoiceSheet(p);
      },
    },
  };
});

// Counts how often the page's stateful pieces mount: a layout switch that swaps subtrees
// remounts them (the scroll offset and an open sheet go with it).
const mockMounts = { actions: 0 };
jest.mock("@/components/sites/detail/ActionsBar", () => {
  const React = require("react");
  const actual = jest.requireActual("@/components/sites/detail/ActionsBar");
  return {
    ...actual,
    QuickActions: (p: any) => {
      React.useEffect(() => {
        mockMounts.actions++;
      }, []);
      return actual.QuickActions(p);
    },
  };
});

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
    // The latest review's box reads these two; no reviews and nobody blocked here.
    usePublicReviews: () => ({ reviews: [], loading: false, err: null, refresh: jest.fn() }),
    useBlockedUsers: () => ({ data: [] }),
  },
}));

// The opening tour's hook (lib/tour). A target carries a testID naming its step, so a test
// can see what the tour would point at.
jest.mock("@/lib/tour/useTourTarget", () => ({
  useTourTarget: (id: string) => ({ ref: { current: null }, onLayout: () => {}, testID: "tour-target-" + id }),
}));

// The bottom inset is the only one a test varies (the footer's padding); the rest stay as the
// library's test provider gives them.
const mockBottomInset = { value: undefined as number | undefined };
jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return {
    ...actual,
    useSafeAreaInsets: () => {
      const insets = actual.useSafeAreaInsets();
      return mockBottomInset.value === undefined ? insets : { ...insets, bottom: mockBottomInset.value };
    },
  };
});

const mockNet = { isConnected: true as boolean | null };
jest.mock("@react-native-community/netinfo", () => ({ useNetInfo: () => mockNet }));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 1, Error: 2 },
}));

import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { fireEvent, renderRouter, screen, within } from "expo-router/testing-library";

import { SiteDetail } from "@/components/sites/detail/SiteDetail";
import { logEvent } from "@/lib/analytics";
import { tokens } from "@/lib/ui/tokens";
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
  imageCredit: "Miles Holden",
  hoursNote: "open daily",
  ...over,
});

const ui = () => require("@blacksands/ui");
const style = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style) ?? {};

// The pane sits in a slot narrower than the window, as Explore's right-hand one is.
const openPane = async (width = 401) => {
  await renderRouter({
    index: () => (
      <View style={{ width, flex: 1 }}>
        <SiteDetail id="site-1" pane />
      </View>
    ),
    "(app)/(tabs)/sites/[siteId]/reviews": () => <Text>Reviews Route</Text>,
    "(auth)/login": () => <Text>Login Route</Text>,
    "(app)/(tabs)/itinerary/[itineraryId]": () => {
      const p = useLocalSearchParams();
      return <Text>{`Trip ${p.itineraryId} day ${p.jumpToDay}`}</Text>;
    },
  });
};

afterEach(() => {
  jest.useRealTimers();
});

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
  mockSheets.trip = undefined;
  mockSheets.review = undefined;
  mockBottomInset.value = 34;
});

describe("pane", () => {
  it("mounting the pane logs nothing: Explore shows the first place without a tap", async () => {
    ui().__setWide(true, { width: 669, height: 951 });
    await openPane();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it("has no back button, no scrolled bar, no status bar change, no Stack.Screen", async () => {
    ui().__setWide(true, { width: 669, height: 951 });
    await openPane();

    expect(screen.queryByLabelText("Back")).toBeNull();
    expect(screen.queryByTestId("place-hero")).toBeNull();
    expect(screen.queryByText("Light Status Bar")).toBeNull();
    expect(mockScreen).not.toHaveBeenCalled();
    // The name once: the page's title, no bar repeating it.
    expect(screen.getAllByText("Riccarton Bush")).toHaveLength(1);
  });

  it.each([
    ["upright", { width: 669, height: 951 }, 401, 240, 22],
    ["sideways", { width: 951, height: 669 }, 520, 140, 16],
  ])("%s: the photo is a card 20 from the sides, tall as picked, corner 20, with its credit", async (_n, win, width, tall, gap) => {
    ui().__setWide(true, win);
    await openPane(width);

    expect(style("place-photo").height).toBe(tall);
    expect(style("place-photo").borderRadius).toBe(20);
    expect(style("place-photo").overflow).toBe("hidden");
    expect(style("place-pane-photo").paddingHorizontal).toBe(20);
    expect(within(screen.getByTestId("place-photo")).getByText("Photo: Miles Holden")).toBeTruthy();
    // The words start 22 under the photo upright, 16 sideways.
    expect(style("place-pane-body").paddingTop).toBe(gap);
    expect(style("place-pane-body").paddingHorizontal).toBe(20);
  });

  const layoutPane = (w: number, h: number) =>
    fireEvent(screen.getByTestId("place-pane"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: w, height: h } } });

  it("the pane's photo is 40% of a tall pane", async () => {
    ui().__setWide(true, { width: 1376, height: 1032 });
    await openPane(1000);
    await layoutPane(1000, 1000);
    expect(style("place-photo").height).toBe(400);
  });

  it("the pane's photo is capped at 480", async () => {
    ui().__setWide(true, { width: 1376, height: 1032 });
    await openPane(1000);
    await layoutPane(1000, 1400);
    expect(style("place-photo").height).toBe(480);
  });

  it("the Duo's pane photo is unchanged", async () => {
    ui().__setWide(true, { width: 951, height: 669 });
    await openPane(520);
    await layoutPane(520, 600);
    expect(style("place-photo").height).toBe(140);
  });

  it("is one column in the phone's order, never two columns, even upright and wide", async () => {
    ui().__setWide(true, { width: 669, height: 951 });
    await openPane();

    expect(style("place-columns").flexDirection).not.toBe("row");
    expect(style("place-left").width).toBeUndefined();
    expect(style("place-right").flex).toBeUndefined();
    const order = [
      "Riccarton Bush",
      "Walks",
      "Directions",
      "Old-growth kahikatea forest in the middle of the city.",
      "Good to know",
      "Local tip",
      "Reviews (12)",
    ];
    const dump = JSON.stringify(screen.toJSON());
    const at = order.map((t) => dump.indexOf(`"${t}"`));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((x, y) => x - y)).toEqual(at);
  });

  it("pins Add to Trip inside the pane with the fade above it", async () => {
    ui().__setWide(true, { width: 669, height: 951 });
    await openPane();

    const add = style("place-add");
    expect(add.position).toBe("absolute");
    expect(add.bottom).toBe(0);
    expect(add.left).toBe(0);
    expect(add.right).toBe(0);
    expect(add.paddingHorizontal).toBe(20);
    expect(add.paddingTop).toBe(12);
    // Not the window's inset (34 here): 12 under the button is the button's own margin.
    expect(add.paddingBottom).toBe(0);
    expect(add.borderTopWidth).toBe(0);
    expect(style("place-add-fade").height).toBe(36);
    // Inside the pane, which has the scroll of its own.
    expect(within(screen.getByTestId("place-pane")).getByTestId("place-add")).toBeTruthy();
    expect(within(screen.getByTestId("place-pane")).getByTestId("place-scroll")).toBeTruthy();
  });

  it("offers no Go Back when the place is not found: the Explore tab is already there", async () => {
    mockBag.site = null;
    await openPane();

    expect(screen.getByText("Place Not Found")).toBeTruthy();
    expect(screen.queryByText("Go Back")).toBeNull();
  });

  it("does not register the placeAdd or placeSave tour targets", async () => {
    await openPane();

    expect(screen.queryByTestId("tour-target-placeAdd")).toBeNull();
    expect(screen.queryByTestId("tour-target-placeSave")).toBeNull();
    // Still drawn: only the tour's marker is left to the full screen.
    expect(screen.getByText("+ Add to Trip")).toBeTruthy();
    expect(screen.getByText("Save")).toBeTruthy();
  });

  it("asks a guest to sign in for Save, Review and Add to Trip", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockSession.status = "guest";
    mockSession.uid = undefined;
    await openPane();

    await fireEvent.press(screen.getByText("Save"));
    expect(alertSpy).toHaveBeenLastCalledWith("Sign In Required", "Sign in to save places.", expect.any(Array));
    await fireEvent.press(screen.getByText("Review"));
    expect(alertSpy).toHaveBeenLastCalledWith("Sign In Required", "Sign in to leave a review.", expect.any(Array));
    await fireEvent.press(screen.getByText("+ Add to Trip"));
    expect(alertSpy).toHaveBeenLastCalledWith("Sign In Required", "Sign in to plan your trip.", expect.any(Array));
    expect(alertSpy).toHaveBeenCalledTimes(3);
    expect(mockSavedSites.toggleSavedSite).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("opens the review sheet and the trip sheets from the pane", async () => {
    mockTrips.addFlow = "choose";
    ui().__setWide(true, { width: 669, height: 951 });
    await openPane();

    await fireEvent.press(screen.getByText("Review"));
    expect(screen.getByText("Review Modal")).toBeTruthy();
    expect(mockSheets.review.wide).toBe(true);

    await fireEvent.press(screen.getByText("+ Add to Trip"));
    await fireEvent.press(screen.getByText("Create New"));
    expect(screen.getByText("Create Trip Modal")).toBeTruthy();
    await fireEvent.press(screen.getByText("Create Trip Modal"));
    expect(screen.getByText("Add Riccarton Bush to trip-new")).toBeTruthy();
  });
});

describe("a place in the trip", () => {
  const inTrip = () => {
    mockTrips.itineraries = [
      {
        id: "trip-1",
        days: [
          { id: "d1", date: "2026-12-01", items: [] },
          { id: "d2", date: "2026-12-02", items: [] },
          { id: "d3", date: "2026-12-03", items: [{ siteId: "site-1" }] },
        ],
      },
    ];
    mockTrips.addFlow = "pick";
  };

  it("says In your trip · Day 3, and its button is View in Trip, which opens that day", async () => {
    inTrip();
    await openPane();

    const line = screen.getByText("In your trip · Day 3");
    expect(line).toHaveStyle({ color: tokens.colors.surf, fontSize: 15, fontWeight: "600" });
    expect(line.props.accessibilityRole).toBe("text");
    expect(screen.queryByText("+ Add to Trip")).toBeNull();

    await fireEvent.press(screen.getByText("View in Trip"));
    expect(screen.getByText("Trip trip-1 day d3")).toBeTruthy();
  });

  it("Add Again opens Add to Trip", async () => {
    inTrip();
    await openPane();

    await fireEvent.press(screen.getByText("Add Again"));
    expect(screen.getByText("Add Riccarton Bush to a trip")).toBeTruthy();
  });

  it("a place not in the trip is unchanged", async () => {
    await openPane();

    expect(screen.queryByText(/^In your trip/)).toBeNull();
    expect(screen.queryByText("View in Trip")).toBeNull();
    expect(screen.queryByText("Add Again")).toBeNull();
    expect(screen.getByText("+ Add to Trip")).toBeTruthy();
  });

  it("a Stay place in a trip shows the line but no Add Again", async () => {
    inTrip();
    mockBag.site = makeSite({ category: ["Stay"] });
    await openPane();

    expect(screen.getByText("In your trip · Day 3")).toBeTruthy();
    expect(screen.queryByText("Add Again")).toBeNull();
    expect(screen.queryByText("View in Trip")).toBeNull();
  });
});
