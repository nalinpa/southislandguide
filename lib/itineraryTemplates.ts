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

// The Port Hills and the coast by car: 10:00 AM (when the gondola opens) to 7:30 PM.
const HILLS_AND_COAST_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "christchurch-gondola", siteName: "Christchurch Gondola", slotIndex: 4, durationSlots: 4 },
    { siteId: "fire-and-slice", siteName: "Fire and Slice", slotIndex: 9, durationSlots: 2 },
    { siteId: "sumner-beach-and-cave-rock", siteName: "Sumner Beach and Cave Rock", slotIndex: 12, durationSlots: 3 },
    // Open for dinner (4.30 to 8pm) every day; lunch hours vary. Early, before the pools.
    { siteId: "bower-fish-supply", siteName: "Bower Fish Supply", slotIndex: 17, durationSlots: 1 },
    // The 5.30 to 7.30pm session: the last of four regular sessions a day (10am, 12.30pm,
    // 3pm, 5.30pm; owner, 2026-10-22).
    { siteId: "he-puna-taimoana-hot-pools", siteName: "He Puna Taimoana Hot Pools", slotIndex: 19, durationSlots: 4 },
  ],
};

// Queenstown on foot: 9:00 AM to 7:00 PM.
const QUEENSTOWN_TOWN_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "queenstown-gardens", siteName: "Queenstown Gardens", slotIndex: 2, durationSlots: 3 },
    // An early lunch, before the queue.
    { siteId: "fergburger", siteName: "Fergburger", slotIndex: 6, durationSlots: 2 },
    // The 1pm sailing from Steamer Wharf (9am, 11am, 1pm and 3pm; RealNZ's booking page,
    // 29 Oct 2026), at the wharf by 12.30.
    { siteId: "tss-earnslaw-cruise", siteName: "TSS Earnslaw Cruise", slotIndex: 10, durationSlots: 3 },
    { siteId: "skyline-queenstown-gondola-and-luge", siteName: "Skyline Queenstown Gondola and Luge", slotIndex: 14, durationSlots: 5 },
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

// Up the lake to Glenorchy and back by car: 9:00 AM to 6:00 PM. The morning drive is
// from Arrowtown when it follows SHOTOVER_AND_ARROWTOWN_DAY.
const GLENORCHY_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "bobs-cove-track", siteName: "Bob's Cove Track", slotIndex: 2, durationSlots: 3 },
    // After the drive into the glenorchy area (47 minutes, two slots).
    { siteId: "glenorchy-wharf-and-red-shed", siteName: "Glenorchy Wharf and Red Shed", slotIndex: 7, durationSlots: 1 },
    // Closes 4.30pm in winter.
    { siteId: "mrs-woollys-general-store", siteName: "Mrs Woolly's General Store", slotIndex: 9, durationSlots: 2 },
    // The short loop (1 to 4 hours by loop), so the drive back makes the 4pm Onsen session.
    { siteId: "glenorchy-lagoon-walkway", siteName: "Glenorchy Lagoon Walkway", slotIndex: 12, durationSlots: 2 },
    // The 4pm session (sessions on the hour; owner, 2026-10-22). Bookings essential and often
    // full; children 5 to 11 before 5pm only, which this fits.
    { siteId: "onsen-hot-pools", siteName: "Onsen Hot Pools", slotIndex: 16, durationSlots: 2 },
    { siteId: "eriks-fish-and-chips", siteName: "Erik's Fish and Chips", slotIndex: 19, durationSlots: 1 },
  ],
};

// The gondola and lunch in Queenstown, then the drive to Te Anau: 9:30 AM to 7:00 PM.
const QUEENSTOWN_TO_TE_ANAU_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "skyline-queenstown-gondola-and-luge", siteName: "Skyline Queenstown Gondola and Luge", slotIndex: 3, durationSlots: 5 },
    { siteId: "fergburger", siteName: "Fergburger", slotIndex: 9, durationSlots: 2 },
    // The 4.30pm tour (RealNZ's booking page, 26 Oct 2026: 10.15am to 8.15pm, about every
    // 75 min), half an hour after the drive allows: the caves ask you to arrive 30 min early.
    { siteId: "te-anau-glowworm-caves", siteName: "Te Anau Glowworm Caves", slotIndex: 17, durationSlots: 5 },
  ],
};

// Milford Sound and back from Te Anau: 8:00 AM to 7:00 PM.
const MILFORD_SOUND_DAY: ItineraryTemplateDay = {
  items: [
    // No food at Milford, so pies for the road.
    { siteId: "miles-better-pies", siteName: "Miles Better Pies", slotIndex: 0, durationSlots: 1 },
    { siteId: "mirror-lakes", siteName: "Mirror Lakes", slotIndex: 3, durationSlots: 1 },
    { siteId: "lake-gunn-nature-walk", siteName: "Lake Gunn Nature Walk", slotIndex: 5, durationSlots: 2 },
    // The 12.45pm sailing (hourly at :45 from 9.45am to 2.45pm, Cruise Milford's booking
    // page, 31 Oct 2026): check in at 12.30, back by 2.30.
    { siteId: "cruise-milford-small-boat-cruise", siteName: "Milford Sound Cruise with Cruise Milford", slotIndex: 9, durationSlots: 4 },
    // The 6pm show (screenings at 3, 5 and 6pm every day, Fiordland Cinema). The 1.5 hours
    // left free after the cruise are slack for the slow road and the Homer Tunnel lights
    // (owner, 2026-10-22).
    { siteId: "fiordland-cinema-ata-whenua", siteName: "Fiordland Cinema: Ata Whenua", slotIndex: 20, durationSlots: 2 },
  ],
};

// A Kepler Track morning, then back to Queenstown: 9:00 AM to 7:00 PM.
const TE_ANAU_TO_QUEENSTOWN_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "kepler-track-brod-bay", siteName: "Kepler Track: Control Gates to Brod Bay", slotIndex: 2, durationSlots: 6 },
    { siteId: "sandfly-cafe-te-anau", siteName: "Sandfly Cafe", slotIndex: 9, durationSlots: 2 },
    { siteId: "queenstown-gardens", siteName: "Queenstown Gardens", slotIndex: 16, durationSlots: 3 },
    { siteId: "the-cow", siteName: "The Cow", slotIndex: 20, durationSlots: 2 },
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
      "Day one in the central city on foot. Day two by car: the gondola, pizza and the beach at Sumner, then fish and chips and the hot pools at New Brighton.",
    free: true,
    days: [CENTRAL_CITY_DAY, HILLS_AND_COAST_DAY],
  },
  {
    key: "queenstown-in-two-days",
    label: "Queenstown in Two Days",
    description:
      "Day one in town: the gardens, an early Fergburger, a cruise on the Earnslaw, then the gondola and luge. Day two: the Shotover Jet and the Kawarau bungy bridge, then lunch, gold panning and the Chinese settlement in Arrowtown.",
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
  {
    key: "queenstown-and-fiordland-in-three-days",
    label: "Queenstown and Fiordland in Three Days",
    description:
      "Day one: the gondola and Fergburger, then the drive to Te Anau and the glowworm caves. Day two: Milford Sound by road, with Mirror Lakes and Lake Gunn on the way, a cruise and the Ata Whenua film back in Te Anau. Day three: the Kepler Track to Brod Bay, then back to Queenstown for the gardens and dinner at The Cow.",
    free: true,
    days: [QUEENSTOWN_TO_TE_ANAU_DAY, MILFORD_SOUND_DAY, TE_ANAU_TO_QUEENSTOWN_DAY],
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
