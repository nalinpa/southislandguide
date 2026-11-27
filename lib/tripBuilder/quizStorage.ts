// The quiz kept on the phone (the website keeps it in the browser tab): the answers and the step it was left on,
// so closing the app, or leaving to sign in, comes back to the same question. The built trips aren't kept: they
// are built again from the answers in under 0.3 s (docs/plans/app-trip-builder.md, stage 0).
// A storage failure is never passed on: the quiz works without it, and just starts again next time.
import AsyncStorage from "@react-native-async-storage/async-storage";

import { resumeQuiz, type Quiz, type QuizState } from "./quizFlow";

const KEY = "tripBuilder.quiz";

/** The quiz as it was left, or a blank one. Whatever was saved goes through the same checks as any reopened quiz. */
export async function loadQuiz(today: Date = new Date()): Promise<Quiz> {
  let saved: unknown = null;
  try {
    saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null");
  } catch {
    // Unreadable, or no storage: a blank quiz.
  }
  return resumeQuiz(saved, today);
}

export async function saveQuiz({ state, step }: Quiz): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ state, step }));
  } catch {
    // Not saved: the quiz carries on in memory.
  }
}

export async function clearQuiz(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Still there: the next save writes over it.
  }
}

/**
 * The quiz cleared from the phone if it still holds these answers. A save that lands after its quiz was closed
 * leaves a quiz begun since.
 */
export async function clearSavedQuiz(state: QuizState): Promise<void> {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null");
    if (saved && JSON.stringify(saved.state) === JSON.stringify(state)) await AsyncStorage.removeItem(KEY);
  } catch {
    // Unreadable, or still there: the next save writes over it.
  }
}
