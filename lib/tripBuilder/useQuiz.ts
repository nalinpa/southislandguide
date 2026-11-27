// The quiz as a screen holds it: read from the phone when the screen opens, and saved after every change, so
// closing the quiz (or the app) keeps the answers. The rules are quizFlow's; nothing is decided here.
import { useEffect, useRef, useState } from "react";

import { accountStep, answerQuiz, backQuiz, blankQuiz, type Quiz, type QuizAnswer, type QuizState, type QuizStep } from "./quizFlow";
import { clearQuiz, clearSavedQuiz, loadQuiz, saveQuiz } from "./quizStorage";

export function useQuiz() {
  // null until the saved quiz has been read, so the screen waits rather than flash the first question.
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  // The quiz as of the last change. A tap can land before the next question is drawn, still holding the
  // question before: it is checked against this, not against the quiz it was drawn with.
  const now = useRef<Quiz | null>(null);

  const show = (next: Quiz) => {
    now.current = next;
    setQuiz(next);
  };
  const move = (next: Quiz) => {
    show(next);
    void saveQuiz(next);
  };

  useEffect(() => {
    let open = true;
    // loadQuiz never throws: with nothing readable it is a blank quiz.
    void loadQuiz().then((saved) => {
      if (open) show(saved);
    });
    return () => {
      open = false;
    };
  }, []);

  return {
    quiz,
    /**
     * One answer taken: on to the step it leads to. An answer for a step the quiz isn't on is left out. Hands back
     * the quiz the answer was taken on (null when it was left out), for what is said of it (analytics).
     */
    answer: (a: QuizAnswer): Quiz | null => {
      const q = now.current;
      if (!q || a.step !== q.step) return null;
      move(answerQuiz(q.state, a));
      return q;
    },
    /**
     * Back a step, the answers kept. from: the step the Back was drawn on; a Back from a step the quiz has
     * already left (a second tap, before the screen caught up) is left out, so it can't skip a question.
     * signedIn: Back from the trip cards goes past the account step for someone signed in.
     */
    back: (from: QuizStep, signedIn = false) => {
      const q = now.current;
      if (q && from === q.step) move({ state: q.state, step: backQuiz(q.state, q.step, signedIn) });
    },
    /**
     * The quiz settled against the sign-in, as the screen draws it (quizFlow's accountStep): signed in, on from
     * the account step to the trip cards; not, from the cards to it. signedIn: null while it isn't known yet,
     * and then nothing changes.
     */
    settle: (signedIn: boolean | null) => {
      const q = now.current;
      const next = q && accountStep(q, signedIn);
      if (q && next && next !== q) move(next);
    },
    /** A blank quiz on the first question, and nothing left on the phone. */
    startAgain: () => {
      show({ state: blankQuiz(), step: "start" });
      void clearQuiz();
    },
    /**
     * The quiz done with, its trip saved or Cancel pressed over the trip it would replace (owner, 2026-11-28: "the trip
     * builder doesnt really reset"): these answers no longer on the phone, so it opens next on its first question. A
     * quiz begun since is left. What is on screen stays as it is: the quiz is closing, and its first question would
     * show as it went.
     */
    clear: (state: QuizState) => {
      if (now.current && JSON.stringify(now.current.state) === JSON.stringify(state)) now.current = { state: blankQuiz(), step: "start" };
      void clearSavedQuiz(state);
    },
    /**
     * The quiz on screen saved to the phone again as it stands: a sign-out's clean-up clears the phone's copy, and
     * the quiz that signed out to sign in again (the api turned its sign-in down) keeps its answers.
     */
    keep: () => {
      if (now.current) void saveQuiz(now.current);
    },
  };
}
