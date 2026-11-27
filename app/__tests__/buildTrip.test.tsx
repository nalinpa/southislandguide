// The trip quiz's screen, first half (docs/plans/app-trip-builder.md, stage 3): the website's first seven
// steps tapped through in its order, Back from each, the bar's progress, and a quiz left half done coming back
// on its step. The real hook and steps run against the library's stand-in store; the steps' own options and
// words are pinned in components/tripBuilder/__tests__/quizSteps.test.tsx.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { Image: (props: any) => React.createElement(View, props) };
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
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import BuildTripScreen from "@/app/build-trip";
import { answerQuiz, blankQuiz, type Quiz, type QuizAnswer } from "@/lib/tripBuilder/quizFlow";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("@/lib/tripBuilder/quizLogic");

const KEY = "tripBuilder.quiz";
// The first summer month still to come, as the month step words it.
const NEXT_SUMMER = site.monthsOf("summer", new Date())[0];
const MONTH = `${site.MONTH_NAMES[NEXT_SUMMER.month]} ${NEXT_SUMMER.year}`;
// The first half answered as someone taps through it: a week's loop from Queenstown in summer.
const ANSWERS: QuizAnswer[] = [
  { step: "start", value: "queenstown" },
  { step: "band", value: "week" },
  { step: "days", value: 7 },
  { step: "finish", value: "queenstown" },
  { step: "break1" },
  { step: "season", value: "summer" },
  { step: "month", value: NEXT_SUMMER },
];
const through = (answers: QuizAnswer[]) => answers.reduce<Quiz>((quiz, a) => answerQuiz(quiz.state, a), { state: blankQuiz(), step: "start" });
const after = (n: number) => through(ANSWERS.slice(0, n));
const saved = async () => JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null");

// The screen once the saved quiz is in, on the question it should show.
const open = async (title = "Where do you start?") => {
  const view = await render(<BuildTripScreen />);
  await waitFor(() => expect(view.getByText(title)).toBeTruthy());
  return view;
};
const progress = (view: any) => view.getByLabelText("Quiz progress").props.accessibilityValue.now;
// The website's bar, step by step (PROGRESS in its quiz.js).
const SITE_PROGRESS = { start: 5, band: 10, days: 15, finish: 20, break1: 25, season: 30, month: 36, pace: 42 };
const focus = AccessibilityInfo.sendAccessibilityEvent as jest.Mock;
// The heading the screen reader was last sent to.
const focused = () => focus.mock.calls[focus.mock.calls.length - 1][0].props.children;

// The bar's slide runs frame by frame on timers, which would outlive a test and redraw the bar outside it.
// Here a slide lands at once; "the bar" tests read how it was asked to move.
let timing: jest.SpyInstance;

beforeEach(async () => {
  jest.clearAllMocks();
  mockRouter.canGoBack.mockReturnValue(true);
  await AsyncStorage.clear();
  timing = jest.spyOn(Animated, "timing").mockImplementation(((value: Animated.Value, config: { toValue: number }) => ({
    start: () => value.setValue(config.toValue),
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

  await fireEvent.press(view.getByText("Queenstown"));
  expect(view.getByText("How long have you got?")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.band);

  await fireEvent.press(view.getByText("About a week"));
  expect(view.getByText("How many days?")).toBeTruthy();
  expect(view.getByTestId("days-count").props.accessibilityLabel).toBe("7 days");
  expect(progress(view)).toBe(SITE_PROGRESS.days);

  await fireEvent.press(view.getByText("Next"));
  expect(view.getByText("Where does your trip finish?")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.finish);

  await fireEvent.press(view.getByText("Finish back in Queenstown"));
  expect(view.getByText("Queenstown, 7 days.")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.break1);

  await fireEvent.press(view.getByText("Next"));
  expect(view.getByText("Which NZ season are you picking?")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.season);

  await fireEvent.press(view.getByText("Summer"));
  expect(view.getByText("Which month?")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.month);

  await fireEvent.press(view.getByText(MONTH));
  expect(view.getByText("More questions are coming.")).toBeTruthy();
  expect(progress(view)).toBe(SITE_PROGRESS.pace);

  // every answer is on the phone, on the step it led to
  await waitFor(async () => expect(await saved()).toEqual(after(7)));
  expect(after(7).step).toBe("pace");
});

it("skips the month for Not sure yet", async () => {
  await AsyncStorage.setItem(KEY, JSON.stringify(after(5)));
  const view = await open("Which NZ season are you picking?");

  await fireEvent.press(view.getByText("Not sure yet"));

  expect(view.queryByText("Which month?")).toBeNull();
  expect(view.getByText("More questions are coming.")).toBeTruthy();

  // and Back from there is the season, not a month that was never asked
  await fireEvent.press(view.getByLabelText("Back"));
  expect(view.getByText("Which NZ season are you picking?")).toBeTruthy();
});

// The website moves focus to each new question's heading; here it is the screen reader's.
it("sends a screen reader to each new question's heading", async () => {
  const view = await open();
  expect(focused()).toBe("Where do you start?");

  await fireEvent.press(view.getByText("Queenstown"));
  expect(focused()).toBe("How long have you got?");

  await fireEvent.press(view.getByText("About a week"));
  expect(focused()).toBe("How many days?");

  await fireEvent.press(view.getByLabelText("Back"));
  expect(focused()).toBe("How long have you got?");
});

describe("the bar", () => {
  // The website's bar: its width slides to the new step in a quarter of a second, and jumps under reduce motion.
  it("slides to the next step's place", async () => {
    const view = await open();
    timing.mockClear();

    await fireEvent.press(view.getByText("Queenstown"));

    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0][1]).toEqual(expect.objectContaining({ toValue: SITE_PROGRESS.band, duration: 250 }));
  });

  it("jumps there when the phone is set to reduce motion", async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
    const view = await open();
    timing.mockClear();

    await fireEvent.press(view.getByText("Queenstown"));

    expect(progress(view)).toBe(SITE_PROGRESS.band);
    expect(timing).not.toHaveBeenCalled();
  });
});

describe("Back", () => {
  it("is not on the first question", async () => {
    const view = await open();
    expect(view.queryByLabelText("Back")).toBeNull();
    expect(view.getByLabelText("Close")).toBeTruthy();
  });

  it("goes back a question at a time, over the photo break, the answers kept", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(after(7)));
    const view = await open("More questions are coming.");
    const back = () => fireEvent.press(view.getByLabelText("Back"));

    await back();
    expect(view.getByText("Which month?")).toBeTruthy();
    await back();
    expect(view.getByText("Which NZ season are you picking?")).toBeTruthy();
    // never onto the photo break: from the question after it to the question before it
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
    await waitFor(async () => expect(await saved()).toEqual({ state: after(7).state, step: "start" }));
  });

  it("goes from the photo break to the finish", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(after(4)));
    const view = await open("Queenstown, 7 days.");

    await fireEvent.press(view.getByLabelText("Back"));

    expect(view.getByText("Where does your trip finish?")).toBeTruthy();
  });
});

// The website keeps both open for the visit: the finish's shuts when the start town changes, and both on
// Start again. They are held above the questions, which are drawn afresh at every step.
describe("Somewhere else?", () => {
  it("stays open on the start once the other towns are shown", async () => {
    const view = await open();

    await fireEvent.press(view.getByText("Somewhere else?"));
    expect(view.getByText("Dunedin")).toBeTruthy();
    expect(view.queryByText("Somewhere else?")).toBeNull();

    await fireEvent.press(view.getByText("Queenstown"));
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

    await fireEvent.press(view.getByText("Somewhere else?"));
    expect(view.getByText("Nelson")).toBeTruthy();

    // on with a town that was never behind it, and back: still open
    await fireEvent.press(view.getByText("Christchurch"));
    await back();
    expect(view.getByText("Where does your trip finish?")).toBeTruthy();
    expect(view.getByText("Nelson")).toBeTruthy();
    expect(view.queryByText("Somewhere else?")).toBeNull();

    // another start town: its finishes start shut
    await back();
    await back();
    await back();
    await fireEvent.press(view.getByText("Picton"));
    await fireEvent.press(view.getByText("Three weeks"));
    await fireEvent.press(view.getByText("Next"));
    expect(view.getByText("Where does your trip finish?")).toBeTruthy();
    expect(view.getByText("Somewhere else?")).toBeTruthy();
    expect(view.queryByText("Nelson")).toBeNull();
  });

  it("is shut again after Start again", async () => {
    const view = await open();
    await fireEvent.press(view.getByText("Somewhere else?"));

    for (const tap of ["Queenstown", "About a week", "Next", "Finish back in Queenstown", "Next", "Not sure yet"]) {
      await fireEvent.press(view.getByText(tap));
    }
    await fireEvent.press(view.getByText("Start again"));

    expect(view.getByText("Where do you start?")).toBeTruthy();
    expect(view.getByText("Somewhere else?")).toBeTruthy();
    expect(view.queryByText("Dunedin")).toBeNull();
  });
});

describe("a quiz left half done", () => {
  it.each([
    [1, "How long have you got?"],
    [2, "How many days?"],
    [3, "Where does your trip finish?"],
    [4, "Queenstown, 7 days."],
    [5, "Which NZ season are you picking?"],
    [6, "Which month?"],
    [7, "More questions are coming."],
  ])("opens again on its step (%i answers in)", async (n, title) => {
    await AsyncStorage.setItem(KEY, JSON.stringify(after(n)));
    await open(title);
  });
});

describe("Close", () => {
  it("leaves the quiz with the answers kept", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(after(3)));
    const view = await open("Where does your trip finish?");

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

// TEMP (stage 4): the placeholder after the month, and its way back to a blank quiz for testing on a phone.
it("starts again from the placeholder", async () => {
  await AsyncStorage.setItem(KEY, JSON.stringify(after(7)));
  const view = await open("More questions are coming.");

  await fireEvent.press(view.getByText("Start again"));

  expect(view.getByText("Where do you start?")).toBeTruthy();
  await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).toBeNull());
});
