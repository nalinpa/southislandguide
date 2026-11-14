// Expo Router 58 sends a JS tabs navigator back to its first tab whenever the focused route
// isn't a screen the layout declares (useVisibleTabsWithRedirect). A place, its reviews, a
// trip and the guide are tab routes opened from every tab, so the layout declares them too;
// the tab bar is our own and still draws only its four buttons.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

import React from "react";
import { Text } from "react-native";
import { renderRouter, screen } from "expo-router/testing-library";

import TabsLayout from "@/app/(app)/(tabs)/_layout";

const page = (name: string) => () => <Text>{name}</Text>;

const ROUTES = {
  "(tabs)/_layout": TabsLayout,
  "(tabs)/sites/index": page("Explore screen"),
  "(tabs)/sites/[siteId]/index": page("Place screen"),
  "(tabs)/sites/[siteId]/reviews": page("Reviews screen"),
  "(tabs)/itinerary/index": page("Trips screen"),
  "(tabs)/itinerary/[itineraryId]": page("Trip screen"),
  "(tabs)/map/index": page("Map screen"),
  "(tabs)/account": page("Profile screen"),
  "(tabs)/guide/index": page("Guide screen"),
  "(tabs)/guide/[slug]": page("Guide section screen"),
};

// renderRouter switches jest to fake timers and leaves them on.
afterEach(() => jest.useRealTimers());

describe("tab routes that aren't tab buttons", () => {
  it.each([
    ["/sites/site-1", "Place screen"],
    ["/sites/site-1/reviews", "Reviews screen"],
    ["/itinerary/trip-1", "Trip screen"],
    ["/guide", "Guide screen"],
    ["/guide/kaikoura", "Guide section screen"],
  ])("%s stays on screen", async (url, text) => {
    const route = await renderRouter(ROUTES, { initialUrl: url });
    // Let the redirect effect and the queued navigation run, if there is one.
    await React.act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByText(text)).toBeTruthy();
    expect(route.getPathname()).toBe(url);
  });

  it("still opens Explore", async () => {
    await renderRouter(ROUTES, { initialUrl: "/sites" });
    expect(screen.getByText("Explore screen")).toBeTruthy();
  });

  // Router 58 hands the tab bar a new state (declared routes, optional history): the bar
  // must still read it.
  it("hides the tab bar on a place and lights Trips on a trip", async () => {
    await renderRouter(ROUTES, { initialUrl: "/sites/site-1" });
    expect(screen.queryByRole("tablist")).toBeNull();

    await renderRouter(ROUTES, { initialUrl: "/itinerary/trip-1" });
    expect(screen.getByRole("tab", { name: "Trips" }).props.accessibilityState).toEqual({ selected: true });
  });
});
