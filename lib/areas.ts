import AREA_DRIVE_MINUTES_JSON from "@/assets/data/area-drive-minutes.json";

// Areas of the South Island guide, as a visitor divides them: the base town a
// place is visited from. One level below regions (lib/guideContent.ts).
//
// Same shape as REGIONS so the vocabulary stays consistent. TypeScript, not
// JSON, so it ships over the air and can carry comments.
export const AREAS = [
  { id: "christchurch", label: "Christchurch" },
  { id: "timaru", label: "Timaru" },
  { id: "dunedin", label: "Dunedin" },
  { id: "oamaru", label: "Ōamaru" },
  { id: "kaikoura", label: "Kaikōura" },
  { id: "wanaka", label: "Wānaka" },
] as const;

export type AreaId = (typeof AREAS)[number]["id"];

// The town Explore opens on for someone who is off the island or has no position.
// Anyone on the island gets the town nearest them (nearestArea, components/map/MapRegion.ts).
// Christchurch for now (owner, 2026-10-14): where most visitors land. Revisit once the
// whole island is in.
export const DEFAULT_AREA: AreaId = "christchurch";

export const AREA_LABELS: Record<AreaId, string> = AREAS.reduce(
  (acc, a) => ({ ...acc, [a.id]: a.label }),
  {} as Record<AreaId, string>,
);

export function areaLabel(id: string): string | undefined {
  return AREA_LABELS[id as AreaId];
}

// What to call an area on screen. An area can be added in the admin panel before the
// app knows it, and a town's name is nearly always its id with capitals ("lake-tekapo"
// is "Lake Tekapo"), so that is what it goes by until it has a label. It only needs one
// in AREAS for what capitals can't do: a macron, an "&".
export function areaName(id: string): string {
  return areaLabel(id) ?? id.replace(/-/g, " ").replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

// Minutes by road, town to town, used in both directions. One entry per pair: the two
// ids in alphabetical order, joined with "|". Written by
// `node scripts/generate-drive-times.js areas --apply` (a maps service, town centre to
// town centre); the three in it until then are from memory (owner, 2026-10-14).
const AREA_DRIVE_MINUTES: Record<string, number> = AREA_DRIVE_MINUTES_JSON;

export function areaDriveMinutes(a: string, b: string): number | undefined {
  if (a === b) return undefined;
  const key = [a, b].sort().join("|");
  return AREA_DRIVE_MINUTES[key];
}
