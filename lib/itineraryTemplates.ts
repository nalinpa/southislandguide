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

// Doubtful Sound from Manapōuri: 9:00 AM to about 5:30 PM.
const DOUBTFUL_SOUND_DAY: ItineraryTemplateDay = {
  items: [
    // Lunch isn't included on the cruise, so pies for the boat.
    { siteId: "miles-better-pies", siteName: "Miles Better Pies", slotIndex: 2, durationSlots: 1 },
    // The 10.30am sailing (7.30 and 10.30am; RealNZ's booking page, 30 Oct 2026), at the
    // Manapōuri visitor centre by 10. Back about 5.15pm.
    { siteId: "doubtful-sound-wilderness-cruise", siteName: "Doubtful Sound Wilderness Cruise", slotIndex: 5, durationSlots: 14 },
  ],
};

// Key Summit off the Milford Road, then Manapōuri: 8:00 AM to 6:00 PM.
const KEY_SUMMIT_DAY: ItineraryTemplateDay = {
  items: [
    // No food on the track, so pies for lunch.
    { siteId: "miles-better-pies", siteName: "Miles Better Pies", slotIndex: 0, durationSlots: 1 },
    // Best November to April; snow and avalanche risk in winter and spring.
    { siteId: "key-summit-track", siteName: "Key Summit Track", slotIndex: 4, durationSlots: 7 },
    { siteId: "punanga-manu-o-te-anau-bird-sanctuary", siteName: "Punanga Manu o Te Anau Bird Sanctuary", slotIndex: 14, durationSlots: 2 },
    { siteId: "frasers-beach-manapouri", siteName: "Frasers Beach, Lake Manapōuri", slotIndex: 17, durationSlots: 3 },
  ],
};

// The Shotover Jet and Arrowtown, then over the Crown Range to Wānaka: 9:30 AM to 7:30 PM.
const QUEENSTOWN_TO_WANAKA_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "shotover-jet", siteName: "Shotover Jet", slotIndex: 3, durationSlots: 3 },
    { siteId: "arrowtown-chinese-settlement", siteName: "Arrowtown Chinese Settlement", slotIndex: 7, durationSlots: 2 },
    // Food until 3pm.
    { siteId: "provisions-of-arrowtown", siteName: "Provisions of Arrowtown", slotIndex: 10, durationSlots: 2 },
    { siteId: "crown-range-summit-lookout", siteName: "Crown Range Summit Lookout", slotIndex: 13, durationSlots: 1 },
    { siteId: "cardrona-hotel", siteName: "Cardrona Hotel", slotIndex: 16, durationSlots: 2 },
    { siteId: "that-wanaka-tree", siteName: "That Wānaka Tree", slotIndex: 19, durationSlots: 1 },
    { siteId: "red-star-burger-bar", siteName: "Red Star Burger Bar", slotIndex: 21, durationSlots: 2 },
  ],
};

// Wānaka: 9:00 AM to 6:00 PM. Roys Peak is left out (closed 1 Oct to 10 Nov for lambing).
const WANAKA_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "diamond-lake-rocky-mountain-track", siteName: "Diamond Lake and Rocky Mountain Track", slotIndex: 2, durationSlots: 6 },
    { siteId: "big-fig-wanaka", siteName: "Big Fig", slotIndex: 9, durationSlots: 2 },
    // Last admission 4.30pm.
    { siteId: "puzzling-world", siteName: "Puzzling World", slotIndex: 12, durationSlots: 4 },
    // May close in summer for fire risk.
    { siteId: "mount-iron-track", siteName: "Mount Iron Track", slotIndex: 17, durationSlots: 3 },
  ],
};

// Wānaka back to Queenstown through Cromwell and the Kawarau Gorge: 9:00 AM to 5:00 PM.
const WANAKA_TO_QUEENSTOWN_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "pembroke-patisserie", siteName: "Pembroke Pâtisserie", slotIndex: 2, durationSlots: 1 },
    { siteId: "national-transport-and-toy-museum", siteName: "National Transport and Toy Museum", slotIndex: 4, durationSlots: 4 },
    // A light lunch: Cromwell's heritage precinct cafes keep hours that vary.
    { siteId: "jones-family-fruit-stall", siteName: "Jones Family Fruit Stall", slotIndex: 10, durationSlots: 2 },
    // Closes 4.30pm in winter, so no later.
    { siteId: "kawarau-bridge-bungy", siteName: "Kawarau Bridge Bungy", slotIndex: 14, durationSlots: 2 },
    { siteId: "eriks-fish-and-chips", siteName: "Erik's Fish and Chips", slotIndex: 17, durationSlots: 1 },
  ],
};

// Christchurch inland to Tekapo: 9:00 AM (about an hour out of the city) to 3:30 PM.
const CHRISTCHURCH_TO_TEKAPO_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "rakaia-salmon-statue", siteName: "Rakaia Salmon Statue", slotIndex: 2, durationSlots: 1 },
    { siteId: "fairlie-bakehouse", siteName: "Fairlie Bakehouse", slotIndex: 7, durationSlots: 1 },
    // Open "mid morning into the evening" every day.
    { siteId: "tekapo-springs", siteName: "Tekapo Springs", slotIndex: 10, durationSlots: 5 },
  ],
};

// Tekapo to Mount Cook: 9:00 AM to 6:00 PM.
const TEKAPO_TO_MOUNT_COOK_DAY: ItineraryTemplateDay = {
  items: [
    // Grounds from 9am, before the tour buses.
    { siteId: "church-of-the-good-shepherd", siteName: "Church of the Good Shepherd", slotIndex: 2, durationSlots: 1 },
    // Brunch; the summit road is open 9am to 4pm.
    { siteId: "mt-john-summit-astro-cafe", siteName: "Mt John Summit and Astro Café", slotIndex: 4, durationSlots: 3 },
    { siteId: "peters-lookout", siteName: "Peters Lookout", slotIndex: 9, durationSlots: 1 },
    { siteId: "hooker-valley-track", siteName: "Hooker Valley Track", slotIndex: 12, durationSlots: 6 },
    { siteId: "tasman-glacier-view-blue-lakes", siteName: "Tasman Glacier View and Blue Lakes", slotIndex: 19, durationSlots: 1 },
  ],
};

// Mount Cook over the Lindis Pass to Wānaka: 9:00 AM to 7:00 PM.
const MOUNT_COOK_TO_WANAKA_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "kea-point-track", siteName: "Kea Point Track", slotIndex: 2, durationSlots: 3 },
    { siteId: "mt-cook-alpine-salmon-shop", siteName: "Mt Cook Alpine Salmon Shop", slotIndex: 7, durationSlots: 1 },
    { siteId: "clay-cliffs-omarama", siteName: "Clay Cliffs Omarama", slotIndex: 10, durationSlots: 2 },
    { siteId: "lindis-pass-summit-lookout", siteName: "Lindis Pass Summit Lookout", slotIndex: 14, durationSlots: 1 },
    { siteId: "that-wanaka-tree", siteName: "That Wānaka Tree", slotIndex: 18, durationSlots: 1 },
    { siteId: "red-star-burger-bar", siteName: "Red Star Burger Bar", slotIndex: 20, durationSlots: 2 },
  ],
};

// Wānaka over the Lindis Pass to Mount Cook: 9:00 AM to 5:30 PM.
const WANAKA_TO_MOUNT_COOK_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "pembroke-patisserie", siteName: "Pembroke Pâtisserie", slotIndex: 2, durationSlots: 1 },
    { siteId: "lindis-pass-summit-lookout", siteName: "Lindis Pass Summit Lookout", slotIndex: 6, durationSlots: 1 },
    { siteId: "mt-cook-alpine-salmon-shop", siteName: "Mt Cook Alpine Salmon Shop", slotIndex: 9, durationSlots: 1 },
    { siteId: "peters-lookout", siteName: "Peters Lookout", slotIndex: 11, durationSlots: 1 },
    { siteId: "tasman-glacier-view-blue-lakes", siteName: "Tasman Glacier View and Blue Lakes", slotIndex: 14, durationSlots: 1 },
    { siteId: "kea-point-track", siteName: "Kea Point Track", slotIndex: 16, durationSlots: 3 },
  ],
};

// Mount Cook to Tekapo: 9:00 AM to 6:00 PM.
const MOUNT_COOK_TO_TEKAPO_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "hooker-valley-track", siteName: "Hooker Valley Track", slotIndex: 2, durationSlots: 6 },
    // A late lunch; the summit road closes at 4pm.
    { siteId: "mt-john-summit-astro-cafe", siteName: "Mt John Summit and Astro Café", slotIndex: 11, durationSlots: 3 },
    { siteId: "tekapo-springs", siteName: "Tekapo Springs", slotIndex: 15, durationSlots: 5 },
  ],
};

// Tekapo through Geraldine to Christchurch: 9:00 AM to 5:30 PM. Not via Fairlie: the app
// counts Fairlie to Geraldine as two hours (two far-out places in different areas).
const TEKAPO_TO_CHRISTCHURCH_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "church-of-the-good-shepherd", siteName: "Church of the Good Shepherd", slotIndex: 2, durationSlots: 1 },
    { siteId: "barkers-foodstore-geraldine", siteName: "Barker's Foodstore & Eatery", slotIndex: 6, durationSlots: 2 },
    { siteId: "geraldine-cheese-company", siteName: "Geraldine Cheese Company", slotIndex: 9, durationSlots: 1 },
    { siteId: "rakaia-salmon-statue", siteName: "Rakaia Salmon Statue", slotIndex: 13, durationSlots: 1 },
    { siteId: "little-high-eatery", siteName: "Little High Eatery", slotIndex: 17, durationSlots: 2 },
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
  {
    key: "queenstown-and-fiordland-in-five-days",
    label: "Queenstown and Fiordland in Five Days",
    description:
      "Days one and two as in the three-day trip: the drive to Te Anau, the glowworm caves and Milford Sound. Day three on Doubtful Sound from Manapōuri. Day four up to Key Summit, then the bird sanctuary and Frasers Beach. Day five on the Kepler Track, then back to Queenstown for the gardens and dinner at The Cow.",
    free: true,
    days: [QUEENSTOWN_TO_TE_ANAU_DAY, MILFORD_SOUND_DAY, DOUBTFUL_SOUND_DAY, KEY_SUMMIT_DAY, TE_ANAU_TO_QUEENSTOWN_DAY],
  },
  {
    key: "queenstown-and-wanaka-in-four-days",
    label: "Queenstown and Wānaka in Four Days",
    description:
      "Day one in Queenstown. Day two: the Shotover Jet and Arrowtown, then over the Crown Range to Cardrona and Wānaka. Day three in Wānaka: Diamond Lake and Rocky Mountain, Puzzling World and Mount Iron. Day four: the toy museum, fruit at Cromwell and the Kawarau bungy bridge on the way back.",
    free: true,
    days: [QUEENSTOWN_TOWN_DAY, QUEENSTOWN_TO_WANAKA_DAY, WANAKA_DAY, WANAKA_TO_QUEENSTOWN_DAY],
  },
  {
    key: "christchurch-to-queenstown-via-tekapo-and-mount-cook",
    label: "Christchurch to Queenstown via Tekapo and Mount Cook",
    description:
      "Day one inland to Tekapo, with pies at Fairlie and the hot pools. Day two: the Church of the Good Shepherd and Mt John, then Mount Cook and the Hooker Valley. Day three: Kea Point, salmon at Lake Pukaki and over the Lindis Pass to Wānaka. Day four through Cromwell and the Kawarau Gorge to Queenstown.",
    free: true,
    days: [CHRISTCHURCH_TO_TEKAPO_DAY, TEKAPO_TO_MOUNT_COOK_DAY, MOUNT_COOK_TO_WANAKA_DAY, WANAKA_TO_QUEENSTOWN_DAY],
  },
  {
    key: "queenstown-to-christchurch-via-mount-cook-and-tekapo",
    label: "Queenstown to Christchurch via Mount Cook and Tekapo",
    description:
      "Day one over the Crown Range to Wānaka, with the Shotover Jet and Arrowtown on the way. Day two over the Lindis Pass to Mount Cook, with salmon at Lake Pukaki. Day three on the Hooker Valley Track, then Mt John and the hot pools at Tekapo. Day four past the Church of the Good Shepherd and through Geraldine to Christchurch.",
    free: true,
    days: [QUEENSTOWN_TO_WANAKA_DAY, WANAKA_TO_MOUNT_COOK_DAY, MOUNT_COOK_TO_TEKAPO_DAY, TEKAPO_TO_CHRISTCHURCH_DAY],
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
