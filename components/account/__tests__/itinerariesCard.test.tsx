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
  it("offers a new trip under the limit, the limit at it, and neither before the trips are known", async () => {
    mockTrips.addFlow = "choose";
    const under = await render(<ItinerariesCard />);
    expect(under.getByText("New Trip")).toBeTruthy();
    await under.unmount();

    mockTrips.addFlow = "pick";
    const atLimit = await render(<ItinerariesCard />);
    expect(atLimit.getByText("Up to 3 trips at a time.")).toBeTruthy();
    expect(atLimit.queryByText("New Trip")).toBeNull();
    await atLimit.unmount();

    mockTrips.addFlow = null;
    const unknown = await render(<ItinerariesCard />);
    expect(unknown.queryByText("New Trip")).toBeNull();
    expect(unknown.queryByText("Up to 3 trips at a time.")).toBeNull();
  });
});
