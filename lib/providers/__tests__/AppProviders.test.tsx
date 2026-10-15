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

import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import { AppProviders, CACHE_MAX_AGE_MS, queryClient } from "@/lib/providers/AppProviders";

const DAY = 24 * 60 * 60 * 1000;

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
