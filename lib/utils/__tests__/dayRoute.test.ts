import { dayRouteUrl } from "@/lib/utils/dayRoute";
import type { ItineraryItem } from "@/lib/models";

const item = (siteId: string, slotIndex: number): ItineraryItem => ({
  id: `item_${siteId}_${slotIndex}`,
  siteId,
  siteName: siteId,
  slotIndex,
  timeLabel: "",
  durationLabel: "",
  durationSlots: 2,
});

const coords: Record<string, { lat: number; lng: number }> = {};
for (let i = 0; i < 14; i++) coords[`p${i}`] = { lat: -43 - i / 10, lng: 172 + i / 10 };
const places = (id: string) => (coords[id] ? { area: "christchurch", ...coords[id] } : undefined);

const parse = (url: string | null) => new URL(url!).searchParams;

describe("dayRouteUrl", () => {
  it("drives the day's stops in slot order, ending at the last", () => {
    const q = parse(dayRouteUrl([item("p2", 10), item("p0", 1), item("p1", 5)], places));

    expect(q.get("api")).toBe("1");
    expect(q.get("travelmode")).toBe("driving");
    expect(q.get("origin")).toBeNull();
    expect(q.get("destination")).toBe("-43.2,172.2");
    expect(q.get("waypoints")).toBe("-43,172|-43.1,172.1");
  });

  it("drops back-to-back repeats and stops with no position", () => {
    const q = parse(dayRouteUrl([item("p0", 1), item("p0", 4), item("nowhere", 6), item("p1", 8)], places));

    expect(q.get("waypoints")).toBe("-43,172");
    expect(q.get("destination")).toBe("-43.1,172.1");
  });

  it("leaves out waypoints for a one-stop day", () => {
    const q = parse(dayRouteUrl([item("p3", 2)], places));

    expect(q.get("destination")).toBe("-43.3,172.3");
    expect(q.has("waypoints")).toBe(false);
  });

  it("keeps to Google's 9 waypoints, still ending at the day's last stop", () => {
    const q = parse(dayRouteUrl(Array.from({ length: 14 }, (_, i) => item(`p${i}`, i * 2)), places));

    expect(q.get("waypoints")!.split("|")).toHaveLength(9);
    expect(q.get("destination")).toBe("-44.3,173.3");
  });

  it("is null for a day with nothing to drive to", () => {
    expect(dayRouteUrl([], places)).toBeNull();
    expect(dayRouteUrl([item("nowhere", 1)], places)).toBeNull();
  });
});
