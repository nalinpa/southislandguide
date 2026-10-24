import type { ImageSourcePropType } from "react-native";

// The owner's own photo for each town, shown beside each day of the trip view. Bundled,
// as the category photos are (lib/categoryImages.ts): the trip view is most needed on the
// road, often offline. A town not listed here uses its top featured place's photo
// (lib/areaImages.ts), so it has a picture from its first day.
//
// To add one: name the original after the area id (dunedin.jpg) and run
//   node scripts/resize-images.js <folder of originals> assets/images/areas
// then add a line here for its thumb (400px is plenty for the square on a day's row):
//   dunedin: require("../assets/images/areas/thumb/dunedin.webp"),
// Paths are relative because require() needs a static string Metro can resolve.
export const AREA_PHOTOS: Record<string, ImageSourcePropType> = {};

// The photographer for any town photo whose licence asks to be credited, as the licence
// words it ("Miles Holden"), by area id. The squares are too small to carry it, so it is
// shown on the Photo credits page (app/(app)/photo-credits.tsx).
export const AREA_PHOTO_CREDITS: Record<string, string> = {};
