import React, { useEffect } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Stack, router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Sentry from "@sentry/react-native";
import { Screen, AppText, AuthPanel } from "@/lib/uiKit";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { useSession } from "@/lib/providers/SessionProvider";
import { tokens } from "@/lib/ui/tokens";

// Aoraki / Mt Cook over Lake Pukaki. Bundled so it paints offline with no
// network flash.
const HERO_IMAGE = require("../../assets/login.webp");

// The photo's share of the screen: about 400pt on a 6.1" iPhone, about 310 on an iPhone
// SE (667pt), where the whole form must still fit (App Review runs iPhone apps on iPad at
// 375×667; Rotorua was rejected for a button off the bottom there).
const PHOTO_SHARE = 0.47;

// Mockup C (owner, 2026-10-25; docs/plans/login-redesign.md): the photo with the title
// on top, fading into the deep teal of the app's top bars, and the engine's AuthPanel on
// the teal, showing straight away. Email is the only way in, so there is no "Sign in with
// email" step to open it.
export default function LoginScreen() {
  const f = useAuthForm("login");
  const { session, enableGuest } = useSession();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  useEffect(() => {
    // Guest is not redirected here — see app/(auth)/_layout.tsx for why.
    if (session.status === "authed") {
      router.replace("/(app)/(tabs)/sites");
    }
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
    router.replace("/(app)/(tabs)/sites");
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
            <View style={[styles.photo, { height: Math.round(height * PHOTO_SHARE) }]}>
              <Image source={HERO_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" />
              {/* The scrim teal behind the title and tagline over the white cloud, held
                  strong to just past the tagline (it was unreadable where the fade had
                  already begun, owner 2026-10-26), clear through the mountains, then into
                  the panel's teal so the photo has no hard edge. The last two characters
                  of each colour are its opacity. */}
              <LinearGradient
                colors={[
                  `${tokens.colors.scrim}F2`,
                  `${tokens.colors.scrim}D9`,
                  `${tokens.colors.scrim}00`,
                  `${tokens.colors.accentWarm}00`,
                  tokens.colors.accentWarm,
                ]}
                locations={[0, 0.5, 0.72, 0.84, 1]}
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
                <AppText style={styles.tagline}>Ultimate South Island trip planner</AppText>
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
                tone="dark"
                radius={0}
                colors={{
                  label: tokens.colors.onDarkMuted,
                  guest: tokens.colors.highlightOnDark,
                }}
                style={styles.flex1}
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
  screen: { flex: 1, backgroundColor: tokens.colors.accentWarm },
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
  // its own line.
  tagline: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.95)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  // flexGrow: the panel takes the rest of the screen, so the guest link sits at its foot.
  panel: {
    flexGrow: 1,
    backgroundColor: tokens.colors.accentWarm,
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.xs,
  },
});
