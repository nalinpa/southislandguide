// The one itinerary rule south-island adds: accommodation is never a trip stop. Both the map
// overlay and the detail screen call canAddToItinerary, so the rule is pinned here once.
import { SITE_CATEGORIES, SITE_CATEGORY_LABELS, canAddToItinerary, type SiteCategory } from "@/lib/models";

const site = (...category: SiteCategory[]) => ({ category });

describe("canAddToItinerary", () => {
  it.each(SITE_CATEGORIES.filter((c) => c !== "Stay"))("allows a %s place", (category) => {
    expect(canAddToItinerary(site(category))).toBe(true);
  });

  it("refuses a Stay", () => {
    expect(canAddToItinerary(site("Stay"))).toBe(false);
  });

  it("refuses a place that is Stay in any of its categories, not only its first", () => {
    expect(canAddToItinerary(site("Food", "Stay"))).toBe(false);
  });

  it("allows a place with several visitable categories", () => {
    expect(canAddToItinerary(site("Walks", "Scenic", "Nature"))).toBe(true);
  });

  it("allows a place with no category", () => {
    expect(canAddToItinerary(site())).toBe(true);
  });
});

describe("categories", () => {
  it("has a display label for every id", () => {
    for (const c of SITE_CATEGORIES) expect(SITE_CATEGORY_LABELS[c]).toBeTruthy();
  });

  it("puts Stay last in the filter order", () => {
    expect(SITE_CATEGORIES[SITE_CATEGORIES.length - 1]).toBe("Stay");
  });
});
