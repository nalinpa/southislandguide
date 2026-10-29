import type { ImageSourcePropType } from "react-native";
import type { SiteCategory } from "@/lib/models";
import { PLACE_IMAGE_TYPES } from "@/lib/placeImageTypes";

// A default image per category, shown for any place that hasn't had its own
// photo attached. Bundled rather than hosted: the fallback is shown exactly
// when a place has no image, which is often when the phone is offline, so a
// hosted default would fail in the moment it's needed.
//
// Files live at assets/images/categories/{full,thumb}/<CategoryId>.webp.
// Regenerate them from originals with:
//   node scripts/resize-images.js <folder of originals> assets/images/categories
// naming each original after its category id exactly (Food.jpg, Walks.jpg).
// Replacing the files needs a rebuild — they're compiled in — but no code change.
//
// Records over SiteCategory, so adding a category to lib/models.ts won't
// compile until it has both images. Paths are relative because require()
// needs a static string Metro can resolve at bundle time.
const FULL: Record<SiteCategory, ImageSourcePropType> = {
  Food: require("../assets/images/categories/full/Food.webp"),
  Attractions: require("../assets/images/categories/full/Attractions.webp"),
  Culture: require("../assets/images/categories/full/Culture.webp"),
  Walks: require("../assets/images/categories/full/Walks.webp"),
  Water: require("../assets/images/categories/full/Water.webp"),
  Scenic: require("../assets/images/categories/full/Scenic.webp"),
  Nature: require("../assets/images/categories/full/Nature.webp"),
  Adventure: require("../assets/images/categories/full/Adventure.webp"),
  Stay: require("../assets/images/categories/full/Stay.webp"),
};

const THUMB: Record<SiteCategory, ImageSourcePropType> = {
  Food: require("../assets/images/categories/thumb/Food.webp"),
  Attractions: require("../assets/images/categories/thumb/Attractions.webp"),
  Culture: require("../assets/images/categories/thumb/Culture.webp"),
  Walks: require("../assets/images/categories/thumb/Walks.webp"),
  Water: require("../assets/images/categories/thumb/Water.webp"),
  Scenic: require("../assets/images/categories/thumb/Scenic.webp"),
  Nature: require("../assets/images/categories/thumb/Nature.webp"),
  Adventure: require("../assets/images/categories/thumb/Adventure.webp"),
  Stay: require("../assets/images/categories/thumb/Stay.webp"),
};

// A default per type of place (a café, a backpackers, a campsite), shown ahead of the
// category's for the places the owner has listed under that type in
// lib/placeImageTypes.ts. Same sizes and resize step as above, into
// assets/images/types, each original named after its type (coffee.jpg, dorm.jpg).
export type PlaceImageType =
  | "camping"
  | "carcamp"
  | "dorm"
  | "coffee"
  | "bakery"
  | "pizza"
  | "burger"
  | "fish-and-chips"
  | "beer"
  | "steak"
  | "ice-cream";

const TYPE_FULL: Record<PlaceImageType, ImageSourcePropType> = {
  camping: require("../assets/images/types/full/camping.webp"),
  carcamp: require("../assets/images/types/full/carcamp.webp"),
  dorm: require("../assets/images/types/full/dorm.webp"),
  coffee: require("../assets/images/types/full/coffee.webp"),
  bakery: require("../assets/images/types/full/bakery.webp"),
  pizza: require("../assets/images/types/full/pizza.webp"),
  burger: require("../assets/images/types/full/burger.webp"),
  "fish-and-chips": require("../assets/images/types/full/fish-and-chips.webp"),
  beer: require("../assets/images/types/full/beer.webp"),
  steak: require("../assets/images/types/full/steak.webp"),
  "ice-cream": require("../assets/images/types/full/ice-cream.webp"),
};

const TYPE_THUMB: Record<PlaceImageType, ImageSourcePropType> = {
  camping: require("../assets/images/types/thumb/camping.webp"),
  carcamp: require("../assets/images/types/thumb/carcamp.webp"),
  dorm: require("../assets/images/types/thumb/dorm.webp"),
  coffee: require("../assets/images/types/thumb/coffee.webp"),
  bakery: require("../assets/images/types/thumb/bakery.webp"),
  pizza: require("../assets/images/types/thumb/pizza.webp"),
  burger: require("../assets/images/types/thumb/burger.webp"),
  "fish-and-chips": require("../assets/images/types/thumb/fish-and-chips.webp"),
  beer: require("../assets/images/types/thumb/beer.webp"),
  steak: require("../assets/images/types/thumb/steak.webp"),
  "ice-cream": require("../assets/images/types/thumb/ice-cream.webp"),
};

const TYPE_OF = new Map(
  (Object.entries(PLACE_IMAGE_TYPES) as [PlaceImageType, readonly string[]][]).flatMap(([type, ids]) =>
    ids.map((id) => [id, type] as const),
  ),
);

/**
 * The place's own photo if it has one, otherwise its type's default if the
 * owner has given it one (`siteId` is the place's id), otherwise its primary
 * category's. `category` is the place's first category — the same one its map
 * marker uses. Returns null only when there's none of these, so callers keep
 * their existing no-image placeholder for that case.
 */
export function siteImage(
  url: string | null | undefined,
  category: SiteCategory | null | undefined,
  size: "full" | "thumb",
  siteId?: string | null,
): ImageSourcePropType | null {
  if (url) return { uri: url };
  const type = siteId ? TYPE_OF.get(siteId) : undefined;
  if (type) return (size === "full" ? TYPE_FULL : TYPE_THUMB)[type];
  if (category) return (size === "full" ? FULL : THUMB)[category] ?? null;
  return null;
}
