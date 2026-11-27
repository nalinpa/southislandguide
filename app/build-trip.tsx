// The trip quiz (docs/plans/app-trip-builder.md). Stages 3 to 6: every question, the account step for someone
// not signed in, then the trips built for the answers as cards. A trip picked is saved as their trip and opens in
// the Trips tab (owner, 2026-11-27: "save on pick").
// A screen of the root stack, as share-frame is: it opens over the tabs, which stay as they were underneath, and
// a guest can take it ((app) is a Slot, one screen at a time, and sends a signed-out visitor to the login).
// The answers are kept on the phone after every tap (useQuiz), so Close loses nothing. Back is the question
// before; the swipe from the left edge, which would leave the whole quiz, is off for this screen (app/_layout).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useNetInfo } from "@react-native-community/netinfo";
import * as SplashScreen from "expo-splash-screen";
import * as Sentry from "@sentry/react-native";
import { ApiError } from "@blacksands/client";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingState, Screen } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { logEvent } from "@/lib/analytics";
import { auth } from "@/lib/firebase";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { usePlaceLookup } from "@/lib/hooks/usePlaceLookup";
import { useSession } from "@/lib/providers/SessionProvider";
import { itineraryService } from "@/lib/services/itineraryService";
import { clearLocalUserData } from "@/lib/services/userService";
import type { Itinerary } from "@/lib/models";
import { AccountStep } from "@/components/tripBuilder/AccountStep";
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
import { NIGHT, QUIZ_COLUMN, QuizHeader, fetchAhead, useReduceMotion } from "@/components/tripBuilder/quizParts";
import { accountStep, type Quiz, type QuizAnswer, type QuizState, type QuizStep } from "@/lib/tripBuilder/quizFlow";
import { builtTrips, quizTrips, tripBody, tripMeasure, tripSave, tripStart, type QuizTrip } from "@/lib/tripBuilder/quizTrips";
import { holdsQuiz } from "@/lib/tripBuilder/quizStorage";
import { markReplaced } from "@/lib/tripReplaced";
import { useQuiz } from "@/lib/tripBuilder/useQuiz";

// How far along each step is, out of 100: the website's own numbers (PROGRESS in its quiz.js) for the app's steps.
const QUIZ_PROGRESS: Record<QuizStep, number> = {
  start: 5, band: 10, days: 15, finish: 20, break1: 25, season: 30, month: 36, pace: 42, drive: 48,
  who: 53, age: 58, vibe: 63, break2: 67, into: 74, food: 86, account: 93, choice: 95,
};

// The questions and the account step, drawn in the page under the top row. The second photo break isn't here: it
// fills the whole screen. Nor are the trip cards, which wait for the trips to be built.
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
  account: AccountStep,
};

// Nothing behind it (a development build reloading onto it): the start screen, where a cold start goes.
const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

// The waiting screen is up for a second in all: long enough to be read, where the website's shows while its data
// loads. The trips are built a third of a second in, once the bar has slid to its place: a build holds the phone
// for up to 0.3 s, and the bar would stop half way.
const WAIT_MS = 1000;
const DRAW_MS = 300;

// The app's own words, New Trip's: for a trip that wasn't saved, and for dates another trip has.
const SAVE_FAILED = "Couldn't save the trip. Try again.";
const DATES_TAKEN = "Those dates overlap an existing trip. Pick a different range.";

/**
 * The trips for the answers, on the trip cards. null on every other step, and while the waiting screen is up.
 * failed: building them threw, and they aren't tried again until the cards are left.
 */
function useTrips(quiz: Quiz | null, today: Date) {
  const reduce = useReduceMotion();
  const wanted = quiz?.step === "choice";
  const [trips, setTrips] = useState<QuizTrip[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Onto the cards, or off them (the answers they are built from only change off them): set as the screen is
  // drawn, so no step shows the last one's trips. Trips built before for these answers (back to the last
  // question and on again) are there at once, with no wait.
  const [was, setWas] = useState(false);
  if (wanted !== was) {
    setWas(wanted);
    setTrips(wanted && quiz ? builtTrips(quiz.state, today) : null);
    setFailed(false);
  }
  // The answers to build for, while there is a wait.
  const state = wanted && !trips && !failed ? quiz?.state : null;
  useEffect(() => {
    if (!state) return;
    const from = Date.now();
    let show: ReturnType<typeof setTimeout> | undefined;
    // Under reduce motion the bar jumps and nothing is held: built as soon as the waiting screen is drawn, and
    // shown as soon as built.
    const build = setTimeout(
      () => {
        let built: QuizTrip[];
        try {
          built = quizTrips(state, today);
          // The cards' photos, fetched while the waiting screen is still up.
          if (built.length > 1) fetchAhead(tripCardPhotos(built).filter(Boolean));
        } catch (e) {
          // Thrown in a timer, nothing above would catch it, and a release build would close. Sent on, so the
          // fault in the rules for these answers can be found.
          Sentry.captureException(e);
          setFailed(true);
          return;
        }
        show = setTimeout(() => setTrips(built), reduce.current ? 0 : Math.max(0, WAIT_MS - (Date.now() - from)));
      },
      reduce.current ? 0 : DRAW_MS,
    );
    return () => {
      clearTimeout(build);
      clearTimeout(show);
    };
  }, [state, today, reduce]);
  return { trips, failed };
}

/**
 * Picking a trip saves it as their trip, with the app's own save, and opens it on the Trips tab. One trip each
 * (PLANNER.MAX_ITINERARIES): a trip they have already is saved over, after asking in Start a New Trip's words. With
 * more than one (an account from before the cap), the one the Trips tab lists first, as the api lists them: the
 * newest first, or the one whose menu the quiz was opened from (replace). saving: the trip being saved, or waited on.
 * done: these answers are done with (saved, or the one trip's Replace cancelled): the screen clears the quiz.
 * signedOut: the api turned their sign-in down, and they were signed out to sign in again, with this email; keep:
 * then saves the quiz on screen back to the phone, once the sign-out's clean-up has cleared it, if the copy there was
 * this quiz's. saveError: the one trip that fits, saved by itself, couldn't be (the app's words): it has no card to
 * tap again, so the waiting screen says so (forget: says nothing of it again, as the quiz starts again).
 */
function usePickToSave({
  today,
  done,
  signedOut,
  keep,
  replace,
}: {
  today: Date;
  done: (state: QuizState) => void;
  signedOut: (email: string) => void;
  keep: () => void;
  replace?: string;
}) {
  const { itineraries, addFlow, saveItinerary } = useItineraries();
  const { places, ready, refresh: refreshPlaces } = usePlaceLookup();
  const { session, enableGuest } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // A save under way. Not the state: two taps that land before the cards are held each bring an alert of their own
  // on iPhone, and each alert's Continue holds the saving of the draw it came from.
  const inFlight = useRef(false);
  // Closed while a save was out: the trip is still saved, but there is no quiz to move on from.
  const open = useRef(true);
  useEffect(
    () => () => {
      open.current = false;
    },
    [],
  );

  // auto: the one trip that fits, saved by itself, whose waiting screen says what went wrong (a card's tap is told
  // in an alert, over the cards). state: the answers the save was for.
  const failed = async (e: unknown, state: QuizState, auto = false) => {
    if (open.current) setSaving(null);
    if (!(e instanceof ApiError && e.status === 401)) {
      const words = e instanceof ApiError && e.status === 409 ? DATES_TAKEN : SAVE_FAILED;
      if (!auto) Alert.alert(words);
      else if (open.current) setSaveError(words);
      return;
    }
    // The api no longer takes their sign-in: signed out here as the Account tab signs out, but as a guest, so the
    // tabs under the quiz stay where they are, and the quiz goes back to its account step to sign in again with the
    // email they had (the website's way, quiz.js 961–964). Read before signing out, and handed over first: the step
    // takes it as it opens.
    // The clean-up clears the quiz on the phone, as any sign-out does: once it has, the answers on screen are saved
    // back, whatever else has saved since. Only if the copy there was this quiz's: a quiz closed while its save was
    // out puts nothing back over one begun since.
    const ours = await holdsQuiz(state);
    const { uid: signedOutUid, email } = auth.currentUser ?? {};
    signedOut(email ?? "");
    await enableGuest();
    await auth.signOut();
    await clearLocalUserData(signedOutUid);
    if (ours) keep();
  };

  // Which of the trip's places the app has. The phone's copy of the place list can be a day old, so when it lacks
  // any of them (or isn't in yet) it is fetched afresh first: only a place still missing then is left off, as one
  // switched off since the builder's data was made. With no list to go on at all, every stop is kept.
  const placesKept = async (trip: QuizTrip) => {
    const has = (id: string) => !!places(id);
    if (ready && trip.days.every((d) => d.items.every((i) => has(i.siteId)))) return has;
    let list: { id: string }[] = [];
    try {
      list = (await refreshPlaces()) ?? [];
    } catch {
      // not fetched: decided below as if no list were in
    }
    const fresh = new Set(list.map((p) => p.id));
    return list.length ? (id: string) => fresh.has(id) : () => true;
  };

  const save = async (trip: QuizTrip, state: QuizState, over?: Itinerary, auto = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(trip.key);
    let id: string;
    const landed = tripSave.send(uid ?? "", state);
    try {
      const body = tripBody(trip, tripStart(state, today), randomUUID, await placesKept(trip));
      id = await saveItinerary(over ? { id: over.id, ...body } : body);
    } catch (e) {
      inFlight.current = false;
      landed(null);
      return failed(e, state, auto);
    }
    landed(id);
    // Saved over as a whole: the trip's screen drops an edit it still held of the trip replaced (lib/tripReplaced).
    if (over) markReplaced(over.id);
    done(state);
    // The website's event, its params with it (measureParams); replaced as words, as the website's true or false.
    // And who's travelling and how old, which the quiz asks for analytics only: in the app they count here, at the
    // finish (owner, 2026-11-28: "steps dont matter in the app only start and finish").
    logEvent("trip_saved", {
      trip: trip.key,
      replaced: String(!!over),
      ...tripMeasure(trip, state),
      who: state.who ?? "none",
      age: state.age ?? "none",
    });
    // The quiz is closed under the trip, so Back from it is the Trips tab's own and never comes back into the quiz.
    if (open.current) router.dismissTo({ pathname: "/(app)/(tabs)/itinerary/[itineraryId]", params: { itineraryId: id } });
  };

  // The trip a pick saves over: the one whose menu the quiz came from, or the newest.
  const theirs = (list: Itinerary[]) => list.find((i) => i.id === replace) ?? list[0];

  // auto: the one trip that fits, taken as picked with no tap (the screen's), behind its waiting screen.
  const pick = async (trip: QuizTrip, state: QuizState, auto = false) => {
    if (saving || inFlight.current) return;
    setSaveError(null);
    // A save of this quiz's own still out (it was closed while that save went, and opened again): waited for, the
    // card busy, rather than saving a second time; the trip it saved is opened, or if it wasn't, this goes on as ever.
    const out = tripSave.waiting(uid, state);
    if (out) {
      setSaving(trip.key);
      const saved = await out;
      if (!open.current) return;
      if (saved) {
        done(state);
        router.dismissTo({ pathname: "/(app)/(tabs)/itinerary/[itineraryId]", params: { itineraryId: saved } });
        return;
      }
      setSaving(null);
    }
    let mine = theirs(itineraries);
    // Their trips aren't in yet (just signed in, say): the card waits for them, then goes on as ever. For the one
    // trip, taken with no tap, they are fetched afresh anyway: a trip made since on the website or another phone is
    // asked about, not saved beside.
    if (addFlow === null || auto) {
      setSaving(trip.key);
      try {
        mine = theirs(await itineraryService.getMyItineraries());
      } catch (e) {
        return failed(e, state, auto);
      }
      if (!open.current) return;
      setSaving(null);
    }
    const over = mine;
    if (!over) return save(trip, state, undefined, auto);
    // Cancel keeps their trip. From a card, the cards stay; for the one trip, which has none, the quiz is closed,
    // back to where they came from, and done with, as after a save: opened again, it is its first question.
    Alert.alert("Start a New Trip?", `It replaces ${over.title || "My Trip"} and its places.`, [
      {
        text: "Cancel",
        style: "cancel",
        ...(auto
          ? {
              onPress: () => {
                done(state);
                close();
              },
            }
          : null),
      },
      { text: "Continue", onPress: () => void save(trip, state, over, auto) },
    ]);
  };

  return { saving, saveError, pick, forget: () => setSaveError(null) };
}

export default function BuildTripScreen() {
  const { quiz, answer, back, settle, startAgain, clear, keep } = useQuiz();
  // The way in, for analytics: the tour's last step, the Trips tab and the trip's menu say which they are. The menu
  // says which trip it is, the one a trip picked here replaces.
  const { from, trip: replace } = useLocalSearchParams<{ from?: string; trip?: string }>();
  const way = from === "tour" || from === "trips" || from === "menu" ? from : "other";
  const { session } = useSession();
  // Whether someone is signed in. null while the phone is still reading it: nothing is decided until it knows.
  const signedIn = session.status === "loading" ? null : session.status === "authed";
  const insets = useSafeAreaInsets();
  // What the website holds for the visit, above its questions, and so here above ours (each is drawn afresh when
  // it is come back to): "Somewhere else?" tapped on the start and on the finish, so every town is showing, and
  // where the swipe cards were left.
  const [allTowns, setAllTowns] = useState(false);
  const [allEnds, setAllEnds] = useState(false);
  const [deck, setDeck] = useState<Deck | null>(null);
  // The api turned their sign-in down as a trip was saved: the account step then opens on Sign in with this email.
  const [again, setAgain] = useState<{ email: string } | null>(null);
  // One day for the whole visit: the trips are built for it and dated from it.
  const [today] = useState(() => new Date());
  // No signal, as Add to Trip judges it: a save would only wait for it, so the cards are held, as its are.
  const netInfo = useNetInfo();
  const offline = netInfo.isConnected === false || netInfo.isInternetReachable === false;

  // The root layout holds the splash screen up and only the (app) and (auth) layouts take it down. This
  // screen is outside both, so opened first it would sit under the splash for good (the stage 0 spike did).
  // Opened from a tab there is nothing to take down, and that failure is let go.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // The quiz as it shows: the account step and the cards settled against the sign-in (the website's rule: an
  // account before any trip, and someone signed in goes on past the account step). null until the saved quiz is
  // read, and on those steps until who is signed in is known...
  const shown = quiz && accountStep(quiz, signedIn);
  const { trips, failed } = useTrips(shown, today);
  // One quiz_start each time the quiz is opened, as the website sends one a visit (quiz.js 395–396): none for a
  // quiz opened with its start town already answered, and Start again doesn't send another (its 921).
  const started = useRef<boolean | null>(null);
  if (quiz && started.current === null) started.current = !!quiz.state.start;
  // Each answer taken. The first start town of a visit begins the quiz for analytics, once it is taken: an answer
  // left out (a second tap, or one with a Back, before the screen caught up) sends nothing. In the app only the
  // start and the finish count (owner, 2026-11-28: "steps dont matter in the app only start and finish"): no event
  // for each answer, as the website sends, and none on Back.
  const take = (a: QuizAnswer) => {
    if (!answer(a)) return;
    if (a.step === "start" && !started.current) {
      started.current = true;
      logEvent("quiz_start", { from: way });
    }
  };
  // Saved, the quiz is done with: cleared, so it opens next on its first question (owner, 2026-11-28: "the trip
  // builder doesnt really reset").
  // The one trip that fits is taken once for a set of answers (below); after a sign-in the api turned down, once
  // more as they sign in again.
  const tookOnly = useRef<QuizTrip[] | null>(null);
  const { saving, saveError, pick, forget } = usePickToSave({
    today,
    done: clear,
    signedOut: (email) => {
      tookOnly.current = null;
      setAgain({ email });
    },
    keep,
    replace,
  });
  // ...and what that came to is kept, so Back and a quiz opened again start from what was on screen. Signing in
  // on the account step is a change of session, not a tap: this is what moves the quiz on from it.
  useEffect(() => {
    settle(signedIn);
    // settle is made anew at every draw, and reads the quiz as it stands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, signedIn]);

  const step = shown?.step;
  const Step = step ? STEPS[step] : undefined;
  // The second photo break: its photo is the whole screen, the top row drawn over it in white.
  const onPhoto = step === "break2";

  // One trip fits: there is nothing to choose, so the cards never show (owner, 2026-11-28: "showing that screen is
  // confusing just skip the trip picking screen if theres only one trip"). The waiting screen stays up while it is
  // taken as picked, the way a tap on its card takes it, asking first over a trip they have (the website skips its
  // cards for one trip too: quiz.js 731). Once for a set of answers, which build one set of trips, kept: a failed
  // save has Try Again (the waiting screen's). Held, as a tap is, while there's no signal, and taken once it's back.
  const only = trips?.length === 1 ? trips[0] : null;
  const cards = only ? null : trips;
  useEffect(() => {
    if (step !== "choice" || !shown || !signedIn || offline || !only || tookOnly.current === trips) return;
    tookOnly.current = trips;
    void pick(only, shown.state, true);
    // pick and shown are made anew at every draw: this goes by the trips and by what holds a tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, trips, signedIn, offline]);
  const retry = () => only && shown && void pick(only, shown.state, true);

  const onAnswer = (a: QuizAnswer) => {
    // A trip picked from its card: saved, and opened in Trips. The cards only show once signed in.
    if (a.step === "choice") {
      const trip = trips?.find((t) => t.key === a.value);
      if (trip && shown && signedIn) void pick(trip, shown.state);
      return;
    }
    // Another start town: its finishes begin with "Somewhere else?" shut again, as on the website.
    if (a.step === "start" && a.value !== quiz?.state.start) setAllEnds(false);
    take(a);
  };
  // Nothing of the quiz before is kept: not its error over the one trip, and the same answers again are a new set
  // to take their one trip by itself.
  const restart = () => {
    setAllTowns(false);
    setAllEnds(false);
    setDeck(null);
    setAgain(null);
    forget();
    tookOnly.current = null;
    startAgain();
  };
  // Back is the question before, so not on the first. None from the waiting screen (the trips being built, the
  // build failed, or the one trip that fits being saved), and none while one is being saved.
  const onBack =
    !quiz || !shown || step === "start" || (step === "choice" && !cards) || saving ? undefined : () => back(quiz.step, signedIn === true);
  const held =
    step === "start"
      ? { open: allTowns, onOpen: () => setAllTowns(true) }
      : step === "finish"
        ? { open: allEnds, onOpen: () => setAllEnds(true) }
        : step === "into"
          ? { deck, onDeck: setDeck }
          : step === "account"
            ? { again }
            : null;

  return (
    // The pale page with white buttons on it, as the website's quiz is drawn; the status-bar inset is Screen's.
    // On the photo: its dark fill behind, and the clock in white.
    <Screen padded={false} background={onPhoto ? NIGHT : tokens.colors.bgBase} {...(onPhoto ? { statusBarStyle: "light-content" as const } : null)}>
      {/* First, so it is under the top row: laid over the whole screen, the clock's strip too. */}
      {shown && onPhoto ? <Break2Step state={shown.state} onAnswer={onAnswer} /> : null}
      {/* There from the start, Close with it, while the saved quiz and the sign-in are read. */}
      <QuizHeader progress={step ? QUIZ_PROGRESS[step] : 0} onBack={onBack} onClose={close} onPhoto={onPhoto} />
      {!shown ? (
        <LoadingState />
      ) : onPhoto ? null : (
        // The account step's form clear of the keyboard, as the login screen keeps its own: the page shrinks to
        // above it and scrolls, a tap on a button with the keyboard up is the button's, and a drag down puts the
        // keyboard away.
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.fill}>
          {/* The key: every question opens at its top, and the waiting screen is one of its own, as is a failed
              build's (so a screen reader is sent on to what comes after). No bounce when a question fits the
              screen, so a sideways drag on the days slider or a swipe card stays theirs. */}
          <ScrollView
            key={Step || cards ? step : failed ? "failed" : saveError ? "save-failed" : "wait"}
            showsVerticalScrollIndicator={false}
            alwaysBounceVertical={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
          >
            {/* The quiz keeps one centred column on a wide screen (an iPad, the open Duo): the phone's quiz in the middle. */}
            <View style={styles.column}>
              {Step ? (
                <Step state={shown.state} onAnswer={onAnswer} {...held} />
              ) : cards ? (
                <ChoiceStep
                  state={shown.state}
                  trips={cards}
                  onAnswer={onAnswer}
                  saving={saving}
                  offline={offline}
                  onAgain={restart}
                />
              ) : (
                <WaitStep
                  failed={failed}
                  offline={!!only && offline}
                  saveError={only ? saveError : null}
                  // Not for the dates taken: the same answers would only run into the same dates again.
                  onRetry={saveError === DATES_TAKEN ? undefined : retry}
                  onAgain={restart}
                />
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // .q-main: as tall as the screen under the top row, so a question's buttons and cards can share it.
  content: { flexGrow: 1, paddingTop: tokens.space.xs, paddingHorizontal: tokens.space.md },
  column: { flexGrow: 1, width: "100%", maxWidth: QUIZ_COLUMN, alignSelf: "center" },
});
