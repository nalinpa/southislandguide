// How the planner finds the area a place is visited from. Trip items carry only a place
// id, so this turns the live place list into a lookup, and says whether there is a list
// to look in yet: nothing may be packed or checked against an empty one.

const mockList = { locations: [] as any[], loading: false, err: "" };
const mockRefresh = jest.fn();
jest.mock("@/lib/hooksBag", () => ({ useAllLocations: () => mockList, useRefreshLocations: () => mockRefresh }));

import { renderHook } from "@testing-library/react-native";

import { usePlaceLookup } from "@/lib/hooks/usePlaceLookup";

const gardens = { id: "botanic-gardens", area: "christchurch", active: true };
const museum = { id: "otago-museum", area: "dunedin", active: true };

beforeEach(() => {
  mockList.locations = [gardens, museum];
  mockList.err = "";
});

describe("usePlaceLookup", () => {
  it("finds a listed place by its id", async () => {
    const { result } = await renderHook(() => usePlaceLookup());
    expect(result.current.places("otago-museum")?.area).toBe("dunedin");
  });

  // For what needs the whole list, not one place at a time (a town's picture).
  it("hands back the list itself too", async () => {
    const { result } = await renderHook(() => usePlaceLookup());
    expect(result.current.list).toEqual([gardens, museum]);
  });

  it("has nothing for a place that isn't in the list", async () => {
    const { result } = await renderHook(() => usePlaceLookup());
    expect(result.current.places("gone")).toBeUndefined();
  });

  it("is ready once the list holds a place, and says how many", async () => {
    const { result } = await renderHook(() => usePlaceLookup());
    expect(result.current).toMatchObject({ ready: true, count: 2 });
  });

  it("is not ready while the list is empty", async () => {
    mockList.locations = [];
    const { result } = await renderHook(() => usePlaceLookup());
    expect(result.current).toMatchObject({ ready: false, count: 0 });
  });

  it("passes on the list's error", async () => {
    mockList.locations = [];
    mockList.err = "Network request failed";
    const { result } = await renderHook(() => usePlaceLookup());
    expect(result.current.err).toBe("Network request failed");
  });

  it("hands back the way to load the list again, for a retry", async () => {
    const { result } = await renderHook(() => usePlaceLookup());
    result.current.refresh();
    expect(mockRefresh).toHaveBeenCalled();
  });

  // Memos in the day view hang off the lookup, so it must not change on every render.
  it("hands back the same lookup for as long as the list is the same", async () => {
    const { result, rerender } = await renderHook(() => usePlaceLookup());
    const first = result.current.places;

    await rerender(undefined);

    expect(result.current.places).toBe(first);
  });
});
