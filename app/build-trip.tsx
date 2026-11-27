// The trip quiz (docs/plans/app-trip-builder.md). Stages 3 and 4: every question, start to food.
// A screen of the root stack, as share-frame is: it opens over the tabs, which stay as they were underneath, and
// a guest can take it ((app) is a Slot, one screen at a time, and sends a signed-out visitor to the login).
// The answers are kept on the phone after every tap (useQuiz), so Close loses nothing. Back is the question
// before; the swipe from the left edge, which would leave the whole quiz, is off for this screen (app/_layout).
import { useEffect, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton, LoadingState, Screen } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import {
  AgeStep,
  BandStep,
  Break2Step,
  BreakStep,
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
  WhoStep,
  type Deck,
  type StepProps,
} from "@/components/tripBuilder/QuizSteps";
import { NIGHT, QUIZ_COLUMN, QuizHead, QuizHeader } from "@/components/tripBuilder/quizParts";
import type { QuizAnswer, QuizStep } from "@/lib/tripBuilder/quizFlow";
import { useQuiz } from "@/lib/tripBuilder/useQuiz";

// How far along each step is, out of 100: the website's own numbers (PROGRESS in its quiz.js) for the app's steps.
const QUIZ_PROGRESS: Record<QuizStep, number> = {
  start: 5, band: 10, days: 15, finish: 20, break1: 25, season: 30, month: 36, pace: 42, drive: 48,
  who: 53, age: 58, vibe: 63, break2: 67, into: 74, food: 86, choice: 95, reveal: 97,
};

// The questions, drawn in the page under the top row. The second photo break isn't here: it fills the whole
// screen. Nor are the trips (stage 5).
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

export default function BuildTripScreen() {
  const { quiz, answer, back, startAgain } = useQuiz();
  const insets = useSafeAreaInsets();
  // What the website holds for the visit, above its questions, and so here above ours (each is drawn afresh when
  // it is come back to): "Somewhere else?" tapped on the start and on the finish, so every town is showing, and
  // where the swipe cards were left.
  const [allTowns, setAllTowns] = useState(false);
  const [allEnds, setAllEnds] = useState(false);
  const [deck, setDeck] = useState<Deck | null>(null);

  // The root layout holds the splash screen up and only the (app) and (auth) layouts take it down. This
  // screen is outside both, so opened first it would sit under the splash for good (the stage 0 spike did).
  // Opened from a tab there is nothing to take down, and that failure is let go.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const step = quiz?.step;
  const Step = step ? STEPS[step] : undefined;
  // The second photo break: its photo is the whole screen, the top row drawn over it in white.
  const onPhoto = step === "break2";

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
      {quiz && onPhoto ? <Break2Step state={quiz.state} onAnswer={onAnswer} /> : null}
      {/* There from the start, Close with it, while the saved quiz is read. Back is the question before, so
          not on the first. */}
      <QuizHeader progress={step ? QUIZ_PROGRESS[step] : 0} onBack={step && step !== "start" ? back : undefined} onClose={close} onPhoto={onPhoto} />
      {!quiz ? (
        <LoadingState />
      ) : onPhoto ? null : (
        // The key: every question opens at its top. No bounce when a question fits the screen, so a sideways
        // drag on the days slider or a swipe card stays theirs.
        <ScrollView
          key={quiz.step}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
          contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        >
          {/* One centred column on an iPad or an open Duo, until their own layouts (stage 8). */}
          <View style={styles.column}>
            {Step ? (
              <Step state={quiz.state} onAnswer={onAnswer} {...held} />
            ) : (
              // TEMP (stage 5): stands in for the trips ("choice" and "reveal"). Start again is here so the quiz
              // can be run again on a phone.
              <View style={styles.soon}>
                <QuizHead title="Your trip is next." />
                <AppButton variant="secondary" fullWidth onPress={again}>
                  Start again
                </AppButton>
              </View>
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
  soon: { gap: tokens.space.md },
});
