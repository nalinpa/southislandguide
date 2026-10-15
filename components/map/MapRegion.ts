import type { Region } from "react-native-maps";

import { nearestSite } from "@/lib/utils/geoDistance";

// How far the map can be dragged: the whole South Island with Stewart Island,
// Cape Farewell (-40.5) to South Cape (-47.3), West Cape (166.4) to Cape
// Campbell (174.3), plus a margin. Until 2026-10-11 it was a box around
// Christchurch: a South Island guide that can't show the island reads as
// broken, even while the places are all in a few towns.
export const MAP_BOUNDS = {
  minLat: -47.5,
  maxLat: -40.3,
  minLng: 166.2,
  maxLng: 174.6,
};

export function isOnIsland(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return (
    lat != null &&
    lng != null &&
    lat >= MAP_BOUNDS.minLat &&
    lat <= MAP_BOUNDS.maxLat &&
    lng >= MAP_BOUNDS.minLng &&
    lng <= MAP_BOUNDS.maxLng
  );
}

// The town nearest the user: the area of the nearest place, however far, for anyone on
// the island. The map and Explore both open on it, so they always name the same town.
// Undefined off the island (nearest means little from Auckland), with no position, and
// when that place has no area.
// ponytail: nearest in a straight line, not by road. Right for towns down one coast;
// revisit when a town across a range can be nearer on the map and further to drive.
export function nearestArea(
  lat: number | null | undefined,
  lng: number | null | undefined,
  sites: { lat: number; lng: number; area?: string }[],
): string | undefined {
  if (lat == null || lng == null || !isOnIsland(lat, lng)) return undefined;
  return nearestSite(lat, lng, sites)?.site.area;
}

// Central Christchurch: only reached with no position and no places at all.
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
