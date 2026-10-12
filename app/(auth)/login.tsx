import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mail } from "lucide-react-native";
import { Screen, AppText, AuthCard } from "@/lib/uiKit";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { useSession } from "@/lib/providers/SessionProvider";
import { tokens } from "@/lib/ui/tokens";

// Aoraki / Mt Cook over Lake Pukaki. Bundled so it paints offline with no
// network flash.
const HERO_IMAGE = require("../../assets/login.webp");

export default function LoginScreen() {
  const f = useAuthForm("login");
  const { session, enableGuest } = useSession();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Guest is not redirected here — see app/(auth)/_layout.tsx for why.
    if (session.status === "authed") {
      router.replace("/(app)/(tabs)/sites");
    }
  }, [session.status]);

  // ponytail: email-only for 1.0. Apple's servers reject this App ID's Sign in
  // with Apple ("Invalid client", see TASKS.md Sign-in), and Google can't be
  // offered without it (App Store guideline 4.8). When Apple fixes it, render
  // <SocialSignInButtons> above the email button again: the component and
  // lib/auth are untouched. usesAppleSignIn stays in app.config.ts on purpose:
  // without it `eas build` switches the capability off at Apple.
  const busy = f.busy || session.status === "loading";

  // The email form stays closed until asked for, so the photo isn't hidden
  // behind a card most people never use.
  const [emailOpen, setEmailOpen] = useState(false);

  // The buttons and the form swap in place. Whichever has just arrived fades
  // in, so the change doesn't snap. A fade-in of the newcomer only, not a
  // crossfade of both stacked: the form is several times the buttons' height,
  // and stacking them would take it out of the scroll view's layout.
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [emailOpen, fade]);

  // Navigates explicitly: guests are no longer auto-redirected off this screen,
  // so "Continue as Guest" has to take them into the app itself. Also allowed
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
        <View style={styles.container}>
          {/* Outside the KeyboardAvoidingView so the photo doesn't shrink and
              re-crop when the keyboard opens. */}
          <Image source={HERO_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" />
          {/* The scrim colour at the top (white title over white cloud) and the
              bottom (white guest link over the lake), clear through the
              mountains. It holds past the subtitle before fading and is nearly
              opaque there, so the clouds don't show through behind the words.
              It is the deep scrim teal, not the brand teal it used to be: the
              words were readable on that but didn't stand out. The last two
              characters of each colour are its opacity. */}
          <LinearGradient
            colors={[
              `${tokens.colors.scrim}F5`,
              `${tokens.colors.scrim}E6`,
              `${tokens.colors.scrim}00`,
              `${tokens.colors.scrim}00`,
              `${tokens.colors.scrim}CC`,
            ]}
            // Strong to just under the subtitle (~0.36), then a quick fade, clear
            // by 0.5: Aoraki's peak sits at about half screen height.
            locations={[0, 0.36, 0.5, 0.58, 1]}
            style={StyleSheet.absoluteFill}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.flex1}
          >
            {/* Scrolls so the open email form stays reachable above the keyboard
                on a small screen; a tap on empty space dismisses the keyboard. */}
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                {
                  // The title sits lower over the sky while the buttons show;
                  // back up top when the taller email form needs the room.
                  paddingTop: insets.top + (emailOpen ? tokens.space.xl : 80),
                  paddingBottom: insets.bottom + tokens.space.md,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.brandContainer}>
                {/* Two lines at most, shrinking to fit: at 60pt "South Island" is
                    wider than an iPhone SE's 327pt between the margins. */}
                <AppText variant="screenTitle" style={styles.appName} numberOfLines={2} adjustsFontSizeToFit>
                  South Island Guide
                </AppText>
                {/* Not the label variant: small, widely spaced capitals were the
                    hardest words on the screen to read. */}
                <AppText style={styles.tagline}>Ultimate South Island trip planner</AppText>
              </View>

              {emailOpen ? (
                <Animated.View style={[styles.actions, { opacity: fade }]}>
                  <AuthCard
                    mode={f.mode}
                    title={f.title}
                    subtitle={f.subtitle}
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
                  />
                  <Pressable
                    onPress={() => setEmailOpen(false)}
                    accessibilityRole="button"
                    style={styles.linkBtn}
                  >
                    <AppText style={styles.linkText}>Back</AppText>
                  </Pressable>
                </Animated.View>
              ) : (
                <Animated.View style={[styles.actions, { opacity: fade }]}>
                  <Pressable
                    onPress={() => setEmailOpen(true)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: busy }}
                    style={[styles.emailBtn, busy && styles.dimmed]}
                  >
                    <Mail size={20} color="#FFFFFF" strokeWidth={2.25} />
                    <AppText style={styles.emailText}>Sign in with email</AppText>
                  </Pressable>
                  <Pressable
                    onPress={handleGuestEntry}
                    accessibilityRole="button"
                    style={styles.linkBtn}
                  >
                    <AppText style={styles.linkText}>Continue as Guest</AppText>
                  </Pressable>
                </Animated.View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.accentWarm },
  flex1: { flex: 1 },
  // Title pinned to the top, buttons to the bottom, photo showing between.
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    gap: tokens.space.lg,
    paddingHorizontal: tokens.space.lg,
  },
  brandContainer: { alignItems: "center" },
  // 52pt (screenTitle is 30) wraps to "South Island / Guide" on every phone
  // width; "South Island" alone is ~290pt, inside an iPhone SE's 327. The
  // shadow lifts it off the cloud.
  // Letter spacing -0.5, not the tighter -1.5 it had: at this weight the
  // letters were starting to touch.
  appName: {
    color: "#FFFFFF",
    fontSize: 60,
    lineHeight: 64,
    letterSpacing: -0.5,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  // Normal case, bold, in the highlight's on-dark twin: in white at 18pt it
  // read as a smaller echo of the title rather than a line of its own. ~330pt
  // wide at 20pt, so it may wrap to two lines on an iPhone SE.
  tagline: {
    marginTop: tokens.space.sm,
    color: tokens.colors.highlightOnDark,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  actions: { gap: tokens.space.sm },
  // The screen's main action: the full-strength highlight with a white label
  // (5.2:1). Not the lighter on-dark orange: white on that is only 1.7:1.
  // 56pt is the kit's primary tap height.
  emailBtn: {
    height: tokens.tap.primary,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.highlight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dimmed: { opacity: 0.5 },
  emailText: { color: "#FFFFFF", fontSize: 19, fontWeight: "700" },
  linkBtn: { alignSelf: "center", paddingVertical: 10, paddingHorizontal: tokens.space.md },
  linkText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
