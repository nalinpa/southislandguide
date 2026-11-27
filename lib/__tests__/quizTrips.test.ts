// The trips for the quiz's answers, and one of them as the app's own trip model has it (stage 5 of
// docs/plans/app-trip-builder.md). Which trips is the website's rule (the page half of its quiz.js, options()):
// the answers as the builder takes them, the activities first cut to those on offer for the month the trip
// starts in, then the builder. The trip's shape is the website's tripBody (public/plan/account.js), which is
// what the app's Create Trip sheet saves, so a trip saved from the app equals one saved from the website.
//
// The real drive tables, as on a phone (jest.config.js swaps them for fixed samples).
jest.mock("@/assets/data/area-drive-minutes.json", () => jest.requireActual("../../assets/data/area-drive-minutes.json"));
jest.mock("@/assets/data/area-hubs.json", () => jest.requireActual("../../assets/data/area-hubs.json"));
jest.mock("@/assets/data/far-place-minutes.json", () => jest.requireActual("../../assets/data/far-place-minutes.json"));
jest.mock("@/assets/data/leg-minutes.json", () => jest.requireActual("../../assets/data/leg-minutes.json"));
import { existsSync } from "node:fs";
import path from "node:path";

import data from "@/assets/data/builder-data.json";
import { buildTrips, type BuilderAnswers } from "@/lib/tripBuilder";
import { blankQuiz, type QuizState } from "@/lib/tripBuilder/quizFlow";
import { builderAnswers, builtTrips, quizTrips, tripBody, tripStart } from "@/lib/tripBuilder/quizTrips";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("@/lib/tripBuilder/quizLogic");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const builder = require("@/lib/tripBuilder/builder");

const TODAY = new Date(2026, 10, 27);
// Every question answered: a week's loop from Queenstown in January.
const DONE: QuizState = {
  ...blankQuiz(),
  start: "queenstown",
  end: "queenstown",
  band: "week",
  days: 7,
  season: "summer",
  month: { month: 0, year: 2027 },
  pace: "some",
  drive: 240,
  who: "couple",
  age: "30-44",
  vibes: ["nature"],
  into: ["Scenic", "Walks"],
  food: true,
  activities: ["hot-pools", "wine"],
};
// The same trip in July.
const WINTER: QuizState = { ...DONE, season: "winter", month: { month: 6, year: 2027 } };

describe("the answers the builder is given", () => {
  it("are the copied quiz's nine, as they stand, when every activity asked for is on offer", () => {
    expect(builderAnswers(DONE, TODAY)).toEqual(site.answersFor(DONE));
    expect(builderAnswers(DONE, TODAY)).toEqual({
      start: "queenstown",
      end: "queenstown",
      days: 7,
      pace: "some",
      drive: 240,
      vibes: ["nature"],
      into: ["Scenic", "Walks"],
      food: true,
      activities: ["hot-pools", "wine"],
    });
  });

  // Skiing is only on offer for a trip starting June to October, and only once a place is tagged for it.
  describe("with skiing asked for", () => {
    const asked = (st: QuizState): QuizState => ({ ...st, activities: ["skiing", "hot-pools"] });
    // The bundled places, with one of them a ski field.
    const [first, ...rest] = Object.entries(data.places);
    const withSkiing = { places: Object.fromEntries([[first[0], { ...first[1], activities: ["skiing"] }], ...rest]) };

    it("hands it on for a trip in July", () => {
      expect(site.activitiesFor(withSkiing, 6).map((a: { id: string }) => a.id)).toContain("skiing");
      expect(builderAnswers(asked(WINTER), TODAY, withSkiing)!.activities).toEqual(["skiing", "hot-pools"]);
    });

    it("doesn't hand it on for a trip in January: the month has moved since it was asked for", () => {
      expect(builderAnswers(asked(DONE), TODAY, withSkiing)!.activities).toEqual(["hot-pools"]);
    });

    it("doesn't hand it on while no place is tagged for it, whatever the month", () => {
      expect(builderAnswers(asked(WINTER), TODAY)!.activities).toEqual(["hot-pools"]);
      expect(builderAnswers(asked(DONE), TODAY)!.activities).toEqual(["hot-pools"]);
    });

    it("is what the builder itself then gets", () => {
      const built = jest.spyOn(builder, "buildTrips");
      quizTrips(asked(DONE), TODAY);

      expect(built).toHaveBeenCalledTimes(1);
      expect((built.mock.calls[0][2] as BuilderAnswers).activities).toEqual(["hot-pools"]);
      built.mockRestore();
    });
  });

  it("takes the month from the trip's start: three months on when no season was picked", () => {
    // 27 November: a trip with no season starts in February.
    expect(tripStart({ ...DONE, season: "unsure", month: null }, TODAY)).toBe("2027-02-27");
    expect(tripStart(DONE, TODAY)).toBe("2027-01-01");
    expect(tripStart(DONE, TODAY)).toBe(site.startDateFor(DONE, TODAY));
  });

  it("are none until every question is answered", () => {
    expect(builderAnswers({ ...DONE, food: null }, TODAY)).toBeNull();
    expect(builderAnswers(blankQuiz(), TODAY)).toBeNull();
    expect(quizTrips({ ...DONE, food: null }, TODAY)).toEqual([]);
  });
});

describe("the trips for the answers", () => {
  it("are the builder's for those answers, each stop with its place's photo, kinds and activities", () => {
    const plain = buildTrips(builderAnswers(DONE, TODAY)!);
    const trips = quizTrips(DONE, TODAY);

    expect(plain.length).toBeGreaterThan(0);
    expect(trips.map((t) => t.key)).toEqual(plain.map((t) => t.key));
    for (const [n, trip] of trips.entries()) {
      expect(trip.days).toHaveLength(7);
      for (const [d, day] of trip.days.entries()) {
        for (const [i, stop] of day.items.entries()) {
          const place = (data.places as Record<string, { thumb?: string | null; fallback?: string | null; category: string[]; activities: string[] }>)[stop.siteId];
          expect(stop).toEqual({ ...plain[n].days[d].items[i], thumb: place.thumb, fallback: place.fallback, category: place.category, activities: place.activities });
        }
      }
    }
    // what the copied functions need of them: a card photo each, and the summary line
    expect(site.tripPhotos(trips)).toHaveLength(trips.length);
    expect(site.tripPhotos(trips).every((p: string) => typeof p === "string")).toBe(true);
    expect(site.summaryLine(trips[0], DONE)).toMatch(/: some walking, up to 4 hours of driving a day, nature, food tips, hot pools, wine\.$/);
  });

  // The build takes up to 0.3 s on an iPhone XR, and a screen asks for the trips every time it draws.
  it("are built once for a set of answers, and kept", () => {
    const fresh = { ...DONE, days: 8 };
    const built = jest.spyOn(builder, "buildTrips");
    expect(builtTrips(fresh, TODAY)).toBeNull();

    const first = quizTrips(fresh, TODAY);
    expect(quizTrips(fresh, TODAY)).toBe(first);
    expect(quizTrips({ ...fresh, who: "family", age: "skip", pick: "anything" }, TODAY)).toBe(first);
    expect(builtTrips(fresh, TODAY)).toBe(first);
    expect(built).toHaveBeenCalledTimes(1);

    // other answers: built again, and the first set is let go (one is kept, as on the website)
    const other = quizTrips({ ...fresh, pace: "easy" }, TODAY);
    expect(other).not.toBe(first);
    expect(built).toHaveBeenCalledTimes(2);
    expect(builtTrips(fresh, TODAY)).toBeNull();
    built.mockRestore();
  });
});

describe("a built trip as the app's trip", () => {
  const trip = quizTrips(DONE, TODAY)[0];
  let n = 0;
  const ids = () => String(++n);
  beforeEach(() => (n = 0));

  it("has the trip's name, its dates from the start day, and each day's stops as a saved trip has them", () => {
    const body = tripBody(trip, "2027-01-30", ids);

    expect(body.title).toBe(trip.label);
    expect(body.startDate).toBe("2027-01-30");
    // into February: seven days from the 30th
    expect(body.days.map((d) => d.date)).toEqual(["2027-01-30", "2027-01-31", "2027-02-01", "2027-02-02", "2027-02-03", "2027-02-04", "2027-02-05"]);
    expect(body.endDate).toBe("2027-02-05");
    expect(body.days.map((d) => d.id)).toEqual(["day_1", "day_2", "day_3", "day_4", "day_5", "day_6", "day_7"]);

    const stop = trip.days[0].items[0];
    expect(body.days[0].items[0]).toEqual({
      id: "item_1",
      siteId: stop.siteId,
      siteName: stop.siteName,
      slotIndex: stop.slotIndex,
      durationSlots: stop.durationSlots,
      timeLabel: stop.timeLabel,
      durationLabel: stop.durationLabel,
    });
    expect(body.days.map((d) => d.items.map((i) => i.siteId))).toEqual(trip.days.map((d) => d.items.map((i) => i.siteId)));
    // every stop has an id of its own
    const all = body.days.flatMap((d) => d.items.map((i) => i.id));
    expect(new Set(all).size).toBe(all.length);
  });

  // A place can be switched off after the builder's data was made. The app drops a stop it has no place for.
  it("drops a stop whose place the app doesn't have, and keeps the rest of its day", () => {
    const gone = trip.days[0].items[0].siteId;
    const body = tripBody(trip, "2027-01-01", ids, (siteId) => siteId !== gone);

    expect(body.days[0].items.map((i) => i.siteId)).toEqual(trip.days[0].items.slice(1).map((i) => i.siteId));
    expect(body.days.flatMap((d) => d.items).some((i) => i.siteId === gone)).toBe(false);
    expect(body.days).toHaveLength(7);
  });

  it("is still a trip, of empty days, when it has none of the places", () => {
    const body = tripBody(trip, "2027-01-01", ids, () => false);

    expect(body.days).toHaveLength(7);
    expect(body.days.every((d) => d.items.length === 0)).toBe(true);
    expect(body.endDate).toBe("2027-01-07");
  });

  // The website's own function, when its repo is beside this one (it isn't in CI): the same trip, to the letter.
  const account = path.resolve(__dirname, "../../../kiwiguide-site/public/plan/account.js");
  const beside = existsSync(account);
  if (!beside) console.warn("kiwiguide-site/public/plan/account.js not found next to this repo: tripBody is not checked against the website's");
  (beside ? it : it.skip)("is the trip the website saves for it", () => {
    // The website's own file, loaded as its own tests load it.
    const theirOwn = jest.requireActual(account) as { tripBody: (trip: unknown, startDate: string, uuid: () => string) => unknown };
    let k = 0;
    const theirs = theirOwn.tripBody(trip, "2027-01-30", () => String(++k));

    expect(JSON.stringify(tripBody(trip, "2027-01-30", ids))).toBe(JSON.stringify(theirs));
  });
});
