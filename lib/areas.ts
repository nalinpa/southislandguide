// Areas of the South Island guide, as a visitor divides them: the base town a
// place is visited from. One level below regions (lib/guideContent.ts).
//
// Same shape as REGIONS so the vocabulary stays consistent. TypeScript, not
// JSON, so it ships over the air and can carry comments.
export const AREAS = [
  { id: "christchurch", label: "Christchurch" },
  { id: "timaru", label: "Timaru" },
  { id: "dunedin", label: "Dunedin" },
] as const;

export type AreaId = (typeof AREAS)[number]["id"];

export const AREA_LABELS: Record<AreaId, string> = AREAS.reduce(
  (acc, a) => ({ ...acc, [a.id]: a.label }),
  {} as Record<AreaId, string>,
);

export function areaLabel(id: string): string | undefined {
  return AREA_LABELS[id as AreaId];
}

// Minutes by road, town to town, used in both directions. One entry per pair:
// the two ids in alphabetical order, joined with "|".
// From memory, not checked against a map (owner, 2026-10-14). Confirm before release.
const AREA_DRIVE_MINUTES: Record<string, number> = {
  "christchurch|timaru": 120,
  "dunedin|timaru": 150,
  "christchurch|dunedin": 270,
};

export function areaDriveMinutes(a: string, b: string): number | undefined {
  if (a === b) return undefined;
  const key = [a, b].sort().join("|");
  return AREA_DRIVE_MINUTES[key];
}
