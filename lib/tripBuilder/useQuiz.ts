// The quiz as a screen holds it: read from the phone when the screen opens, and saved after every change, so
// closing the quiz (or the app) keeps the answers. The rules are quizFlow's; nothing is decided here.
import { useEffect, useRef, useState } from "react";

import { accountStep, answerQuiz, backQuiz, blankQuiz, type Quiz, type QuizAnswer, type QuizStep } from "./quizFlow";
import { clearQuiz, loadQuiz, saveQuiz } from "./quizStorage";

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
    /** One answer taken: on to the step it leads to. An answer for a step the quiz isn't on is left out. */
    answer: (a: QuizAnswer) => {
      const q = now.current;
      if (q && a.step === q.step) move(answerQuiz(q.state, a));
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
  };
}
