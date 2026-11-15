// The bottom tab bar is on every screen. Since the design sweep the current tab is teal with
// a line under its word, and the rest one grey (docs/plans/design-sweep.md).

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// history: route names, oldest first, as the Tabs navigator's "history" back behaviour keeps
// them (the keys equal the names here). Left out, the state has none.
const mockNav = { index: 0, history: undefined as string[] | undefined, backBehavior: undefined as string | undefined };
const mockNavigate = jest.fn();
jest.mock("expo-router", () => {
  const routes = [
    "sites/index",
    "itinerary/index",
    "map/index",
    "account",
    "sites/[siteId]/index",
    "guide/index",
  ].map((name) => ({ name, key: name }));
  const Tabs = ({ tabBar, backBehavior }: any) => {
    mockNav.backBehavior = backBehavior;
    return tabBar({
      state: {
        routes,
        index: mockNav.index,
        history: mockNav.history?.map((key) => ({ type: "route", key })),
      },
      // Expo Router 58's tab bar props: no `navigation`, an emitter and navigateToTab(key).
      emitter: { emit: () => ({ defaultPrevented: false }) },
      navigateToTab: mockNavigate,
    });
  };
  Tabs.Screen = () => null;
  return { Tabs };
});

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import TabsLayout from "@/app/(app)/(tabs)/_layout";
import { tokens } from "@/lib/ui/tokens";

beforeEach(() => {
  jest.clearAllMocks();
  mockNav.index = 0;
  mockNav.history = undefined;
});

describe("tab bar", () => {
  it("marks the current tab in the selected colour and leaves the others grey", async () => {
    const view = await render(<TabsLayout />);

    expect(view.getByText("Explore")).toHaveStyle({ color: tokens.colors.selected });
    expect(view.getByText("Trips")).toHaveStyle({ color: tokens.colors.textMuted });
  });

  it("moves the mark with the current tab", async () => {
    mockNav.index = 2;
    const view = await render(<TabsLayout />);

    expect(view.getByText("Map")).toHaveStyle({ color: tokens.colors.selected });
    expect(view.getByText("Explore")).toHaveStyle({ color: tokens.colors.textMuted });
  });

  // VoiceOver reads "Explore, tab, selected, 1 of 4" rather than bare text.
  it("tells a screen reader which tab is current", async () => {
    const view = await render(<TabsLayout />);

    expect(view.getByRole("tab", { name: "Explore", selected: true })).toBeTruthy();
    expect(view.getByRole("tab", { name: "Map", selected: false })).toBeTruthy();
  });

  it("goes to the tab that was tapped", async () => {
    const view = await render(<TabsLayout />);

    await fireEvent.press(view.getByText("Trips"));

    expect(mockNavigate).toHaveBeenCalledWith("itinerary/index");
  });

  // As React Navigation's own tab bar: navigating to the focused tab changed the tab
  // history but not the screen, leaving Sentry's navigation span open for 15 s.
  it("doesn't navigate to the tab that's already on screen", async () => {
    const view = await render(<TabsLayout />);

    await fireEvent.press(view.getByText("Explore"));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // The place and guide screens are tab screens opened from every tab. With the default
  // ("firstRoute"), back from any of them went to Explore.
  it("keeps a tab history, so back returns to the screen before", async () => {
    await render(<TabsLayout />);

    expect(mockNav.backBehavior).toBe("history");
  });

  // A place has no tab bar: its "Add to Trip" row sits at the foot of the screen instead
  // (owner, 2026-11-13; docs/plans/design-sweep.md).
  it("is hidden on a place", async () => {
    mockNav.history = ["sites/index", "map/index", "sites/[siteId]/index"];
    mockNav.index = 4;
    const view = await render(<TabsLayout />);

    expect(view.queryByRole("tablist")).toBeNull();
    expect(view.queryByText("Map")).toBeNull();
  });

  // A screen opened from a place (the guide here) still lights the tab the place was
  // opened from: the place is skipped over in the history like any shared screen.
  it("lights the Map for the guide opened from a place that was opened from the map", async () => {
    mockNav.history = ["sites/index", "map/index", "sites/[siteId]/index", "guide/index"];
    mockNav.index = 5;
    const view = await render(<TabsLayout />);

    expect(view.getByText("Map")).toHaveStyle({ color: tokens.colors.selected });
    expect(view.getByText("Explore")).toHaveStyle({ color: tokens.colors.textMuted });
  });

  it("lights Explore, not Profile, for the guide opened from Explore", async () => {
    mockNav.history = ["account", "sites/index", "guide/index"];
    mockNav.index = 5;
    const view = await render(<TabsLayout />);

    expect(view.getByText("Explore")).toHaveStyle({ color: tokens.colors.selected });
    expect(view.getByText("Profile")).toHaveStyle({ color: tokens.colors.textMuted });
  });
});
