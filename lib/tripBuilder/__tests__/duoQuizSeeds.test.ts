// The Duo screenshot job (.github/duo/quiz-seeds.json) opens the quiz on each step by writing what the app saves
// there. If the quiz changes, this fails and the seeds are regenerated.
import { readFileSync } from "fs";
import { join } from "path";

import {
  QUIZ_STEPS,
  accountStep,
  answerQuiz,
  blankQuiz,
  resumeQuiz,
  type Quiz,
  type QuizAnswer,
} from "@/lib/tripBuilder/quizFlow";

type Seed = { n: string; step: string; quiz: Quiz };

const TODAY = new Date(2026, 10, 28);
const SEEDS: Seed[] = JSON.parse(readFileSync(join(__dirname, "../../../.github/duo/quiz-seeds.json"), "utf8"));

// One fixed set of answers that shows every step: a summer month (so month shows), a short trip with no long drive
// (so drive shows). The same rule as appstate.py's quiz command: the month's year as the app's monthsOf gives it.
const yearOf = (month: number) => TODAY.getFullYear() + (month >= TODAY.getMonth() ? 0 : 1);
const ANSWERS: QuizAnswer[] = [
  { step: "start", value: "christchurch" },
  { step: "band", value: "week" },
  { step: "days", value: 7 },
  { step: "finish", value: "queenstown" },
  { step: "break1" },
  { step: "season", value: "summer" },
  { step: "month", value: { month: 0, year: yearOf(0) } },
  { step: "pace", value: "some" },
  { step: "drive", value: 240 },
  { step: "who", value: "couple" },
  { step: "age", value: "30-44" },
  { step: "vibe", value: ["relax", "nature"] },
  { step: "break2" },
  { step: "into", value: { into: ["Scenic", "Walks"], activities: ["hot-pools"] } },
  { step: "food", value: true },
];

// The quiz as saved on each step: the blank start, what each answer leads to, then the cards (signed in).
function chain(): Quiz[] {
  const out: Quiz[] = [{ state: blankQuiz(), step: "start" }];
  for (const a of ANSWERS) out.push(answerQuiz(out[out.length - 1].state, a));
  out.push({ state: out[out.length - 1].state, step: "choice" });
  return out;
}

// A seed's month year, by the rule, so the check holds on any run date.
const normalised = (q: Quiz): Quiz =>
  q.state.month ? { ...q, state: { ...q.state, month: { ...q.state.month, year: yearOf(q.state.month.month) } } } : q;
const seed = (n: string) => SEEDS.find((s) => s.n === n)!;

test("seeds are what the quiz saves on each step", () => {
  const quizzes = chain();
  expect(SEEDS.map((s) => s.n)).toEqual(quizzes.map((_, i) => String(i + 1).padStart(2, "0")));
  expect(SEEDS.map((s) => s.step)).toEqual(QUIZ_STEPS);
  SEEDS.forEach((s, i) => {
    expect(s.quiz.step).toBe(s.step);
    expect(normalised(s.quiz)).toEqual(quizzes[i]);
  });
});

test("each seed opens on its own step", () => {
  for (const s of SEEDS) expect(resumeQuiz(normalised(s.quiz), TODAY).step).toBe(s.step);
});

test("account and choice settle as the screen settles them", () => {
  expect(accountStep(resumeQuiz(normalised(seed("16").quiz), TODAY), false)!.step).toBe("account");
  expect(accountStep(resumeQuiz(normalised(seed("17").quiz), TODAY), true)!.step).toBe("choice");
});

test("every step shows", () => {
  // the steps the job shoots are exactly the app's: month and drive aren't skipped
  expect(SEEDS.map((s) => s.step)).toEqual(QUIZ_STEPS);
  expect(SEEDS.map((s) => s.step)).toEqual(expect.arrayContaining(["month", "drive"]));
});
