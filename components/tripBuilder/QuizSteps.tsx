// The quiz's first seven questions, one component each. The questions, the options, their order and their
// words are the website's (the page half of kiwiguide-site public/plan/quiz.js: its `screens`), drawn from the
// copied lists (quizLogic.js). Each hands its pick back in quizFlow's shape; where it leads is quizFlow's.
// The pieces and their look are in quizParts.
import { useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";

import { AppButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import type { QuizAnswer, QuizState } from "@/lib/tripBuilder/quizFlow";
import { BreakPhoto, DaysSlider, OptionButton, QUIZ_BUTTON, QuizHead, TownCard } from "./quizParts";

type Town = { id: string; name: string; sub: string; out: string; img: string; more?: boolean };
type Season = { id: string; label: string; hint: string; feel: string };

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("@/lib/tripBuilder/quizLogic") as {
  TOWNS: Town[];
  BANDS: { id: string; label: string; hint: string; days: number }[];
  SEASONS: Season[];
  MONTH_NAMES: string[];
  leastFrom: (start: string | null) => number;
  finishCards: (start: string | null, days: number | null, open: boolean) => { home: boolean; towns: string[]; behind: string[] };
  monthsOf: (season: string, today: Date) => { month: number; year: number }[];
  breakLine: (n: 1, st: QuizState) => { head: string; body: string; img: string };
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
};

// The website's own small helpers (its page half, which the copy leaves out).
const town = (id: string | null) => site.TOWNS.find((t) => t.id === id);
const days = (n: number | null) => `${n} ${n === 1 ? "day" : "days"}`;
const or = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`);
// The days picker's quick numbers.
const CHIPS = [3, 5, 7, 10, 12, 14, 17, 21];

/** Queenstown, Christchurch and Picton, then "Somewhere else?" for the rest, open already when one of them is the pick. */
export function StartStep({ state, onAnswer, open, onOpen }: StepProps) {
  const all = open || !!town(state.start)?.more;
  const more = site.TOWNS.filter((t) => t.more);
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
          onPress={() => onAnswer({ step: "start", value: t.id })}
        />
      ))}
      {all ? null : <TownCard img={more[0].img} title="Somewhere else?" line={or(more.map((t) => t.name))} onPress={() => onOpen?.()} />}
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
        t ? <TownCard key={t.id} img={t.img} title={t.name} line={t.out} selected={state.end === t.id} onPress={() => finish(t.id)} /> : null,
      )}
      {cards.behind.length ? (
        <TownCard
          img={town(cards.behind[0])?.img ?? ""}
          title="Somewhere else?"
          line={or(cards.behind.map((id) => town(id)?.name ?? id))}
          onPress={() => onOpen?.()}
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
      <QuizHead small title={b.head} lead={b.body} />
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

const styles = StyleSheet.create({
  // .q-main: a column as tall as the screen has room for, 12 between its parts. The buttons and cards in it
  // take their share of the spare height (quizParts, useShare).
  step: { flexGrow: 1, gap: 12 },
  // The photo break: its photo a little clear of the top row and of the words.
  breakStep: { gap: 24, paddingTop: 12 },
  // .q-next: the button at the foot of the screen.
  foot: { flexGrow: 1, justifyContent: "flex-end" },
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
