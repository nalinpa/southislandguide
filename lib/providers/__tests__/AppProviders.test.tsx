// How long the app's saved copy of trips, places and saved places lasts on the phone.
// Restoring it is what lets a traveller with no signal open their trip. The library's
// default throws the whole copy away once it was last written more than 24 hours ago,
// so a day out of signal used to mean opening the app to no trip at all.

const mockPersistProps: { current: any } = { current: null };
jest.mock("@tanstack/react-query-persist-client", () => ({
  PersistQueryClientProvider: (props: any) => {
    mockPersistProps.current = props;
    return props.children;
  },
}));
jest.mock("@tanstack/query-async-storage-persister", () => ({ createAsyncStoragePersister: () => ({}) }));
jest.mock("@react-native-async-storage/async-storage", () => ({}));
jest.mock("@/lib/providers/SessionProvider", () => ({ SessionProvider: ({ children }: any) => children }));
// AppProviders calls these when it loads, before a test file's own consts are set, so the
// mocks keep their calls themselves.
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => () => {}), fetch: jest.fn() },
}));
jest.mock("@/lib/hooks/useItineraries", () => ({ registerTripWrites: jest.fn() }));
jest.mock("@/lib/firebase", () => ({ auth: { authStateReady: jest.fn() } }));

import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { onlineManager } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";

import { AppProviders, CACHE_MAX_AGE_MS, queryClient } from "@/lib/providers/AppProviders";
import { registerTripWrites } from "@/lib/hooks/useItineraries";
import { auth } from "@/lib/firebase";

const DAY = 24 * 60 * 60 * 1000;
const mockAuthStateReady = auth.authStateReady as jest.Mock;
const mockFetch = NetInfo.fetch as jest.Mock;
const netInfoListener = () => (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
const settle = () => new Promise(setImmediate);

describe("the saved copy on the phone", () => {
  it("lasts two weeks since the app was last open, not one day", () => {
    expect(CACHE_MAX_AGE_MS).toBe(14 * DAY);
  });

  it("is restored with that limit", async () => {
    await render(
      <AppProviders>
        <Text>app</Text>
      </AppProviders>,
    );

    expect(mockPersistProps.current.persistOptions.maxAge).toBe(14 * DAY);
  });

  // The library wants queries kept in memory at least as long as the saved copy lasts,
  // or they are dropped from it early.
  it("keeps queries at least as long as the saved copy lasts", () => {
    expect(queryClient.getDefaultOptions().queries?.gcTime).toBeGreaterThanOrEqual(CACHE_MAX_AGE_MS);
  });
});

// Without NetInfo, TanStack Query took the phone to be online always: trip writes failed
// offline instead of waiting, and a write saved on the phone was never sent.
describe("offline", () => {
  let resume: jest.SpyInstance;

  beforeEach(async () => {
    mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    mockAuthStateReady.mockResolvedValue(undefined);
    resume = jest.spyOn(queryClient, "resumePausedMutations").mockResolvedValue(undefined);
    await render(
      <AppProviders>
        <Text>app</Text>
      </AppProviders>,
    );
  });

  afterEach(() => {
    resume.mockRestore();
    onlineManager.setOnline(true);
  });

  it("follows NetInfo", () => {
    netInfoListener()({ isConnected: false });
    expect(onlineManager.isOnline()).toBe(false);
    netInfoListener()({ isConnected: true, isInternetReachable: true });
    expect(onlineManager.isOnline()).toBe(true);
  });

  it("registers the trip writes on the app's client", () => {
    expect(registerTripWrites).toHaveBeenCalledWith(queryClient);
  });

  it("resumes waiting writes once sign-in is back, without holding up the restore", async () => {
    let signedInBack!: () => void;
    mockAuthStateReady.mockReturnValue(new Promise<void>((resolve) => (signedInBack = resolve)));

    expect(mockPersistProps.current.onSuccess()).toBeUndefined();
    await settle();
    expect(resume).not.toHaveBeenCalled();

    signedInBack();
    await settle();
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it("takes NetInfo's answer before resuming", async () => {
    mockFetch.mockResolvedValue({ isConnected: false });
    let onlineAtResume: boolean | undefined;
    resume.mockImplementation(async () => {
      onlineAtResume = onlineManager.isOnline();
    });

    mockPersistProps.current.onSuccess();
    await settle();

    expect(onlineAtResume).toBe(false);
  });
});
