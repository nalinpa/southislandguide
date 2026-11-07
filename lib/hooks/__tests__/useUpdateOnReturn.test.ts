// Over-the-air updates reaching phones sooner. expo-updates on its own looks only at a cold
// start and applies what it finds at the next one; iOS can keep the app in memory for days.
// The hook also looks each time the app comes back, and restarts into a downloaded update
// when the app returns after a long enough time away that nobody is mid-task.

const mockUpdates = {
  isEnabled: true,
  isUpdatePending: false,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
};
jest.mock("expo-updates", () => ({
  get isEnabled() {
    return mockUpdates.isEnabled;
  },
  useUpdates: () => ({ isUpdatePending: mockUpdates.isUpdatePending }),
  checkForUpdateAsync: () => mockUpdates.checkForUpdateAsync(),
  fetchUpdateAsync: () => mockUpdates.fetchUpdateAsync(),
  reloadAsync: () => mockUpdates.reloadAsync(),
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

import { AppState } from "react-native";
import { act, renderHook } from "@testing-library/react-native";

import { AWAY_MS, useUpdateOnReturn } from "@/lib/hooks/useUpdateOnReturn";

let appStateListener: (state: string) => void = () => {};
let now = 0;

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdates.isEnabled = true;
  mockUpdates.isUpdatePending = false;
  mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
  mockUpdates.fetchUpdateAsync.mockResolvedValue({});
  mockUpdates.reloadAsync.mockResolvedValue(undefined);
  now = 1_000_000;
  jest.spyOn(Date, "now").mockImplementation(() => now);
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener: any) => {
    appStateListener = listener;
    return { remove: jest.fn() } as any;
  });
});

afterEach(() => jest.restoreAllMocks());

// Puts the app away for `ms`, then brings it back, letting the check settle.
const awayFor = async (ms: number) => {
  await act(async () => appStateListener("background"));
  now += ms;
  await act(async () => appStateListener("active"));
};

it("looks for an update when the app comes back, and downloads one it finds", async () => {
  mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
  await renderHook(() => useUpdateOnReturn());

  await awayFor(60_000);

  expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
  expect(mockUpdates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
  expect(mockUpdates.reloadAsync).not.toHaveBeenCalled();
});

it("downloads nothing when there's no update", async () => {
  await renderHook(() => useUpdateOnReturn());

  await awayFor(60_000);

  expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
  expect(mockUpdates.fetchUpdateAsync).not.toHaveBeenCalled();
});

it("restarts into a downloaded update after a long time away", async () => {
  mockUpdates.isUpdatePending = true;
  await renderHook(() => useUpdateOnReturn());

  await awayFor(AWAY_MS);

  expect(mockUpdates.reloadAsync).toHaveBeenCalledTimes(1);
});

// A quick look at another app mid-trip-plan mustn't send the person back to Explore.
it("doesn't restart after a short time away", async () => {
  mockUpdates.isUpdatePending = true;
  await renderHook(() => useUpdateOnReturn());

  await awayFor(AWAY_MS - 1);

  expect(mockUpdates.reloadAsync).not.toHaveBeenCalled();
  expect(mockUpdates.checkForUpdateAsync).not.toHaveBeenCalled();
});

// Pulling down Control Centre makes the app inactive, not backgrounded: not time away.
it("ignores the app going inactive", async () => {
  mockUpdates.isUpdatePending = true;
  await renderHook(() => useUpdateOnReturn());

  await act(async () => appStateListener("inactive"));
  now += AWAY_MS;
  await act(async () => appStateListener("active"));

  expect(mockUpdates.reloadAsync).not.toHaveBeenCalled();
});

// No signal is the usual case on the road; it's not an error worth reporting.
it("stays quiet when the check fails with no signal", async () => {
  mockUpdates.checkForUpdateAsync.mockRejectedValue(new Error("network"));
  await renderHook(() => useUpdateOnReturn());

  await awayFor(60_000);

  const Sentry = require("@sentry/react-native");
  expect(Sentry.captureException).not.toHaveBeenCalled();
});

// Dev builds and Expo Go have updates switched off.
it("does nothing when updates are off", async () => {
  mockUpdates.isEnabled = false;
  await renderHook(() => useUpdateOnReturn());

  expect(AppState.addEventListener).not.toHaveBeenCalled();
});
