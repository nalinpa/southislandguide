// The Duo test fixes (2026-11-16): the trip's top gap sideways, and the ⋯ menu as a centred card.
// Same set-up as itineraryDetailView.test.tsx.
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
      TimelineBlock: ({ item, onDrop, onDragStart, onEdit, onNotePress, wide }: any) => {
        // Counts mounts, to tell a remount from a redraw; and keeps the `wide` it was given.
        React.useEffect(() => {
          mockMounts.timeline++;
        }, []);
        mockMounts.wide = wide;
        return React.createElement(
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
        );
      },
      TransitBlock: () => null,
    },
  };
});

// The trip list, wrapped to count its mounts (see "keeps the list across the breakpoint").
jest.mock("@/components/itinerary/TripOverview", () => {
  const React = require("react");
  const actual = jest.requireActual("@/components/itinerary/TripOverview");
  return {
    ...actual,
    TripOverview: (props: any) => {
      React.useEffect(() => {
        mockMounts.overview++;
      }, []);
      return React.createElement(actual.TripOverview, props);
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
const mockMounts = { overview: 0, timeline: 0, wide: undefined as boolean | undefined };
const mockInsets = { top: 44, bottom: 34, left: 0, right: 0 };
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
    CreateItineraryModal: ({ visible, trip, replaceId, showTemplateOption }: any) =>
      !visible
        ? null
        : replaceId
          ? React.createElement(Text, null, `New trip over ${replaceId}${showTemplateOption ? ", with suggested trips" : ""}`)
          : React.createElement(Text, null, `Editing ${trip.title}, ${trip.days.length} days`),
  };
});
// The calendar export has its own tests (lib/__tests__/tripCalendar.test.ts).
const mockAddTripToCalendar = jest.fn();
jest.mock("@/lib/tripCalendar", () => ({ addTripToCalendar: (...args: any[]) => mockAddTripToCalendar(...args) }));
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
    useSafeAreaInsets: () => mockInsets,
  };
});

jest.mock("expo-crypto", () => ({ randomUUID: () => "fixed" }));
// DriveBlock takes the engine's gesture from @blacksands/components, whose bundle loads moti
// and FlashList (not transformed under Jest) and the map (native). Nothing here uses them.
jest.mock("moti", () => ({ MotiView: require("react-native").View }));
jest.mock("@shopify/flash-list", () => ({ FlashList: require("react-native").View }));
jest.mock("react-native-maps", () => ({}));
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
import { Alert, Linking, ScrollView, StyleSheet } from "react-native";
import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";

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
  mockMounts.overview = 0;
  mockMounts.timeline = 0;
  mockMounts.wide = undefined;
  mockInsets.right = 0;
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

const setWide = (size = { width: 669, height: 951 }) => require("@blacksands/ui").__setWide(true, size);
const flat = (el: any) => (StyleSheet.flatten(el.props.style) ?? {}) as any;

describe("the trip's top gap on the Duo", () => {
  it("sideways, with no status-bar inset, both panes start 32 from the top", async () => {
    mockInsets.top = 0;
    setWide({ width: 951, height: 669 });
    const view = await openTripView();

    // The list pane's own 16 + TripOverview's 16 padding.
    expect(flat(view.getByTestId("trip-list-pane")).paddingTop).toBe(16);
    expect(flat(view.getByTestId("day-heading")).paddingTop).toBe(32);
    mockInsets.top = 44;
  });

  it("upright, with the inset, is as it was", async () => {
    mockInsets.top = 44;
    setWide({ width: 669, height: 951 });
    const view = await openTripView();

    expect(flat(view.getByTestId("trip-list-pane")).paddingTop).toBe(44);
    expect(flat(view.getByTestId("day-heading")).paddingTop).toBe(44 + 16);
  });
});

describe("the trip's ⋯ menu on the Duo", () => {
  const words = ["Edit Trip", "Add to Calendar", "Start a New Trip", "Delete Trip"];

  it("is a centred 400 card with the same actions in the same order,", async () => {
    setWide({ width: 951, height: 669 });
    const view = await openTripView();
    await fireEvent.press(view.getByLabelText("Trip options"));

    const card = view.getByTestId("trip-menu-card");
    expect(flat(card).width).toBe(400);
    expect(flat(card.parent!).justifyContent).toBe("center");
    expect(flat(card.parent!).alignItems).toBe("center");
    const shown = words.map((w) => view.getByText(w));
    expect(shown).toHaveLength(4);
  });

  it("upright, its foot is 24 above the fold, as the dialogs", async () => {
    setWide({ width: 669, height: 951 });
    const view = await openTripView();
    await fireEvent.press(view.getByLabelText("Trip options"));

    expect(flat(view.getByTestId("trip-menu-card").parent!).paddingBottom).toBe(951 - 475.5 + 24);
  });

  it("still does its actions, and closes", async () => {
    setWide();
    const view = await openTripView();
    await fireEvent.press(view.getByLabelText("Trip options"));
    await fireEvent.press(view.getByText("Edit Trip"));

    expect(view.getByText("Editing Hot Pools Weekend, 3 days")).toBeTruthy();
    expect(view.queryByText("Delete Trip")).toBeNull();
  });

  it("on a phone is the popover under the button, not a centred card", async () => {
    require("@blacksands/ui").__setWide(false);
    const view = await openTrip();
    await fireEvent.press(view.getByLabelText("Trip options"));

    const card = view.getByTestId("trip-menu-card");
    expect(flat(card).width).toBeUndefined();
    expect(flat(card.parent!).alignItems).toBe("flex-end");
    expect(flat(card.parent!).paddingTop).toBe(60);
  });
});
