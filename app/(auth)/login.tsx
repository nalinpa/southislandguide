import React, { useEffect } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useColorScheme, useWindowDimensions } from "react-native";
import { Stack, router } from "expo-router";
import { useHalves, useWide } from "@blacksands/ui";
import { Image } from "expo-image";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Sentry from "@sentry/react-native";
import { Screen, AppText, AuthPanel } from "@/lib/uiKit";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { EMAIL_OPT_IN_LABEL } from "@/lib/hooks/useEmailOptIn";
import { useSession } from "@/lib/providers/SessionProvider";
import { LAKE_SIDES, cardEdge, cardLift, photoDim, tokens } from "@/lib/ui/tokens";

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

// The open Duo (docs/plans/design-sweep.md, "Login, picked"): the photo fills the window and
// the form floats on a card. The photo's own size, shown at 1.6x with Aoraki's peak (x 672,
// y 354 in the photo) 120 pt from the top, centred; the lake's edge is at y 537.
const PHOTO_W = 1280;
const PHOTO_H = 686;
const PHOTO_ZOOM = 1.6;
const PEAK_X = 672;
const PEAK_Y = 354;
const PEAK_TOP = 120;
const LAKE_EDGE = 537;
const FADE_LEAD = 30; // the fade starts this far above the lake's edge
const FADE_SOLID = 190; // and is solid this far on
const TOP_SHADE = 110; // under the status bar
const CARD_UPRIGHT = 480;
const CARD_SIDEWAYS = 360;
const CARD_FOOT = 56;
const TITLE_GAP = 28;

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
  // Hooks stay above any early return.
  const wide = useWide();
  const { width, upright, foldX } = useHalves();
  const lake = LAKE_SIDES[useColorScheme() === "dark" ? "dark" : "light"];
  const sideways = wide && !upright;

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

  const brandView = (
    <View style={[styles.brand, wide ? styles.brandWide : { paddingTop: insets.top + 24 }]}>
      {/* Wide upright: a soft teal shade behind the title, clear at its edge (the picked drawing's
          radial-gradient(closest-side, teal .62, teal 0)); the same in dark. */}
      {wide && upright ? (
        <Svg testID="login-title-shade" pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="titleShade" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={LAKE_SIDES.light} stopOpacity={0.62} />
              <Stop offset="1" stopColor={LAKE_SIDES.light} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#titleShade)" />
        </Svg>
      ) : null}
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
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/* paddingTop 0 overrides Screen's own top inset so the photo runs up under
          the status bar; the content adds the inset back itself. */}
      <Screen padded={false} statusBarStyle="light-content" style={{ paddingTop: 0 }}>
        {/* Wide: the photo fills the window (upright) or the left page (sideways), behind the
            form. A slot before the KeyboardAvoidingView, null on the phone, so the form's
            parents and their order are the same on every width and a fold doesn't remount it. */}
        {wide ? (
          <View
            testID="login-photo"
            pointerEvents="none"
            style={[
              styles.widePhoto,
              { backgroundColor: lake },
              sideways && { width: foldX, right: undefined },
            ]}
          >
            <View
              testID="login-photo-art"
              style={
                sideways
                  ? StyleSheet.absoluteFill
                  : {
                      position: "absolute",
                      left: width / 2 - PEAK_X * PHOTO_ZOOM,
                      top: PEAK_TOP - PEAK_Y * PHOTO_ZOOM,
                      width: PHOTO_W * PHOTO_ZOOM,
                      height: PHOTO_H * PHOTO_ZOOM,
                    }
              }
            >
              <Image source={HERO_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
            <View testID="login-photo-dim" style={[StyleSheet.absoluteFill, { backgroundColor: photoDim }]} />
            {sideways ? (
              <>
                <LinearGradient
                  colors={[`${tokens.colors.scrim}F2`, `${tokens.colors.scrim}D9`, `${tokens.colors.scrim}00`]}
                  locations={[0, 0.5, 0.78]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.sidewaysBrand}>{brandView}</View>
              </>
            ) : (
              <>
                <LinearGradient
                  colors={[`${lake}8C`, `${lake}00`]}
                  style={[styles.shade, { height: TOP_SHADE }]}
                />
                <LinearGradient
                  colors={[`${lake}00`, `${lake}8C`, lake]}
                  locations={[0, 70 / FADE_SOLID, 1]}
                  style={[
                    styles.shade,
                    {
                      top: PEAK_TOP + (LAKE_EDGE - PEAK_Y) * PHOTO_ZOOM - FADE_LEAD,
                      height: FADE_SOLID,
                    },
                  ]}
                />
              </>
            )}
          </View>
        ) : null}
        <KeyboardAvoidingView
          testID="login-page"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.flex1, sideways && { marginLeft: foldX }]}
        >
          {/* Scrolls so the form stays reachable above the keyboard: the photo goes up
              out of the way. A tap on empty space dismisses the keyboard. */}
          <ScrollView
            testID="login-scroll"
            style={[styles.screen, wide && styles.transparent]}
            contentContainerStyle={[
              styles.scrollContent,
              wide && (sideways ? styles.scrollSideways : styles.scrollUpright),
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {sideways ? null : (
              <View
                style={
                  wide
                    ? undefined
                    : [styles.photo, { height: Math.round(height * (f.mode === "signup" ? PHOTO_SHARE_SIGNUP : PHOTO_SHARE)) }]
                }
              >
                {wide ? null : (
                  <Image source={HERO_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" />
                )}
                {/* The scrim teal behind the title and tagline over the white cloud, held
                    strong to just past the tagline (it was unreadable where the fade had
                    already begun, owner 2026-10-26), then clear through the mountains to
                    the white sheet. The last two characters of each colour are its opacity. */}
                {wide ? null : (
                  <LinearGradient
                    colors={[`${tokens.colors.scrim}F2`, `${tokens.colors.scrim}D9`, `${tokens.colors.scrim}00`]}
                    locations={[0, 0.5, 0.78]}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                {brandView}
              </View>
            )}

            <View
              testID="login-panel"
              style={[
                styles.panel,
                wide
                  ? [styles.card, { width: sideways ? CARD_SIDEWAYS : CARD_UPRIGHT }]
                  : { paddingBottom: insets.bottom + tokens.space.md },
              ]}
            >
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
  transparent: { backgroundColor: "transparent" },
  // Upright: the card low on the page, its top at the fold, the title 28 pt above it.
  scrollUpright: { justifyContent: "flex-end", paddingBottom: CARD_FOOT },
  scrollSideways: { justifyContent: "center", alignItems: "center" },
  widePhoto: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" },
  shade: { position: "absolute", left: 0, right: 0, top: 0 },
  sidewaysBrand: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center" },
  brandWide: { paddingVertical: 10, paddingHorizontal: 28, borderRadius: 24, alignSelf: "center" },
  card: {
    alignSelf: "center",
    marginTop: TITLE_GAP,
    borderRadius: 20,
    padding: 24,
    backgroundColor: tokens.colors.bgCard,
    borderWidth: 1,
    borderColor: cardEdge,
    ...cardLift,
  },
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
