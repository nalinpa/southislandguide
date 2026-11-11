import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { ApiError } from "@blacksands/client";
import * as Sentry from "@sentry/react-native";

import { itineraryService } from "@/lib/services/itineraryService";
import { useSession } from "@/lib/providers/SessionProvider";
import { hooksBag } from "@/lib/hooksBag";
import { PLANNER } from "@/lib/constants/gameplay";
import type { Itinerary } from "@/lib/models";

const stopCount = (days?: Itinerary["days"]) => days?.reduce((n, d) => n + d.items.length, 0);

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

// A write restored after a restart has no screen waiting on it, so its failure was silent.
// The live mutations in useItineraries set their own onError, which replaces this one.
// One alert at a time: several queued writes can fail together when signal comes back.
let failedWriteAlertOpen = false;
function onRestoredWriteError(error: unknown) {
  Sentry.captureException(error);
  if (failedWriteAlertOpen) return;
  failedWriteAlertOpen = true;
  Alert.alert("A trip change couldn't be saved.", undefined, [
    { text: "OK", onPress: () => (failedWriteAlertOpen = false) },
  ]);
}

export function registerTripWrites(queryClient: QueryClient) {
  queryClient.setMutationDefaults(tripWrites.save.mutationKey, { ...tripWrites.save, onError: onRestoredWriteError });
  queryClient.setMutationDefaults(tripWrites.delete.mutationKey, { ...tripWrites.delete, onError: onRestoredWriteError });
}

export function useItineraries() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();
  const { requestReview } = hooksBag.useReviewPrompt();
  const queryKey = ["southislandguide", "itineraries", uid];

  // Offline, this pauses instead of fetching: TanStack's onlineManager follows NetInfo (see
  // AppProviders). A fetch with no signal would only fail and show "Couldn't load your trips."
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await itineraryService.getMyItineraries();
      } catch (e) {
        Sentry.captureException(e);
        throw e;
      }
    },
    enabled: !!uid,
  });
  const itineraries = data ?? [];

  // Which step "Add to Trip" opens on: no trips yet, make one; under the limit, ask whether
  // to use one or make one; at the limit, pick one. Null until the trips are known: an
  // empty list before they load sent someone with three trips off to make a fourth.
  const addFlow: "create" | "choose" | "pick" | null =
    data === undefined
      ? null
      : data.length === 0
        ? "create"
        : data.length < PLANNER.MAX_ITINERARIES
          ? "choose"
          : "pick";

  const saveMutation = useMutation({
    ...tripWrites.save,
    // Into the cached list now, not after the refetch: a save waiting for signal would
    // otherwise leave the old trip in the cache, for the screen to show on return and the
    // next edit to start from (and then overwrite this one). A save that fails puts the list
    // back, as a failed delete does. A paused one hasn't failed, so it keeps its edit.
    onMutate: async (data: Partial<Itinerary>) => {
      if (!data.id) return;
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Itinerary[]>(queryKey);
      queryClient.setQueryData<Itinerary[]>(queryKey, (old) => old?.map((i) => (i.id === data.id ? { ...i, ...data } : i)));
      return { previous, prevStops: stopCount(previous?.find((i) => i.id === data.id)?.days) };
    },
    // Refreshed without waiting: the failure is reported at once, not after the refetch.
    onError: (_err, _data, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      queryClient.invalidateQueries({ queryKey });
    },
    onSuccess: async (_data, variables, context) => {
      // A review once the trip reaches 5 stops, one Add to Trip at a time (owner,
      // 2026-11-11: asking on the first trip was too early, and with one trip each that
      // was everyone's first place). Not on creating a trip, which has no id yet, and not
      // on Start a New Trip saving a suggested trip over this one, which jumps straight
      // past 5. Before the refetch, so the prompt isn't held up by the network.
      if (context?.prevStops === 4 && stopCount(variables.days) === 5) requestReview();
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    ...tripWrites.delete,
    // Drop it from the cached list now, not after the refetch, so it doesn't linger on screen.
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Itinerary[]>(queryKey);
      queryClient.setQueryData<Itinerary[]>(queryKey, (old) => old?.filter((i) => i.id !== id));
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const sessionExpired = error instanceof ApiError && error.status === 401;

  return {
    itineraries,
    addFlow,
    loading: isLoading,
    error: error ? (sessionExpired ? "Your session expired. Please sign in again." : "Couldn't load your trips.") : null,
    sessionExpired,
    // Not the query's own refetch: offline that waits for signal, and the Trips tab's pull to
    // refresh spun until there was some. This one resolves at once for a paused fetch.
    refetch: () => queryClient.refetchQueries({ queryKey }),
    saveItinerary: saveMutation.mutateAsync,
    deleteItinerary: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
