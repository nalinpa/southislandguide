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

// The towns a suggested trip can start from: the picker's first step.
export const TRIP_STARTS = ["christchurch", "queenstown", "picton"] as const;
export type TripStart = (typeof TRIP_STARTS)[number];

export type ItineraryTemplate = {
  key: string;
  // Set by hand: the first stop's area doesn't say it (Christchurch to Queenstown starts at
  // Rakaia, in mid-canterbury).
  start: TripStart;
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
    // One loop of the city with the driver's commentary, in place of the Cardboard Cathedral
    // (owner, 2026-10-25). Little High is on the route.
    { siteId: "christchurch-tram", siteName: "Christchurch Tram", slotIndex: 13, durationSlots: 2 },
    // Closes 5pm (Wednesdays 9pm), so 4:00 to 5:00 PM.
    { siteId: "christchurch-art-gallery", siteName: "Christchurch Art Gallery", slotIndex: 16, durationSlots: 2 },
    { siteId: "avon-river-walk", siteName: "Avon River Walk", slotIndex: 19, durationSlots: 2 },
  ],
};

// The Port Hills and the coast by car: 10:00 AM (when the gondola opens) to 7:30 PM.
const HILLS_AND_COAST_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "christchurch-gondola", siteName: "Christchurch Gondola", slotIndex: 4, durationSlots: 4 },
    { siteId: "fire-and-slice", siteName: "Fire and Slice", slotIndex: 9, durationSlots: 2 },
    // Over the cliffs from Scarborough to Taylors Mistake and back, about an hour each way,
    // in place of Sumner Beach (owner, 2026-10-25).
    { siteId: "taylors-mistake-track", siteName: "Taylors Mistake Track", slotIndex: 12, durationSlots: 4 },
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
    // The short loop (1 to 4 hours by loop), back in town by 4pm.
    { siteId: "glenorchy-lagoon-walkway", siteName: "Glenorchy Lagoon Walkway", slotIndex: 12, durationSlots: 2 },
    // An easy hour on the waterfront back in town, in place of the Onsen (owner, 2026-10-25).
    // The path carries on into the gardens, day one's first stop.
    { siteId: "queenstown-bay-beach", siteName: "Queenstown Bay Beach", slotIndex: 16, durationSlots: 2 },
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

// Milford Sound and back from Te Anau: 8:00 AM to 7:00 PM. The day must end in Te Anau:
// its last stop is where the next day sets out from, and ending at Milford would put the
// drive back on the next morning.
const MILFORD_SOUND_DAY: ItineraryTemplateDay = {
  items: [
    // No food at Milford, so pies for the road.
    { siteId: "miles-better-pies", siteName: "Miles Better Pies", slotIndex: 0, durationSlots: 1 },
    { siteId: "mirror-lakes", siteName: "Mirror Lakes", slotIndex: 3, durationSlots: 1 },
    { siteId: "lake-gunn-nature-walk", siteName: "Lake Gunn Nature Walk", slotIndex: 5, durationSlots: 2 },
    // The 12.45pm sailing (hourly at :45 from 9.45am to 2.45pm, Cruise Milford's booking
    // page, 31 Oct 2026): check in at 12.30, back by 2.30.
    { siteId: "cruise-milford-small-boat-cruise", siteName: "Milford Sound Cruise with Cruise Milford", slotIndex: 9, durationSlots: 4 },
    // Dinner at 6pm (dinner from 4pm daily), in place of the Fiordland Cinema (owner,
    // 2026-10-24). The 1.5 hours left free after the cruise are slack for the slow road and
    // the Homer Tunnel lights (owner, 2026-10-22).
    { siteId: "redcliff-te-anau", siteName: "Redcliff Restaurant & Bar", slotIndex: 20, durationSlots: 2 },
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

// Wānaka: 9:00 AM to 4:00 PM. Roys Peak is left out (closed 1 Oct to 10 Nov for lambing).
// Mount Iron is the next morning's walk on the way out (WANAKA_TO_QUEENSTOWN_DAY), not here.
const WANAKA_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "diamond-lake-rocky-mountain-track", siteName: "Diamond Lake and Rocky Mountain Track", slotIndex: 2, durationSlots: 6 },
    { siteId: "big-fig-wanaka", siteName: "Big Fig", slotIndex: 9, durationSlots: 2 },
    // Kayak or paddleboard hire, in place of Puzzling World (owner, 2026-10-24). Closed May
    // to August; 10am to 4pm in April and September.
    { siteId: "paddle-wanaka", siteName: "Paddle Wānaka", slotIndex: 12, durationSlots: 4 },
  ],
};

// Wānaka back to Queenstown through Cromwell and the Kawarau Gorge: 9:00 AM to 5:00 PM.
const WANAKA_TO_QUEENSTOWN_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "pembroke-patisserie", siteName: "Pembroke Pâtisserie", slotIndex: 2, durationSlots: 1 },
    // The loop over the lake on the edge of town, in place of the toy museum (owner,
    // 2026-10-25). May close in summer for fire risk.
    { siteId: "mount-iron-track", siteName: "Mount Iron Track", slotIndex: 4, durationSlots: 3 },
    // A light lunch: Cromwell's heritage precinct cafes keep hours that vary.
    { siteId: "jones-family-fruit-stall", siteName: "Jones Family Fruit Stall", slotIndex: 10, durationSlots: 2 },
    // Closes 4.30pm in winter, so no later.
    { siteId: "kawarau-bridge-bungy", siteName: "Kawarau Bridge Bungy", slotIndex: 14, durationSlots: 2 },
    { siteId: "eriks-fish-and-chips", siteName: "Erik's Fish and Chips", slotIndex: 17, durationSlots: 1 },
  ],
};

// The Dark Sky Project's 9.30pm session (owner, 2026-10-25), the last thing on a night in
// Tekapo. The tour runs about two hours, but the planner pulls a day that ends past 10 PM
// back inside it, so it is shown as the half hour from 9.30; the place page gives its
// length.
const DARK_SKY_TOUR: ItineraryTemplateItem = {
  siteId: "dark-sky-project-summit-experience",
  siteName: "Dark Sky Project Summit Experience",
  slotIndex: 27,
  durationSlots: 1,
};

// Christchurch inland to Tekapo: 9:30 AM (the drive out of the city, which the app counts
// when the day follows a night in Christchurch, as in the southern loop from Queenstown)
// to 4:00 PM, and the stars at 9.30.
const CHRISTCHURCH_TO_TEKAPO_DAY: ItineraryTemplateDay = {
  items: [
    // The drive is the morning: the Rakaia Salmon Statue is out (owner, 2026-10-24), and a
    // Geraldine stop would show as two hours from Fairlie (see TEKAPO_TO_CHRISTCHURCH_DAY).
    { siteId: "fairlie-bakehouse", siteName: "Fairlie Bakehouse", slotIndex: 8, durationSlots: 1 },
    // Open "mid morning into the evening" every day.
    { siteId: "tekapo-springs", siteName: "Tekapo Springs", slotIndex: 11, durationSlots: 5 },
    DARK_SKY_TOUR,
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
    // Kea Point in the afternoon; the Hooker Valley is first thing the next morning
    // (MOUNT_COOK_TO_WANAKA_DAY), before the crowds (owner, 2026-10-25).
    { siteId: "kea-point-track", siteName: "Kea Point Track", slotIndex: 12, durationSlots: 3 },
    { siteId: "tasman-glacier-view-blue-lakes", siteName: "Tasman Glacier View and Blue Lakes", slotIndex: 19, durationSlots: 1 },
  ],
};

// Mount Cook over the Lindis Pass to Wānaka: 8:00 AM to 7:30 PM.
const MOUNT_COOK_TO_WANAKA_DAY: ItineraryTemplateDay = {
  items: [
    // As early as the planner's day starts (owner, 2026-10-25).
    { siteId: "hooker-valley-track", siteName: "Hooker Valley Track", slotIndex: 0, durationSlots: 6 },
    { siteId: "mt-cook-alpine-salmon-shop", siteName: "Mt Cook Alpine Salmon Shop", slotIndex: 8, durationSlots: 1 },
    { siteId: "clay-cliffs-omarama", siteName: "Clay Cliffs Omarama", slotIndex: 11, durationSlots: 2 },
    { siteId: "lindis-pass-summit-lookout", siteName: "Lindis Pass Summit Lookout", slotIndex: 15, durationSlots: 1 },
    { siteId: "that-wanaka-tree", siteName: "That Wānaka Tree", slotIndex: 19, durationSlots: 1 },
    { siteId: "red-star-burger-bar", siteName: "Red Star Burger Bar", slotIndex: 21, durationSlots: 2 },
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

// Mount Cook to Tekapo: 8:00 AM to 6:00 PM, and the stars at 9.30.
const MOUNT_COOK_TO_TEKAPO_DAY: ItineraryTemplateDay = {
  items: [
    // As early as the planner's day starts (owner, 2026-10-25).
    { siteId: "hooker-valley-track", siteName: "Hooker Valley Track", slotIndex: 0, durationSlots: 6 },
    // A late lunch; the summit road closes at 4pm.
    { siteId: "mt-john-summit-astro-cafe", siteName: "Mt John Summit and Astro Café", slotIndex: 11, durationSlots: 3 },
    { siteId: "tekapo-springs", siteName: "Tekapo Springs", slotIndex: 15, durationSlots: 5 },
    DARK_SKY_TOUR,
  ],
};

// Tekapo through Geraldine to Christchurch: 9:00 AM to 5:30 PM. Not via Fairlie: the app
// counts Fairlie to Geraldine as two hours (two far-out places in different areas).
const TEKAPO_TO_CHRISTCHURCH_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "church-of-the-good-shepherd", siteName: "Church of the Good Shepherd", slotIndex: 2, durationSlots: 1 },
    { siteId: "barkers-foodstore-geraldine", siteName: "Barker's Foodstore & Eatery", slotIndex: 6, durationSlots: 2 },
    { siteId: "geraldine-cheese-company", siteName: "Geraldine Cheese Company", slotIndex: 9, durationSlots: 1 },
    // Straight up State Highway 1 from Geraldine: the Rakaia Salmon Statue is out (owner,
    // 2026-10-24).
    { siteId: "little-high-eatery", siteName: "Little High Eatery", slotIndex: 17, durationSlots: 2 },
  ],
};

// Off the ferry, Picton down the coast to Kaikōura: 9:00 AM to 7:30 PM.
const PICTON_TO_KAIKOURA_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "edwin-fox-maritime-museum", siteName: "Edwin Fox Maritime Museum", slotIndex: 2, durationSlots: 2 },
    { siteId: "snout-track-picton", siteName: "The Snout Track", slotIndex: 5, durationSlots: 3 },
    // Lunch in Picton: with the drive the app counts, The Store at Kekerengu would be a
    // 2pm lunch, and it closes at 4.
    { siteId: "toastie-lords-picton", siteName: "Toastie Lords", slotIndex: 9, durationSlots: 1 },
    { siteId: "ohau-point-seal-colony", siteName: "Ōhau Point Seal Colony", slotIndex: 15, durationSlots: 1 },
    // Crayfish by the road just south of the seals (owner, 2026-10-24). Wednesdays it can
    // close at 2.30pm.
    { siteId: "nins-bin", siteName: "Nin's Bin", slotIndex: 17, durationSlots: 1 },
    { siteId: "kaikoura-lookout", siteName: "Kaikōura Lookout", slotIndex: 19, durationSlots: 1 },
    // Dinner, in place of Top Shop (owner, 2026-10-24).
    { siteId: "the-pier-hotel-kaikoura", siteName: "The Pier Hotel", slotIndex: 21, durationSlots: 2 },
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
    // Riverton Rocks, in place of Te Hikoi Museum (owner, 2026-10-24).
    { siteId: "howells-point-reserve", siteName: "Howells Point Reserve", slotIndex: 11, durationSlots: 2 },
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

// Christchurch over Arthur's Pass to Greymouth: 9:30 AM (the drive out of the city, which
// the app counts when the day follows a night in Christchurch, as in the loop from
// Queenstown) to 7:00 PM.
const CHRISTCHURCH_TO_GREYMOUTH_DAY: ItineraryTemplateDay = {
  items: [
    // Pies for the road: nothing in the pass is open for lunch every day.
    { siteId: "sheffield-pies", siteName: "Sheffield Pies", slotIndex: 3, durationSlots: 1 },
    { siteId: "kura-tawhiti-castle-hill", siteName: "Kura Tāwhiti Castle Hill", slotIndex: 6, durationSlots: 2 },
    { siteId: "arthurs-pass-national-park-visitor-centre", siteName: "Arthur's Pass National Park Visitor Centre", slotIndex: 10, durationSlots: 1 },
    { siteId: "devils-punchbowl-falls", siteName: "Devils Punchbowl Falls", slotIndex: 12, durationSlots: 2 },
    { siteId: "otira-viaduct-lookout", siteName: "Otira Viaduct Lookout", slotIndex: 15, durationSlots: 1 },
    // Dinner; the brewery tour is at 4pm, before the drive gets here.
    { siteId: "monteiths-brewery", siteName: "Monteith's Brewery", slotIndex: 19, durationSlots: 3 },
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

// Hokitika to Franz Josef: 9:00 AM to 7:00 PM.
const HOKITIKA_TO_FRANZ_JOSEF_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "hokitika-gorge", siteName: "Hokitika Gorge", slotIndex: 2, durationSlots: 3 },
    // Lunch at its café (9am to 3pm). Last entry 3.15pm in winter.
    { siteId: "west-coast-treetop-walk", siteName: "West Coast Treetop Walk", slotIndex: 7, durationSlots: 3 },
    // The heli from Whataroa, on the way down, in place of Ross (owner, 2026-10-24).
    { siteId: "glacier-country-scenic-flights", siteName: "Glacier Country Scenic Flights", slotIndex: 14, durationSlots: 3 },
    { siteId: "glacier-hot-pools", siteName: "Glacier Hot Pools", slotIndex: 19, durationSlots: 3 },
  ],
};

// Franz Josef to Fox: 9:00 AM to 6:00 PM.
const FRANZ_JOSEF_TO_FOX_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "franz-josef-glacier-valley-walk", siteName: "Franz Josef Glacier Valley Walk", slotIndex: 2, durationSlots: 3 },
    // Ten minutes up the road, in place of the West Coast Wildlife Centre (owner, 2026-10-24).
    { siteId: "lake-mapourika", siteName: "Lake Mapourika", slotIndex: 6, durationSlots: 1 },
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
    // Lake Hāwea and the tree on the way into Wānaka, in place of Puzzling World (owner,
    // 2026-10-24). Not The Neck: the app counts Makarora to it through Wānaka, two hours
    // for what is half an hour up the road.
    { siteId: "lake-hawea-esplanade-reserve", siteName: "Lake Hāwea Esplanade Reserve", slotIndex: 15, durationSlots: 2 },
    { siteId: "that-wanaka-tree", siteName: "That Wānaka Tree", slotIndex: 18, durationSlots: 1 },
    { siteId: "red-star-burger-bar", siteName: "Red Star Burger Bar", slotIndex: 20, durationSlots: 2 },
  ],
};

// Queenstown by the lake: 9:00 AM to 6:30 PM. It sits next to WANAKA_TO_QUEENSTOWN_DAY
// and QUEENSTOWN_TO_TE_ANAU_DAY in the 10-day trips, so none of their stops: no gondola,
// Fergburger, Kawarau bungy or Erik's. Nor the gardens: TE_ANAU_TO_QUEENSTOWN_DAY ends the
// same trips there.
const QUEENSTOWN_LAKE_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "queenstown-hill-time-walk", siteName: "Queenstown Hill Time Walk", slotIndex: 2, durationSlots: 5 },
    { siteId: "bespoke-kitchen", siteName: "Bespoke Kitchen", slotIndex: 8, durationSlots: 2 },
    // The beach and waterfront beside Steamer Wharf, where the Earnslaw leaves, in place of
    // the gardens (owner, 2026-10-25).
    { siteId: "queenstown-bay-beach", siteName: "Queenstown Bay Beach", slotIndex: 11, durationSlots: 2 },
    // The 3pm sailing (9am, 11am, 1pm and 3pm; RealNZ's booking page, 29 Oct 2026).
    { siteId: "tss-earnslaw-cruise", siteName: "TSS Earnslaw Cruise", slotIndex: 14, durationSlots: 3 },
    { siteId: "the-cow", siteName: "The Cow", slotIndex: 19, durationSlots: 2 },
  ],
};

// Dunedin up the coast through Ōamaru to Christchurch: 9:30 AM to 7:30 PM.
const DUNEDIN_TO_CHRISTCHURCH_DAY: ItineraryTemplateDay = {
  items: [
    // The reserve is open 7.30am to 5.30pm.
    { siteId: "katiki-point-lighthouse", siteName: "Kātiki Point Lighthouse", slotIndex: 3, durationSlots: 2 },
    // Just up the coast from Kātiki Point (owner, 2026-10-25). Best at low tide.
    { siteId: "moeraki-boulders", siteName: "Moeraki Boulders", slotIndex: 6, durationSlots: 2 },
    // Last entry 3.30pm.
    { siteId: "steampunk-hq", siteName: "Steampunk HQ", slotIndex: 9, durationSlots: 2 },
    { siteId: "scotts-brewing-co", siteName: "Scotts Brewing Co", slotIndex: 12, durationSlots: 2 },
    { siteId: "little-high-eatery", siteName: "Little High Eatery", slotIndex: 21, durationSlots: 2 },
  ],
};

// Off the ferry, Picton by the Sounds road to Nelson: 9:00 AM to 7:30 PM.
const PICTON_TO_NELSON_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "edwin-fox-maritime-museum", siteName: "Edwin Fox Maritime Museum", slotIndex: 2, durationSlots: 2 },
    // Toasties to take away: nothing on the Sounds road is open for lunch every day.
    { siteId: "toastie-lords-picton", siteName: "Toastie Lords", slotIndex: 5, durationSlots: 1 },
    { siteId: "queen-charlotte-drive-cullen-point", siteName: "Queen Charlotte Drive and Cullen Point Lookout", slotIndex: 8, durationSlots: 1 },
    // A picnic by the river.
    { siteId: "pelorus-bridge-scenic-reserve", siteName: "Pelorus Bridge Scenic Reserve", slotIndex: 10, durationSlots: 2 },
    { siteId: "centre-of-new-zealand-walk", siteName: "Centre of New Zealand Walk", slotIndex: 15, durationSlots: 2 },
    { siteId: "tahunanui-beach", siteName: "Tāhunanui Beach", slotIndex: 18, durationSlots: 2 },
    // Closed Mondays: kept anyway (owner, 2026-10-22).
    { siteId: "fishy-business-on-roto", siteName: "Fishy Business on Roto", slotIndex: 21, durationSlots: 2 },
  ],
};

// Abel Tasman: up the coast by water taxi, then the Coast Track back to Mārahau. 9:30 AM
// to 7:00 PM.
const ABEL_TASMAN_DAY: ItineraryTemplateDay = {
  items: [
    // Lunch to carry on the walk.
    { siteId: "toad-hall-motueka", siteName: "TOAD Hall", slotIndex: 3, durationSlots: 1 },
    // Best at low tide.
    { siteId: "split-apple-rock", siteName: "Split Apple Rock", slotIndex: 6, durationSlots: 1 },
    // The noon sailing north to Anchorage, the one that runs all year (summer 9, 10.30, 12
    // and 1.30; winter 9.30, 12 and 1.30; owner, 2026-10-22), then about 4 hours on foot
    // back to Mārahau.
    { siteId: "abel-tasman-aquataxi-coast-track-day-walk", siteName: "Abel Tasman AquaTaxi and Coast Track Day Walk", slotIndex: 8, durationSlots: 11 },
    // Closed Tuesdays and Wednesdays: kept anyway (owner, 2026-10-22).
    { siteId: "park-cafe-marahau", siteName: "Park Café Mārahau", slotIndex: 20, durationSlots: 2 },
  ],
};

// Golden Bay over Tākaka Hill: 9:00 AM to 6:00 PM.
const GOLDEN_BAY_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "hawkes-lookout", siteName: "Hawkes Lookout", slotIndex: 2, durationSlots: 1 },
    { siteId: "te-waikoropupu-springs", siteName: "Te Waikoropupū Springs", slotIndex: 5, durationSlots: 2 },
    { siteId: "the-wholemeal-cafe", siteName: "The Wholemeal Café", slotIndex: 8, durationSlots: 2 },
    { siteId: "labyrinth-rocks-park", siteName: "Labyrinth Rocks Park", slotIndex: 11, durationSlots: 1 },
    { siteId: "wainui-falls", siteName: "Wainui Falls", slotIndex: 13, durationSlots: 2 },
    { siteId: "the-mussel-inn", siteName: "The Mussel Inn", slotIndex: 18, durationSlots: 2 },
  ],
};

// Golden Bay back over Tākaka Hill (or from Mārahau, in the 21-day trips) and down the
// Buller Gorge to Westport: 9:00 AM to 6:00 PM.
const GOLDEN_BAY_TO_WESTPORT_DAY: ItineraryTemplateDay = {
  items: [
    // Brunch, and food for the road: nothing on the gorge road is open every day.
    { siteId: "toad-hall-motueka", siteName: "TOAD Hall", slotIndex: 2, durationSlots: 2 },
    { siteId: "kawatiri-historic-railway-walk", siteName: "Kawatiri Historic Railway Walk", slotIndex: 8, durationSlots: 1 },
    { siteId: "cape-foulwind-walkway-seal-colony", siteName: "Cape Foulwind Walkway and Seal Colony", slotIndex: 14, durationSlots: 3 },
    // Closed Tuesdays and Wednesdays: kept anyway (owner, 2026-10-22).
    { siteId: "star-tavern-cape-foulwind", siteName: "Star Tavern", slotIndex: 18, durationSlots: 2 },
  ],
};

// Christchurch to Kaikōura the inland way, through Hanmer Springs: 10:00 AM to 6:00 PM. In
// the whole-island loop it follows a night in Christchurch, so the first stop leaves room
// for the drive.
const CHRISTCHURCH_TO_KAIKOURA_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "conical-hill-walk", siteName: "Conical Hill Walk", slotIndex: 4, durationSlots: 2 },
    { siteId: "pjs-pies", siteName: "PJ's Pies", slotIndex: 7, durationSlots: 1 },
    { siteId: "hanmer-springs-thermal-pools-and-spa", siteName: "Hanmer Springs Thermal Pools & Spa", slotIndex: 9, durationSlots: 4 },
    { siteId: "kaikoura-lookout", siteName: "Kaikōura Lookout", slotIndex: 17, durationSlots: 1 },
    // Dinner, in place of Top Shop (owner, 2026-10-24).
    { siteId: "the-pier-hotel-kaikoura", siteName: "The Pier Hotel", slotIndex: 19, durationSlots: 2 },
  ],
};

// Kaikōura up the coast to Picton: 10:00 AM to 4:30 PM. Nothing in Picton is open for
// dinner, so the day ends on the Snout Track.
const KAIKOURA_TO_PICTON_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "ohau-point-seal-colony", siteName: "Ōhau Point Seal Colony", slotIndex: 4, durationSlots: 1 },
    { siteId: "the-store-kekerengu", siteName: "The Store, Kekerengu", slotIndex: 6, durationSlots: 2 },
    { siteId: "monkey-bay-walk-rarangi", siteName: "Monkey Bay Walk, Rārangi", slotIndex: 11, durationSlots: 2 },
    { siteId: "snout-track-picton", siteName: "The Snout Track", slotIndex: 14, durationSlots: 3 },
  ],
};

// Dunedin up the coast and inland up the Waitaki to Mount Cook: 9:30 AM to 6:00 PM.
// Ends on the short Blue Lakes walk rather than Kea Point. With the Moeraki Boulders in
// (owner, 2026-10-25) it starts at 5.30pm, which is dusk in midwinter.
const DUNEDIN_TO_MOUNT_COOK_DAY: ItineraryTemplateDay = {
  items: [
    // The reserve is open 7.30am to 5.30pm.
    { siteId: "katiki-point-lighthouse", siteName: "Kātiki Point Lighthouse", slotIndex: 3, durationSlots: 2 },
    // Just up the coast from Kātiki Point (owner, 2026-10-25). Best at low tide.
    { siteId: "moeraki-boulders", siteName: "Moeraki Boulders", slotIndex: 6, durationSlots: 2 },
    // Lunch before the drive inland.
    { siteId: "scotts-brewing-co", siteName: "Scotts Brewing Co", slotIndex: 9, durationSlots: 2 },
    // Daylight hours.
    { siteId: "elephant-rocks-anatini", siteName: "Elephant Rocks and Anatini Whale Fossil", slotIndex: 13, durationSlots: 2 },
    { siteId: "tasman-glacier-view-blue-lakes", siteName: "Tasman Glacier View and Blue Lakes", slotIndex: 19, durationSlots: 1 },
  ],
};

// Wānaka over the Haast Pass to Haast: 9:30 AM to 7:30 PM.
const WANAKA_TO_HAAST_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "lake-hawea-esplanade-reserve", siteName: "Lake Hāwea Esplanade Reserve", slotIndex: 3, durationSlots: 1 },
    { siteId: "the-neck-lookout", siteName: "The Neck Lookout", slotIndex: 5, durationSlots: 1 },
    // Closes 2 to 3pm depending on the season.
    { siteId: "makarora-country-cafe", siteName: "Makarora Country Café", slotIndex: 10, durationSlots: 2 },
    { siteId: "blue-pools-track", siteName: "Blue Pools Track", slotIndex: 13, durationSlots: 2 },
    { siteId: "thunder-creek-and-fantail-falls", siteName: "Thunder Creek and Fantail Falls", slotIndex: 16, durationSlots: 1 },
    { siteId: "roaring-billy-falls-walk", siteName: "Roaring Billy Falls Walk", slotIndex: 18, durationSlots: 2 },
    { siteId: "the-hard-antler-haast", siteName: "The Hard Antler", slotIndex: 21, durationSlots: 2 },
  ],
};

// Haast up the coast to Fox: 9:00 AM to 4:30 PM. Monro Beach is left out so lunch at Lake
// Matheson is before its lunch menu stops at 2.30.
const HAAST_TO_FOX_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "ship-creek-tauparikaka-walks", siteName: "Ship Creek Tauparikākā Walks", slotIndex: 2, durationSlots: 2 },
    { siteId: "knights-point-lookout", siteName: "Knights Point Lookout", slotIndex: 5, durationSlots: 1 },
    { siteId: "bruce-bay", siteName: "Bruce Bay", slotIndex: 8, durationSlots: 1 },
    { siteId: "matheson-cafe", siteName: "Matheson Cafe", slotIndex: 11, durationSlots: 2 },
    { siteId: "lake-matheson-walk", siteName: "Lake Matheson Walk", slotIndex: 14, durationSlots: 3 },
  ],
};

// Fox to Franz Josef: 9:00 AM to 7:30 PM.
const FOX_TO_FRANZ_JOSEF_DAY: ItineraryTemplateDay = {
  items: [
    // A scenic flight first thing, before leaving Fox, in place of the West Coast Wildlife
    // Centre (owner, 2026-10-24).
    { siteId: "mountain-helicopters-scenic-flights", siteName: "Mountain Helicopters Scenic Flights", slotIndex: 2, durationSlots: 2 },
    { siteId: "fox-glacier-south-side-walk", siteName: "Fox Glacier South Side Walk", slotIndex: 5, durationSlots: 4 },
    { siteId: "cafe-neve", siteName: "Cafe Nevé", slotIndex: 10, durationSlots: 2 },
    { siteId: "franz-josef-glacier-valley-walk", siteName: "Franz Josef Glacier Valley Walk", slotIndex: 13, durationSlots: 3 },
    { siteId: "glacier-hot-pools", siteName: "Glacier Hot Pools", slotIndex: 17, durationSlots: 3 },
    { siteId: "snakebite-brewery", siteName: "SnakeBite Brewery", slotIndex: 21, durationSlots: 2 },
  ],
};

// Franz Josef up the coast to Hokitika: 8:30 AM to 7:30 PM.
const FRANZ_JOSEF_TO_HOKITIKA_DAY: ItineraryTemplateDay = {
  items: [
    // Half an hour earlier than before, to fit the kayaks in before the drive north.
    { siteId: "okarito-trig-walk", siteName: "Ōkārito Trig Walk", slotIndex: 1, durationSlots: 3 },
    // Two hours on the lagoon from the same car park, in place of Ross (owner, 2026-10-24).
    { siteId: "okarito-kayaks", siteName: "Ōkārito Kayaks", slotIndex: 5, durationSlots: 4 },
    // A late lunch at its café (9am to 3pm). Last entry 3.15pm in winter.
    { siteId: "west-coast-treetop-walk", siteName: "West Coast Treetop Walk", slotIndex: 13, durationSlots: 3 },
    { siteId: "hokitika-gorge", siteName: "Hokitika Gorge", slotIndex: 18, durationSlots: 2 },
    // Dinner only, 5 to 8pm. Closed Tuesday and Wednesday: kept anyway (owner, 2026-10-22).
    { siteId: "fat-pipi-pizza", siteName: "Fat Pipi Pizza", slotIndex: 21, durationSlots: 2 },
  ],
};

// Hokitika up the coast through Punakaiki to Westport: 9:00 AM to 8:00 PM.
const HOKITIKA_TO_WESTPORT_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "hokitika-beach-driftwood-sign", siteName: "Hokitika Beach and Driftwood Sign", slotIndex: 2, durationSlots: 1 },
    // An early lunch; it closes at 3pm.
    { siteId: "dp1-cafe", siteName: "DP1 Cafe", slotIndex: 5, durationSlots: 2 },
    { siteId: "pancake-rocks-and-blowholes-walk", siteName: "Pancake Rocks and Blowholes Walk", slotIndex: 9, durationSlots: 1 },
    { siteId: "pororari-river-track", siteName: "Pororari River Track", slotIndex: 11, durationSlots: 3 },
    { siteId: "truman-track", siteName: "Truman Track", slotIndex: 15, durationSlots: 1 },
    { siteId: "cape-foulwind-walkway-seal-colony", siteName: "Cape Foulwind Walkway and Seal Colony", slotIndex: 18, durationSlots: 3 },
    // Closed Tuesdays and Wednesdays: kept anyway (owner, 2026-10-22).
    { siteId: "star-tavern-cape-foulwind", siteName: "Star Tavern", slotIndex: 22, durationSlots: 2 },
  ],
};

// Westport up the Buller Gorge to Kaiteriteri: 9:00 AM to 7:00 PM.
const WESTPORT_TO_KAITERITERI_DAY: ItineraryTemplateDay = {
  items: [
    // A picnic lunch for the gorge road, where nothing is open every day. Closed Sundays:
    // kept anyway (owner, 2026-10-22).
    { siteId: "euro-food-store-westport", siteName: "Euro Food Store", slotIndex: 2, durationSlots: 1 },
    { siteId: "kawatiri-historic-railway-walk", siteName: "Kawatiri Historic Railway Walk", slotIndex: 8, durationSlots: 1 },
    // Best around high tide.
    { siteId: "motueka-saltwater-baths", siteName: "Motueka Saltwater Baths", slotIndex: 13, durationSlots: 2 },
    { siteId: "kaiteriteri-beach", siteName: "Kaiteriteri Beach", slotIndex: 16, durationSlots: 2 },
    // Closed Tuesdays and Wednesdays; dinner here two nights running is fine (owner,
    // 2026-10-22).
    { siteId: "park-cafe-marahau", siteName: "Park Café Mārahau", slotIndex: 20, durationSlots: 2 },
  ],
};

// Golden Bay over Tākaka Hill to Nelson, then the Sounds road to Picton: 9:00 AM to 6:30 PM.
const GOLDEN_BAY_TO_PICTON_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "the-grove-scenic-reserve", siteName: "The Grove Scenic Reserve", slotIndex: 2, durationSlots: 2 },
    { siteId: "toad-hall-motueka", siteName: "TOAD Hall", slotIndex: 6, durationSlots: 2 },
    // Open 10am to 4.30pm.
    { siteId: "founders-heritage-park", siteName: "Founders Heritage Park", slotIndex: 11, durationSlots: 3 },
    { siteId: "pelorus-bridge-scenic-reserve", siteName: "Pelorus Bridge Scenic Reserve", slotIndex: 17, durationSlots: 2 },
    { siteId: "queen-charlotte-drive-cullen-point", siteName: "Queen Charlotte Drive and Cullen Point Lookout", slotIndex: 20, durationSlots: 1 },
  ],
};

// Te Anau straight to the southern Catlins, not by Invercargill and Bluff (owner,
// 2026-10-25): 8:00 AM to 4:30 PM, overnight in the Catlins. With CATLINS_TO_DUNEDIN_DAY it
// is the quick way from Fiordland to Dunedin that still sees the Catlins. Slope Point is
// left out (closed for lambing September to November).
const TE_ANAU_TO_CATLINS_DAY: ItineraryTemplateDay = {
  items: [
    // Pies for the road: nothing in the southern Catlins is open for lunch every day.
    { siteId: "miles-better-pies", siteName: "Miles Better Pies", slotIndex: 0, durationSlots: 1 },
    { siteId: "waipapa-point-lighthouse", siteName: "Waipapa Point Lighthouse", slotIndex: 7, durationSlots: 1 },
    // The forest shows at low tide.
    { siteId: "curio-bay-petrified-forest", siteName: "Curio Bay Petrified Forest", slotIndex: 9, durationSlots: 2 },
    // Hector's dolphins, most often in summer.
    { siteId: "porpoise-bay", siteName: "Porpoise Bay", slotIndex: 12, durationSlots: 1 },
    { siteId: "mclean-falls", siteName: "McLean Falls", slotIndex: 15, durationSlots: 2 },
  ],
};

// Punakaiki down to Greymouth: 9:30 AM (room for the drive from Hokitika or Westport) to
// 6:00 PM. Shantytown is left out: its hours don't say when it closes.
const PUNAKAIKI_TO_GREYMOUTH_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "pancake-rocks-and-blowholes-walk", siteName: "Pancake Rocks and Blowholes Walk", slotIndex: 3, durationSlots: 1 },
    { siteId: "pororari-river-track", siteName: "Pororari River Track", slotIndex: 5, durationSlots: 3 },
    { siteId: "truman-track", siteName: "Truman Track", slotIndex: 9, durationSlots: 1 },
    // A late lunch; it closes at 3pm.
    { siteId: "dp1-cafe", siteName: "DP1 Cafe", slotIndex: 12, durationSlots: 2 },
    // The 4pm brewery tour (daily), then dinner.
    { siteId: "monteiths-brewery", siteName: "Monteith's Brewery", slotIndex: 16, durationSlots: 4 },
  ],
};

// Greymouth over Arthur's Pass to Christchurch: 9:30 AM to 6:00 PM.
const GREYMOUTH_TO_CHRISTCHURCH_DAY: ItineraryTemplateDay = {
  items: [
    { siteId: "otira-viaduct-lookout", siteName: "Otira Viaduct Lookout", slotIndex: 3, durationSlots: 1 },
    { siteId: "devils-punchbowl-falls", siteName: "Devils Punchbowl Falls", slotIndex: 5, durationSlots: 2 },
    { siteId: "kura-tawhiti-castle-hill", siteName: "Kura Tāwhiti Castle Hill", slotIndex: 9, durationSlots: 2 },
    // A late lunch: nothing in the pass is open for one every day. Closes 4pm.
    { siteId: "sheffield-pies", siteName: "Sheffield Pies", slotIndex: 12, durationSlots: 1 },
    { siteId: "little-high-eatery", siteName: "Little High Eatery", slotIndex: 18, durationSlots: 2 },
  ],
};

// The whole island in 21 days, clockwise from Christchurch. The Picton and Queenstown
// starts are the same days begun at PICTON_TO_NELSON_DAY and QUEENSTOWN_LAKE_DAY. Golden
// Bay is left out to make 21 (owner, 2026-10-23), so the gorge day runs from Mārahau and
// TOAD Hall comes two mornings running. The Queenstown lake day came back on 2026-10-25,
// when Fiordland to Dunedin went straight to the Catlins instead of by Invercargill and
// Bluff (owner: the lake day first, the Catlins over Golden Bay).
const WHOLE_ISLAND_DAYS: ItineraryTemplateDay[] = [
  CHRISTCHURCH_TO_KAIKOURA_DAY,
  KAIKOURA_DAY,
  KAIKOURA_TO_PICTON_DAY,
  PICTON_TO_NELSON_DAY,
  ABEL_TASMAN_DAY,
  GOLDEN_BAY_TO_WESTPORT_DAY,
  PUNAKAIKI_TO_HOKITIKA_DAY,
  HOKITIKA_TO_FRANZ_JOSEF_DAY,
  FRANZ_JOSEF_TO_FOX_DAY,
  FOX_TO_HAAST_DAY,
  HAAST_TO_WANAKA_DAY,
  WANAKA_TO_QUEENSTOWN_DAY,
  QUEENSTOWN_LAKE_DAY,
  QUEENSTOWN_TO_TE_ANAU_DAY,
  MILFORD_SOUND_DAY,
  TE_ANAU_TO_CATLINS_DAY,
  CATLINS_TO_DUNEDIN_DAY,
  DUNEDIN_AND_PENINSULA_DAY,
  DUNEDIN_TO_MOUNT_COOK_DAY,
  MOUNT_COOK_TO_TEKAPO_DAY,
  TEKAPO_TO_CHRISTCHURCH_DAY,
];

// The West Coast and the south in 14 days, clockwise from Christchurch: the whole island
// without the top of the south (the Picton trips cover that). The Queenstown start is the
// same days begun at QUEENSTOWN_TO_TE_ANAU_DAY.
const WEST_AND_SOUTH_LOOP_DAYS: ItineraryTemplateDay[] = [
  CHRISTCHURCH_TO_GREYMOUTH_DAY,
  PUNAKAIKI_TO_HOKITIKA_DAY,
  HOKITIKA_TO_FRANZ_JOSEF_DAY,
  FRANZ_JOSEF_TO_FOX_DAY,
  FOX_TO_HAAST_DAY,
  HAAST_TO_WANAKA_DAY,
  WANAKA_TO_QUEENSTOWN_DAY,
  QUEENSTOWN_TO_TE_ANAU_DAY,
  MILFORD_SOUND_DAY,
  TE_ANAU_TO_CATLINS_DAY,
  CATLINS_TO_DUNEDIN_DAY,
  DUNEDIN_TO_MOUNT_COOK_DAY,
  MOUNT_COOK_TO_TEKAPO_DAY,
  TEKAPO_TO_CHRISTCHURCH_DAY,
];

// A loop's days begun at `start` and wrapped round to the day before it.
function loopFrom(days: ItineraryTemplateDay[], start: ItineraryTemplateDay): ItineraryTemplateDay[] {
  const i = days.indexOf(start);
  return [...days.slice(i), ...days.slice(0, i)];
}

// The southern loop in 10 days, from Christchurch (trimmed from 12 without the Dunedin day;
// owner, 2026-10-23). The Queenstown lake day is back in place of Invercargill and Bluff
// (owner, 2026-10-25). The Queenstown start is the same days begun at QUEENSTOWN_LAKE_DAY.
const SOUTHERN_LOOP_DAYS: ItineraryTemplateDay[] = [
  CHRISTCHURCH_TO_TEKAPO_DAY,
  TEKAPO_TO_MOUNT_COOK_DAY,
  MOUNT_COOK_TO_WANAKA_DAY,
  WANAKA_TO_QUEENSTOWN_DAY,
  QUEENSTOWN_LAKE_DAY,
  QUEENSTOWN_TO_TE_ANAU_DAY,
  MILFORD_SOUND_DAY,
  TE_ANAU_TO_CATLINS_DAY,
  CATLINS_TO_DUNEDIN_DAY,
  DUNEDIN_TO_CHRISTCHURCH_DAY,
];

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
    start: "christchurch",
    label: "Christchurch in a Day",
    description:
      "The central city on foot: the Botanic Gardens, a punt on the Avon, lunch at Little High, a ride on the tram, the Art Gallery and an evening walk by the river.",
    free: true,
    days: [CENTRAL_CITY_DAY],
  },
  {
    key: "two-days-in-christchurch",
    start: "christchurch",
    label: "Two Days in Christchurch",
    description:
      "Day one in the central city on foot. Day two by car: the gondola, pizza at Sumner and the clifftop walk to Taylors Mistake, then fish and chips and the hot pools at New Brighton.",
    free: true,
    days: [CENTRAL_CITY_DAY, HILLS_AND_COAST_DAY],
  },
  {
    key: "queenstown-in-two-days",
    start: "queenstown",
    label: "Queenstown in Two Days",
    description:
      "Day one in town: the gardens, an early Fergburger, a cruise on the Earnslaw, then the gondola and luge. Day two: the Shotover Jet and the Kawarau bungy bridge, then lunch, gold panning and the Chinese settlement in Arrowtown.",
    free: true,
    days: [QUEENSTOWN_TOWN_DAY, SHOTOVER_AND_ARROWTOWN_DAY],
  },
  {
    key: "queenstown-in-three-days",
    start: "queenstown",
    label: "Queenstown in Three Days",
    description:
      "Day one in town and day two in Arrowtown, as in the two-day trip. Day three up the lake: Bob's Cove, the Glenorchy wharf, lunch at Mrs Woolly's and the lagoon walk, then the waterfront and fish and chips back in town.",
    free: true,
    days: [QUEENSTOWN_TOWN_DAY, SHOTOVER_AND_ARROWTOWN_DAY, GLENORCHY_DAY],
  },
  {
    key: "queenstown-and-fiordland-in-three-days",
    start: "queenstown",
    label: "Queenstown and Fiordland in Three Days",
    description:
      "Day one: the gondola and Fergburger, then the drive to Te Anau and the glowworm caves. Day two: Milford Sound by road, with Mirror Lakes and Lake Gunn on the way, a cruise and dinner at Redcliff back in Te Anau. Day three: the Kepler Track to Brod Bay, then back to Queenstown for the gardens and dinner at The Cow.",
    free: true,
    days: [QUEENSTOWN_TO_TE_ANAU_DAY, MILFORD_SOUND_DAY, TE_ANAU_TO_QUEENSTOWN_DAY],
  },
  {
    key: "queenstown-and-fiordland-in-five-days",
    start: "queenstown",
    label: "Queenstown and Fiordland in Five Days",
    description:
      "Days one and two as in the three-day trip: the drive to Te Anau, the glowworm caves and Milford Sound. Day three on Doubtful Sound from Manapōuri. Day four up to Key Summit, then the bird sanctuary and Frasers Beach. Day five on the Kepler Track, then back to Queenstown for the gardens and dinner at The Cow.",
    free: true,
    days: [QUEENSTOWN_TO_TE_ANAU_DAY, MILFORD_SOUND_DAY, DOUBTFUL_SOUND_DAY, KEY_SUMMIT_DAY, TE_ANAU_TO_QUEENSTOWN_DAY],
  },
  {
    key: "queenstown-and-wanaka-in-four-days",
    start: "queenstown",
    label: "Queenstown and Wānaka in Four Days",
    description:
      "Day one in Queenstown. Day two: the Shotover Jet and Arrowtown, then over the Crown Range to Cardrona and Wānaka. Day three in Wānaka: Diamond Lake and Rocky Mountain, and a paddle on the lake. Day four: Mount Iron, fruit at Cromwell and the Kawarau bungy bridge on the way back.",
    free: true,
    days: [QUEENSTOWN_TOWN_DAY, QUEENSTOWN_TO_WANAKA_DAY, WANAKA_DAY, WANAKA_TO_QUEENSTOWN_DAY],
  },
  {
    key: "christchurch-to-queenstown-via-tekapo-and-mount-cook",
    start: "christchurch",
    label: "Christchurch to Queenstown via Tekapo and Mount Cook",
    description:
      "Day one inland to Tekapo, with pies at Fairlie, the hot pools and stargazing on Mt John. Day two: the Church of the Good Shepherd and Mt John, then Mount Cook and Kea Point. Day three: the Hooker Valley first thing, salmon at Lake Pukaki and over the Lindis Pass to Wānaka. Day four through Cromwell and the Kawarau Gorge to Queenstown.",
    free: true,
    days: [CHRISTCHURCH_TO_TEKAPO_DAY, TEKAPO_TO_MOUNT_COOK_DAY, MOUNT_COOK_TO_WANAKA_DAY, WANAKA_TO_QUEENSTOWN_DAY],
  },
  {
    key: "queenstown-to-christchurch-via-mount-cook-and-tekapo",
    start: "queenstown",
    label: "Queenstown to Christchurch via Mount Cook and Tekapo",
    description:
      "Day one over the Crown Range to Wānaka, with the Shotover Jet and Arrowtown on the way. Day two over the Lindis Pass to Mount Cook, with salmon at Lake Pukaki. Day three on the Hooker Valley Track first thing, then Mt John, the hot pools and stargazing at Tekapo. Day four past the Church of the Good Shepherd and through Geraldine to Christchurch.",
    free: true,
    days: [QUEENSTOWN_TO_WANAKA_DAY, WANAKA_TO_MOUNT_COOK_DAY, MOUNT_COOK_TO_TEKAPO_DAY, TEKAPO_TO_CHRISTCHURCH_DAY],
  },
  {
    key: "picton-to-christchurch-via-kaikoura",
    start: "picton",
    label: "Picton to Christchurch via Kaikōura",
    description:
      "Day one off the ferry: the Edwin Fox and the Snout Track in Picton, then down the coast past the seals, with crayfish at Nin's Bin, to dinner at the Pier Hotel. Day two whale watching, crayfish for lunch and the peninsula walk. Day three inland to the hot pools at Hanmer Springs, then on to Christchurch.",
    free: true,
    days: [PICTON_TO_KAIKOURA_DAY, KAIKOURA_DAY, KAIKOURA_TO_CHRISTCHURCH_DAY],
  },
  {
    key: "southern-scenic-route-queenstown-to-dunedin",
    start: "queenstown",
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
  // The headline trips, named for what people search: "South Island itinerary 7, 10, 14,
  // 21 days" (owner, 2026-10-23). On screen they're trips, never itineraries.
  {
    key: "south-island-in-7-days-from-christchurch",
    start: "christchurch",
    label: "South Island in 7 Days",
    description:
      "Christchurch to Queenstown by the West Coast. Day one over Arthur's Pass to Greymouth. Day two at Punakaiki's Pancake Rocks, then on to Hokitika. Day three: Hokitika Gorge and the treetop walk, a scenic flight from Whataroa, then the hot pools at Franz Josef. Day four: the glacier valley and Ōkārito, then Fox. Day five: Lake Matheson and down the coast to Haast. Day six over the Haast Pass to Wānaka. Day seven through Cromwell to Queenstown.",
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
    key: "south-island-in-7-days-from-queenstown",
    start: "queenstown",
    label: "South Island in 7 Days",
    description:
      "Queenstown to Christchurch by the West Coast: over the Crown Range to Wānaka, the Haast Pass, Fox and Franz Josef, Hokitika, Punakaiki's Pancake Rocks and a brewery tour in Greymouth, then over Arthur's Pass to Christchurch.",
    free: true,
    days: [
      QUEENSTOWN_TO_WANAKA_DAY,
      WANAKA_TO_HAAST_DAY,
      HAAST_TO_FOX_DAY,
      FOX_TO_FRANZ_JOSEF_DAY,
      FRANZ_JOSEF_TO_HOKITIKA_DAY,
      PUNAKAIKI_TO_GREYMOUTH_DAY,
      GREYMOUTH_TO_CHRISTCHURCH_DAY,
    ],
  },
  {
    key: "south-island-in-7-days-from-picton",
    start: "picton",
    label: "South Island in 7 Days",
    description:
      "From the ferry to Christchurch by the West Coast: Nelson, Abel Tasman and Golden Bay, the Buller Gorge, Punakaiki's Pancake Rocks and a brewery tour in Greymouth, over Arthur's Pass, and a day on Christchurch's Port Hills and coast.",
    free: true,
    days: [
      PICTON_TO_NELSON_DAY,
      ABEL_TASMAN_DAY,
      GOLDEN_BAY_DAY,
      GOLDEN_BAY_TO_WESTPORT_DAY,
      PUNAKAIKI_TO_GREYMOUTH_DAY,
      GREYMOUTH_TO_CHRISTCHURCH_DAY,
      HILLS_AND_COAST_DAY,
    ],
  },
  {
    key: "south-island-in-14-days-from-christchurch",
    start: "christchurch",
    label: "South Island in 14 Days",
    description:
      "Fourteen days round the West Coast and the south: Arthur's Pass, Punakaiki and the glaciers, the Haast Pass to Wānaka and Queenstown, Milford Sound, the Catlins, Dunedin, the Waitaki and Mount Cook, and back through Tekapo.",
    free: true,
    days: WEST_AND_SOUTH_LOOP_DAYS,
  },
  {
    key: "south-island-in-14-days-from-queenstown",
    start: "queenstown",
    label: "South Island in 14 Days",
    description:
      "Fourteen days round the south and the West Coast: Milford Sound, the Catlins, Dunedin, the Waitaki and Mount Cook, Tekapo and Christchurch, then over Arthur's Pass to Punakaiki and the glaciers, and the Haast Pass to Wānaka and back to Queenstown.",
    free: true,
    days: loopFrom(WEST_AND_SOUTH_LOOP_DAYS, QUEENSTOWN_TO_TE_ANAU_DAY),
  },
  {
    key: "south-island-in-10-days-from-christchurch",
    start: "christchurch",
    label: "South Island in 10 Days",
    description:
      "Christchurch to Queenstown the inland way, then Fiordland: Tekapo and Mount Cook, the Lindis Pass to Wānaka, a day in Queenstown, Milford Sound, Doubtful Sound and Key Summit, and back to Queenstown.",
    free: true,
    days: [
      CHRISTCHURCH_TO_TEKAPO_DAY,
      TEKAPO_TO_MOUNT_COOK_DAY,
      MOUNT_COOK_TO_WANAKA_DAY,
      WANAKA_TO_QUEENSTOWN_DAY,
      QUEENSTOWN_LAKE_DAY,
      QUEENSTOWN_TO_TE_ANAU_DAY,
      MILFORD_SOUND_DAY,
      DOUBTFUL_SOUND_DAY,
      KEY_SUMMIT_DAY,
      TE_ANAU_TO_QUEENSTOWN_DAY,
    ],
  },
  {
    key: "south-island-in-10-days-from-queenstown",
    start: "queenstown",
    label: "South Island in 10 Days",
    description:
      "Queenstown and Fiordland, then the inland way to Christchurch: a day in Queenstown, Milford Sound, Doubtful Sound and Key Summit, over the Crown Range to Wānaka, the Lindis Pass to Mount Cook, then Tekapo and Christchurch.",
    free: true,
    days: [
      QUEENSTOWN_LAKE_DAY,
      QUEENSTOWN_TO_TE_ANAU_DAY,
      MILFORD_SOUND_DAY,
      DOUBTFUL_SOUND_DAY,
      KEY_SUMMIT_DAY,
      TE_ANAU_TO_QUEENSTOWN_DAY,
      QUEENSTOWN_TO_WANAKA_DAY,
      WANAKA_TO_MOUNT_COOK_DAY,
      MOUNT_COOK_TO_TEKAPO_DAY,
      TEKAPO_TO_CHRISTCHURCH_DAY,
    ],
  },
  {
    key: "south-island-in-10-days-from-picton",
    start: "picton",
    label: "South Island in 10 Days",
    description:
      "From the ferry to Queenstown by the West Coast: the Sounds road to Nelson, a water taxi and the Coast Track in Abel Tasman, a day in Golden Bay, down the Buller Gorge to Westport, then past Punakaiki, Hokitika and the glaciers, over the Haast Pass to Wānaka and on to Queenstown.",
    free: true,
    days: [
      PICTON_TO_NELSON_DAY,
      ABEL_TASMAN_DAY,
      GOLDEN_BAY_DAY,
      GOLDEN_BAY_TO_WESTPORT_DAY,
      PUNAKAIKI_TO_HOKITIKA_DAY,
      HOKITIKA_TO_FRANZ_JOSEF_DAY,
      FRANZ_JOSEF_TO_FOX_DAY,
      FOX_TO_HAAST_DAY,
      HAAST_TO_WANAKA_DAY,
      WANAKA_TO_QUEENSTOWN_DAY,
    ],
  },
  {
    key: "south-island-in-14-days-from-picton",
    start: "picton",
    label: "South Island in 14 Days",
    description:
      "From the ferry to Queenstown by the West Coast, then Fiordland: Nelson, Abel Tasman and Golden Bay, the Buller Gorge, Punakaiki, Hokitika and the glaciers, the Haast Pass to Wānaka and Queenstown, then Milford Sound and Doubtful Sound, and back to Queenstown.",
    free: true,
    days: [
      PICTON_TO_NELSON_DAY,
      ABEL_TASMAN_DAY,
      GOLDEN_BAY_DAY,
      GOLDEN_BAY_TO_WESTPORT_DAY,
      PUNAKAIKI_TO_HOKITIKA_DAY,
      HOKITIKA_TO_FRANZ_JOSEF_DAY,
      FRANZ_JOSEF_TO_FOX_DAY,
      FOX_TO_HAAST_DAY,
      HAAST_TO_WANAKA_DAY,
      WANAKA_TO_QUEENSTOWN_DAY,
      QUEENSTOWN_TO_TE_ANAU_DAY,
      MILFORD_SOUND_DAY,
      DOUBTFUL_SOUND_DAY,
      TE_ANAU_TO_QUEENSTOWN_DAY,
    ],
  },
  {
    key: "south-island-in-21-days-from-christchurch",
    start: "christchurch",
    label: "South Island in 21 Days",
    description:
      "The whole South Island in a loop: Hanmer and Kaikōura, the Marlborough Sounds and Abel Tasman, the West Coast and the glaciers, Wānaka and Queenstown, Milford Sound, the Catlins, Dunedin, the Waitaki and Mount Cook, and back through Tekapo.",
    free: true,
    days: WHOLE_ISLAND_DAYS,
  },
  {
    key: "south-island-in-21-days-from-picton",
    start: "picton",
    label: "South Island in 21 Days",
    description:
      "The whole South Island in a loop from the ferry: Abel Tasman, the West Coast and the glaciers, Wānaka and Queenstown, Milford Sound, the Catlins, Dunedin, the Waitaki and Mount Cook, Tekapo, Christchurch, then Hanmer and Kaikōura back to Picton.",
    free: true,
    days: loopFrom(WHOLE_ISLAND_DAYS, PICTON_TO_NELSON_DAY),
  },
  {
    key: "south-island-in-21-days-from-queenstown",
    start: "queenstown",
    label: "South Island in 21 Days",
    description:
      "The whole South Island in a loop from Queenstown: a day on the lake, Milford Sound, the Catlins, Dunedin, the Waitaki and Mount Cook, Tekapo, Christchurch, Hanmer and Kaikōura, the Marlborough Sounds and Abel Tasman, the West Coast and the glaciers, and Wānaka back to Queenstown.",
    free: true,
    days: loopFrom(WHOLE_ISLAND_DAYS, QUEENSTOWN_LAKE_DAY),
  },
  {
    key: "southern-loop-from-christchurch",
    start: "christchurch",
    label: "The Southern Loop",
    description:
      "Ten days round the south: Tekapo and Mount Cook, Wānaka, a day on the lake in Queenstown, Milford Sound, the Catlins, Dunedin, and home up the coast through Ōamaru.",
    free: true,
    days: SOUTHERN_LOOP_DAYS,
  },
  {
    key: "southern-loop-from-queenstown",
    start: "queenstown",
    label: "The Southern Loop",
    description:
      "Ten days round the south: a day on the lake in Queenstown, Milford Sound, the Catlins, Dunedin, up the coast through Ōamaru to Christchurch, then Tekapo, Mount Cook and Wānaka back to Queenstown.",
    free: true,
    days: loopFrom(SOUTHERN_LOOP_DAYS, QUEENSTOWN_LAKE_DAY),
  },
  {
    key: "queenstown-to-picton-via-the-west-coast",
    start: "queenstown",
    label: "Queenstown to Picton via the West Coast",
    description:
      "Ten days to the ferry: over the Crown Range to Wānaka and the Haast Pass, up the West Coast past the glaciers, Hokitika and Punakaiki, through the Buller Gorge to Abel Tasman and a water taxi up the Coast Track, a day in Golden Bay, then Nelson and the Sounds road to Picton.",
    free: true,
    days: [
      QUEENSTOWN_TO_WANAKA_DAY,
      WANAKA_TO_HAAST_DAY,
      HAAST_TO_FOX_DAY,
      FOX_TO_FRANZ_JOSEF_DAY,
      FRANZ_JOSEF_TO_HOKITIKA_DAY,
      HOKITIKA_TO_WESTPORT_DAY,
      WESTPORT_TO_KAITERITERI_DAY,
      ABEL_TASMAN_DAY,
      GOLDEN_BAY_DAY,
      GOLDEN_BAY_TO_PICTON_DAY,
    ],
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
