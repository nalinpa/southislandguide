import type { ImageSourcePropType } from "react-native";

import { AREA_PHOTOS } from "@/lib/areaPhotos";
import type { Site } from "@/lib/models";

type PlacePhoto = Pick<Site, "area" | "featured" | "imageUrl" | "imageThumbnailUrl">;

// A town's picture: the owner's own photo of it (lib/areaPhotos.ts), otherwise the photo
// of its top featured place that has one, the small one first. Null when there's
// neither, and the trip view keeps the picture's place empty.
export function areaImage(areaId: string, places: PlacePhoto[]): ImageSourcePropType | null {
  if (AREA_PHOTOS[areaId]) return AREA_PHOTOS[areaId];
  const best = places
    .filter((p) => p.area === areaId && (p.imageThumbnailUrl || p.imageUrl))
    .sort((a, b) => (b.featured ?? 0) - (a.featured ?? 0))[0];
  const uri = best?.imageThumbnailUrl ?? best?.imageUrl;
  return uri ? { uri } : null;
}
