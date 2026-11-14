import { Alert, Linking } from "react-native";
import * as Location from "expo-location";

// New Zealand from Stewart Island to North Cape: the saved map's box. Wider than the map's
// own (MAP_BOUNDS, the South Island), so someone in Wellington or Auckland counts as here.
export const NZ_BOUNDS = { minLat: -47.5, maxLat: -34.3, minLng: 166.2, maxLng: 178.7 };

export const isInNZ = (lat: number, lng: number): boolean =>
  lat >= NZ_BOUNDS.minLat && lat <= NZ_BOUNDS.maxLat && lng >= NZ_BOUNDS.minLng && lng <= NZ_BOUNDS.maxLng;

// Is the phone overseas? Only from where it last was, and only if location is already
// allowed: a directions tap never asks for it. Can't tell means no, as before (tester,
// 2026-11-14: from the US, Google can't route a drive to New Zealand).
export async function phoneIsOutsideNZ(): Promise<boolean> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm?.granted) return false;
    const pos = await Location.getLastKnownPositionAsync();
    return !!pos && !isInNZ(pos.coords.latitude, pos.coords.longitude);
  } catch {
    return false;
  }
}

export const placeUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
export const routeUrl = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

// Out to Google Maps (the app if installed, else the browser). It used to fail silently.
export const openMaps = (url: string) =>
  Linking.openURL(url).catch(() => Alert.alert("Couldn't Open", "Google Maps didn't open. Try again in a moment."));

// Directions to a place: a route from the phone in New Zealand; from overseas, the place
// itself. Nothing until the place's position has loaded.
export async function openDirections(lat: number | null | undefined, lng: number | null | undefined) {
  if (lat == null || lng == null) return;
  await openMaps((await phoneIsOutsideNZ()) ? placeUrl(lat, lng) : routeUrl(lat, lng));
}
