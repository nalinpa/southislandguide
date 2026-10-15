import { distanceMeters, nearestSite } from "@/lib/utils/geoDistance";

describe("distanceMeters", () => {
  it("returns 0 for identical points", () => {
    const point = { lat: -38.1368, lng: 176.2497 };
    expect(distanceMeters(point, point)).toBe(0);
  });

  it("computes the great-circle distance between two known points", () => {
    const lakefront = { lat: -38.1368, lng: 176.2497 };
    const skyline = { lat: -38.1446, lng: 176.262 };
    expect(distanceMeters(lakefront, skyline)).toBeCloseTo(1381.79, 1);
  });

  it("is symmetric regardless of argument order", () => {
    const lakefront = { lat: -38.1368, lng: 176.2497 };
    const skyline = { lat: -38.1446, lng: 176.262 };
    expect(distanceMeters(lakefront, skyline)).toBe(distanceMeters(skyline, lakefront));
  });
});

describe("nearestSite", () => {
  const gardens = { id: "gardens", lat: -43.5306, lng: 172.6217 };
  const museum = { id: "museum", lat: -45.8656, lng: 170.5107 };

  it("returns the closest place and how far away it is", () => {
    // The Octagon, Dunedin: about a kilometre from the museum, 300 km from the gardens.
    const nearest = nearestSite(-45.874, 170.504, [gardens, museum]);

    expect(nearest?.site).toBe(museum);
    expect(nearest?.meters).toBeGreaterThan(500);
    expect(nearest?.meters).toBeLessThan(2000);
  });

  it("returns null when there are no places", () => {
    expect(nearestSite(-45.874, 170.504, [])).toBeNull();
  });
});
