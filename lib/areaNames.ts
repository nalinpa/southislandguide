// No imports, so the site export script (scripts/export-site-trips.mjs) can load it.

// Areas of the South Island guide, as a visitor divides them: the base town a
// place is visited from. One level below regions (lib/guideContent.ts).
//
// Same shape as REGIONS so the vocabulary stays consistent. TypeScript, not
// JSON, so it ships over the air and can carry comments.
export const AREAS = [
  // First, so it heads its region in the town picker (owner, 2026-10-24).
  { id: "queenstown", label: "Queenstown" },
  { id: "christchurch", label: "Christchurch" },
  { id: "timaru", label: "Timaru" },
  { id: "dunedin", label: "Dunedin" },
  { id: "oamaru", label: "Ōamaru" },
  { id: "kaikoura", label: "Kaikōura" },
  { id: "wanaka", label: "Wānaka" },
  // Names capitals can't make from the id. In this order so the town picker's order
  // doesn't change: within a region it lists these first, then the rest by id.
  { id: "aoraki-mount-cook", label: "Aoraki / Mount Cook" },
  { id: "catlins", label: "The Catlins" },
  { id: "arthurs-pass", label: "Arthur's Pass" },
] as const;

export type AreaId = (typeof AREAS)[number]["id"];

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
