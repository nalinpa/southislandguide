import { useEffect } from "react";

import { useTourIfAny } from "./TourContext";

// Copied from Rotorua. Hands the tour the route to open for steps with this routeKey,
// which only the screen knows (the first place in Explore's list). Does nothing outside
// a TourProvider.
export function useTourStepRoute(key: string, route: string | undefined) {
  const registerStepRoute = useTourIfAny()?.registerStepRoute;

  useEffect(() => {
    registerStepRoute?.(key, route);
  }, [key, route, registerStepRoute]);
}
