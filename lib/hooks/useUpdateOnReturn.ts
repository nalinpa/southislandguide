import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";
import * as Sentry from "@sentry/react-native";

// How long the app has to be away before a downloaded update restarts it on return. Long
// enough that nobody is mid-task; the trip screen saves its edits when the app is put away
// (ItineraryDetailView), so a restart loses nothing.
export const AWAY_MS = 15 * 60 * 1000;

// expo-updates on its own looks for an update only at a cold start and applies it at the
// next one, and iOS can keep the app in memory for days, so an over-the-air fix reached
// phones late (owner, 2026-11-07). This also looks each time the app comes back, and once
// an update is downloaded, restarts into it the next time the app returns after AWAY_MS.
// The restart shows the splash for a moment and opens on Explore.
export function useUpdateOnReturn() {
  const { isUpdatePending } = Updates.useUpdates();
  const pending = useRef(isUpdatePending);
  pending.current = isUpdatePending;

  useEffect(() => {
    // Off in dev builds and Expo Go.
    if (!Updates.isEnabled) return;
    let awaySince: number | null = null;

    const subscription = AppState.addEventListener("change", (next) => {
      // Only "background" counts as away: Control Centre or a call banner makes the app
      // "inactive" without leaving it.
      if (next === "background") {
        awaySince = Date.now();
        return;
      }
      if (next !== "active" || awaySince === null) return;
      const away = Date.now() - awaySince;
      awaySince = null;

      if (pending.current) {
        if (away >= AWAY_MS) Updates.reloadAsync().catch(Sentry.captureException);
        return;
      }
      // No signal is the usual reason this fails on the road, so it isn't reported.
      Updates.checkForUpdateAsync()
        .then((check) => (check.isAvailable ? Updates.fetchUpdateAsync() : undefined))
        .catch(() => {});
    });
    return () => subscription.remove();
  }, []);
}
