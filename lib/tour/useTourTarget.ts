import { useCallback, useEffect, useMemo, useRef } from "react";
import type { View } from "react-native";

import { useTourIfAny } from "./TourContext";

// Copied from Rotorua. Spread the returned props onto the View the tour step `id` points
// at. Measures its place on screen on every layout, and again the moment its step comes
// up: onLayout fires only when the view's own frame changes, so a target that mounts
// once data loads can register a stale place if something above it hasn't settled.
// Does nothing outside a TourProvider.
export function useTourTarget(id: string) {
  const tour = useTourIfAny();
  const registerTarget = tour?.registerTarget;
  const current = tour?.active ? tour.step?.id : undefined;
  const ref = useRef<View>(null);

  const measure = useCallback(() => {
    if (!registerTarget) return;
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) registerTarget(id, { x, y, width, height });
    });
  }, [id, registerTarget]);

  useEffect(() => {
    if (current !== id) return;
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [current, id, measure]);

  // Kept the same between renders, so a list row it is handed to isn't redrawn each time.
  return useMemo(() => ({ ref, onLayout: measure }), [measure]);
}

export type TourTarget = ReturnType<typeof useTourTarget>;
