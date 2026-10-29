import React from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { QueryClient, onlineManager, partialMatchKey } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

import { SessionProvider } from "./SessionProvider";
import { registerTripWrites } from "@/lib/hooks/useItineraries";
import { auth } from "@/lib/firebase";

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

// The place list (key: the prefix in lib/hooksBag.ts plus "locations") is every place on the
// island in one download, so the phone fetches it at most once a day. Pull to refresh still
// forces it. The shared hook sets no staleTime of its own, so this default applies.
const PLACE_LIST_KEY = ["southislandguide", "locations"];
queryClient.setQueryDefaults(PLACE_LIST_KEY, { staleTime: 1000 * 60 * 60 * 24 });

// Offline as the trip screens already judge it (CreateItineraryModal, AddToTripModal).
const isOnline = (state: NetInfoState) => state.isConnected !== false && state.isInternetReachable !== false;

// React Native has no browser online/offline events, so TanStack Query took the phone to be
// online always: queries fetched with no signal, and trip writes failed instead of waiting.
onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((state) => setOnline(isOnline(state))));

// Before the cache is restored: a trip write still waiting when the app last closed comes
// back without its function, which this supplies.
registerTripWrites(queryClient);

// Trip writes still waiting when the app last closed: sent now if there's signal, else on
// reconnect (the client's own listener), and then the cache catches up with the server,
// all but the place list, which would otherwise be downloaded again on every launch.
// Only once sign-in is back and NetInfo has answered. Before that, a write goes out with no
// token or no signal, fails and is dropped. Firebase's sign-in restore checks with its server,
// so it normally finishes after the cache restore.
// Returns nothing on purpose: the provider holds every query, and saves nothing to the phone,
// until onSuccess settles, and offline a waiting write doesn't settle until there's signal.
function resumeTripWrites() {
  void Promise.all([auth.authStateReady(), NetInfo.fetch().then((state) => onlineManager.setOnline(isOnline(state)))])
    .then(() => queryClient.resumePausedMutations())
    .then(() => queryClient.invalidateQueries({ predicate: (query) => !partialMatchKey(query.queryKey, PLACE_LIST_KEY) }));
}

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: CACHE_MAX_AGE_MS }}
      onSuccess={resumeTripWrites}
    >
      <SessionProvider>{children}</SessionProvider>
    </PersistQueryClientProvider>
  );
}
