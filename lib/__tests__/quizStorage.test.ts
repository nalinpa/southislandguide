// The quiz kept on the phone: its answers and the step it was left on, so closing the app (or leaving to sign in)
// comes back to the same question. Runs the real code against the library's stand-in store.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { answerQuiz, blankQuiz, type Quiz, type QuizAnswer } from "@/lib/tripBuilder/quizFlow";
import { clearQuiz, loadQuiz, saveQuiz } from "@/lib/tripBuilder/quizStorage";

const KEY = "tripBuilder.quiz";
const TODAY = new Date(2026, 10, 27);
const BLANK: Quiz = { state: blankQuiz(), step: "start" };
// Four days from Christchurch, on "Where does your trip finish?".
const ANSWERS: QuizAnswer[] = [{ step: "start", value: "christchurch" }, { step: "band", value: "weekend" }, { step: "days", value: 4 }];
const HALF = ANSWERS.reduce<Quiz>((quiz, a) => answerQuiz(quiz.state, a), BLANK);

describe("the quiz kept on the phone", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("comes back as it was saved", async () => {
    await saveQuiz(HALF);
    expect(HALF.step).toBe("finish");
    expect(await loadQuiz(TODAY)).toEqual(HALF);
  });

  it("is a blank quiz on the first question when nothing is saved", async () => {
    expect(await loadQuiz(TODAY)).toEqual(BLANK);
  });

  // The trips are built again from the answers (under 0.3 s), so a save can't hold trips the data has moved on from.
  it("keeps the answers and the step, nothing else", async () => {
    await saveQuiz({ ...HALF, trips: [{ key: "trip-a" }] } as Quiz);
    expect(JSON.parse((await AsyncStorage.getItem(KEY))!)).toEqual({ state: HALF.state, step: "finish" });
  });

  it("is gone once cleared", async () => {
    await saveQuiz(HALF);
    await clearQuiz();
    expect(await loadQuiz(TODAY)).toEqual(BLANK);
  });

  // A save from an older build, or one cut short: the same checks as any reopened quiz (resumeQuiz).
  it("never opens past a question with no answer", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ state: HALF.state, step: "food" }));
    expect(await loadQuiz(TODAY)).toEqual(HALF);
  });

  it("is a blank quiz when what is saved can't be read", async () => {
    await AsyncStorage.setItem(KEY, "{not json");
    expect(await loadQuiz(TODAY)).toEqual(BLANK);
  });

  // The quiz works without storage, as on the website: it just starts again next time.
  it("carries on when the phone's storage fails", async () => {
    const broken = () => Promise.reject(new Error("storage full"));
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(broken);
    (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(broken);
    (AsyncStorage.removeItem as jest.Mock).mockImplementationOnce(broken);

    await expect(loadQuiz(TODAY)).resolves.toEqual(BLANK);
    await expect(saveQuiz(HALF)).resolves.toBeUndefined();
    await expect(clearQuiz()).resolves.toBeUndefined();
  });
});
