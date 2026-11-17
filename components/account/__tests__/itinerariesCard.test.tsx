// The Account screen's trip list. Three states that can't overlap: trips unknown (greyed row),
// loaded with none ("Plan your trip"), failed (the error only: they may have a trip).
const mockTrips = {
  itineraries: [] as unknown[],
  error: null as string | null,
  addFlow: "create" as "create" | "choose" | "pick" | null,
  loading: false,
};
const mockModal = jest.fn((_props: { visible: boolean; showTemplateOption?: boolean }) => null);
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));
jest.mock("@/components/itinerary/CreateItineraryModal", () => ({
  CreateItineraryModal: (p: { visible: boolean; showTemplateOption?: boolean }) => mockModal(p),
}));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import { ItinerariesCard } from "@/components/account/ItinerariesCard";

const LINE = "Pick a suggested trip or start your own";

beforeEach(() => {
  mockTrips.itineraries = [];
  mockTrips.error = null;
  mockTrips.addFlow = "choose";
  mockTrips.loading = false;
  mockModal.mockClear();
});

describe("ItinerariesCard", () => {
  it("with no trip, shows Plan your trip, and a tap opens Create Trip with the suggested trips", async () => {
    const view = await render(<ItinerariesCard />);
    expect(view.getByText("My Trip")).toBeTruthy();
    expect(view.getByText("Plan your trip")).toBeTruthy();
    expect(view.getByText(LINE)).toBeTruthy();
    expect(mockModal.mock.calls.at(-1)![0].visible).toBe(false);
    await fireEvent.press(view.getByRole("button", { name: "Plan your trip" }));
    const last = mockModal.mock.calls.at(-1)![0];
    expect(last.visible).toBe(true);
    expect(last.showTemplateOption).toBe(true);
  });

  it("shows no New Trip link and no 'No trip yet.'", async () => {
    const view = await render(<ItinerariesCard />);
    expect(view.queryByText("New Trip")).toBeNull();
    expect(view.queryByText("No trip yet.")).toBeNull();
  });

  it("while the trip loads, shows the greyed row, not tappable", async () => {
    mockTrips.loading = true;
    mockTrips.addFlow = null;
    const view = await render(<ItinerariesCard />);
    expect(view.getByLabelText("Loading your trip")).toBeTruthy();
    expect(view.queryByText("Plan your trip")).toBeNull();
    expect(view.queryByText("No trip yet.")).toBeNull();
    expect(view.queryByRole("button")).toBeNull();
  });

  it("after a failed load, shows the error and no Plan your trip", async () => {
    mockTrips.error = "Couldn't load your trips.";
    mockTrips.addFlow = null;
    const view = await render(<ItinerariesCard />);
    expect(view.getByText("Couldn't load your trips.")).toBeTruthy();
    expect(view.queryByText("Plan your trip")).toBeNull();
    expect(view.queryByLabelText("Loading your trip")).toBeNull();
  });

  it("with a trip, shows its row as before", async () => {
    mockTrips.itineraries = [{ id: "t1", title: "Summer", startDate: "2026-12-01", endDate: "2026-12-07" }];
    mockTrips.addFlow = "pick";
    const view = await render(<ItinerariesCard />);
    expect(view.getByText("Summer")).toBeTruthy();
    expect(view.queryByText("Plan your trip")).toBeNull();
    expect(view.queryByLabelText("Loading your trip")).toBeNull();
    expect(view.queryByText(/at a time/)).toBeNull();
  });

  it("wide: the empty row's line wraps instead of cutting off", async () => {
    require("@blacksands/ui").__setWide(true, { width: 669, height: 951 });
    const view = await render(<ItinerariesCard />);
    expect(view.getByText(LINE).props.numberOfLines).toBe(2);
    expect(view.getByText("Plan your trip").props.numberOfLines).toBe(1);
  });
});
