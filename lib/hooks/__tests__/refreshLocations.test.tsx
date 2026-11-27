// lib/hooksBag.ts's useRefreshLocations: fetches the place list afresh (it is kept on the phone for a day) and hands
// back the list as it then is, so a caller can check against it at once (the trip quiz, before it saves a trip).
// Checked against the real hooksBag module, its shared hooks stood in for as the review prompt's tests have them,
// and a real query client holding the list under the key the shared useLocations keeps it.

// Built inside the mock: lib/hooksBag.ts calls createHooks as it loads, before anything declared in this file exists.
jest.mock("@blacksands/hooks", () => {
  const hooks = {
    useLocations: jest.fn(() => ({ locations: [] })),
    useUserLocation: jest.fn(() => ({ status: "granted", request: jest.fn() })),
    useReviewPrompt: jest.fn(),
  };
  return { createHooks: jest.fn(() => hooks) };
});
jest.mock("@/lib/api", () => ({ client: {} }));
jest.mock("expo-location", () => ({}));
jest.mock("@react-native-community/netinfo", () => ({}));
jest.mock("@react-native-async-storage/async-storage", () => ({}));
jest.mock("expo-store-review", () => ({ isAvailableAsync: jest.fn(), requestReview: jest.fn() }));

import React from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";

import { useRefreshLocations } from "@/lib/hooksBag";

const KEY = ["southislandguide", "locations"];

it("fetches the place list afresh and hands it back, without the places switched off", async () => {
  // No garbage collection: its timer would keep jest running for five minutes after the test.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  // The phone's copy first, then the api's newer one.
  const fetched = jest
    .fn()
    .mockResolvedValueOnce([{ id: "old", active: true }])
    .mockResolvedValueOnce([{ id: "old", active: true }, { id: "new", active: true }, { id: "off", active: false }]);
  const { result } = await renderHook(
    () => {
      // A screen with the list on it, as Explore and the trips have.
      useQuery({ queryKey: KEY, queryFn: fetched });
      return useRefreshLocations();
    },
    { wrapper },
  );
  await act(async () => {});
  expect(fetched).toHaveBeenCalledTimes(1);

  let list: unknown;
  await act(async () => {
    list = await result.current();
  });

  expect(fetched).toHaveBeenCalledTimes(2);
  expect(list).toEqual([{ id: "old", active: true }, { id: "new", active: true }]);
  client.clear();
});
