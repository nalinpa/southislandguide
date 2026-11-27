// The tour's steps and words, per person (docs/plans/opening-tour.md, "The steps").
import { readFileSync } from "fs";
import { join } from "path";

import { TOUR_STEPS, stepsFor } from "@/lib/tour/tourSteps";

const words = (audience: Parameters<typeof stepsFor>[0]) =>
  stepsFor(audience).map((s) => [s.id, s.title, s.body]);

describe("tourSteps", () => {
  it("gives a guest 8 steps, free and paid 9", () => {
    expect(stepsFor("guest")).toHaveLength(8);
    expect(stepsFor("free")).toHaveLength(9);
    expect(stepsFor("paid")).toHaveLength(9);
  });

  // The owner, 2026-11-26: "add it to the tour as a final thing after the map". On the Trips tab, so closing the
  // quiz lands where the trip will be (docs/plans/app-trip-builder.md). Everyone, guests too: the quiz asks for the
  // account at its end.
  it("ends for everyone on the Trips tab with the trip quiz, the map no longer last", () => {
    for (const who of ["guest", "free", "paid"] as const) {
      const steps = stepsFor(who);
      expect(steps[steps.length - 1]).toEqual({
        id: "buildTrip",
        tabKey: "itinerary",
        noTarget: true,
        // Not for someone with a trip (TourContext decides it at the end).
        noTrip: true,
        nextLabel: "Build My Trip",
        opens: "/build-trip",
        closeLabel: "Not Now",
        title: "Build Your Trip",
        body: "Answer a few questions and we'll plan your days.",
      });
      const map = steps[steps.length - 2];
      expect(map.id).toBe("map");
      expect(map.nextLabel).toBeUndefined();
    }
  });

  it("gives each person the words in the plan", () => {
    const start = [
      [
        "welcome",
        "Welcome to Kiwi Guide",
        "Here's a quick tour of how it works. It takes a minute, and you can skip it any time.",
      ],
      ["town", "Pick a Town", "You start in the nearest town. Tap here to see another."],
      ["guide", "Before You Go", "Driving, weather and safety, from people who live here."],
      ["browse", "Browse by Type", "Walks, food, beaches and more. Search is up top."],
      ["place", "Tap a Place", "Photos, hours, directions and reviews, all in one place."],
    ];
    const end = [
      ["trip", "Your Trip, Day by Day", "Each day's towns and the drives between, worked out for you."],
      ["map", "See It on the Map", "Every place around you. Tap a pin for details."],
      ["buildTrip", "Build Your Trip", "Answer a few questions and we'll plan your days."],
    ];
    expect(words("paid")).toEqual([
      ...start,
      ["placeAdd", "Add It to a Trip", "Drop it into any day. We work out the drive."],
      ...end,
    ]);
    expect(words("free")).toEqual([
      ...start,
      ["placeSave", "Save It for Later", "Tap the heart to keep it on your list."],
      ...end,
    ]);
    expect(words("guest")).toEqual([...start, ...end]);
  });

  it("never mentions the unlock or anything being free", () => {
    for (const s of TOUR_STEPS) {
      expect(`${s.title} ${s.body} ${s.nextLabel ?? ""} ${s.closeLabel ?? ""}`).not.toMatch(/free|unlock|premium|pay|buy/i);
    }
  });

  // A step that points at something needs a screen that registers it with
  // useTourTarget("<id>"). Read from the screens' source, so a renamed id fails here.
  it("has a screen registering every step that points at something", () => {
    const screens = [
      "app/(app)/(tabs)/sites/index.tsx",
      "components/sites/detail/SiteDetail.tsx",
      "components/sites/detail/ActionsBar.tsx",
    ];
    const source = screens.map((f) => readFileSync(join(__dirname, "../../..", f), "utf8")).join("\n");
    const registered = [...source.matchAll(/useTourTarget\("(\w+)"\)/g)].map((m) => m[1]).sort();

    expect(registered).toEqual(
      TOUR_STEPS.filter((s) => !s.noTarget)
        .map((s) => s.id)
        .sort(),
    );
  });
});
