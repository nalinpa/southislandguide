import { useCallback, useMemo } from "react";

import { useAllLocations, useRefreshLocations } from "@/lib/hooksBag";
import type { PlaceLookup } from "@/lib/utils/transitMatrix";

// The live place list as a lookup by id, for the planner (lib/utils/itineraryPhysics.ts).
// The list is the one the map and the place list already load, and it is saved to the
// device, so it is there offline after a first load.
//
// `ready` is false until the list holds at least one place. Callers must not pack or
// check a trip before then: against an empty list every drive is the flat half hour.
// Key effects on `ready` and `count`, not on `places`: they only change when the list does.
// `list` is the list itself, for what needs every place at once (a town's picture).
export function usePlaceLookup() {
  const { locations, err } = useAllLocations();
  const byId = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const places = useCallback<PlaceLookup>((siteId) => byId.get(siteId), [byId]);
  const refresh = useRefreshLocations();
  return { places, list: locations, ready: byId.size > 0, count: byId.size, err, refresh };
}
