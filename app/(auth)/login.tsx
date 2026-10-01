import React, { useEffect, useState } from "react";
import {
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
import { Screen, AppText, components } from "@/lib/uiKit";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { useSession } from "@/lib/providers/SessionProvider";
import { tokens } from "@/lib/ui/tokens";
import { SocialSignInButtons } from "@/components/auth/SocialSignInButtons";

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

  // Social sign-in lives outside AuthCard rather than inside it: @blacksands/
  // components deliberately has no appleButton slot (it was added for
  // rotorua-guide in 0.5.4 and removed in c51f5f1), so the shared package never
  // imports expo-apple-authentication and no other app inherits that native dep.
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [socialBusy, setSocialBusy] = useState(false);
  const busy = f.busy || socialBusy || session.status === "loading";

  // The email form stays closed until asked for, so the photo isn't hidden
  // behind a card most people never use.
  const [emailOpen, setEmailOpen] = useState(false);

  // Navigates explicitly: guests are no longer auto-redirected off this screen,
  // so "Continue as Guest" has to take them into the app itself. Also allowed
  // when already a guest — that's someone who came here to sign in and changed
  // their mind.
  const handleGuestEntry = async () => {
    if (session.status !== "loggedOut" && session.status !== "guest") return;
    await enableGuest();
    router.replace("/(app)/(tabs)/map");
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
          {/* Dark teal at the top (white title over white cloud) and the bottom
              (white guest link over the lake), clear through the mountains. The
              top tint holds past the subtitle before fading. */}
          <LinearGradient
            colors={[
              "rgba(6,63,69,0.9)",
              "rgba(6,63,69,0.75)",
              "rgba(6,63,69,0)",
              "rgba(6,63,69,0)",
              "rgba(6,63,69,0.75)",
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
                <AppText variant="screenTitle" style={styles.appName}>
                  South Island Guide
                </AppText>
                <AppText variant="label" style={styles.tagline}>
                  Ultimate South Island trip planner
                </AppText>
              </View>

              {emailOpen ? (
                <View style={styles.actions}>
                  <components.AuthCard
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
                    <AppText style={styles.linkText}>Other ways to sign in</AppText>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.actions}>
                  <SocialSignInButtons onError={setAuthErr} onBusyChange={setSocialBusy} />
                  {authErr ? (
                    // On a card: red text straight on the photo was unreadable.
                    <AppText variant="label" style={styles.socialErr}>
                      {authErr}
                    </AppText>
                  ) : null}
                  {/* White, so it reads as the alternative to the two black
                      provider buttons. Same 50pt height and 12 radius. */}
                  <Pressable
                    onPress={() => setEmailOpen(true)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: busy }}
                    style={[styles.emailBtn, busy && styles.dimmed]}
                  >
                    <Mail size={20} color={tokens.colors.text} strokeWidth={2.25} />
                    <AppText style={styles.emailText}>Sign in with email</AppText>
                  </Pressable>
                  <Pressable
                    onPress={handleGuestEntry}
                    accessibilityRole="button"
                    style={styles.linkBtn}
                  >
                    <AppText style={styles.linkText}>Continue as Guest</AppText>
                  </Pressable>
                </View>
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
  appName: {
    color: "#FFFFFF",
    fontSize: 52,
    lineHeight: 54,
    letterSpacing: -1.5,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    marginTop: tokens.space.sm,
    color: "#FFFFFF",
    fontSize: 14,
    // Uppercased by the label variant. 1.5 not 2.5: the longer line still wraps
    // on narrow phones, and lineHeight keeps the two lines tight if it does.
    letterSpacing: 1.5,
    lineHeight: 20,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  actions: { gap: tokens.space.sm },
  socialErr: {
    color: tokens.colors.danger,
    backgroundColor: tokens.colors.bgCard,
    textAlign: "center",
    padding: tokens.space.sm,
    borderRadius: 12,
    overflow: "hidden",
  },
  emailBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dimmed: { opacity: 0.5 },
  emailText: { color: tokens.colors.text, fontSize: 19, fontWeight: "600" },
  linkBtn: { alignSelf: "center", paddingVertical: 10, paddingHorizontal: tokens.space.md },
  linkText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
