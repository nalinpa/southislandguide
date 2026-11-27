// A guest on the open Duo sees the open day of the suggested trip on the right, read-only.
// On a phone a tap on a day still asks them to sign in.
jest.mock("@/lib/uiKit", () => {
  const base = require("@/test/uiKitMock");
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  return {
    ...base,
    components: {
      ...base.components,
      TimelineBlock: ({ item, holdToDrag, readOnly, onEdit, onDrop }: any) =>
        React.createElement(
          TouchableOpacity,
          { testID: "stop-" + item.siteId, onPress: () => onEdit(item), accessibilityHint: String(holdToDrag), accessibilityLabel: String(readOnly), accessibilityValue: { text: String(onDrop(item.id, 99)) } },
          React.createElement(Text, null, "Stop: " + item.siteName),
        ),
      TransitBlock: () => null,
    },
  };
});
jest.mock("@/components/itinerary/CreateItineraryModal", () => ({ CreateItineraryModal: () => null }));
jest.mock("@/components/itinerary/ItineraryDetailView", () => ({ ItineraryDetailView: () => null }));
jest.mock("@/components/itinerary/DriveBlock", () => ({ DriveBlock: () => null }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: { status: "guest" } }) }));
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => ({ itineraries: [], loading: false, error: null, refetch: jest.fn() }) }));
jest.mock("@/lib/hooks/usePlaceLookup", () => ({
  usePlaceLookup: () => ({ places: () => undefined, list: [], ready: true, count: 0, err: "", refresh: jest.fn() }),
}));
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useFocusEffect: (effect: () => void) => require("react").useEffect(effect, []),
}));

import React from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { fireEvent, render, within } from "@testing-library/react-native";

import ItineraryListPage from "@/app/(app)/(tabs)/itinerary/index";
import { GuestDayView } from "@/components/itinerary/GuestDayView";
import { ITINERARY_TEMPLATES } from "@/lib/itineraryTemplates";

const ui = () => require("@blacksands/ui");
const sample = ITINERARY_TEMPLATES.find((t) => t.key === "south-island-in-7-days-from-christchurch")!;
const stopsOf = (n: number) => sample.days[n - 1].items.map((i: any) => i.siteId);
const shown = (view: any) => view.queryAllByTestId(/^stop-/).map((n: any) => n.props.testID.slice(5));

beforeEach(() => {
  jest.clearAllMocks();
  ui().__setWide(true, { width: 669, height: 951 });
});
afterEach(() => ui().__setWide(false));

describe("a guest on the Duo", () => {
  // The inset is 0 here (sideways the status bar is in the rail): 32 from the top, both panes.
  it("starts both panes 32 from the top when there is no inset", async () => {
    const view = await render(<ItineraryListPage />);
    const flat = (id: string) => StyleSheet.flatten(view.getByTestId(id).props.style) as any;

    expect(flat("day-heading").paddingTop).toBe(32);
    expect(flat("trip-list-pane").paddingTop).toBe(16); // + the list's own 16
  });

  it("shows day 1 on the right, and day 3 after a tap on its row", async () => {
    const view = await render(<ItineraryListPage />);
    const pane = within(view.getByTestId("trip-day-pane"));

    expect(within(view.getByTestId("day-heading")).getByText("Day 1")).toBeTruthy();
    expect(shown(view)).toEqual(stopsOf(1));
    expect(pane.getAllByTestId(/^stop-/).length).toBeGreaterThan(0);

    await fireEvent.press(view.getByText("Day 3"));

    expect(within(view.getByTestId("day-heading")).getByText("Day 3")).toBeTruthy();
    expect(shown(view)).toEqual(stopsOf(3));
  });

  it("does not ask to sign in on a row tap, and keeps the sign-in bar", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const view = await render(<ItineraryListPage />);
    await fireEvent.press(view.getByText("Day 2"));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(view.getByText("Sign In to Plan a Trip")).toBeTruthy();
    alertSpy.mockRestore();
  });

  it("makes the stops read-only: no pick-up, a drop settles where it was, a tap opens the place", async () => {
    const view = await render(<ItineraryListPage />);
    const first = view.getByTestId("stop-" + stopsOf(1)[0]);

    expect(first.props.accessibilityLabel).toBe("true");
    expect(first.props.accessibilityHint).toBe("undefined");
    expect(first.props.accessibilityValue.text).toBe(String(sample.days[0].items[0].slotIndex ?? 0));
    await fireEvent.press(first);
    expect(mockRouter.push).toHaveBeenCalledWith(`/(app)/(tabs)/sites/${stopsOf(1)[0]}`);
  });

  it("keeps the open day across the fold, and on a phone a tap still asks to sign in", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const view = await render(<ItineraryListPage />);
    await fireEvent.press(view.getByText("Day 3"));

    ui().__setWide(false);
    await view.rerender(<ItineraryListPage />);
    expect(view.queryByTestId("trip-day-pane")).toBeNull();
    await fireEvent.press(view.getByText("Day 4"));
    expect(alertSpy).toHaveBeenCalledWith("Sign In Required", "Sign in to plan your trip.", expect.any(Array));

    ui().__setWide(true, { width: 669, height: 951 });
    await view.rerender(<ItineraryListPage />);
    expect(within(view.getByTestId("day-heading")).getByText("Day 3")).toBeTruthy();
    alertSpy.mockRestore();
  });
});

// The trip quiz draws a day of the trip it has built with the same view, under a top row of its own, before the
// trip is saved: so it says where the heading starts, takes a tap on a stop itself, and has a line of its own
// to put under the heading.
describe("a day drawn for another screen", () => {
  const days = sample.days.map((day: any, i: number) => ({
    id: "day_" + (i + 1),
    date: "2026-02-0" + (i + 1),
    items: day.items.map((item: any, j: number) => ({ ...item, id: "stop_" + i + "_" + j, timeLabel: "", durationLabel: "" })),
  }));
  const day = (over: object = {}) =>
    render(<GuestDayView days={days} index={0} places={() => undefined} iconFor={() => () => null} {...over} />);
  const headingTop = (view: any) => (StyleSheet.flatten(view.getByTestId("day-heading").props.style) as any).paddingTop;

  it("starts its heading where it is told to, in place of a pane's own start at the top of the screen", async () => {
    expect(headingTop(await day())).toBe(32);
    expect(headingTop(await day({ top: 0 }))).toBe(0);
  });

  it("hands a tap on a stop to its caller, which then decides what it does", async () => {
    const onOpenPlace = jest.fn();
    const view = await day({ onOpenPlace });

    await fireEvent.press(view.getByTestId("stop-" + stopsOf(1)[0]));

    expect(onOpenPlace).toHaveBeenCalledWith(stopsOf(1)[0]);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("shows its caller's line under the heading, and none of its own", async () => {
    expect(within((await day()).getByTestId("day-heading")).queryByText("Long drive.")).toBeNull();

    const view = await day({ note: <Text>Long drive.</Text> });

    expect(within(view.getByTestId("day-heading")).getByText("Long drive.")).toBeTruthy();
  });
});
