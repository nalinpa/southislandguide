// The Account screen's trip list. "New Trip" waits until the trips are known: an empty list
// before they loaded, or after a failed load, showed it to someone already at the limit.
const mockTrips = { itineraries: [] as unknown[], error: null as string | null, addFlow: "create" as "create" | "choose" | "pick" | null };
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));
jest.mock("@/components/itinerary/CreateItineraryModal", () => ({ CreateItineraryModal: () => null }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

import React from "react";
import { render } from "@testing-library/react-native";

import { ItinerariesCard } from "@/components/account/ItinerariesCard";

describe("ItinerariesCard", () => {
  it("offers a new trip with none, nothing with one, and nothing before the trips are known", async () => {
    mockTrips.addFlow = "create";
    const none = await render(<ItinerariesCard />);
    expect(none.getByText("My Trip")).toBeTruthy();
    expect(none.getByText("New Trip")).toBeTruthy();
    await none.unmount();

    // Owner, 2026-11-11: no count and no "One trip at a time." line.
    mockTrips.itineraries = [{ id: "t1", title: "Summer", startDate: "2026-12-01", endDate: "2026-12-07" }];
    mockTrips.addFlow = "pick";
    const one = await render(<ItinerariesCard />);
    expect(one.getByText("Summer")).toBeTruthy();
    expect(one.queryByText("1")).toBeNull();
    expect(one.queryByText("01")).toBeNull();
    expect(one.queryByText(/at a time/)).toBeNull();
    expect(one.queryByText("New Trip")).toBeNull();
    await one.unmount();

    mockTrips.itineraries = [];
    mockTrips.addFlow = null;
    const unknown = await render(<ItinerariesCard />);
    expect(unknown.queryByText("New Trip")).toBeNull();
  });
});
