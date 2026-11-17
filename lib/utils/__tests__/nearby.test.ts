import { nearestPlaces } from "@/lib/utils/nearby";
import type { Site } from "@/lib/models";

const site = (id: string, lat: number, category: string[] = ["Food"], lng = 172): Site =>
  ({ id, name: id, lat, lng, category }) as unknown as Site;

const origin = { lat: -43, lng: 172 };

describe("nearestPlaces", () => {
  it("lists the closest first, up to the limit", () => {
    const places = [site("far", -43.3), site("near", -43.01), site("mid", -43.1)];
    const out = nearestPlaces(origin, places, { limit: 2 });
    expect(out.map((o) => o.site.id)).toEqual(["near", "mid"]);
    expect(out[0].meters).toBeGreaterThan(0);
    expect(out[0].meters).toBeLessThan(out[1].meters);
  });

  it("skips excluded ids, places with no position, and Stay when addableOnly", () => {
    const places = [
      site("a", -43.01),
      site("b", -43.02),
      site("nopos", NaN),
      site("stay", -43.03, ["Stay"]),
      site("c", -43.04),
    ];
    const out = nearestPlaces(origin, places, { exclude: new Set(["a"]), addableOnly: true, limit: 10 });
    expect(out.map((o) => o.site.id)).toEqual(["b", "c"]);
    // Without addableOnly the Stay place stays.
    expect(nearestPlaces(origin, places, { limit: 10 }).map((o) => o.site.id)).toContain("stay");
  });

  it("is empty when nothing is left", () => {
    expect(nearestPlaces(origin, [], { limit: 3 })).toEqual([]);
    expect(nearestPlaces(origin, [site("a", -43.1)], { exclude: new Set(["a"]), limit: 3 })).toEqual([]);
  });
});
