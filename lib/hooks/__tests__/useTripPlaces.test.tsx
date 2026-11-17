const mockTrips = { itineraries: [] as any[] };
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));

import { renderHook } from "@testing-library/react-native";

import { useTripPlaces } from "@/lib/hooks/useTripPlaces";

const day = (id: string, ...siteIds: string[]) => ({ id, date: "2026-12-01", items: siteIds.map((siteId) => ({ siteId })) });

describe("useTripPlaces", () => {
  it("lists every place in the trip, and the first day each is on", async () => {
    mockTrips.itineraries = [
      { id: "t1", days: [day("d1", "a"), day("d2", "b", "a"), day("d3", "c")] },
      { id: "t2", days: [day("e1", "c", "z")] },
    ];
    const { result } = await renderHook(() => useTripPlaces());

    expect([...result.current.ids].sort()).toEqual(["a", "b", "c", "z"]);
    expect(result.current.dayOf("a")).toEqual({ tripId: "t1", dayId: "d1", dayNumber: 1 });
    expect(result.current.dayOf("b")).toEqual({ tripId: "t1", dayId: "d2", dayNumber: 2 });
    expect(result.current.dayOf("c")).toEqual({ tripId: "t1", dayId: "d3", dayNumber: 3 });
    expect(result.current.dayOf("z")).toEqual({ tripId: "t2", dayId: "e1", dayNumber: 1 });
    expect(result.current.dayOf("nope")).toBeNull();
  });

  it("is empty for a guest", async () => {
    mockTrips.itineraries = [];
    const { result } = await renderHook(() => useTripPlaces());

    expect(result.current.ids.size).toBe(0);
    expect(result.current.dayOf("a")).toBeNull();
  });
});
