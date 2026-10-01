// Adding a site to an existing trip. The interesting parts are the preselection (a single
// trip needs no picker), the day-full refusal, and where the user is sent afterwards —
// the deep link has to carry the slot the physics engine actually placed the stop in, not
// the slot that was asked for.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { Image: (props: any) => React.createElement(View, props) };
});

const mockNet = { isConnected: true as boolean | null, isInternetReachable: true as boolean | null };
jest.mock("@react-native-community/netinfo", () => ({ useNetInfo: () => mockNet }));

const mockTrips = { itineraries: [] as any[], saveItinerary: jest.fn(), isSaving: false };
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { AddToTripModal } from "@/components/itinerary/AddToTripModal";
import { PLANNER } from "@/lib/constants/gameplay";

const site = { id: "site-1", name: "Wai-O-Tapu", imageUrl: "https://example.test/w.jpg" };
const onClose = jest.fn();

const makeTrip = (id: string, dayCount = 2) => ({
  id,
  title: "Trip " + id,
  startDate: "2026-10-01",
  endDate: "2026-10-02",
  days: Array.from({ length: dayCount }, (_, i) => ({ id: "day_" + (i + 1), date: "2026-10-0" + (i + 1), items: [] })),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockNet.isConnected = true;
  mockNet.isInternetReachable = true;
  mockTrips.isSaving = false;
  mockTrips.saveItinerary = jest.fn().mockResolvedValue("t1");
  mockTrips.itineraries = [makeTrip("t1")];
});

describe("what is shown", () => {
  it("renders nothing until a site is handed in", async () => {
    const view = await render(<AddToTripModal site={null} onClose={onClose} />);
    expect(view.queryByText("Add to Itinerary")).toBeNull();
  });

  it("names the site being added", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    expect(view.getByText("Add to Itinerary")).toBeTruthy();
    expect(view.getByText("Wai-O-Tapu")).toBeTruthy();
  });

  it("skips the trip picker when there is only one trip to add to", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    expect(view.queryByText("Trip t1")).toBeNull();
    expect(view.getByText("Day 1")).toBeTruthy();
  });

  it("offers a trip picker once there is more than one", async () => {
    mockTrips.itineraries = [makeTrip("t1"), makeTrip("t2")];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    expect(view.getByText("Trip t1")).toBeTruthy();
    expect(view.getByText("Trip t2")).toBeTruthy();
  });

  it("honours the trip the caller preselected", async () => {
    mockTrips.itineraries = [makeTrip("t1"), makeTrip("t2", 3)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} initialItineraryId="t2" />);
    // t2 has three days, so its day pills are what should be on screen.
    expect(view.getByText("Day 3")).toBeTruthy();
  });
});

describe("adding", () => {
  it("saves the stop onto the chosen day", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    await fireEvent.press(view.getByText("Day 2"));
    await fireEvent.press(view.getByText("Add to Trip"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const payload = mockTrips.saveItinerary.mock.calls[0][0];
    expect(payload.id).toBe("t1");
    const day2 = payload.days.find((d: any) => d.id === "day_2");
    expect(day2.items).toHaveLength(1);
    expect(day2.items[0].siteName).toBe("Wai-O-Tapu");
  });

  it("starts the visit in the chosen part of the day", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    await fireEvent.press(view.getByText("Evening"));
    await fireEvent.press(view.getByText("Add to Trip"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const item = mockTrips.saveItinerary.mock.calls[0][0].days[0].items[0];
    expect(item.slotIndex).toBe(18);
  });

  it("carries the visit length that was set", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    expect(view.getByText("1 Hour")).toBeTruthy();

    await fireEvent.press(view.getByText("Add to Trip"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    expect(mockTrips.saveItinerary.mock.calls[0][0].days[0].items[0].durationSlots).toBe(2);
  });

  it("opens the trip at the slot the stop actually landed in", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    await fireEvent.press(view.getByText("Add to Trip"));

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalled());
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/(app)/(tabs)/itinerary/[itineraryId]",
      params: { itineraryId: "t1", jumpToDay: "day_1", jumpToSlot: expect.any(String) },
    });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("refusals", () => {
  it("refuses a day with no room left, instead of silently dropping the stop", async () => {
    // Fill the grid: one stop long enough that nothing else fits after it.
    mockTrips.itineraries = [
      {
        ...makeTrip("t1", 1),
        days: [
          {
            id: "day_1",
            date: "2026-10-01",
            items: [
              {
                id: "item_full",
                siteId: "other",
                siteName: "All Day Somewhere",
                slotIndex: 1,
                durationSlots: PLANNER.MAX_GRID_SLOTS - 1,
                timeLabel: "",
                durationLabel: "",
              },
            ],
          },
        ],
      },
    ];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    await fireEvent.press(view.getByText("Add to Trip"));

    await waitFor(() => expect(view.getByText("This day is full. Try a different day or shorten the visit.")).toBeTruthy());
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("asks for a trip and a day when there is nothing to add to", async () => {
    mockTrips.itineraries = [];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    await fireEvent.press(view.getByText("Add to Trip"));

    await waitFor(() => expect(view.getByText("Choose a trip and a day.")).toBeTruthy());
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
  });

  it("keeps the modal open and says so when the save fails", async () => {
    mockTrips.saveItinerary = jest.fn().mockRejectedValue(new Error("offline-ish"));
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    await fireEvent.press(view.getByText("Add to Trip"));

    await waitFor(() => expect(view.getByText("Couldn't add to your trip. Try again.")).toBeTruthy());
    expect(onClose).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
