// The bottom tab bar is on every screen, so its active tab is the one place the highlight
// colour is guaranteed to appear app-wide.

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
      navigation: { emit: () => ({ defaultPrevented: false }), navigate: mockNavigate },
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
  it("marks the current tab in the highlight colour and leaves the others neutral", async () => {
    const view = await render(<TabsLayout />);

    expect(view.getByText("Explore")).toHaveStyle({ color: tokens.colors.highlight });
    expect(view.getByText("Trips")).toHaveStyle({ color: tokens.colors.text2 });
  });

  it("moves the highlight with the current tab", async () => {
    mockNav.index = 2;
    const view = await render(<TabsLayout />);

    expect(view.getByText("Map")).toHaveStyle({ color: tokens.colors.highlight });
    expect(view.getByText("Explore")).toHaveStyle({ color: tokens.colors.text2 });
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

  // The place and guide screens are tab screens opened from every tab. With the default
  // ("firstRoute"), back from any of them went to Explore.
  it("keeps a tab history, so back returns to the screen before", async () => {
    await render(<TabsLayout />);

    expect(mockNav.backBehavior).toBe("history");
  });

  it("lights the Map for a place opened from the map", async () => {
    mockNav.history = ["sites/index", "map/index", "sites/[siteId]/index"];
    mockNav.index = 4;
    const view = await render(<TabsLayout />);

    expect(view.getByText("Map")).toHaveStyle({ color: tokens.colors.highlight });
    expect(view.getByText("Explore")).toHaveStyle({ color: tokens.colors.text2 });
  });

  it("lights Explore, not Profile, for the guide opened from Explore", async () => {
    mockNav.history = ["account", "sites/index", "guide/index"];
    mockNav.index = 5;
    const view = await render(<TabsLayout />);

    expect(view.getByText("Explore")).toHaveStyle({ color: tokens.colors.highlight });
    expect(view.getByText("Profile")).toHaveStyle({ color: tokens.colors.text2 });
  });
});
