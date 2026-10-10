// The bottom tab bar is on every screen, so its active tab is the one place the highlight
// colour is guaranteed to appear app-wide.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNav = { index: 0 };
const mockNavigate = jest.fn();
jest.mock("expo-router", () => {
  const routes = ["sites/index", "itinerary/index", "map/index", "account"].map((name) => ({ name, key: name }));
  const Tabs = ({ tabBar }: any) =>
    tabBar({
      state: { routes, index: mockNav.index },
      navigation: { emit: () => ({ defaultPrevented: false }), navigate: mockNavigate },
    });
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
});

describe("tab bar", () => {
  it("marks the current tab in the highlight colour and leaves the others neutral", async () => {
    const view = await render(<TabsLayout />);

    expect(view.getByText("Explore")).toHaveStyle({ color: tokens.colors.highlight });
    expect(view.getByText("Plans")).toHaveStyle({ color: tokens.colors.text2 });
  });

  it("moves the highlight with the current tab", async () => {
    mockNav.index = 2;
    const view = await render(<TabsLayout />);

    expect(view.getByText("Map")).toHaveStyle({ color: tokens.colors.highlight });
    expect(view.getByText("Explore")).toHaveStyle({ color: tokens.colors.text2 });
  });

  it("goes to the tab that was tapped", async () => {
    const view = await render(<TabsLayout />);

    await fireEvent.press(view.getByText("Plans"));

    expect(mockNavigate).toHaveBeenCalledWith("itinerary/index");
  });
});
