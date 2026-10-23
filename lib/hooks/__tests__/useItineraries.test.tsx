// The signed-in user's trips. Written against south-island's hook, which keeps
// rotorua-guide's offline write queue and optimistic delete, and adds the first-trip
// review prompt (expo-store-review via hooksBag.useReviewPrompt).
const mockRequestReview = jest.fn();
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
jest.mock("@/lib/hooksBag", () => ({
  hooksBag: {
    useReviewPrompt: () => ({ requestReview: mockRequestReview }),
  },
}));

import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider, dehydrate, hydrate, notifyManager, onlineManager } from "@tanstack/react-query";
import { ApiError } from "@blacksands/client";

// react-query batches observer updates via a real setTimeout by default, which fires
// outside of any act() and can leak into the next test's render. Make it synchronous for tests.
notifyManager.setScheduler((cb) => cb());
import { useSession } from "@/lib/providers/SessionProvider";
import { itineraryService } from "@/lib/services/itineraryService";
import { registerTripWrites, useItineraries } from "@/lib/hooks/useItineraries";
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

const newClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={newClient()}>{children}</QueryClientProvider>;
}

const signedIn = () => mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });

describe("useItineraries", () => {
  beforeEach(() => {
    mockGetMyItineraries.mockReset();
    mockSaveItinerary.mockReset();
    mockDeleteItinerary.mockReset();
    mockRequestReview.mockReset();
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

  // Before the trips arrive the list is empty, which used to send someone with three trips
  // off to make a fourth.
  it("says which step Add to Trip opens on, once the trips are known", async () => {
    signedIn();
    mockGetMyItineraries.mockReturnValue(new Promise(() => {}));
    const loading = await renderHook(() => useItineraries(), { wrapper });
    expect(loading.result.current.addFlow).toBeNull();

    for (const [count, flow] of [[0, "create"], [1, "choose"], [3, "pick"]] as const) {
      mockGetMyItineraries.mockResolvedValue(Array.from({ length: count }, (_, i) => itin({ id: `t${i}` })));
      const { result } = await renderHook(() => useItineraries(), { wrapper });
      await waitFor(() => expect(result.current.addFlow).toBe(flow));
    }

    mockUseSession.mockReturnValue({ session: { status: "loggedOut" } });
    const signedOut = await renderHook(() => useItineraries(), { wrapper });
    expect(signedOut.result.current.addFlow).toBeNull();
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

  it("shows a save in the list before the server answers", async () => {
    signedIn();
    mockGetMyItineraries.mockResolvedValue([itin()]);
    mockSaveItinerary.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.itineraries).toHaveLength(1));

    await act(async () => {
      void result.current.saveItinerary({ id: "itin-1", title: "Renamed" });
    });

    await waitFor(() => expect(result.current.itineraries[0].title).toBe("Renamed"));
  });

  // A write still waiting when the app closes is saved on the phone with the cache, and comes
  // back without its function: registerTripWrites supplies it.
  it("sends a write saved on the phone after a restart", async () => {
    signedIn();
    mockGetMyItineraries.mockResolvedValue([itin()]);
    mockSaveItinerary.mockResolvedValue("itin-1");
    const first = newClient();
    const firstWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={first}>{children}</QueryClientProvider>
    );

    const { result } = await renderHook(() => useItineraries(), { wrapper: firstWrapper });
    await waitFor(() => expect(result.current.itineraries).toHaveLength(1));

    onlineManager.setOnline(false);
    try {
      await act(async () => {
        void result.current.saveItinerary({ id: "itin-1", title: "Queued" });
      });
      const saved = dehydrate(first);
      // So the first client doesn't send it too on reconnect.
      first.getMutationCache().clear();

      const fresh = newClient();
      registerTripWrites(fresh);
      hydrate(fresh, saved);

      await act(async () => {
        onlineManager.setOnline(true);
        await fresh.resumePausedMutations();
      });
      expect(mockSaveItinerary).toHaveBeenCalledTimes(1);
      expect(mockSaveItinerary).toHaveBeenCalledWith({ id: "itin-1", title: "Queued" });
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it("finishes a refresh with no signal instead of waiting for it", async () => {
    signedIn();
    mockGetMyItineraries.mockResolvedValue([itin()]);

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.itineraries).toHaveLength(1));

    onlineManager.setOnline(false);
    try {
      await act(async () => {
        await result.current.refetch();
      });
      expect(mockGetMyItineraries).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => onlineManager.setOnline(true));
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

  it("asks for a review when the first trip is created", async () => {
    signedIn();
    mockGetMyItineraries.mockResolvedValue([]);
    mockSaveItinerary.mockResolvedValue("new-id");

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveItinerary({ title: "First trip" });
    });

    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it("does not ask for a review when a second trip is created", async () => {
    signedIn();
    mockGetMyItineraries.mockResolvedValue([itin()]);
    mockSaveItinerary.mockResolvedValue("new-id");

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.itineraries).toHaveLength(1));

    await act(async () => {
      await result.current.saveItinerary({ title: "Second trip" });
    });

    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("does not ask for a review when an existing trip is updated", async () => {
    signedIn();
    mockGetMyItineraries.mockResolvedValue([]);
    mockSaveItinerary.mockResolvedValue("itin-1");

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveItinerary({ id: "itin-1", title: "Updated" });
    });

    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("does not ask for a review when creating the first trip fails", async () => {
    signedIn();
    mockGetMyItineraries.mockResolvedValue([]);
    mockSaveItinerary.mockRejectedValue(new Error("nope"));

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveItinerary({ title: "First trip" }).catch(() => {});
    });

    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("does not ask for a review when a trip is deleted", async () => {
    signedIn();
    mockGetMyItineraries.mockResolvedValue([itin()]);
    mockDeleteItinerary.mockResolvedValue(undefined);

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.itineraries).toHaveLength(1));

    await act(async () => {
      await result.current.deleteItinerary("itin-1");
    });

    expect(mockRequestReview).not.toHaveBeenCalled();
  });
});
