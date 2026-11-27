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

    await act(async () => result.current.back("finish"));

    expect(result.current.quiz).toEqual({ state: HALF.state, step: "days" });
    await waitFor(async () => expect(await saved()).toEqual({ state: HALF.state, step: "days" }));
  });

  // Two taps on Back in the same instant, before the question before is drawn: the second still holds the
  // question it was drawn on, and mustn't skip one.
  it("takes only the first of two Backs from the same question", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(HALF));
    const result = await open();
    const { back } = result.current;

    await act(async () => {
      back("finish");
      back("finish");
    });

    expect(result.current.quiz).toEqual({ state: HALF.state, step: "days" });
  });

  it("ignores a Back from a step the quiz isn't on", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(HALF));
    const result = await open();
    (AsyncStorage.setItem as jest.Mock).mockClear();

    await act(async () => result.current.back("season"));

    expect(result.current.quiz).toEqual(HALF);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  // The trips are built from the answers once the last question is in (stage 5). The trip cards and the trip
  // settle against them by quizFlow's tripStep, and Back from the trip needs to know how many there were.
  describe("with the trips built", () => {
    const ALL: QuizAnswer[] = [
      { step: "start", value: "queenstown" },
      { step: "band", value: "week" },
      { step: "days", value: 7 },
      { step: "finish", value: "queenstown" },
      { step: "break1" },
      { step: "season", value: "unsure" },
      { step: "pace", value: "some" },
      { step: "drive", value: 240 },
      { step: "who", value: "couple" },
      { step: "age", value: "skip" },
      { step: "vibe", value: [] },
      { step: "break2" },
      { step: "into", value: { into: ["Scenic"], activities: [] } },
      { step: "food", value: true },
    ];
    const CARDS = ALL.reduce<Quiz>((quiz, a) => answerQuiz(quiz.state, a), BLANK);
    const picked = (key: string): Quiz => answerQuiz(CARDS.state, { step: "choice", value: key });
    const at = async (quiz: Quiz) => {
      await AsyncStorage.setItem(KEY, JSON.stringify(quiz));
      const result = await open();
      (AsyncStorage.setItem as jest.Mock).mockClear();
      return result;
    };

    it("stays on the cards when there are several, with nothing to save", async () => {
      expect(CARDS.step).toBe("choice");
      const result = await at(CARDS);

      await act(async () => result.current.settle([{ key: "a" }, { key: "b" }]));

      expect(result.current.quiz).toEqual(CARDS);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it("skips the cards for the one trip there is: it is picked and shown, and saved so", async () => {
      const result = await at(CARDS);

      await act(async () => result.current.settle([{ key: "only" }]));

      expect(result.current.quiz).toEqual({ state: { ...CARDS.state, pick: "only" }, step: "reveal" });
      await waitFor(async () => expect(await saved()).toEqual(result.current.quiz));
    });

    it("goes back to the cards when the trip picked isn't one of them any more", async () => {
      const result = await at(picked("gone"));
      expect(result.current.quiz!.step).toBe("reveal");

      await act(async () => result.current.settle([{ key: "a" }, { key: "b" }]));

      expect(result.current.quiz).toEqual(CARDS);
    });

    it("keeps the trip picked when it is one of them", async () => {
      const result = await at(picked("b"));

      await act(async () => result.current.settle([{ key: "a" }, { key: "b" }]));

      expect(result.current.quiz).toEqual(picked("b"));
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it("goes Back from the trip to the cards when there were several", async () => {
      const result = await at(picked("b"));

      await act(async () => result.current.back("reveal", [{ key: "a" }, { key: "b" }]));

      expect(result.current.quiz!.step).toBe("choice");
      expect(result.current.quiz!.state.pick).toBe("b");
    });

    // One trip never showed its cards, so Back from it goes on past them, to the last question.
    it("goes Back from the one trip there is to the last question", async () => {
      const result = await at(picked("only"));

      await act(async () => result.current.back("reveal", [{ key: "only" }]));

      expect(result.current.quiz!.step).toBe("food");
    });
  });

  it("starts again from a blank quiz, with nothing left on the phone", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(HALF));
    const result = await open();

    await act(async () => result.current.startAgain());

    expect(result.current.quiz).toEqual(BLANK);
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).toBeNull());
  });
});
