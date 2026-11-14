import type { ItineraryItem } from "@/lib/models";
import type { PlaceLookup } from "@/lib/utils/transitMatrix";

// ponytail: Google Maps URLs take up to 9 waypoints; a day with more than 10 stops drops the
// extra middle ones. Split the day into two links if real days ever get that long.
const MAX_WAYPOINTS = 9;

// The day's stops as one Google Maps drive, in the order of the day. No origin, so it starts
// from where the phone is. Opens the Google Maps app if installed, else the browser.
// `fromFirstStop`: the phone is overseas, where Google can't route from (tester, 2026-11-14),
// so the drive starts at the day's first stop; a day of one stop opens that place.
export function dayRouteUrl(items: ItineraryItem[], places: PlaceLookup, fromFirstStop = false): string | null {
  const stops: string[] = [];
  let lastSiteId: string | null = null;
  for (const item of [...items].sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))) {
    const place = places(item.siteId);
    if (place?.lat == null || place.lng == null || item.siteId === lastSiteId) continue;
    lastSiteId = item.siteId;
    stops.push(`${place.lat},${place.lng}`);
  }
  if (!stops.length) return null;
  if (fromFirstStop && stops.length === 1) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stops[0])}`;

  const destination = stops[stops.length - 1];
  const origin = fromFirstStop ? stops[0] : null;
  const waypoints = stops.slice(origin ? 1 : 0, -1).slice(0, MAX_WAYPOINTS);
  // By hand, not URLSearchParams: React Native's has left methods unimplemented.
  const from = origin ? `&origin=${encodeURIComponent(origin)}` : "";
  const query = `api=1${from}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  const via = waypoints.length ? `&waypoints=${encodeURIComponent(waypoints.join("|"))}` : "";
  return `https://www.google.com/maps/dir/?${query}${via}`;
}
