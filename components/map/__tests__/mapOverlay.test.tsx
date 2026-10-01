// The map's bottom sheet. Which of its three bodies shows depends on the GPS state, and
// TODAY'S PLAN takes precedence over NEARBY when the selected day has stops. "Add to
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
    default: ({ children }: any) => React.createElement(View, null, children),
    BottomSheetScrollView: ({ children }: any) => React.createElement(ScrollView, null, children),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

import React from "react";
import { Linking } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { MapOverlayCard } from "@/components/map/MapOverlay";

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
  render(<MapOverlayCard {...(baseProps as any)} {...(over as any)} />);

let openUrlSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  openUrlSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
});

afterEach(() => openUrlSpy.mockRestore());

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

    expect(view.queryByText("NEARBY")).toBeNull();
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
    expect(view.getByText("Directions")).toBeTruthy();
  });

  it("opens the site", async () => {
    const view = await openSheet();

    await fireEvent.press(view.getByText("Details"));

    expect(handlers.onOpen).toHaveBeenCalled();
  });

  it("opens maps for directions to that site's coordinates", async () => {
    const view = await openSheet();

    await fireEvent.press(view.getByText("Directions"));

    expect(openUrlSpy).toHaveBeenCalledWith(expect.stringContaining("destination=-38.35,176.36"));
  });

  it("recentres the map on the site when its name is tapped", async () => {
    const view = await openSheet();

    await fireEvent.press(view.getByText("Wai-O-Tapu"));

    expect(handlers.onFocusSite).toHaveBeenCalled();
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
    expect(view.queryByText("Add to Itinerary")).toBeNull();
  });

  it("is offered when it is supplied", async () => {
    const onAddToItinerary = jest.fn();
    const view = await openSheet({ onAddToItinerary });

    await fireEvent.press(view.getByText("Add to Itinerary"));

    expect(onAddToItinerary).toHaveBeenCalled();
  });

  it("says why it can't be used offline, and refuses the press", async () => {
    const onAddToItinerary = jest.fn();
    const view = await openSheet({ onAddToItinerary, isOffline: true });

    expect(view.getByText("Reconnect to Add")).toBeTruthy();
    await fireEvent.press(view.getByText("Reconnect to Add"));
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

    expect(view.getByText("TODAY'S PLAN")).toBeTruthy();
    expect(view.getByText("Hell's Gate")).toBeTruthy();
    expect(view.getByText("9:00 AM")).toBeTruthy();
  });

  it("prefers today's plan over the nearby list", async () => {
    const view = await openSheet({ todayItems, nearbySites });

    expect(view.getByText("TODAY'S PLAN")).toBeTruthy();
    expect(view.queryByText("NEARBY")).toBeNull();
  });

  it("falls back to nearby when there is no plan for today", async () => {
    const view = await openSheet({ nearbySites });

    expect(view.getByText("NEARBY")).toBeTruthy();
    expect(view.getByText("Blue Lake")).toBeTruthy();
  });

  it("shows neither section when there is nothing to put in them", async () => {
    const view = await openSheet();

    expect(view.queryByText("TODAY'S PLAN")).toBeNull();
    expect(view.queryByText("NEARBY")).toBeNull();
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

    expect(view.queryByText("TODAY'S PLAN")).toBeNull();
    expect(view.queryByText("NEARBY")).toBeNull();
  });
});
