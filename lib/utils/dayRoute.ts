import type { ItineraryItem } from "@/lib/models";
import type { PlaceLookup } from "@/lib/utils/transitMatrix";

// ponytail: Google Maps URLs take up to 9 waypoints; a day with more than 10 stops drops the
// extra middle ones. Split the day into two links if real days ever get that long.
const MAX_WAYPOINTS = 9;

// The day's stops as one Google Maps drive, in the order of the day. No origin, so it starts
// from where the phone is. Opens the Google Maps app if installed, else the browser.
export function dayRouteUrl(items: ItineraryItem[], places: PlaceLookup): string | null {
  const stops: string[] = [];
  let lastSiteId: string | null = null;
  for (const item of [...items].sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))) {
    const place = places(item.siteId);
    if (place?.lat == null || place.lng == null || item.siteId === lastSiteId) continue;
    lastSiteId = item.siteId;
    stops.push(`${place.lat},${place.lng}`);
  }
  if (!stops.length) return null;

  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1).slice(0, MAX_WAYPOINTS);
  // By hand, not URLSearchParams: React Native's has left methods unimplemented.
  const query = `api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  const via = waypoints.length ? `&waypoints=${encodeURIComponent(waypoints.join("|"))}` : "";
  return `https://www.google.com/maps/dir/?${query}${via}`;
}
