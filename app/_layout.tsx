import "@/lib/polyfills/buffer";
import React, { useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Stack, useNavigationContainerRef, useRouter, ErrorBoundaryProps } from "expo-router";
import { isRunningInExpoGo } from "expo";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as Sentry from "@sentry/react-native";
import { AlertTriangle } from "lucide-react-native";
import { useHalves, useWide } from "@blacksands/ui";
import { tokens } from "@/lib/ui/tokens";

import { AppProviders } from "@/lib/providers/AppProviders";
import { OfflineBanner } from "@/lib/uiKit";
import { hooksBag } from "@/lib/hooksBag";
import { dropImpossibleTraces } from "@/lib/sentryTraces";
import { useAppOpenCount } from "@/lib/hooks/useAppOpenCount";
import { useUpdateOnReturn } from "@/lib/hooks/useUpdateOnReturn";
import { initAnalytics } from "@/lib/analytics";
import { TourProvider } from "@/lib/tour/TourContext";
import { TourAutoStart } from "@/lib/tour/TourAutoStart";
import { SpotlightOverlay } from "@/lib/tour/SpotlightOverlay";

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: false,
  tracesSampleRate: 0.2,
  integrations: [navigationIntegration],
  enableNativeFramesTracking: false,
  beforeSendTransaction: dropImpossibleTraces,
});

// Collection starts off natively (app.config.ts); this turns it on for the store build only.
initAnalytics();

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const ref = useNavigationContainerRef();
  const openCount = useAppOpenCount();
  const { requestReview } = hooksBag.useReviewPrompt();
  useUpdateOnReturn();

  useEffect(() => {
    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

  // Ask for a review on the fifth app start-up. The fifth exactly, not "five or
  // more": the system decides about later times, and the app shouldn't ask on
  // every launch after.
  useEffect(() => {
    if (openCount === 5) requestReview();
  }, [openCount, requestReview]);

  return (
    <GestureHandlerRootView style={styles.flexStyle}>
      <AppProviders>
        {/* Inside AppProviders, so the tour can read the session and the unlock. The
            overlay comes last, to sit over every screen. */}
        <TourProvider>
          {/* Every screen clear of the sides, once: the iPhone Duo's rail (status bar and
              controls on one side) and a landscape notch. The provider inside measures again,
              so screens see no side insets and nothing pads twice. The tour's overlay stays
              outside, over the whole window. Side insets are 0 on a portrait iPhone. */}
          <SafeAreaView edges={["left", "right"]} style={styles.sides}>
            <SafeAreaProvider>
              {/* The pale band in the idle grey (design sweep): news, not an alarm. It was the
                  engine's amber. The grey is also its bottom line (the engine's rule). */}
              <OfflineBanner colors={{ bg: tokens.colors.band, fg: tokens.colors.textMuted }} />

              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen
                  name="share-frame"
                  options={{
                    presentation: "modal",
                    headerShown: true,
                    // Router 58 makes stack headers see-through Liquid Glass on iOS 26+, with the
                    // content running under them. Kept as 1.2 had it: the card starts below.
                    headerTransparent: false,
                    title: "Share",
                  }}
                />
                {/* The trip quiz. Its own Back goes one question back and its Close leaves; the
                    swipe from the left edge would leave the whole quiz, so it is off here. */}
                <Stack.Screen name="build-trip" options={{ gestureEnabled: false }} />
              </Stack>
            </SafeAreaProvider>
          </SafeAreaView>
          <TourAutoStart />
          <SpotlightOverlay />
        </TourProvider>
      </AppProviders>
    </GestureHandlerRootView>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();
  // retry() alone re-renders the route that crashed, so a crash from bad data loops.
  // Going to the start screen first ("/", app/index.tsx) sends the app where a cold start
  // would. Router 58 dropped the ref's resetRoot; this is its migration guide's replacement.
  const restart = () => {
    router.replace("/");
    retry();
  };

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const wide = useWide();
  const { foldX, upright } = useHalves();

  const words = (
    <>
      <View style={styles.errorIconWrap}>
        <AlertTriangle size={40} color={tokens.colors.danger} strokeWidth={2.25} />
      </View>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={[styles.errorMessage, wide && styles.errorMessageWide]}>Please try again.</Text>
    </>
  );
  const button = (
    <TouchableOpacity
      testID="error-button"
      style={[styles.errorRetryBtn, wide && styles.errorRetryBtnWide]}
      onPress={restart}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <Text style={styles.errorRetryBtnText}>Restart App</Text>
    </TouchableOpacity>
  );

  return (
    // Drawn in place of the root layout, so it keeps clear of the sides itself.
    <SafeAreaView
      testID="error-screen"
      edges={["left", "right"]}
      style={[styles.errorBoundaryContainer, wide && styles.errorBoundaryWide, wide && !upright && styles.row]}
    >
      {wide ? (
        <>
          {/* A Duo: the words either side of the fold, the button on the other. Upright, two halves
              of the screen (words at the foot of the top, button at the head of the bottom);
              sideways, the left page and the rest (the right page, clear of the rail). */}
          <View
            testID="error-words"
            style={upright ? styles.errorWordsUpright : [styles.errorPage, { width: foldX, flex: undefined }]}
          >
            {words}
          </View>
          <View testID="error-button-half" style={upright ? styles.errorButtonUpright : styles.errorPage}>
            {button}
          </View>
        </>
      ) : (
        <>
          {words}
          {button}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flexStyle: { flex: 1 },
  // The page colour shows in the strip beside a Duo's rail.
  sides: { flex: 1, backgroundColor: tokens.colors.page },
  // The design sweep's error screen (docs/plans/design-sweep.md): the group a little above
  // the middle, a large red sign on a pale red circle, and the one button the full width.
  errorBoundaryContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 70,
    backgroundColor: tokens.colors.page,
  },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: tokens.colors.dangerDim,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: tokens.colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    color: tokens.colors.text2,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 22,
  },
  errorRetryBtn: {
    alignSelf: "stretch",
    height: 52,
    backgroundColor: tokens.button.primary.bg,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  // A Duo (docs/plans/design-sweep.md): no phone padding; the group split at the fold.
  errorBoundaryWide: { paddingHorizontal: 0, paddingBottom: 0, justifyContent: "flex-start" },
  row: { flexDirection: "row" },
  errorMessageWide: { marginBottom: 0 },
  errorRetryBtnWide: { alignSelf: "center", width: 320 },
  errorWordsUpright: { flex: 1, width: "100%", justifyContent: "flex-end", alignItems: "center", paddingBottom: 16 },
  errorButtonUpright: { flex: 1, width: "100%", justifyContent: "flex-start", alignItems: "center", paddingTop: 16 },
  errorPage: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorRetryBtnText: { fontSize: 17, fontWeight: "600", color: "#FFFFFF" },
});

export default Sentry.wrap(RootLayout);
