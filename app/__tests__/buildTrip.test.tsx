// The trip quiz's screen (docs/plans/app-trip-builder.md, stages 3 to 5): the website's questions tapped
// through in its order, Back from each, the bar's progress, a quiz left part way coming back on its step, and
// after the last question the wait, the trip cards and the trip.
// The real hook, steps, builder and trip view run against the library's stand-in store; each step's own options
// and words are pinned in components/tripBuilder/__tests__ (quizSteps, quizStepsSecondHalf, swipeDeck,
// quizTripSteps, tripReveal).

// A stop on an open day is a stand-in that says which place it is (as in the Trips tab's own tests).
jest.mock("@/lib/uiKit", () => {
  const base = require("@/test/uiKitMock");
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  return {
    ...base,
    components: {
      ...base.components,
      TimelineBlock: ({ item, onEdit }: any) =>
        React.createElement(TouchableOpacity, { testID: "stop-" + item.siteId, onPress: () => onEdit(item) }, React.createElement(Text, null, "Stop: " + item.siteName)),
      TransitBlock: () => null,
    },
  };
});
jest.mock("@/components/itinerary/DriveBlock", () => ({ DriveBlock: () => null }));
// The app's places. Empty unless a test fills it: a first run with no signal, when the trip view places each
// stop by the builder's own record.
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

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

import React from "react";
import { AccessibilityInfo, Animated } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";

import BuildTripScreen from "@/app/build-trip";
import data from "@/assets/data/builder-data.json";
import { deckNudge } from "@/components/tripBuilder/SwipeDeck";
import { answerQuiz, blankQuiz, type Quiz, type QuizAnswer } from "@/lib/tripBuilder/quizFlow";
import { quizTrips } from "@/lib/tripBuilder/quizTrips";
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
const through = (answers: QuizAnswer[]) => answers.reduce<Quiz>((quiz, a) => answerQuiz(quiz.state, a), { state: blankQuiz(), step: "start" });
// The quiz after the first n answers: after(7) is on "How active?", after(15) on the trips.
const after = (n: number) => through(ANSWERS.slice(0, n));
const saved = async () => JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null");
const BREAK2 = "Over 500 places on the island. Picking the ones that fit you.";

// The trips. One fits a week from Queenstown and back, built for the answers, with nowhere for wine on its way:
// it shows on its own.
const WEEK = { key: "built-queenstown-7-loop", label: "South Island in 7 Days" };
// Two fit the same answers with a long weekend's four days, so there are cards: one of the app's suggested trips,
// and one built for the answers.
const SHORT: QuizAnswer[] = ANSWERS.map((a) => (a.step === "band" ? { step: "band", value: "weekend" } : a.step === "days" ? { step: "days", value: 4 } : a));
const short = (n: number) => through(SHORT.slice(0, n));
const CHECKED = { key: "queenstown-and-wanaka-in-four-days", label: "Queenstown and Wānaka in Four Days" };
const BUILT = { key: "built-queenstown-4-loop", label: "South Island in 4 Days" };
// The quiz on a trip already picked.
const onTrip = (quiz: Quiz, pick: string): Quiz => ({ state: { ...quiz.state, pick }, step: "reveal" });
const WAITING = "Picking the places that fit you…";
const CARDS_TITLE = "Which one sounds like you?";
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
// The places drawn on an open day, in their order.
const stops = (view: any) => view.queryAllByTestId(/^stop-/).map((n: any) => n.props.testID.slice(5));
// The app's list with every place the builder knows but these.
const listWithout = (...gone: string[]) => {
  const list = Object.values(data.places as Record<string, any>).filter((p) => !gone.includes(p.id));
  const byId = new Map(list.map((p) => [p.id, p]));
  return { places: (id: string) => byId.get(id), list, ready: true, count: list.length, err: "", refresh: jest.fn() };
};

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
  who: 53, age: 58, vibe: 63, break2: 67, into: 74, food: 86, choice: 95, reveal: 97,
};
const focus = AccessibilityInfo.sendAccessibilityEvent as jest.Mock;
// The heading the screen reader was last sent to.
const focused = () => focus.mock.calls[focus.mock.calls.length - 1][0].props.children;

// The bar's slide and a swipe card's fly-off run frame by frame, which would outlive a test and redraw outside
// it. Here each lands at once and says it finished; "the bar" tests read how it was asked to move.
let timing: jest.SpyInstance;

beforeEach(async () => {
  // The one set of trips the app keeps is another trip's at the start of every test, so each one's own trips
  // are built in it: a wait is a wait whatever ran before.
  quizTrips({ ...after(15).state, days: 2 }, new Date());
  jest.clearAllMocks();
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

it("walks on through pace, driving, who, age, the vibe, the second photo break, the cards and food, to the wait and the trip", async () => {
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
  // one trip fits a week from Queenstown and back: it shows on its own, with no cards to pick from
  expect(view.queryByText(CARDS_TITLE)).toBeNull();
  expect(view.getByText("Your trip")).toBeTruthy();
  expect(view.getByText(WEEK.label)).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.reveal);
  // and it is the quiz's pick, on the phone with the rest
  await waitFor(async () => expect(await saved()).toEqual(onTrip(after(15), WEEK.key)));
});

// The whole quiz by hand, with a long weekend's four days: two trips fit, so the trip cards show on the way.
it("walks from the first question to a trip: every question, the wait, the trip cards, the trip and one of its days", async () => {
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
  expect(view.getByText("Your trip")).toBeTruthy();
  expect(view.getByRole("header").props.children).toBe(BUILT.label);
  expect(view.getByText("From Queenstown and back")).toBeTruthy();
  expect(view.getByText(`4 days · ${MONTH}.`)).toBeTruthy();
  expect(view.getAllByTestId(/^day-row-/)).toHaveLength(4);
  expect(progress(view)).toBe(SITE_PROGRESS.reveal);
  await waitFor(async () => expect(await saved()).toEqual(onTrip(short(15), BUILT.key)));

  // a day of it, as the app's own trip view draws one
  await fireEvent.press(view.getByTestId("day-row-day_1"));
  expect(within(view.getByTestId("day-heading")).getByText("Day 1")).toBeTruthy();
  const [, trip] = quizTrips(short(15).state, new Date());
  expect(trip.key).toBe(BUILT.key);
  expect(stops(view)).toEqual(trip.days[0].items.map((i) => i.siteId));
  expect(stops(view).length).toBeGreaterThan(0);
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
    const view = await openTrips(after(15));
    const back = () => fireEvent.press(view.getByLabelText("Back"));
    expect(view.getByText(WEEK.label)).toBeTruthy();

    // one trip never showed its cards, so Back from it goes past them to the last question
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

    // the answers are kept, the trip that was shown among them, and the step it went back to is saved
    await waitFor(async () => expect(await saved()).toEqual({ state: onTrip(after(15), WEEK.key).state, step: "start" }));
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
    // all the way back from the trip to the start, where the other towns are opened
    for (let i = 0; i < 13; i++) await fireEvent.press(view.getByLabelText("Back"));
    await tap(view, "Somewhere else?");
    expect(view.getByText("Dunedin")).toBeTruthy();

    // and all the way on again: the answers are still there, the cards show their last one, and the trip is
    // there at once (it was built for these answers on the way in)
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

  it("builds the trips once for a set of answers, however often the cards and the trips are come back to", async () => {
    const view = await food();
    await tap(view, "Yes");
    await wait();
    expect(build).toHaveBeenCalledTimes(1);

    // to each trip and back to the cards, then back to the last question and on with the same answer
    await tap(view, BUILT.label);
    await back(view);
    await tap(view, CHECKED.label);
    await back(view);
    await back(view);
    expect(view.getByText("Food tips?")).toBeTruthy();
    await tap(view, "Yes");

    // the trips already built: there at once, with no wait
    expect(view.queryByText(WAITING)).toBeNull();
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(build).toHaveBeenCalledTimes(1);

    // another answer is another set of trips
    await back(view);
    await tap(view, "No");
    expect(view.getByText(WAITING)).toBeTruthy();
    await wait();
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(build).toHaveBeenCalledTimes(2);
  });

  it("isn't shown on the way back to the cards from a trip", async () => {
    const view = await openTrips(short(15));
    await tap(view, BUILT.label);
    expect(view.getByText("Your trip")).toBeTruthy();

    await back(view);

    expect(view.queryByText(WAITING)).toBeNull();
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(build).toHaveBeenCalledTimes(1);
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

  it("is left by Back, and no trips turn up on the question gone back to", async () => {
    const view = await food();
    await tap(view, "Yes");
    await ms(100);

    await back(view);
    await wait();

    expect(view.getByText("Food tips?")).toBeTruthy();
    expect(view.queryByText(CARDS_TITLE)).toBeNull();
    expect(build).not.toHaveBeenCalled();
  });

  it("sends a screen reader to the waiting words, and then to what the wait was for", async () => {
    const view = await food();
    await tap(view, "Yes");
    expect(focused()).toBe(WAITING);

    await wait();
    expect(focused()).toBe(CARDS_TITLE);

    await tap(view, BUILT.label);
    expect(focused()).toBe(BUILT.label);
  });
});

// Several trips fit: a card each, and a tap on one is the quiz's pick.
describe("the trip cards", () => {
  it("open the trip that is tapped, and keep it as the quiz's pick", async () => {
    const view = await openTrips(short(15));
    expect(progress(view)).toBe(SITE_PROGRESS.choice);

    await tap(view, CHECKED.label);

    expect(view.getByRole("header").props.children).toBe(CHECKED.label);
    expect(view.getByText("Hand-checked trip: some walking, up to 4 hours of driving a day, nature, food tips, wine.")).toBeTruthy();
    expect(progress(view)).toBe(SITE_PROGRESS.reveal);
    await waitFor(async () => expect(await saved()).toEqual(onTrip(short(15), CHECKED.key)));
  });

  it("are gone back to from a trip, the one looked at marked, and Back from them is the last question", async () => {
    const view = await openTrips(short(15));
    await tap(view, BUILT.label);

    await fireEvent.press(view.getByLabelText("Back"));
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(progress(view)).toBe(SITE_PROGRESS.choice);
    const [checked, built] = view.getAllByTestId("trip-card");
    expect(built.props.accessibilityState).toEqual({ selected: true });
    expect(checked.props.accessibilityState).toEqual({ selected: false });

    await fireEvent.press(view.getByLabelText("Back"));
    expect(view.getByText("Food tips?")).toBeTruthy();
    expect(progress(view)).toBe(SITE_PROGRESS.food);
  });
});

describe("the trip", () => {
  it("says what it was built for, and what it couldn't fit: nowhere for wine on a week from Queenstown", async () => {
    const view = await openTrips(after(15));

    expect(view.getByRole("header").props.children).toBe(WEEK.label);
    expect(view.getByText("Built for you: some walking, up to 4 hours of driving a day, nature, food tips, wine.")).toBeTruthy();
    expect(view.getByText("Nothing for wine on this route.")).toBeTruthy();
  });

  it("is the trip that was built: a row for each of its days, and each day's own stops when it is opened", async () => {
    const view = await openTrips(after(15));
    const [trip] = quizTrips(after(15).state, new Date());
    expect(trip.key).toBe(WEEK.key);

    expect(view.getAllByTestId(/^day-row-/)).toHaveLength(7);
    for (const [n, day] of trip.days.entries()) {
      await fireEvent.press(view.getByTestId(`day-row-day_${n + 1}`));
      expect(within(view.getByTestId("day-heading")).getByText(`Day ${n + 1}`)).toBeTruthy();
      expect(stops(view)).toEqual(day.items.map((i) => i.siteId));
      await fireEvent.press(view.getByLabelText("Back"));
    }
    expect(trip.days.flatMap((d) => d.items).length).toBeGreaterThan(7);
  });

  it("shuts an open day on Back, before Back leaves the trip", async () => {
    const view = await openTrips(onTrip(short(15), BUILT.key));
    const back = () => fireEvent.press(view.getByLabelText("Back"));

    await fireEvent.press(view.getByTestId("day-row-day_2"));
    expect(within(view.getByTestId("day-heading")).getByText("Day 2")).toBeTruthy();
    expect(view.queryByTestId("day-row-day_1")).toBeNull();
    expect(progress(view)).toBe(SITE_PROGRESS.reveal);

    await back();
    expect(view.queryByTestId("day-heading")).toBeNull();
    expect(view.getByRole("header").props.children).toBe(BUILT.label);
    expect(view.getAllByTestId(/^day-row-/)).toHaveLength(4);

    await back();
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
  });

  // Read-only: nothing on it edits the trip, and a tap on a stop doesn't leave the quiz for the place's page.
  it("has nothing to edit, save or sign in with, and a tap on a stop goes nowhere", async () => {
    const view = await openTrips(after(15));

    // every button there is: the top row's two, a row a day, and Start again
    expect(view.getAllByRole("button").map((b: any) => b.props.accessibilityLabel?.split(",")[0] ?? "Start again")).toEqual([
      "Back", "Close", "Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7", "Start again",
    ]);
    expect(view.queryByText(/save|sign in/i)).toBeNull();
    await fireEvent.press(view.getByTestId("day-row-day_1"));
    await fireEvent.press(view.getAllByTestId(/^stop-/)[0]);

    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(within(view.getByTestId("day-heading")).getByText("Day 1")).toBeTruthy();
  });

  // Switched off since the builder's data was made: not in the app's list once that is in.
  it("leaves a place the app doesn't have off its day", async () => {
    const view = await openTrips(after(15));
    const [trip] = quizTrips(after(15).state, new Date());
    const [gone, ...rest] = trip.days[0].items.map((i) => i.siteId);
    expect(rest.length).toBeGreaterThan(0);

    mockLookup = listWithout(gone);
    await fireEvent.press(view.getByTestId("day-row-day_1"));

    expect(stops(view)).toEqual(rest);
  });

  it("starts the quiz again from under it, with nothing kept", async () => {
    const view = await openTrips(after(15));

    await tap(view, "Start again");

    expect(view.getByText("Where do you start?")).toBeTruthy();
    expect(view.queryByLabelText("Back")).toBeNull();
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).toBeNull());
  });
});

// The trips aren't kept on the phone, only the answers and the pick: they are built again, and the quiz opens
// where it was left.
describe("a quiz left on the trips", () => {
  it("opens again on the trip cards", async () => {
    const view = await openTrips(short(15));

    expect(build).toHaveBeenCalledTimes(1);
    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(view.getAllByTestId("trip-card")).toHaveLength(2);
    expect(await saved()).toEqual(short(15));
  });

  it("opens again on the trip that was picked", async () => {
    const view = await openTrips(onTrip(short(15), CHECKED.key));

    expect(build).toHaveBeenCalledTimes(1);
    expect(view.getByRole("header").props.children).toBe(CHECKED.label);
    expect(progress(view)).toBe(SITE_PROGRESS.reveal);
    expect(await saved()).toEqual(onTrip(short(15), CHECKED.key));
  });

  it("opens again on the one trip that fits, with no cards", async () => {
    const view = await openTrips(onTrip(after(15), WEEK.key));

    expect(view.getByRole("header").props.children).toBe(WEEK.label);
    expect(view.queryByText(CARDS_TITLE)).toBeNull();
  });

  // The builder's data changed in an update, say: the pick isn't one of the trips any more.
  it("goes back to the trip cards when the picked trip is no longer one of them", async () => {
    const view = await openTrips(onTrip(short(15), "a-trip-that-is-gone"));

    expect(view.getByText(CARDS_TITLE)).toBeTruthy();
    expect(view.getAllByTestId("trip-card").map((c: any) => c.props.accessibilityState.selected)).toEqual([false, false]);
    await waitFor(async () => expect(await saved()).toEqual(short(15)));
  });

  it("shows the one trip that fits when the picked trip is gone and there are no cards to go back to", async () => {
    const view = await openTrips(onTrip(after(15), "a-trip-that-is-gone"));

    expect(view.getByRole("header").props.children).toBe(WEEK.label);
    await waitFor(async () => expect(await saved()).toEqual(onTrip(after(15), WEEK.key)));
  });
});
