// The picture for a town on the trip view: the owner's own photo of it when there is one
// (bundled, lib/areaPhotos.ts), otherwise the photo of the town's top featured place, so
// a town added in the admin panel has a picture from its first day.

jest.mock("@/lib/areaPhotos", () => ({ AREA_PHOTOS: { dunedin: 101 } }));

import { areaImage } from "@/lib/areaImages";

const place = (id: string, area: string, over: Record<string, unknown> = {}) => ({ id, area, ...over });

const places = [
  place("gardens", "christchurch", { featured: 1, imageThumbnailUrl: "https://img/gardens-thumb.webp", imageUrl: "https://img/gardens.webp" }),
  place("gondola", "christchurch", { featured: 3, imageUrl: "https://img/gondola.webp" }),
  place("market", "christchurch", { featured: 44 }), // the favourite, but no photo
  place("caroline-bay", "timaru", { imageThumbnailUrl: "https://img/bay-thumb.webp" }),
  place("museum", "dunedin", { featured: 9, imageThumbnailUrl: "https://img/museum-thumb.webp" }),
];

describe("areaImage", () => {
  it("uses the town's own photo when there is one", () => {
    expect(areaImage("dunedin", places)).toBe(101);
  });

  it("otherwise uses the photo of the town's top featured place that has one", () => {
    expect(areaImage("christchurch", places)).toEqual({ uri: "https://img/gondola.webp" });
  });

  it("prefers a place's small photo, made for rows like this", () => {
    expect(areaImage("christchurch", places.filter((p) => p.id !== "gondola"))).toEqual({
      uri: "https://img/gardens-thumb.webp",
    });
  });

  it("uses any place's photo in a town with nothing featured", () => {
    expect(areaImage("timaru", places)).toEqual({ uri: "https://img/bay-thumb.webp" });
  });

  it("has nothing for a town with no photo of its own and no place photos", () => {
    expect(areaImage("oamaru", [...places, place("steampunk", "oamaru")])).toBeNull();
  });
});
