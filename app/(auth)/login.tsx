import React, { useEffect } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Stack, router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Sentry from "@sentry/react-native";
import { Screen, AppText, AuthPanel } from "@/lib/uiKit";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { EMAIL_OPT_IN_LABEL } from "@/lib/hooks/useEmailOptIn";
import { useSession } from "@/lib/providers/SessionProvider";
import { tokens } from "@/lib/ui/tokens";

// Aoraki / Mt Cook over Lake Pukaki. Bundled so it paints offline with no
// network flash.
const HERO_IMAGE = require("../../assets/login.webp");

// The photo's share of the screen: about 340pt on a 6.1" iPhone, about 265 on an iPhone
// SE (667pt), where the whole form must still fit (App Review runs iPhone apps on iPad at
// 375×667; Rotorua was rejected for a button off the bottom there). It was 0.47: the
// design sweep's critics read that as a welcome poster with the form second. Shorter
// again when creating an account, whose form is longer, so it shows without scrolling
// (owner, 2026-11-13; docs/plans/design-sweep.md).
const PHOTO_SHARE = 0.4;
const PHOTO_SHARE_SIGNUP = 0.29;
// How far the form's white sheet rides up over the foot of the photo: its corner radius.
const SHEET_OVERLAP = 20;

// The photo with the title on top (mockup C, owner, 2026-10-25; docs/plans/login-redesign.md),
// and since the design sweep the engine's AuthPanel on a white sheet with rounded top
// corners over the photo's foot, where it was on deep teal. Email is the only way in, so
// there is no "Sign in with email" step to open it.
// Back to where sign-in was asked for: every "Sign In" in the app (a place's Add to Trip,
// Save, the Trips tab) pushes this screen over it. With nothing under it (after signing
// out), on to Explore.
function leaveLogin() {
  if (router.canGoBack()) router.back();
  else router.replace("/(app)/(tabs)/sites");
}

export default function LoginScreen() {
  const f = useAuthForm("login");
  const { session, enableGuest } = useSession();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  useEffect(() => {
    // Guest is not redirected here — see app/(auth)/_layout.tsx for why.
    if (session.status === "authed") leaveLogin();
  }, [session.status]);

  // ponytail: email-only for 1.0. Apple's servers reject this App ID's Sign in
  // with Apple ("Invalid client", see TASKS.md Sign-in), and Google can't be
  // offered without it (App Store guideline 4.8). When Apple fixes it, render
  // <SocialSignInButtons> above the form again: the component and lib/auth are
  // untouched. usesAppleSignIn stays in app.config.ts on purpose: without it
  // `eas build` switches the capability off at Apple.
  const busy = f.busy || session.status === "loading";

  // Navigates explicitly: guests are no longer auto-redirected off this screen,
  // so "Continue as guest" has to take them into the app itself. Also allowed
  // when already a guest — that's someone who came here to sign in and changed
  // their mind.
  const handleGuestEntry = async () => {
    if (session.status !== "loggedOut" && session.status !== "guest") return;
    await enableGuest();
    leaveLogin();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/* paddingTop 0 overrides Screen's own top inset so the photo runs up under
          the status bar; the content adds the inset back itself. */}
      <Screen padded={false} statusBarStyle="light-content" style={{ paddingTop: 0 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex1}>
          {/* Scrolls so the form stays reachable above the keyboard: the photo goes up
              out of the way. A tap on empty space dismisses the keyboard. */}
          <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View
              style={[
                styles.photo,
                { height: Math.round(height * (f.mode === "signup" ? PHOTO_SHARE_SIGNUP : PHOTO_SHARE)) },
              ]}
            >
              <Image source={HERO_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" />
              {/* The scrim teal behind the title and tagline over the white cloud, held
                  strong to just past the tagline (it was unreadable where the fade had
                  already begun, owner 2026-10-26), then clear through the mountains to
                  the white sheet. The last two characters of each colour are its opacity. */}
              <LinearGradient
                colors={[`${tokens.colors.scrim}F2`, `${tokens.colors.scrim}D9`, `${tokens.colors.scrim}00`]}
                locations={[0, 0.5, 0.78]}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.brand, { paddingTop: insets.top + 24 }]}>
                {/* Two lines at most, shrinking to fit an iPhone SE's width. A long press
                    sends a test error, to check a build's crash reporting end to end (the
                    stack should name this file); nothing shows on screen. */}
                <AppText
                  variant="screenTitle"
                  style={styles.appName}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  suppressHighlighting
                  onLongPress={() => Sentry.captureException(new Error("Sentry test from the login title"))}
                >
                  Kiwi Guide
                </AppText>
                <AppText style={styles.tagline}>New Zealand road trip planner</AppText>
              </View>
            </View>

            <View testID="login-panel" style={[styles.panel, { paddingBottom: insets.bottom + tokens.space.md }]}>
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
                onGuest={handleGuestEntry}
                optIn={{ label: EMAIL_OPT_IN_LABEL, value: f.emailOptIn, onChange: f.setEmailOptIn }}
                // On the white sheet: outlined boxes with the sweep's 12pt corners, dark
                // labels, and the links in teal (orange is the one main button). No
                // `style` to fill the space: the guest link then sits with the other
                // links, not alone at the foot of the screen.
                // "stacked" is the picked drawing: "Forgot password?" under the password
                // box, the other links on one centre line, the guest link plain. The
                // password boxes are empty: their labels already say what they are.
                tone="light"
                radius={12}
                layout="stacked"
                placeholders={{ password: "", confirmPassword: "" }}
                labelSize={15}
                colors={{
                  label: tokens.colors.text,
                  link: tokens.colors.selected,
                  guest: tokens.colors.selected,
                }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screen: { flex: 1, backgroundColor: tokens.colors.page },
  scrollContent: { flexGrow: 1 },
  photo: { width: "100%" },
  brand: { alignItems: "center", gap: tokens.space.xs, paddingHorizontal: tokens.space.lg },
  // The shadow lifts the white title off the cloud.
  appName: {
    color: "#FFFFFF",
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -0.5,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  // White, larger, and with a heavy shadow: in the on-dark orange it couldn't be read over
  // the cloud (owner, 2026-10-26). Smaller and lighter than the title, so it still reads as
  // its own line: medium weight since the design sweep, where bold competed with the title
  // (owner, 2026-11-13).
  tagline: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 26,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.95)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  // A white sheet with rounded top corners over the foot of the photo, as Profile's sheet
  // is. flexGrow: it takes the rest of the screen, so white runs to the bottom edge.
  panel: {
    flexGrow: 1,
    marginTop: -SHEET_OVERLAP,
    borderTopLeftRadius: SHEET_OVERLAP,
    borderTopRightRadius: SHEET_OVERLAP,
    backgroundColor: tokens.colors.page,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
});
