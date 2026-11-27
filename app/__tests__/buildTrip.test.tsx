// The trip quiz's screen (docs/plans/app-trip-builder.md, stages 3 to 6): the website's questions tapped
// through in its order, Back from each, the bar's progress, a quiz left part way coming back on its step, and
// after the last question the account step for someone not signed in, the wait, and the trip cards, where a pick
// saves the trip and opens it in Trips.
// The real hook, steps and builder run against the library's stand-in store; each step's own options and words
// are pinned in components/tripBuilder/__tests__ (quizSteps, quizStepsSecondHalf, swipeDeck, quizTripSteps,
// accountStep).

// The account step's form is the app's own sign-in, pinned in its own tests (accountStep, and the login screen's):
// here it says which way it is open, and whether it offers a guest's way out.
jest.mock("@/lib/uiKit", () => {
  const base = require("@/test/uiKitMock");
  const React = require("react");
  const { Text } = require("react-native");
  return {
    ...base,
    AuthPanel: ({ mode, onGuest }: any) => React.createElement(Text, null, `Sign-in form: ${mode}${onGuest ? ", Continue as guest" : ""}`),
  };
});
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
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));
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
const mockAuth = { currentUser: { uid: "uid-1" }, signOut: jest.fn(() => Promise.resolve()) };
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
import { AccessibilityInfo, Alert, Animated } from "react-native";
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
  mockTrips.itineraries = [];
  mockTrips.addFlow = "create";
  mockTrips.saveItinerary = jest.fn(() => Promise.resolve("trip-new"));
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
  // one trip fits a week from Queenstown and back: a card of its own, to pick as any card is
  expect(view.getByText("1 trip fits Queenstown and back · 7 days")).toBeTruthy();
  expect(view.getByText(CARDS_TITLE)).toBeTruthy();
  expect(view.getAllByTestId("trip-card")).toHaveLength(1);
  expect(within(view.getByTestId("trip-card")).getByText(WEEK.label)).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.choice);
  // nothing picked yet
  expect(await saved()).toEqual(after(15));
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
  await waitFor(async () => expect(await saved()).toEqual(picked(short(15), BUILT.key)));
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
    const view = await openTrips(picked(after(15), WEEK.key));
    const back = () => fireEvent.press(view.getByLabelText("Back"));
    expect(view.getByText(WEEK.label)).toBeTruthy();

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
    expect(view.getByTestId("days-count").props.accessibilityLabel).toBe("7 days");
    await back();
    expect(view.getByText("How long have you got?")).toBeTruthy();
    await back();
    expect(view.getByText("Where do you start?")).toBeTruthy();
    expect(view.queryByLabelText("Back")).toBeNull();

    // the answers are kept, the trip saved last among them, and the step it went back to is saved
    await waitFor(async () => expect(await saved()).toEqual({ state: picked(after(15), WEEK.key).state, step: "start" }));
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

  it("is shut again after Start again", async () => {
    const view = await openTrips(after(15));
    // all the way back from the trip's card to the start, where the other towns are opened
    for (let i = 0; i < 13; i++) await fireEvent.press(view.getByLabelText("Back"));
    await tap(view, "Somewhere else?");
    expect(view.getByText("Dunedin")).toBeTruthy();

    // and all the way on again: the answers are still there, the swipe cards show their last one, and the trip's
    // card is there at once (it was built for these answers on the way in), with Start again under it
    await tap(view, "Queenstown", "About a week", "Next", "Finish back in Queenstown", "Next", "Summer", MONTH);
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

  // Left on the cards with a trip saved, then signed out since: no trips without an account. The trip saved last
  // is kept, marked for after.
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
    await AsyncStorage.setItem(KEY, JSON.stringify(picked(after(15), WEEK.key)));
    const view = await open(WAITING);

    expect(view.queryByLabelText("Back")).toBeNull();

    await wait();
    expect(within(view.getByTestId("trip-card")).getByText(WEEK.label)).toBeTruthy();
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
  // A button of the alert up last, pressed.
  const press = (text: string) =>
    act(async () => alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2].find((b: any) => b.text === text).onPress());

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
    // and the quiz keeps it as the trip saved last
    await waitFor(async () => expect(await saved()).toEqual(picked(short(15), BUILT.key)));
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
  // account step, the trip picked kept for after.
  it("goes back to the account step when the api says the sign-in has run out", async () => {
    mockTrips.saveItinerary = jest.fn().mockRejectedValue(new ApiError(401, "unauthorized"));
    const view = await openTrips(short(15));

    await tap(view, BUILT.label);

    await waitFor(() => expect(mockClearLocalUserData).toHaveBeenCalledWith("uid-1"));
    expect(alertSpy).toHaveBeenCalledWith("Your session expired. Please sign in again.");
    expect(mockEnableGuest).toHaveBeenCalled();
    expect(mockAuth.signOut).toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    // signed out, as the session then says
    mockSession.status = "guest";
    await view.rerender(<BuildTripScreen />);
    expect(view.getByText(ACCOUNT_TITLE)).toBeTruthy();
  });

  // Before the list of their trips is in (no signal on a first open, say), whether one would be replaced isn't known.
  it("saves nothing while it isn't known yet whether they have a trip", async () => {
    mockTrips.addFlow = null;
    const view = await openTrips(short(15));

    await tap(view, BUILT.label);

    expect(alertSpy).toHaveBeenCalledWith("Couldn't save the trip. Try again.");
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
  });

  it("saves the one trip that fits from its own card", async () => {
    const view = await openTrips(after(15));

    await tap(view, WEEK.label);

    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith(tripScreen("trip-new")));
    expect(mockTrips.saveItinerary.mock.calls[0][0]).toMatchObject({ title: WEEK.label, startArea: "queenstown" });
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

  it("opens again on the cards with the trip saved last marked, and Back from them is the last question", async () => {
    const view = await openTrips(picked(short(15), CHECKED.key));

    expect(build).toHaveBeenCalledTimes(1);
    expect(cardOf(view, CHECKED.label).props.accessibilityState).toEqual({ selected: true });
    expect(cardOf(view, BUILT.label).props.accessibilityState).toEqual({ selected: false });
    expect(progress(view)).toBe(SITE_PROGRESS.choice);
    expect(await saved()).toEqual(picked(short(15), CHECKED.key));

    await fireEvent.press(view.getByLabelText("Back"));
    expect(view.getByText("Food tips?")).toBeTruthy();
    expect(progress(view)).toBe(SITE_PROGRESS.food);
  });

  // The trip saved from it is their trip now: another card replaces it, after asking.
  it("asks before another trip replaces the one saved from it", async () => {
    mockTrips.itineraries = [{ ...MINE, title: CHECKED.label }];
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const view = await openTrips(picked(short(15), CHECKED.key));

    await tap(view, BUILT.label);

    expect(alertSpy).toHaveBeenCalledWith("Start a New Trip?", `It replaces ${CHECKED.label} and its places.`, expect.any(Array));
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("opens again on the one trip that fits, on its card", async () => {
    const view = await openTrips(picked(after(15), WEEK.key));

    expect(view.getAllByTestId("trip-card")).toHaveLength(1);
    expect(cardOf(view, WEEK.label).props.accessibilityState).toEqual({ selected: true });
  });

  // An older version showed the trip, read-only, before saving it: a quiz left there opens on the cards.
  it("opens on the cards when it was left on the trip of an older version", async () => {
    const view = await openTrips({ ...picked(short(15), BUILT.key), step: "reveal" } as unknown as Quiz);

    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(cardOf(view, BUILT.label).props.accessibilityState).toEqual({ selected: true });
  });

  // The builder's data changed in an update, say: the trip saved last isn't one of these any more.
  it("marks no card when the trip saved last is no longer one of them", async () => {
    const view = await openTrips(picked(short(15), "a-trip-that-is-gone"));

    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(view.getAllByTestId("trip-card").map((c: any) => c.props.accessibilityState.selected)).toEqual([false, false]);
  });
});
