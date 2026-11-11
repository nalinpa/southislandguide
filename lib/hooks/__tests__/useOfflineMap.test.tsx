// The Account row's saved map for no signal (docs/plans/offline-map.md, Task 4). The files
// and the download have their own tests (lib/__tests__/offlineMap.test.ts); here they're
// stood in, and what's tested is what the row is told.

jest.mock("@/lib/offlineMap", () => ({
  fetchOfflineMapManifest: jest.fn(),
  saveOfflineMap: jest.fn(),
  savedMapLevel: jest.fn(),
  removeOfflineMap: jest.fn(),
  pendingSave: jest.fn(async () => null),
}));
const mockNet = { isConnected: true, type: "wifi" };
jest.mock("@react-native-community/netinfo", () => ({ __esModule: true, default: { fetch: async () => mockNet } }));

import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider, notifyManager, onlineManager } from "@tanstack/react-query";

// react-query batches observer updates via a real setTimeout by default, which fires
// outside of any act() and can leak into the next test's render. Make it synchronous for tests.
notifyManager.setScheduler((cb) => cb());
import { fetchOfflineMapManifest, pendingSave, savedMapLevel, saveOfflineMap } from "@/lib/offlineMap";
import { carryOnPendingSave, oncePerPercent, useOfflineMap } from "@/lib/hooks/useOfflineMap";

const mockFetchManifest = fetchOfflineMapManifest as jest.Mock;
const mockSave = saveOfflineMap as jest.Mock;
const mockIsSaved = savedMapLevel as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsSaved.mockResolvedValue(null);
});

// The one time the saved map is needed. TanStack pauses queries offline unless told not to,
// and this one only reads the phone.
it("reads saved while offline", async () => {
  mockIsSaved.mockResolvedValue("standard");
  onlineManager.setOnline(false);
  try {
    const { result } = await renderHook(() => useOfflineMap(), { wrapper });

    await waitFor(() => expect(result.current.level).toBe("standard"));
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
  mockFetchManifest.mockResolvedValue({ sets: {} });
  mockSave.mockImplementation(async (_manifest, _level, { onProgress }) => {
    onProgress("saving", 10, 40);
    return "stopped";
  });
  const { result } = await renderHook(() => useOfflineMap(), { wrapper });

  await act(() => result.current.save());

  expect(result.current.error).toBe("stopped");
  expect(result.current.progress).toEqual({ phase: "saving", done: 10, total: 40 });
});

// Each change redraws every screen using the hook, the map tab too. Once a tile slowed the
// save to 71% in 15 minutes (owner, 2026-11-11).
it("tells the screens once a percent, not once a tile", () => {
  const report = jest.fn();
  const onProgress = oncePerPercent(report);

  for (let done = 0; done <= 1000; done++) onProgress(done, 1000);

  expect(report).toHaveBeenCalledTimes(101);
  expect(report).toHaveBeenLastCalledWith(1000, 1000);
});

// iOS closed the app mid-save, or the phone locked while it unpacked: the next open
// carries on without a tap (owner, 2026-11-12).
describe("a save that didn't finish", () => {
  const mockPending = pendingSave as jest.Mock;
  beforeEach(() => {
    mockNet.isConnected = true;
    mockNet.type = "wifi";
  });

  it("carries on by itself on Wi-Fi, downloading what's missing", async () => {
    mockPending.mockResolvedValue({ level: "detailed", stopped: false });
    const save = jest.fn();

    await carryOnPendingSave(save);

    expect(save).toHaveBeenCalledWith("detailed", { download: true });
  });

  it.each([
    ["on mobile data", { type: "cellular" }, false],
    ["with no signal", { isConnected: false }, false],
    ["after the person tapped Stop", {}, true],
  ])("only unpacks what has landed %s", async (_when, net, stopped) => {
    Object.assign(mockNet, net);
    mockPending.mockResolvedValue({ level: "standard", stopped });
    const save = jest.fn();

    await carryOnPendingSave(save);

    expect(save).toHaveBeenCalledWith("standard", { download: false });
  });

  it("does nothing when no save was going", async () => {
    mockPending.mockResolvedValue(null);
    const save = jest.fn();

    await carryOnPendingSave(save);

    expect(save).not.toHaveBeenCalled();
  });

  it("remembers the size for Carry on", async () => {
    mockPending.mockResolvedValue({ level: "detailed", stopped: true });
    await carryOnPendingSave(jest.fn());
    const { result } = await renderHook(() => useOfflineMap(), { wrapper });

    expect(result.current.pendingLevel).toBe("detailed");
  });
});
