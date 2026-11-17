import React from "react";
import { AuthPanel } from "@/lib/uiKit";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { EMAIL_OPT_IN_LABEL } from "@/lib/hooks/useEmailOptIn";
import { useSession } from "@/lib/providers/SessionProvider";
import { tokens } from "@/lib/ui/tokens";

// The sign-in form on a white surface: the Login screen's, and the Profile's card for a guest
// on the open Duo. The caller owns the form (useAuthForm), since Login also reads its mode for
// its own layout. The guest link shows only when a caller gives `onGuest`.
export function SignInForm({
  form: f,
  wide,
  onGuest,
}: {
  form: ReturnType<typeof useAuthForm>;
  wide?: boolean;
  onGuest?: () => void;
}) {
  const { session } = useSession();
  // ponytail: email-only for 1.0. Apple's servers reject this App ID's Sign in
  // with Apple ("Invalid client", see TASKS.md Sign-in), and Google can't be
  // offered without it (App Store guideline 4.8). When Apple fixes it, render
  // <SocialSignInButtons> above the form again: the component and lib/auth are
  // untouched. usesAppleSignIn stays in app.config.ts on purpose: without it
  // `eas build` switches the capability off at Apple.
  const busy = f.busy || session.status === "loading";
  return (
    <AuthPanel
      mode={f.mode}
      email={f.email}
      password={f.password}
      confirm={f.confirm}
      busy={busy}
      err={f.err}
      notice={f.notice}
      canSubmit={f.canSubmit}
      onChangeMode={f.setMode}
      onChangeEmail={f.setEmail}
      onChangePassword={f.setPassword}
      onChangeConfirm={f.setConfirm}
      onSubmit={() => void f.submit()}
      onGuest={onGuest}
      optIn={{ label: EMAIL_OPT_IN_LABEL, value: f.emailOptIn, onChange: f.setEmailOptIn }}
      // On a white surface: outlined boxes with the sweep's 12pt corners, dark labels, the
      // links in teal (orange is the one main button). "stacked" is the picked drawing:
      // "Forgot password?" under the password box, the other links on one centre line. The
      // password boxes are empty: their labels already say what they are.
      tone="light"
      radius={12}
      layout="stacked"
      createAccountStyle={wide ? "outline" : "link"}
      placeholders={{ password: "", confirmPassword: "" }}
      labelSize={15}
      colors={{
        label: tokens.colors.text,
        link: tokens.colors.selected,
        guest: tokens.colors.selected,
        // Words: the engine's default is success, which in dark mode is a fill colour.
        notice: tokens.colors.surf,
      }}
    />
  );
}
