// The website's trip builder, copied into the app (scripts/copy-site-builder.mjs). The app's own drive times,
// hubs and packing step must build the trips the website builds. The trips to match come from the site's own
// builder and pack.js, taken when the copy was made (test/fixtures/site-trips.json).
//
// A failure here means the app's drive tables or packing step have moved on from the site's pack.js, or the
// copy was edited by hand. Export to the site again (scripts/export-site-trips.mjs), then copy again.
//
// The real drive tables, as on a phone (jest.config.js swaps them for fixed samples).
jest.mock("@/assets/data/area-drive-minutes.json", () => jest.requireActual("../../assets/data/area-drive-minutes.json"));
jest.mock("@/assets/data/area-hubs.json", () => jest.requireActual("../../assets/data/area-hubs.json"));
jest.mock("@/assets/data/far-place-minutes.json", () => jest.requireActual("../../assets/data/far-place-minutes.json"));
jest.mock("@/assets/data/leg-minutes.json", () => jest.requireActual("../../assets/data/leg-minutes.json"));
import { createHash } from "node:crypto";

import { buildTrips, type BuilderAnswers } from "@/lib/tripBuilder";
import SITE from "@/test/fixtures/site-trips.json";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const quiz = require("@/lib/tripBuilder/quizLogic");

const name = (a: BuilderAnswers) =>
  [a.start + (a.end ? " to " + a.end : ""), a.days + " d", a.pace, a.drive / 60 + " h", ...a.vibes, ...a.into, ...a.activities].join(", ");

describe("the trip builder in the app", () => {
  it.each(SITE.cases.map((c) => [name(c.ans as BuilderAnswers), c] as const))("builds the website's trips for %s", (_name, c) => {
    const trips = buildTrips(c.ans as BuilderAnswers);
    expect(trips.length).toBe(c.trips);
    expect(createHash("sha256").update(JSON.stringify(trips)).digest("hex")).toBe(c.sha256);
  });

  it("builds a trip from the copied quiz's answers", () => {
    const state = {
      ...quiz.cleanState(null, new Date(2026, 10, 27)),
      start: "queenstown",
      end: "queenstown",
      days: 7,
      pace: "some",
      drive: 240,
      vibes: ["nature"],
      into: ["Scenic", "Walks"],
      food: true,
      activities: ["hot-pools"],
    };
    const ans = quiz.answersFor(state);
    // The nine answers the builder reads, and nothing the quiz keeps for itself (band, season, who, age).
    expect(ans).toEqual({
      start: "queenstown",
      end: "queenstown",
      days: 7,
      pace: "some",
      drive: 240,
      vibes: ["nature"],
      into: ["Scenic", "Walks"],
      food: true,
      activities: ["hot-pools"],
    });
    const trips = buildTrips(ans);
    expect(trips.length).toBeGreaterThan(0);
    expect(trips[0].days).toHaveLength(7);
    expect(trips[0].start).toBe("queenstown");
  });
});
