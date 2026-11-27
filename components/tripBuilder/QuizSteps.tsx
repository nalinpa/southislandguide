// The quiz's questions, one component each. The questions, the options, their order and their
// words are the website's (the page half of kiwiguide-site public/plan/quiz.js: its `screens`), drawn from the
// copied lists (quizLogic.js). Each hands its pick back in quizFlow's shape; where it leads is quizFlow's.
// The pieces and their look are in quizParts.
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";

import builderData from "@/assets/data/builder-data.json";
import { AppButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { areaName } from "@/lib/areas";
import type { BuilderAnswers } from "@/lib/tripBuilder";
import type { QuizAnswer, QuizState } from "@/lib/tripBuilder/quizFlow";
import type { QuizTrip } from "@/lib/tripBuilder/quizTrips";
import { BreakPhoto, DaysSlider, OptionButton, PhotoBreak, QUIZ_BUTTON, QuizHead, TownCard, TripCard, fetchAhead } from "./quizParts";
import { SwipeDeck } from "./SwipeDeck";

type Town = { id: string; name: string; sub: string; out: string; img: string; more?: boolean };
type Season = { id: string; label: string; hint: string; feel: string };
type Option<Id = string> = { id: Id; label: string; hint: string };
/** What the swipe cards are dealt from: the builder's places, each with its name and the activities it is tagged with. */
type DeckData = { places: Record<string, { name: string; activities: string[] }> };
/** A swipe card: a kind of place (into), an activity (act) or both, with one real place's photo (site). */
type SiteCard = { id: string; label: string; hint: string; into?: string; act?: string; site: string; img: string; alt: string; credit: string };
/** Where someone is in the swipe cards: the card they are on and the cards said yes to, for one deal (key). */
export type Deck = { idx: number; yes: string[]; key: string };

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("@/lib/tripBuilder/quizLogic") as {
  TOWNS: Town[];
  BANDS: { id: string; label: string; hint: string; days: number }[];
  SEASONS: Season[];
  MONTH_NAMES: string[];
  leastFrom: (start: string | null) => number;
  finishCards: (start: string | null, days: number | null, open: boolean) => { home: boolean; towns: string[]; behind: string[] };
  monthsOf: (season: string, today: Date) => { month: number; year: number }[];
  PACES: Option<BuilderAnswers["pace"]>[];
  DRIVES: Option<BuilderAnswers["drive"]>[];
  WHO: Option[];
  AGES: { id: string; label: string }[];
  VIBES: Option[];
  // A long way in few days: the driving question was skipped (quizFlow sets Happy to drive).
  longDrive: (start: string | null, end: string | null, days: number | null) => boolean;
  // The first day of the trip as the answers have it ("2027-01-01"): which month's activities are on offer.
  startDateFor: (st: QuizState, today: Date) => string;
  // The swipe cards (the website's deck): the cards on offer, a new deck or one come back to, the yes cards
  // behind answers already given, and one card answered (deck: null once the last one is, with the answers in st).
  cardsFor: (data: DeckData, startMonth: number) => SiteCard[];
  deckStart: (ids: string[], picked: string[] | null) => { idx: number; yes: string[] };
  deckYes: (cards: SiteCard[], st: QuizState) => string[] | null;
  deckAnswer: (deck: Deck, cards: SiteCard[], yes: boolean, st: QuizState) => { deck: Deck | null; st: QuizState };
  // 1: the start town's photo, with a head and a body. 2: the website's photo for the vibe, with its credit.
  breakLine: (n: 1 | 2, st: QuizState) => { line: string; head?: string; body?: string; img: string; credit: string };
  // A photo for each trip's card: one of its own places', never one an earlier card has. "": the trip has none.
  tripPhotos: (trips: QuizTrip[]) => string[];
};

export type StepProps = {
  state: QuizState;
  onAnswer: (a: QuizAnswer) => void;
  /**
   * Start and finish: the towns behind "Somewhere else?" are showing. The screen holds it, for the visit as on
   * the website, because a question is drawn afresh each time it is come back to.
   */
  open?: boolean;
  onOpen?: () => void;
  /**
   * The swipe cards: where they were left. Held by the screen too, for the visit as on the website, so leaving
   * the cards part way and coming back carries on from the same card. null: not started, or finished.
   */
  deck?: Deck | null;
  onDeck?: (deck: Deck | null) => void;
  /**
   * The account step: the api turned their sign-in down as a trip was being saved, and they were signed out. It
   * opens on Sign in with this email in. Held by the screen, which saw it happen.
   */
  again?: { email: string } | null;
};

// The website's own small helpers (its page half, which the copy leaves out).
const town = (id: string | null) => site.TOWNS.find((t) => t.id === id);
const days = (n: number | null) => `${n} ${n === 1 ? "day" : "days"}`;
const or = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`);
// The days picker's quick numbers.
const CHIPS = [3, 5, 7, 10, 12, 14, 17, 21];
// The second break's four photos are the website's own files, so they load from it.
const SITE = "https://kiwiguide.app";
// The month the trip starts in, from 0, as the answers have it: which activities' swipe cards are on offer
// (skiing is only offered June to October).
const startMonth = (state: QuizState, today: Date) => +site.startDateFor(state, today).slice(5, 7) - 1;

/** Queenstown, Christchurch and Picton, then "Somewhere else?" for the rest, open already when one of them is the pick. */
export function StartStep({ state, onAnswer, open, onOpen }: StepProps) {
  const all = open || !!town(state.start)?.more;
  const more = site.TOWNS.filter((t) => t.more);
  // "Somewhere else?" was tapped here, and goes: a screen reader's focus moves to the first town it shows.
  const asked = useRef(false);
  return (
    <View style={styles.step}>
      <QuizHead kicker="Plan your South Island trip in a minute" title="Where do you start?" />
      {site.TOWNS.filter((t) => all || !t.more).map((t) => (
        <TownCard
          key={t.id}
          img={t.img}
          title={t.name}
          line={t.sub}
          selected={state.start === t.id}
          focus={asked.current && t.id === more[0].id}
          onPress={() => onAnswer({ step: "start", value: t.id })}
        />
      ))}
      {all ? null : (
        <TownCard
          img={more[0].img}
          title="Somewhere else?"
          line={or(more.map((t) => t.name))}
          onPress={() => {
            asked.current = true;
            onOpen?.();
          }}
        />
      )}
    </View>
  );
}

/** Every rough length this start town can do. */
export function BandStep({ state, onAnswer }: StepProps) {
  const least = site.leastFrom(state.start);
  return (
    <View style={styles.step}>
      <QuizHead kicker={`From ${town(state.start)?.name}`} title="How long have you got?" />
      {site.BANDS.filter((b) => b.days >= least).map((b) => (
        <OptionButton key={b.id} label={b.label} hint={b.hint} selected={state.band === b.id} onPress={() => onAnswer({ step: "band", value: b.id })} />
      ))}
    </View>
  );
}

/** Opens on the days picked before, or the rough length's number; from the fewest the start town's trips take to 21. */
export function DaysStep({ state, onAnswer }: StepProps) {
  const least = site.leastFrom(state.start);
  const band = site.BANDS.find((b) => b.id === state.band);
  const [n, setN] = useState(state.days || Math.max(band?.days ?? least, least));
  const within = (to: number) => Math.max(least, Math.min(21, to));
  // From a button, the new count is also read out, after anything being said: the website's number is a polite
  // live region, and iOS has none. Not from the slider, which reads its own value to a screen reader.
  const press = (to: number) => {
    const next = within(to);
    if (next === n) return;
    setN(next);
    AccessibilityInfo.announceForAccessibilityWithOptions(days(next), { queue: true });
  };
  return (
    <View style={styles.step}>
      <QuizHead kicker={band?.label} title="How many days?" lead={`Pick anything from ${least} to 21.`} />
      <View style={styles.stepper}>
        <TouchableOpacity
          style={[styles.stepBtn, n <= least && styles.stepBtnOff]}
          onPress={() => press(n - 1)}
          disabled={n <= least}
          accessibilityRole="button"
          accessibilityLabel="One day fewer"
        >
          <Minus color={tokens.colors.text} size={28} strokeWidth={2.2} />
        </TouchableOpacity>
        <View testID="days-count" style={styles.count} accessible accessibilityLabel={days(n)}>
          {/* Shrinks to its box before it is cut off, at the largest text sizes. */}
          <Text style={styles.countNumber} numberOfLines={1} adjustsFontSizeToFit>
            {n}
          </Text>
          <Text style={styles.countWord}>days</Text>
        </View>
        <TouchableOpacity
          style={[styles.stepBtn, n >= 21 && styles.stepBtnOff]}
          onPress={() => press(n + 1)}
          disabled={n >= 21}
          accessibilityRole="button"
          accessibilityLabel="One day more"
        >
          <Plus color={tokens.colors.text} size={28} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
      <View style={styles.range}>
        <DaysSlider value={n} min={least} max={21} onChange={(to) => setN(within(to))} />
        {/* The slider says its own ends to a screen reader. */}
        <View testID="days-ends" style={styles.ends} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={styles.end}>{least}</Text>
          <Text style={styles.end}>21</Text>
        </View>
      </View>
      <View style={styles.chips}>
        {CHIPS.filter((c) => c >= least).map((c) => {
          const on = c === n;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => press(c)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={days(c)}
              accessibilityState={{ selected: on }}
            >
              <Text style={styles.chipText}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.foot}>
        <AppButton variant="primary" fullWidth shape={QUIZ_BUTTON} onPress={() => onAnswer({ step: "days", value: n })}>
          Next
        </AppButton>
      </View>
    </View>
  );
}

/** Only the towns the days can reach: the loop first, then the others, the further ones behind "Somewhere else?". */
export function FinishStep({ state, onAnswer, open, onOpen }: StepProps) {
  const home = town(state.start);
  // open already when the pick is one of the towns behind "Somewhere else?"
  const cards = site.finishCards(state.start, state.days, !!open || !!(state.end && state.end !== state.start && town(state.end)?.more));
  const finish = (id: string) => onAnswer({ step: "finish", value: id });
  // "Somewhere else?" was tapped here: the first town that was behind it, for a screen reader's focus to move to.
  const asked = useRef<string | null>(null);
  return (
    <View style={styles.step}>
      <QuizHead kicker={`${days(state.days)} from ${home?.name}`} title="Where does your trip finish?" />
      {cards.home && home ? (
        <TownCard
          home
          img={home.img}
          title={`Finish back in ${home.name}`}
          line="A loop, back where you started"
          selected={state.end === home.id}
          onPress={() => finish(home.id)}
        />
      ) : null}
      {cards.towns.map(town).map((t) =>
        t ? (
          <TownCard
            key={t.id}
            img={t.img}
            title={t.name}
            line={t.out}
            selected={state.end === t.id}
            focus={asked.current === t.id}
            onPress={() => finish(t.id)}
          />
        ) : null,
      )}
      {cards.behind.length ? (
        <TownCard
          img={town(cards.behind[0])?.img ?? ""}
          title="Somewhere else?"
          line={or(cards.behind.map((id) => town(id)?.name ?? id))}
          onPress={() => {
            asked.current = cards.behind[0];
            onOpen?.();
          }}
        />
      ) : null}
    </View>
  );
}

/** The first photo break: the start town's photo, "<Town>, <N> days." and the owner's line about the town. */
export function BreakStep({ state, onAnswer }: StepProps) {
  const b = site.breakLine(1, state);
  return (
    <View style={[styles.step, styles.breakStep]}>
      <BreakPhoto uri={b.img} />
      <QuizHead small title={b.head ?? b.line} lead={b.body} />
      <View style={styles.foot}>
        <AppButton variant="primary" fullWidth shape={QUIZ_BUTTON} onPress={() => onAnswer({ step: "break1" })}>
          Next
        </AppButton>
      </View>
    </View>
  );
}

export function SeasonStep({ state, onAnswer }: StepProps) {
  const from = town(state.start)?.name;
  const fromTo = state.end === state.start ? `From ${from} and back` : `${from} to ${town(state.end)?.name}`;
  const pick = (id: string) => onAnswer({ step: "season", value: id });
  return (
    <View style={styles.step}>
      <QuizHead kicker={`${fromTo} · ${days(state.days)}`} title="Which NZ season are you picking?" lead="Southern hemisphere seasons!" />
      {site.SEASONS.map((s) => (
        <OptionButton key={s.id} label={s.label} hint={`${s.hint}. ${s.feel}`} selected={state.season === s.id} onPress={() => pick(s.id)} />
      ))}
      <OptionButton label="Not sure yet" hint="Set your dates later in the app." selected={state.season === "unsure"} onPress={() => pick("unsure")} />
    </View>
  );
}

/** The season's months still to come, soonest first. today: which year each falls in. */
export function MonthStep({ state, onAnswer, today = new Date() }: StepProps & { today?: Date }) {
  const season = site.SEASONS.find((s) => s.id === state.season);
  if (!season) return null;
  return (
    <View style={styles.step}>
      <QuizHead kicker={`NZ ${season.label.toLowerCase()} · ${season.hint}`} title="Which month?" />
      {site.monthsOf(season.id, today).map((m) => (
        <OptionButton
          key={m.month}
          label={`${site.MONTH_NAMES[m.month]} ${m.year}`}
          selected={state.month?.month === m.month}
          onPress={() => onAnswer({ step: "month", value: m })}
        />
      ))}
      <OptionButton label="Not sure which month" onPress={() => onAnswer({ step: "month", value: null })} />
    </View>
  );
}

/** "Nice. Summer in January." over it: what was said about when, or "Noted." when the season isn't known. */
export function PaceStep({ state, onAnswer }: StepProps) {
  const season = site.SEASONS.find((s) => s.id === state.season);
  const said = !season ? "Noted." : state.month ? `Nice. ${season.label} in ${site.MONTH_NAMES[state.month.month]}.` : `Nice. ${season.label}.`;
  return (
    <View style={styles.step}>
      <QuizHead kicker={said} title="How active?" />
      {site.PACES.map((p) => (
        <OptionButton key={p.id} label={p.label} hint={p.hint} selected={state.pace === p.id} onPress={() => onAnswer({ step: "pace", value: p.id })} />
      ))}
    </View>
  );
}

/** Not shown on a long way in few days: quizFlow goes from the pace straight to who, and Back comes straight back. */
export function DriveStep({ state, onAnswer }: StepProps) {
  return (
    <View style={styles.step}>
      <QuizHead kicker={site.PACES.find((p) => p.id === state.pace)?.label} title="How much driving?" />
      {site.DRIVES.map((d) => (
        <OptionButton key={d.id} label={d.label} hint={d.hint} selected={state.drive === d.id} onPress={() => onAnswer({ step: "drive", value: d.id })} />
      ))}
    </View>
  );
}

export function WhoStep({ state, onAnswer }: StepProps) {
  // The driving picked over it, or the pace when the driving wasn't asked (a limit they never picked would read oddly).
  const said = site.longDrive(state.start, state.end, state.days)
    ? site.PACES.find((p) => p.id === state.pace)?.label
    : site.DRIVES.find((d) => d.id === state.drive)?.hint;
  return (
    <View style={styles.step}>
      <QuizHead kicker={said} title="Who’s travelling?" />
      {site.WHO.map((w) => (
        <OptionButton key={w.id} label={w.label} hint={w.hint} selected={state.who === w.id} onPress={() => onAnswer({ step: "who", value: w.id })} />
      ))}
    </View>
  );
}

/** For the numbers only, so it can be skipped: Skip is the button at the foot. */
export function AgeStep({ state, onAnswer }: StepProps) {
  const pick = (id: string) => onAnswer({ step: "age", value: id });
  return (
    <View style={styles.step}>
      <QuizHead kicker={site.WHO.find((w) => w.id === state.who)?.label} title="How old are you?" />
      {site.AGES.map((a) => (
        <OptionButton key={a.id} label={a.label} selected={state.age === a.id} onPress={() => pick(a.id)} />
      ))}
      <View style={styles.foot}>
        <AppButton variant="primary" fullWidth shape={QUIZ_BUTTON} onPress={() => pick("skip")}>
          Skip
        </AppButton>
      </View>
    </View>
  );
}

/** Several can be ticked, or none: the button at the foot is Next once one is, Skip until then. */
export function VibeStep({ state, onAnswer }: StepProps) {
  const [ticked, setTicked] = useState<string[]>(state.vibes ?? []);
  const tick = (id: string) => setTicked((now) => (now.includes(id) ? now.filter((v) => v !== id) : [...now, id]));
  // In the website's order, as it keeps them, whatever order they were tapped in.
  const picks = site.VIBES.map((v) => v.id).filter((id) => ticked.includes(id));
  const next = () => onAnswer({ step: "vibe", value: picks });
  // The break that follows is a photo filling the screen. Which one is known from the ticks, so it is fetched
  // now and the break opens on it.
  const photo = SITE + site.breakLine(2, { ...state, vibes: picks }).img;
  useEffect(() => fetchAhead([photo]), [photo]);
  return (
    <View style={styles.step}>
      <QuizHead title="What’s the vibe?" lead="Pick as many as you like." />
      {site.VIBES.map((v) => (
        <OptionButton key={v.id} box label={v.label} hint={v.hint} selected={ticked.includes(v.id)} onPress={() => tick(v.id)} />
      ))}
      <View style={styles.foot}>
        <AppButton variant="primary" fullWidth shape={QUIZ_BUTTON} onPress={next}>
          {ticked.length ? "Next" : "Skip"}
        </AppButton>
      </View>
    </View>
  );
}

/**
 * The second photo break: the website's photo for the first vibe ticked, the whole screen, with its line and its
 * credit (the four are Creative Commons photos, so the credit shows). Drawn by the screen under its top row.
 */
export function Break2Step({ state, onAnswer, today = new Date(), data = builderData }: StepProps & { today?: Date; data?: DeckData }) {
  const b = site.breakLine(2, state);
  // The swipe cards are next: their first two photos are fetched while this shows, so they open with a photo.
  const month = startMonth(state, today);
  useEffect(() => fetchAhead(site.cardsFor(data, month).slice(0, 2).map((c) => c.img)), [data, month]);
  return (
    <PhotoBreak uri={SITE + b.img} line={b.line} credit={b.credit}>
      <AppButton variant="primary" fullWidth shape={QUIZ_BUTTON} onPress={() => onAnswer({ step: "break2" })}>
        Next
      </AppButton>
    </PhotoBreak>
  );
}

/**
 * The swipe cards: a card for each kind of place and each activity on offer, yes or no to each. The last card's
 * answer hands the quiz both lists.
 * today: for the month the trip starts in. data: the builder's places.
 */
export function IntoStep({ state, onAnswer, deck, onDeck, today = new Date(), data = builderData }: StepProps & { today?: Date; data?: DeckData }) {
  const month = startMonth(state, today);
  const cards = useMemo(() => site.cardsFor(data, month), [data, month]);
  const ids = cards.map((c) => c.id);
  const key = ids.join();
  // The deck as it was left, unless the cards on offer have changed since (the website's rule). Otherwise it is
  // dealt now: from the first card, or, back at a deck already answered, on its last card with that card's yes
  // taken back.
  const now: Deck = deck && deck.key === key ? deck : { ...site.deckStart(ids, site.deckYes(cards, state)), key };
  const count = `${now.idx + 1} of ${cards.length}`;
  // As the website words the credit on a card: the place in the photo, then whose photo it is.
  const face = (c: SiteCard) => ({ id: c.id, label: c.label, hint: c.hint, img: c.img, alt: c.alt, credit: `${data.places[c.site]?.name}. Photo: ${c.credit}` });
  const answer = (yes: boolean) => {
    const next = site.deckAnswer(now, cards, yes, state);
    onDeck?.(next.deck);
    if (!next.deck) onAnswer({ step: "into", value: { into: next.st.into ?? [], activities: next.st.activities ?? [] } });
  };
  return (
    <View style={styles.step}>
      <QuizHead
        title="What are you into?"
        under={
          <>
            <Text style={styles.deckCount}>{count}</Text> · Swipe right for yes, left for no.
          </>
        }
      />
      <SwipeDeck
        card={face(cards[now.idx])}
        next={now.idx + 1 < cards.length ? face(cards[now.idx + 1]) : undefined}
        count={count}
        first={now.idx === 0}
        onAnswer={answer}
      />
    </View>
  );
}

export function FoodStep({ state, onAnswer }: StepProps) {
  return (
    <View style={styles.step}>
      <QuizHead kicker="Nearly there" title="Food tips?" lead="Cafés and places to eat, placed along each day." />
      <OptionButton label="Yes" hint="Add the good places to eat" selected={state.food === true} onPress={() => onAnswer({ step: "food", value: true })} />
      <OptionButton label="No" hint="Just the places to see" selected={state.food === false} onPress={() => onAnswer({ step: "food", value: false })} />
    </View>
  );
}

/**
 * While the trips are built: the website's waiting words. failed: building them failed, and its words for a load
 * that failed stand in. Its way on is Start again: trying the same answers again would build them the same way.
 * With one trip there are no cards: the screen stays up while that trip is saved (the screen's), and says why when it
 * can't be. offline: no signal, in Add to Trip's words (it is saved once the signal is back). saveError: the save
 * failed, in the app's words, with Try Again (onRetry) and Start again.
 */
export function WaitStep({
  failed,
  offline,
  saveError,
  onRetry,
  onAgain,
}: {
  failed?: boolean;
  offline?: boolean;
  saveError?: string | null;
  onRetry?: () => void;
  onAgain?: () => void;
}) {
  if (failed || saveError) {
    return (
      <View style={styles.step}>
        <QuizHead title="Something went wrong" lead={saveError ?? "The trips would not load."} />
        <View style={styles.foot}>
          {saveError ? (
            <AppButton variant="primary" fullWidth shape={QUIZ_BUTTON} onPress={onRetry}>
              Try Again
            </AppButton>
          ) : null}
          <AppButton variant={saveError ? "ghost" : "primary"} fullWidth shape={QUIZ_BUTTON} onPress={onAgain}>
            Start again
          </AppButton>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.step}>
      <QuizHead kicker="One moment" title="Picking the places that fit you…" />
      {offline ? <Text style={styles.offline}>Reconnect to Add</Text> : null}
    </View>
  );
}

/**
 * A photo for each trip's card, as the website picks them. A place with no photo of its own has its kind's
 * stand-in, which is one of the website's files. "": no photo.
 */
export const tripCardPhotos = (trips: QuizTrip[]) => site.tripPhotos(trips).map((p) => (p.startsWith("/") ? SITE + p : p));

// The website's routeLine: the start town, then the town each day ends in, a town said once while the trip stays in it.
function townsOf(trip: QuizTrip) {
  const names = [areaName(trip.start)];
  for (const d of trip.days) if (names[names.length - 1] !== areaName(d.town)) names.push(areaName(d.town));
  const line = names.join(", ");
  return line.length > 110 ? `${line.slice(0, 110).replace(/,?\s+\S*$/, "")}…` : line;
}

/**
 * The trips that fit, a card each (one trip: one card): the app's hand-checked trips first, then the ones built for
 * the answers. A tap picks the trip, which the screen saves and opens in Trips; the one saved last is marked.
 * saving: the trip being saved, its card busy and every card held till it is done. offline: no signal, so every card
 * is held, as Add to Trip holds its own (a save would only wait for it). onAgain: Start again, at the foot.
 */
export function ChoiceStep({
  state,
  onAnswer,
  trips,
  saving = null,
  offline = false,
  onAgain,
}: StepProps & { trips: QuizTrip[]; saving?: string | null; offline?: boolean; onAgain?: () => void }) {
  const photos = tripCardPhotos(trips);
  const from = town(state.start)?.name;
  const where = state.end === state.start ? `${from} and back` : `${from} to ${town(state.end)?.name}`;
  return (
    <View style={styles.step}>
      <QuizHead kicker={`${trips.length === 1 ? "1 trip fits" : `${trips.length} trips fit`} ${where} · ${days(state.days)}`} title="Which one sounds like you?" />
      {offline ? <Text style={styles.offline}>Reconnect to Add</Text> : null}
      {trips.map((t, n) => (
        <TripCard
          key={t.key}
          img={photos[n]}
          badge={t.kind === "built" ? "Built for you" : "Hand-checked trip"}
          checked={t.kind !== "built"}
          title={t.label}
          line={townsOf(t)}
          foot={`${days(t.days.length)} · ${t.end === t.start ? `Loop · back in ${areaName(t.start)}` : `Ends in ${areaName(t.end)}`}`}
          selected={state.pick === t.key}
          busy={saving === t.key}
          disabled={saving !== null || offline}
          onPress={() => onAnswer({ step: "choice", value: t.key })}
        />
      ))}
      <View style={styles.foot}>
        <AppButton variant="ghost" fullWidth disabled={saving !== null} onPress={onAgain}>
          Start again
        </AppButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // .q-main: a column as tall as the screen has room for, 12 between its parts. The buttons and cards in it
  // take their share of the spare height (quizParts, useShare).
  step: { flexGrow: 1, gap: 12 },
  // The photo break: its photo a little clear of the top row and of the words.
  breakStep: { gap: 24, paddingTop: 12 },
  // The swipe cards' count, in bold in the line under the question.
  deckCount: { fontWeight: "800" },
  // No signal: Add to Trip's quiet line for the same, over the cards (its nearby list's), or on the waiting screen.
  offline: { fontSize: 14, color: tokens.colors.textMuted },
  // .q-next: the button at the foot of the screen (Try Again and Start again, when a save failed).
  foot: { flexGrow: 1, justifyContent: "flex-end", gap: 8 },
  // .q-stepper, .q-step and .q-num: 64 round buttons either side of a large count.
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24, marginTop: 4 },
  stepBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: tokens.colors.line,
    backgroundColor: tokens.colors.bgCard,
  },
  // At the fewest days or at 21.
  stepBtnOff: { opacity: 0.4 },
  count: { minWidth: 110, flexShrink: 1, alignItems: "center" },
  countNumber: { fontSize: 64, lineHeight: 68, fontWeight: "800", color: tokens.colors.text },
  countWord: { fontSize: 17, fontWeight: "600", color: tokens.colors.text2 },
  // .q-range and .q-ends: the slider a little in from the sides, its ends named under it.
  range: { marginHorizontal: 12 },
  ends: { flexDirection: "row", justifyContent: "space-between" },
  end: { fontSize: 13, fontWeight: "600", color: tokens.colors.text2 },
  // .q-chips and .q-chip; the one the count is on has the picked option's teal.
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  chip: {
    minWidth: 48,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: tokens.colors.line,
    borderRadius: 12,
    backgroundColor: tokens.colors.bgCard,
  },
  chipOn: { borderColor: tokens.colors.selected, backgroundColor: tokens.colors.selFill },
  chipText: { fontSize: 17, fontWeight: "600", color: tokens.colors.text },
});


