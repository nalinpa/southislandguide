// The tour's steps and words, per person (docs/plans/opening-tour.md, "The steps").
import { readFileSync } from "fs";
import { join } from "path";

import { TOUR_STEPS, stepsFor } from "@/lib/tour/tourSteps";

const words = (audience: Parameters<typeof stepsFor>[0]) =>
  stepsFor(audience).map((s) => [s.id, s.title, s.body]);

describe("tourSteps", () => {
  it("gives a guest 6 steps, free and paid 7", () => {
    expect(stepsFor("guest")).toHaveLength(6);
    expect(stepsFor("free")).toHaveLength(7);
    expect(stepsFor("paid")).toHaveLength(7);
  });

  it("gives each person the words in the plan", () => {
    const start = [
      ["town", "Pick a Town", "You start in the nearest town. Tap here to see another."],
      ["guide", "Before You Go", "Driving, weather and safety, from people who live here."],
      ["browse", "Browse by Type", "Walks, food, beaches and more. Search is up top."],
      ["place", "Tap a Place", "Photos, hours, directions and reviews, all in one place."],
    ];
    const end = [
      ["trip", "Your Trip, Day by Day", "Each day's towns and the drives between, worked out for you."],
      ["map", "See It on the Map", "Every place around you. Tap a pin for details."],
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
    for (const s of TOUR_STEPS) expect(`${s.title} ${s.body}`).not.toMatch(/free|unlock|premium|pay|buy/i);
  });

  // A step that points at something needs a screen that registers it with
  // useTourTarget("<id>"). Read from the screens' source, so a renamed id fails here.
  it("has a screen registering every step that points at something", () => {
    const screens = [
      "app/(app)/(tabs)/sites/index.tsx",
      "app/(app)/(tabs)/sites/[siteId]/index.tsx",
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
