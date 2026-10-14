import matrix from "@/assets/data/southisland-transit.json";
import { areaDriveMinutes } from "@/lib/areas";
import type { Site } from "@/lib/models";

// Trip items carry only a place id, so whoever works out travel hands in a way to look a
// place up: the live place list (lib/hooks/usePlaceLookup.ts), never a bundled copy,
// because places are added and re-homed in the admin panel at any time.
export type PlaceLookup = (siteId: string) => Pick<Site, "area"> | undefined;

// `drive` is set only when the leg crosses from one area to another with a listed time:
// that, not its length, is what makes the day view draw it as a drive block.
export type Leg = { slots: number; drive: { fromArea: string; toArea: string } | null };

export function getLeg(fromSiteId: string, toSiteId: string, places: PlaceLookup): Leg {
  if (fromSiteId === toSiteId) return { slots: 0, drive: null };

  const fromArea = places(fromSiteId)?.area;
  const toArea = places(toSiteId)?.area;
  const minutes = fromArea && toArea ? areaDriveMinutes(fromArea, toArea) : undefined;
  if (fromArea && toArea && minutes !== undefined) {
    return { slots: Math.max(1, Math.ceil(minutes / 30)), drive: { fromArea, toArea } };
  }

  // Same area, an area missing, or a pair with no listed time: the place-to-place matrix,
  // which is where real in-area times will land. Not in it (not generated yet, or a site
  // added since) -> flat 1-slot (30 min) default so scheduling never breaks.
  const slots = (matrix as Record<string, Record<string, number>>)[fromSiteId]?.[toSiteId];
  return { slots: slots !== undefined ? slots : 1, drive: null };
}
