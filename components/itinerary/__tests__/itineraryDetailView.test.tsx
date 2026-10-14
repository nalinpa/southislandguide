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
  ready: true,
  count: 4,
  err: "",
  refresh: jest.fn(),
};
jest.mock("@/lib/hooks/usePlaceLookup", () => ({ usePlaceLookup: () => mockLookup }));
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

const openTrip = (props: Record<string, unknown> = {}) =>
  render(<ItineraryDetailView tripId="t1" {...(props as any)} />);

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

  it("titles the trip in white on the brand bar", async () => {
    const view = await openTrip();
    expect(view.getByText("Hot Pools Weekend")).toHaveStyle({ color: "#FFFFFF" });
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
});

describe("the trip menu", () => {
  it("opens from the header", async () => {
    const view = await openTrip();

    await fireEvent.press(view.getByLabelText("Trip options"));

    expect(view.getByText("Delete Trip")).toBeTruthy();
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
    expect(view.getByTestId("drive-block")).toHaveStyle({ top: 4 * 72, height: 9 * 72 });
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
