import React from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SessionProvider } from "./SessionProvider";

// How long the saved copy of trips, places and saved places lasts on the phone, counted
// from when the app was last open. Restoring it is what lets a traveller with no signal
// open their trip. The library's default is 24 hours, after which the whole copy is
// thrown away on launch: a day out of signal meant opening the app to no trip. Two weeks
// matches what the shared place list keeps its cache for (@blacksands/hooks).
// ponytail: past two weeks without opening the app, and offline when they do, a traveller
// still loses the copy. Raise it if testers on long trips hit that.
export const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      // At least as long as the saved copy lasts, or queries drop out of it early.
      gcTime: CACHE_MAX_AGE_MS,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: CACHE_MAX_AGE_MS }}>
      <SessionProvider>{children}</SessionProvider>
    </PersistQueryClientProvider>
  );
}
