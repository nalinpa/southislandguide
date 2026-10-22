// Curated trip templates a user can turn into their own itinerary from
// CreateItineraryModal's "Suggested Trip" picker. Read-only and dateless:
// real dates are set when one is copied into a real Itinerary.
//
// siteId is the place's Firestore doc id (its slug); siteName its live name, which
// the trip shows. Every stop must be a live place: check the api's list
// (/v1/southislandguide/locations), not only the bundled assets/data/*_places*.json,
// which can lag it (Quake City and the street art were switched off live while
// still active in the JSON). The bundled name must match too; the test checks it.
//
// slotIndex/durationSlots are pre-baked so the itinerary physics engine has
// nothing to move the first time the trip is opened: slot 0 is 8:00 AM, a slot
// is 30 minutes, and each stop starts at least one travel leg after the last
// one ends. Legs within a town come from its table in assets/data/transit/, and
// drives between towns (within a day or overnight) from lib/areas.ts. RE-BAKE if
// those change — lib/__tests__/itineraryTemplates.test.ts fails if they no longer fit.
//
// Stops are also placed inside each place's opening hours on every day of the
// week (the Saturday-only markets are left out for that reason). Nothing
// checks that automatically.

export type ItineraryTemplateItem = {
  siteId: string;
  siteName: string;
  slotIndex: number;
  durationSlots: number;
};

export type ItineraryTemplateDay = {
  items: ItineraryTemplateItem[];
};

export type ItineraryTemplate = {
  key: string;
  label: string;
  description: string;
  days: ItineraryTemplateDay[];
  // Selectable without the full guide unlock. Defaults to premium-only.
  free?: boolean;
};

// The central city on foot: 9:00 AM to 6:30 PM, no car needed.
const CENTRAL_CITY_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "christchurch-botanic-gardens", siteName: "Christchurch Botanic Gardens", slotIndex: 2, durationSlots: 4 },
    { siteId: "punting-on-the-avon", siteName: "Punting on the Avon", slotIndex: 7, durationSlots: 2 },
    { siteId: "little-high-eatery", siteName: "Little High Eatery", slotIndex: 10, durationSlots: 2 },
    // Closes about 4pm (3pm Sundays), so it comes straight after lunch.
    { siteId: "transitional-cardboard-cathedral", siteName: "Transitional Cardboard Cathedral", slotIndex: 13, durationSlots: 1 },
    // Closes 5pm (Wednesdays 9pm), so 3:30 to 5:00 PM.
    { siteId: "christchurch-art-gallery", siteName: "Christchurch Art Gallery", slotIndex: 15, durationSlots: 3 },
    { siteId: "avon-river-walk", siteName: "Avon River Walk", slotIndex: 19, durationSlots: 2 },
  ],
};

// The Port Hills and the coast by car: 10:00 AM (when the gondola opens) to 7:00 PM.
const HILLS_AND_COAST_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "christchurch-gondola", siteName: "Christchurch Gondola", slotIndex: 4, durationSlots: 4 },
    { siteId: "fire-and-slice", siteName: "Fire and Slice", slotIndex: 9, durationSlots: 2 },
    { siteId: "sumner-beach-and-cave-rock", siteName: "Sumner Beach and Cave Rock", slotIndex: 12, durationSlots: 3 },
    // 4:00 to 6:00 PM: a full 2-hour session that ends before the 7.30pm close.
    { siteId: "he-puna-taimoana-hot-pools", siteName: "He Puna Taimoana Hot Pools", slotIndex: 16, durationSlots: 4 },
    // Open for dinner (4.30 to 8pm) every day; lunch hours vary.
    { siteId: "bower-fish-supply", siteName: "Bower Fish Supply", slotIndex: 21, durationSlots: 1 },
  ],
};

// Queenstown on foot: 9:30 AM (when the gondola opens) to 7:00 PM.
const QUEENSTOWN_TOWN_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "skyline-queenstown-gondola-and-luge", siteName: "Skyline Queenstown Gondola and Luge", slotIndex: 3, durationSlots: 5 },
    { siteId: "fergburger", siteName: "Fergburger", slotIndex: 9, durationSlots: 2 },
    // The 2pm sailing from Steamer Wharf.
    { siteId: "tss-earnslaw-cruise", siteName: "TSS Earnslaw Cruise", slotIndex: 12, durationSlots: 3 },
    { siteId: "queenstown-gardens", siteName: "Queenstown Gardens", slotIndex: 16, durationSlots: 3 },
    { siteId: "the-cow", siteName: "The Cow", slotIndex: 20, durationSlots: 2 },
  ],
};

// The Shotover Jet, then Arrowtown by car: 9:30 AM (the first jet) to 6:00 PM.
const SHOTOVER_AND_ARROWTOWN_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "shotover-jet", siteName: "Shotover Jet", slotIndex: 3, durationSlots: 3 },
    // After the 24-minute drive into the arrowtown area. Closes 4.30pm in winter.
    { siteId: "kawarau-bridge-bungy", siteName: "Kawarau Bridge Bungy", slotIndex: 7, durationSlots: 3 },
    // Food until 3pm.
    { siteId: "provisions-of-arrowtown", siteName: "Provisions of Arrowtown", slotIndex: 11, durationSlots: 2 },
    // Last pan hire 4pm, so pan first.
    { siteId: "lakes-district-museum-and-gold-panning", siteName: "Lakes District Museum and Gold Panning", slotIndex: 14, durationSlots: 3 },
    { siteId: "arrowtown-chinese-settlement", siteName: "Arrowtown Chinese Settlement", slotIndex: 18, durationSlots: 2 },
  ],
};

// Up the lake to Glenorchy and back by car: 9:00 AM to 6:30 PM. The morning drive is
// from Arrowtown when it follows SHOTOVER_AND_ARROWTOWN_DAY.
const GLENORCHY_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "bobs-cove-track", siteName: "Bob's Cove Track", slotIndex: 2, durationSlots: 3 },
    // After the drive into the glenorchy area (47 minutes, two slots).
    { siteId: "glenorchy-wharf-and-red-shed", siteName: "Glenorchy Wharf and Red Shed", slotIndex: 7, durationSlots: 1 },
    // Closes 4.30pm in winter.
    { siteId: "mrs-woollys-general-store", siteName: "Mrs Woolly's General Store", slotIndex: 9, durationSlots: 2 },
    { siteId: "glenorchy-lagoon-walkway", siteName: "Glenorchy Lagoon Walkway", slotIndex: 12, durationSlots: 3 },
    // After the drive back. Bookings essential; children 5 to 11 before 5pm only.
    { siteId: "onsen-hot-pools", siteName: "Onsen Hot Pools", slotIndex: 17, durationSlots: 2 },
    { siteId: "eriks-fish-and-chips", siteName: "Erik's Fish and Chips", slotIndex: 20, durationSlots: 1 },
  ],
};

export const ITINERARY_TEMPLATES: ItineraryTemplate[] = [
  {
    key: "christchurch-in-a-day",
    label: "Christchurch in a Day",
    description:
      "The central city on foot: the Botanic Gardens, a punt on the Avon, lunch at Little High, the Cardboard Cathedral, the Art Gallery and an evening walk by the river.",
    free: true,
    days: [CENTRAL_CITY_DAY],
  },
  {
    key: "two-days-in-christchurch",
    label: "Two Days in Christchurch",
    description:
      "Day one in the central city on foot. Day two by car: the gondola, pizza and the beach at Sumner, then hot pools and fish and chips at New Brighton.",
    free: true,
    days: [CENTRAL_CITY_DAY, HILLS_AND_COAST_DAY],
  },
  {
    key: "queenstown-in-two-days",
    label: "Queenstown in Two Days",
    description:
      "Day one in town: the gondola and luge, Fergburger, a cruise on the Earnslaw and the gardens. Day two: the Shotover Jet and the Kawarau bungy bridge, then lunch, gold panning and the Chinese settlement in Arrowtown.",
    free: true,
    days: [QUEENSTOWN_TOWN_DAY, SHOTOVER_AND_ARROWTOWN_DAY],
  },
  {
    key: "queenstown-in-three-days",
    label: "Queenstown in Three Days",
    description:
      "Day one in town and day two in Arrowtown, as in the two-day trip. Day three up the lake: Bob's Cove, the Glenorchy wharf, lunch at Mrs Woolly's and the lagoon walk, then the Onsen hot pools and fish and chips back in town.",
    free: true,
    days: [QUEENSTOWN_TOWN_DAY, SHOTOVER_AND_ARROWTOWN_DAY, GLENORCHY_DAY],
  },
];

// The template key to preselect in CreateItineraryModal's picker. Locked
// (non-premium) users can't leave this on "Blank" — that option is gated
// behind the same free flag as the templates — so default them onto the
// first free template instead.
export function defaultTemplateKey(locked: boolean): string | null {
  if (!locked) return null;
  return ITINERARY_TEMPLATES.find((t) => t.free)?.key ?? null;
}
