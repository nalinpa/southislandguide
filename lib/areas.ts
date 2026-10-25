import AREA_DRIVE_MINUTES_JSON from "@/assets/data/area-drive-minutes.json";
import type { RegionId } from "@/lib/guideContent";

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

// The town Explore and the map open on for someone who is off the island or has no
// position, and the region the town picker lists first. Anyone on the island gets the
// town nearest them (nearestArea, components/map/MapRegion.ts). Queenstown (owner,
// 2026-10-24); Christchurch until then.
export const DEFAULT_AREA: AreaId = "queenstown";

// The region each town is listed under in the town picker. Set here, not worked out from
// its places' own `region`, which can be split or wrong: most of the Catlins' places say
// Otago. A town missing here (added in the admin panel since) goes under the region most
// of its places are in.
export const AREA_REGIONS: Record<string, RegionId> = {
  queenstown: "queenstown-wanaka",
  arrowtown: "queenstown-wanaka",
  glenorchy: "queenstown-wanaka",
  wanaka: "queenstown-wanaka",
  "central-otago": "queenstown-wanaka",
  "te-anau": "fiordland",
  "milford-sound": "fiordland",
  // Riverton and Tuatapere are Southland's: Fiordland only starts beyond them.
  invercargill: "southland-catlins",
  riverton: "southland-catlins",
  tuatapere: "southland-catlins",
  gore: "southland-catlins",
  catlins: "southland-catlins",
  dunedin: "dunedin-otago",
  oamaru: "dunedin-otago",
  "waitaki-valley": "dunedin-otago",
  "aoraki-mount-cook": "aoraki-mackenzie",
  tekapo: "aoraki-mackenzie",
  twizel: "aoraki-mackenzie",
  christchurch: "canterbury",
  "banks-peninsula": "canterbury",
  "mid-canterbury": "canterbury",
  timaru: "canterbury",
  "arthurs-pass": "canterbury",
  "hanmer-springs": "canterbury",
  // Under Canterbury, as its places are: the guide's own Kaikōura region would make a
  // heading of one town.
  kaikoura: "canterbury",
  haast: "west-coast",
  "fox-glacier": "west-coast",
  "franz-josef": "west-coast",
  hokitika: "west-coast",
  greymouth: "west-coast",
  punakaiki: "west-coast",
  reefton: "west-coast",
  westport: "west-coast",
  nelson: "nelson-tasman",
  "abel-tasman": "nelson-tasman",
  "golden-bay": "nelson-tasman",
  "nelson-lakes": "nelson-tasman",
  murchison: "nelson-tasman",
  picton: "marlborough",
  "marlborough-sounds": "marlborough",
  blenheim: "marlborough",
};

// The default town's region, listed first in the town picker and in the guide's region tabs
// (owner, 2026-10-24 and 2026-10-25); the rest keep the guide's order.
export const FIRST_REGION: RegionId = AREA_REGIONS[DEFAULT_AREA];

// The guide's region for a town where it isn't the town picker's: the guide gives Kaikōura
// sections of its own. Any other town opens the guide on its AREA_REGIONS region.
export const AREA_GUIDE_REGIONS: Record<string, RegionId> = {
  kaikoura: "kaikoura",
};

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
// `node scripts/generate-drive-times.js areas --apply` (a maps service, from each town's
// hub, assets/data/area-hubs.json). A place far from its own hub has its own times
// instead (lib/utils/transitMatrix.ts).
const AREA_DRIVE_MINUTES: Record<string, number> = AREA_DRIVE_MINUTES_JSON;

export function areaDriveMinutes(a: string, b: string): number | undefined {
  if (a === b) return undefined;
  const key = [a, b].sort().join("|");
  return AREA_DRIVE_MINUTES[key];
}
