// The Plans tab. In 1.0 there's no paid unlock: the real useEntitlementGate stub treats every
// user as entitled, so it's used unmocked here and these tests pin what 1.0 users get — a
// guest sees a sign-in card, a signed-in user always sees the "My Trips" list (never
// rotorua-guide's inline single-trip view, which is the free tier's), and "Create new trip"
// stays until the PLANNER.MAX_ITINERARIES cap. The CreateItineraryModal is never locked.

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
  refetch: jest.fn(),
};
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ItineraryListPage from "@/app/(app)/(tabs)/itinerary/index";
import { PLANNER } from "@/lib/constants/gameplay";

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
});

describe("guest", () => {
  beforeEach(() => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
  });

  it("offers a sign-in card instead of a trip list", async () => {
    const view = await render(<ItineraryListPage />);

    expect(view.getByText("Sign In to Plan a Trip")).toBeTruthy();
    expect(view.queryByText("My Trips")).toBeNull();
  });

  it("points a guest at the login screen", async () => {
    const view = await render(<ItineraryListPage />);

    await fireEvent.press(view.getByText("Sign In"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(auth)/login");
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
  });

  it("still lists what it has when a refetch fails", async () => {
    mockTrips.error = "Couldn't load your trips.";
    mockTrips.itineraries = [makeTrip("t1"), makeTrip("t2")];
    const view = await render(<ItineraryListPage />);

    expect(view.getByText("My Trips")).toBeTruthy();
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
  it("lists a single trip rather than opening it inline (every 1.0 user is entitled)", async () => {
    mockTrips.itineraries = [makeTrip("t1")];
    const view = await render(<ItineraryListPage />);

    expect(view.getByText("My Trips")).toBeTruthy();
    expect(view.getByText("Christchurch Trip t1")).toBeTruthy();
    expect(view.queryByText("Detail view for t1")).toBeNull();
  });

  it("shows each trip's dates and length", async () => {
    mockTrips.itineraries = [makeTrip("t1")];
    const view = await render(<ItineraryListPage />);

    expect(view.getByText(/1 Oct — 3 Oct · 3 days/)).toBeTruthy();
  });

  it("shows one date and a singular day for a day trip", async () => {
    mockTrips.itineraries = [
      makeTrip("t1", { endDate: "2026-10-01", days: [{ id: "day_1", date: "2026-10-01", items: [] }] }),
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

  it("offers another trip while under the cap", async () => {
    mockTrips.itineraries = [makeTrip("t1")];
    const view = await render(<ItineraryListPage />);

    await fireEvent.press(view.getByText("Create new trip"));
    await fireEvent.press(view.getByText("Create Modal"));

    expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)/itinerary/trip-new");
  });

  it("stops offering new trips at the cap", async () => {
    mockTrips.itineraries = Array.from({ length: PLANNER.MAX_ITINERARIES }, (_, i) => makeTrip("t" + i));
    const view = await render(<ItineraryListPage />);

    expect(view.queryByText("Create new trip")).toBeNull();
  });
});
