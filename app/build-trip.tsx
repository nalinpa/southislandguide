// The trip quiz (docs/plans/app-trip-builder.md). Stage 3: the first half, start to month.
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
import { BandStep, BreakStep, DaysStep, FinishStep, MonthStep, SeasonStep, StartStep, type StepProps } from "@/components/tripBuilder/QuizSteps";
import { QUIZ_COLUMN, QuizHead, QuizHeader } from "@/components/tripBuilder/quizParts";
import type { QuizAnswer, QuizStep } from "@/lib/tripBuilder/quizFlow";
import { useQuiz } from "@/lib/tripBuilder/useQuiz";

// How far along each step is, out of 100: the website's own numbers (PROGRESS in its quiz.js) for the app's steps.
const QUIZ_PROGRESS: Record<QuizStep, number> = {
  start: 5, band: 10, days: 15, finish: 20, break1: 25, season: 30, month: 36, pace: 42, drive: 48,
  who: 53, age: 58, vibe: 63, break2: 67, into: 74, food: 86, choice: 95, reveal: 97,
};

// The steps built so far. Stage 4 adds pace to food; stage 5 the trips.
const STEPS: Partial<Record<QuizStep, (props: StepProps) => ReactNode>> = {
  start: StartStep,
  band: BandStep,
  days: DaysStep,
  finish: FinishStep,
  break1: BreakStep,
  season: SeasonStep,
  month: MonthStep,
};

// Nothing behind it (a development build reloading onto it): the start screen, where a cold start goes.
const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

export default function BuildTripScreen() {
  const { quiz, answer, back, startAgain } = useQuiz();
  const insets = useSafeAreaInsets();
  // "Somewhere else?" tapped on the start, and on the finish: every town is showing. Held here, above the
  // questions (each is drawn afresh when it is come back to), for the visit, as the website holds its two.
  const [allTowns, setAllTowns] = useState(false);
  const [allEnds, setAllEnds] = useState(false);

  // The root layout holds the splash screen up and only the (app) and (auth) layouts take it down. This
  // screen is outside both, so opened first it would sit under the splash for good (the stage 0 spike did).
  // Opened from a tab there is nothing to take down, and that failure is let go.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const step = quiz?.step;
  const Step = step ? STEPS[step] : undefined;

  const onAnswer = (a: QuizAnswer) => {
    // Another start town: its finishes begin with "Somewhere else?" shut again, as on the website.
    if (a.step === "start" && a.value !== quiz?.state.start) setAllEnds(false);
    answer(a);
  };
  const again = () => {
    setAllTowns(false);
    setAllEnds(false);
    startAgain();
  };
  const behind =
    step === "start"
      ? { open: allTowns, onOpen: () => setAllTowns(true) }
      : step === "finish"
        ? { open: allEnds, onOpen: () => setAllEnds(true) }
        : null;

  return (
    // The pale page with white buttons on it, as the website's quiz is drawn; the status-bar inset is Screen's.
    <Screen padded={false} background={tokens.colors.bgBase}>
      {/* There from the start, Close with it, while the saved quiz is read. Back is the question before, so
          not on the first. */}
      <QuizHeader progress={step ? QUIZ_PROGRESS[step] : 0} onBack={step && step !== "start" ? back : undefined} onClose={close} />
      {quiz ? (
        // The key: every question opens at its top. No bounce when a question fits the screen, so a drag
        // on the days slider stays the slider's.
        <ScrollView
          key={quiz.step}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
          contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        >
          {/* One centred column on an iPad or an open Duo, until their own layouts (stage 8). */}
          <View style={styles.column}>
            {Step ? (
              <Step state={quiz.state} onAnswer={onAnswer} {...behind} />
            ) : (
              // TEMP (stage 4): stands in for pace onward. Start again is here so the quiz can be run again on a phone.
              <View style={styles.soon}>
                <QuizHead title="More questions are coming." />
                <AppButton variant="secondary" fullWidth onPress={again}>
                  Start again
                </AppButton>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <LoadingState />
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
