import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";

import {
  fetchOfflineMapManifest,
  pendingSave,
  removeOfflineMap,
  saveOfflineMap,
  savedMapLevel,
  type MapLevel,
  type SavePhase,
} from "@/lib/offlineMap";

type SaveState = {
  progress: { phase: SavePhase; done: number; total: number } | null;
  error: "no-signal" | "stopped" | null;
  // The size of a save that hasn't finished, for Carry on.
  pendingLevel: MapLevel | null;
};

// Kept here, not in the screen, so a save carries on and keeps its count while the person
// is on another tab.
const useSaveStore = create<SaveState>(() => ({ progress: null, error: null, pendingLevel: null }));
// One save at a time: a second tap while the list of tiles is still coming does nothing.
let saving = false;
let stopAsked = false;
// Looked for once each time the app starts.
let pendingChecked = false;

// A save that didn't finish (iOS closed the app, or the phone was locked while it unpacked)
// carries on by itself when the app is next opened. On Wi-Fi it downloads what's missing;
// on mobile data, or after the person tapped Stop, it only unpacks what has already
// landed, and the row offers Carry on.
export async function carryOnPendingSave(save: (to: MapLevel, options: { download: boolean }) => Promise<void>) {
  const pending = await pendingSave();
  if (!pending) return;
  useSaveStore.setState({ pendingLevel: pending.level });
  const net = await NetInfo.fetch();
  await save(pending.level, { download: !pending.stopped && net.isConnected === true && net.type !== "cellular" });
}

const SAVED_KEY = ["offlineMap", "saved"];

// The count once a percent, not once a tile. Every screen using this hook redraws on a
// change, the map tab with all its pins too, and 9,849 redraws held up the downloads
// themselves: 71% after 15 minutes (owner, 2026-11-11).
export function oncePerPercent(report: (done: number, total: number) => void) {
  let shown = -1;
  return (done: number, total: number) => {
    const pct = Math.floor((done / total) * 100);
    if (pct === shown) return;
    shown = pct;
    report(done, total);
  };
}

// The map saved for no signal (lib/offlineMap.ts), for the Account row and the map tab.
export function useOfflineMap() {
  const queryClient = useQueryClient();
  const { data: level = null } = useQuery({
    queryKey: SAVED_KEY,
    queryFn: savedMapLevel,
    // It only reads the phone. TanStack pauses queries with no signal unless told not to,
    // and no signal is the one time the saved map is needed.
    networkMode: "always",
    // Checked again each time: iOS may have emptied the cache folder since.
    staleTime: 0,
  });
  const { progress, error, pendingLevel } = useSaveStore();

  const save = async (to: MapLevel = "standard", { download = true }: { download?: boolean } = {}) => {
    if (saving) return;
    saving = true;
    stopAsked = false;
    useSaveStore.setState({ error: null, pendingLevel: to });
    try {
      const manifest = await fetchOfflineMapManifest().catch(() => null);
      if (!manifest) {
        useSaveStore.setState({ error: "no-signal" });
        return;
      }
      // One counter for each phase: unpacking starts again from 0%.
      const report = {
        saving: oncePerPercent((done, total) => useSaveStore.setState({ progress: { phase: "saving", done, total } })),
        unpacking: oncePerPercent((done, total) => useSaveStore.setState({ progress: { phase: "unpacking", done, total } })),
      };
      const result = await saveOfflineMap(manifest, to, {
        onProgress: (phase, done, total) => report[phase](done, total),
        shouldStop: () => stopAsked,
        download,
      }).catch(() => "stopped" as const);
      if (result === "stopped") {
        useSaveStore.setState({ error: "stopped" });
        return;
      }
      // Saved before the count goes, so the row goes from Saving straight to Saved.
      await queryClient.invalidateQueries({ queryKey: SAVED_KEY });
      useSaveStore.setState({ progress: null, pendingLevel: null });
    } finally {
      saving = false;
    }
  };

  useEffect(() => {
    if (pendingChecked) return;
    pendingChecked = true;
    void carryOnPendingSave(save).catch(() => {});
    // Once, with the first screen to use the hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = () => {
    stopAsked = true;
  };

  const remove = async () => {
    await removeOfflineMap();
    useSaveStore.setState({ progress: null, error: null, pendingLevel: null });
    await queryClient.invalidateQueries({ queryKey: SAVED_KEY });
  };

  return { level, progress, error, pendingLevel, save, stop, remove };
}
