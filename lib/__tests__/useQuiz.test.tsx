// The quiz as a screen holds it: read from the phone when it opens, saved after every answer and every Back, and
// cleared by Start again. The rules are quizFlow's; this runs the real hook against the library's stand-in store.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { accountStep, answerQuiz, blankQuiz, type Quiz, type QuizAnswer } from "@/lib/tripBuilder/quizFlow";
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

  // What the screen tells analytics of an answer is read from the quiz it was taken on, and nothing of one left out.
  it("hands back the quiz an answer was taken on, and nothing for one left out", async () => {
    const result = await open();
    const { answer } = result.current;
    let took: (Quiz | null)[] = [];

    await act(async () => {
      took = [answer({ step: "start", value: "christchurch" }), answer({ step: "start", value: "picton" }), answer({ step: "food", value: true })];
    });

    expect(took).toEqual([BLANK, null, null]);
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

  // The trip cards come once the last question is in and someone is signed in (stage 6): the account step and the
  // cards settle against the sign-in by quizFlow's accountStep, and Back from the cards needs to know who is signed
  // in. A trip picked from them is saved (the screen's), and the pick is kept on the cards.
  describe("after the last question", () => {
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
    // Every question answered: the account step, and for someone signed in the trip cards.
    const ACCOUNT = ALL.reduce<Quiz>((quiz, a) => answerQuiz(quiz.state, a), BLANK);
    const CARDS = accountStep(ACCOUNT, true)!;
    const picked = (key: string): Quiz => answerQuiz(CARDS.state, { step: "choice", value: key });
    const at = async (quiz: Quiz) => {
      await AsyncStorage.setItem(KEY, JSON.stringify(quiz));
      const result = await open();
      (AsyncStorage.setItem as jest.Mock).mockClear();
      return result;
    };

    // The trip saved, kept as the pick: the cards when the quiz is opened again, that one marked.
    it("keeps the trip picked on the cards, and saves it", async () => {
      expect(CARDS.step).toBe("choice");
      const result = await at(CARDS);

      await act(async () => result.current.answer({ step: "choice", value: "b" }));

      expect(result.current.quiz).toEqual(picked("b"));
      expect(picked("b")).toEqual({ state: { ...CARDS.state, pick: "b" }, step: "choice" });
      await waitFor(async () => expect(await saved()).toEqual(picked("b")));
    });

    it("stays on the cards for someone signed in, with nothing to save", async () => {
      const result = await at(picked("b"));

      await act(async () => result.current.settle(true));

      expect(result.current.quiz).toEqual(picked("b"));
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it("goes on from the account step to the cards once signed in, and saves it", async () => {
      const result = await at(ACCOUNT);
      expect(ACCOUNT.step).toBe("account");

      await act(async () => result.current.settle(true));

      expect(result.current.quiz).toEqual(CARDS);
      await waitFor(async () => expect(await saved()).toEqual(CARDS));
    });

    it("goes from the cards to the account step for someone not signed in, the trip picked kept", async () => {
      const result = await at(picked("b"));

      await act(async () => result.current.settle(false));

      expect(result.current.quiz).toEqual({ state: picked("b").state, step: "account" });
      await waitFor(async () => expect(await saved()).toEqual(result.current.quiz));
    });

    it("decides nothing while the sign-in is still being read", async () => {
      for (const quiz of [ACCOUNT, CARDS]) {
        const result = await at(quiz);

        await act(async () => result.current.settle(null));

        expect(result.current.quiz).toEqual(quiz);
        expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      }
    });

    it("goes Back from the cards past the account step when signed in, and to it when not", async () => {
      const signedIn = await at(CARDS);
      await act(async () => signedIn.current.back("choice", true));
      expect(signedIn.current.quiz!.step).toBe("food");

      const not = await at(CARDS);
      await act(async () => not.current.back("choice", false));
      expect(not.current.quiz!.step).toBe("account");
    });

    it("goes Back from the account step to the last question", async () => {
      const result = await at(ACCOUNT);

      await act(async () => result.current.back("account"));

      expect(result.current.quiz).toEqual({ state: ACCOUNT.state, step: "food" });
    });
  });

  it("starts again from a blank quiz, with nothing left on the phone", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(HALF));
    const result = await open();

    await act(async () => result.current.startAgain());

    expect(result.current.quiz).toEqual(BLANK);
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).toBeNull());
  });

  // Its trip saved, the quiz is done with (owner, 2026-11-28: "the trip builder doesnt really reset"): nothing left
  // on the phone, so it opens next on its first question. The screen, closing over the trip, is left as it is, and
  // a late tap on it puts nothing back.
  it("clears what is on the phone once its trip is saved, leaving the screen as it is", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(HALF));
    const result = await open();

    await act(async () => result.current.clear(HALF.state));

    expect(result.current.quiz).toEqual(HALF);
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).toBeNull());
    let took: Quiz | null = HALF;
    await act(async () => {
      took = result.current.answer({ step: "finish", value: "christchurch" });
    });
    expect(took).toBeNull();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();

    const next = await open();
    expect(next.current.quiz).toEqual(BLANK);
  });

  // A save that lands after its quiz was closed, with another begun since: only the answers it saved are cleared.
  it("leaves a quiz begun since on the phone", async () => {
    const result = await open();
    await AsyncStorage.setItem(KEY, JSON.stringify(HALF));

    await act(async () => result.current.clear(BLANK.state));

    expect(await saved()).toEqual(HALF);
  });
});
