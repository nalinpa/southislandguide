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
          <OfflineBanner />

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
        <AlertTriangle size={32} color={tokens.colors.danger} strokeWidth={2} />
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
  errorBoundaryContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: tokens.colors.bgBase,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.dangerDim,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: tokens.colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 15,
    color: tokens.colors.text2,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  errorRetryBtn: {
    backgroundColor: tokens.colors.highlight,
    borderRadius: tokens.radius.md,
    paddingVertical: 15,
    paddingHorizontal: 32,
  },
  errorRetryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
});

export default Sentry.wrap(RootLayout);
