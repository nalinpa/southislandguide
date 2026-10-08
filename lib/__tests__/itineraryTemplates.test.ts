// The suggested itineraries are hand-written data, so this pins the two things that would
// otherwise only show up on a device: every stop is a real, addable place, and the times are
// pre-baked — the physics engine must have nothing to move when the trip is first opened.
// Re-bake lib/itineraryTemplates.ts if this fails after the transit matrix changes.
import places from "@/assets/data/christchurch_places_all.json";
import { PLANNER } from "@/lib/constants/gameplay";
import { ITINERARY_TEMPLATES, defaultTemplateKey } from "@/lib/itineraryTemplates";
import { canAddToItinerary, type ItineraryItem, type SiteCategory } from "@/lib/models";
import { runPhysicsEngine } from "@/lib/utils/itineraryPhysics";

const bySlug = new Map((places as { slug: string; name: string; category: string[] }[]).map((p) => [p.slug, p]));

const days = ITINERARY_TEMPLATES.flatMap((t) => t.days.map((day, i) => [`${t.key} day ${i + 1}`, day] as const));

describe("the suggested itineraries", () => {
  it("offers a one-day and a two-day trip, both free, with unique keys", () => {
    expect(ITINERARY_TEMPLATES.map((t) => t.days.length)).toEqual([1, 2]);
    expect(ITINERARY_TEMPLATES.every((t) => t.free)).toBe(true);
    expect(new Set(ITINERARY_TEMPLATES.map((t) => t.key)).size).toBe(ITINERARY_TEMPLATES.length);
  });

  it.each(days)("%s: every stop is a real place by its own name, and never a Stay", (_label, day) => {
    for (const item of day.items) {
      const place = bySlug.get(item.siteId);
      expect({ siteId: item.siteId, name: place?.name }).toEqual({ siteId: item.siteId, name: item.siteName });
      expect(canAddToItinerary({ category: place!.category as SiteCategory[] })).toBe(true);
    }
  });

  it.each(days)("%s: is pre-baked, so the physics engine moves nothing", (_label, day) => {
    const packed = runPhysicsEngine(day.items as unknown as ItineraryItem[]);
    expect(packed.map((i) => i.slotIndex)).toEqual(day.items.map((i) => i.slotIndex));
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
