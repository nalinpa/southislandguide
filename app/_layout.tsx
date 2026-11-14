import "@/lib/polyfills/buffer";
import React, { useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Stack, useNavigationContainerRef, ErrorBoundaryProps } from "expo-router";
import { isRunningInExpoGo } from "expo";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Sentry from "@sentry/react-native";
import { AlertTriangle } from "lucide-react-native";
import { tokens } from "@/lib/ui/tokens";

import { AppProviders } from "@/lib/providers/AppProviders";
import { OfflineBanner } from "@/lib/uiKit";
import { hooksBag } from "@/lib/hooksBag";
import { dropImpossibleTraces } from "@/lib/sentryTraces";
import { useAppOpenCount } from "@/lib/hooks/useAppOpenCount";
import { useUpdateOnReturn } from "@/lib/hooks/useUpdateOnReturn";
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
          {/* The pale band in the idle grey (design sweep): news, not an alarm. It was the
              engine's amber. The grey is also its bottom line (the engine's rule). */}
          <OfflineBanner colors={{ bg: tokens.colors.band, fg: tokens.colors.textMuted }} />

          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="share-frame"
              options={{
                presentation: "modal",
                headerShown: true,
                title: "Share",
              }}
            />
          </Stack>
          <TourAutoStart />
          <SpotlightOverlay />
        </TourProvider>
      </AppProviders>
    </GestureHandlerRootView>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const navigationRef = useNavigationContainerRef();
  // retry() alone re-renders the route that crashed, so a crash from bad data loops.
  // Resetting the navigation state first sends the app back to its first screen,
  // as a cold start would.
  const restart = () => {
    navigationRef.resetRoot();
    retry();
  };

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <View style={styles.errorBoundaryContainer}>
      <View style={styles.errorIconWrap}>
        <AlertTriangle size={40} color={tokens.colors.danger} strokeWidth={2.25} />
      </View>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>Please try again.</Text>
      <TouchableOpacity
        style={styles.errorRetryBtn}
        onPress={restart}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={styles.errorRetryBtnText}>Restart App</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flexStyle: { flex: 1 },
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
  errorRetryBtnText: { fontSize: 17, fontWeight: "600", color: "#FFFFFF" },
});

export default Sentry.wrap(RootLayout);
