import { useCallback, useEffect, useMemo, useRef } from "react";
import type { View } from "react-native";

import { useTourIfAny } from "./TourContext";

// Copied from Rotorua. Spread the returned props onto the View the tour step `id` points
// at. Measures its place on screen on every layout, and again while its step is up until
// it stops moving: onLayout fires only when the view's own frame changes, so a target that
// moves with something around it keeps a stale place otherwise. Does nothing outside a
// TourProvider.
//
// Two such moves (tester, 2026-11-11: the Add to Trip cut-out missed the button): the
// place screen slides in after the tour pushes it, and "+ Add to Trip" sits in a bottom
// safe-area wrapper whose inset (34 pt on Face ID iPhones, 0 on an SE) can land after the
// first layout, lifting the button without changing its frame inside the wrapper.
// ponytail: a reading every 100 ms until two match, for 1.5 s at most. Something that
// moves later than that isn't followed; listen to that view's own change if one shows up.
const READ_EVERY_MS = 100;
const MAX_READS = 15;

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
    if (current !== id || !registerTarget) return;
    let stopped = false;
    let reads = 0;
    let last = "";
    let timer: ReturnType<typeof setTimeout> | undefined;

    const read = () => {
      reads += 1;
      ref.current?.measureInWindow((x, y, width, height) => {
        if (stopped) return;
        const now = `${x},${y},${width},${height}`;
        if (width > 0 && height > 0) {
          // Unchanged readings are ignored by registerTarget, so this costs nothing.
          registerTarget(id, { x, y, width, height });
          if (now === last) return; // Settled.
        }
        last = now;
        if (reads < MAX_READS) timer = setTimeout(read, READ_EVERY_MS);
      });
    };

    const raf = requestAnimationFrame(read);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [current, id, registerTarget]);

  // Kept the same between renders, so a list row it is handed to isn't redrawn each time.
  return useMemo(() => ({ ref, onLayout: measure }), [measure]);
}

export type TourTarget = ReturnType<typeof useTourTarget>;
