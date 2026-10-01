import type { ImageSourcePropType } from "react-native";
import type { SiteCategory } from "@/lib/models";

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

/**
 * The place's own photo if it has one, otherwise its primary category's
 * default. `category` is the place's first category — the same one its map
 * marker uses. Returns null only when there's neither, so callers keep their
 * existing no-image placeholder for that case.
 */
export function siteImage(
  url: string | null | undefined,
  category: SiteCategory | null | undefined,
  size: "full" | "thumb",
): ImageSourcePropType | null {
  if (url) return { uri: url };
  if (category) return (size === "full" ? FULL : THUMB)[category] ?? null;
  return null;
}
