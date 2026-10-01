import type { Region } from "react-native-maps";

// The area this app has content for. v1 is Christchurch only, so the map
// opens on the city and pans within it. Used in three places — the fallback
// centre below, SitesMapView's pan limits, and the map screen's "is the user
// actually here" check — which rotorua-guide kept as three separate copies.
// ponytail: one fixed box. When a second region gets venues, this becomes a
// per-region lookup (the RegionId vocabulary in lib/guideContent.ts), and the
// pan limit should widen to the island or go away entirely.
export const COVERAGE_BOUNDS = {
  minLat: -43.7,
  maxLat: -43.35,
  minLng: 172.4,
  maxLng: 172.85,
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
