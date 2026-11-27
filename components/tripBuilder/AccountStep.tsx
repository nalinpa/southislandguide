// The account step (owner, 2026-11-27: "trips require an account", "account first"): after the last question,
// someone not signed in creates an account or signs in, and only then are the trips built. The words over it are
// the website's (the page half of kiwiguide-site public/plan/quiz.js, its `account` screen, which opens on Create);
// the form is the app's own sign-in, as the login screen has it, less its guest link. Nothing here moves the quiz
// on: once the session is signed in, the screen does (quizFlow's accountStep).
import { StyleSheet, View } from "react-native";

import { SignInForm } from "@/components/auth/SignInForm";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import type { StepProps } from "./QuizSteps";
import { QuizHead } from "./quizParts";

// The website's title and line for each of its three ways, by the form's name for each (its create, signin, forgot).
// Create's line is the app's own: the website's ("It'll be waiting in the Kiwi Guide app when you sign in.") isn't
// so here, where the trip is saved to the account as it is picked.
const WORDS = {
  signup: { title: "Create your free account and we'll build your trip", lead: "Your trip will be saved to your account." },
  login: { title: "Sign in and we'll build your trip", lead: "Use your Kiwi Guide account." },
  reset: { title: "Reset your password", lead: "We will email you a link to choose a new password." },
} as const;

// The website's line in the form's error line when the sign-in ran out mid-save (its account.js saveErrorMessage).
const SIGN_IN_AGAIN = "Please sign in again to save your trip.";

/** again: the sign-in ran out as a trip was saved, so the form opens on Sign in with their email, as the website's does. */
export function AccountStep({ again }: Pick<StepProps, "again">) {
  const form = useAuthForm(again ? "login" : "signup", again ? { email: again.email, err: SIGN_IN_AGAIN } : undefined);
  const words = WORDS[form.mode];
  return (
    <View style={styles.step}>
      {/* Drawn afresh for each way, so a screen reader is sent to its new heading, as the website moves focus. */}
      <QuizHead key={form.mode} kicker="Last step" title={words.title} lead={words.lead} />
      <SignInForm form={form} />
    </View>
  );
}

const styles = StyleSheet.create({
  // A question's column (QuizSteps), with a little more room between the words and the form.
  step: { flexGrow: 1, gap: 16 },
});
