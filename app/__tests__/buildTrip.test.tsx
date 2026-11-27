// The trip quiz's screen (docs/plans/app-trip-builder.md, stages 3 and 4): the website's questions tapped
// through in its order, Back from each, the bar's progress, and a quiz left part way coming back on its step.
// The real hook and steps run against the library's stand-in store; each step's own options and words are
// pinned in components/tripBuilder/__tests__ (quizSteps, quizStepsSecondHalf, swipeDeck).

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
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

const mockRouter = { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

import React from "react";
import { AccessibilityInfo, Animated } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";

import BuildTripScreen from "@/app/build-trip";
import data from "@/assets/data/builder-data.json";
import { deckNudge } from "@/components/tripBuilder/SwipeDeck";
import { answerQuiz, blankQuiz, type Quiz, type QuizAnswer } from "@/lib/tripBuilder/quizFlow";
import { tokens } from "@/lib/ui/tokens";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("@/lib/tripBuilder/quizLogic");

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
// The quiz after the first n answers: after(7) is on "How active?", after(15) on the trips' place.
const after = (n: number) => through(ANSWERS.slice(0, n));
const saved = async () => JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null");
const BREAK2 = "Over 500 places on the island. Picking the ones that fit you.";

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
  who: 53, age: 58, vibe: 63, break2: 67, into: 74, food: 86, choice: 95,
};
const focus = AccessibilityInfo.sendAccessibilityEvent as jest.Mock;
// The heading the screen reader was last sent to.
const focused = () => focus.mock.calls[focus.mock.calls.length - 1][0].props.children;

// The bar's slide and a swipe card's fly-off run frame by frame, which would outlive a test and redraw outside
// it. Here each lands at once and says it finished; "the bar" tests read how it was asked to move.
let timing: jest.SpyInstance;

beforeEach(async () => {
  jest.clearAllMocks();
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
afterEach(() => timing.mockRestore());

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

it("walks on through pace, driving, who, age, the vibe, the second photo break, the cards and food, to where the trips will be", async () => {
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
  expect(view.getByText("Your trip is next.")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.choice);

  // every answer is on the phone, the cards' two lists among them, on the step the trips will be
  expect(site.deckAnswers(CARDS, LIKED)).toEqual({ into: ["Scenic"], activities: ["wine"] });
  await waitFor(async () => expect(await saved()).toEqual(after(15)));
  expect(after(15).step).toBe("choice");
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
    const view = await from(15, "Your trip is next.");
    const back = () => fireEvent.press(view.getByLabelText("Back"));

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

    // the answers are kept, and the step it went back to is saved
    await waitFor(async () => expect(await saved()).toEqual({ state: after(15).state, step: "start" }));
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
    const view = await from(15, "Your trip is next.");
    // all the way back to the start, where the other towns are opened
    for (let i = 0; i < 13; i++) await fireEvent.press(view.getByLabelText("Back"));
    await tap(view, "Somewhere else?");
    expect(view.getByText("Dunedin")).toBeTruthy();

    // and all the way on again: the answers are still there, and the cards show their last one
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
    [15, "Your trip is next."],
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

// TEMP (stage 5): where the trips will be, after the last question, with its way back to a blank quiz for
// testing on a phone.
describe("where the trips will be", () => {
  it("says the trip is next, with Back to the last question", async () => {
    const view = await from(15, "Your trip is next.");

    expect(view.queryByText("More questions are coming.")).toBeNull();
    await fireEvent.press(view.getByLabelText("Back"));

    expect(view.getByText("Food tips?")).toBeTruthy();
  });

  it("starts again from there", async () => {
    const view = await from(15, "Your trip is next.");

    await tap(view, "Start again");

    expect(view.getByText("Where do you start?")).toBeTruthy();
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).toBeNull());
  });
});
