import { useQuery, useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";

import { fetchOfflineMapManifest, removeOfflineMap, saveOfflineMap, savedMapLevel, type MapLevel, type SavePhase } from "@/lib/offlineMap";

type SaveState = { progress: { phase: SavePhase; done: number; total: number } | null; error: "no-signal" | "stopped" | null };

// Kept here, not in the screen, so a save carries on and keeps its count while the person
// is on another tab.
const useSaveStore = create<SaveState>(() => ({ progress: null, error: null }));
// One save at a time: a second tap while the list of tiles is still coming does nothing.
let saving = false;
let stopAsked = false;

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
  const { progress, error } = useSaveStore();

  const save = async (to: MapLevel = "standard") => {
    if (saving) return;
    saving = true;
    stopAsked = false;
    useSaveStore.setState({ error: null });
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
      }).catch(() => "stopped" as const);
      if (result === "stopped") {
        useSaveStore.setState({ error: "stopped" });
        return;
      }
      // Saved before the count goes, so the row goes from Saving straight to Saved.
      await queryClient.invalidateQueries({ queryKey: SAVED_KEY });
      useSaveStore.setState({ progress: null });
    } finally {
      saving = false;
    }
  };

  const stop = () => {
    stopAsked = true;
  };

  const remove = async () => {
    await removeOfflineMap();
    useSaveStore.setState({ progress: null, error: null });
    await queryClient.invalidateQueries({ queryKey: SAVED_KEY });
  };

  return { level, progress, error, save, stop, remove };
}
