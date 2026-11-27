// The trip quiz (docs/plans/app-trip-builder.md). Stages 3 to 5: every question, then the trips built for the
// answers and the picked one in the app's own trip view. Saving it is stage 6.
// A screen of the root stack, as share-frame is: it opens over the tabs, which stay as they were underneath, and
// a guest can take it ((app) is a Slot, one screen at a time, and sends a signed-out visitor to the login).
// The answers are kept on the phone after every tap (useQuiz), so Close loses nothing. Back is the question
// before; the swipe from the left edge, which would leave the whole quiz, is off for this screen (app/_layout).
import { useEffect, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingState, Screen } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import {
  AgeStep,
  BandStep,
  Break2Step,
  BreakStep,
  ChoiceStep,
  DaysStep,
  DriveStep,
  FinishStep,
  FoodStep,
  IntoStep,
  MonthStep,
  PaceStep,
  SeasonStep,
  StartStep,
  VibeStep,
  WaitStep,
  WhoStep,
  tripCardPhotos,
  type Deck,
  type StepProps,
} from "@/components/tripBuilder/QuizSteps";
import { TripReveal } from "@/components/tripBuilder/TripReveal";
import { NIGHT, QUIZ_COLUMN, QuizHeader, fetchAhead, useReduceMotion } from "@/components/tripBuilder/quizParts";
import { tripStep, type Quiz, type QuizAnswer, type QuizStep } from "@/lib/tripBuilder/quizFlow";
import { builtTrips, quizTrips, type QuizTrip } from "@/lib/tripBuilder/quizTrips";
import { useQuiz } from "@/lib/tripBuilder/useQuiz";

// How far along each step is, out of 100: the website's own numbers (PROGRESS in its quiz.js) for the app's steps.
const QUIZ_PROGRESS: Record<QuizStep, number> = {
  start: 5, band: 10, days: 15, finish: 20, break1: 25, season: 30, month: 36, pace: 42, drive: 48,
  who: 53, age: 58, vibe: 63, break2: 67, into: 74, food: 86, choice: 95, reveal: 97,
};

// The questions, drawn in the page under the top row. The second photo break isn't here: it fills the whole
// screen. Nor are the trip cards and the trip, which wait for the trips to be built.
const STEPS: Partial<Record<QuizStep, (props: StepProps) => ReactNode>> = {
  start: StartStep,
  band: BandStep,
  days: DaysStep,
  finish: FinishStep,
  break1: BreakStep,
  season: SeasonStep,
  month: MonthStep,
  pace: PaceStep,
  drive: DriveStep,
  who: WhoStep,
  age: AgeStep,
  vibe: VibeStep,
  into: IntoStep,
  food: FoodStep,
};

// Nothing behind it (a development build reloading onto it): the start screen, where a cold start goes.
const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

// The waiting screen is up for a second in all: long enough to be read, where the website's shows while its data
// loads. The trips are built a third of a second in, once the bar has slid to its place: a build holds the phone
// for up to 0.3 s, and the bar would stop half way.
const WAIT_MS = 1000;
const DRAW_MS = 300;

/**
 * The trips for the answers, on the trip cards and the trip. null on every other step, and while the waiting
 * screen is up.
 */
function useTrips(quiz: Quiz | null, today: Date) {
  const reduce = useReduceMotion();
  const wanted = quiz?.step === "choice" || quiz?.step === "reveal";
  const [trips, setTrips] = useState<QuizTrip[] | null>(null);
  // Onto the trips, or off them (the answers they are built from only change off them): set as the screen is
  // drawn, so no step shows the last one's trips. Trips built before for these answers (back to the last
  // question and on again) are there at once, with no wait.
  const [was, setWas] = useState(false);
  if (wanted !== was) {
    setWas(wanted);
    setTrips(wanted && quiz ? builtTrips(quiz.state, today) : null);
  }
  // The answers to build for, while there is a wait.
  const state = wanted && !trips ? quiz?.state : null;
  useEffect(() => {
    if (!state) return;
    const from = Date.now();
    let show: ReturnType<typeof setTimeout> | undefined;
    // Under reduce motion the bar jumps and nothing is held: built as soon as the waiting screen is drawn, and
    // shown as soon as built.
    const build = setTimeout(
      () => {
        const built = quizTrips(state, today);
        // The cards' photos, fetched while the waiting screen is still up.
        if (built.length > 1) fetchAhead(tripCardPhotos(built).filter(Boolean));
        show = setTimeout(() => setTrips(built), reduce.current ? 0 : Math.max(0, WAIT_MS - (Date.now() - from)));
      },
      reduce.current ? 0 : DRAW_MS,
    );
    return () => {
      clearTimeout(build);
      clearTimeout(show);
    };
  }, [state, today, reduce]);
  return trips;
}

export default function BuildTripScreen() {
  const { quiz, answer, back, settle, startAgain } = useQuiz();
  const insets = useSafeAreaInsets();
  // What the website holds for the visit, above its questions, and so here above ours (each is drawn afresh when
  // it is come back to): "Somewhere else?" tapped on the start and on the finish, so every town is showing, and
  // where the swipe cards were left.
  const [allTowns, setAllTowns] = useState(false);
  const [allEnds, setAllEnds] = useState(false);
  const [deck, setDeck] = useState<Deck | null>(null);
  // The day of the trip that is open (from 0), or none: here, so Back shuts it before it leaves the trip.
  const [openDay, setOpenDay] = useState<number | null>(null);
  // One day for the whole visit: the trips are built for it and dated from it.
  const [today] = useState(() => new Date());
  const trips = useTrips(quiz, today);

  // The root layout holds the splash screen up and only the (app) and (auth) layouts take it down. This
  // screen is outside both, so opened first it would sit under the splash for good (the stage 0 spike did).
  // Opened from a tab there is nothing to take down, and that failure is let go.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // The quiz as it shows. Once the trips are built, the cards and the trip are settled against them (the
  // website's rule: one trip shows on its own, a pick that isn't one of them goes back to the cards)...
  const shown = quiz && trips ? tripStep(quiz.state, quiz.step, trips) : quiz;
  // ...and what that came to is kept, so Back and a quiz opened again start from what was on screen.
  useEffect(() => {
    if (trips) settle(trips);
    // settle is made anew at every draw, and reads the quiz as it stands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, quiz]);

  const step = shown?.step;
  const Step = step ? STEPS[step] : undefined;
  // The second photo break: its photo is the whole screen, the top row drawn over it in white.
  const onPhoto = step === "break2";
  // The picked trip, once the trips are built.
  const trip = step === "reveal" ? trips?.find((t) => t.key === shown?.state.pick) : undefined;

  const onAnswer = (a: QuizAnswer) => {
    // Another start town: its finishes begin with "Somewhere else?" shut again, as on the website.
    if (a.step === "start" && a.value !== quiz?.state.start) setAllEnds(false);
    answer(a);
  };
  const again = () => {
    setAllTowns(false);
    setAllEnds(false);
    setDeck(null);
    startAgain();
  };
  // Back is the question before, so not on the first; from an open day of the trip it is the trip.
  const onBack = !quiz || step === "start" ? undefined : trip && openDay != null ? () => setOpenDay(null) : () => back(quiz.step, trips);
  const held =
    step === "start"
      ? { open: allTowns, onOpen: () => setAllTowns(true) }
      : step === "finish"
        ? { open: allEnds, onOpen: () => setAllEnds(true) }
        : step === "into"
          ? { deck, onDeck: setDeck }
          : null;

  return (
    // The pale page with white buttons on it, as the website's quiz is drawn; the status-bar inset is Screen's.
    // On the photo: its dark fill behind, and the clock in white.
    <Screen padded={false} background={onPhoto ? NIGHT : tokens.colors.bgBase} {...(onPhoto ? { statusBarStyle: "light-content" as const } : null)}>
      {/* First, so it is under the top row: laid over the whole screen, the clock's strip too. */}
      {shown && onPhoto ? <Break2Step state={shown.state} onAnswer={onAnswer} /> : null}
      {/* There from the start, Close with it, while the saved quiz is read. */}
      <QuizHeader progress={step ? QUIZ_PROGRESS[step] : 0} onBack={onBack} onClose={close} onPhoto={onPhoto} />
      {!shown ? (
        <LoadingState />
      ) : onPhoto ? null : trip ? (
        // The trip is the app's own trip view, which scrolls itself.
        <TripReveal state={shown.state} trip={trip} today={today} day={openDay} onDay={setOpenDay} onAgain={again} />
      ) : (
        // The key: every question opens at its top, and the waiting screen is one of its own (so a screen reader
        // is sent on to what comes after it). No bounce when a question fits the screen, so a sideways drag on
        // the days slider or a swipe card stays theirs.
        <ScrollView
          key={Step || trips ? step : "wait"}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
          contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        >
          {/* One centred column on an iPad or an open Duo, until their own layouts (stage 8). */}
          <View style={styles.column}>
            {Step ? (
              <Step state={shown.state} onAnswer={onAnswer} {...held} />
            ) : trips ? (
              <ChoiceStep state={shown.state} trips={trips} onAnswer={onAnswer} />
            ) : (
              <WaitStep />
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // .q-main: as tall as the screen under the top row, so a question's buttons and cards can share it.
  content: { flexGrow: 1, paddingTop: tokens.space.xs, paddingHorizontal: tokens.space.md },
  column: { flexGrow: 1, width: "100%", maxWidth: QUIZ_COLUMN, alignSelf: "center" },
});
