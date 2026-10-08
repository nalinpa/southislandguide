// Curated trip templates a user can turn into their own itinerary from
// CreateItineraryModal's "Suggested Itinerary" picker. Read-only and dateless:
// real dates are set when one is copied into a real Itinerary.
//
// siteId is the place's Firestore doc id (its slug); siteName its name. Both
// come from assets/data/christchurch_places_all.json — keep them in sync.
//
// slotIndex/durationSlots are pre-baked so the itinerary physics engine has
// nothing to move the first time the trip is opened: slot 0 is 8:00 AM, a slot
// is 30 minutes, and each stop starts at least one transit leg after the last
// one ends. The transit matrix is still empty, so every leg is the flat 1-slot
// default. RE-BAKE these when the real matrix lands (release 1.1) —
// lib/__tests__/itineraryTemplates.test.ts fails if they no longer fit.
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
    { siteId: "quake-city", siteName: "Quake City", slotIndex: 15, durationSlots: 2 },
    { siteId: "central-city-street-art", siteName: "Central City Street Art", slotIndex: 18, durationSlots: 3 },
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

export const ITINERARY_TEMPLATES: ItineraryTemplate[] = [
  {
    key: "christchurch-in-a-day",
    label: "Christchurch in a Day",
    description:
      "The central city on foot: the Botanic Gardens, a punt on the Avon, lunch at Little High, the Cardboard Cathedral, Quake City and the street art.",
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
];

// The template key to preselect in CreateItineraryModal's picker. Locked
// (non-premium) users can't leave this on "Blank" — that option is gated
// behind the same free flag as the templates — so default them onto the
// first free template instead.
export function defaultTemplateKey(locked: boolean): string | null {
  if (!locked) return null;
  return ITINERARY_TEMPLATES.find((t) => t.free)?.key ?? null;
}
