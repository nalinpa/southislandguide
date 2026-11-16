// The map's bottom sheet. Which of its three bodies shows depends on the GPS state, and
// TODAY'S TRIP takes precedence over NEARBY when the selected day has stops. "Add to
// Itinerary" is rendered only when the screen supplies a handler — for a guest it must be
// absent, not disabled (TASKS.md, Guest).

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { Image: (props: any) => React.createElement(View, props) };
});
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { LinearGradient: ({ children, style }: any) => React.createElement(View, { style }, children) };
});

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { ScrollView, View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children }: any) => React.createElement(View, { testID: "bottom-sheet" }, children),
    BottomSheetScrollView: ({ children }: any) => React.createElement(ScrollView, null, children),
  };
});

// The carousel's scrollTo, recorded.
const mockScrollTo = jest.fn();
jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { ScrollView } = require("react-native");
  const actual = jest.requireActual("react-native-gesture-handler");
  return {
    ...actual,
    ScrollView: React.forwardRef(({ children, ...p }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
      return React.createElement(ScrollView, p, children);
    }),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

import React from "react";
import { Linking } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { MapOverlayCard } from "@/components/map/MapOverlay";
import { tokens } from "@/lib/ui/tokens";
import { CATEGORY_CONFIG } from "@/components/map/SiteMarker";

const site = {
  id: "s1",
  name: "Wai-O-Tapu",
  lat: -38.35,
  lng: 176.36,
  category: ["Walks"],
} as any;

const handlers = { onOpen: jest.fn(), onSelectSite: jest.fn(), onFocusSite: jest.fn() };

const baseProps = {
  site,
  nearbySites: [] as any[],
  todayItems: null as any,
  locStatus: "granted",
  hasLoc: true,
  distanceMeters: 4200,
  ...handlers,
};

const openSheet = (over: Record<string, unknown> = {}) =>
  // Gesture handler 3 needs its root view, as app/_layout.tsx gives the real screen.
  render(
    <GestureHandlerRootView>
      <MapOverlayCard {...(baseProps as any)} {...(over as any)} />
    </GestureHandlerRootView>,
  );

let openUrlSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  openUrlSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
});

afterEach(() => openUrlSpy.mockRestore());

// Since the design sweep the sheet is the white page with dark text (it was deep teal with
// white text, and once faded to a pale colour that washed the nearby rows out).
describe("the sheet background", () => {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it("keeps the sheet's text readable on it", () => {
    for (const text of [tokens.colors.text, tokens.colors.text2, tokens.colors.textMuted]) {
      expect(contrast(text, tokens.colors.page)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("with no site selected", () => {
  it("renders no card at all", async () => {
    const view = await openSheet({ site: null });

    expect(view.queryByText("Wai-O-Tapu")).toBeNull();
    expect(view.queryByText("Details")).toBeNull();
  });

  it("still shows nearby sites, so there is a way to pick one", async () => {
    const view = await openSheet({
      site: null,
      nearbySites: [{ id: "s2", name: "Hell's Gate", distanceMeters: 800 }],
    });

    expect(view.queryByText("Nearby")).toBeNull();
  });
});

describe("while the GPS is still settling", () => {
  it("says it is calibrating rather than showing a wrong distance", async () => {
    const view = await openSheet({ hasLoc: false });

    expect(view.getByText("CALIBRATING GPS")).toBeTruthy();
    expect(view.getByText("View Details")).toBeTruthy();
  });

  it("says the same while an explicit refresh is in flight", async () => {
    const view = await openSheet({ refreshingGPS: true });
    expect(view.getByText("CALIBRATING GPS")).toBeTruthy();
  });

  it("drops the calibrating state once location was denied — it is never coming", async () => {
    const view = await openSheet({ hasLoc: false, locStatus: "denied" });

    expect(view.queryByText("CALIBRATING GPS")).toBeNull();
    expect(view.getByText("Details")).toBeTruthy();
  });

  it("drops it on a location error too", async () => {
    const view = await openSheet({ hasLoc: false, locError: true });
    expect(view.queryByText("CALIBRATING GPS")).toBeNull();
  });

  it("can still open the site from the calibrating card", async () => {
    const view = await openSheet({ hasLoc: false });

    await fireEvent.press(view.getByText("View Details"));

    expect(handlers.onOpen).toHaveBeenCalled();
  });
});

describe("the selected site", () => {
  it("names it and offers both actions", async () => {
    const view = await openSheet();

    expect(view.getByText("Wai-O-Tapu")).toBeTruthy();
    expect(view.getByText("Details")).toBeTruthy();
    expect(view.getByText("Get Directions")).toBeTruthy();
  });

  // It used to print the raw ids: "FOOD · WEST-COAST".
  it("names its category and town in words", async () => {
    const view = await openSheet({ site: { ...site, category: ["Food"], area: "wanaka", region: "queenstown-wanaka" } });

    expect(view.getByText(/^Food & Drink · Wānaka/)).toBeTruthy();
  });

  it("opens the site", async () => {
    const view = await openSheet();

    await fireEvent.press(view.getByText("Details"));

    expect(handlers.onOpen).toHaveBeenCalled();
  });

  it("opens maps for directions to that site's coordinates", async () => {
    const view = await openSheet();

    await fireEvent.press(view.getByText("Get Directions"));

    // After the overseas check (lib/utils/directions.ts), which says no here: no position.
    await waitFor(() => expect(openUrlSpy).toHaveBeenCalledWith(expect.stringContaining("destination=-38.35,176.36")));
  });

  it("recentres the map on the site when its name is tapped", async () => {
    const view = await openSheet();

    await fireEvent.press(view.getByText("Wai-O-Tapu"));

    expect(handlers.onFocusSite).toHaveBeenCalled();
  });

  // A fact, so plain text on the facts line: colour is kept for what to tap.
  it("shows the distance in plain text, with the other facts", async () => {
    const view = await openSheet();

    expect(view.getByText(/^\d+(\.\d+)?\s?k?m$/)).toHaveStyle({ color: tokens.colors.text2 });
  });

  // Orange buttons carry a white label everywhere, so they use the full-strength
  // highlight: white on the lighter on-dark orange is only 1.7:1.
  // A trip planner's main action is Add to Trip (tester, 2026-11-09), so Directions is plain.
  it("makes Directions a plain white button like Details", async () => {
    const view = await openSheet();

    expect(view.getByRole("button", { name: "Get Directions" })).not.toHaveStyle({
      backgroundColor: tokens.colors.highlight,
    });
    expect(view.getByText("Get Directions")).toHaveStyle({ color: tokens.colors.text });
    expect(view.getByRole("button", { name: "Details" })).not.toHaveStyle({
      backgroundColor: tokens.colors.highlight,
    });
  });

  it("shows a distance only when there is a location to measure from", async () => {
    const withLoc = await openSheet();
    expect(withLoc.getByText(/^\d+(\.\d+)?\s?k?m$/)).toBeTruthy();

    const denied = await openSheet({ hasLoc: false, locStatus: "denied" });
    expect(denied.queryByText(/^\d+(\.\d+)?\s?k?m$/)).toBeNull();
  });
});

describe("add to itinerary", () => {
  it("is absent when the screen supplies no handler", async () => {
    const view = await openSheet();
    expect(view.queryByText("Add to Trip")).toBeNull();
  });

  // Solid white, not an outline: on the teal sheet the outline was the faintest thing
  // there, for the one action that builds a trip.
  it("is the highlighted action, with a white label", async () => {
    const view = await openSheet({ onAddToItinerary: jest.fn() });

    expect(view.getByRole("button", { name: "Add to Trip" })).toHaveStyle({ backgroundColor: tokens.colors.highlight });
    expect(view.getByText("Add to Trip")).toHaveStyle({ color: "#FFFFFF" });
  });

  // Owner, 2026-11-11: Add to Trip and Details on the first row, which shows at the sheet's
  // opening height, and Directions on its own row under them.
  it("shares the first row with Details, with Directions on the row under them", async () => {
    const view = await openSheet({ onAddToItinerary: jest.fn() });

    const rowOf = (label: string) => view.getByRole("button", { name: label }).parent;
    expect(rowOf("Add to Trip")).toBe(rowOf("Details"));
    expect(rowOf("Get Directions")).not.toBe(rowOf("Details"));
    const order = view.getAllByText(/^(Add to Trip|Get Directions|Details)$/).map((t: any) => t.props.children);
    expect(order).toEqual(["Add to Trip", "Details", "Get Directions"]);
  });

  it("is offered when it is supplied", async () => {
    const onAddToItinerary = jest.fn();
    const view = await openSheet({ onAddToItinerary });

    await fireEvent.press(view.getByText("Add to Trip"));

    expect(onAddToItinerary).toHaveBeenCalled();
  });

  it("says why it can't be used offline, and refuses the press", async () => {
    const onAddToItinerary = jest.fn();
    const view = await openSheet({ onAddToItinerary, isOffline: true });

    expect(view.getByText("Offline")).toBeTruthy();
    await fireEvent.press(view.getByText("Offline"));
    expect(onAddToItinerary).not.toHaveBeenCalled();
  });
});

describe("today's plan and nearby", () => {
  const todayItems = [
    { siteId: "s2", siteName: "Hell's Gate", timeLabel: "9:00 AM", imageUrl: undefined },
    { siteId: "s3", siteName: "Eat Streat", timeLabel: "1:00 PM", imageUrl: undefined },
  ];
  const nearbySites = [{ id: "s4", name: "Blue Lake", distanceMeters: 800 }];

  it("shows today's stops when the trip has some", async () => {
    const view = await openSheet({ todayItems });

    expect(view.getByText("Today's Trip")).toBeTruthy();
    expect(view.getByText("Hell's Gate")).toBeTruthy();
    expect(view.getByText("9:00 AM")).toBeTruthy();
  });

  it("prefers today's plan over the nearby list", async () => {
    const view = await openSheet({ todayItems, nearbySites });

    expect(view.getByText("Today's Trip")).toBeTruthy();
    expect(view.queryByText("Nearby")).toBeNull();
  });

  it("falls back to nearby when there is no plan for today", async () => {
    const view = await openSheet({ nearbySites });

    expect(view.getByText("Nearby")).toBeTruthy();
    expect(view.getByText("Blue Lake")).toBeTruthy();
  });

  it("shows neither section when there is nothing to put in them", async () => {
    const view = await openSheet();

    expect(view.queryByText("Today's Trip")).toBeNull();
    expect(view.queryByText("Nearby")).toBeNull();
  });

  it("selects a stop from today's plan", async () => {
    const view = await openSheet({ todayItems });

    await fireEvent.press(view.getByText("Hell's Gate"));

    expect(handlers.onSelectSite).toHaveBeenCalledWith("s2");
  });

  it("selects a site from the nearby list", async () => {
    const view = await openSheet({ nearbySites });

    await fireEvent.press(view.getByText("Blue Lake"));

    expect(handlers.onSelectSite).toHaveBeenCalledWith("s4");
  });

  it("hides both sections while the GPS is still settling", async () => {
    const view = await openSheet({ hasLoc: false, todayItems, nearbySites });

    expect(view.queryByText("Today's Trip")).toBeNull();
    expect(view.queryByText("Nearby")).toBeNull();
  });
});

// The open Duo: the sheet gives way to a floating 360 panel (docs/plans/design-sweep.md,
// "The map, picked: round 3"). The rail is already out of the window the screen sees.
describe("wide: the panel", () => {
  const ui = () => require("@blacksands/ui");
  const nearbySites = Array.from({ length: 10 }, (_, i) => ({
    id: `n${i}`,
    name: `Place ${i}`,
    category: "Walks",
    distanceMeters: 100 * (i + 1),
  }));
  const layout = (node: any, height: number) =>
    fireEvent(node, "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 360, height } } });

  it("has no bottom sheet; a 360 panel at 16 from the left, 12 under the search card", async () => {
    ui().__setWide(true, { width: 669, height: 951 });
    const view = await openSheet();

    expect(view.queryByTestId("bottom-sheet")).toBeNull();
    expect(view.getByTestId("map-panel")).toHaveStyle({ left: 16, width: 360, top: 60 + 56 + 12 });
  });

  it("sideways it sits 16 from the top: the search card is there, not under a status bar", async () => {
    ui().__setWide(true, { width: 951, height: 669 });
    const view = await openSheet();

    expect(view.getByTestId("map-panel")).toHaveStyle({ top: 16 + 56 + 12 });
  });

  it("moves down by the chips row and its gap when the chips are open", async () => {
    ui().__setWide(true, { width: 669, height: 951 });
    const view = await openSheet({ chipsOpen: true });

    expect(view.getByTestId("map-panel")).toHaveStyle({ top: 60 + 56 + 12 + 36 + 12 });
  });

  it("stays above the tab bar with Today's Trip in it: it is no taller than what is left", async () => {
    ui().__setWide(true, { width: 951, height: 669 });
    const view = await openSheet({ todayItems: [{ id: "a", siteId: "a", siteName: "A", timeLabel: "9:00 AM", category: "Walks" }] });
    await layout(view.getByTestId("map-panel-area"), 400);

    // 400 - top 84 - 16 above the tab bar.
    expect(view.getByTestId("map-panel")).toHaveStyle({ maxHeight: 300 });
  });

  it("keeps the sheet on a phone", async () => {
    const view = await openSheet();

    expect(view.getByTestId("bottom-sheet")).toBeTruthy();
    expect(view.queryByTestId("map-panel")).toBeNull();
  });

  it("shows the map pin's own icon on a Nearby row: a white 28 disc with a 2 pt ring in the category colour", async () => {
    ui().__setWide(true);
    const view = await openSheet({ nearbySites });

    expect(view.getByTestId("nearby-icon-n0")).toHaveStyle({
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: CATEGORY_CONFIG.Walks.color,
      backgroundColor: "#FFFFFF",
    });
  });

  it("ends on a whole row, at least 16 above the tab bar", async () => {
    ui().__setWide(true);
    const view = await openSheet({ nearbySites });
    // 620 tall: the panel starts at 128, must stop 16 short, and has 12 + 8 of its own padding.
    await layout(view.getByTestId("map-panel-area"), 620);
    await layout(view.getByTestId("map-panel-head"), 200);
    // Rows that stop fitting as the others are measured leave before their turn.
    for (let i = 0; i < 5; i++) {
      const row = view.queryByTestId(`nearby-row-n${i}`);
      if (row) await layout(row, 60);
    }

    // 620 - 128 - 16 - 20 = 456; the head takes 200, so 256 is left: four rows of 60 fit, a fifth doesn't.
    expect(view.queryByText("Place 3")).toBeTruthy();
    expect(view.queryByText("Place 4")).toBeNull();
  });

  it("lists the nearest ten when there is room", async () => {
    ui().__setWide(true);
    const view = await openSheet({ nearbySites });
    await layout(view.getByTestId("map-panel-area"), 2000);

    expect(view.queryByText("Place 9")).toBeTruthy();
  });

  it("shows the place card alone when Nearby is empty", async () => {
    ui().__setWide(true);
    const view = await openSheet({ nearbySites: [] });

    expect(view.getByText("Wai-O-Tapu")).toBeTruthy();
    expect(view.queryByText("Nearby")).toBeNull();
  });

  it("opens a Nearby place on a tap, as the sheet does", async () => {
    ui().__setWide(true);
    const view = await openSheet({ nearbySites });

    await fireEvent.press(view.getByText("Place 1"));

    expect(handlers.onSelectSite).toHaveBeenCalledWith("n1");
  });
});

// Today's Trip scrolls to the nearest stop once per sheet lifetime, and the scroll that is
// scheduled always happens (as on the phone before the Duo).
describe("the Today's Trip auto-scroll", () => {
  const stops = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `i${i}`, siteId: `s${i}`, siteName: `Stop ${i}`, timeLabel: "9:00 AM", category: "Walks" }));
  const tree = (over: Record<string, unknown>) => (
    <GestureHandlerRootView>
      <MapOverlayCard {...(baseProps as any)} {...(over as any)} />
    </GestureHandlerRootView>
  );

  beforeEach(() => {
    jest.useFakeTimers();
    mockScrollTo.mockClear();
    require("@blacksands/ui").__setWide(false);
  });
  afterEach(() => jest.useRealTimers());

  it("still fires when the items change within the 400 ms", async () => {
    const view = await render(tree({ todayItems: stops(2) }));
    await view.rerender(tree({ todayItems: stops(3) }));
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockScrollTo).toHaveBeenCalledTimes(1);
  });

  it("on the Duo it centres the current stop in the 360 panel, not the window", async () => {
    jest.setSystemTime(new Date(2026, 10, 16, 12, 0));
    require("@blacksands/ui").__setWide(true, { width: 951, height: 669 });
    const items = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM"].map((t, i) => ({ ...stops(1)[0], id: `i${i}`, siteId: `s${i}`, timeLabel: t }));
    await render(tree({ todayItems: items }));
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Card 3's centre: 16 + 3 * 138 + 64 = 494; half the panel is 180.
    expect(mockScrollTo).toHaveBeenCalledWith({ x: 494 - 180, animated: true });
  });

  it("does not scroll again when the carousel unmounts and mounts (a GPS refresh)", async () => {
    const todayItems = stops(2);
    const view = await render(tree({ todayItems }));
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(mockScrollTo).toHaveBeenCalledTimes(1);

    await view.rerender(tree({ todayItems, refreshingGPS: true }));
    await view.rerender(tree({ todayItems, refreshingGPS: false }));
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockScrollTo).toHaveBeenCalledTimes(1);
  });
});
