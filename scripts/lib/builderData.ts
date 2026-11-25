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

// Days the website's trip builder may use that no suggested trip in the app has (owner, 2026-11-24: "website only for
// now"), each with the town it starts in and, when it is only for longer trips, the fewest trip days it goes in.
export const SITE_DAYS: { start: string; minTripDays?: number; day: ItineraryTemplateDay }[] = [
  // Dunedin down to the southern Catlins: 10:00 AM to 6:00 PM. The Catlins to Dunedin day has the northern Catlins, so the
  // two make a loop from Dunedin. Cathedral Caves and Slope Point are left out for their seasons, as on the Bluff day.
  {
    start: "dunedin",
    day: {
      items: [
        { siteId: "surat-bay-beach-walk", siteName: "Surat Bay Beach Walk", slotIndex: 4, durationSlots: 3 },
        { siteId: "catlins-cafe-owaka", siteName: "Catlins Cafe", slotIndex: 8, durationSlots: 2 },
        { siteId: "florence-hill-lookout", siteName: "Florence Hill Lookout", slotIndex: 11, durationSlots: 1 },
        { siteId: "mclean-falls", siteName: "McLean Falls", slotIndex: 13, durationSlots: 2 },
        // The forest shows at low tide.
        { siteId: "curio-bay-petrified-forest", siteName: "Curio Bay Petrified Forest", slotIndex: 17, durationSlots: 3 },
      ],
    },
  },
  // Invercargill along the south coast through Riverton and Tuatapere to Te Anau, the Te Anau to Invercargill day the other
  // way: 9:30 AM to 7:30 PM.
  {
    start: "invercargill",
    day: {
      items: [
        { siteId: "howells-point-reserve", siteName: "Howells Point Reserve", slotIndex: 3, durationSlots: 3 },
        { siteId: "the-crib-cafe-riverton", siteName: "The Crib Cafe", slotIndex: 7, durationSlots: 2 },
        { siteId: "mccrackens-rest", siteName: "McCracken's Rest", slotIndex: 11, durationSlots: 1 },
        { siteId: "clifden-suspension-bridge", siteName: "Clifden Suspension Bridge", slotIndex: 13, durationSlots: 1 },
        { siteId: "frasers-beach-manapouri", siteName: "Frasers Beach, Lake Manapōuri", slotIndex: 17, durationSlots: 3 },
        { siteId: "redcliff-te-anau", siteName: "Redcliff Restaurant & Bar", slotIndex: 21, durationSlots: 2 },
      ],
    },
  },
  // Dunedin inland through Gore and Lumsden to Te Anau, for trips of 5 days or more (owner): 9:00 AM to 8:30 PM. Nothing on
  // the inland road is in the place list. It leaves from the railway station, open any time (it was the Chinese Garden next
  // door, which opens at 10; owner, 2026-11-25: no stop before it opens): leaving an hour later would reach Te Anau as Miles
  // Better Pies shuts at 3.
  {
    start: "dunedin",
    minTripDays: 5,
    day: {
      items: [
        { siteId: "dunedin-railway-station", siteName: "Dunedin Railway Station", slotIndex: 2, durationSlots: 1 },
        { siteId: "miles-better-pies", siteName: "Miles Better Pies", slotIndex: 12, durationSlots: 1 },
        { siteId: "punanga-manu-o-te-anau-bird-sanctuary", siteName: "Punanga Manu o Te Anau Bird Sanctuary", slotIndex: 14, durationSlots: 2 },
        { siteId: "te-anau-glowworm-caves", siteName: "Te Anau Glowworm Caves", slotIndex: 17, durationSlots: 5 },
        { siteId: "redcliff-te-anau", siteName: "Redcliff Restaurant & Bar", slotIndex: 23, durationSlots: 2 },
      ],
    },
  },
];

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
  hoursNote?: string;
};

// A place's main opening hours from its note in the app (owner, 2026-11-25: "carry from app"), in half-hour slots from
// 8 AM (9 AM is 2; before 8 AM is below 0; past midnight above 32), for the site's builder to keep its stops inside: the
// note's first clause, or when that has no time the first later one that isn't about something else (a market, a ferry,
// the office, the café, a meal, tours, gates, a closure). "10am to 5pm" opens and closes; "from 11am" and "7.30am till
// late" only open. None for a place open any time (any time, 24 hours, daylight, dawn, sunrise, sunset), or no clear hours.
const ANY_TIME = /any ?time|24 hours|24\/7|always open|daylight|dawn|sunrise|sunset/;
const ELSE = /closed|closure|market|ferry|office|caf[eé]|breakfast|brunch|lunch|dinner|kitchen|menu|tours?\b|departs|departures?|lifeguard|gates?\b|car ?park|visitor cent|display house|glasshouse|shops?\b|pizza/;
const TIME = String.raw`(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)`;
const at = (h: string, m: string | undefined, ap: string) => ((+h % 12) + (ap === "pm" ? 12 : 0)) * 2 + (m ? +m / 30 : 0) - 16;
export function openHours(note?: string): { open: number; close: number | null } | null {
  const parts = (note ?? "").toLowerCase().replace(/\bnoon\b|\bmidday\b/g, "12pm").split(";");
  if (!parts[0].trim() || ANY_TIME.test(parts[0])) return null;
  const has = (c: string) => new RegExp(TIME).test(c);
  const c = has(parts[0]) ? parts[0] : parts.slice(1).find((x) => has(x) && !ELSE.test(x));
  if (!c) return null;
  const r = c.match(new RegExp(String.raw`(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\s*(?:to|–|-)\s*` + TIME));
  if (r) {
    const open = at(r[1], r[2], r[3] ?? (+r[1] % 12 > +r[4] % 12 ? "am" : r[6]));
    const close = at(r[4], r[5], r[6]);
    return { open, close: close <= open ? close + 48 : close }; // closing past midnight
  }
  const f = c.match(new RegExp(String.raw`from\s*` + TIME)) ?? c.match(new RegExp(TIME + String.raw`\s*(?:till|til|until)\s*late`));
  return f ? { open: at(f[1], f[2], f[3]), close: null } : null;
}

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
  const blocks = new Map<string, { id: string; startTown: string; endTown: string; driveMinutes: number; minTripDays?: number; items: ItineraryTemplateDay["items"] }>();
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
  // The website-only days, after the templates' (in no template, so no template pair)
  for (const s of SITE_DAYS) {
    const first = s.day.items[0].siteId, last = s.day.items[s.day.items.length - 1].siteId;
    const id = blocks.has(`${first}..${last}`) ? `${first}..${last}@${s.start}` : `${first}..${last}`;
    blocks.set(id, {
      id, startTown: s.start, endTown: endTownOf(id, lookup(last)!.area), driveMinutes: driveMinutes(s.start, s.day),
      ...(s.minTripDays ? { minTripDays: s.minTripDays } : {}),
      items: s.day.items.map(({ siteId, siteName, slotIndex, durationSlots }) => ({ siteId, siteName, slotIndex, durationSlots })),
    });
  }

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
    const hours = openHours(p.hoursNote);
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
      open: hours ? hours.open : null,
      close: hours ? hours.close : null,
    };
    (towns[p.area] ??= { name: areaName(p.area), placeIds: [] }).placeIds.push(id);
  }

  return { blocks: [...blocks.values()], templates: outTemplates, places: out, towns, starts: START_CITIES };
}
