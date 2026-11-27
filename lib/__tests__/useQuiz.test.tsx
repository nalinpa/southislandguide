// The quiz as a screen holds it: read from the phone when it opens, saved after every answer and every Back, and
// cleared by Start again. The rules are quizFlow's; this runs the real hook against the library's stand-in store.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { answerQuiz, blankQuiz, type Quiz, type QuizAnswer } from "@/lib/tripBuilder/quizFlow";
import { useQuiz } from "@/lib/tripBuilder/useQuiz";

const KEY = "tripBuilder.quiz";
const BLANK: Quiz = { state: blankQuiz(), step: "start" };
// Four days from Christchurch, on "Where does your trip finish?".
const ANSWERS: QuizAnswer[] = [{ step: "start", value: "christchurch" }, { step: "band", value: "weekend" }, { step: "days", value: 4 }];
const HALF = ANSWERS.reduce<Quiz>((quiz, a) => answerQuiz(quiz.state, a), BLANK);
const saved = async () => JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null");

// The hook once the saved quiz is in.
const open = async () => {
  const hook = await renderHook(() => useQuiz());
  await waitFor(() => expect(hook.result.current.quiz).not.toBeNull());
  return hook.result;
};

describe("useQuiz", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  // So the screen can wait, and not flash the first question over a half-done quiz.
  it("has no quiz until the saved one has been read", async () => {
    let finishRead: (value: string | null) => void = () => {};
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => (finishRead = resolve)));

    const { result } = await renderHook(() => useQuiz());
    expect(result.current.quiz).toBeNull();

    finishRead(JSON.stringify(HALF));
    await waitFor(() => expect(result.current.quiz).toEqual(HALF));
  });

  it("opens a blank quiz on the first question when nothing is saved", async () => {
    const result = await open();
    expect(result.current.quiz).toEqual(BLANK);
  });

  it("takes an answer, moves to the step it leads to, and saves both", async () => {
    const result = await open();

    await act(async () => result.current.answer({ step: "start", value: "christchurch" }));

    expect(result.current.quiz).toEqual(answerQuiz(BLANK.state, { step: "start", value: "christchurch" }));
    expect(result.current.quiz!.step).toBe("band");
    await waitFor(async () => expect(await saved()).toEqual(result.current.quiz));
  });

  // A tap that lands after the question has changed is for a question no longer on screen.
  it("ignores an answer for a step the quiz isn't on", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(HALF));
    const result = await open();
    (AsyncStorage.setItem as jest.Mock).mockClear();

    await act(async () => result.current.answer({ step: "band", value: "long" }));

    expect(result.current.quiz).toEqual(HALF);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  // Two taps in the same instant, before the next question is drawn: the second still holds the old question.
  it("takes only the first of two answers to the same question", async () => {
    const result = await open();
    const { answer } = result.current;

    await act(async () => {
      answer({ step: "start", value: "christchurch" });
      answer({ step: "start", value: "picton" });
    });

    expect(result.current.quiz).toEqual(answerQuiz(BLANK.state, { step: "start", value: "christchurch" }));
    await waitFor(async () => expect(await saved()).toEqual(result.current.quiz));
  });

  it("goes back a step with the answers kept, and saves the step", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(HALF));
    const result = await open();

    await act(async () => result.current.back());

    expect(result.current.quiz).toEqual({ state: HALF.state, step: "days" });
    await waitFor(async () => expect(await saved()).toEqual({ state: HALF.state, step: "days" }));
  });

  it("starts again from a blank quiz, with nothing left on the phone", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(HALF));
    const result = await open();

    await act(async () => result.current.startAgain());

    expect(result.current.quiz).toEqual(BLANK);
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).toBeNull());
  });
});
