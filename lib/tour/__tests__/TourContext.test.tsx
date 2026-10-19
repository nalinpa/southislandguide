// The tour's engine: steps, start / next / skip, moving between screens, and where each
// step's target is. Started from Rotorua's test; here each person walks only the steps
// for them (guest, free or paid: lib/tour/tourSteps.ts).
jest.mock("expo-router", () => ({ router: { navigate: jest.fn(), push: jest.fn() } }));

import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { router } from "expo-router";

import { TourProvider, useTour } from "@/lib/tour/TourContext";

const mockNavigate = router.navigate as jest.Mock;
const mockPush = router.push as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  return <TourProvider>{children}</TourProvider>;
}

async function walk(result: { current: ReturnType<typeof useTour> }) {
  const ids: string[] = [];
  while (result.current.active) {
    ids.push(result.current.step!.id);
    await act(async () => result.current.next());
  }
  return ids;
}

describe("TourContext", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPush.mockClear();
  });

  it("starts inactive", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    expect(result.current.active).toBe(false);
    expect(result.current.step).toBeNull();
  });

  it("start() shows the first step, on Explore", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.start("free"));
    expect(result.current.active).toBe(true);
    expect(result.current.step?.id).toBe("town");
    expect(mockNavigate).toHaveBeenCalledWith("/(app)/(tabs)/sites");
  });

  it("next() walks only that person's steps, then finishes", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });

    await act(async () => result.current.start("paid"));
    expect(result.current.stepCount).toBe(7);
    expect(await walk(result)).toEqual(["town", "guide", "browse", "place", "placeAdd", "trip", "map"]);

    await act(async () => result.current.start("free"));
    expect(await walk(result)).toEqual(["town", "guide", "browse", "place", "placeSave", "trip", "map"]);

    await act(async () => result.current.start("guest"));
    expect(result.current.stepCount).toBe(6);
    expect(await walk(result)).toEqual(["town", "guide", "browse", "place", "trip", "map"]);
    expect(result.current.step).toBeNull();
  });

  it("start() again begins from the first step", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.start("paid"));
    await act(async () => result.current.next());
    await act(async () => result.current.start("paid"));
    expect(result.current.step?.id).toBe("town");
    expect(result.current.stepIndex).toBe(0);
  });

  it("skip() ends it on any step", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.start("paid"));
    await act(async () => result.current.next());
    await act(async () => result.current.skip());
    expect(result.current.active).toBe(false);
    expect(result.current.step).toBeNull();
  });

  it("a step with a tab moves to that tab", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.start("guest"));
    for (let i = 0; i < 4; i++) await act(async () => result.current.next());

    expect(result.current.step?.id).toBe("trip");
    expect(mockNavigate).toHaveBeenLastCalledWith("/(app)/(tabs)/itinerary");
    await act(async () => result.current.next());
    expect(mockNavigate).toHaveBeenLastCalledWith("/(app)/(tabs)/map");
  });

  it("a step with a route opens the route a screen registered for it", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.registerStepRoute("place", "/(app)/(tabs)/sites/abc123"));
    await act(async () => result.current.start("paid"));
    for (let i = 0; i < 3; i++) await act(async () => result.current.next());

    expect(result.current.step?.id).toBe("place");
    expect(mockPush).not.toHaveBeenCalled();
    await act(async () => result.current.next());
    expect(result.current.step?.id).toBe("placeAdd");
    expect(mockPush).toHaveBeenCalledWith("/(app)/(tabs)/sites/abc123");
  });

  it("a step with a route stays put when no screen registered one", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.registerStepRoute("place", "/(app)/(tabs)/sites/abc123"));
    await act(async () => result.current.registerStepRoute("place", undefined));
    await act(async () => result.current.start("paid"));
    for (let i = 0; i < 4; i++) await act(async () => result.current.next());

    expect(result.current.step?.id).toBe("placeAdd");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("gives the current step's registered target, and no other", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.registerTarget("guide", { x: 9, y: 9, width: 9, height: 9 }));
    await act(async () => result.current.start("paid"));

    expect(result.current.targetRect).toBeNull();
    await act(async () => result.current.registerTarget("town", { x: 1, y: 2, width: 3, height: 4 }));
    expect(result.current.targetRect).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    await act(async () => result.current.next());
    expect(result.current.targetRect).toEqual({ x: 9, y: 9, width: 9, height: 9 });
  });
});
