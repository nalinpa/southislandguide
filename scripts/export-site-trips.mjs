// Writes the app's suggested trips as data for the website's trip quiz.
// Usage: node --no-warnings scripts/export-site-trips.mjs [../kiwiguide-site/public/plan/trips.json]
// Fetches the live place list once (a KV cache: no Firestore reads) for each stop's
// area, category and thumbnail.
import { writeFileSync } from "node:fs";
import { ITINERARY_TEMPLATES } from "../lib/itineraryTemplates.ts";
import { slotIndexToTimeLabel, slotsToDurationLabel } from "../lib/utils/slotLabels.ts";
import { areaName } from "../lib/areaNames.ts";
import { PLACE_IMAGE_TYPES } from "../lib/placeImageTypes.ts";

// The app's default photo for a place with none: its type's, else its first category's (see siteImage).
const TYPE_OF = new Map(Object.entries(PLACE_IMAGE_TYPES).flatMap(([type, ids]) => ids.map((id) => [id, type])));
const fallbackOf = (id, category) => (TYPE_OF.has(id) ? `types/${TYPE_OF.get(id)}` : category?.[0] ? `categories/${category[0]}` : null);

const out = process.argv[2] ?? "../kiwiguide-site/public/plan/trips.json";
const res = await fetch("https://api.blacksands.app/v1/southislandguide/locations");
if (!res.ok) throw new Error(`places list: HTTP ${res.status}`);
const places = new Map((await res.json()).data.locations.map((p) => [p.id, p]));

const missing = [];
const trips = ITINERARY_TEMPLATES.map((t) => {
  const days = t.days.map((d) => {
    const towns = [];
    const items = d.items.map((i) => {
      const p = places.get(i.siteId);
      if (!p) {
        missing.push(`${t.key}: ${i.siteId}`);
        return null;
      }
      const town = areaName(p.area);
      if (towns.at(-1) !== town) towns.push(town);
      return {
        siteId: i.siteId,
        siteName: i.siteName,
        slotIndex: i.slotIndex,
        durationSlots: i.durationSlots,
        timeLabel: slotIndexToTimeLabel(i.slotIndex),
        durationLabel: slotsToDurationLabel(i.durationSlots),
        category: p.category ?? [],
        thumb: p.imageThumbnailUrl ?? null,
        fallback: fallbackOf(i.siteId, p.category),
      };
    });
    return { town: towns.join(" → "), lastTown: towns.at(-1), items };
  });
  return {
    key: t.key,
    start: t.start,
    label: t.label,
    description: t.description,
    ends: days.at(-1).lastTown,
    days: days.map(({ town, items }) => ({ town, items })),
  };
});

if (missing.length) throw new Error(`Template stops missing from the live list:\n${missing.join("\n")}`);
writeFileSync(out, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), trips }, null, 2) + "\n");
console.log(`${trips.length} trips -> ${out}`);
