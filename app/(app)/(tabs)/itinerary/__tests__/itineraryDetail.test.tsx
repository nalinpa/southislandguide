// The trip route is a thin wrapper: it reads the trip id (and the optional day/slot to jump
// to, which the map's "Today's Plan" cards pass) and hands them to ItineraryDetailView, which
// has its own tests.

jest.mock("@/components/itinerary/ItineraryDetailView", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    ItineraryDetailView: ({ tripId, jumpToDay, jumpToSlot }: any) =>
      React.createElement(Text, null, `trip=${tripId} day=${jumpToDay ?? "-"} slot=${jumpToSlot ?? "-"}`),
  };
});

const mockParams: Record<string, string | undefined> = {};
jest.mock("expo-router", () => ({ useLocalSearchParams: () => mockParams }));

import React from "react";
import { render } from "@testing-library/react-native";

import ItineraryDetailPage from "@/app/(app)/(tabs)/itinerary/[itineraryId]";

beforeEach(() => {
  for (const k of Object.keys(mockParams)) delete mockParams[k];
});

it("opens the trip named in the route", async () => {
  mockParams.itineraryId = "trip-1";
  const view = await render(<ItineraryDetailPage />);
  expect(view.getByText("trip=trip-1 day=- slot=-")).toBeTruthy();
});

it("passes a day and slot to jump to straight through", async () => {
  Object.assign(mockParams, { itineraryId: "trip-1", jumpToDay: "day_2", jumpToSlot: "6" });
  const view = await render(<ItineraryDetailPage />);
  expect(view.getByText("trip=trip-1 day=day_2 slot=6")).toBeTruthy();
});

// Known bug, parked: this is a tab screen, so React Navigation reuses one instance and only
// swaps params. ItineraryDetailView only sets activeDayId when it's empty, so opening a
// second trip kept the first trip's day — a blank timeline. The fix is key={itineraryId}
// on the view, on hold until trips can be created on a device to verify it.
test.todo("opens a second trip on its own first day, not the previous trip's (known bug: inherits activeDayId)");
