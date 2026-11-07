import { useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import * as Sentry from "@sentry/react-native";
import { auth } from "@/lib/firebase";
import { getAuthErrorMessage } from "@/lib/auth/authErrors";
import { saveEmailOptIn } from "@/lib/hooks/useEmailOptIn";

type Mode = "login" | "signup" | "reset";

export function useAuthForm(initialMode: Mode) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // Unticked until the person ticks it: consent is given, never assumed.
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const title =
    mode === "login" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset your password";
  const subtitle =
    mode === "login"
      ? "Sign in to continue"
      : mode === "signup"
        ? "Sign up to get started"
        : "We'll email you a reset link";

  const canSubmit = useMemo(() => {
    if (!email) return false;
    if (mode === "reset") return true;
    if (!password) return false;
    if (mode === "signup" && password !== confirm) return false;
    return true;
  }, [email, password, confirm, mode]);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === "signup") {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        // Yes or no, both recorded. Not awaited: the account exists, so a failed save (no
        // signal) mustn't stop the sign-up. The answer then reads as no, which is safe.
        saveEmailOptIn(user.uid, emailOptIn).catch(Sentry.captureException);
      } else {
        await sendPasswordResetEmail(auth, email);
        setNotice("Check your email for a reset link.");
      }
    } catch (e) {
      setErr(getAuthErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return {
    mode,
    setMode,
    title,
    subtitle,
    email,
    setEmail,
    password,
    setPassword,
    confirm,
    setConfirm,
    emailOptIn,
    setEmailOptIn,
    busy,
    err,
    notice,
    canSubmit,
    submit,
  };
}
