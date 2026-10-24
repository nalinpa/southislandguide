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
import abelTasman from "@/assets/data/abel_tasman_motueka_places.json";
import arthursPass from "@/assets/data/arthurs_pass_castle_hill_places.json";
import buller from "@/assets/data/buller_westport_places.json";
import catlins from "@/assets/data/catlins_places.json";
import centralOtago from "@/assets/data/central_otago_places.json";
import christchurch from "@/assets/data/christchurch_places_all.json";
import dunedin from "@/assets/data/dunedin_places.json";
import fiordland from "@/assets/data/fiordland_te_anau_places.json";
import glacierCountry from "@/assets/data/glacier_country_places.json";
import goldenBay from "@/assets/data/golden_bay_places.json";
import haast from "@/assets/data/haast_south_westland_places.json";
import hanmer from "@/assets/data/hanmer_springs_places.json";
import hokitika from "@/assets/data/hokitika_places.json";
import invercargill from "@/assets/data/invercargill_bluff_gore_places.json";
import kaikoura from "@/assets/data/kaikoura_places.json";
import mackenzie from "@/assets/data/mackenzie_mount_cook_places.json";
import marlborough from "@/assets/data/marlborough_places.json";
import marlboroughSounds from "@/assets/data/marlborough_sounds_places.json";
import nelson from "@/assets/data/nelson_places.json";
import nelsonLakes from "@/assets/data/nelson_lakes_murchison_places.json";
import oamaru from "@/assets/data/oamaru_north_otago_places.json";
import punakaiki from "@/assets/data/punakaiki_greymouth_places.json";
import midCanterbury from "@/assets/data/mid_canterbury_places.json";
import queenstown from "@/assets/data/queenstown_places.json";
import timaru from "@/assets/data/timaru_geraldine_places.json";
import waitaki from "@/assets/data/waitaki_valley_places.json";
import wanaka from "@/assets/data/wanaka_places.json";
import westernSouthland from "@/assets/data/western_southland_places.json";
import { PLANNER } from "@/lib/constants/gameplay";
import { ITINERARY_TEMPLATES, defaultTemplateKey } from "@/lib/itineraryTemplates";
import { canAddToItinerary, type ItineraryDay, type SiteCategory } from "@/lib/models";
import { packTrip } from "@/lib/utils/itineraryPhysics";

type Place = { slug: string; name: string; category: string[]; area?: string; active?: boolean };
const bySlug = new Map(([...christchurch, ...timaru, ...dunedin, ...queenstown, ...fiordland, ...wanaka, ...centralOtago, ...mackenzie, ...midCanterbury, ...marlboroughSounds, ...kaikoura, ...hanmer, ...westernSouthland, ...invercargill, ...catlins, ...arthursPass, ...punakaiki, ...hokitika, ...glacierCountry, ...haast, ...oamaru, ...nelson, ...abelTasman, ...goldenBay, ...nelsonLakes, ...buller, ...marlborough, ...waitaki] as Place[]).map((p) => [p.slug, p]));

// Places that stay in the app but are never a suggested trip's stop (owner, 2026-10-24):
// fine to find in Explore, not what a trip should send everyone to.
const NOT_TRIP_STOPS = [
  "south-canterbury-museum",
  "timaru-botanic-gardens",
  "taste-of-kiwi-springfield",
  "springfield-doughnut",
  "akaroa-museum",
  "okains-bay-maori-and-colonial-museum",
  "rakaia-salmon-statue",
  "murchison-district-museum",
  "west-coast-wildlife-centre",
  "ross-goldfields-water-race-walk",
  "blacks-point-museum",
  "the-bearded-miners",
  "denniston-plateau-brakehead",
  "puzzling-world",
  "ophir-post-office-bridge",
  "goldfields-mining-centre",
  "cromwell-heritage-precinct",
  "bannockburn-sluicings",
  "clyde-dam-lookout-historic-clyde",
  "shaky-bridge-alexandra-clock",
  "otago-central-rail-trail-day-ride",
  "te-hikoi-museum-riverton",
  "fiordland-cinema-ata-whenua",
  "ross-creek-reservoir",
  "olveston-historic-home",
  "the-lost-gypsy-gallery",
  // Everything in Gore.
  "eastern-southland-gallery",
  "old-hokonui-moonshine-museum",
];

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

  // The picker lists one town's trips by name, so a name can repeat across towns ("South
  // Island in 10 Days") but not within one.
  it("names each trip once within its starting town", () => {
    const names = ITINERARY_TEMPLATES.map((t) => `${t.start}: ${t.label}`);
    expect(new Set(names).size).toBe(names.length);
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

  it.each(days)("%s: has none of the places kept out of suggested trips", (_label, day) => {
    expect(day.items.map((i) => i.siteId).filter((id) => NOT_TRIP_STOPS.includes(id))).toEqual([]);
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
