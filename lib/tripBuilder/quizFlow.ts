// The quiz's memory: its answers, the step it is on, where each answer leads and where Back goes. No screens.
// The rules are the website's: the page half of kiwiguide-site public/plan/quiz.js (its click handler, prevStep
// and render), which the copy leaves out, ported here over the copied logic (quizLogic.js). The copied
// functions count steps by their place in the website's list; this file names them.
import type { BuilderAnswers } from "./index";

/** The answers so far, in the website's shape (quizLogic.js blankState), so its functions take it as it is. */
export type QuizState = {
  /** A start town's id ("christchurch"). */
  start: string | null;
  /** The finish town. The start town for a loop. */
  end: string | null;
  /** The rough length picked first ("week"). */
  band: string | null;
  days: number | null;
  /** A season's id, or "unsure". */
  season: string | null;
  /** Left empty for "Not sure which month". The month counts from 0. */
  month: { month: number; year: number } | null;
  pace: BuilderAnswers["pace"] | null;
  drive: BuilderAnswers["drive"] | null;
  who: string | null;
  /** An age band's id, or "skip". */
  age: string | null;
  vibes: string[] | null;
  into: string[] | null;
  food: boolean | null;
  activities: string[] | null;
  /** Always skipped: the app doesn't ask how they heard of it, and the copied logic takes "skip" as an answer. */
  heard: "skip";
  /** The picked trip's key. */
  pick: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("./quizLogic") as {
  STEPS: string[];
  VIBES: { id: string }[];
  // today: read once a month is saved (which months are still to come)
  cleanState: (saved: unknown, today: Date) => Omit<QuizState, "heard">;
  firstOpenStep: (st: QuizState, step: number) => number;
  backStep: (step: number, st?: QuizState) => number;
  minDays: (start: string | null, end: string) => number;
  leastFrom: (start: string | null) => number;
  longDrive: (start: string | null, end: string | null, days: number | null) => boolean;
};

/** One answer, named by the step that asks it. */
export type QuizAnswer =
  | { step: "start"; value: string }
  | { step: "band"; value: string }
  | { step: "days"; value: number }
  | { step: "finish"; value: string }
  // a photo break's Next
  | { step: "break1" | "break2" }
  | { step: "season"; value: string }
  | { step: "month"; value: { month: number; year: number } | null }
  | { step: "pace"; value: BuilderAnswers["pace"] }
  | { step: "drive"; value: BuilderAnswers["drive"] }
  | { step: "who"; value: string }
  | { step: "age"; value: string }
  // in any order: kept in the website's (relax, sightseeing, nature, adventure), as it keeps its own
  | { step: "vibe"; value: string[] }
  // the swipe cards, once the last one is answered (the copied deckAnswers gives the two lists)
  | { step: "into"; value: { into: string[]; activities: string[] } }
  | { step: "food"; value: boolean }
  // the picked trip's key
  | { step: "choice"; value: string };
/** Every step that takes an answer, and the trip itself. */
export type QuizStep = QuizAnswer["step"] | "reveal";
/** The quiz: its answers and the step it is on. */
export type Quiz = { state: QuizState; step: QuizStep };

// "heard": not asked in the app. "account": the app asks for a sign-in at Save. "done": the website's
// "now get the app" screen.
const WEB_ONLY = ["heard", "account", "done"];
/** The website's steps in its order, less the three the app doesn't show. */
export const QUIZ_STEPS = site.STEPS.filter((s) => !WEB_ONLY.includes(s)) as QuizStep[];

export function blankQuiz(): QuizState {
  return { ...site.cleanState(null, new Date()), heard: "skip" };
}

/**
 * One answer taken: the answers with it in, and the step it leads to (the website's click handler).
 * Every answer the trips are built from clears the picked trip: the trips change with it.
 */
export function answerQuiz(st: QuizState, a: QuizAnswer): Quiz {
  switch (a.step) {
    case "start":
      // another start town: the finish is asked again
      return { state: { ...st, start: a.value, end: a.value === st.start ? st.end : null, pick: null }, step: "band" };
    case "band":
      // another rough length: the days picker opens on its number again
      return { state: { ...st, band: a.value, days: a.value === st.band ? st.days : null, pick: null }, step: "days" };
    case "days": {
      // Whole days, from the fewest the start town's trips take to 21, as the website's picker keeps them: a
      // number outside that would be dropped when the quiz is opened again, with every answer after it.
      const days = Math.min(21, Math.max(site.leastFrom(st.start), Math.round(a.value)));
      // a finish these days can't reach is asked again
      const tooFar = st.end && site.minDays(st.start, st.end) > days;
      return { state: { ...st, days, end: tooFar ? null : st.end, pick: null }, step: "finish" };
    }
    case "finish":
      return { state: { ...st, end: a.value, pick: null }, step: "break1" };
    case "break1":
      return { state: { ...st }, step: "season" };
    case "season":
      // a month picked for the season before goes; "Not sure yet" has no month to ask
      return { state: { ...st, season: a.value, month: null, pick: null }, step: a.value === "unsure" ? "pace" : "month" };
    case "month":
      return { state: { ...st, month: a.value, pick: null }, step: "pace" };
    case "pace": {
      // A long way in few days: the driving isn't asked, it is Happy to drive (owner, 2026-11-24).
      const far = site.longDrive(st.start, st.end, st.days);
      return { state: { ...st, pace: a.value, drive: far ? 360 : st.drive, pick: null }, step: far ? "who" : "drive" };
    }
    case "drive":
      return { state: { ...st, drive: a.value, pick: null }, step: "who" };
    // who and age are for analytics only: the trips stay as they are, and so does the pick
    case "who":
      return { state: { ...st, who: a.value }, step: "age" };
    case "age":
      return { state: { ...st, age: a.value }, step: "vibe" };
    case "vibe": {
      // the website's list order, each once, and only the ones it knows
      const vibes = site.VIBES.map((v) => v.id).filter((id) => a.value.includes(id));
      return { state: { ...st, vibes, pick: null }, step: "break2" };
    }
    case "break2":
      return { state: { ...st }, step: "into" };
    case "into":
      return { state: { ...st, into: [...a.value.into], activities: [...a.value.activities], pick: null }, step: "food" };
    case "food":
      // the website asks how they heard and for an account here; the app goes straight to the trips
      return { state: { ...st, food: a.value, pick: null }, step: "choice" };
    case "choice":
      return { state: { ...st, pick: a.value }, step: "reveal" };
  }
}

/**
 * Where Back goes from a step (the website's prevStep). From the first step it is the first step: the website
 * shows no Back there.
 * trips: the trips built for the answers (null: not built yet). Only the trip itself ("reveal") needs them.
 */
export function backQuiz(st: QuizState, step: QuizStep, trips?: readonly { key: string }[] | null): QuizStep {
  // The trip: back to the trip cards. One trip never showed its cards (tripStep), so Back from it goes on past them.
  if (step === "reveal" && trips?.length !== 1) return "choice";
  // "Not sure yet" skipped the month on the way in.
  if (step === "pace") return st.season && st.season !== "unsure" ? "month" : "season";
  // The copied rule (never onto a photo break, nor the driving question a long, short trip skipped), stepped again
  // past the steps the app doesn't show.
  let at = site.backStep(site.STEPS.indexOf(step === "reveal" ? "choice" : step), st);
  while (WEB_ONLY.includes(site.STEPS[at])) at = site.backStep(at, st);
  return site.STEPS[at] as QuizStep;
}

/**
 * The trip cards ("choice") and the trip ("reveal"), settled against the trips built for the answers (the
 * website's render does this before it draws either). Any other step comes back as it is.
 * trips: null while they aren't built yet, and then nothing changes (the website shows its waiting screen and
 * leaves the pick alone). An empty list is built trips, none fitting the answers.
 */
export function tripStep(st: QuizState, step: QuizStep, trips: readonly { key: string }[] | null): Quiz {
  if (!trips) return { state: { ...st }, step };
  // The picked trip isn't one of these (the answers or the data changed): pick again.
  if (step === "reveal" && !trips.some((t) => t.key === st.pick)) return tripStep({ ...st, pick: null }, "choice", trips);
  // One trip for the answers: no cards, it shows on its own (Back from it goes past the cards: backQuiz).
  if (step === "choice" && trips.length === 1) return { state: { ...st, pick: trips[0].key }, step: "reveal" };
  return { state: { ...st }, step };
}

/**
 * The quiz as it was left, from what was saved (anything, or nothing): the answers that still fit, on the saved
 * step or, when an earlier question has no answer, on that question.
 */
export function resumeQuiz(saved: unknown, today: Date): Quiz {
  const was = (saved ?? {}) as { state?: unknown; step?: unknown };
  // The copied rules: an answer that doesn't fit goes, with every answer after it.
  const state: QuizState = { ...site.cleanState(was.state, today), heard: "skip" };
  // A step that isn't one of the app's: the first question, as the website does with an address it can't read.
  const step = QUIZ_STEPS.includes(was.step as QuizStep) ? (was.step as QuizStep) : "start";
  return { state, step: site.STEPS[site.firstOpenStep(state, site.STEPS.indexOf(step))] as QuizStep };
}
