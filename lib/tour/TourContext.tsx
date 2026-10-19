// The opening tour's engine, copied from Rotorua's lib/tour/TourContext.tsx. Changed here:
// start() takes who is looking, and the tour walks only their steps (tourSteps.ts).
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { router } from "expo-router";

import { stepsFor, TOUR_TAB_ROUTES, type TourAudience, type TourStep } from "./tourSteps";

export type TourRect = { x: number; y: number; width: number; height: number };

type TourContextValue = {
  active: boolean;
  step: TourStep | null;
  stepIndex: number;
  stepCount: number;
  targetRect: TourRect | null;
  start: (audience: TourAudience) => void;
  next: () => void;
  skip: () => void;
  registerTarget: (id: string, rect: TourRect) => void;
  registerStepRoute: (key: string, route: string | undefined) => void;
};

const TourContext = createContext<TourContextValue | null>(null);

function rectsEqual(a: TourRect | undefined, b: TourRect): boolean {
  return !!a && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [targets, setTargets] = useState<Record<string, TourRect>>({});
  const [stepRoutes, setStepRoutes] = useState<Record<string, string>>({});

  const registerTarget = useCallback((id: string, rect: TourRect) => {
    setTargets((prev) => (rectsEqual(prev[id], rect) ? prev : { ...prev, [id]: rect }));
  }, []);

  const registerStepRoute = useCallback((key: string, route: string | undefined) => {
    setStepRoutes((prev) => {
      if (route === undefined) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return prev[key] === route ? prev : { ...prev, [key]: route };
    });
  }, []);

  const goToStep = useCallback(
    (list: TourStep[], index: number) => {
      const target = list[index];
      if (target?.tabKey) router.navigate(TOUR_TAB_ROUTES[target.tabKey] as never);
      else if (target?.routeKey && stepRoutes[target.routeKey]) router.push(stepRoutes[target.routeKey] as never);
      setStepIndex(index);
    },
    [stepRoutes],
  );

  const start = useCallback(
    (audience: TourAudience) => {
      const list = stepsFor(audience);
      setSteps(list);
      goToStep(list, 0);
      setActive(true);
    },
    [goToStep],
  );

  const skip = useCallback(() => setActive(false), []);

  const next = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= steps.length) {
      setActive(false);
      return;
    }
    goToStep(steps, nextIndex);
  }, [steps, stepIndex, goToStep]);

  const step = active ? steps[stepIndex] ?? null : null;
  const targetRect = step ? targets[step.id] ?? null : null;

  const value = useMemo<TourContextValue>(
    () => ({
      active,
      step,
      stepIndex,
      stepCount: steps.length,
      targetRect,
      start,
      next,
      skip,
      registerTarget,
      registerStepRoute,
    }),
    [active, step, stepIndex, steps.length, targetRect, start, next, skip, registerTarget, registerStepRoute],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

// For the screens' target hooks: null outside a TourProvider, so a screen rendered on its
// own (its tests) doesn't need one.
export function useTourIfAny(): TourContextValue | null {
  return useContext(TourContext);
}
