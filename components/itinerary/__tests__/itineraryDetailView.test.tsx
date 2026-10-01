// The trip editor, rendered both as the /itinerary/[itineraryId] route and inline by the
// Plans tab for a free user's single trip. Tier rules from the matrix in TASKS.md: "Add Day"
// exists only for an entitled user, dragging a stop upsells instead of moving it, deleting
// a day re-dates the rest with no gap, and "Add Day" refuses to grow into another trip.

// The draggable timeline block is a shared component with its own tests. Standing it in on
// top of the shared uiKit mock exposes the callbacks this view passes down, which is what
// these tests drive.
jest.mock("@/lib/uiKit", () => {
  const kit = jest.requireActual("@/test/uiKitMock");
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return {
    ...kit,
    components: {
      ...kit.components,
      TimelineBlock: ({ item, onDrop, onDragStart, onEdit, onNotePress }: any) =>
        React.createElement(
          View,
          null,
          React.createElement(Text, null, item.siteName),
          React.createElement(
            TouchableOpacity,
            { onPress: onDragStart, accessibilityRole: "button" },
            React.createElement(Text, null, "Drag " + item.siteName),
          ),
          React.createElement(
            TouchableOpacity,
            // A drop three slots later than where it sits.
            { onPress: () => onDrop(item.id, (item.slotIndex ?? 0) + 3), accessibilityRole: "button" },
            React.createElement(Text, null, "Drop " + item.siteName),
          ),
          React.createElement(
            TouchableOpacity,
            { onPress: () => onEdit(item), accessibilityRole: "button" },
            React.createElement(Text, null, "Edit " + item.siteName),
          ),
          React.createElement(
            TouchableOpacity,
            { onPress: () => onNotePress(item), accessibilityRole: "button" },
            React.createElement(Text, null, "Note " + item.siteName),
          ),
        ),
      TransitBlock: () => null,
    },
  };
});

jest.mock("@/components/itinerary/EditItemModal", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    EditItemModal: ({ item, moveLocked }: any) =>
      item ? React.createElement(Text, null, moveLocked ? "Edit Modal (move locked)" : "Edit Modal") : null,
  };
});
jest.mock("@/components/itinerary/PremiumFeatureModal", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    PremiumFeatureModal: ({ visible }: any) => (visible ? React.createElement(Text, null, "Premium Modal") : null),
  };
});

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children),
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  };
});

jest.mock("expo-crypto", () => ({ randomUUID: () => "fixed" }));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

const mockSession = { status: "authed", uid: "uid-1" } as any;
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: mockSession }) }));

const mockGate = {
  entitledProductIds: new Set<string>(),
  loading: false,
  unknown: false,
  recheck: jest.fn(),
};
jest.mock("@/lib/hooks/useEntitlementGate", () => ({ useEntitlementGate: () => mockGate }));

const mockIap = { requestBuy: jest.fn(), error: null };
jest.mock("@/lib/iap/PurchaseProvider", () => ({ usePurchaseContext: () => mockIap }));

const mockTrips = {
  itineraries: [] as any[],
  loading: false,
  error: null as string | null,
  refetch: jest.fn(),
  saveItinerary: jest.fn(),
  deleteItinerary: jest.fn(),
};
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    get router() {
      return mockRouter;
    },
    useFocusEffect: (cb: any) => React.useEffect(cb, [cb]),
  };
});

import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ItineraryDetailView } from "@/components/itinerary/ItineraryDetailView";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";

const makeItem = (over: Record<string, unknown> = {}) => ({
  id: "item-1",
  siteId: "site-1",
  siteName: "Wai-O-Tapu",
  slotIndex: 2,
  durationSlots: 2,
  timeLabel: "9:00 AM",
  durationLabel: "1 Hour",
  ...over,
});

const makeTrip = (over: Record<string, unknown> = {}) => ({
  id: "t1",
  title: "Hot Pools Weekend",
  startDate: "2026-10-01",
  endDate: "2026-10-03",
  days: [
    { id: "day_1", date: "2026-10-01", items: [makeItem()] },
    { id: "day_2", date: "2026-10-02", items: [] },
    { id: "day_3", date: "2026-10-03", items: [] },
  ],
  ...over,
});

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.status = "authed";
  mockGate.entitledProductIds = new Set();
  mockGate.loading = false;
  mockGate.unknown = false;
  mockTrips.itineraries = [makeTrip()];
  mockTrips.loading = false;
  mockTrips.error = null;
  mockTrips.saveItinerary = jest.fn().mockResolvedValue("t1");
  mockTrips.deleteItinerary = jest.fn().mockResolvedValue(undefined);
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => alertSpy.mockRestore());

const openTrip = (props: Record<string, unknown> = {}) =>
  render(<ItineraryDetailView tripId="t1" {...(props as any)} />);

// The "..." menu button and a day tab's delete X are icon-only with no accessibilityLabel,
// so there is no accessible name to query them by. Both sit as the last child of the row
// their text label is in, which is what this walks to.
const iconButtonBesideText = (view: any, label: string, depth = 1) => {
  let node = view.getByText(label);
  for (let i = 0; i < depth; i++) node = node.parent;
  const kids = node.children.filter((c: any) => typeof c !== "string");
  return kids[kids.length - 1];
};

// Pulls the handler out of an Alert.alert confirm, so a test can take the destructive path.
const takeAlertButton = (text: string) => {
  const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
  buttons.find((b) => b.text === text)?.onPress?.();
};

describe("loading and failure", () => {
  it("waits on the trips", async () => {
    mockTrips.loading = true;
    const view = await openTrip();
    expect(view.getByText("Loading your trip...")).toBeTruthy();
  });

  it("waits on entitlements before drawing tier-dependent controls", async () => {
    mockGate.loading = true;
    const view = await openTrip();
    expect(view.getByText("Loading your trip...")).toBeTruthy();
    expect(view.queryByText("Add Day")).toBeNull();
  });

  it("offers a retry when the trip couldn't be loaded", async () => {
    mockTrips.itineraries = [];
    mockTrips.error = "Couldn't load your trips.";
    const view = await openTrip();

    expect(view.getByText("Couldn't load your trip")).toBeTruthy();
    await fireEvent.press(view.getByText("Try Again"));
    expect(mockTrips.refetch).toHaveBeenCalled();
  });

  it("holds a loading state rather than blanking when the trip is gone", async () => {
    mockTrips.itineraries = [];
    const view = await openTrip();
    expect(view.getByText("Loading your trip...")).toBeTruthy();
  });
});

describe("the trip", () => {
  it("shows the trip's title and its days", async () => {
    const view = await openTrip();

    expect(view.getByText("Hot Pools Weekend")).toBeTruthy();
    expect(view.getByText("Day 1")).toBeTruthy();
    expect(view.getByText("Day 3")).toBeTruthy();
  });

  it("falls back to a generic title for an unnamed trip", async () => {
    mockTrips.itineraries = [makeTrip({ title: "" })];
    const view = await openTrip();
    expect(view.getByText("My Trip")).toBeTruthy();
  });

  it("shows the stops on the day it opens on", async () => {
    const view = await openTrip();
    expect(view.getByText("Wai-O-Tapu")).toBeTruthy();
  });

  it("invites the user to go browsing when a day is empty", async () => {
    const view = await openTrip({ jumpToDay: "day_2" });

    await waitFor(() => expect(view.queryAllByText("Nothing here yet").length).toBeGreaterThan(0));
    await fireEvent.press(view.getAllByText("Nothing here yet")[0]);
    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/sites");
  });

  it("opens the day the caller jumped to", async () => {
    const view = await openTrip({ jumpToDay: "day_2", jumpToSlot: "6" });
    await waitFor(() => expect(view.queryByText("Wai-O-Tapu")).toBeNull());
  });
});

describe("tier gating", () => {
  it("withholds Add Day from a user without the guide", async () => {
    const view = await openTrip();
    expect(view.queryByText("Add Day")).toBeNull();
  });

  it("offers Add Day to an entitled user", async () => {
    mockGate.entitledProductIds = new Set([FULL_GUIDE_PRODUCT_ID]);
    const view = await openTrip();
    expect(view.getByText("Add Day")).toBeTruthy();
  });

  it("upsells instead of moving a stop when the user can't reorder", async () => {
    const view = await openTrip();

    await fireEvent.press(view.getByText("Drag Wai-O-Tapu"));
    await fireEvent.press(view.getByText("Drop Wai-O-Tapu"));

    await waitFor(() => expect(view.getByText("Premium Modal")).toBeTruthy());
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
  });

  it("moves the stop for an entitled user, with no upsell", async () => {
    mockGate.entitledProductIds = new Set([FULL_GUIDE_PRODUCT_ID]);
    const view = await openTrip();

    await fireEvent.press(view.getByText("Drag Wai-O-Tapu"));
    await fireEvent.press(view.getByText("Drop Wai-O-Tapu"));

    expect(view.queryByText("Premium Modal")).toBeNull();
  });

  it("passes the move lock down to the stop editor", async () => {
    const view = await openTrip();

    await fireEvent.press(view.getByText("Edit Wai-O-Tapu"));

    expect(view.getByText("Edit Modal (move locked)")).toBeTruthy();
  });

  it("unlocks the editor's move row for an entitled user", async () => {
    mockGate.entitledProductIds = new Set([FULL_GUIDE_PRODUCT_ID]);
    const view = await openTrip();

    await fireEvent.press(view.getByText("Edit Wai-O-Tapu"));

    expect(view.getByText("Edit Modal")).toBeTruthy();
  });
});

describe("adding a day", () => {
  beforeEach(() => {
    mockGate.entitledProductIds = new Set([FULL_GUIDE_PRODUCT_ID]);
  });

  it("appends a day the day after the last one and extends the trip", async () => {
    const view = await openTrip();

    await fireEvent.press(view.getByText("Add Day"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const payload = mockTrips.saveItinerary.mock.calls[0][0];
    expect(payload.days).toHaveLength(4);
    expect(payload.days[3].date).toBe("2026-10-04");
    expect(payload.endDate).toBe("2026-10-04");
  });

  it("refuses to grow into another trip's dates", async () => {
    mockTrips.itineraries = [
      makeTrip(),
      { id: "t2", title: "Taupo Leg", startDate: "2026-10-04", endDate: "2026-10-06", days: [] },
    ];
    const view = await openTrip();

    await fireEvent.press(view.getByText("Add Day"));

    expect(alertSpy).toHaveBeenCalledWith("Dates overlap", expect.stringContaining("Taupo Leg"));
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
  });
});

describe("deleting a day", () => {
  it("confirms first", async () => {
    const view = await openTrip({ jumpToDay: "day_2" });

    await waitFor(() => expect(view.getByText("Day 2")).toBeTruthy());
    await fireEvent.press(iconButtonBesideText(view, "Day 2", 2));

    expect(alertSpy).toHaveBeenCalledWith("Delete Day", expect.stringContaining("items on it will be lost"), expect.any(Array));
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
  });

  it("re-dates the remaining days so the trip has no gap", async () => {
    const view = await openTrip({ jumpToDay: "day_2" });

    await waitFor(() => expect(view.getByText("Day 2")).toBeTruthy());
    await fireEvent.press(iconButtonBesideText(view, "Day 2", 2));
    takeAlertButton("Delete");

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const payload = mockTrips.saveItinerary.mock.calls[0][0];
    expect(payload.days.map((d: any) => d.date)).toEqual(["2026-10-01", "2026-10-02"]);
    expect(payload.endDate).toBe("2026-10-02");
  });
});

describe("the trip menu", () => {
  it("opens from the header", async () => {
    const view = await openTrip();

    await fireEvent.press(iconButtonBesideText(view, "Hot Pools Weekend"));

    expect(view.getByText("Delete Trip")).toBeTruthy();
  });

  it("offers Switch Trip only when there is another trip to switch to", async () => {
    const view = await openTrip();
    await fireEvent.press(iconButtonBesideText(view, "Hot Pools Weekend"));
    expect(view.queryByText("Switch Trip")).toBeNull();
  });

  it("offers Switch Trip once there are two", async () => {
    mockTrips.itineraries = [makeTrip(), { ...makeTrip(), id: "t2", title: "Taupo Leg" }];
    const view = await openTrip();

    await fireEvent.press(iconButtonBesideText(view, "Hot Pools Weekend"));
    await fireEvent.press(view.getByText("Switch Trip"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/itinerary");
  });

  it("confirms a trip deletion before doing it", async () => {
    const view = await openTrip();
    await fireEvent.press(iconButtonBesideText(view, "Hot Pools Weekend"));

    await fireEvent.press(view.getByText("Delete Trip"));

    expect(view.getByText("Delete Hot Pools Weekend?")).toBeTruthy();
    expect(mockTrips.deleteItinerary).not.toHaveBeenCalled();
  });

  it("deletes the trip and leaves the screen once confirmed", async () => {
    const view = await openTrip();
    await fireEvent.press(iconButtonBesideText(view, "Hot Pools Weekend"));
    await fireEvent.press(view.getByText("Delete Trip"));

    await fireEvent.press(view.getByText("Delete Trip", { exact: true }));

    await waitFor(() => expect(mockTrips.deleteItinerary).toHaveBeenCalledWith("t1"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)/itinerary");
  });
});

describe("notes", () => {
  it("opens a stop's note from the timeline", async () => {
    mockTrips.itineraries = [
      makeTrip({
        days: [{ id: "day_1", date: "2026-10-01", items: [makeItem({ note: "Tickets before 10:15" })] }],
      }),
    ];
    const view = await openTrip();

    await fireEvent.press(view.getByText("Note Wai-O-Tapu"));

    expect(view.getByText("Tickets before 10:15")).toBeTruthy();
  });
});
