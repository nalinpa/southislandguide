import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { COL } from "@/lib/constants/firestore";
import { useSession } from "@/lib/providers/SessionProvider";

export function useSavedSites() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();

  // Cached as an array, not a Set: the query cache is persisted to AsyncStorage as
  // JSON, and a Set serializes to "{}" — saved places would be empty on an offline launch.
  const { data, isLoading } = useQuery({
    queryKey: ["savedSites", uid],
    queryFn: async () => {
      if (!uid) return [];
      const snap = await getDoc(doc(db, COL.users, uid));
      return (snap.data()?.savedSites ?? []) as string[];
    },
    enabled: !!uid,
  });
  // Empty without an account, whatever the cache holds: builds before
  // 2026-10-10 let a guest's tap write into the (persisted) cache.
  const savedSiteIds = useMemo(() => new Set(uid ? data : []), [uid, data]);

  const toggleMutation = useMutation({
    mutationFn: ({ siteId, isSaving }: { siteId: string; isSaving: boolean }) => {
      if (!uid) return Promise.resolve();
      return setDoc(
        doc(db, COL.users, uid),
        { savedSites: isSaving ? arrayUnion(siteId) : arrayRemove(siteId) },
        { merge: true },
      );
    },
    onMutate: async ({ siteId, isSaving }: { siteId: string; isSaving: boolean }) => {
      await queryClient.cancelQueries({ queryKey: ["savedSites", uid] });
      const previous = queryClient.getQueryData<string[]>(["savedSites", uid]);
      const rest = (previous ?? []).filter((id) => id !== siteId);
      queryClient.setQueryData(["savedSites", uid], isSaving ? [...rest, siteId] : rest);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["savedSites", uid], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["savedSites", uid] });
    },
  });

  // Saving needs an account. The guard is here, not in mutationFn: onMutate's
  // optimistic update runs first and regardless, so a guest's tap used to put
  // the place in the cache and show it as saved with nothing stored anywhere.
  // Screens decide how to tell a guest (the detail page asks them to sign in).
  const toggleSavedSite = (vars: { siteId: string; isSaving: boolean }) => {
    if (!uid) return;
    toggleMutation.mutate(vars);
  };

  return {
    savedSiteIds,
    loading: isLoading,
    toggleSavedSite,
    isToggling: toggleMutation.isPending,
  };
}