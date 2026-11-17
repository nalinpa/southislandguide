import { canAddToItinerary, type Site } from "@/lib/models";
import { distanceMeters } from "./geoDistance";

// The places closest to a point, nearest first. Places with no position are skipped, so
// are excluded ids and, with addableOnly, places a trip can't take (Stay).
export function nearestPlaces(
  origin: { lat: number; lng: number },
  places: Site[],
  opts: { exclude?: ReadonlySet<string>; addableOnly?: boolean; limit: number },
): Array<{ site: Site; meters: number }> {
  return places
    .filter(
      (s) =>
        Number.isFinite(s.lat) &&
        Number.isFinite(s.lng) &&
        !opts.exclude?.has(s.id) &&
        (!opts.addableOnly || canAddToItinerary(s)),
    )
    .map((site) => ({ site, meters: distanceMeters(origin, site) }))
    .sort((a, b) => a.meters - b.meters)
    .slice(0, opts.limit);
}
