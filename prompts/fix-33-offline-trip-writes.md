# Fix: trip edits made offline wait for signal instead of failing

Finding 1 from the 2026-10-23 code review (`/code-review high app lib`). Run it before fix-34 (which also edits `useItineraries.ts`) and fix-37 (which clears the queue this one fills).

## Problem

TanStack Query decides whether the phone is offline through its `onlineManager`. On the web it listens for the browser's online and offline events. React Native has no such events, so unless the app wires it up, TanStack treats the phone as always online. This app never wires it up. The only `onlineManager.setOnline` calls are in `lib/hooks/__tests__/useItineraries.test.tsx`. The shared `@blacksands/hooks` package uses NetInfo only for its own check-in queue (checked in `node_modules`).

As a result, three things the code says happen offline don't:

- **Trip writes don't wait.** `useItineraries.ts:43-47` gives them `networkMode: "online"` and one scope so they pause offline and go out in order on reconnect. Instead they run at once and fail. `saveTrip` in `ItineraryDetailView.tsx:211-235` then shows "Couldn't Save Changes". The edit stays only while the trip screen is open. Leave the screen while still offline and the edit is lost.
- **Queries still fetch offline.** `useItineraries.ts:18-22` says that must never happen, and that a "NetInfo-backed onlineManager … see AppProviders" prevents it. No such code exists. The comment also says an offline fetch shows a false "Your session expired". With the installed client it doesn't: `tokenOrThrow` (`@blacksands/client`, `createTransport`) turns a failed token refresh into `ApiError(0)`, not 401. So the user sees "Couldn't load your trips.", on the Account screen's trip card and, when nothing is cached, on the Trips tab.
- **Nothing refreshes when signal comes back**, because `refetchOnReconnect` never fires.

Checked against the installed `@tanstack/query-core` 5.103.2.

## Why wiring it up isn't one line

Once writes really pause, six more things have to be handled.

1. **A paused write is saved on the phone.** By default `PersistQueryClientProvider` saves paused mutations with the cache (`defaultShouldDehydrateMutation` returns `isPaused`). After a restart, a saved write comes back with only its key, variables and scope. Its function is not saved. A write with no function can't run. It is also the first pending write in the "itineraries" scope, so it holds up every trip write after it (`MutationCache.canRun`). To handle this:
   - each trip write needs a `mutationKey`;
   - its function must be registered on the client by that key (`setMutationDefaults`) before the cache is restored;
   - the restored writes must be resumed once the restore finishes. Not before sign-in and NetInfo are known (points 3 and 4), and without holding up the restore (point 5).
2. **The cached trip has to show the queued edit.** Today a save reaches the cache only through the refetch after it succeeds, so while a save waits for signal the cache still holds the old trip. Leave the trip and come back, or restart, and the screen shows the old trip: `ItineraryDetailView.tsx:200` copies the cached trip in whenever nothing is unsaved. The next edit then starts from that old trip. Every save sends the whole days array, so when both saves go out, the second overwrites the first. The fix is for a save of an existing trip to write its change into the cached list straight away, the way delete already removes the trip straight away (`useItineraries.ts:63-69`).
3. **Restored writes must wait for sign-in.** `getToken` reads `auth.currentUser` (`lib/api/auth.ts`). Firebase sets that only once its own restore finishes, and that restore checks the user with Firebase's server. The cache restore reads only the phone, so it normally finishes first. A write sent then has no token:
   - the client throws 401, and the write fails (writes don't retry);
   - `resumePausedMutations` swallows the error;
   - `invalidateQueries` then replaces the queued edit in the cache with the server's copy.

   So the edit is lost, and nothing says so. Firebase 12.19 has `auth.authStateReady()`, which resolves once its restore is done.
4. **Restored writes must wait for NetInfo.** `onlineManager` reads online until NetInfo's first event. If the app is opened with no signal and the restore beats that event, a restored write goes out, fails and is dropped, as in 3. `NetInfo.fetch()` gives the real state to set first.
5. **The restore must not wait for the writes.** `PersistQueryClientProvider` ends the restore only when the promise `onSuccess` returns settles: `persistQueryClientRestore(options).then(() => onSuccess?.()).finally(() => setIsRestoring(false))` (`@tanstack/react-query-persist-client`, `PersistQueryClientProvider.js`). Offline, a waiting write doesn't settle until there's signal. Until the restore ends:
   - `useQuery` doesn't subscribe (`useBaseQuery`: `shouldSubscribe = !isRestoring && …`), so screens don't update;
   - the cache isn't saved to the phone (`persistQueryClientSubscribe` starts after it), so an edit made after an offline relaunch is lost on the next force-quit.

   So `onSuccess` starts the resume and returns nothing.
6. **A refresh with no signal mustn't wait for signal.** The Trips tab's pull to refresh awaits `refetch()` (`itinerary/index.tsx:28-35`). Offline, the fetch pauses, and an observer's refetch stays pending until reconnect, so the spinner would spin until there's signal. `queryClient.refetchQueries` resolves at once for a paused query: it returns `Promise.resolve()` when `fetchStatus === "paused"`. Explore's pull to refresh already goes through it, by way of `invalidateQueries`.

Creating a trip and adding a place to one are already blocked offline (`CreateItineraryModal.tsx:495`, `AddToTripModal.tsx:279`). So only edits made in the trip view queue up, and they always carry an `id`.

## What to do

### 1. `lib/hooks/useItineraries.ts`

Above the hook, replacing the `offlineQueue` constant and its comment (lines 43–47):

```ts
// The two trip writes. Offline they pause and send on reconnect, in order: one scope,
// because each save sends the whole days array and a stale one landing last would clobber
// newer edits. A paused write is saved on the phone with the cache and comes back after a
// restart with only its key and variables, so AppProviders registers these by key too
// (registerTripWrites) for the restored ones to run.
const queued = { networkMode: "online", scope: { id: "itineraries" } } as const;
const tripWrites = {
  save: {
    ...queued,
    mutationKey: ["itineraries", "save"],
    mutationFn: (data: Partial<Itinerary>) => itineraryService.saveItinerary(data),
  },
  delete: {
    ...queued,
    mutationKey: ["itineraries", "delete"],
    mutationFn: (id: string) => itineraryService.deleteItinerary(id),
  },
};

export function registerTripWrites(queryClient: QueryClient) {
  queryClient.setMutationDefaults(tripWrites.save.mutationKey, tripWrites.save);
  queryClient.setMutationDefaults(tripWrites.delete.mutationKey, tripWrites.delete);
}
```

Import `QueryClient` as a type from `@tanstack/react-query`.

In the hook:

- `saveMutation`: replace `...offlineQueue, mutationFn: …` with `...tripWrites.save`, and add an `onMutate` that puts the edit into the cached list at once:

  ```ts
      // Into the cached list now, not after the refetch: a save waiting for signal would
      // otherwise leave the old trip in the cache, for the screen to show on return and the
      // next edit to start from (and then overwrite this one).
      onMutate: async (data: Partial<Itinerary>) => {
        if (!data.id) return;
        await queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData<Itinerary[]>(queryKey, (old) => old?.map((i) => (i.id === data.id ? { ...i, ...data } : i)));
      },
  ```

  `onSuccess` is unchanged. There's no rollback on error: the trip screen keeps a failed edit on screen and tries again (`ItineraryDetailView.tsx:222-233`), so the cache should keep showing it too.
- `deleteMutation`: replace `...offlineQueue, mutationFn: …` with `...tripWrites.delete`. Everything else stays the same.
- Replace the comment at lines 18–22. The 401 it describes doesn't happen with the installed client (see Problem):

  ```ts
    // Offline, this pauses instead of fetching: TanStack's onlineManager follows NetInfo (see
    // AppProviders). A fetch with no signal would only fail and show "Couldn't load your trips."
  ```

- The returned `refetch` becomes:

  ```ts
      // Not the query's own refetch: offline that waits for signal, and the Trips tab's pull to
      // refresh spun until there was some. This one resolves at once for a paused fetch.
      refetch: () => queryClient.refetchQueries({ queryKey }),
  ```

  Callers only await it or call it (`itinerary/index.tsx:31`, `:83`; `ItineraryDetailView.tsx:628`), so none of them change. Drop `refetch` from the `useQuery` destructure (line 23): nothing uses it now.

### 2. `lib/providers/AppProviders.tsx`

Below the `queryClient`:

```ts
// Offline as the trip screens already judge it (CreateItineraryModal, AddToTripModal).
const isOnline = (state: NetInfoState) => state.isConnected !== false && state.isInternetReachable !== false;

// React Native has no browser online/offline events, so TanStack Query took the phone to be
// online always: queries fetched with no signal, and trip writes failed instead of waiting.
onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((state) => setOnline(isOnline(state))));

// Before the cache is restored: a trip write still waiting when the app last closed comes
// back without its function, which this supplies.
registerTripWrites(queryClient);

// Trip writes still waiting when the app last closed: sent now if there's signal, else on
// reconnect (the client's own listener), and then the cache catches up with the server.
// Only once sign-in is back and NetInfo has answered. Before that, a write goes out with no
// token or no signal, fails and is dropped. Firebase's sign-in restore checks with its server,
// so it normally finishes after the cache restore.
// Returns nothing on purpose: the provider holds every query, and saves nothing to the phone,
// until onSuccess settles, and offline a waiting write doesn't settle until there's signal.
function resumeTripWrites() {
  void Promise.all([auth.authStateReady(), NetInfo.fetch().then((state) => onlineManager.setOnline(isOnline(state)))])
    .then(() => queryClient.resumePausedMutations())
    .then(() => queryClient.invalidateQueries());
}
```

On `PersistQueryClientProvider`, add `onSuccess={resumeTripWrites}`. Don't write it as `onSuccess={() => queryClient.resumePausedMutations()…}`: an arrow with an expression body returns the promise, and the restore then waits for it (Problem, point 5).

Two library behaviours this relies on:
- `resumePausedMutations` swallows each write's own failure (`mutation.continue().catch(noop)`), so the `.then` always runs.
- Offline, `QueryClient.resumePausedMutations` does nothing and resolves. On reconnect, the client's own `onlineManager` listener sends the writes, then refetches.

Imports:
- `NetInfo` and the type `NetInfoState` from `@react-native-community/netinfo`;
- `onlineManager` from `@tanstack/react-query`;
- `registerTripWrites` from `@/lib/hooks/useItineraries`;
- `auth` from `@/lib/firebase`.

### 3. `components/itinerary/ItineraryDetailView.tsx`

No code change. The comment at lines 211–215 ("Offline the mutation pauses and resolves on reconnect…") becomes true. Leave it.

## Tests

`lib/hooks/__tests__/useItineraries.test.tsx`:

- The existing tests must pass unchanged. "queues saves made offline and sends them in order on reconnect" still holds, because the hook spreads `tripWrites.save` itself.
- New: **a save shows in the cached list before the server answers.** Load `[itin()]`. Give `saveItinerary` a promise that never resolves. Save `{ id: "itin-1", title: "Renamed" }`, and expect `itineraries[0].title` to be `"Renamed"`.
- New: **a write saved on the phone runs after a restart.**
  1. Queue a save offline through the hook.
  2. `dehydrate` that client (from `@tanstack/react-query`).
  3. Clear the first client's mutation cache, so it doesn't send the save too.
  4. `hydrate` the state into a fresh `QueryClient` that had `registerTripWrites` called on it.
  5. Go back online and `await fresh.resumePausedMutations()`.

  Expect `saveItinerary` to have been called once, with the queued trip. The wrapper creates its client inline, so build the first client in the test and pass it to a wrapper that uses it.
- New: **a refresh with no signal doesn't wait for it.** Load `[itin()]`, then go offline. `await act(() => result.current.refetch())` must resolve; without the fix the test times out. Expect `getMyItineraries` to have been called only once. Set it back online in a `finally`.

`lib/providers/__tests__/AppProviders.test.tsx`:

- Mocks, declared before the import, because all of this is set up when the module loads:
  - `@react-native-community/netinfo`: an `addEventListener` that records its callback and returns `() => {}`, and a `fetch` that resolves `{ isConnected: true, isInternetReachable: true }`.
  - `@/lib/hooks/useItineraries` as `{ registerTripWrites: jest.fn() }`.
  - `@/lib/firebase` as `{ auth: { authStateReady: jest.fn() } }`. Each test sets what it resolves.
- To let pending promises settle: `await new Promise(setImmediate)`.
- New: **follows NetInfo.** Call the recorded callback with `{ isConnected: false }` and expect `onlineManager.isOnline()` to be `false`. Then call it with `{ isConnected: true, isInternetReachable: true }` and expect `true`. Reset it to online afterwards.
- New: **registers the trip writes on the app's client.** `registerTripWrites` was called with `queryClient`.
- New: **resumes waiting writes once sign-in is back, without holding up the restore.**
  - Spy on `queryClient.resumePausedMutations` (resolving), and give `authStateReady` a promise the test resolves.
  - Call `mockPersistProps.current.onSuccess()` and expect it to return `undefined`.
  - Let promises settle: the spy hasn't been called.
  - Resolve `authStateReady` and let promises settle again: now it has.
- New: **takes NetInfo's answer before resuming.** Make `fetch` resolve `{ isConnected: false }`. Have the spy record `onlineManager.isOnline()` when it's called. Call `onSuccess()` and let promises settle: it recorded `false`. Reset it to online afterwards.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all pass.
- Device, after the update (owner):
  1. Open a trip. Turn on airplane mode. Move a place to another time. Leave the trip and open it again: the move is still there, and there's no "Couldn't Save Changes".
  2. Still in airplane mode, force-quit the app and reopen it. Open the trip: the move is still there. Move a second place, force-quit and reopen again: both moves are there.
  3. Turn airplane mode off. Within a few seconds, `npx wrangler tail` in `enginev1/api` shows the trip's saves. Another phone signed in to the same account shows both moves.
  4. Make a move in airplane mode again, then force-quit. Turn airplane mode off with the app closed, and reopen it. `wrangler tail` shows the save, and the move is still on the trip once the Trips tab has refreshed.
  5. In airplane mode, open the Trips tab and pull to refresh: the spinner stops within a moment.

## Files touched

- `lib/hooks/useItineraries.ts`
- `lib/providers/AppProviders.tsx`
- `lib/hooks/__tests__/useItineraries.test.tsx`
- `lib/providers/__tests__/AppProviders.test.tsx`

## Not in this fix

- **Creating a trip or adding a place offline.** Both stay blocked offline, as now.
- **Offline with nothing cached** (signed in more than 14 days ago and never reopened, then opened with no signal). The queries now pause instead of failing, so the Trips tab shows its empty state rather than "Couldn't load your trips", and Explore shows no places rather than "Connection Issue". Within the 14-day cache window this doesn't happen.
- **A write queued by one account, then sent after another account signs in on the same phone.** The api refuses it, because the trip isn't theirs, and the write is dropped. fix-37 clears the queue on account deletion.
