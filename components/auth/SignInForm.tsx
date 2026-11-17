import React, { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { AppText, AuthPanel } from "@/lib/uiKit";
import { SocialSignInButtons } from "@/components/auth/SocialSignInButtons";
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
  // Apple and Google above the email form, their errors in the form's own error line. iOS
  // only, as the buttons are. usesAppleSignIn stays in app.config.ts on purpose: without it
  // `eas build` switches the capability off at Apple.
  const [socialBusy, setSocialBusy] = useState(false);
  const social = Platform.OS === "ios";
  const busy = f.busy || socialBusy || session.status === "loading";
  return (
    <>
      {social ? (
        <View style={styles.social}>
          <SocialSignInButtons onError={f.setErr} onBusyChange={setSocialBusy} disabled={f.busy} />
          <View style={styles.divider}>
            <View style={styles.line} />
            <AppText style={styles.or}>or</AppText>
            <View style={styles.line} />
          </View>
        </View>
      ) : null}
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
    </>
  );
}

const styles = StyleSheet.create({
  social: { gap: 12, marginBottom: 16 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: tokens.colors.line },
  or: { fontSize: 14, color: tokens.colors.textMuted },
});
