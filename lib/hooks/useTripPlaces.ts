import { useMemo } from "react";

import { useItineraries } from "@/lib/hooks/useItineraries";

type Where = { tripId: string; dayId: string; dayNumber: number };

// The places in the person's trip, for marking them on the place's screen, Explore, Saved Places
// and the map. Empty for a guest (useItineraries has no trips for one). `dayOf` is the first trip
// (in list order) with the place, and the first day in it.
export function useTripPlaces(): { ids: ReadonlySet<string>; dayOf: (siteId: string) => Where | null } {
  const { itineraries } = useItineraries();
  return useMemo(() => {
    const at = new Map<string, Where>();
    for (const t of itineraries)
      t.days.forEach((d, i) =>
        d.items.forEach((it) => {
          if (!at.has(it.siteId)) at.set(it.siteId, { tripId: t.id, dayId: d.id, dayNumber: i + 1 });
        }),
      );
    return { ids: new Set(at.keys()), dayOf: (siteId: string) => at.get(siteId) ?? null };
  }, [itineraries]);
}
