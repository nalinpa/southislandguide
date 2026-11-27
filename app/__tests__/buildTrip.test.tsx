// The trip quiz's screen (docs/plans/app-trip-builder.md, stages 3 to 6): the website's questions tapped
// through in its order, Back from each, the bar's progress, a quiz left part way coming back on its step, and
// after the last question the account step for someone not signed in, the wait, and the trip cards, where a pick
// saves the trip and opens it in Trips.
// The real hook, steps and builder run against the library's stand-in store; each step's own options and words
// are pinned in components/tripBuilder/__tests__ (quizSteps, quizStepsSecondHalf, swipeDeck, quizTripSteps,
// accountStep).

// The account step's form is the app's own sign-in, pinned in its own tests (accountStep, and the login screen's):
// here it says which way it is open, the email and line it opened with, and whether it offers a guest's way out.
jest.mock("@/lib/uiKit", () => {
  const base = require("@/test/uiKitMock");
  const React = require("react");
  const { Text } = require("react-native");
  return {
    ...base,
    AuthPanel: ({ mode, email, err, onGuest }: any) =>
      React.createElement(Text, null, `Sign-in form: ${mode}${email ? `, ${email}` : ""}${err ? `, ${err}` : ""}${onGuest ? ", Continue as guest" : ""}`),
  };
});
// With a signal unless a test takes it away (NetInfo, as Add to Trip reads it).
const mockNet = { isConnected: true as boolean | null, isInternetReachable: true as boolean | null };
jest.mock("@react-native-community/netinfo", () => ({ useNetInfo: () => mockNet }));
// Their trips fetched from the api, for a pick made before the app's own copy of the list is in.
const mockListTrips = jest.fn();
jest.mock("@/lib/services/itineraryService", () => ({ itineraryService: { getMyItineraries: () => mockListTrips() } }));
// The app's places. Empty unless a test fills it: a first run with no signal, when every stop the builder picked
// is kept.
let mockLookup: any;
jest.mock("@/lib/hooks/usePlaceLookup", () => ({ usePlaceLookup: () => mockLookup }));
// The real drive tables, as on a phone (jest.config.js swaps them for fixed samples): the trips are really built.
jest.mock("@/assets/data/area-drive-minutes.json", () => jest.requireActual("../../assets/data/area-drive-minutes.json"));
jest.mock("@/assets/data/area-hubs.json", () => jest.requireActual("../../assets/data/area-hubs.json"));
jest.mock("@/assets/data/far-place-minutes.json", () => jest.requireActual("../../assets/data/far-place-minutes.json"));
jest.mock("@/assets/data/leg-minutes.json", () => jest.requireActual("../../assets/data/leg-minutes.json"));
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
// A photo is a plain view here; fetching one ahead is a spy.
const mockPrefetch = jest.fn((_urls: string[]) => Promise.resolve(true));
jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Image = (props: any) => React.createElement(View, props);
  Image.prefetch = (urls: string[]) => mockPrefetch(urls);
  return { Image };
});
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { LinearGradient: (p: any) => React.createElement(View, p) };
});
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
const mockHideSplash = jest.fn((): any => Promise.resolve());
jest.mock("expo-splash-screen", () => ({ hideAsync: () => mockHideSplash() }));

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), dismissTo: jest.fn(), canGoBack: jest.fn(() => true) };
// The way in, as the tour and the Trips tab hand it over (none unless a test gives one).
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
}));
// What goes to analytics (lib/analytics, which has its own tests; collection is off but on the store build).
const mockLog = jest.fn();
jest.mock("@/lib/analytics", () => ({ logEvent: (...args: unknown[]) => mockLog(...args), logSignUp: jest.fn() }));
// Signed in unless a test says otherwise: trips are for someone with an account. Signing in is the session
// changing, as the sign-in sheets and the form all end in it.
const mockSession: { status: string; uid?: string } = { status: "authed", uid: "uid-1" };
const mockEnableGuest = jest.fn(() => Promise.resolve());
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: mockSession, enableGuest: mockEnableGuest }) }));
// Their trips, and the app's own save (their own tests: useItineraries, itineraryService). No trips unless a test
// gives some; a save hands back the trip's id.
const mockTrips = { itineraries: [] as any[], addFlow: "create" as string | null, saveItinerary: jest.fn() };
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));
jest.mock("expo-crypto", () => {
  let n = 0;
  return { randomUUID: () => `uuid-${++n}` };
});
// What is behind the form, so it loads; nothing here signs in through it. Signing out (when the api says the
// sign-in has run out) is the Account tab's own steps, stood in for here.
jest.mock("@/components/auth/SocialSignInButtons", () => ({ SocialSignInButtons: () => null }));
const ME = { uid: "uid-1", email: "kia@ora.nz" };
const mockAuth = {
  currentUser: ME as typeof ME | null,
  // Firebase's own: no one is signed in after it.
  signOut: jest.fn(() => {
    mockAuth.currentUser = null;
    return Promise.resolve();
  }),
};
jest.mock("@/lib/firebase", () => ({
  get auth() {
    return mockAuth;
  },
}));
const mockClearLocalUserData = jest.fn();
jest.mock("@/lib/services/userService", () => ({ clearLocalUserData: (uid: string) => mockClearLocalUserData(uid) }));
jest.mock("firebase/auth", () => ({ signInWithEmailAndPassword: jest.fn(), createUserWithEmailAndPassword: jest.fn(), sendPasswordResetEmail: jest.fn() }));
jest.mock("firebase/firestore", () => ({ doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(), serverTimestamp: jest.fn() }));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

import React from "react";
import { AccessibilityInfo, Alert, Animated, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import { ApiError } from "@blacksands/client";
import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";

import BuildTripScreen from "@/app/build-trip";
import data from "@/assets/data/builder-data.json";
import { deckNudge } from "@/components/tripBuilder/SwipeDeck";
import { accountStep, answerQuiz, blankQuiz, type Quiz, type QuizAnswer } from "@/lib/tripBuilder/quizFlow";
import { quizTrips, tripStart } from "@/lib/tripBuilder/quizTrips";
import { tokens } from "@/lib/ui/tokens";
import { tappable, unnamed } from "@/test/a11y";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("@/lib/tripBuilder/quizLogic");
// The builder itself, to count how often it is run.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const build = jest.spyOn(require("@/lib/tripBuilder/builder"), "buildTrips");

const KEY = "tripBuilder.quiz";
// The first summer month still to come, as the month step words it.
const NEXT_SUMMER = site.monthsOf("summer", new Date())[0];
const MONTH = `${site.MONTH_NAMES[NEXT_SUMMER.month]} ${NEXT_SUMMER.year}`;
// The swipe cards for a trip that month, and the two said yes to here.
const CARDS: { id: string; label: string }[] = site.cardsFor(data, NEXT_SUMMER.month);
const LIKED = ["Scenic", "wine"];
// The quiz answered as someone taps through it: a week's loop from Queenstown in summer.
const ANSWERS: QuizAnswer[] = [
  { step: "start", value: "queenstown" },
  { step: "band", value: "week" },
  { step: "days", value: 7 },
  { step: "finish", value: "queenstown" },
  { step: "break1" },
  { step: "season", value: "summer" },
  { step: "month", value: NEXT_SUMMER },
  { step: "pace", value: "some" },
  { step: "drive", value: 240 },
  { step: "who", value: "couple" },
  { step: "age", value: "30-44" },
  { step: "vibe", value: ["nature"] },
  { step: "break2" },
  { step: "into", value: site.deckAnswers(CARDS, LIKED) },
  { step: "food", value: true },
];
// Signed in: from the account step on to the trips (quizFlow's accountStep).
const through = (answers: QuizAnswer[]) => accountStep(answers.reduce<Quiz>((quiz, a) => answerQuiz(quiz.state, a), { state: blankQuiz(), step: "start" }), true)!;
// The quiz after the first n answers: after(7) is on "How active?", after(15) on the trips.
const after = (n: number) => through(ANSWERS.slice(0, n));
// Every question answered by someone not signed in: the account step.
const onAccount = (quiz: Quiz): Quiz => ({ state: quiz.state, step: "account" });
const saved = async () => JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null");
const BREAK2 = "Over 500 places on the island. Picking the ones that fit you.";

// The trips. One fits a week from Queenstown and back, built for the answers, with nowhere for wine on its way:
// a card of its own.
const WEEK = { key: "built-queenstown-7-loop", label: "South Island in 7 Days" };
// Two fit the same answers with a long weekend's four days, so there are cards: one of the app's suggested trips,
// and one built for the answers.
const SHORT: QuizAnswer[] = ANSWERS.map((a) => (a.step === "band" ? { step: "band", value: "weekend" } : a.step === "days" ? { step: "days", value: 4 } : a));
const short = (n: number) => through(SHORT.slice(0, n));
const CHECKED = { key: "queenstown-and-wanaka-in-four-days", label: "Queenstown and Wānaka in Four Days" };
const BUILT = { key: "built-queenstown-4-loop", label: "South Island in 4 Days" };
// The quiz with a trip picked, which saved it: still the cards, that trip marked.
const picked = (quiz: Quiz, pick: string): Quiz => ({ state: { ...quiz.state, pick }, step: "choice" });
const WAITING = "Picking the places that fit you…";
const CARDS_TITLE = "Which one sounds like you?";
const ACCOUNT_TITLE = "Create your free account and we'll build your trip";
// The waiting screen's whole second: the trips are built a third of a second in, and show at its end.
const wait = () => act(async () => void jest.advanceTimersByTime(1000));
// The screen opened on the trips: its waiting screen, and then what the trips for the answers are.
const openTrips = async (quiz: Quiz) => {
  jest.useFakeTimers();
  await AsyncStorage.setItem(KEY, JSON.stringify(quiz));
  const view = await open(WAITING);
  await wait();
  return view;
};
// The card a trip's name is on.
const cardOf = (view: any, label: string) => {
  for (let n = view.getByText(label); n; n = n.parent) if (n.props?.testID === "trip-card") return n;
  throw new Error("not on a trip card");
};
// A trip they already have, as the Trips tab lists it.
const MINE = { id: "trip-mine", title: "Hot Pools Weekend", startDate: "2027-03-01", endDate: "2027-03-03", days: [] };
// Where a saved trip opens: its own screen on the Trips tab.
const tripScreen = (itineraryId: string) => ({ pathname: "/(app)/(tabs)/itinerary/[itineraryId]", params: { itineraryId } });
// The app's place list as the phone has it (every place the builder knows but `missing`), and what fetching it afresh
// hands back (every place but `stillMissing`).
const placeList = (missing: string[], stillMissing: string[] = missing) => {
  const all = Object.values(data.places as Record<string, any>);
  const on = all.filter((p) => !missing.includes(p.id));
  const byId = new Map(on.map((p) => [p.id, p]));
  return {
    places: (id: string) => byId.get(id),
    list: on,
    ready: true,
    count: on.length,
    err: "",
    refresh: jest.fn(() => Promise.resolve(all.filter((p) => !stillMissing.includes(p.id)))),
  };
};
// The stops a saved trip has, by place.
const savedStops = (call = 0) => mockTrips.saveItinerary.mock.calls[call][0].days.flatMap((d: any) => d.items.map((i: any) => i.siteId));

// The screen once the saved quiz is in, on the question it should show.
const open = async (title = "Where do you start?") => {
  const view = await render(<BuildTripScreen />);
  await waitFor(() => expect(view.getByText(title)).toBeTruthy());
  return view;
};
const from = async (n: number, title: string) => {
  await AsyncStorage.setItem(KEY, JSON.stringify(after(n)));
  return open(title);
};
// One tap after another, each on the words given.
const tap = async (view: any, ...words: string[]) => {
  for (const w of words) await fireEvent.press(view.getByText(w));
};
// The whole deck answered with its buttons: yes to the cards in LIKED, no to the rest.
const swipeAll = async (view: any) => {
  for (const c of CARDS) await fireEvent.press(view.getByLabelText(`${LIKED.includes(c.id) ? "Yes, add" : "No, skip"} ${c.label.toLowerCase()}`));
};
const progress = (view: any) => view.getByLabelText("Quiz progress").props.accessibilityValue.now;
// The website's bar, step by step (PROGRESS in its quiz.js).
const SITE_PROGRESS = {
  start: 5, band: 10, days: 15, finish: 20, break1: 25, season: 30, month: 36, pace: 42, drive: 48,
  who: 53, age: 58, vibe: 63, break2: 67, into: 74, food: 86, account: 93, choice: 95,
};
const focus = AccessibilityInfo.sendAccessibilityEvent as jest.Mock;
// The heading the screen reader was last sent to.
const focused = () => focus.mock.calls[focus.mock.calls.length - 1][0].props.children;
// Every heading it was sent to: each question's, as it was drawn.
const headings = () => focus.mock.calls.map((c) => c[0].props.children);

// The bar's slide and a swipe card's fly-off run frame by frame, which would outlive a test and redraw outside
// it. Here each lands at once and says it finished; "the bar" tests read how it was asked to move.
let timing: jest.SpyInstance;

beforeEach(async () => {
  // The one set of trips the app keeps is another trip's at the start of every test, so each one's own trips
  // are built in it: a wait is a wait whatever ran before.
  quizTrips({ ...after(15).state, days: 2 }, new Date());
  jest.clearAllMocks();
  mockSession.status = "authed";
  mockAuth.currentUser = ME;
  mockParams = {};
  mockTrips.itineraries = [];
  mockTrips.addFlow = "create";
  mockTrips.saveItinerary = jest.fn(() => Promise.resolve("trip-new"));
  mockNet.isConnected = true;
  mockNet.isInternetReachable = true;
  mockLookup = { places: () => undefined, list: [], ready: false, count: 0, err: "", refresh: jest.fn() };
  mockRouter.canGoBack.mockReturnValue(true);
  // The first card's nudge has its own tests (swipeDeck.test.tsx).
  deckNudge.seen = true;
  await AsyncStorage.clear();
  timing = jest.spyOn(Animated, "timing").mockImplementation(((value: Animated.Value, config: { toValue: number }) => ({
    start: (done?: (result: { finished: boolean }) => void) => {
      value.setValue(config.toValue);
      done?.({ finished: true });
    },
    stop: jest.fn(),
  })) as never);
});
afterEach(() => {
  timing.mockRestore();
  // The tests that reach the trips run the waiting screen's second on jest's clock.
  jest.useRealTimers();
});

describe("the splash screen", () => {
  it("is taken down by the quiz itself: the root layout holds it, and this screen is outside (app) and (auth)", async () => {
    await open();
    expect(mockHideSplash).toHaveBeenCalled();
  });

  // Nothing to take down (the splash went long ago): the promise fails, and that is let go.
  it("is let go when it won't come down", async () => {
    const caught = jest.fn();
    mockHideSplash.mockReturnValueOnce({ catch: caught });

    await open();

    expect(caught).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe("while the saved quiz loads", () => {
  const loading = async () => {
    let finishRead: (value: string | null) => void = () => {};
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => (finishRead = resolve)));
    return { view: await render(<BuildTripScreen />), finishRead };
  };

  it("shows no question yet", async () => {
    const { view, finishRead } = await loading();

    expect(view.queryByText("Where do you start?")).toBeNull();

    finishRead(JSON.stringify(after(3)));
    await waitFor(() => expect(view.getByText("Where does your trip finish?")).toBeTruthy());
  });

  // A way out from the start: a read that hangs mustn't hold anyone on the screen.
  it("has its Close already, and no Back", async () => {
    const { view } = await loading();

    expect(view.queryByLabelText("Back")).toBeNull();
    await fireEvent.press(view.getByLabelText("Close"));

    expect(mockRouter.back).toHaveBeenCalled();
  });
});

it("walks start, length, days, finish, the photo break, season and month in the website's order, the bar moving with it", async () => {
  const view = await open();
  expect(progress(view)).toBe(SITE_PROGRESS.start);

  await tap(view, "Queenstown");
  expect(view.getByText("How long have you got?")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.band);

  await tap(view, "About a week");
  expect(view.getByText("How many days?")).toBeTruthy();
  expect(view.getByTestId("days-count").props.accessibilityLabel).toBe("7 days");
  expect(progress(view)).toBe(SITE_PROGRESS.days);

  await tap(view, "Next");
  expect(view.getByText("Where does your trip finish?")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.finish);

  await tap(view, "Finish back in Queenstown");
  expect(view.getByText("Queenstown, 7 days.")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.break1);

  await tap(view, "Next");
  expect(view.getByText("Which NZ season are you picking?")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.season);

  await tap(view, "Summer");
  expect(view.getByText("Which month?")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.month);

  await tap(view, MONTH);
  expect(view.getByText("How active?")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.pace);

  // every answer is on the phone, on the step it led to
  await waitFor(async () => expect(await saved()).toEqual(after(7)));
  expect(after(7).step).toBe("pace");
});

it("walks on through pace, driving, who, age, the vibe, the second photo break, the cards and food, to the wait and the trip's card", async () => {
  jest.useFakeTimers();
  const view = await from(7, "How active?");
  expect(progress(view)).toBe(SITE_PROGRESS.pace);

  await tap(view, "Some walking");
  expect(view.getByText("How much driving?")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.drive);

  await tap(view, "Some");
  expect(view.getByText("Who’s travelling?")).toBeTruthy();
  expect(view.getByText("Up to 4 hours a day")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.who);

  await tap(view, "Couple");
  expect(view.getByText("How old are you?")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.age);

  await tap(view, "30–44");
  expect(view.getByText("What’s the vibe?")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.vibe);

  await tap(view, "Nature", "Next");
  expect(view.getByText(BREAK2)).toBeTruthy();
  expect(view.getByTestId("break-photo").props.source).toEqual({ uri: "https://kiwiguide.app/img/photo-diamond-lake-1200.webp" });
  expect(view.getByText("Photo: Diamond Lake, public domain, via Wikimedia Commons")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.break2);

  await tap(view, "Next");
  expect(view.getByText("What are you into?")).toBeTruthy();
  expect(view.getByText("1 of 11 · Swipe right for yes, left for no.")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.into);

  await swipeAll(view);
  expect(view.getByText("Food tips?")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.food);

  await tap(view, "Yes");
  // every answer is on the phone, the cards' two lists among them, on the trips' step
  expect(site.deckAnswers(CARDS, LIKED)).toEqual({ into: ["Scenic"], activities: ["wine"] });
  expect(after(15).step).toBe("choice");
  expect(await saved()).toEqual(after(15));
  // the trips are built behind the website's waiting words
  expect(view.getByText("One moment")).toBeTruthy();
  expect(view.getByText(WAITING)).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.choice);

  await wait();
  // one trip fits a week from Queenstown and back: its card, and nothing to choose, so it is taken as picked and
  // saved, as a tap on it would ("when one trip fits", below)
  expect(view.getByText("1 trip fits Queenstown and back · 7 days")).toBeTruthy();
  expect(view.getByText(CARDS_TITLE)).toBeTruthy();
  expect(view.getAllByTestId("trip-card")).toHaveLength(1);
  expect(within(view.getByTestId("trip-card")).getByText(WEEK.label)).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.choice);
  await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen("trip-new")));
  // saved, the quiz is cleared, so it opens next on its first question
  await waitFor(async () => expect(await saved()).toBeNull());
});

// The whole quiz by hand, with a long weekend's four days: two trips fit, so there are two cards.
it("walks from the first question to a trip: every question, the wait, the trip cards, and the trip saved and opened in Trips", async () => {
  jest.useFakeTimers();
  const view = await open();

  await tap(view, "Queenstown", "A long weekend");
  expect(view.getByTestId("days-count").props.accessibilityLabel).toBe("4 days");
  await tap(view, "Next", "Finish back in Queenstown", "Next", "Summer", MONTH);
  await tap(view, "Some walking", "Some", "Couple", "30–44", "Nature", "Next", "Next");
  await swipeAll(view);
  expect(view.getByText("Food tips?")).toBeTruthy();

  await tap(view, "Yes");
  expect(view.getByText(WAITING)).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.choice);

  await wait();
  expect(view.getByText("2 trips fit Queenstown and back · 4 days")).toBeTruthy();
  expect(view.getByText(CARDS_TITLE)).toBeTruthy();
  expect(view.getAllByTestId("trip-card")).toHaveLength(2);
  expect(within(view.getAllByTestId("trip-card")[0]).getByText("Hand-checked trip")).toBeTruthy();
  expect(within(view.getAllByTestId("trip-card")[0]).getByText(CHECKED.label)).toBeTruthy();
  expect(within(view.getAllByTestId("trip-card")[1]).getByText("Built for you")).toBeTruthy();
  expect(within(view.getAllByTestId("trip-card")[1]).getByText(BUILT.label)).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.choice);

  await tap(view, BUILT.label);
  await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen("trip-new")));
  expect(mockTrips.saveItinerary).toHaveBeenCalledTimes(1);
  expect(mockTrips.saveItinerary.mock.calls[0][0]).toMatchObject({ title: BUILT.label, startArea: "queenstown" });
  // saved, the quiz is cleared, so it opens next on its first question
  await waitFor(async () => expect(await saved()).toBeNull());
});

it("skips the month for Not sure yet", async () => {
  const view = await from(5, "Which NZ season are you picking?");

  await tap(view, "Not sure yet");

  expect(view.queryByText("Which month?")).toBeNull();
  expect(view.getByText("How active?")).toBeTruthy();
  expect(view.getByText("Noted.")).toBeTruthy();

  // and Back from there is the season, not a month that was never asked
  await fireEvent.press(view.getByLabelText("Back"));
  expect(view.getByText("Which NZ season are you picking?")).toBeTruthy();
});

// Christchurch to Picton in two days is a long way in few days: the driving isn't asked, it is Happy to drive.
describe("a long way in few days", () => {
  const far: QuizAnswer[] = [
    { step: "start", value: "christchurch" },
    { step: "band", value: "weekend" },
    { step: "days", value: 2 },
    { step: "finish", value: "picton" },
    { step: "break1" },
    { step: "season", value: "unsure" },
  ];

  it("goes from the pace straight to who, with the pace over that question, and Back comes straight back", async () => {
    expect(through(far).step).toBe("pace");
    await AsyncStorage.setItem(KEY, JSON.stringify(through(far)));
    const view = await open("How active?");

    await tap(view, "Easy");

    expect(view.getByText("Who’s travelling?")).toBeTruthy();
    expect(view.queryByText("How much driving?")).toBeNull();
    expect(view.getByText("Easy")).toBeTruthy();
    expect(progress(view)).toBe(SITE_PROGRESS.who);
    await waitFor(async () => expect((await saved()).state.drive).toBe(360));

    await fireEvent.press(view.getByLabelText("Back"));
    expect(view.getByText("How active?")).toBeTruthy();
    expect(view.queryByText("How much driving?")).toBeNull();
  });
});

// The website moves focus to each new question's heading; here it is the screen reader's.
it("sends a screen reader to each new question's heading", async () => {
  const view = await open();
  expect(focused()).toBe("Where do you start?");

  await tap(view, "Queenstown");
  expect(focused()).toBe("How long have you got?");

  await tap(view, "About a week");
  expect(focused()).toBe("How many days?");

  await fireEvent.press(view.getByLabelText("Back"));
  expect(focused()).toBe("How long have you got?");
});

describe("the bar", () => {
  // The website's bar: its width slides to the new step in a quarter of a second, and jumps under reduce motion.
  it("slides to the next step's place", async () => {
    const view = await open();
    timing.mockClear();

    await tap(view, "Queenstown");

    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0][1]).toEqual(expect.objectContaining({ toValue: SITE_PROGRESS.band, duration: 250 }));
  });

  it("jumps there when the phone is set to reduce motion", async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
    const view = await open();
    timing.mockClear();

    await tap(view, "Queenstown");

    expect(progress(view)).toBe(SITE_PROGRESS.band);
    expect(timing).not.toHaveBeenCalled();
  });
});

// The second photo break fills the screen, under the top row: the row's buttons go see-through over the photo.
describe("the second photo break", () => {
  it("draws its photo under the top row, whose buttons go see-through over it and back after it", async () => {
    const view = await from(12, BREAK2);

    expect(view.getByTestId("photo-break")).toBeTruthy();
    expect(view.getByLabelText("Close")).toHaveStyle({ backgroundColor: "transparent" });
    expect(view.getByLabelText("Back")).toHaveStyle({ backgroundColor: "transparent" });

    await tap(view, "Next");
    expect(view.getByText("What are you into?")).toBeTruthy();
    expect(view.queryByTestId("photo-break")).toBeNull();
    expect(view.getByLabelText("Close")).toHaveStyle({ backgroundColor: tokens.colors.bgCard });
  });

  it("is not gone back onto: Back from the cards is the vibe", async () => {
    const view = await from(13, "What are you into?");

    await fireEvent.press(view.getByLabelText("Back"));

    expect(view.getByText("What’s the vibe?")).toBeTruthy();
  });
});

// The website keeps the deck as it was left for the visit: leaving the cards part way and coming back carries
// on from the same card. Held above the questions, which are drawn afresh at every step.
describe("the swipe cards", () => {
  it("carry on from the card they were left on", async () => {
    const view = await from(13, "What are you into?");

    await fireEvent.press(view.getByLabelText("Yes, add scenic"));
    await fireEvent.press(view.getByLabelText("No, skip walks"));
    expect(view.getByText("3 of 11 · Swipe right for yes, left for no.")).toBeTruthy();

    // back to the vibe, and on again through the photo break
    await fireEvent.press(view.getByLabelText("Back"));
    await tap(view, "Next", "Next");

    expect(view.getByText("3 of 11 · Swipe right for yes, left for no.")).toBeTruthy();
    expect(within(view.getByTestId("deck-card")).getByText(CARDS[2].label)).toBeTruthy();
  });

  it("show their last card again when gone back to once answered", async () => {
    const view = await from(14, "Food tips?");

    await fireEvent.press(view.getByLabelText("Back"));

    expect(view.getByText("11 of 11 · Swipe right for yes, left for no.")).toBeTruthy();
  });
});

describe("Back", () => {
  it("is not on the first question", async () => {
    const view = await open();
    expect(view.queryByLabelText("Back")).toBeNull();
    expect(view.getByLabelText("Close")).toBeTruthy();
  });

  it("goes back a question at a time, over the photo breaks, the answers kept", async () => {
    const view = await openTrips(short(15));
    const back = () => fireEvent.press(view.getByLabelText("Back"));
    expect(view.getByText(BUILT.label)).toBeTruthy();

    // from the cards, past the account step (signed in), to the last question
    await back();
    expect(view.getByText("Food tips?")).toBeTruthy();
    await back();
    expect(view.getByText("What are you into?")).toBeTruthy();
    // never onto a photo break: from the question after it to the question before it
    await back();
    expect(view.getByText("What’s the vibe?")).toBeTruthy();
    expect(view.queryByText(BREAK2)).toBeNull();
    await back();
    expect(view.getByText("How old are you?")).toBeTruthy();
    await back();
    expect(view.getByText("Who’s travelling?")).toBeTruthy();
    await back();
    expect(view.getByText("How much driving?")).toBeTruthy();
    await back();
    expect(view.getByText("How active?")).toBeTruthy();
    await back();
    expect(view.getByText("Which month?")).toBeTruthy();
    await back();
    expect(view.getByText("Which NZ season are you picking?")).toBeTruthy();
    await back();
    expect(view.getByText("Where does your trip finish?")).toBeTruthy();
    expect(view.queryByText("Queenstown, 7 days.")).toBeNull();
    await back();
    expect(view.getByText("How many days?")).toBeTruthy();
    expect(view.getByTestId("days-count").props.accessibilityLabel).toBe("4 days");
    await back();
    expect(view.getByText("How long have you got?")).toBeTruthy();
    await back();
    expect(view.getByText("Where do you start?")).toBeTruthy();
    expect(view.queryByLabelText("Back")).toBeNull();

    // the answers are kept, the trip saved last among them, and the step it went back to is saved
    await waitFor(async () => expect(await saved()).toEqual({ state: short(15).state, step: "start" }));
  });

  it("goes from the first photo break to the finish", async () => {
    const view = await from(4, "Queenstown, 7 days.");

    await fireEvent.press(view.getByLabelText("Back"));

    expect(view.getByText("Where does your trip finish?")).toBeTruthy();
  });

  it("goes from the second photo break to the vibe", async () => {
    const view = await from(12, BREAK2);

    await fireEvent.press(view.getByLabelText("Back"));

    expect(view.getByText("What’s the vibe?")).toBeTruthy();
  });
});

// The website keeps both open for the visit: the finish's shuts when the start town changes, and both on
// Start again. They are held above the questions, which are drawn afresh at every step.
describe("Somewhere else?", () => {
  it("stays open on the start once the other towns are shown", async () => {
    const view = await open();

    await tap(view, "Somewhere else?");
    expect(view.getByText("Dunedin")).toBeTruthy();
    expect(view.queryByText("Somewhere else?")).toBeNull();

    await tap(view, "Queenstown");
    await fireEvent.press(view.getByLabelText("Back"));

    expect(view.getByText("Where do you start?")).toBeTruthy();
    expect(view.getByText("Dunedin")).toBeTruthy();
    expect(view.queryByText("Somewhere else?")).toBeNull();
  });

  it("stays open on the finish, until the start town changes", async () => {
    // Three weeks from Queenstown: Dunedin, Nelson and Invercargill are behind it.
    const answers: QuizAnswer[] = [{ step: "start", value: "queenstown" }, { step: "band", value: "long" }, { step: "days", value: 21 }];
    await AsyncStorage.setItem(KEY, JSON.stringify(through(answers)));
    const view = await open("Where does your trip finish?");
    const back = () => fireEvent.press(view.getByLabelText("Back"));

    await tap(view, "Somewhere else?");
    expect(view.getByText("Nelson")).toBeTruthy();

    // on with a town that was never behind it, and back: still open
    await tap(view, "Christchurch");
    await back();
    expect(view.getByText("Where does your trip finish?")).toBeTruthy();
    expect(view.getByText("Nelson")).toBeTruthy();
    expect(view.queryByText("Somewhere else?")).toBeNull();

    // another start town: its finishes start shut
    await back();
    await back();
    await back();
    await tap(view, "Picton", "Three weeks", "Next");
    expect(view.getByText("Where does your trip finish?")).toBeTruthy();
    expect(view.getByText("Somewhere else?")).toBeTruthy();
    expect(view.queryByText("Nelson")).toBeNull();
  });

  // Two trips fit a long weekend, so the cards stay up to reach Start again (one trip is saved as it shows).
  it("is shut again after Start again", async () => {
    const view = await openTrips(short(15));
    // all the way back from the trip's card to the start, where the other towns are opened
    for (let i = 0; i < 13; i++) await fireEvent.press(view.getByLabelText("Back"));
    await tap(view, "Somewhere else?");
    expect(view.getByText("Dunedin")).toBeTruthy();

    // and all the way on again: the answers are still there, the swipe cards show their last one, and the trip's
    // card is there at once (it was built for these answers on the way in), with Start again under it
    await tap(view, "Queenstown", "A long weekend", "Next", "Finish back in Queenstown", "Next", "Summer", MONTH);
    await tap(view, "Some walking", "Some", "Couple", "30–44", "Next", "Next");
    await fireEvent.press(view.getByLabelText("Yes, add wine"));
    await tap(view, "Yes", "Start again");

    expect(view.getByText("Where do you start?")).toBeTruthy();
    expect(view.getByText("Somewhere else?")).toBeTruthy();
    expect(view.queryByText("Dunedin")).toBeNull();
  });
});

describe("a quiz left part way", () => {
  it.each([
    [1, "How long have you got?"],
    [2, "How many days?"],
    [3, "Where does your trip finish?"],
    [4, "Queenstown, 7 days."],
    [5, "Which NZ season are you picking?"],
    [6, "Which month?"],
    [7, "How active?"],
    [8, "How much driving?"],
    [9, "Who’s travelling?"],
    [10, "How old are you?"],
    [11, "What’s the vibe?"],
    [12, BREAK2],
    [13, "What are you into?"],
    [14, "Food tips?"],
  ])("opens again on its step (%i answers in)", async (n, title) => {
    await from(n, title);
  });
});

describe("Close", () => {
  it("leaves the quiz with the answers kept", async () => {
    const view = await from(3, "Where does your trip finish?");

    await fireEvent.press(view.getByLabelText("Close"));

    expect(mockRouter.back).toHaveBeenCalled();
    expect(await saved()).toEqual(after(3));
  });

  // Opened with nothing behind it (a development build reloading onto it): Close still leaves.
  it("goes to the start screen when there is nothing to go back to", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const view = await open();

    await fireEvent.press(view.getByLabelText("Close"));

    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith("/");
  });
});

// Trips require an account (owner, 2026-11-27: "account first"): after the last question someone not signed in
// creates an account or signs in, and only then are the trips built, as on the website since 26 Nov.
describe("the account step", () => {
  beforeEach(() => jest.useFakeTimers());
  // A guest on the last question of a long weekend from Queenstown (two trips fit, so there are cards).
  const guestOnFood = async () => {
    mockSession.status = "guest";
    await AsyncStorage.setItem(KEY, JSON.stringify(short(14)));
    return open("Food tips?");
  };
  const signIn = async (view: any) => {
    mockSession.status = "authed";
    await view.rerender(<BuildTripScreen />);
  };

  it("comes after the last question for someone not signed in: the website's words over the app's own sign-in, on Create", async () => {
    const view = await guestOnFood();

    await tap(view, "Yes");

    expect(view.getByText("Last step")).toBeTruthy();
    expect(view.getByText(ACCOUNT_TITLE)).toBeTruthy();
    expect(view.getByText("Sign-in form: signup")).toBeTruthy();
    // no way on without an account
    expect(view.queryByText(/Continue as guest/)).toBeNull();
    expect(progress(view)).toBe(SITE_PROGRESS.account);
    expect(focused()).toBe(ACCOUNT_TITLE);
    await waitFor(async () => expect(await saved()).toEqual(onAccount(short(15))));
  });

  it("builds no trips while it is up", async () => {
    const view = await guestOnFood();
    await tap(view, "Yes");

    await wait();

    expect(view.getByText(ACCOUNT_TITLE)).toBeTruthy();
    expect(view.queryByText(WAITING)).toBeNull();
    expect(build).not.toHaveBeenCalled();
  });

  it("goes on to the trips by itself once signed in, with no tap", async () => {
    const view = await guestOnFood();
    await tap(view, "Yes");

    await signIn(view);

    expect(view.queryByText(ACCOUNT_TITLE)).toBeNull();
    expect(view.getByText(WAITING)).toBeTruthy();
    await wait();
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    await waitFor(async () => expect(await saved()).toEqual(short(15)));
  });

  it("is never shown to someone signed in: from the last question straight to the wait", async () => {
    const view = await from(14, "Food tips?");

    await tap(view, "Yes");

    expect(view.getByText(WAITING)).toBeTruthy();
    expect(headings()).not.toContain(ACCOUNT_TITLE);
  });

  // Signed in since the quiz was left on it (on the Account tab, say).
  it("opened again, goes on to the trips for someone signed in by then", async () => {
    const view = await openTrips(onAccount(short(15)));

    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(headings()).not.toContain(ACCOUNT_TITLE);
    await waitFor(async () => expect(await saved()).toEqual(short(15)));
  });

  // Left on the cards, then signed out other than by the app's sign-out (which clears the quiz): no trips without an
  // account. A trip an earlier version kept as picked stays marked.
  it("is where a quiz left on the cards opens for someone not signed in, nothing built until they are", async () => {
    mockSession.status = "guest";
    await AsyncStorage.setItem(KEY, JSON.stringify(picked(short(15), BUILT.key)));
    const view = await open(ACCOUNT_TITLE);
    await wait();
    expect(build).not.toHaveBeenCalled();
    expect(view.queryByText(BUILT.label)).toBeNull();

    await signIn(view);
    await wait();

    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    const [, built] = view.getAllByTestId("trip-card");
    expect(built.props.accessibilityState).toEqual({ selected: true });
  });

  it("goes Back to the last question", async () => {
    const view = await guestOnFood();
    await tap(view, "Yes");

    await fireEvent.press(view.getByLabelText("Back"));

    expect(view.getByText("Food tips?")).toBeTruthy();
    expect(progress(view)).toBe(SITE_PROGRESS.food);
  });

  // The phone reads who is signed in as the app opens: until it knows, nothing is decided.
  describe("while the sign-in is still being read", () => {
    const loadingOnFood = async () => {
      mockSession.status = "loading";
      const view = await from(14, "Food tips?");
      await tap(view, "Yes");
      return view;
    };

    it("shows neither the account step nor the trips, with Close and no Back", async () => {
      const view = await loadingOnFood();
      await wait();

      expect(view.queryByText(ACCOUNT_TITLE)).toBeNull();
      expect(view.queryByText(WAITING)).toBeNull();
      expect(view.getByText("Loading")).toBeTruthy();
      expect(view.queryByLabelText("Back")).toBeNull();
      expect(view.getByLabelText("Close")).toBeTruthy();
      expect(build).not.toHaveBeenCalled();
    });

    it("shows the account step once it is known no one is signed in", async () => {
      const view = await loadingOnFood();

      mockSession.status = "guest";
      await view.rerender(<BuildTripScreen />);

      expect(view.getByText(ACCOUNT_TITLE)).toBeTruthy();
    });

    it("goes on to the trips once it is known someone is, never showing the account step", async () => {
      const view = await loadingOnFood();

      await signIn(view);

      expect(view.getByText(WAITING)).toBeTruthy();
      await wait();
      // a week from Queenstown: the one trip, on its card
      expect(within(view.getByTestId("trip-card")).getByText(WEEK.label)).toBeTruthy();
      expect(headings()).not.toContain(ACCOUNT_TITLE);
    });
  });
});

// After the last question the trips are built, behind the website's waiting words. A build holds the phone for
// up to a third of a second, so the waiting screen is drawn first; and it stays up a second in all, long enough
// to be read. Trips already built for the answers show at once.
describe("the wait for the trips", () => {
  beforeEach(() => jest.useFakeTimers());
  // The last question of a long weekend from Queenstown: its answer sets the trips off.
  const food = async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(short(14)));
    return open("Food tips?");
  };
  const ms = (n: number) => act(async () => void jest.advanceTimersByTime(n));
  const back = (view: any) => fireEvent.press(view.getByLabelText("Back"));

  it("draws its screen first, then builds the trips, and shows them a second after it came up", async () => {
    const view = await food();
    await tap(view, "Yes");

    expect(view.getByText(WAITING)).toBeTruthy();
    expect(build).not.toHaveBeenCalled();
    await ms(299);
    expect(build).not.toHaveBeenCalled();
    mockPrefetch.mockClear();
    await ms(1);
    expect(build).toHaveBeenCalledTimes(1);
    // built, the two cards' photos fetched for when they show, and still the waiting screen until its second is up
    expect(mockPrefetch).toHaveBeenCalledTimes(1);
    expect(mockPrefetch.mock.calls[0][0]).toEqual([expect.stringMatching(/^https:\/\/.+\.webp$/), expect.stringMatching(/^https:\/\/.+\.webp$/)]);
    expect(new Set(mockPrefetch.mock.calls[0][0]).size).toBe(2);
    await ms(699);
    expect(view.getByText(WAITING)).toBeTruthy();
    expect(view.queryByText(CARDS_TITLE)).toBeNull();
    await ms(1);
    expect(view.queryByText(WAITING)).toBeNull();
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
  });

  it("builds the trips once for a set of answers, however often the cards are come back to", async () => {
    const view = await food();
    await tap(view, "Yes");
    await wait();
    expect(build).toHaveBeenCalledTimes(1);

    // back to the last question and on with the same answer, twice
    for (let i = 0; i < 2; i++) {
      await back(view);
      expect(view.getByText("Food tips?")).toBeTruthy();
      await tap(view, "Yes");
      // the trips already built: there at once, with no wait
      expect(view.queryByText(WAITING)).toBeNull();
      expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    }
    expect(build).toHaveBeenCalledTimes(1);

    // another answer is another set of trips
    await back(view);
    await tap(view, "No");
    expect(view.getByText(WAITING)).toBeTruthy();
    await wait();
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(build).toHaveBeenCalledTimes(2);
  });

  // Nothing moves on the waiting screen, but its second is a hold all the same: gone under reduce motion.
  it("is over as soon as the trips are built when the phone is set to reduce motion", async () => {
    const reduce = AccessibilityInfo.isReduceMotionEnabled as jest.Mock;
    reduce.mockImplementation(() => Promise.resolve(true));
    try {
      const view = await food();
      await tap(view, "Yes");
      expect(view.getByText(WAITING)).toBeTruthy();
      expect(build).not.toHaveBeenCalled();

      // the next turn of the phone's clock, and the one after (on jest's clock, a millisecond on)
      await ms(1);

      expect(build).toHaveBeenCalledTimes(1);
      expect(view.queryByText(WAITING)).toBeNull();
      expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    } finally {
      reduce.mockImplementation(() => Promise.resolve(false));
    }
  });

  // The wait isn't a question to go back from (the review's fix: Back from a trip opened again only landed on the
  // same trip once built).
  it("has no Back until the trips show, and Close all the while", async () => {
    const view = await food();
    await tap(view, "Yes");

    expect(view.getByText(WAITING)).toBeTruthy();
    expect(view.queryByLabelText("Back")).toBeNull();
    expect(view.getByLabelText("Close")).toBeTruthy();

    await wait();
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    await back(view);
    expect(view.getByText("Food tips?")).toBeTruthy();
  });

  it("has no Back on the cards opened again before they are built", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(short(15)));
    const view = await open(WAITING);

    expect(view.queryByLabelText("Back")).toBeNull();

    await wait();
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    await back(view);
    expect(view.getByText("Food tips?")).toBeTruthy();
  });

  // A fault in the copied rules for these answers. Thrown in the build's timer, nothing would catch it, and a
  // release build would close.
  it("says so when the trips can't be built, with Start again, and the app stays up", async () => {
    const fault = new Error("no trips for these answers");
    build.mockImplementationOnce(() => {
      throw fault;
    });
    const view = await food();
    await tap(view, "Yes");

    await wait();

    expect(view.queryByText(WAITING)).toBeNull();
    expect(view.getByText("Something went wrong")).toBeTruthy();
    expect(view.getByText("The trips would not load.")).toBeTruthy();
    expect(focused()).toBe("Something went wrong");
    expect(view.queryByLabelText("Back")).toBeNull();
    expect(view.getByLabelText("Close")).toBeTruthy();
    expect(Sentry.captureException).toHaveBeenCalledWith(fault);

    // and it isn't tried again behind it
    await wait();
    expect(build).toHaveBeenCalledTimes(1);

    await tap(view, "Start again");
    expect(view.getByText("Where do you start?")).toBeTruthy();
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).toBeNull());
  });

  it("sends a screen reader to the waiting words, and then to what the wait was for", async () => {
    const view = await food();
    await tap(view, "Yes");
    expect(focused()).toBe(WAITING);

    await wait();
    expect(focused()).toBe(CARDS_TITLE);
  });
});

// A tap on a trip's card saves it to their account as their trip and opens it in the Trips tab's own trip screen
// (owner, 2026-11-27: "save on pick"). One trip each: one they have already is replaced, after asking.
describe("picking a trip", () => {
  let alertSpy: jest.SpyInstance;
  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });
  afterEach(() => alertSpy.mockRestore());
  // A button of the alert up last, pressed (Cancel has nothing of its own to do: the alert just goes).
  const press = (text: string) =>
    act(async () => alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2].find((b: any) => b.text === text).onPress?.());

  it("saves it as their trip, with the town it starts from, and opens it in Trips", async () => {
    const view = await openTrips(short(15));

    await tap(view, BUILT.label);

    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen("trip-new")));
    const [, trip] = quizTrips(short(15).state, new Date());
    expect(trip.key).toBe(BUILT.key);
    const body = mockTrips.saveItinerary.mock.calls[0][0];
    expect(body).toMatchObject({ title: BUILT.label, startDate: tripStart(short(15).state, new Date()), startArea: "queenstown" });
    expect(body).not.toHaveProperty("id");
    expect(body.endDate).toBe(body.days[3].date);
    expect(body.days.map((d: any) => d.items.map((i: any) => i.siteId))).toEqual(trip.days.map((d) => d.items.map((i) => i.siteId)));
    expect(alertSpy).not.toHaveBeenCalled();
    // and the quiz is cleared, so it opens next on its first question
    await waitFor(async () => expect(await saved()).toBeNull());
  });

  it("asks first when they have a trip, in Start a New Trip's words, and saves over it on Continue", async () => {
    mockTrips.itineraries = [MINE];
    mockTrips.saveItinerary = jest.fn(() => Promise.resolve(MINE.id));
    const view = await openTrips(short(15));

    await tap(view, BUILT.label);

    expect(alertSpy).toHaveBeenCalledWith("Start a New Trip?", "It replaces Hot Pools Weekend and its places.", [
      expect.objectContaining({ text: "Cancel", style: "cancel" }),
      expect.objectContaining({ text: "Continue" }),
    ]);
    // nothing until they say so: Cancel leaves them on the cards
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();

    await press("Continue");

    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen(MINE.id)));
    expect(mockTrips.saveItinerary.mock.calls[0][0]).toMatchObject({ id: MINE.id, title: BUILT.label, startArea: "queenstown" });
  });

  it("saves nothing on Cancel, and leaves them on the cards to pick again", async () => {
    mockTrips.itineraries = [MINE];
    const view = await openTrips(short(15));
    await tap(view, BUILT.label);

    await press("Cancel");

    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(within(cardOf(view, BUILT.label)).queryByTestId("trip-saving")).toBeNull();
    await tap(view, CHECKED.label);
    expect(alertSpy).toHaveBeenCalledTimes(2);
  });

  // Two taps can land before the cards are held, and on iPhone each brings an alert of its own: the trip is saved once.
  it("saves once however often Continue is pressed", async () => {
    mockTrips.itineraries = [MINE];
    let finish: (id: string) => void = () => {};
    mockTrips.saveItinerary = jest.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    const view = await openTrips(short(15));
    await tap(view, BUILT.label);

    await press("Continue");
    await press("Continue");
    await act(async () => finish(MINE.id));

    expect(mockTrips.saveItinerary).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).toHaveBeenCalledTimes(1);
  });

  // An account from before one trip each may have several. The Trips tab lists them as the api does, the newest first.
  it("replaces the trip the Trips tab lists first, for an account from before one trip each", async () => {
    mockTrips.itineraries = [MINE, { ...MINE, id: "trip-older", title: "Coast Trip" }];
    mockTrips.saveItinerary = jest.fn(() => Promise.resolve(MINE.id));
    const view = await openTrips(short(15));

    await tap(view, BUILT.label);
    expect(alertSpy.mock.calls[0][1]).toBe("It replaces Hot Pools Weekend and its places.");
    await press("Continue");

    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen(MINE.id)));
    expect(mockTrips.saveItinerary).toHaveBeenCalledWith(expect.objectContaining({ id: MINE.id }));
  });

  it("shows the card busy while it saves, takes no second tap, and has no Back", async () => {
    let finish: (id: string) => void = () => {};
    mockTrips.saveItinerary = jest.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    const view = await openTrips(short(15));

    await tap(view, BUILT.label);

    expect(within(cardOf(view, BUILT.label)).getByTestId("trip-saving")).toBeTruthy();
    expect(cardOf(view, CHECKED.label).props.accessibilityState).toEqual({ selected: false, disabled: true });
    expect(view.queryByLabelText("Back")).toBeNull();
    expect(view.getByLabelText("Close")).toBeTruthy();
    await tap(view, BUILT.label, CHECKED.label);
    expect(mockTrips.saveItinerary).toHaveBeenCalledTimes(1);

    await act(async () => finish("trip-new"));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen("trip-new"));
  });

  // Closed while it saves: the trip is still saved and the quiz cleared, but there is no quiz to move on from.
  it("opens nothing when the quiz was closed before the save came back", async () => {
    let finish: (id: string) => void = () => {};
    mockTrips.saveItinerary = jest.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    const view = await openTrips(short(15));
    await tap(view, BUILT.label);

    await view.unmount();
    await act(async () => finish("trip-new"));

    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    await waitFor(async () => expect(await saved()).toBeNull());
  });

  it("keeps them on the cards when it can't be saved, in the app's words, the card tappable again", async () => {
    mockTrips.saveItinerary = jest.fn().mockRejectedValueOnce(new Error("no signal")).mockResolvedValueOnce("trip-new");
    const view = await openTrips(short(15));

    await tap(view, BUILT.label);

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Couldn't save the trip. Try again."));
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(within(cardOf(view, BUILT.label)).queryByTestId("trip-saving")).toBeNull();
    expect(cardOf(view, BUILT.label).props.accessibilityState).toEqual({ selected: false });
    // nothing kept as saved
    expect(await saved()).toEqual(short(15));

    await tap(view, BUILT.label);
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen("trip-new")));
  });

  // The api's date_overlap: another trip of theirs (an account from before one trip each) on those dates.
  it("says so when the dates run into another trip of theirs, and keeps them on the cards", async () => {
    mockTrips.saveItinerary = jest.fn().mockRejectedValue(new ApiError(409, "date_overlap"));
    const view = await openTrips(short(15));

    await tap(view, BUILT.label);

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Those dates overlap an existing trip. Pick a different range."));
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  // The api no longer takes the sign-in: signed out here as the Account tab signs out, so the quiz goes back to its
  // account step, as the website does (quiz.js 961–964): on Sign in, their email in, its line for it, and the trip
  // picked kept for after.
  it("goes back to the account step on Sign in when the api says the sign-in has run out", async () => {
    mockTrips.saveItinerary = jest.fn().mockRejectedValue(new ApiError(401, "unauthorized"));
    const view = await openTrips(short(15));

    await tap(view, BUILT.label);

    await waitFor(() => expect(mockClearLocalUserData).toHaveBeenCalledWith("uid-1"));
    expect(mockEnableGuest).toHaveBeenCalled();
    expect(mockAuth.signOut).toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    // signed out, as the session then says
    mockSession.status = "guest";
    await view.rerender(<BuildTripScreen />);
    expect(view.getByText("Sign in and we'll build your trip")).toBeTruthy();
    expect(view.getByText("Sign-in form: login, kia@ora.nz, Please sign in again to save your trip.")).toBeTruthy();
  });

  // Their trips aren't in yet (just signed in on a slow line, say): the card waits for them, then goes on as ever.
  describe("before their trips are in", () => {
    beforeEach(() => {
      mockTrips.addFlow = null;
    });

    it("waits for them, the card busy, and saves when they have none", async () => {
      let found: (list: any[]) => void = () => {};
      mockListTrips.mockImplementation(() => new Promise((resolve) => (found = resolve)));
      const view = await openTrips(short(15));

      await tap(view, BUILT.label);

      expect(within(cardOf(view, BUILT.label)).getByTestId("trip-saving")).toBeTruthy();
      expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();

      await act(async () => found([]));

      await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen("trip-new")));
      expect(mockTrips.saveItinerary.mock.calls[0][0]).not.toHaveProperty("id");
    });

    it("asks first when it turns out they have one, as ever", async () => {
      mockListTrips.mockResolvedValue([MINE]);
      mockTrips.saveItinerary = jest.fn(() => Promise.resolve(MINE.id));
      const view = await openTrips(short(15));

      await tap(view, BUILT.label);

      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Start a New Trip?", "It replaces Hot Pools Weekend and its places.", expect.any(Array)));
      expect(within(cardOf(view, BUILT.label)).queryByTestId("trip-saving")).toBeNull();
      await press("Continue");
      await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen(MINE.id)));
    });

    it("says it couldn't be saved when they can't be fetched, the card tappable again", async () => {
      mockListTrips.mockRejectedValue(new Error("no signal"));
      const view = await openTrips(short(15));

      await tap(view, BUILT.label);

      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Couldn't save the trip. Try again."));
      expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
      expect(within(cardOf(view, BUILT.label)).queryByTestId("trip-saving")).toBeNull();
    });
  });

  // A save with no signal would only wait for it, the card spinning: held instead, as Add to Trip holds its own.
  it("holds the cards with no signal, in Add to Trip's words", async () => {
    mockNet.isConnected = false;
    const view = await openTrips(short(15));

    expect(view.getByText("Reconnect to Add")).toBeTruthy();
    await tap(view, BUILT.label);

    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  // The phone keeps its copy of the place list for a day: a place newer than that copy, already in the builder's data,
  // isn't one switched off. The list is fetched afresh first, and only a place still missing then is left off.
  describe("the places it is made of", () => {
    const [, trip] = quizTrips(short(15).state, new Date());
    const stops = trip.days.flatMap((d) => d.items.map((i) => i.siteId));

    it("are all kept, and nothing fetched again, when the phone's list has every one", async () => {
      mockLookup = placeList([]);
      const view = await openTrips(short(15));

      await tap(view, BUILT.label);

      await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
      expect(savedStops()).toEqual(stops);
      expect(mockLookup.refresh).not.toHaveBeenCalled();
    });

    it("keep one the phone's list lacks once the list fetched afresh has it", async () => {
      mockLookup = placeList([stops[1]], []);
      const view = await openTrips(short(15));

      await tap(view, BUILT.label);

      await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
      expect(mockLookup.refresh).toHaveBeenCalledTimes(1);
      expect(savedStops()).toEqual(stops);
    });

    it("leave off only one still missing from the list fetched afresh", async () => {
      mockLookup = placeList([stops[1]]);
      const view = await openTrips(short(15));

      await tap(view, BUILT.label);

      await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
      expect(mockLookup.refresh).toHaveBeenCalledTimes(1);
      expect(savedStops()).toEqual(stops.filter((id) => id !== stops[1]));
    });
  });

  // One trip fits the answers: nothing to choose (owner, 2026-11-28: "trip pick step shows even w only one card"), so
  // it is taken as picked, the way a tap on its card takes it. The website skips its cards for one trip too (quiz.js
  // 731), and sends no choice for it. Once for a set of answers.
  describe("when one trip fits", () => {
    const steps = () => mockLog.mock.calls.filter((c) => c[0] === "quiz_step");

    it("is saved and opened in Trips with no tap, for someone with no trip yet", async () => {
      await openTrips(after(15));

      await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen("trip-new")));
      expect(mockTrips.saveItinerary).toHaveBeenCalledTimes(1);
      expect(mockTrips.saveItinerary.mock.calls[0][0]).toMatchObject({ title: WEEK.label, startArea: "queenstown" });
      await waitFor(async () => expect(await saved()).toBeNull());
      expect(steps()).toEqual([]);
      expect(mockLog.mock.calls.filter((c) => c[0] === "trip_saved")).toHaveLength(1);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("asks first when they have a trip, and saves over it on Continue", async () => {
      mockTrips.itineraries = [MINE];
      mockTrips.saveItinerary = jest.fn(() => Promise.resolve(MINE.id));
      await openTrips(after(15));

      expect(alertSpy).toHaveBeenCalledWith("Start a New Trip?", "It replaces Hot Pools Weekend and its places.", expect.any(Array));
      expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
      await press("Continue");

      await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen(MINE.id)));
      expect(mockTrips.saveItinerary.mock.calls[0][0]).toMatchObject({ id: MINE.id, title: WEEK.label });
    });

    it("leaves them on its card on Cancel, asks no more for these answers, and Back goes as ever", async () => {
      mockTrips.itineraries = [MINE];
      const view = await openTrips(after(15));
      await press("Cancel");

      expect(within(cardOf(view, WEEK.label)).queryByTestId("trip-saving")).toBeNull();
      expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
      // back to the last question and on with the same answer: the same trip, not asked about again
      await fireEvent.press(view.getByLabelText("Back"));
      expect(view.getByText("Food tips?")).toBeTruthy();
      await tap(view, "Yes");
      expect(view.getByText(WEEK.label)).toBeTruthy();
      expect(alertSpy).toHaveBeenCalledTimes(1);
      // a tap on its card still saves it, after asking
      await tap(view, WEEK.label);
      expect(alertSpy).toHaveBeenCalledTimes(2);
    });

    // A save with no signal would only wait for it: held as a tap is held, and made once the signal is back.
    it("is held with no signal, its card saying so, and saved once the signal is back", async () => {
      mockNet.isConnected = false;
      const view = await openTrips(after(15));

      expect(view.getByText("Reconnect to Add")).toBeTruthy();
      expect(mockTrips.saveItinerary).not.toHaveBeenCalled();

      mockNet.isConnected = true;
      await view.rerender(<BuildTripScreen />);
      await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen("trip-new")));
      expect(mockTrips.saveItinerary).toHaveBeenCalledTimes(1);
    });

    it("waits for their trips when they aren't in yet, then goes on as ever", async () => {
      mockTrips.addFlow = null;
      mockListTrips.mockResolvedValue([]);
      await openTrips(after(15));

      await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen("trip-new")));
      expect(mockListTrips).toHaveBeenCalledTimes(1);
      expect(mockTrips.saveItinerary.mock.calls[0][0]).not.toHaveProperty("id");
    });

    it("goes to the account step on Sign in when the sign-in has run out, and isn't saved by itself again", async () => {
      mockTrips.saveItinerary = jest.fn().mockRejectedValue(new ApiError(401, "unauthorized"));
      const view = await openTrips(after(15));

      await waitFor(() => expect(mockClearLocalUserData).toHaveBeenCalledWith("uid-1"));
      mockSession.status = "guest";
      await view.rerender(<BuildTripScreen />);
      expect(view.getByText("Sign-in form: login, kia@ora.nz, Please sign in again to save your trip.")).toBeTruthy();

      // signed in again: back on its card, to tap
      mockSession.status = "authed";
      await view.rerender(<BuildTripScreen />);
      expect(view.getByText(WEEK.label)).toBeTruthy();
      expect(mockTrips.saveItinerary).toHaveBeenCalledTimes(1);
    });

    it("stays on its card with the app's words when it can't be saved, to tap again", async () => {
      mockTrips.saveItinerary = jest.fn().mockRejectedValueOnce(new Error("no signal")).mockResolvedValueOnce("trip-new");
      const view = await openTrips(after(15));

      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Couldn't save the trip. Try again."));
      expect(within(cardOf(view, WEEK.label)).queryByTestId("trip-saving")).toBeNull();
      expect(mockTrips.saveItinerary).toHaveBeenCalledTimes(1);

      await tap(view, WEEK.label);
      await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen("trip-new")));
      // the tap is a choice, as any tap on a card is
      expect(steps()).toEqual([["quiz_step", { step: "choice", answer: WEEK.key }]]);
    });
  });

  it("starts the quiz again from the foot of the cards, with nothing kept", async () => {
    const view = await openTrips(short(15));

    await tap(view, "Start again");

    expect(view.getByText("Where do you start?")).toBeTruthy();
    expect(view.queryByLabelText("Back")).toBeNull();
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).toBeNull());
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
  });
});

// The trips aren't kept on the phone, only the answers and the trip saved last: they are built again, and the quiz
// opens on its cards.
describe("a quiz left on the trips", () => {
  it("opens again on the trip cards", async () => {
    const view = await openTrips(short(15));

    expect(build).toHaveBeenCalledTimes(1);
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(view.getAllByTestId("trip-card")).toHaveLength(2);
    expect(await saved()).toEqual(short(15));
  });

  // An older version showed the trip, read-only, before saving it: a quiz left there opens on the cards.
  it("opens on the cards when it was left on the trip of an older version", async () => {
    const view = await openTrips({ ...picked(short(15), BUILT.key), step: "reveal" } as unknown as Quiz);

    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(cardOf(view, BUILT.label).props.accessibilityState).toEqual({ selected: true });
  });
});

// Once its trip is saved, the quiz is done with (owner, 2026-11-28: "the trip builder doesnt really reset"): cleared,
// so the next open, from the Trips tab, the tour or the trip's menu, is its first question with nothing answered. A
// quiz closed before any save opens again where it was left, as ever.
describe("once its trip is saved", () => {
  it("is cleared, and opens next on its first question with nothing answered", async () => {
    const view = await openTrips(short(15));

    await tap(view, BUILT.label);
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalled());
    await waitFor(async () => expect(await saved()).toBeNull());
    await view.unmount();
    jest.useRealTimers();
    mockLog.mockClear();

    const next = await open();
    expect(next.queryByLabelText("Back")).toBeNull();
    expect(next.getAllByTestId("town-card").map((c: any) => c.props.accessibilityState.selected)).toEqual([false, false, false, false]);
    // a new visit: its first answer begins the quiz again
    await tap(next, "Queenstown");
    expect(mockLog.mock.calls[0]).toEqual(["quiz_start", { from: "other" }]);
  });

  it("is cleared when the one trip that fits is saved by itself", async () => {
    await openTrips(after(15));

    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalled());
    await waitFor(async () => expect(await saved()).toBeNull());
  });

  // Not saved: the answers stay, for the cards again or to try again.
  it("isn't cleared by a Replace cancelled, or a save that failed", async () => {
    const alertSpy: jest.SpyInstance = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const press = (text: string) =>
      act(async () => alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2].find((b: any) => b.text === text).onPress?.());
    mockTrips.itineraries = [MINE];
    mockTrips.saveItinerary = jest.fn().mockRejectedValue(new Error("no signal"));
    const view = await openTrips(short(15));

    await tap(view, BUILT.label);
    await press("Cancel");
    expect(await saved()).toEqual(short(15));

    await tap(view, BUILT.label);
    await press("Continue");
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Couldn't save the trip. Try again."));
    expect(await saved()).toEqual(short(15));
    alertSpy.mockRestore();
  });

  it("keeps a quiz closed before any save, which opens again where it was left", async () => {
    const view = await from(7, "How active?");
    await tap(view, "Some walking");
    await view.unmount();

    const again = await open("How much driving?");
    expect(again.getByLabelText("Back")).toBeTruthy();
  });
});

// The quiz's events, as the website's quiz sends them (kiwiguide-site public/plan/quiz.js: quiz_start, quiz_step for
// each answer, trip_saved): the owner's "the quiz's events go to analytics". Who's travelling and how old are asked
// for these only.
describe("analytics", () => {
  const logged = (name: string) => mockLog.mock.calls.filter((c) => c[0] === name).map((c) => c[1]);
  // Analytics' limits (Firebase, GA4): names to 40 characters, values to 100, 25 params, and nothing about the person.
  const withinLimits = () => {
    for (const [name, params = {}] of mockLog.mock.calls) {
      expect(name.length).toBeLessThanOrEqual(40);
      expect(Object.keys(params).length).toBeLessThanOrEqual(25);
      for (const [key, value] of Object.entries(params)) {
        expect(key.length).toBeLessThanOrEqual(40);
        expect(String(value).length).toBeLessThanOrEqual(100);
        expect(String(value)).not.toMatch(/kia@ora\.nz|uid-1/);
      }
    }
  };

  it.each([
    ["the tour", { from: "tour" }, "tour"],
    ["the Trips tab", { from: "trips" }, "trips"],
    ["the trip's menu", { from: "menu" }, "menu"],
    ["anywhere else", {}, "other"],
    ["an address it doesn't know", { from: "somewhere" }, "other"],
  ])("starts a fresh quiz from %s with quiz_start, once, as its first answer is given", async (_way, params, from) => {
    mockParams = params as Record<string, string>;
    const view = await open();
    expect(mockLog).not.toHaveBeenCalled();

    await tap(view, "Queenstown", "About a week");

    expect(mockLog.mock.calls).toEqual([
      ["quiz_start", { from }],
      ["quiz_step", { step: "start", answer: "queenstown" }],
      ["quiz_step", { step: "band", answer: "week" }],
    ]);
  });

  it("logs every answer in the website's words, the swipe cards' two lists apart, none for the photo breaks", async () => {
    jest.useFakeTimers();
    const view = await open();

    await tap(view, "Queenstown", "A long weekend", "Next", "Finish back in Queenstown", "Next", "Summer", MONTH);
    await tap(view, "Some walking", "Some", "Couple", "30–44", "Nature", "Next", "Next");
    await swipeAll(view);
    await tap(view, "Yes");
    await wait();
    await tap(view, BUILT.label);
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalled());

    expect(logged("quiz_start")).toHaveLength(1);
    expect(logged("quiz_step")).toEqual([
      { step: "start", answer: "queenstown" },
      { step: "band", answer: "weekend" },
      { step: "days", answer: "4" },
      { step: "finish", answer: "queenstown" },
      { step: "season", answer: "summer" },
      { step: "month", answer: `${NEXT_SUMMER.month}-${NEXT_SUMMER.year}` },
      { step: "pace", answer: "some" },
      { step: "drive", answer: "240" },
      { step: "who", answer: "couple" },
      { step: "age", answer: "30-44" },
      { step: "vibe", answer: "nature" },
      { step: "into", answer: "Scenic" },
      { step: "activities", answer: "wine" },
      { step: "food", answer: "yes" },
      { step: "choice", answer: BUILT.key },
    ]);
    withinLimits();
  });

  // Opened again part way, and its first question answered again: the quiz was begun before.
  it("doesn't start a quiz opened again part way", async () => {
    const view = await from(1, "How long have you got?");

    await fireEvent.press(view.getByLabelText("Back"));
    await tap(view, "Queenstown");

    expect(mockLog.mock.calls).toEqual([["quiz_step", { step: "start", answer: "queenstown" }]]);
  });

  // One quiz_start a visit, as the website sends it (quiz.js 395–396; its Start again, 921, doesn't send another).
  it("doesn't start again after Start again: one a visit", async () => {
    mockParams = { from: "trips" };
    const view = await openTrips(short(15));

    await tap(view, "Start again", "Christchurch");

    expect(mockLog.mock.calls).toEqual([["quiz_step", { step: "start", answer: "christchurch" }]]);
  });

  // Two taps land before the next question is drawn, both on the one before: the quiz takes the first, and only
  // the answer it took is sent.
  it("sends one quiz_start and one quiz_step for two taps in one go", async () => {
    const view = await open();
    const town = view.getByText("Queenstown");

    await act(async () => {
      void fireEvent.press(town);
      void fireEvent.press(town);
    });

    expect(view.getByText("How long have you got?")).toBeTruthy();
    expect(mockLog.mock.calls).toEqual([
      ["quiz_start", { from: "other" }],
      ["quiz_step", { step: "start", answer: "queenstown" }],
    ]);
  });

  it("sends nothing for an answer tapped as Back was", async () => {
    const view = await from(1, "How long have you got?");
    const week = view.getByText("About a week");
    const back = view.getByLabelText("Back");

    await act(async () => {
      void fireEvent.press(back);
      void fireEvent.press(week);
    });

    expect(view.getByText("Where do you start?")).toBeTruthy();
    expect(mockLog).not.toHaveBeenCalled();
  });

  it("logs nothing on Back", async () => {
    const view = await from(9, "Who’s travelling?");

    await fireEvent.press(view.getByLabelText("Back"));
    await fireEvent.press(view.getByLabelText("Back"));

    expect(view.getByText("How active?")).toBeTruthy();
    expect(mockLog).not.toHaveBeenCalled();
  });

  describe("a trip saved", () => {
    let alertSpy: jest.SpyInstance;
    beforeEach(() => {
      alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    });
    afterEach(() => alertSpy.mockRestore());
    const press = (text: string) =>
      act(async () => alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2].find((b: any) => b.text === text).onPress?.());
    // The website's measureParams: what the trip is and the answers it was built for, fixed ids and numbers only.
    const MEASURE = { kind: "built", days: 4, start: "queenstown", end: "queenstown", pace: "some", drive: 240 };

    // The choice is sent as the card is tapped, as the website sends it as its card is picked (quiz.js 919), and
    // trip_saved once the trip is saved.
    it("logs the pick as the card is tapped, then trip_saved, with the trip, that it replaced nothing, and the website's params", async () => {
      let finish: (id: string) => void = () => {};
      mockTrips.saveItinerary = jest.fn(() => new Promise<string>((resolve) => (finish = resolve)));
      const view = await openTrips(short(15));

      await tap(view, BUILT.label);
      expect(mockLog.mock.calls).toEqual([["quiz_step", { step: "choice", answer: BUILT.key }]]);

      await act(async () => finish("trip-new"));
      expect(mockLog.mock.calls).toEqual([
        ["quiz_step", { step: "choice", answer: BUILT.key }],
        ["trip_saved", { trip: BUILT.key, replaced: "false", ...MEASURE }],
      ]);
      withinLimits();
    });

    it("says when it replaced a trip of theirs", async () => {
      mockTrips.itineraries = [MINE];
      mockTrips.saveItinerary = jest.fn(() => Promise.resolve(MINE.id));
      const view = await openTrips(short(15));
      await tap(view, BUILT.label);

      await press("Continue");

      await waitFor(() => expect(logged("trip_saved")).toEqual([{ trip: BUILT.key, replaced: "true", ...MEASURE }]));
    });

    // Cancelled, then a save that failed: each tap was a choice, as on the website, and nothing was saved.
    it("counts each pick, with no trip_saved for one that wasn't saved", async () => {
      mockTrips.itineraries = [MINE];
      mockTrips.saveItinerary = jest.fn().mockRejectedValue(new Error("no signal"));
      const view = await openTrips(short(15));
      await tap(view, BUILT.label);
      await press("Cancel");

      await tap(view, BUILT.label);
      await press("Continue");
      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Couldn't save the trip. Try again."));

      expect(mockLog.mock.calls).toEqual([
        ["quiz_step", { step: "choice", answer: BUILT.key }],
        ["quiz_step", { step: "choice", answer: BUILT.key }],
      ]);
    });
  });
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require("react-native");

// Stage 8's checks (docs/plans/app-trip-builder.md): what a phone, an iPad and the Duo, VoiceOver and no signal ask of
// the quiz, as far as a test can see them. Dark is components/tripBuilder/__tests__/quizDark.test.tsx.

// Every question and the screens after them: the saved quiz each opens on, and words only that one shows.
const EVERY_STEP: [string, () => Quiz, string][] = [
  ["start", () => after(0), "Where do you start?"],
  ["band", () => after(1), "How long have you got?"],
  ["days", () => after(2), "How many days?"],
  ["finish", () => after(3), "Where does your trip finish?"],
  ["break1", () => after(4), "Queenstown, 7 days."],
  ["season", () => after(5), "Which NZ season are you picking?"],
  ["month", () => after(6), "Which month?"],
  ["pace", () => after(7), "How active?"],
  ["drive", () => after(8), "How much driving?"],
  ["who", () => after(9), "Who’s travelling?"],
  ["age", () => after(10), "How old are you?"],
  ["vibe", () => after(11), "What’s the vibe?"],
  ["break2", () => after(12), BREAK2],
  ["into", () => after(13), "What are you into?"],
  ["food", () => after(14), "Food tips?"],
  ["account", () => onAccount(after(15)), ACCOUNT_TITLE],
  // Two trips: one alone would be saved as it shows.
  ["choice", () => short(15), CARDS_TITLE],
];
// The screen opened on one of them: someone not signed in for the account step, the trips built for the cards.
const openOn = async ([step, quiz, title]: (typeof EVERY_STEP)[number]) => {
  if (step === "account") mockSession.status = "guest";
  if (step === "choice") return openTrips(quiz());
  await AsyncStorage.setItem(KEY, JSON.stringify(quiz()));
  return open(title);
};
// Whether these words sit in the quiz's column: the website's width at most, in the middle of the screen.
const inColumn = (node: any) => {
  for (let n = node; n; n = n.parent) {
    const style = StyleSheet.flatten(n.props?.style) ?? {};
    if (style.maxWidth === 520 && style.alignSelf === "center") return true;
  }
  return false;
};

// The quiz has one layout and reads nothing of how wide the screen is: a centred column of the website's width (520,
// QUIZ_COLUMN), so on an iPad or the open Duo it is the phone's quiz in the middle of the screen. So this is a render
// check at each size: every step drawn, in the column, the top row too; and the one part sized by the window, the
// first photo break's photo, kept to a little over half its height (0.52, as the website's).
describe("at every screen size", () => {
  const SCREENS: [string, boolean, { width: number; height: number }][] = [
    ["an iPad sideways", true, { width: 1376, height: 1032 }],
    ["an iPad upright", true, { width: 1032, height: 1376 }],
    ["the Duo open upright", true, { width: 669, height: 951 }],
    ["the Duo open sideways", true, { width: 951, height: 669 }],
    ["the Duo folded (a phone)", false, { width: 393, height: 852 }],
  ];
  let size: jest.SpyInstance | undefined;
  afterEach(() => size?.mockRestore());

  it.each(SCREENS)("renders every step on %s, in the one centred column", async (_name, wide, window) => {
    require("@blacksands/ui").__setWide(wide, window);
    size = jest.spyOn(RN, "useWindowDimensions").mockReturnValue({ ...window, scale: 3, fontScale: 1 });

    for (const entry of EVERY_STEP) {
      const view = await openOn(entry);
      expect(inColumn(view.getByText(entry[2]))).toBe(true);
      expect(inColumn(view.getByLabelText("Close"))).toBe(true);
      if (entry[0] === "break1") expect(StyleSheet.flatten(view.getByTestId("town-photo").props.style).maxHeight).toBe(window.height * 0.52);
      await view.unmount();
      jest.useRealTimers();
      mockSession.status = "authed";
      await AsyncStorage.clear();
    }
  });
});

// VoiceOver: every button says what it is and what it does (test/a11y.ts: the kit's own button is a stand-in here
// whose role is fixed, its real role pinned in the kit's tests), a picked answer says it is picked, and nothing needs
// a swipe (the swipe cards have their No and Yes, the trips their cards).
describe("with VoiceOver", () => {
  const sweep = (view: any, where: string) => {
    expect(tappable(view.root).length).toBeGreaterThan(0);
    expect([where, ...unnamed(view.root)]).toEqual([where]);
  };
  // The button a line of words is in, and what it tells VoiceOver of its state.
  const stateOf = (view: any, label: string) => {
    for (let n = view.getByText(label); n; n = n.parent) if (n.props?.accessibilityRole === "button") return n.props.accessibilityState;
    throw new Error(`${label} isn't in a button`);
  };
  // Every question answered from the first, each screen swept before it is; the swipe cards with their buttons.
  const answerAll = async (view: any) => {
    const steps: [string, string[]][] = [
      ["start", ["Queenstown"]],
      ["band", ["A long weekend"]],
      ["days", ["Next"]],
      ["finish", ["Finish back in Queenstown"]],
      ["break1", ["Next"]],
      ["season", ["Summer"]],
      ["month", [MONTH]],
      ["pace", ["Some walking"]],
      ["drive", ["Some"]],
      ["who", ["Couple"]],
      ["age", ["30–44"]],
      ["vibe", ["Nature"]],
    ];
    for (const [where, taps] of steps) {
      sweep(view, where);
      // The days: a slider VoiceOver turns up and down, not a row of buttons.
      if (where === "days") expect(view.getByRole("adjustable")).toBeTruthy();
      await tap(view, ...taps);
    }
    expect(stateOf(view, "Nature")).toEqual({ selected: true });
    expect(stateOf(view, "Relax")).toEqual({ selected: false });
    await tap(view, "Next");
    sweep(view, "break2");
    await tap(view, "Next");
    sweep(view, "into");
    expect(view.getByLabelText(/^No, skip /)).toBeTruthy();
    expect(view.getByLabelText(/^Yes, add /)).toBeTruthy();
    await swipeAll(view);
    sweep(view, "food");
    await tap(view, "Yes");
  };

  it("can be taken from the first question to the trip cards and back, every button named, the answers said to be picked", async () => {
    jest.useFakeTimers();
    const view = await open();
    await answerAll(view);
    await wait();
    sweep(view, "choice");
    // Each trip is one button that says all that is on its card.
    const cards = view.getAllByTestId("trip-card");
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card.props.accessibilityRole).toBe("button");
      expect(card.props.accessibilityLabel).toMatch(/^(Built for you|Hand-checked trip)\. .+\. .+\. \d+ days, /);
      expect(card.props.accessibilityState).toEqual({ selected: false });
    }

    // Back, a question at a time: the answer given is said to be the one picked.
    const back = () => fireEvent.press(view.getByLabelText("Back"));
    const given: [string, string][] = [
      ["Food tips?", "Yes"],
      ["What are you into?", ""],
      ["What’s the vibe?", "Nature"],
      ["How old are you?", "30–44"],
      ["Who’s travelling?", "Couple"],
      ["How much driving?", "Some"],
      ["How active?", "Some walking"],
      ["Which month?", MONTH],
      ["Which NZ season are you picking?", "Summer"],
      ["Where does your trip finish?", "Finish back in Queenstown"],
      ["How many days?", ""],
      ["How long have you got?", "A long weekend"],
      ["Where do you start?", "Queenstown"],
    ];
    for (const [title, answer] of given) {
      await back();
      expect(view.getByText(title)).toBeTruthy();
      sweep(view, title);
      if (answer) expect(stateOf(view, answer)).toEqual({ selected: true });
    }
  });

  // Someone not signed in: the same questions, then the account step. Its form is the app's sign-in, a stand-in
  // here; the real one is swept in components/tripBuilder/__tests__/accountStep.test.tsx.
  it("can be taken to the account step by a guest, every button named", async () => {
    mockSession.status = "guest";
    const view = await open();

    await answerAll(view);

    expect(view.getByText(ACCOUNT_TITLE)).toBeTruthy();
    expect(view.getByText("Sign-in form: signup")).toBeTruthy();
    sweep(view, "account");
    expect(view.getByLabelText("Back")).toBeTruthy();
  });
});

// No signal: the builder and its data are in the app, so the whole quiz can be answered and its trips built, and
// saving waits for the signal (stage 6). The photos load from the api: each keeps its dark fill under it, what shows
// when it can't load (the quiz has nothing of its own to do then, so only a phone shows it).
it("can be answered to the trip cards with no signal, the save held", async () => {
  mockNet.isConnected = false;
  mockNet.isInternetReachable = false;
  mockPrefetch.mockImplementation(() => Promise.reject(new Error("no signal")));
  jest.useFakeTimers();
  const view = await open();
  for (const card of view.getAllByTestId("town-card")) expect(card).toHaveStyle({ backgroundColor: tokens.colors.scrim });

  await tap(view, "Queenstown", "A long weekend", "Next", "Finish back in Queenstown", "Next", "Summer", MONTH);
  await tap(view, "Some walking", "Some", "Couple", "30–44", "Nature", "Next", "Next");
  await swipeAll(view);
  await tap(view, "Yes");
  await wait();

  expect(view.getAllByTestId("trip-card")).toHaveLength(2);
  for (const photo of view.getAllByTestId("trip-photo")) expect(photo).toHaveStyle({ backgroundColor: tokens.colors.scrim });
  expect(view.getByText("Reconnect to Add")).toBeTruthy();
  await tap(view, BUILT.label);
  expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
  expect(mockListTrips).not.toHaveBeenCalled();
  expect(mockPrefetch).toHaveBeenCalled();
});
