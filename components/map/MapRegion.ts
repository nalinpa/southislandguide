import type { Region } from "react-native-maps";

// The area this app has content for. v1 is Christchurch only, so the map
// opens on the city. Used for the fallback centre below and the map screen's
// "is the user actually here" check: someone outside it opens on the places
// rather than on their own position, where there would be nothing to see.
// ponytail: one fixed box. When a second region gets venues, this becomes a
// per-region lookup (the RegionId vocabulary in lib/guideContent.ts).
export const COVERAGE_BOUNDS = {
  minLat: -43.7,
  maxLat: -43.35,
  minLng: 172.4,
  maxLng: 172.85,
};

// How far the map can be dragged: the whole South Island with Stewart Island,
// Cape Farewell (-40.5) to South Cape (-47.3), West Cape (166.4) to Cape
// Campbell (174.3), plus a margin. Deliberately not COVERAGE_BOUNDS, which it
// was until 2026-10-11: a South Island guide that can't show the island reads
// as broken, even while the places are all in one city.
export const MAP_BOUNDS = {
  minLat: -47.5,
  maxLat: -40.3,
  minLng: 166.2,
  maxLng: 174.6,
};

export function isInCoverage(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return (
    lat != null &&
    lng != null &&
    lat >= COVERAGE_BOUNDS.minLat &&
    lat <= COVERAGE_BOUNDS.maxLat &&
    lng >= COVERAGE_BOUNDS.minLng &&
    lng <= COVERAGE_BOUNDS.maxLng
  );
}

// Central Christchurch.
const DEFAULT_CENTER: Region = {
  latitude: -43.5321,
  longitude: 172.6362,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export function initialRegionFrom(
  userLat: number | null,
  userLng: number | null,
  sites: { lat: number; lng: number }[],
): Region {
  if (userLat != null && userLng != null) {
    return {
      latitude: userLat,
      longitude: userLng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }

  if (sites.length > 0) {
    let minLat = sites[0].lat;
    let maxLat = sites[0].lat;
    let minLng = sites[0].lng;
    let maxLng = sites[0].lng;

    for (const loc of sites) {
      if (loc.lat < minLat) minLat = loc.lat;
      if (loc.lat > maxLat) maxLat = loc.lat;
      if (loc.lng < minLng) minLng = loc.lng;
      if (loc.lng > maxLng) maxLng = loc.lng;
    }

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.2, 0.12),
      longitudeDelta: Math.max((maxLng - minLng) * 1.2, 0.12),
    };
  }

  return DEFAULT_CENTER;
}
