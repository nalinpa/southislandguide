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
  // the picked trip's key, once it is saved (the screen's): the trip saved last
  | { step: "choice"; value: string };
/** Every step that takes an answer, and the account step (left by signing in: accountStep). */
export type QuizStep = QuizAnswer["step"] | "account";
/** The quiz: its answers and the step it is on. */
export type Quiz = { state: QuizState; step: QuizStep };

// "heard": not asked in the app. "reveal": the trip, read-only until saved; in the app a picked trip is saved
// and opens in Trips (owner, 2026-11-27: "save on pick"). "done": the website's "now get the app" screen.
const WEB_ONLY = ["heard", "reveal", "done"];
/** The website's steps in its order, less the three the app doesn't show. */
export const QUIZ_STEPS = site.STEPS.filter((s) => !WEB_ONLY.includes(s)) as QuizStep[];

export function blankQuiz(): QuizState {
  return { ...site.cleanState(null, new Date()), heard: "skip" };
}

/**
 * An answer's quiz_step events for analytics, as the website's quiz sends them (its answered(): kiwiguide-site
 * public/plan/quiz.js): the step and the answer in the website's words. Lists are joined with commas, or "none",
 * from the quiz as the answer leaves it (the vibes in the website's order); a month is its number from 0 and its year
 * ("0-2027"). The swipe cards give two, the cards said yes to and the activities; a photo break gives none.
 */
export function quizStepEvents(st: QuizState, a: QuizAnswer): { step: string; answer: string }[] {
  const next = answerQuiz(st, a).state;
  const list = (ids: string[] | null) => (ids?.length ? ids.join(",") : "none");
  switch (a.step) {
    case "break1":
    case "break2":
      return [];
    case "days":
      return [{ step: "days", answer: String(next.days) }];
    case "month":
      return [{ step: "month", answer: a.value ? `${a.value.month}-${a.value.year}` : "none" }];
    case "drive":
      return [{ step: "drive", answer: String(a.value) }];
    case "vibe":
      return [{ step: "vibe", answer: list(next.vibes) }];
    case "into":
      return [
        { step: "into", answer: list(next.into) },
        { step: "activities", answer: list(next.activities) },
      ];
    case "food":
      return [{ step: "food", answer: a.value ? "yes" : "no" }];
    default:
      return [{ step: a.step, answer: a.value }];
  }
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
      // the website asks how they heard here; the app goes straight to the account step, which someone signed
      // in only passes through (accountStep)
      return { state: { ...st, food: a.value, pick: null }, step: "account" };
    case "choice":
      // the cards are the last step: the screen saves the trip and opens it in Trips
      return { state: { ...st, pick: a.value }, step: "choice" };
  }
}

/**
 * Where Back goes from a step (the website's prevStep). From the first step it is the first step: the website
 * shows no Back there.
 * signedIn: whether someone is signed in. From the trip cards, Back goes past the account step for them.
 */
export function backQuiz(st: QuizState, step: QuizStep, signedIn = false): QuizStep {
  // "Not sure yet" skipped the month on the way in.
  if (step === "pace") return st.season && st.season !== "unsure" ? "month" : "season";
  // The copied rule (never onto a photo break, nor the driving question a long, short trip skipped), stepped again
  // past the steps the app doesn't show, and past the account step for someone signed in: it would only send them
  // on again (the website's prevStep).
  const skip = signedIn ? [...WEB_ONLY, "account"] : WEB_ONLY;
  let at = site.backStep(site.STEPS.indexOf(step), st);
  while (skip.includes(site.STEPS[at])) at = site.backStep(at, st);
  return site.STEPS[at] as QuizStep;
}

/**
 * The account step and the trip cards, settled against the sign-in (the website's render does this before it draws
 * either): trips require an account (owner, 2026-11-27). Someone signed in goes on from the account step to the
 * trip cards; someone who isn't is shown the account step in place of the cards, the pick kept for when they are.
 * Any other step comes back as it is.
 * The answers come back as the very ones given, so a screen can settle the quiz each time it draws.
 * signedIn: null while the phone is still reading whether anyone is signed in. Nothing is decided then: for the
 * account step and the cards this is null (wait for it); the questions come back as they are.
 */
export function accountStep(q: Quiz, signedIn: boolean | null): Quiz | null {
  if (q.step !== "account" && q.step !== "choice") return q;
  if (signedIn === null) return null;
  if (signedIn && q.step === "account") return { state: q.state, step: "choice" };
  if (!signedIn && q.step === "choice") return { state: q.state, step: "account" };
  return q;
}

/**
 * The quiz as it was left, from what was saved (anything, or nothing): the answers that still fit, on the saved
 * step or, when an earlier question has no answer, on that question. Who is signed in by then is accountStep's.
 */
export function resumeQuiz(saved: unknown, today: Date): Quiz {
  const was = (saved ?? {}) as { state?: unknown; step?: unknown };
  // The copied rules: an answer that doesn't fit goes, with every answer after it.
  const state: QuizState = { ...site.cleanState(was.state, today), heard: "skip" };
  // Left on the trip, which an older version showed before saving: the cards, with the trip picked.
  const left = was.step === "reveal" ? "choice" : was.step;
  // A step that isn't one of the app's: the first question, as the website does with an address it can't read.
  const step = QUIZ_STEPS.includes(left as QuizStep) ? (left as QuizStep) : "start";
  return { state, step: site.STEPS[site.firstOpenStep(state, site.STEPS.indexOf(step))] as QuizStep };
}
