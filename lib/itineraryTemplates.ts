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

// Christchurch inland to Tekapo: 9:30 AM (the drive out of the city, which the app counts
// when the day follows a night in Christchurch, as in the southern loop from Queenstown)
// to 4:00 PM.
const CHRISTCHURCH_TO_TEKAPO_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "rakaia-salmon-statue", siteName: "Rakaia Salmon Statue", slotIndex: 3, durationSlots: 1 },
    { siteId: "fairlie-bakehouse", siteName: "Fairlie Bakehouse", slotIndex: 8, durationSlots: 1 },
    // Open "mid morning into the evening" every day.
    { siteId: "tekapo-springs", siteName: "Tekapo Springs", slotIndex: 11, durationSlots: 5 },
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

// Off the ferry, Picton down the coast to Kaikōura: 9:00 AM to 6:30 PM.
const PICTON_TO_KAIKOURA_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "edwin-fox-maritime-museum", siteName: "Edwin Fox Maritime Museum", slotIndex: 2, durationSlots: 2 },
    { siteId: "snout-track-picton", siteName: "The Snout Track", slotIndex: 5, durationSlots: 3 },
    // Lunch in Picton: with the drive the app counts, The Store at Kekerengu would be a
    // 2pm lunch, and it closes at 4.
    { siteId: "toastie-lords-picton", siteName: "Toastie Lords", slotIndex: 9, durationSlots: 1 },
    { siteId: "ohau-point-seal-colony", siteName: "Ōhau Point Seal Colony", slotIndex: 15, durationSlots: 1 },
    { siteId: "kaikoura-lookout", siteName: "Kaikōura Lookout", slotIndex: 17, durationSlots: 1 },
    { siteId: "top-shop-kaikoura", siteName: "Top Shop Kaikōura", slotIndex: 20, durationSlots: 1 },
  ],
};

// Kaikōura: 10:00 AM to 5:00 PM. Encounter Kaikōura is left out: its dolphin and albatross
// trips run at set times that change with the season.
const KAIKOURA_DAY: ItineraryTemplateDay = {
  items: [
    // The 10.30am sailing (7.45am, 10.30am, 1.15pm, and 4pm November to March; owner,
    // 2026-10-22), checked in by 10.
    { siteId: "whale-watch-kaikoura", siteName: "Whale Watch Kaikōura", slotIndex: 4, durationSlots: 7 },
    // Closes 3pm Saturdays.
    { siteId: "kaikoura-seafood-bbq-kiosk", siteName: "Kaikōura Seafood BBQ Kiosk", slotIndex: 12, durationSlots: 1 },
    { siteId: "kaikoura-peninsula-walkway", siteName: "Kaikōura Peninsula Walkway and Seal Colony", slotIndex: 14, durationSlots: 4 },
  ],
};

// Kaikōura inland through Hanmer Springs to Christchurch: 10:00 AM to 5:30 PM.
const KAIKOURA_TO_CHRISTCHURCH_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "conical-hill-walk", siteName: "Conical Hill Walk", slotIndex: 4, durationSlots: 2 },
    { siteId: "pjs-pies", siteName: "PJ's Pies", slotIndex: 7, durationSlots: 1 },
    { siteId: "hanmer-springs-thermal-pools-and-spa", siteName: "Hanmer Springs Thermal Pools & Spa", slotIndex: 9, durationSlots: 4 },
    { siteId: "little-high-eatery", siteName: "Little High Eatery", slotIndex: 17, durationSlots: 2 },
  ],
};

// Te Anau along the south coast through Tuatapere and Riverton to Invercargill: 9:30 AM to
// 6:30 PM.
const TE_ANAU_TO_INVERCARGILL_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "clifden-suspension-bridge", siteName: "Clifden Suspension Bridge", slotIndex: 3, durationSlots: 1 },
    { siteId: "mccrackens-rest", siteName: "McCracken's Rest", slotIndex: 5, durationSlots: 1 },
    { siteId: "the-crib-cafe-riverton", siteName: "The Crib Cafe", slotIndex: 8, durationSlots: 2 },
    // Open 10am to 4pm.
    { siteId: "te-hikoi-museum-riverton", siteName: "Te Hikoi Museum", slotIndex: 11, durationSlots: 2 },
    // Closes 5pm.
    { siteId: "classic-motorcycle-mecca", siteName: "Classic Motorcycle Mecca", slotIndex: 15, durationSlots: 3 },
    { siteId: "balibu-invercargill", siteName: "Balibu", slotIndex: 19, durationSlots: 2 },
  ],
};

// Bluff, then the southern Catlins: 9:00 AM to 6:30 PM. Slope Point (closed for lambing
// September to November), Cathedral Caves (late October to April, by the tide) and Peakes
// Kitchen (closed over winter) are left out.
const BLUFF_AND_CATLINS_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "bluff-hill-lookout", siteName: "Bluff Hill Lookout (Motupōhue)", slotIndex: 2, durationSlots: 1 },
    { siteId: "stirling-point-bluff", siteName: "Stirling Point and Foveaux Walkway, Bluff", slotIndex: 4, durationSlots: 1 },
    // An early lunch: nothing in the southern Catlins is open for one every day.
    { siteId: "the-batch-cafe-invercargill", siteName: "The Batch Cafe", slotIndex: 6, durationSlots: 2 },
    { siteId: "waipapa-point-lighthouse", siteName: "Waipapa Point Lighthouse", slotIndex: 11, durationSlots: 1 },
    // The forest shows at low tide.
    { siteId: "curio-bay-petrified-forest", siteName: "Curio Bay Petrified Forest", slotIndex: 13, durationSlots: 2 },
    { siteId: "porpoise-bay", siteName: "Porpoise Bay", slotIndex: 16, durationSlots: 1 },
    { siteId: "mclean-falls", siteName: "McLean Falls", slotIndex: 19, durationSlots: 2 },
  ],
};

// The northern Catlins to Dunedin: 9:00 AM to 5:30 PM.
const CATLINS_TO_DUNEDIN_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "purakaunui-falls", siteName: "Purakaunui Falls", slotIndex: 2, durationSlots: 1 },
    { siteId: "nugget-point-lighthouse", siteName: "Nugget Point Lighthouse", slotIndex: 5, durationSlots: 2 },
    { siteId: "catlins-cafe-owaka", siteName: "Catlins Cafe", slotIndex: 8, durationSlots: 2 },
    // Tidal; the car park gate is reported locked from about 5pm.
    { siteId: "tunnel-beach-track", siteName: "Tunnel Beach Track", slotIndex: 14, durationSlots: 2 },
    { siteId: "st-clair-beach", siteName: "St Clair Beach", slotIndex: 17, durationSlots: 2 },
  ],
};

// Dunedin and the Otago Peninsula: 9:00 AM to 5:30 PM.
const DUNEDIN_AND_PENINSULA_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "baldwin-street", siteName: "Baldwin Street", slotIndex: 2, durationSlots: 1 },
    { siteId: "tuhura-otago-museum", siteName: "Tūhura Otago Museum", slotIndex: 4, durationSlots: 4 },
    { siteId: "vogel-st-kitchen", siteName: "Vogel St Kitchen", slotIndex: 9, durationSlots: 2 },
    // Open until 5pm.
    { siteId: "larnach-castle", siteName: "Larnach Castle", slotIndex: 12, durationSlots: 3 },
    { siteId: "sandfly-bay-track", siteName: "Sandfly Bay Track", slotIndex: 16, durationSlots: 3 },
  ],
};

// Christchurch over Arthur's Pass to Greymouth: 9:00 AM to 6:30 PM.
const CHRISTCHURCH_TO_GREYMOUTH_DAY: ItineraryTemplateDay = {
  items: [
    // Pies for the road: nothing in the pass is open for lunch every day.
    { siteId: "sheffield-pies", siteName: "Sheffield Pies", slotIndex: 2, durationSlots: 1 },
    { siteId: "kura-tawhiti-castle-hill", siteName: "Kura Tāwhiti Castle Hill", slotIndex: 5, durationSlots: 2 },
    { siteId: "arthurs-pass-national-park-visitor-centre", siteName: "Arthur's Pass National Park Visitor Centre", slotIndex: 9, durationSlots: 1 },
    { siteId: "devils-punchbowl-falls", siteName: "Devils Punchbowl Falls", slotIndex: 11, durationSlots: 2 },
    { siteId: "otira-viaduct-lookout", siteName: "Otira Viaduct Lookout", slotIndex: 14, durationSlots: 1 },
    // Dinner; the brewery tour is at 4pm, before the drive gets here.
    { siteId: "monteiths-brewery", siteName: "Monteith's Brewery", slotIndex: 18, durationSlots: 3 },
  ],
};

// Punakaiki, then down the coast to Hokitika: 9:00 AM to 6:00 PM.
const PUNAKAIKI_TO_HOKITIKA_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "pancake-rocks-and-blowholes-walk", siteName: "Pancake Rocks and Blowholes Walk", slotIndex: 2, durationSlots: 1 },
    { siteId: "pororari-river-track", siteName: "Pororari River Track", slotIndex: 4, durationSlots: 3 },
    { siteId: "truman-track", siteName: "Truman Track", slotIndex: 8, durationSlots: 1 },
    // Closes 3pm.
    { siteId: "dp1-cafe", siteName: "DP1 Cafe", slotIndex: 11, durationSlots: 2 },
    { siteId: "hokitika-beach-driftwood-sign", siteName: "Hokitika Beach and Driftwood Sign", slotIndex: 15, durationSlots: 1 },
    // Dinner only, 5 to 8pm. Closed Tuesday and Wednesday: kept anyway (owner, 2026-10-22).
    { siteId: "fat-pipi-pizza", siteName: "Fat Pipi Pizza", slotIndex: 18, durationSlots: 2 },
  ],
};

// Hokitika to Franz Josef: 9:00 AM to 6:00 PM.
const HOKITIKA_TO_FRANZ_JOSEF_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "hokitika-gorge", siteName: "Hokitika Gorge", slotIndex: 2, durationSlots: 3 },
    // Lunch at its café (9am to 3pm). Last entry 3.15pm in winter.
    { siteId: "west-coast-treetop-walk", siteName: "West Coast Treetop Walk", slotIndex: 7, durationSlots: 3 },
    // The centre is open 10am to 3pm.
    { siteId: "ross-goldfields-water-race-walk", siteName: "Ross Goldfields Heritage Centre and Water Race Walk", slotIndex: 11, durationSlots: 2 },
    { siteId: "glacier-hot-pools", siteName: "Glacier Hot Pools", slotIndex: 17, durationSlots: 3 },
  ],
};

// Franz Josef to Fox: 9:00 AM to 6:00 PM.
const FRANZ_JOSEF_TO_FOX_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "franz-josef-glacier-valley-walk", siteName: "Franz Josef Glacier Valley Walk", slotIndex: 2, durationSlots: 3 },
    { siteId: "west-coast-wildlife-centre", siteName: "West Coast Wildlife Centre", slotIndex: 6, durationSlots: 2 },
    { siteId: "snakebite-brewery", siteName: "SnakeBite Brewery", slotIndex: 9, durationSlots: 2 },
    { siteId: "okarito-trig-walk", siteName: "Ōkārito Trig Walk", slotIndex: 12, durationSlots: 3 },
    { siteId: "fox-glacier-south-side-walk", siteName: "Fox Glacier South Side Walk", slotIndex: 16, durationSlots: 4 },
  ],
};

// Fox down the coast to Haast: 8:30 AM to 7:00 PM.
const FOX_TO_HAAST_DAY: ItineraryTemplateDay = {
  items: [
    // Early, for the reflections on a still morning (owner chose 8.30, 2026-10-22).
    { siteId: "lake-matheson-walk", siteName: "Lake Matheson Walk", slotIndex: 1, durationSlots: 3 },
    { siteId: "matheson-cafe", siteName: "Matheson Cafe", slotIndex: 5, durationSlots: 1 },
    { siteId: "bruce-bay", siteName: "Bruce Bay", slotIndex: 8, durationSlots: 1 },
    { siteId: "monro-beach-track", siteName: "Monro Beach Track", slotIndex: 11, durationSlots: 3 },
    { siteId: "knights-point-lookout", siteName: "Knights Point Lookout", slotIndex: 15, durationSlots: 1 },
    { siteId: "ship-creek-tauparikaka-walks", siteName: "Ship Creek Tauparikākā Walks", slotIndex: 17, durationSlots: 2 },
    { siteId: "the-hard-antler-haast", siteName: "The Hard Antler", slotIndex: 20, durationSlots: 2 },
  ],
};

// Over the Haast Pass to Wānaka: 9:00 AM to 7:00 PM.
const HAAST_TO_WANAKA_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "roaring-billy-falls-walk", siteName: "Roaring Billy Falls Walk", slotIndex: 2, durationSlots: 2 },
    { siteId: "thunder-creek-and-fantail-falls", siteName: "Thunder Creek and Fantail Falls", slotIndex: 5, durationSlots: 1 },
    { siteId: "blue-pools-track", siteName: "Blue Pools Track", slotIndex: 7, durationSlots: 2 },
    // Closes 2 to 3pm depending on the season.
    { siteId: "makarora-country-cafe", siteName: "Makarora Country Café", slotIndex: 10, durationSlots: 2 },
    // Last admission 4.30pm.
    { siteId: "puzzling-world", siteName: "Puzzling World", slotIndex: 15, durationSlots: 4 },
    { siteId: "red-star-burger-bar", siteName: "Red Star Burger Bar", slotIndex: 20, durationSlots: 2 },
  ],
};

// Queenstown by the lake, for the southern loops: 9:00 AM to 6:30 PM. Between
// WANAKA_TO_QUEENSTOWN_DAY and QUEENSTOWN_TO_TE_ANAU_DAY, so none of their stops: no
// gondola, Fergburger, Kawarau bungy or Erik's.
const QUEENSTOWN_LAKE_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "queenstown-hill-time-walk", siteName: "Queenstown Hill Time Walk", slotIndex: 2, durationSlots: 5 },
    { siteId: "bespoke-kitchen", siteName: "Bespoke Kitchen", slotIndex: 8, durationSlots: 2 },
    { siteId: "queenstown-gardens", siteName: "Queenstown Gardens", slotIndex: 11, durationSlots: 2 },
    // The 3pm sailing (9am, 11am, 1pm and 3pm; RealNZ's booking page, 29 Oct 2026).
    { siteId: "tss-earnslaw-cruise", siteName: "TSS Earnslaw Cruise", slotIndex: 14, durationSlots: 3 },
    { siteId: "the-cow", siteName: "The Cow", slotIndex: 19, durationSlots: 2 },
  ],
};

// Dunedin up the coast through Ōamaru to Christchurch: 9:30 AM to 6:30 PM. The Moeraki
// Boulders aren't a place in the app yet.
const DUNEDIN_TO_CHRISTCHURCH_DAY: ItineraryTemplateDay = {
  items: [
    // The reserve is open 7.30am to 5.30pm.
    { siteId: "katiki-point-lighthouse", siteName: "Kātiki Point Lighthouse", slotIndex: 3, durationSlots: 2 },
    // Last entry 3.30pm.
    { siteId: "steampunk-hq", siteName: "Steampunk HQ", slotIndex: 7, durationSlots: 2 },
    { siteId: "scotts-brewing-co", siteName: "Scotts Brewing Co", slotIndex: 10, durationSlots: 2 },
    { siteId: "little-high-eatery", siteName: "Little High Eatery", slotIndex: 19, durationSlots: 2 },
  ],
};

// The southern loop's days in order, from Christchurch. The Queenstown start is the same
// days begun at QUEENSTOWN_LAKE_DAY.
const SOUTHERN_LOOP_DAYS: ItineraryTemplateDay[] = [
  CHRISTCHURCH_TO_TEKAPO_DAY,
  TEKAPO_TO_MOUNT_COOK_DAY,
  MOUNT_COOK_TO_WANAKA_DAY,
  WANAKA_TO_QUEENSTOWN_DAY,
  QUEENSTOWN_LAKE_DAY,
  QUEENSTOWN_TO_TE_ANAU_DAY,
  MILFORD_SOUND_DAY,
  TE_ANAU_TO_INVERCARGILL_DAY,
  BLUFF_AND_CATLINS_DAY,
  CATLINS_TO_DUNEDIN_DAY,
  DUNEDIN_AND_PENINSULA_DAY,
  DUNEDIN_TO_CHRISTCHURCH_DAY,
];
const SOUTHERN_LOOP_FROM_QUEENSTOWN = SOUTHERN_LOOP_DAYS.indexOf(QUEENSTOWN_LAKE_DAY);

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
  {
    key: "picton-to-christchurch-via-kaikoura",
    label: "Picton to Christchurch via Kaikōura",
    description:
      "Day one off the ferry: the Edwin Fox and the Snout Track in Picton, then down the coast past the seals to Kaikōura. Day two whale watching, crayfish for lunch and the peninsula walk. Day three inland to the hot pools at Hanmer Springs, then on to Christchurch.",
    free: true,
    days: [PICTON_TO_KAIKOURA_DAY, KAIKOURA_DAY, KAIKOURA_TO_CHRISTCHURCH_DAY],
  },
  {
    key: "southern-scenic-route-queenstown-to-dunedin",
    label: "Southern Scenic Route: Queenstown to Dunedin",
    description:
      "Days one and two in Fiordland: the glowworm caves and Milford Sound. Day three along the south coast through Tuatapere and Riverton to Invercargill. Day four out to Bluff, then the Catlins: Waipapa Point, Curio Bay and McLean Falls. Day five past Nugget Point to Dunedin's Tunnel Beach and St Clair. Day six in Dunedin and on the Otago Peninsula.",
    free: true,
    days: [
      QUEENSTOWN_TO_TE_ANAU_DAY,
      MILFORD_SOUND_DAY,
      TE_ANAU_TO_INVERCARGILL_DAY,
      BLUFF_AND_CATLINS_DAY,
      CATLINS_TO_DUNEDIN_DAY,
      DUNEDIN_AND_PENINSULA_DAY,
    ],
  },
  {
    key: "west-coast-christchurch-to-queenstown",
    label: "West Coast: Christchurch to Queenstown",
    description:
      "Day one over Arthur's Pass to Greymouth. Day two at Punakaiki's Pancake Rocks, then on to Hokitika. Day three: Hokitika Gorge and the treetop walk, then the hot pools at Franz Josef. Day four: the glacier valley, kiwi at the wildlife centre and Ōkārito, then Fox. Day five: Lake Matheson and down the coast to Haast. Day six over the Haast Pass to Wānaka. Day seven through Cromwell to Queenstown.",
    free: true,
    days: [
      CHRISTCHURCH_TO_GREYMOUTH_DAY,
      PUNAKAIKI_TO_HOKITIKA_DAY,
      HOKITIKA_TO_FRANZ_JOSEF_DAY,
      FRANZ_JOSEF_TO_FOX_DAY,
      FOX_TO_HAAST_DAY,
      HAAST_TO_WANAKA_DAY,
      WANAKA_TO_QUEENSTOWN_DAY,
    ],
  },
  {
    key: "southern-loop-from-christchurch",
    label: "The Southern Loop from Christchurch",
    description:
      "Twelve days round the south: Tekapo and Mount Cook, Wānaka and Queenstown, Milford Sound, the south coast and the Catlins, Dunedin, and home up the coast through Ōamaru.",
    free: true,
    days: SOUTHERN_LOOP_DAYS,
  },
  {
    key: "southern-loop-from-queenstown",
    label: "The Southern Loop from Queenstown",
    description:
      "Twelve days round the south: Queenstown and Milford Sound, the south coast and the Catlins, Dunedin, up the coast through Ōamaru to Christchurch, then Tekapo, Mount Cook and Wānaka back to Queenstown.",
    free: true,
    days: [...SOUTHERN_LOOP_DAYS.slice(SOUTHERN_LOOP_FROM_QUEENSTOWN), ...SOUTHERN_LOOP_DAYS.slice(0, SOUTHERN_LOOP_FROM_QUEENSTOWN)],
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
