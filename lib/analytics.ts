import {
  getAnalytics,
  logEvent as fbLogEvent,
  setAnalyticsCollectionEnabled,
} from "@react-native-firebase/analytics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";

export type AppEvent =
  | "tour_finished"
  | "suggested_trip_picked"
  | "trip_created"
  | "place_added_to_trip"
  | "trip_three_stops"
  | "place_opened"
  | "map_opened"
  | "guide_section_opened"
  | "sign_up"
  // The trip quiz's, with the website's names and params (kiwiguide-site public/plan/quiz.js): a fresh quiz begun
  // (`from`: the way in), each answer (`step`, `answer`), and a picked trip saved.
  | "quiz_start"
  | "quiz_step"
  | "trip_saved";

// A failed log is dropped: analytics must never break the app. No user id, email or typed
// text goes in any param (see the brief); only counts and fixed ids.
export function logEvent(name: AppEvent, params?: Record<string, string | number>): void {
  try {
    // RNFB 27's modular logEvent returns void; only a synchronous throw can reach here.
    fbLogEvent(getAnalytics(), name as string, params);
  } catch {}
}

// Firebase's recommended sign_up event.
export function logSignUp(method: "apple" | "google" | "email"): void {
  logEvent("sign_up", { method });
}

// Native collection starts off (FIREBASE_ANALYTICS_COLLECTION_ENABLED in app.config.ts), so
// dev builds, previews and the simulator never reach the production property. Only the
// store build's channel turns it on. Called once, from the root layout.
export function initAnalytics(): void {
  try {
    const on = !__DEV__ && Updates.channel === "production";
    Promise.resolve(setAnalyticsCollectionEnabled(getAnalytics(), on)).catch(() => {});
  } catch {}
}

const THREE_STOPS_KEY = "analytics.threeStopsLogged";

// trip_three_stops is once per trip, ever: the trip ids that already logged are kept on the
// phone. Fire and forget; a storage failure drops the event rather than risk a repeat.
// ponytail: read-check-write isn't atomic, so two saves in the same instant could both log.
export function logTripThreeStops(tripId: string): void {
  (async () => {
    const logged: string[] = JSON.parse((await AsyncStorage.getItem(THREE_STOPS_KEY)) ?? "[]");
    if (logged.includes(tripId)) return;
    await AsyncStorage.setItem(THREE_STOPS_KEY, JSON.stringify([...logged, tripId]));
    logEvent("trip_three_stops");
  })().catch(() => {});
}
