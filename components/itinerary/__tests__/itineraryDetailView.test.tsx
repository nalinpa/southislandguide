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
            // A drop at 6:00 PM, far enough down to pass the stops after it.
            { onPress: () => onDrop(item.id, 20), accessibilityRole: "button" },
            React.createElement(Text, null, "Drop late " + item.siteName),
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
  const { Text, TouchableOpacity, View } = require("react-native");
  const press = (label: string, onPress: () => void) =>
    React.createElement(
      TouchableOpacity,
      { key: label, onPress, accessibilityRole: "button" },
      React.createElement(Text, null, label),
    );
  // Stands in for the stop editor's three ways out, and offers the same days the real
  // one does: every day but the open one that isn't marked full.
  return {
    EditItemModal: ({ item, moveLocked, availableDays, currentDayId, onSave, onRemove, onMoveDay }: any) =>
      item
        ? React.createElement(
            View,
            null,
            React.createElement(Text, null, moveLocked ? "Edit Modal (move locked)" : "Edit Modal"),
            press("Remove stop", () => onRemove(item.id)),
            // Ten hours, with a note.
            press("Longer visit", () => onSave(item.id, 20, "bring cash")),
            ...availableDays
              .filter((d: any) => d.id !== currentDayId && !d.full)
              .map((d: any) => press("Move to " + d.label, () => onMoveDay(item.id, d.id))),
          )
        : null,
  };
});

// The area each known place is visited from. "site-1" isn't in the list, so its legs are
// the flat half hour, as every leg was before drive times. Christchurch to Dunedin is
// 9 slots (4.5 hours).
const mockAreas: Record<string, string> = {
  "chc-a": "christchurch",
  "chc-b": "christchurch",
  "dun-a": "dunedin",
  "dun-b": "dunedin",
};
const mockLookup = {
  places: (id: string) => (id in mockAreas ? { area: mockAreas[id] } : undefined),
  // The list itself: what a town's picture on the trip view comes from.
  list: [] as any[],
  ready: true,
  count: 4,
  err: "",
  refresh: jest.fn(),
};
jest.mock("@/lib/hooks/usePlaceLookup", () => ({ usePlaceLookup: () => mockLookup }));
// The trip editor (Edit Trip in the menu) has its own tests; here only what it's handed.
jest.mock("@/components/itinerary/CreateItineraryModal", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    CreateItineraryModal: ({ visible, trip }: any) =>
      visible ? React.createElement(Text, null, `Editing ${trip.title}, ${trip.days.length} days`) : null,
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
import { Alert, ScrollView } from "react-native";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";

import { ItineraryDetailView } from "@/components/itinerary/ItineraryDetailView";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import { tokens } from "@/lib/ui/tokens";

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
  mockLookup.ready = true;
  mockLookup.err = "";
  mockLookup.list = [];
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

const gardens = (over: Record<string, unknown> = {}) =>
  makeItem({ id: "gardens", siteId: "chc-a", siteName: "Gardens", ...over });
const gondola = (over: Record<string, unknown> = {}) =>
  makeItem({ id: "gondola", siteId: "chc-b", siteName: "Gondola", ...over });
const museum = (over: Record<string, unknown> = {}) =>
  makeItem({ id: "museum", siteId: "dun-a", siteName: "Museum", ...over });
const castle = (over: Record<string, unknown> = {}) =>
  makeItem({ id: "castle", siteId: "dun-b", siteName: "Castle", ...over });

const tripOf = (...days: ReturnType<typeof makeItem>[][]) =>
  makeTrip({ days: days.map((items, i) => ({ id: "day_" + (i + 1), date: "2026-10-0" + (i + 1), items })) });

const entitle = () => {
  mockGate.entitledProductIds = new Set([FULL_GUIDE_PRODUCT_ID]);
};

afterEach(() => alertSpy.mockRestore());

// A trip opens on its trip view (one row per day).
const openTripView = (props: Record<string, unknown> = {}) =>
  render(<ItineraryDetailView tripId="t1" {...(props as any)} />);

// Most of this file is about the day timeline, one tap away behind the switch. While the
// trip or its places are still loading there is no switch to press.
const openTrip = async (props: Record<string, unknown> = {}) => {
  const view = await openTripView(props);
  const days = view.queryByText("Days");
  if (days) await fireEvent.press(days);
  return view;
};

// A day tab's delete X is icon-only with no accessibilityLabel, so there is no accessible
// name to query it by. It sits as the last child of the row its text label is in, which is
// what this walks to. (The "..." menu button is labelled "Trip options".)
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
  it("shows its days", async () => {
    const view = await openTrip();

    expect(view.getByText("Day 1")).toBeTruthy();
    expect(view.getByText("Day 3")).toBeTruthy();
  });

  // The bar has no title row: on a phone the timeline needs the room. The trip's name,
  // dates and length head the trip view instead, and scroll away with it.
  it("names the trip, with its dates and length, at the top of the trip view", async () => {
    const view = await openTripView();

    expect(view.getByText("Hot Pools Weekend")).toHaveStyle({ color: tokens.colors.text });
    expect(view.getByText("1 Oct — 3 Oct · 3 days")).toBeTruthy();
  });

  it("leaves the name off the day timeline", async () => {
    const view = await openTrip();
    expect(view.queryByText("Hot Pools Weekend")).toBeNull();
  });

  it("falls back to a generic name for an unnamed trip", async () => {
    mockTrips.itineraries = [makeTrip({ title: "" })];
    const view = await openTripView();
    expect(view.getByText("My Trip")).toBeTruthy();
  });

  it("puts the trip menu on the switch's row", async () => {
    const view = await openTripView();

    const row = view.getByLabelText("Trip options").parent!;
    expect(within(row).getByText("Trip")).toBeTruthy();
    expect(within(row).getByText("Days")).toBeTruthy();
  });

  // The day tabs sit in the dark brand bar, so the open day takes the highlight's
  // on-dark twin, like the selected category on Explore.
  it("marks the open day in the highlight colour, and only that one", async () => {
    const view = await openTrip();

    expect(view.getByText("Day 1")).toHaveStyle({ color: tokens.colors.highlightOnDark });
    expect(view.getByText("Day 2")).toHaveStyle({ color: "#FFFFFF" });
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

  // It used to be the one day that couldn't go. Arriving a day later means the trip
  // starts a day later: the other days keep their dates.
  it("deletes the first day too, starting the trip a day later", async () => {
    const view = await openTrip();

    await waitFor(() => expect(view.getByText("Day 1")).toBeTruthy());
    await fireEvent.press(iconButtonBesideText(view, "Day 1", 2));
    takeAlertButton("Delete");

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const payload = mockTrips.saveItinerary.mock.calls[0][0];
    expect(payload.days.map((d: any) => [d.id, d.date])).toEqual([
      ["day_2", "2026-10-02"],
      ["day_3", "2026-10-03"],
    ]);
    expect(payload.startDate).toBe("2026-10-02");
    expect(payload.endDate).toBe("2026-10-03");
  });
});

describe("the trip menu", () => {
  it("opens from the header", async () => {
    const view = await openTrip();

    await fireEvent.press(view.getByLabelText("Trip options"));

    expect(view.getByText("Delete Trip")).toBeTruthy();
  });

  it("opens the trip editor on the trip as it stands", async () => {
    const view = await openTrip();
    await fireEvent.press(view.getByLabelText("Trip options"));

    await fireEvent.press(view.getByText("Edit Trip"));

    expect(view.getByText("Editing Hot Pools Weekend, 3 days")).toBeTruthy();
  });

  it("offers Switch Trip only when there is another trip to switch to", async () => {
    const view = await openTrip();
    await fireEvent.press(view.getByLabelText("Trip options"));
    expect(view.queryByText("Switch Trip")).toBeNull();
  });

  it("offers Switch Trip once there are two", async () => {
    mockTrips.itineraries = [makeTrip(), { ...makeTrip(), id: "t2", title: "Taupo Leg" }];
    const view = await openTrip();

    await fireEvent.press(view.getByLabelText("Trip options"));
    await fireEvent.press(view.getByText("Switch Trip"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/itinerary");
  });

  it("confirms a trip deletion before doing it", async () => {
    const view = await openTrip();
    await fireEvent.press(view.getByLabelText("Trip options"));

    await fireEvent.press(view.getByText("Delete Trip"));

    expect(view.getByText("Delete Hot Pools Weekend?")).toBeTruthy();
    expect(mockTrips.deleteItinerary).not.toHaveBeenCalled();
  });

  it("deletes the trip and leaves the screen once confirmed", async () => {
    const view = await openTrip();
    await fireEvent.press(view.getByLabelText("Trip options"));
    await fireEvent.press(view.getByText("Delete Trip"));

    await fireEvent.press(view.getByText("Delete Trip", { exact: true }));

    await waitFor(() => expect(mockTrips.deleteItinerary).toHaveBeenCalledWith("t1"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)/itinerary");
  });

  it("says so and stays put when the delete fails", async () => {
    mockTrips.deleteItinerary = jest.fn().mockRejectedValue(new Error("server error"));
    const view = await openTrip();
    await fireEvent.press(view.getByLabelText("Trip options"));
    await fireEvent.press(view.getByText("Delete Trip"));

    await fireEvent.press(view.getByText("Delete Trip", { exact: true }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Couldn't Delete Trip", "Please try again."));
    expect(mockRouter.replace).not.toHaveBeenCalled();
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

// Between two areas the planner reserves that pair's drive time (lib/areas.ts) and the
// timeline draws it as a block. Inside one area nothing changes.
describe("the drive between areas", () => {
  it("draws the drive as a block ending where the next place starts", async () => {
    mockTrips.itineraries = [tripOf([gardens({ slotIndex: 2 }), museum({ slotIndex: 13 })])];
    const view = await openTrip();

    expect(view.getByText("Drive to Dunedin")).toBeTruthy();
    expect(view.getByText("Christchurch to Dunedin")).toBeTruthy();
    expect(view.getByTestId("drive-block")).toHaveStyle({ height: 9 * 72, transform: [{ translateY: 4 * 72 }] });
  });

  it("draws no drive between two places in the same area", async () => {
    mockTrips.itineraries = [tripOf([gardens({ slotIndex: 2 }), gondola({ slotIndex: 5 })])];
    const view = await openTrip();

    expect(view.getByText("Gondola")).toBeTruthy();
    expect(view.queryByTestId("drive-block")).toBeNull();
  });

  it("opens a day with the drive from where the day before ended", async () => {
    mockTrips.itineraries = [tripOf([gardens({ slotIndex: 2 })], [museum({ slotIndex: 9 })])];
    const view = await openTrip({ jumpToDay: "day_2" });

    await waitFor(() => expect(view.getByText("Drive to Dunedin")).toBeTruthy());
    expect(view.getByTestId("drive-block")).toHaveStyle({ top: 0, height: 9 * 72 });
  });

  it("re-times and saves a stored day that left no room for its drive", async () => {
    mockTrips.itineraries = [tripOf([gardens({ slotIndex: 2 }), museum({ slotIndex: 5 })])];
    await openTrip();

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const day1 = mockTrips.saveItinerary.mock.calls[0][0].days[0];
    expect(day1.items.map((i: any) => i.slotIndex)).toEqual([2, 13]);
  });

  // "Find more things to do" opens Explore on the town the traveller is in at that gap:
  // before the drive, Christchurch; after it, Dunedin. It used to open the user's own town.
  it("opens Explore on the town each free gap is in", async () => {
    mockTrips.itineraries = [tripOf([gardens({ slotIndex: 2 }), museum({ slotIndex: 20 })])];
    const view = await openTrip();

    const gaps = view.getAllByTestId("free-gap");
    await fireEvent.press(within(gaps[0]).getByText("+ Find more things to do"));
    await fireEvent.press(within(gaps[gaps.length - 1]).getByText("+ Find more things to do"));

    expect(mockRouter.push).toHaveBeenNthCalledWith(1, { pathname: "/(app)/(tabs)/sites", params: { area: "christchurch" } });
    expect(mockRouter.push).toHaveBeenNthCalledWith(2, { pathname: "/(app)/(tabs)/sites", params: { area: "dunedin" } });
  });

  // A trip's first day has no day before it: a gap before its first place is in the
  // town that place is in.
  it("opens Explore on the first place's town for a gap before it on the first day", async () => {
    mockTrips.itineraries = [tripOf([museum({ slotIndex: 20 })])];
    const view = await openTrip();

    await fireEvent.press(within(view.getAllByTestId("free-gap")[0]).getByText("+ Find more things to do"));

    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/(app)/(tabs)/sites", params: { area: "dunedin" } });
  });

  it("opens Explore on the town the day before ended in, for an empty day", async () => {
    mockTrips.itineraries = [tripOf([museum()], [])];
    const view = await openTrip({ jumpToDay: "day_2" });

    await waitFor(() => expect(view.queryAllByText("Nothing here yet").length).toBeGreaterThan(0));
    await fireEvent.press(view.getAllByText("Nothing here yet")[0]);

    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/(app)/(tabs)/sites", params: { area: "dunedin" } });
  });

  // Gardens 9 to 10, then free until the drive leaves at 1:30 for a 6:00 PM arrival.
  it("keeps the free-time card out of the drive", async () => {
    mockTrips.itineraries = [tripOf([gardens({ slotIndex: 2 }), museum({ slotIndex: 20 })])];
    const view = await openTrip();

    const gaps = view.getAllByTestId("free-gap");
    expect(gaps).toHaveLength(2);
    expect(gaps[0]).toHaveStyle({ top: 4 * 72, height: 7 * 72 });
    expect(gaps[1]).toHaveStyle({ top: 22 * 72, height: 6 * 72 });
  });
});

// Without the place list every drive would be the flat half hour, so nothing is packed,
// drawn or edited until it is in.
describe("waiting for the place list", () => {
  it("holds the loading state until the places are in", async () => {
    mockLookup.ready = false;
    const view = await openTrip();

    expect(view.getByText("Loading your trip...")).toBeTruthy();
    expect(view.queryByText("Wai-O-Tapu")).toBeNull();
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
  });

  it("offers a retry when the places couldn't be loaded", async () => {
    mockLookup.ready = false;
    mockLookup.err = "Network request failed";
    const view = await openTrip();

    expect(view.getByText("Couldn't load your trip")).toBeTruthy();
    await fireEvent.press(view.getByText("Try Again"));
    expect(mockLookup.refresh).toHaveBeenCalled();
  });
});

// Every edit goes through the planner's gate (tryEdit): one that would leave any day of
// the trip ending past 10 PM is refused, with the reason.
describe("edits that don't fit", () => {
  beforeEach(entitle);

  // Museum then Castle are both Dunedin. Gardens dropped between them adds a second drive.
  it("refuses a reorder that adds a drive the day has no room for, and leaves the day as it was", async () => {
    mockTrips.itineraries = [
      tripOf([
        gardens({ slotIndex: 0, durationSlots: 6 }),
        museum({ slotIndex: 15, durationSlots: 6 }),
        castle({ slotIndex: 22, durationSlots: 6 }),
      ]),
    ];
    const view = await openTrip();

    await fireEvent.press(view.getByText("Drop late Gardens"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Not Enough Time",
      "There isn't time for the drive to Christchurch on this day. Try a different day or a shorter visit.",
    );
    expect(view.getByText("Drive to Dunedin")).toBeTruthy();
    expect(view.queryByText("Drive to Christchurch")).toBeNull();
  });

  it("refuses a longer visit the day has no room for, but keeps the note that came with it", async () => {
    mockTrips.itineraries = [
      tripOf([gardens({ slotIndex: 0, durationSlots: 10 }), gondola({ slotIndex: 11, durationSlots: 10 })]),
    ];
    const view = await openTrip();

    await fireEvent.press(view.getByText("Edit Gardens"));
    await fireEvent.press(view.getByText("Longer visit"));

    expect(alertSpy).toHaveBeenCalledWith("Not Enough Time", "This day is full. Try a different day or shorten the visit.");
    await view.unmount();
    const saved = mockTrips.saveItinerary.mock.calls[0][0].days[0].items[0];
    expect(saved).toMatchObject({ id: "gardens", durationSlots: 10, note: "bring cash" });
  });

  // Day 1 ends in Dunedin, so day 2 starts there. Without the Museum, day 1 ends in
  // Christchurch and day 2 has to open with a 4.5 hour drive it has no room for.
  it("refuses removing a day's last place when the next day then can't fit its drive", async () => {
    mockTrips.itineraries = [
      tripOf([gardens({ slotIndex: 2 }), museum({ slotIndex: 13 })], [castle({ slotIndex: 0, durationSlots: 20 })]),
    ];
    const view = await openTrip();

    await fireEvent.press(view.getByText("Edit Museum"));
    await fireEvent.press(view.getByText("Remove stop"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Not Enough Time",
      "Day 2 would no longer fit after the drive from Christchurch. Make room on Day 2 first.",
    );
    expect(view.getByText("Museum")).toBeTruthy();
  });

  it("re-times the next day in the saved trip when a removal that fits changes its drive", async () => {
    mockTrips.itineraries = [tripOf([gardens({ slotIndex: 2 }), museum({ slotIndex: 13 })], [castle({ slotIndex: 1 })])];
    const view = await openTrip();

    await fireEvent.press(view.getByText("Edit Museum"));
    await fireEvent.press(view.getByText("Remove stop"));
    await view.unmount();

    const days = mockTrips.saveItinerary.mock.calls[0][0].days;
    expect(days[0].items.map((i: any) => i.id)).toEqual(["gardens"]);
    expect(days[1].items[0]).toMatchObject({ id: "castle", slotIndex: 9 });
  });

  // Day 2 is 12:30 to 9:30 PM in Christchurch: no room to add a place in Dunedin. Day 3 is empty.
  it("offers only the days a place would fit on when moving it", async () => {
    mockTrips.itineraries = [
      tripOf([gardens({ slotIndex: 2 }), museum({ slotIndex: 13 })], [gondola({ slotIndex: 9, durationSlots: 18 })], []),
    ];
    const view = await openTrip();

    await fireEvent.press(view.getByText("Edit Museum"));

    expect(view.getByText("Move to Day 3")).toBeTruthy();
    expect(view.queryByText("Move to Day 2")).toBeNull();
  });

  it("moves a place to a later day, and saves both days", async () => {
    mockTrips.itineraries = [
      tripOf([gardens({ slotIndex: 2 }), museum({ slotIndex: 13 })], [gondola({ slotIndex: 9, durationSlots: 18 })], []),
    ];
    const view = await openTrip();

    await fireEvent.press(view.getByText("Edit Museum"));
    await fireEvent.press(view.getByText("Move to Day 3"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const days = mockTrips.saveItinerary.mock.calls[0][0].days;
    expect(days[0].items.map((i: any) => i.id)).toEqual(["gardens"]);
    expect(days[2].items.map((i: any) => i.id)).toEqual(["museum"]);
    expect(view.getByText("Museum")).toBeTruthy();
  });
});

// The trip view and the day timeline are two views of one trip, swapped by the switch
// under the title. Which town a day is in comes from its places (tripOverview.test.tsx).
describe("the trip view", () => {
  const isSelected = (view: any, name: string) => view.getByRole("tab", { name }).props.accessibilityState?.selected;

  it("is what a trip opens on: a row for each day, and no timeline", async () => {
    const view = await openTripView();

    expect(view.getByText(/^Day 1 · /)).toBeTruthy();
    expect(view.getByText(/^Day 3 · /)).toBeTruthy();
    expect(view.queryByText("Wai-O-Tapu")).toBeNull();
  });

  it("marks Trip on the switch, and shows no day tabs", async () => {
    const view = await openTripView();

    expect(isSelected(view, "Trip")).toBe(true);
    expect(isSelected(view, "Days")).toBe(false);
    expect(view.getByText("Trip")).toHaveStyle({ color: tokens.colors.text });
    expect(view.queryByText("Day 1")).toBeNull();
  });

  it("swaps to the day timeline, with its day tabs, on Days", async () => {
    const view = await openTripView();

    await fireEvent.press(view.getByText("Days"));

    expect(isSelected(view, "Days")).toBe(true);
    expect(view.getByText("Wai-O-Tapu")).toBeTruthy();
    expect(view.getByText("Day 1")).toHaveStyle({ color: tokens.colors.highlightOnDark });
    expect(view.queryByText(/^Day 1 · /)).toBeNull();
  });

  it("swaps back on Trip", async () => {
    const view = await openTrip();

    await fireEvent.press(view.getByText("Trip"));

    expect(view.getByText(/^Day 1 · /)).toBeTruthy();
    expect(view.queryByText("Wai-O-Tapu")).toBeNull();
  });

  it("opens a day's timeline when its row is tapped", async () => {
    mockTrips.itineraries = [tripOf([gardens()], [gondola()])];
    const view = await openTripView();

    await fireEvent.press(view.getByText(/^Day 2 · /));

    await waitFor(() => expect(view.getByText("Gondola")).toBeTruthy());
    expect(view.queryByText("Gardens")).toBeNull();
    expect(view.getByText("Day 2")).toHaveStyle({ color: tokens.colors.highlightOnDark });
  });

  // Day 1 is the open day from the start, so tapping its row changes no day: it must
  // still leave the trip view.
  it("opens the first day's timeline from its row too", async () => {
    const view = await openTripView();

    await fireEvent.press(view.getByText(/^Day 1 · /));

    expect(view.getByText("Wai-O-Tapu")).toBeTruthy();
  });

  // Adding a place sends the user here with the day it went on.
  it("goes straight to the day when the caller jumped to one", async () => {
    mockTrips.itineraries = [tripOf([gardens()], [gondola()])];
    const view = await openTripView({ jumpToDay: "day_2" });

    await waitFor(() => expect(view.getByText("Gondola")).toBeTruthy());
    expect(isSelected(view, "Days")).toBe(true);
  });

  it("saves an edit, once, when the user swaps to the trip view", async () => {
    entitle();
    const view = await openTrip();
    await fireEvent.press(view.getByText("Drag Wai-O-Tapu"));
    await fireEvent.press(view.getByText("Drop Wai-O-Tapu"));
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();

    await fireEvent.press(view.getByText("Trip"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalledTimes(1));
    expect(mockTrips.saveItinerary.mock.calls[0][0].days[0].items[0].slotIndex).toBe(5);
  });

  it("shows the towns, and the drive a day opens with", async () => {
    mockTrips.itineraries = [tripOf([gardens()], [museum()])];
    const view = await openTripView();

    await waitFor(() => expect(view.getByText("Starts with the drive from Christchurch")).toBeTruthy());
    expect(view.getByText("Christchurch")).toBeTruthy();
    expect(view.getByText("Dunedin")).toBeTruthy();
  });

  // The screen for a trip stays mounted between visits, so the second place added to the
  // same trip arrives as new params on the same screen, not a fresh one.
  it("honours a later jump to another day, from the trip view too", async () => {
    mockTrips.itineraries = [tripOf([gardens()], [gondola()], [castle()])];
    const view = await openTripView({ jumpToDay: "day_2", jumpToSlot: "2" });
    await waitFor(() => expect(view.getByText("Gondola")).toBeTruthy());
    await fireEvent.press(view.getByText("Trip"));

    await view.rerender(<ItineraryDetailView tripId="t1" jumpToDay="day_3" jumpToSlot="4" />);

    await waitFor(() => expect(view.getByText("Castle")).toBeTruthy());
    expect(view.getByText("Day 3")).toHaveStyle({ color: tokens.colors.highlightOnDark });
  });

  // No photo of the town itself yet: its top featured place's photo stands in.
  it("shows each day's town as a picture, from the town's places until it has its own", async () => {
    mockLookup.list = [
      { id: "chc-a", area: "christchurch", featured: 2, imageThumbnailUrl: "https://img/gardens-thumb.webp" },
      { id: "dun-a", area: "dunedin" },
    ];
    mockTrips.itineraries = [tripOf([gardens()], [museum()])];
    const view = await openTripView();

    await waitFor(() => expect(view.getAllByTestId("day-image")).toHaveLength(1));
    expect(view.getByTestId("day-image").props.source).toEqual({ uri: "https://img/gardens-thumb.webp" });
    expect(view.getAllByTestId("day-image-placeholder")).toHaveLength(1);
  });

  it("has no switch while the places are still loading", async () => {
    mockLookup.ready = false;
    const view = await openTripView();

    expect(view.getByText("Loading your trip...")).toBeTruthy();
    expect(view.queryByText("Trip")).toBeNull();
  });
});

// A drive can be moved between the place before it and the one it leads to. Gardens ends
// at 9:00 AM and the Museum starts at 3:00 PM; the 4.5 hour drive starts 10:30 AM unless
// moved. Moved through the block's screen-reader action, which is what a drag lands on.
describe("moving a drive", () => {
  const nudge = async (view: any, actionName: "increment" | "decrement") =>
    fireEvent(view.getByTestId("drive-block"), "accessibilityAction", { nativeEvent: { actionName } });

  beforeEach(() => {
    mockTrips.itineraries = [tripOf([gardens({ slotIndex: 0 }), museum({ slotIndex: 14 })])];
  });

  it("starts where it ends at the next place until it is moved", async () => {
    const view = await openTrip();

    expect(view.getByLabelText("Drive from Christchurch to Dunedin, about 4.5 hours, leaving 10:30 AM")).toBeTruthy();
  });

  it("moves for an entitled user, and is saved on the place it leads to", async () => {
    entitle();
    const view = await openTrip();

    await nudge(view, "decrement");

    expect(view.getByLabelText("Drive from Christchurch to Dunedin, about 4.5 hours, leaving 10:00 AM")).toBeTruthy();
    await fireEvent.press(view.getByText("Trip"));
    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalledTimes(1));
    const saved = mockTrips.saveItinerary.mock.calls[0][0].days[0].items;
    expect(saved.find((i: any) => i.id === "museum").driveStartSlot).toBe(4);
    expect(saved.find((i: any) => i.id === "museum").slotIndex).toBe(14);
  });

  it("upsells instead of moving for a user who can't reorder", async () => {
    const view = await openTrip();

    await nudge(view, "decrement");

    expect(view.getByText("Premium Modal")).toBeTruthy();
    expect(view.getByLabelText("Drive from Christchurch to Dunedin, about 4.5 hours, leaving 10:30 AM")).toBeTruthy();
  });
});

// A South Island trip can run three weeks or more, far more days than the strip shows.
describe("a long trip", () => {
  const isoFrom = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  // 21 days; startOffset is the first day's distance from today.
  const longTrip = (startOffset: number) =>
    makeTrip({
      days: Array.from({ length: 21 }, (_, i) => ({ id: "day_" + (i + 1), date: isoFrom(startOffset + i), items: [] })),
    });
  const scrollTo = () => (ScrollView.prototype as any).scrollTo as jest.Mock;

  beforeEach(() => scrollTo().mockClear());

  it("opens Days on today when the trip is under way", async () => {
    mockTrips.itineraries = [longTrip(-14)];
    const view = await openTrip();

    expect(view.getByText("Day 15")).toHaveStyle({ color: tokens.colors.highlightOnDark });
  });

  it("opens Days on the first day before the trip starts", async () => {
    mockTrips.itineraries = [longTrip(3)];
    const view = await openTrip();

    expect(view.getByText("Day 1")).toHaveStyle({ color: tokens.colors.highlightOnDark });
  });

  // The open day's tab is put in the middle of the strip, wherever it is along it.
  it("keeps the open day's tab in view", async () => {
    mockTrips.itineraries = [longTrip(3)];
    const view = await openTrip();
    await fireEvent(view.getByTestId("day-strip"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 375, height: 58 } } });
    await fireEvent(view.getByTestId("day-tab-day_17"), "layout", {
      nativeEvent: { layout: { x: 1200, y: 0, width: 80, height: 58 } },
    });
    scrollTo().mockClear();

    await fireEvent.press(view.getByText("Day 17"));

    expect(scrollTo()).toHaveBeenCalledWith({ x: 1200 + 40 - 375 / 2, animated: true });
  });

  // Past 60 the api turns the save away, which would only show as "Couldn't save".
  it("stops offering Add Day at 60 days", async () => {
    entitle();
    const sixty = makeTrip({ days: Array.from({ length: 60 }, (_, i) => ({ id: "day_" + (i + 1), date: isoFrom(100 + i), items: [] })) });
    mockTrips.itineraries = [sixty];
    const view = await openTrip();
    expect(view.queryByText("Add Day")).toBeNull();
  });

  it("still offers Add Day at 59", async () => {
    entitle();
    mockTrips.itineraries = [
      makeTrip({ days: Array.from({ length: 59 }, (_, i) => ({ id: "day_" + (i + 1), date: isoFrom(100 + i), items: [] })) }),
    ];
    const view = await openTrip();
    expect(view.getByText("Add Day")).toBeTruthy();
  });

  // Swiping the timeline sideways changes day (lifecycle in daySwipe.test.ts); it has to
  // be wired to the timeline itself.
  it("listens for a sideways swipe on the timeline", async () => {
    mockTrips.itineraries = [longTrip(3)];
    const view = await openTrip();
    expect(view.getByTestId("timeline").props.onMoveShouldSetResponder).toEqual(expect.any(Function));
  });
});

