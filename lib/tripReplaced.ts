// A trip saved over as a whole from inside the app: by the trip quiz, or by Start a New Trip (owner, 2026-11-28).
// The replacing save marks the trip once it has landed. The trip's screen, if it holds an edit it couldn't save,
// drops that edit when the mark it took the trip at has moved: the edit was of the trip replaced, and sent later it
// would put the old days back over the new trip. Nothing else moves the mark: a place added from Explore or the map,
// a save from another phone, a save rolled back.
import { useSyncExternalStore } from "react";

const marks = new Map<string, number>();
const listeners = new Set<() => void>();

/** How often this trip has been saved over from inside the app. */
export const replacedCount = (tripId: string) => marks.get(tripId) ?? 0;

/** The replacing save of this trip has landed. */
export function markReplaced(tripId: string) {
  marks.set(tripId, replacedCount(tripId) + 1);
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** The trip's mark, kept up to date: a screen draws again when it moves. */
export function useReplaced(tripId: string): number {
  return useSyncExternalStore(subscribe, () => replacedCount(tripId));
}
