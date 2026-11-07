// The trip route is a thin wrapper: it reads the trip id (and the optional day/slot to jump
// to, which the map's "Today's Plan" cards pass) and hands them to ItineraryDetailView, which
// has its own tests.

jest.mock("@/components/itinerary/ItineraryDetailView", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    // `firstTrip` is state, so it only changes when the view is a new instance: what the
    // real view's activeDayId needs when a second trip opens.
    ItineraryDetailView: ({ tripId, jumpToDay, jumpToSlot }: any) => {
      const [firstTrip] = React.useState(tripId);
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(Text, null, `trip=${tripId} day=${jumpToDay ?? "-"} slot=${jumpToSlot ?? "-"}`),
        React.createElement(Text, null, `view made for ${firstTrip}`),
      );
    },
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

// This is a tab screen, so React Navigation reuses one instance and only swaps params.
// ItineraryDetailView only sets activeDayId when it's empty, so a reused view opened a
// second trip on the first trip's day: a blank timeline. key={itineraryId} makes a new view.
it("opens a second trip in a new view, so it doesn't keep the previous trip's day", async () => {
  mockParams.itineraryId = "trip-1";
  const view = await render(<ItineraryDetailPage />);
  expect(view.getByText("view made for trip-1")).toBeTruthy();

  mockParams.itineraryId = "trip-2";
  await view.rerender(<ItineraryDetailPage />);

  expect(view.getByText("view made for trip-2")).toBeTruthy();
});
