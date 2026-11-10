// The Trips tab. There's no paid unlock: the real useEntitlementGate stub treats every user as
// entitled, so it's used unmocked here. A guest sees a sign-in card; with one trip (the cap,
// PLANNER.MAX_ITINERARIES) the tab opens it inline; someone with more, from before the cap
// was 1, gets the list. The CreateItineraryModal is never locked.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("@/components/itinerary/CreateItineraryModal", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  return {
    CreateItineraryModal: ({ visible, locked, onCreated }: any) =>
      visible
        ? React.createElement(
            TouchableOpacity,
            { onPress: () => onCreated("trip-new"), accessibilityRole: "button" },
            React.createElement(Text, null, locked ? "Create Modal (locked)" : "Create Modal"),
          )
        : null,
  };
});

// Trip editing has its own tests; here it only needs to prove which trip id it was handed.
jest.mock("@/components/itinerary/ItineraryDetailView", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { ItineraryDetailView: ({ tripId }: any) => React.createElement(Text, null, "Detail view for " + tripId) };
});

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children),
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  };
});

const mockSession = { status: "authed", uid: "uid-1" } as any;
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: mockSession }) }));

const mockTrips = {
  itineraries: [] as any[],
  loading: false,
  error: null as string | null,
  sessionExpired: false,
  refetch: jest.fn(),
};
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));

// A guest's suggested trip looks its places up here; none are known, so it shows no towns.
jest.mock("@/lib/hooks/usePlaceLookup", () => ({
  usePlaceLookup: () => ({ places: () => undefined, list: [], ready: true, count: 0, err: "", refresh: jest.fn() }),
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
import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import ItineraryListPage from "@/app/(app)/(tabs)/itinerary/index";
import { PLANNER } from "@/lib/constants/gameplay";
import { tokens } from "@/lib/ui/tokens";

const makeTrip = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  title: "Christchurch Trip " + id,
  startDate: "2026-10-01",
  endDate: "2026-10-03",
  days: [
    { id: "day_1", date: "2026-10-01", items: [] },
    { id: "day_2", date: "2026-10-02", items: [] },
    { id: "day_3", date: "2026-10-03", items: [] },
  ],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.status = "authed";
  mockSession.uid = "uid-1";
  mockTrips.itineraries = [];
  mockTrips.loading = false;
  mockTrips.error = null;
  mockTrips.sessionExpired = false;
});

describe("guest", () => {
  beforeEach(() => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
  });

  it("offers a sign-in card instead of a trip list", async () => {
    const view = await render(<ItineraryListPage />);

    expect(view.getByText("Sign In to Plan a Trip")).toBeTruthy();
    expect(view.queryByText("Create new trip")).toBeNull();
  });

  // Mockup B (owner, 2026-11-10): the real suggested trip, locked, under the card.
  it("shows a locked suggested trip under the card", async () => {
    const view = await render(<ItineraryListPage />);

    expect(view.getByText("A suggested trip")).toBeTruthy();
    expect(view.getByText("South Island in 7 Days")).toBeTruthy();
    expect(view.getByText("7 days")).toBeTruthy();
    expect(view.getAllByLabelText(/, locked$/)).toHaveLength(7);
  });

  it("asks a guest to sign in when they tap a day", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const view = await render(<ItineraryListPage />);

    await fireEvent.press(view.getByText("Day 3"));

    expect(alertSpy).toHaveBeenCalledWith("Sign In Required", "Sign in to plan your trip.", expect.any(Array));
    alertSpy.mockRestore();
  });

  it("points a guest at the login screen", async () => {
    const view = await render(<ItineraryListPage />);

    await fireEvent.press(view.getByText("Sign In"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(auth)/login");
  });

  it("titles the screen in white on the brand bar", async () => {
    const view = await render(<ItineraryListPage />);

    expect(view.getByText("Trips")).toHaveStyle({ color: "#FFFFFF" });
  });
});

describe("loading and failure", () => {
  it("waits on the session", async () => {
    mockSession.status = "loading";
    const view = await render(<ItineraryListPage />);
    expect(view.getByText("Loading your trips...")).toBeTruthy();
  });

  it("waits on the trips", async () => {
    mockTrips.loading = true;
    const view = await render(<ItineraryListPage />);
    expect(view.getByText("Loading your trips...")).toBeTruthy();
  });

  it("offers a retry when the trips couldn't be loaded", async () => {
    mockTrips.error = "Couldn't load your trips.";
    const view = await render(<ItineraryListPage />);

    expect(view.getByText("Couldn't load your trips")).toBeTruthy();
    await fireEvent.press(view.getByText("Try Again"));
    expect(mockTrips.refetch).toHaveBeenCalled();
    expect(view.queryByText("Sign In")).toBeNull();
  });

  it("offers Sign In as well as Try Again when the session expired", async () => {
    mockTrips.error = "Your session expired. Please sign in again.";
    mockTrips.sessionExpired = true;
    const view = await render(<ItineraryListPage />);

    expect(view.getByText("Try Again")).toBeTruthy();
    await fireEvent.press(view.getByText("Sign In"));
    expect(mockRouter.push).toHaveBeenCalledWith("/(auth)/login");
  });

  it("still lists what it has when a refetch fails", async () => {
    mockTrips.error = "Couldn't load your trips.";
    mockTrips.itineraries = [makeTrip("t1"), makeTrip("t2")];
    const view = await render(<ItineraryListPage />);

    expect(view.getByText("Trips")).toBeTruthy();
    expect(view.queryByText("Try Again")).toBeNull();
  });
});

describe("no trips yet", () => {
  it("invites the user to create one or go browsing", async () => {
    const view = await render(<ItineraryListPage />);

    expect(view.getByText("Create a Trip")).toBeTruthy();
    await fireEvent.press(view.getByText("Explore Places to Visit"));
    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/sites");
  });

  it("opens an unlocked create modal, and goes to the new trip once it exists", async () => {
    const view = await render(<ItineraryListPage />);

    await fireEvent.press(view.getByText("Create a Trip"));
    expect(view.getByText("Create Modal")).toBeTruthy();

    await fireEvent.press(view.getByText("Create Modal"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)/itinerary/trip-new");
  });
});

describe("with trips", () => {
  it("opens a single trip inline instead of a list of one", async () => {
    mockTrips.itineraries = [makeTrip("t1")];
    const view = await render(<ItineraryListPage />);

    expect(view.getByText("Detail view for t1")).toBeTruthy();
    expect(view.queryByText("Christchurch Trip t1")).toBeNull();
  });

  it("lists trips when there's more than one", async () => {
    mockTrips.itineraries = [makeTrip("t1"), makeTrip("t2")];
    const view = await render(<ItineraryListPage />);

    expect(view.getByText("Trips")).toBeTruthy();
    expect(view.getByText("Christchurch Trip t1")).toBeTruthy();
    expect(view.getByText("Christchurch Trip t2")).toBeTruthy();
  });

  it("shows each trip's dates and length", async () => {
    mockTrips.itineraries = [makeTrip("t1"), makeTrip("t2")];
    const view = await render(<ItineraryListPage />);

    expect(view.getAllByText(/1 Oct — 3 Oct · 3 days/)).toHaveLength(2);
  });

  it("shows one date and a singular day for a day trip", async () => {
    mockTrips.itineraries = [
      makeTrip("t1", { endDate: "2026-10-01", days: [{ id: "day_1", date: "2026-10-01", items: [] }] }),
      makeTrip("t2"),
    ];
    const view = await render(<ItineraryListPage />);

    expect(view.getByText(/^1 Oct · 1 day$/)).toBeTruthy();
  });

  it("opens the trip that was tapped", async () => {
    mockTrips.itineraries = [makeTrip("t1"), makeTrip("t2")];
    const view = await render(<ItineraryListPage />);

    await fireEvent.press(view.getByText("Christchurch Trip t2"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/itinerary/t2");
  });

  it("stops offering new trips at the cap", async () => {
    mockTrips.itineraries = Array.from({ length: PLANNER.MAX_ITINERARIES + 1 }, (_, i) => makeTrip("t" + i));
    const view = await render(<ItineraryListPage />);

    expect(view.queryByText("Create new trip")).toBeNull();
  });

  it("titles the list in white on the brand bar", async () => {
    mockTrips.itineraries = [makeTrip("t1"), makeTrip("t2")];
    const view = await render(<ItineraryListPage />);

    expect(view.getByText("Trips")).toHaveStyle({ color: "#FFFFFF" });
  });
});
