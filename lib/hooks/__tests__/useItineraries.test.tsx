// The signed-in user's trips. Written against south-island's hook, which drops rotorua-guide's
// first-trip review prompt (no expo-store-review here) but keeps its offline write queue and
// optimistic delete.
jest.mock("@react-native-community/netinfo", () => require("@react-native-community/netinfo/jest/netinfo-mock"));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: jest.fn() }));
jest.mock("@/lib/services/itineraryService", () => ({
  itineraryService: {
    getMyItineraries: jest.fn(),
    saveItinerary: jest.fn(),
    deleteItinerary: jest.fn(),
  },
}));

import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider, notifyManager, onlineManager } from "@tanstack/react-query";
import { ApiError } from "@blacksands/client";

// react-query batches observer updates via a real setTimeout by default, which fires
// outside of any act() and can leak into the next test's render. Make it synchronous for tests.
notifyManager.setScheduler((cb) => cb());
import { useSession } from "@/lib/providers/SessionProvider";
import { itineraryService } from "@/lib/services/itineraryService";
import { useItineraries } from "@/lib/hooks/useItineraries";
import type { Itinerary } from "@/lib/models";

const mockUseSession = useSession as jest.Mock;
const mockGetMyItineraries = itineraryService.getMyItineraries as jest.Mock;
const mockSaveItinerary = itineraryService.saveItinerary as jest.Mock;
const mockDeleteItinerary = itineraryService.deleteItinerary as jest.Mock;

const itin = (overrides: Partial<Itinerary> = {}): Itinerary => ({
  id: "itin-1",
  userId: "user-1",
  title: "Weekend trip",
  startDate: "2026-01-01",
  endDate: "2026-01-02",
  days: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const signedIn = () => mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });

describe("useItineraries", () => {
  beforeEach(() => {
    mockGetMyItineraries.mockReset();
    mockSaveItinerary.mockReset();
    mockDeleteItinerary.mockReset();
  });

  it("does not query when logged out", async () => {
    mockUseSession.mockReturnValue({ session: { status: "loggedOut" } });
    const { result } = await renderHook(() => useItineraries(), { wrapper });

    expect(result.current.itineraries).toEqual([]);
    expect(mockGetMyItineraries).not.toHaveBeenCalled();
  });

  it("loads itineraries for an authed user", async () => {
    signedIn();
    mockGetMyItineraries.mockResolvedValue([itin()]);

    const { result } = await renderHook(() => useItineraries(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.itineraries).toEqual([itin()]);
    expect(result.current.error).toBeNull();
  });

  it("maps a 401 ApiError to a session-expired message", async () => {
    signedIn();
    mockGetMyItineraries.mockRejectedValue(new ApiError(401, "unauthorized"));

    const { result } = await renderHook(() => useItineraries(), { wrapper });

    await waitFor(() => expect(result.current.error).toBe("Your session expired. Please sign in again."));
  });

  it("maps any other error to a generic load-failure message", async () => {
    signedIn();
    mockGetMyItineraries.mockRejectedValue(new Error("boom"));

    const { result } = await renderHook(() => useItineraries(), { wrapper });

    await waitFor(() => expect(result.current.error).toBe("Couldn't load your trips."));
  });

  it("saves through the service, hands back the id and refetches the list", async () => {
    signedIn();
    mockGetMyItineraries.mockResolvedValueOnce([]).mockResolvedValue([itin({ id: "new-id", title: "Trip" })]);
    mockSaveItinerary.mockResolvedValue("new-id");

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let id: unknown;
    await act(async () => {
      id = await result.current.saveItinerary({ title: "Trip" });
    });

    expect(id).toBe("new-id");
    expect(mockSaveItinerary).toHaveBeenCalledWith({ title: "Trip" });
    await waitFor(() => expect(result.current.itineraries.map((i) => i.id)).toEqual(["new-id"]));
  });

  it("queues saves made offline and sends them in order on reconnect", async () => {
    signedIn();
    mockGetMyItineraries.mockResolvedValue([itin()]);
    mockSaveItinerary.mockResolvedValue("itin-1");

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.itineraries).toHaveLength(1));

    onlineManager.setOnline(false);
    try {
      let saves: Promise<unknown>[] = [];
      await act(async () => {
        saves = [
          result.current.saveItinerary({ id: "itin-1", title: "first" }),
          result.current.saveItinerary({ id: "itin-1", title: "second" }),
        ];
      });
      expect(mockSaveItinerary).not.toHaveBeenCalled();

      await act(async () => {
        onlineManager.setOnline(true);
        await Promise.all(saves);
      });
      expect(mockSaveItinerary.mock.calls.map(([d]) => d.title)).toEqual(["first", "second"]);
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it("deletes an itinerary by id", async () => {
    signedIn();
    mockGetMyItineraries.mockResolvedValue([itin()]);
    mockDeleteItinerary.mockResolvedValue(undefined);

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.itineraries).toHaveLength(1));

    await act(async () => result.current.deleteItinerary("itin-1"));

    expect(mockDeleteItinerary).toHaveBeenCalledWith("itin-1");
  });

  it("drops a deleted trip from the list before the server answers", async () => {
    signedIn();
    mockGetMyItineraries.mockResolvedValue([itin(), itin({ id: "itin-2", title: "Other" })]);
    let finishDelete!: () => void;
    mockDeleteItinerary.mockReturnValue(new Promise<void>((resolve) => (finishDelete = resolve)));

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.itineraries).toHaveLength(2));

    let pending!: Promise<unknown>;
    await act(async () => {
      pending = result.current.deleteItinerary("itin-1");
    });

    await waitFor(() => expect(result.current.itineraries.map((i) => i.id)).toEqual(["itin-2"]));
    await act(async () => {
      finishDelete();
      await pending;
    });
  });

  it("puts the trip back if the delete fails", async () => {
    signedIn();
    // The refetch after the failure never answers, so what's on screen is the rollback alone.
    mockGetMyItineraries.mockResolvedValueOnce([itin()]).mockReturnValue(new Promise(() => {}));
    mockDeleteItinerary.mockRejectedValue(new Error("nope"));

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.itineraries).toHaveLength(1));

    await act(async () => {
      await result.current.deleteItinerary("itin-1").catch(() => {});
    });

    expect(result.current.itineraries.map((i) => i.id)).toEqual(["itin-1"]);
  });
});
