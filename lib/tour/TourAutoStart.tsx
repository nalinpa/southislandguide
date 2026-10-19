import { useEffect, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useSegments } from "expo-router";

import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import { useEntitlementGate } from "@/lib/hooks/useEntitlementGate";
import { useSession } from "@/lib/providers/SessionProvider";
import { useTour } from "./TourContext";
import type { TourAudience } from "./tourSteps";

// Set when the tour starts, not when it ends, as Rotorua does: someone who closes the app
// mid-tour isn't shown it again.
export const TOUR_SEEN_KEY = "southislandguide:tourSeen";

// Who the tour is for: a guest, or someone signed in with (paid) or without (free) the
// unlock. Null while that isn't known yet, or on the login screen.
export function useTourAudience(): TourAudience | null {
  const { session } = useSession();
  const { entitledProductIds, loading } = useEntitlementGate(session.status === "authed" ? session.uid : null);
  if (session.status === "guest") return "guest";
  if (session.status !== "authed" || loading) return null;
  return entitledProductIds.has(FULL_GUIDE_PRODUCT_ID) ? "paid" : "free";
}

// Whether the location prompt has been answered either way. Explore asks as it opens, and
// the system's alert takes the app inactive and back to active, so it is checked again on
// each return to active. Never asks itself.
function useLocationAnswered(): boolean {
  const [answered, setAnswered] = useState(false);
  useEffect(() => {
    if (answered) return;
    const check = () =>
      Location.getForegroundPermissionsAsync()
        .then((p) => p.status !== "undetermined" && setAnswered(true))
        .catch(() => {});
    void check();
    const sub = AppState.addEventListener("change", (state) => state === "active" && void check());
    return () => sub.remove();
  }, [answered]);
  return answered;
}

// Starts the tour the first time someone is on the main tabs, signed in or guest, once
// the location prompt is answered (docs/plans/opening-tour.md, "When it starts"). Rotorua
// started it on the first app start-up only, which missed anyone who signed in later.
export function TourAutoStart() {
  const { start } = useTour();
  const audience = useTourAudience();
  // Typed routes narrow the segments to the route being typed; any route can be current.
  const onTabs = (useSegments() as string[])[1] === "(tabs)";
  const locationAnswered = useLocationAnswered();

  // Null until read. A store that can't be read counts as seen: better no tour than one
  // on every start-up.
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(TOUR_SEEN_KEY)
      .then((v) => setSeen(v === "1"))
      .catch(() => setSeen(true));
  }, []);

  useEffect(() => {
    if (seen !== false || !audience || !onTabs || !locationAnswered) return;
    setSeen(true);
    AsyncStorage.setItem(TOUR_SEEN_KEY, "1").catch(() => {});
    start(audience);
  }, [seen, audience, onTabs, locationAnswered, start]);

  return null;
}
