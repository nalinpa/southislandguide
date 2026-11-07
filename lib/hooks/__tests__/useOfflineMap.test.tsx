// The Account row's saved map for no signal (docs/plans/offline-map.md, Task 4). The files
// and the download have their own tests (lib/__tests__/offlineMap.test.ts); here they're
// stood in, and what's tested is what the row is told.

jest.mock("@/lib/offlineMap", () => ({
  fetchOfflineMapManifest: jest.fn(),
  saveOfflineMap: jest.fn(),
  isOfflineMapSaved: jest.fn(),
  removeOfflineMap: jest.fn(),
}));

import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider, notifyManager, onlineManager } from "@tanstack/react-query";

// react-query batches observer updates via a real setTimeout by default, which fires
// outside of any act() and can leak into the next test's render. Make it synchronous for tests.
notifyManager.setScheduler((cb) => cb());
import { fetchOfflineMapManifest, isOfflineMapSaved, saveOfflineMap } from "@/lib/offlineMap";
import { useOfflineMap } from "@/lib/hooks/useOfflineMap";

const mockFetchManifest = fetchOfflineMapManifest as jest.Mock;
const mockSave = saveOfflineMap as jest.Mock;
const mockIsSaved = isOfflineMapSaved as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsSaved.mockResolvedValue(false);
});

// The one time the saved map is needed. TanStack pauses queries offline unless told not to,
// and this one only reads the phone.
it("reads saved while offline", async () => {
  mockIsSaved.mockResolvedValue(true);
  onlineManager.setOnline(false);
  try {
    const { result } = await renderHook(() => useOfflineMap(), { wrapper });

    await waitFor(() => expect(result.current.saved).toBe(true));
  } finally {
    onlineManager.setOnline(true);
  }
});

it("no signal when saving", async () => {
  mockFetchManifest.mockRejectedValue(new TypeError("Network request failed"));
  const { result } = await renderHook(() => useOfflineMap(), { wrapper });

  await act(() => result.current.save());

  expect(result.current.error).toBe("no-signal");
  expect(mockSave).not.toHaveBeenCalled();
});

// The person tapped Stop, or the app went to the background: the row says how far it got.
it("shows partly saved after a stop", async () => {
  mockFetchManifest.mockResolvedValue({ bytes: 1, tiles: [] });
  mockSave.mockImplementation(async (_manifest, { onProgress }) => {
    onProgress(10, 40);
    return "stopped";
  });
  const { result } = await renderHook(() => useOfflineMap(), { wrapper });

  await act(() => result.current.save());

  expect(result.current.error).toBe("stopped");
  expect(result.current.progress).toEqual({ done: 10, total: 40 });
});
