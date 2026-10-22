// The suggested itineraries are hand-written data, so this pins the two things that would
// otherwise only show up on a device: every stop is a real, addable place, and the times are
// pre-baked — the physics engine must have nothing to move when the trip is first opened.
// Re-bake lib/itineraryTemplates.ts if this fails after the area drive times (lib/areas.ts)
// or the transit matrix change.
//
// Packed the way the app packs a trip: the whole template at once, against the bundled
// place files for every town a template visits (add a town's file when a template first
// goes there), so a template that crosses towns (within a day or overnight) fails here
// until its slots allow for the drive.
//
// The trips ship with the real drive times, so they are packed against those: jest.config.js
// points the app at fixed sample times, which leave nearly every pair of towns out.
jest.mock("@/assets/data/area-drive-minutes.json", () => jest.requireActual("../../assets/data/area-drive-minutes.json"));
jest.mock("@/assets/data/area-hubs.json", () => jest.requireActual("../../assets/data/area-hubs.json"));
jest.mock("@/assets/data/far-place-minutes.json", () => jest.requireActual("../../assets/data/far-place-minutes.json"));
import christchurch from "@/assets/data/christchurch_places_all.json";
import dunedin from "@/assets/data/dunedin_places.json";
import fiordland from "@/assets/data/fiordland_te_anau_places.json";
import queenstown from "@/assets/data/queenstown_places.json";
import timaru from "@/assets/data/timaru_geraldine_places.json";
import { PLANNER } from "@/lib/constants/gameplay";
import { ITINERARY_TEMPLATES, defaultTemplateKey } from "@/lib/itineraryTemplates";
import { canAddToItinerary, type ItineraryDay, type SiteCategory } from "@/lib/models";
import { packTrip } from "@/lib/utils/itineraryPhysics";

type Place = { slug: string; name: string; category: string[]; area?: string; active?: boolean };
const bySlug = new Map(([...christchurch, ...timaru, ...dunedin, ...queenstown, ...fiordland] as Place[]).map((p) => [p.slug, p]));

const packed = new Map(
  ITINERARY_TEMPLATES.map((t) => [t.key, packTrip(t.days as unknown as ItineraryDay[], (siteId) => bySlug.get(siteId))]),
);

const days = ITINERARY_TEMPLATES.flatMap((t) =>
  t.days.map((day, i) => [`${t.key} day ${i + 1}`, day, packed.get(t.key)![i]] as const),
);

describe("the suggested itineraries", () => {
  it("offers trips of at least a day, all free, with unique keys", () => {
    expect(ITINERARY_TEMPLATES.every((t) => t.days.length >= 1)).toBe(true);
    expect(ITINERARY_TEMPLATES.every((t) => t.free)).toBe(true);
    expect(new Set(ITINERARY_TEMPLATES.map((t) => t.key)).size).toBe(ITINERARY_TEMPLATES.length);
  });

  // The bundled files can lag the live list, so a place switched off only in the admin panel
  // still passes here: check new stops against the api too (lib/itineraryTemplates.ts).
  it.each(days)("%s: every stop is a real, switched-on place by its own name, and never a Stay", (_label, day) => {
    for (const item of day.items) {
      const place = bySlug.get(item.siteId);
      expect({ siteId: item.siteId, name: place?.name, active: place?.active !== false }).toEqual({
        siteId: item.siteId,
        name: item.siteName,
        active: true,
      });
      expect(canAddToItinerary({ category: place!.category as SiteCategory[] })).toBe(true);
    }
  });

  // Without an area a stop's legs fall back to the flat half hour, and the check below
  // would pass for a template that really needs a drive.
  it.each(days)("%s: every stop has an area", (_label, day) => {
    for (const item of day.items) {
      expect({ siteId: item.siteId, area: bySlug.get(item.siteId)?.area }).toEqual({ siteId: item.siteId, area: expect.any(String) });
    }
  });

  it.each(days)("%s: is pre-baked, so the physics engine moves nothing", (_label, day, packedDay) => {
    expect(packedDay.items.map((i) => i.slotIndex)).toEqual(day.items.map((i) => i.slotIndex));
  });

  it.each(days)("%s: ends inside the 8am to 10pm grid", (_label, day) => {
    const last = day.items[day.items.length - 1];
    expect(last.slotIndex + last.durationSlots).toBeLessThanOrEqual(PLANNER.MAX_GRID_SLOTS);
  });
});

describe("defaultTemplateKey", () => {
  it("leaves an unlocked user on Blank and puts a locked one on the first free template", () => {
    expect(defaultTemplateKey(false)).toBeNull();
    expect(defaultTemplateKey(true)).toBe(ITINERARY_TEMPLATES[0].key);
  });
});
