// The trip builder's data for the website (written by scripts/export-site-trips.mjs): the
// suggested trips' day blocks with the town each starts and ends in, the places a trip may
// use, and a hash of the app files the site's copy was made from. TypeScript so jest and
// the export script (which bundles it) both import it.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import AREA_HUBS_JSON from "@/assets/data/area-hubs.json";
import { areaName } from "@/lib/areaNames";
import type { ItineraryTemplate, ItineraryTemplateDay } from "@/lib/itineraryTemplates";
import { NOT_TRIP_STOPS } from "@/lib/notTripStops";
import { PLACE_IMAGE_TYPES } from "@/lib/placeImageTypes";
import { getLeg } from "@/lib/utils/transitMatrix";

export const START_CITIES = ["christchurch", "queenstown", "picton", "dunedin", "nelson", "invercargill"];

// The towns a trip sleeps in (read from the day sequences in lib/itineraryTemplates.ts). Arrowtown
// and Glenorchy are day trips from Queenstown; the Marlborough Sounds road ends at the Picton ferry.
export const OVERNIGHT_TOWNS: readonly string[] = [
  "christchurch", "queenstown", "wanaka", "te-anau", "tekapo", "aoraki-mount-cook", "kaikoura", "invercargill",
  "catlins", "dunedin", "greymouth", "hokitika", "franz-josef", "fox-glacier", "haast", "nelson", "abel-tasman",
  "golden-bay", "westport", "picton",
];

// Where the night is spent for a block whose last stop is in a town trips do not sleep in, by
// block id (first and last stop ids). Required: builderData throws for a block with neither.
export const HAND_END_TOWN: Record<string, string> = {
  // Shotover Jet, then Arrowtown for the afternoon: back to Queenstown for the night.
  "shotover-jet..arrowtown-chinese-settlement": "queenstown",
  // Golden Bay over Takaka Hill, then the Sounds road: the trip ends at the Picton ferry.
  "the-grove-scenic-reserve..queen-charlotte-drive-cullen-point": "picton",
};

// Every input of builder-data.json and pack.js: the trips, the timing code and the drive data
// (the export checks this list against pack.js's bundle inputs).
const SOURCE_FILES = [
  "lib/itineraryTemplates.ts", "lib/utils/itineraryPhysics.ts", "lib/utils/transitMatrix.ts", "lib/areas.ts",
  "lib/areaNames.ts", "lib/constants/gameplay.ts", "lib/utils/slotLabels.ts", "lib/utils/geoDistance.ts",
  "lib/notTripStops.ts", "lib/placeImageTypes.ts", "assets/data/transit/index.ts",
  "scripts/pack-entry.ts", "scripts/rn-stub.ts", "lib/utils/tripLines.ts", "lib/ui/tokens.ts", "scripts/lib/builderData.ts", "scripts/export-site-trips.mjs",
];
const SOURCE_DATA = ["area-drive-minutes.json", "area-hubs.json", "far-place-minutes.json", "leg-minutes.json"];

export function sourceFiles(root: string): string[] {
  return [
    ...SOURCE_FILES,
    ...SOURCE_DATA.map((f) => `assets/data/${f}`),
    ...readdirSync(path.join(root, "assets/data/transit")).filter((f) => f.endsWith(".json")).sort().map((f) => `assets/data/transit/${f}`),
  ];
}

export function sourceHash(root: string): string {
  const files = sourceFiles(root);
  const h = createHash("sha256");
  for (const f of files) h.update(f + "\0" + readFileSync(path.join(root, f), "utf8").replace(/\r\n/g, "\n") + "\0");
  return h.digest("hex").slice(0, 12);
}

// The app's default photo for a place with none: its type's, else its first category's (see siteImage).
const TYPE_OF = new Map(Object.entries(PLACE_IMAGE_TYPES).flatMap(([type, ids]) => ids.map((id) => [id, type] as const)));
export const fallbackOf = (id: string, category?: string[]) =>
  TYPE_OF.has(id) ? `types/${TYPE_OF.get(id)}` : category?.[0] ? `categories/${category[0]}` : null;

export type BuilderPlace = {
  id?: string;
  slug?: string;
  name: string;
  area?: string;
  lat: number;
  lng: number;
  category?: string[];
  active?: boolean;
  recommendedDurationSlots?: number;
  featured?: unknown;
  vibe?: string[];
  activities?: string[];
  imageThumbnailUrl?: string;
};

const HUBS: Record<string, string> = AREA_HUBS_JSON;

function endTownOf(id: string, lastArea: string): string {
  if (OVERNIGHT_TOWNS.includes(lastArea)) return lastArea;
  const hand = HAND_END_TOWN[id.split("@")[0]];
  if (!hand) throw new Error(`block ${id} ends in ${lastArea}, which no trip sleeps in: add it to HAND_END_TOWN`);
  return hand;
}

export function builderData(templates: ItineraryTemplate[], placeList: BuilderPlace[]) {
  const places = new Map(placeList.map((p) => [(p.id ?? p.slug)!, p]));
  const lookup = (id: string) => places.get(id) as { area: string; lat: number; lng: number } | undefined;

  // One block per distinct day object and start town: the templates reuse the same day
  // constants, and a few are used from two nights' towns (Abel Tasman day from Nelson or from
  // Motueka). Id "<first stop>..<last stop>"; a later start town of the same day adds
  // "@<startTown>" (in the order the templates first use them).
  const blocks = new Map<string, { id: string; startTown: string; endTown: string; driveMinutes: number; items: ItineraryTemplateDay["items"] }>();
  const baseIds = new Map<ItineraryTemplateDay, string>();
  const outTemplates = templates.map((t) => {
    let at: string = t.start;
    const blockIds = t.days.map((day) => {
      let base = baseIds.get(day);
      if (!base) {
        base = `${day.items[0].siteId}..${day.items[day.items.length - 1].siteId}`;
        baseIds.set(day, base);
      }
      const variants = [...blocks.values()].filter((x) => x.id.split("@")[0] === base);
      let b = variants.find((x) => x.startTown === at);
      if (!b) {
        const last = day.items[day.items.length - 1].siteId;
        const id = variants.length ? `${base}@${at}` : base;
        b = { id, startTown: at, endTown: endTownOf(id, lookup(last)!.area), driveMinutes: driveMinutes(at, day), items: day.items.map(({ siteId, siteName, slotIndex, durationSlots }) => ({ siteId, siteName, slotIndex, durationSlots })) };
        blocks.set(id, b);
      }
      at = b.endTown;
      return b.id;
    });
    return { key: t.key, start: t.start, end: at, label: t.label, blockIds };
  });

  // Minutes of driving between towns in a block: the legs from the start town's hub through the
  // stops in order that cross from one area to another (getLeg's `drive`), each leg's half-hour
  // slots at 30 minutes. In-town hops don't count: the drive limit is about the road between towns.
  function driveMinutes(startTown: string, day: ItineraryTemplateDay) {
    let from = HUBS[startTown];
    let slots = 0;
    for (const i of day.items) {
      const leg = getLeg(from, i.siteId, lookup);
      if (leg.drive) slots += leg.slots;
      from = i.siteId;
    }
    return slots * 30;
  }

  const out: Record<string, unknown> = {};
  const towns: Record<string, { name: string; placeIds: string[] }> = {};
  for (const [id, p] of places) {
    if (p.active === false || !p.area || NOT_TRIP_STOPS.includes(id) || p.category?.includes("Stay")) continue;
    out[id] = {
      id,
      name: p.name,
      area: p.area,
      lat: p.lat,
      lng: p.lng,
      category: p.category ?? [],
      slots: p.recommendedDurationSlots ?? 2,
      featured: !!p.featured,
      vibe: p.vibe ?? [],
      activities: p.activities ?? [],
      thumb: p.imageThumbnailUrl ?? null,
      fallback: fallbackOf(id, p.category),
    };
    (towns[p.area] ??= { name: areaName(p.area), placeIds: [] }).placeIds.push(id);
  }

  return { blocks: [...blocks.values()], templates: outTemplates, places: out, towns, starts: START_CITIES };
}
