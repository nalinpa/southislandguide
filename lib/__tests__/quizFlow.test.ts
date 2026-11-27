// The quiz's memory in the app: the steps, where each answer leads, what it clears, where Back goes, and where
// a saved quiz opens again. The rules are the website's (kiwiguide-site public/plan/quiz.js, the page half),
// run over the copied quiz logic.
import { QUIZ_STEPS, answerQuiz, backQuiz, blankQuiz, resumeQuiz, tripStep, type Quiz, type QuizAnswer, type QuizState } from "@/lib/tripBuilder/quizFlow";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("@/lib/tripBuilder/quizLogic");

// Every question answered, as someone taps through it: a week's loop from Queenstown in January.
const ANSWERS: QuizAnswer[] = [
  { step: "start", value: "queenstown" },
  { step: "band", value: "week" },
  { step: "days", value: 7 },
  { step: "finish", value: "queenstown" },
  { step: "break1" },
  { step: "season", value: "summer" },
  { step: "month", value: { month: 0, year: 2027 } },
  { step: "pace", value: "some" },
  { step: "drive", value: 240 },
  { step: "who", value: "couple" },
  { step: "age", value: "30-44" },
  { step: "vibe", value: ["nature"] },
  { step: "break2" },
  { step: "into", value: { into: ["Scenic", "Walks"], activities: ["hot-pools"] } },
  { step: "food", value: true },
  { step: "choice", value: "trip-a" },
];
const TODAY = new Date(2026, 10, 27);
// The quiz after these answers, one after the other.
const after = (answers: QuizAnswer[], from: QuizState = blankQuiz()): Quiz =>
  answers.reduce<Quiz>((quiz, a) => answerQuiz(quiz.state, a), { state: from, step: "start" });
// The whole quiz answered, then some answers changed.
const done = (...changes: QuizAnswer[]) => after(changes, after(ANSWERS).state);

describe("the app's steps", () => {
  // A step added on the website fails here, so its rule gets written before it reaches a phone.
  it("are the website's in its order, less the three the app doesn't show", () => {
    expect(QUIZ_STEPS).toEqual([
      "start", "band", "days", "finish", "break1", "season", "month", "pace", "drive",
      "who", "age", "vibe", "break2", "into", "food", "choice", "reveal",
    ]);
    expect(site.STEPS.filter((s: string) => !(QUIZ_STEPS as string[]).includes(s))).toEqual(["heard", "account", "done"]);
  });
});

describe("a blank quiz", () => {
  it("has the website's answers, all empty, with how they heard of the app skipped", () => {
    expect(blankQuiz()).toEqual({
      start: null, end: null, band: null, days: null, season: null, month: null, pace: null, drive: null,
      who: null, age: null, vibes: null, into: null, food: null, activities: null, heard: "skip", pick: null,
    });
  });
});

describe("an answer", () => {
  it("leads to the website's next step, with no stop for how they heard or an account", () => {
    const steps = ANSWERS.map((_a, i) => after(ANSWERS.slice(0, i + 1)).step);
    expect(steps).toEqual(QUIZ_STEPS.slice(1));
  });

  it("is kept in the website's shape, so the copied logic reads the builder's answers from it", () => {
    const { state } = after(ANSWERS);
    expect(state).toEqual({
      start: "queenstown", end: "queenstown", band: "week", days: 7, season: "summer", month: { month: 0, year: 2027 },
      pace: "some", drive: 240, who: "couple", age: "30-44", vibes: ["nature"], into: ["Scenic", "Walks"],
      food: true, activities: ["hot-pools"], heard: "skip", pick: "trip-a",
    });
    expect(site.answersFor(state)).toEqual({
      start: "queenstown", end: "queenstown", days: 7, pace: "some", drive: 240, vibes: ["nature"],
      into: ["Scenic", "Walks"], food: true, activities: ["hot-pools"],
    });
  });

  it("leaves the answers it was given alone", () => {
    const before = blankQuiz();
    answerQuiz(before, { step: "start", value: "picton" });
    expect(before).toEqual(blankQuiz());
  });
});

describe("an answer changed", () => {
  it("a new start town clears the finish; the same one keeps it", () => {
    expect(done({ step: "start", value: "christchurch" }).state).toMatchObject({ start: "christchurch", end: null, band: "week", days: 7 });
    expect(done({ step: "start", value: "queenstown" }).state.end).toBe("queenstown");
  });

  it("a new rough length clears the days; the same one keeps them", () => {
    expect(done({ step: "band", value: "ten" }).state).toMatchObject({ band: "ten", days: null, end: "queenstown" });
    expect(done({ step: "band", value: "week" }).state.days).toBe(7);
  });

  // Queenstown to Picton takes 6 days at least (the copied MIN_DAYS).
  it("fewer days clear a finish they can't reach, and keep one they can", () => {
    const toPicton = done({ step: "finish", value: "picton" }).state;
    expect(answerQuiz(toPicton, { step: "days", value: 5 }).state).toMatchObject({ days: 5, end: null });
    expect(answerQuiz(toPicton, { step: "days", value: 6 }).state).toMatchObject({ days: 6, end: "picton" });
  });

  it("a season clears the month, even the same season again", () => {
    expect(done({ step: "season", value: "winter" }).state).toMatchObject({ season: "winter", month: null });
    expect(done({ step: "season", value: "summer" }).state.month).toBeNull();
  });

  // The trips are built from these, so the trip picked before may be gone.
  it.each<QuizAnswer>([
    { step: "start", value: "queenstown" },
    { step: "band", value: "week" },
    { step: "days", value: 7 },
    { step: "finish", value: "queenstown" },
    { step: "season", value: "summer" },
    { step: "month", value: null },
    { step: "pace", value: "some" },
    { step: "drive", value: 240 },
    { step: "vibe", value: ["nature"] },
    { step: "into", value: { into: ["Scenic", "Walks"], activities: ["hot-pools"] } },
    { step: "food", value: true },
  ])("$step answered again clears the picked trip", (a) => {
    expect(done(a).state.pick).toBeNull();
  });

  // Who's travelling and their age don't change the trips, and a photo break answers nothing.
  it.each<QuizAnswer>([{ step: "who", value: "solo" }, { step: "age", value: "skip" }, { step: "break1" }, { step: "break2" }])(
    "$step keeps the picked trip",
    (a) => {
      expect(done(a).state.pick).toBe("trip-a");
    },
  );
});

describe("a step skipped", () => {
  it("Not sure yet for the season: no month is asked", () => {
    expect(done({ step: "season", value: "unsure" })).toMatchObject({ step: "pace", state: { season: "unsure", month: null } });
  });

  // Christchurch to Picton in 2 days is over 2 hours' driving a day (the copied LONG_DRIVES); in 3 it isn't.
  it("a long way in few days: the driving isn't asked, it is Happy to drive", () => {
    const far = done({ step: "start", value: "christchurch" }, { step: "days", value: 2 }, { step: "finish", value: "picton" });
    expect(far.state.drive).toBe(240);
    expect(answerQuiz(far.state, { step: "pace", value: "easy" })).toMatchObject({ step: "who", state: { pace: "easy", drive: 360 } });

    const near = answerQuiz(far.state, { step: "days", value: 3 });
    expect(answerQuiz(near.state, { step: "pace", value: "easy" })).toMatchObject({ step: "drive", state: { pace: "easy", drive: 240 } });
  });
});

describe("Back", () => {
  it("goes to the question before, never to a photo break", () => {
    const { state } = after(ANSWERS);
    expect(QUIZ_STEPS.map((step) => [step, backQuiz(state, step, [{ key: "trip-a" }, { key: "trip-b" }])])).toEqual([
      ["start", "start"],
      ["band", "start"],
      ["days", "band"],
      ["finish", "days"],
      ["break1", "finish"],
      ["season", "finish"],
      ["month", "season"],
      ["pace", "month"],
      ["drive", "pace"],
      ["who", "drive"],
      ["age", "who"],
      ["vibe", "age"],
      ["break2", "vibe"],
      ["into", "vibe"],
      ["food", "into"],
      // past the website's "How did you hear about us?" and its account step
      ["choice", "food"],
      ["reveal", "choice"],
    ]);
  });

  it("from How active? goes past the month when the season was Not sure yet", () => {
    expect(backQuiz(done({ step: "season", value: "unsure" }).state, "pace")).toBe("season");
  });

  // One trip never shows its cards (tripStep), so Back to them would only show the trip again.
  it("from the trip goes to the trip cards, or past them when there is only one trip", () => {
    const { state } = after(ANSWERS);
    expect(backQuiz(state, "reveal", [{ key: "trip-a" }])).toBe("food");
    expect(backQuiz(state, "reveal", [])).toBe("choice");
    // trips not built yet: the cards, as on the website while its data loads
    expect(backQuiz(state, "reveal")).toBe("choice");
  });

  // The driving question a long, short trip skipped on the way in is skipped on the way back too (owner, 2026-11-27).
  it("from Who's travelling? goes to the driving question, or past it when a long, short trip skipped it", () => {
    const far = done({ step: "start", value: "christchurch" }, { step: "days", value: 2 }, { step: "finish", value: "picton" }, { step: "pace", value: "easy" });
    expect(far.step).toBe("who");
    expect(backQuiz(far.state, "who")).toBe("pace");
    expect(backQuiz(after(ANSWERS.slice(0, 9)).state, "who")).toBe("drive");
  });
});

describe("the trip steps, once the trips are built", () => {
  const A = { key: "trip-a" }, B = { key: "trip-b" };
  const noPick = after(ANSWERS.slice(0, -1)); // on the trip cards, nothing picked

  it("several trips: the cards stay up, and a picked trip shows", () => {
    expect(tripStep(noPick.state, "choice", [A, B])).toEqual(noPick);
    expect(tripStep(after(ANSWERS).state, "reveal", [A, B])).toEqual(after(ANSWERS));
  });

  it("one trip: no cards, it is picked and shows on its own", () => {
    expect(tripStep(noPick.state, "choice", [B])).toEqual({ state: { ...noPick.state, pick: "trip-b" }, step: "reveal" });
  });

  // The answers or the app's data changed since it was picked.
  it("a picked trip that isn't among them: the pick is dropped and the cards show", () => {
    const { state } = after(ANSWERS);
    expect(tripStep(state, "reveal", [B, { key: "trip-c" }])).toEqual({ state: { ...state, pick: null }, step: "choice" });
    // and with one trip left, that one shows
    expect(tripStep(state, "reveal", [B])).toEqual({ state: { ...state, pick: "trip-b" }, step: "reveal" });
  });

  it("trips not built yet: the picked trip stays picked", () => {
    const quiz = after(ANSWERS);
    expect(tripStep(quiz.state, "reveal", null)).toEqual({ state: quiz.state, step: "reveal" });
    expect(tripStep(quiz.state, "choice", null)).toEqual({ state: quiz.state, step: "choice" });
  });

  it("built, and no trip fits the answers: the pick is dropped and the cards' step shows", () => {
    const quiz = after(ANSWERS);
    expect(tripStep(quiz.state, "reveal", [])).toEqual({ state: { ...quiz.state, pick: null }, step: "choice" });
  });

  it("leaves every other step as it is", () => {
    const { state } = after(ANSWERS);
    expect(tripStep(state, "food", [A])).toEqual({ state, step: "food" });
  });
});

describe("a saved quiz opened again", () => {
  it("comes back on the step it was left on, with its answers", () => {
    const half = after(ANSWERS.slice(0, 8));
    expect(half.step).toBe("drive");
    expect(resumeQuiz(half, TODAY)).toEqual(half);
  });

  // "How did you hear about us?" counts as answered, so the copied logic never stops there.
  it("comes back on the trip cards or the trip when every question is answered", () => {
    const cards = after(ANSWERS.slice(0, -1));
    expect(cards.step).toBe("choice");
    expect(resumeQuiz(cards, TODAY)).toEqual(cards);
    expect(resumeQuiz(after(ANSWERS), TODAY)).toEqual(after(ANSWERS));
  });

  it("with nothing saved is a blank quiz on the first question", () => {
    expect(resumeQuiz(null, TODAY)).toEqual({ state: blankQuiz(), step: "start" });
    expect(resumeQuiz(undefined, TODAY)).toEqual({ state: blankQuiz(), step: "start" });
  });

  it("never lands past a question with no answer", () => {
    const { state } = after(ANSWERS);
    expect(resumeQuiz({ state: { ...state, pace: null }, step: "food" }, TODAY).step).toBe("pace");
    expect(resumeQuiz({ state: { ...state, pick: null }, step: "reveal" }, TODAY).step).toBe("choice");
    // an earlier step than the gap is left alone
    expect(resumeQuiz({ state: { ...state, pace: null }, step: "days" }, TODAY).step).toBe("days");
  });

  // The copied cleanState: 30 days isn't a length the quiz offers.
  it("drops an answer that doesn't fit and every answer after it", () => {
    const { state } = after(ANSWERS);
    expect(resumeQuiz({ state: { ...state, days: 30 }, step: "reveal" }, TODAY)).toEqual({
      state: { ...blankQuiz(), start: "queenstown", band: "week" },
      step: "days",
    });
  });

  // A month already gone by the time the quiz is opened again.
  it("drops a month that has passed, and asks from How active? on", () => {
    const at = resumeQuiz(after(ANSWERS), new Date(2027, 2, 1));
    expect(at.step).toBe("pace");
    expect(at.state).toMatchObject({ season: "summer", month: null, pace: null });
  });

  it("no month step for a season of Not sure yet", () => {
    const unsure = done({ step: "season", value: "unsure" }).state;
    expect(resumeQuiz({ state: unsure, step: "month" }, TODAY).step).toBe("season");
  });

  it.each([["a step the app doesn't have", "account"], ["no step", undefined], ["a step that isn't one", 7]])(
    "with %s opens on the first question, answers kept",
    (_name, step) => {
      const { state } = after(ANSWERS);
      expect(resumeQuiz({ state, step }, TODAY)).toEqual({ state, step: "start" });
    },
  );

  it.each([["text", "nonsense"], ["a number", 5], ["a list", []], ["the wrong shape", { state: "x", step: "food" }], ["an unknown town", { state: { start: "auckland" }, step: "band" }]])(
    "with %s saved is a blank quiz on the first question",
    (_name, saved) => {
      expect(resumeQuiz(saved, TODAY)).toEqual({ state: blankQuiz(), step: "start" });
    },
  );
});

// The rules above against the copied checks, over thousands of taps: wherever answering and Back can take the quiz,
// a save made there opens on the same step. A rule that left the answers in a state the copied logic won't take
// (a month kept after "Not sure yet", no driving answer after its question was skipped) would open on an earlier
// question, and fails here.
describe("an answer taken in", () => {
  it("keeps the days between the fewest from the start town and 21, whole, as the website's picker does", () => {
    const st = after(ANSWERS.slice(0, 2)).state;
    expect(answerQuiz(st, { step: "days", value: 40 }).state.days).toBe(21);
    expect(answerQuiz(st, { step: "days", value: 0 }).state.days).toBe(site.leastFrom("queenstown"));
    expect(answerQuiz(st, { step: "days", value: 6.6 }).state.days).toBe(7);
  });

  it("puts the vibes in the website's order, each once, and none it doesn't know", () => {
    const st = after(ANSWERS.slice(0, 11)).state;
    const vibes = answerQuiz(st, { step: "vibe", value: ["adventure", "relax", "relax", "nonsense"] }).state.vibes;
    expect(vibes).toEqual(["relax", "adventure"]);
  });

  it("keeps lists of its own: a later change to the ones handed in doesn't reach the answers", () => {
    const vibes = ["nature"];
    const into = ["Scenic"];
    const activities = ["wine"];
    const a = answerQuiz(after(ANSWERS.slice(0, 11)).state, { step: "vibe", value: vibes }).state;
    const b = answerQuiz(a, { step: "into", value: { into, activities } }).state;
    vibes.push("relax");
    into.push("Walks");
    activities.push("skiing");
    expect(a.vibes).toEqual(["nature"]);
    expect(b.into).toEqual(["Scenic"]);
    expect(b.activities).toEqual(["wine"]);
  });
});

describe("anywhere the quiz can get to", () => {
  const ids = (list: { id: string | number }[]) => list.map((x) => x.id);
  // The choices each step offers for the answers so far (the copied lists; the seasons, vibes and cards aren't handed out).
  const choices = (st: QuizState, step: string): QuizAnswer[] => {
    const all: Record<string, unknown[]> = {
      start: ids(site.TOWNS),
      band: ids(site.BANDS),
      days: [2, 3, 4, 5, 7, 10, 14, 21],
      finish: st.start && st.days ? site.endsFor(st.start, st.days) : [],
      season: ["summer", "autumn", "winter", "spring", "unsure"],
      month: [null, ...site.monthsOf(st.season, TODAY)],
      pace: ids(site.PACES),
      drive: [120, 240, 360],
      who: ids(site.WHO),
      age: ["skip", ...ids(site.AGES)],
      vibe: [[], ["relax"], ["sightseeing", "adventure"]],
      into: [{ into: [], activities: [] }, { into: ["Scenic", "Nature"], activities: ["wildlife", "wine"] }],
      food: [true, false],
      choice: ["trip-a", "trip-b"],
    };
    return /^break/.test(step) ? [{ step } as QuizAnswer] : (all[step] ?? []).map((value) => ({ step, value }) as QuizAnswer);
  };

  it.each([1, 2, 3, 4, 5])("opens again on the same step, with nothing but answers that were given (walk %i)", (seed) => {
    // The same walk every run: a small fixed-step generator, not Math.random.
    let n = seed;
    const roll = (below: number) => (n = (n * 48271) % 2147483647) % below;
    let quiz: Quiz = { state: blankQuiz(), step: "start" };
    const seen = new Set<string>();
    for (let tap = 0; tap < 3000; tap++) {
      const trips = roll(2) ? [{ key: "trip-a" }] : [{ key: "trip-a" }, { key: "trip-b" }];
      const options = choices(quiz.state, quiz.step);
      // From the trip, Start again now and then, so first answers are given many times over.
      if (quiz.step === "reveal" && roll(2)) quiz = { state: blankQuiz(), step: "start" };
      // Back every other tap, so the walk wanders over the whole quiz, and always from the trip (no answer to give).
      else if (!options.length || roll(2) === 0) quiz = { state: quiz.state, step: backQuiz(quiz.state, quiz.step, trips) };
      else quiz = answerQuiz(quiz.state, options[roll(options.length)]);
      quiz = tripStep(quiz.state, quiz.step, trips);
      seen.add(quiz.step);
      const again = resumeQuiz(JSON.parse(JSON.stringify(quiz)), TODAY);
      // As on the website, the answers after a question waiting to be asked again (the finish, after a new start
      // town) aren't kept by a save; the ones that come back are the ones given.
      const given = Object.entries(again.state).every(([k, v]) => v === null || JSON.stringify(v) === JSON.stringify(quiz.state[k as keyof QuizState]));
      // Together the two checks cover every answer before the step: the step only matches when none of them is
      // missing, and `given` fails one that came back changed.
      // One check per tap would take seconds: the first tap that goes wrong fails the walk, with where it was.
      if (again.step !== quiz.step || !given) return expect({ tap, again }).toEqual({ tap, again: quiz });
    }
    // the walk got everywhere
    expect([...seen].sort()).toEqual([...QUIZ_STEPS].sort());
  });
});
