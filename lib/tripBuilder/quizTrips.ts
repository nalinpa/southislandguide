// The trips for the quiz's answers, and one of them as the app's own trip model has it. No screens.
//
// Which trips is the website's rule, from the page half of its quiz.js (options()), which the copy leaves out: the
// answers as the builder takes them, the activities first cut to those on offer for the month the trip starts in
// (skiing drops out when the month moves), then the builder. One set of trips is kept, as the website keeps one:
// a build takes up to 0.3 s on an iPhone XR, and a screen asks for the trips every time it draws.
//
// The trip's shape is the website's tripBody (kiwiguide-site public/plan/account.js), which is what the app's own
// Create Trip sheet saves for a suggested trip: a trip saved from the app equals one saved from the website.
import data from "@/assets/data/builder-data.json";
import type { ItineraryDay } from "@/lib/models";
import { buildTrips, type BuilderAnswers, type BuiltDay, type BuiltStop, type BuiltTrip } from "./index";
import type { QuizState } from "./quizFlow";

/** What the activities on offer are read from: the builder's places, each with the activities it is tagged with. */
type ActivityData = { places: Record<string, { activities: string[] }> };
/** The builder's own record of a place, as far as a trip's stops are given it. */
type BuilderPlace = { thumb?: string | null; fallback?: string | null; category?: string[]; activities?: string[] };

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("./quizLogic") as {
  // The nine answers the builder reads, as the quiz holds them (any may still be empty).
  answersFor: (st: QuizState) => { [K in keyof BuilderAnswers]: BuilderAnswers[K] | null };
  activitiesFor: (data: ActivityData, startMonth: number) => { id: string }[];
  // today: read when no month was picked (the season's first month still to come, or three months on).
  startDateFor: (st: QuizState, today: Date) => string;
  measureParams: (option: QuizTrip, st: QuizState) => Record<string, string | number>;
};

/**
 * The website's extra params on trip_saved (its measureParams): which kind of trip, how many days, where it starts
 * and ends, and the pace and driving it was built for. Fixed ids and numbers only.
 */
export function tripMeasure(trip: QuizTrip, state: QuizState): Record<string, string | number> {
  return site.measureParams(trip, state);
}

/** A stop with what the trip cards and the trip's notes read of its place: its photo, its kinds and its activities. */
export type QuizStop = BuiltStop & { thumb?: string | null; fallback?: string | null; category: string[]; activities: string[] };
/** A trip built for the quiz, each stop with its place's photo, kinds and activities (as the website hands its cards). */
export type QuizTrip = Omit<BuiltTrip, "days"> & { days: (Omit<BuiltDay, "items"> & { items: QuizStop[] })[] };
/**
 * A trip as the app saves one (the api's body): a name, its dates, its days, and the town it starts from (day 1 is
 * timed from that town's hub).
 */
export type TripBody = { title: string; startDate: string; endDate: string; days: ItineraryDay[]; startArea?: string };

/** The first day of the trip as the answers have it ("2027-01-01"). The trip's days are dated from it. */
export function tripStart(state: QuizState, today: Date): string {
  return site.startDateFor(state, today);
}

/**
 * The answers as the builder is given them: the quiz's nine, the activities cut to those on offer for the month
 * the trip starts in. null until every question is answered.
 * from: the places the activities are read from (the builder's own, unless a test brings others).
 */
export function builderAnswers(state: QuizState, today: Date, from: ActivityData = data): BuilderAnswers | null {
  const a = site.answersFor(state);
  if (!a.start || !a.end || a.days == null || !a.pace || a.drive == null || !a.vibes || !a.into || a.food == null || !a.activities) return null;
  const offered = site.activitiesFor(from, +tripStart(state, today).slice(5, 7) - 1).map((x) => x.id);
  return {
    start: a.start,
    end: a.end,
    days: a.days,
    pace: a.pace,
    drive: a.drive,
    vibes: a.vibes,
    into: a.into,
    food: a.food,
    activities: a.activities.filter((id) => offered.includes(id)),
  };
}

// The one set kept: the trips, and the answers they were built for.
let kept: { key: string; trips: QuizTrip[] } | null = null;

// A save of a quiz trip still out (the quiz screen's): by which account, for which answers, and what is told when it
// lands (the trip's id, or null if it wasn't saved).
type OutSave = { uid: string; answers: string; landed: Promise<string | null>; land: (id: string | null) => void };
let out: OutSave | null = null;

/**
 * The quiz's save still out, kept here with the trips, outside any screen: a quiz closed while it saved (a slow line)
 * and opened again on the same answers, by the same account, waits for it rather than saving the trip a second time.
 * Any other quiz goes on as ever.
 */
export const tripSave = {
  /** A save sent: what to call when it lands, with the trip's id, or null if it wasn't saved. */
  send(uid: string, state: QuizState): (id: string | null) => void {
    let land: (id: string | null) => void = () => {};
    const landed = new Promise<string | null>((resolve) => (land = resolve));
    const save: OutSave = { uid, answers: JSON.stringify(state), landed, land };
    out = save;
    return (id) => {
      if (out === save) out = null;
      land(id);
    };
  },
  /** This account's save for these answers still out, to wait on; null if there is none. */
  waiting(uid: string | null, state: QuizState): Promise<string | null> | null {
    return out && uid && out.uid === uid && out.answers === JSON.stringify(state) ? out.landed : null;
  },
  /**
   * Every save forgotten, what waits on it told it wasn't saved: a sign-out, whose clean-up drops a save paused for
   * the signal without ever settling it.
   */
  reset() {
    const save = out;
    out = null;
    save?.land(null);
  },
};

/** The trips already built for these answers, or null: for a screen to show them at once, without a wait. */
export function builtTrips(state: QuizState, today: Date): QuizTrip[] | null {
  const ans = builderAnswers(state, today);
  return ans && kept?.key === JSON.stringify(ans) ? kept.trips : null;
}

/**
 * Up to three trips for the quiz's answers. Built once for a set of answers and kept; none until every question
 * is answered.
 */
export function quizTrips(state: QuizState, today: Date): QuizTrip[] {
  const ans = builderAnswers(state, today);
  if (!ans) return [];
  const key = JSON.stringify(ans);
  if (kept?.key !== key) {
    const places: Record<string, BuilderPlace | undefined> = data.places;
    kept = {
      key,
      trips: buildTrips(ans).map((trip) => ({
        ...trip,
        days: trip.days.map((day) => ({
          ...day,
          items: day.items.map((stop) => {
            const p = places[stop.siteId] ?? {};
            return { ...stop, thumb: p.thumb, fallback: p.fallback, category: p.category ?? [], activities: p.activities ?? [] };
          }),
        })),
      })),
    };
  }
  return kept.trips;
}

// The website's addDays: whole days on from a date, by the calendar and not by the phone's clock.
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * One built trip as the app's trip: named by its label, dated day by day from startDate, each stop with an id of
 * its own. Field for field the website's tripBody.
 * newId: a new id for each stop (a random one).
 * has: whether the app has a place. A stop whose place it doesn't have (switched off since the builder's data was
 * made) is dropped, and the rest of its day stays as it was timed.
 */
export function tripBody(trip: BuiltTrip, startDate: string, newId: () => string, has: (siteId: string) => boolean = () => true): TripBody {
  const days = trip.days.map((day, i) => ({
    id: `day_${i + 1}`,
    date: addDays(startDate, i),
    items: day.items
      .filter((stop) => has(stop.siteId))
      .map((stop) => ({
        id: `item_${newId()}`,
        siteId: stop.siteId,
        siteName: stop.siteName,
        slotIndex: stop.slotIndex,
        durationSlots: stop.durationSlots,
        timeLabel: stop.timeLabel,
        durationLabel: stop.durationLabel,
      })),
  }));
  const body: TripBody = { title: trip.label, startDate, endDate: days.length ? days[days.length - 1].date : startDate, days };
  // Last, and only with a town, as the website's adds it.
  if (trip.start) body.startArea = trip.start;
  return body;
}
