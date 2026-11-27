// The tour's engine: steps, start / next / skip, moving between screens, and where each
// step's target is. Started from Rotorua's test; here each person walks only the steps
// for them (guest, free or paid: lib/tour/tourSteps.ts).
jest.mock("expo-router", () => ({ router: { navigate: jest.fn(), push: jest.fn() }, usePathname: () => mockPathname() }));
const mockPathname = jest.fn(() => "/");
jest.mock("@/lib/analytics", () => ({ logEvent: jest.fn() }));

import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { router } from "expo-router";

import { TourProvider, useTour } from "@/lib/tour/TourContext";
import { logEvent } from "@/lib/analytics";

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
    expect(result.current.step?.id).toBe("welcome");
    expect(mockNavigate).toHaveBeenCalledWith("/(app)/(tabs)/sites");
  });

  it("next() walks only that person's steps, then finishes", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });

    await act(async () => result.current.start("paid"));
    expect(result.current.stepCount).toBe(9);
    expect(await walk(result)).toEqual(["welcome", "town", "guide", "browse", "place", "placeAdd", "trip", "map", "buildTrip"]);

    await act(async () => result.current.start("free"));
    expect(await walk(result)).toEqual(["welcome", "town", "guide", "browse", "place", "placeSave", "trip", "map", "buildTrip"]);

    await act(async () => result.current.start("guest"));
    expect(result.current.stepCount).toBe(8);
    expect(await walk(result)).toEqual(["welcome", "town", "guide", "browse", "place", "trip", "map", "buildTrip"]);
    expect(result.current.step).toBeNull();
  });

  it("finishing the tour logs tour_finished once, with the button; skipping logs nothing", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    (logEvent as jest.Mock).mockClear();
    await act(async () => result.current.start("guest"));
    await act(async () => result.current.skip());
    expect(logEvent).not.toHaveBeenCalled();
    await act(async () => result.current.start("guest"));
    await walk(result);
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith("tour_finished", { button: "build_my_trip" });
  });

  // The last step offers the trip quiz (lib/tour/tourSteps.ts): its button ends the tour and opens it.
  it("opens the trip quiz from the last step's button, once the tour is over", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.start("guest"));
    for (let i = 0; i < 7; i++) await act(async () => result.current.next());
    expect(result.current.step?.id).toBe("buildTrip");
    expect(mockNavigate).toHaveBeenLastCalledWith("/(app)/(tabs)/itinerary");
    expect(mockPush).not.toHaveBeenCalled();

    await act(async () => result.current.next());

    expect(result.current.active).toBe(false);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/build-trip");
  });

  // Its quiet second button: the tour ends as Done ended it, logged with which button, and nothing opens.
  it("ends the tour from the last step's second button, logging it, with nothing opened", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.start("free"));
    for (let i = 0; i < 8; i++) await act(async () => result.current.next());
    expect(result.current.step?.id).toBe("buildTrip");
    (logEvent as jest.Mock).mockClear();

    await act(async () => result.current.close());

    expect(result.current.active).toBe(false);
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith("tour_finished", { button: "not_now" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("start() again begins from the first step", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.start("paid"));
    await act(async () => result.current.next());
    await act(async () => result.current.start("paid"));
    expect(result.current.step?.id).toBe("welcome");
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
    for (let i = 0; i < 5; i++) await act(async () => result.current.next());

    expect(result.current.step?.id).toBe("trip");
    expect(mockNavigate).toHaveBeenLastCalledWith("/(app)/(tabs)/itinerary");
    await act(async () => result.current.next());
    expect(mockNavigate).toHaveBeenLastCalledWith("/(app)/(tabs)/map");
  });

  // Navigating to the tab already on screen left Sentry's navigation span open for 15 s.
  it("doesn't navigate to the tab that's already on screen", async () => {
    mockPathname.mockReturnValue("/sites");
    const { result } = await renderHook(() => useTour(), { wrapper });

    await act(async () => result.current.start("guest"));

    expect(result.current.step?.id).toBe("welcome");
    expect(mockNavigate).not.toHaveBeenCalled();
    mockPathname.mockReturnValue("/");
  });

  it("a step with a route opens the route a screen registered for it", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.registerStepRoute("place", "/(app)/(tabs)/sites/abc123"));
    await act(async () => result.current.start("paid"));
    for (let i = 0; i < 4; i++) await act(async () => result.current.next());

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
    for (let i = 0; i < 5; i++) await act(async () => result.current.next());

    expect(result.current.step?.id).toBe("placeAdd");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("gives the current step's registered target, and no other", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.registerTarget("guide", { x: 9, y: 9, width: 9, height: 9 }));
    await act(async () => result.current.start("paid"));
    await act(async () => result.current.next());

    expect(result.current.step?.id).toBe("town");
    expect(result.current.targetRect).toBeNull();
    await act(async () => result.current.registerTarget("town", { x: 1, y: 2, width: 3, height: 4 }));
    expect(result.current.targetRect).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    await act(async () => result.current.next());
    expect(result.current.targetRect).toEqual({ x: 9, y: 9, width: 9, height: 9 });
  });
});
