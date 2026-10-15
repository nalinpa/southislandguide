const EARTH_RADIUS_METERS = 6371000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_METERS * c;
}

// How close a place has to be for the user to count as "here": somewhere the app has
// places. Worked out from the live places, so a town added in the admin panel is "here"
// with no app change.
// ponytail: one number, chosen by eye against the places live on 2026-10-14 (Rolleston,
// Rangiora, Mosgiel and both airports in; Ashburton and Oamaru out). Tune if it reads wrong.
export const NEAR_PLACES_METERS = 30_000;

export function nearestSite<T extends { lat: number; lng: number }>(
  lat: number,
  lng: number,
  sites: T[],
): { site: T; meters: number } | null {
  let nearest: { site: T; meters: number } | null = null;
  for (const site of sites) {
    const meters = distanceMeters({ lat, lng }, site);
    if (!nearest || meters < nearest.meters) nearest = { site, meters };
  }
  return nearest;
}
