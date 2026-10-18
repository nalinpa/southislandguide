import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { ApiError } from "@blacksands/client";
import * as Sentry from "@sentry/react-native";

import { itineraryService } from "@/lib/services/itineraryService";
import { useSession } from "@/lib/providers/SessionProvider";
import { hooksBag } from "@/lib/hooksBag";
import type { Itinerary } from "@/lib/models";

export function useItineraries() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();
  const { requestReview } = hooksBag.useReviewPrompt();
  const queryKey = ["southislandguide", "itineraries", uid];

  // Must never fetch while offline: Firebase's getIdToken() needs a network
  // round-trip to refresh an expired cached token, and if that fails offline the
  // shared transport's tokenOrThrow() throws the same ApiError(401) as a real
  // revoked session — a false "Your session expired". Pausing queries offline
  // (NetInfo-backed onlineManager) is what stops that; see AppProviders.
  const { data: itineraries = [], isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await itineraryService.getMyItineraries();
      } catch (e) {
        console.error("[useItineraries] load failed:", e instanceof ApiError ? `status=${e.status} message=${e.message}` : e);
        Sentry.captureException(e);
        throw e;
      }
    },
    enabled: !!uid,
  });

  // The trip count at the time of the last render. Kept in a ref so the mutation's
  // onSuccess always sees the latest value, not the one captured when the mutation
  // was created. Used to fire the review prompt on the first trip.
  const tripCountRef = useRef(itineraries.length);
  tripCountRef.current = itineraries.length;

  // Offline, itinerary writes pause and send on reconnect (instead of the app-wide
  // "always" default) — otherwise an offline edit throws unhandled and is silently lost.
  // One shared scope makes queued writes go out strictly in order: each save sends the
  // whole days array, so a stale one landing last would clobber newer edits.
  const offlineQueue = { networkMode: "online", scope: { id: "itineraries" } } as const;

  const saveMutation = useMutation({
    ...offlineQueue,
    mutationFn: (data: Partial<Itinerary>) => itineraryService.saveItinerary(data),
    onSuccess: async (_data, variables) => {
      // Ask for a review on the very first trip creation, before the refetch
      // so the prompt isn't held up by network I/O.
      if (!variables.id && tripCountRef.current === 0) requestReview();
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    ...offlineQueue,
    mutationFn: (id: string) => itineraryService.deleteItinerary(id),
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

  return {
    itineraries,
    loading: isLoading,
    error: error
      ? error instanceof ApiError && error.status === 401
        ? "Your session expired. Please sign in again."
        : "Couldn't load your trips."
      : null,
    refetch,
    saveItinerary: saveMutation.mutateAsync,
    deleteItinerary: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
