// Category ids are storage ids — they must match Firestore data exactly, and
// they are what CATEGORY_CONFIG (components/map/SiteMarker.tsx) and the admin
// panel's category multiselect are keyed by. Labels below are display-only and
// safe to reword. Order here is the filter-tab order, ranked by how important
// each category is to a tourist visiting the South Island: scenery and outdoor
// experiences first, food and culture later, and Stay always last because it is
// accommodation, not somewhere to visit, and is excluded from itineraries.
export const SITE_CATEGORIES = [
  "Scenic",
  "Adventure",
  "Walks",
  "Nature",
  "Attractions",
  "Water",
  "Food",
  "Culture",
  "Stay",
] as const;
export type SiteCategory = (typeof SITE_CATEGORIES)[number];

export const SITE_CATEGORY_LABELS: Record<SiteCategory, string> = {
  Scenic: "Scenic",
  Adventure: "Adventure",
  Walks: "Walks",
  Nature: "Nature",
  Attractions: "Attractions",
  Water: "Water",
  Food: "Food & Drink",
  Culture: "Culture",
  Stay: "Stay",
};

// Accommodation is never added to a trip — the map overlay and the detail
// screen both hide "Add to itinerary" for it, and the transit matrix skips it.
export const NON_ITINERARY_CATEGORIES: readonly SiteCategory[] = ["Stay"];

export function canAddToItinerary(site: Pick<Site, "category">): boolean {
  return !site.category.some((c) => NON_ITINERARY_CATEGORIES.includes(c));
}

export type Site = {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  // Optional because no admin field sets it yet. @blacksands/hooks'
  // CheckpointEntity declares it required, so the shared location hooks
  // (Phase 4 map) will need either a default here or the field added.
  radiusMeters?: number;
  description: string;
  active: boolean;
  category: SiteCategory[];
  region?: string;
  // One level below region: the base town a place is visited from ("christchurch",
  // "timaru", "dunedin"), so Canterbury's towns can be told apart.
  area?: string;
  price?: string;
  // Opening times plus anything else a visitor plans around — access, safety,
  // amenities ("rockfall zone, do not linger", "dogs on lead"). Semicolon-
  // separated clauses; the detail screen puts each on its own line.
  hoursNote?: string;
  website?: string;
  imageUrl?: string | null;
  imageThumbnailUrl?: string | null;
  featured?: number;
  // 30-minute slots, used by the itinerary planner.
  recommendedDurationSlots?: number;
};

export type ItineraryItem = {
  id: string;
  siteId: string;
  siteName: string;
  slotIndex: number;
  timeLabel: string;
  durationLabel: string;
  durationSlots: number;
  imageUrl?: string;
  note?: string;
  // When the drive into this place leaves, for a place reached by a drive from another
  // area, if the user has moved it. Absent: it ends where this place starts.
  driveStartSlot?: number;
};

export type ItineraryDay = {
  id: string;
  date: string;
  items: ItineraryItem[];
};

export type Itinerary = {
  id: string;
  userId: string;
  title: string;
  startDate: string;
  endDate: string;
  days: ItineraryDay[];
  createdAt: string;
  updatedAt: string;
};
