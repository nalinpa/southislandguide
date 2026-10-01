// Category ids are storage ids — they must match Firestore data exactly, and
// they are what CATEGORY_CONFIG (components/map/SiteMarker.tsx) and the admin
// panel's category multiselect are keyed by. Labels below are display-only and
// safe to reword. Order here is the filter-tab order; Stay goes last because it
// is accommodation, not somewhere to visit, and is excluded from itineraries.
export const SITE_CATEGORIES = [
  "Food",
  "Attractions",
  "Culture",
  "Walks",
  "Water",
  "Scenic",
  "Nature",
  "Adventure",
  "Stay",
] as const;
export type SiteCategory = (typeof SITE_CATEGORIES)[number];

export const SITE_CATEGORY_LABELS: Record<SiteCategory, string> = {
  Food: "Food & Drink",
  Attractions: "Attractions",
  Culture: "Culture",
  Walks: "Walks",
  Water: "Water",
  Scenic: "Scenic",
  Nature: "Nature",
  Adventure: "Adventure",
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
