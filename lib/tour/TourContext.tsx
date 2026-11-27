// The opening tour's engine, copied from Rotorua's lib/tour/TourContext.tsx. Changed here:
// start() takes who is looking, and the tour walks only their steps (tourSteps.ts). The last
// step can open a screen as it ends (the trip quiz) and have a second way out (close), and a
// step can be only for someone with no trip.
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { router, usePathname } from "expo-router";

import { logEvent } from "@/lib/analytics";
import { useItineraries } from "@/lib/hooks/useItineraries";
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
  // The last step's quiet second button (its closeLabel): ends the tour as its main button does, opening nothing.
  close: () => void;
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
  const [audience, setAudience] = useState<TourAudience>("guest");
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

  // Navigating to the tab already on screen changes the tab history but not the screen,
  // which leaves Sentry's navigation span open until its 15 s timeout: every new user's
  // tour opened with one (the welcome step is on Explore, where the app opens). Skipped.
  const pathname = usePathname();
  const goToStep = useCallback(
    (list: TourStep[], index: number) => {
      const target = list[index];
      const tabRoute = target?.tabKey ? TOUR_TAB_ROUTES[target.tabKey] : undefined;
      if (tabRoute) {
        if (tabRoute.replace(/\/\([^/]+\)/g, "") !== pathname) router.navigate(tabRoute as never);
      } else if (target?.routeKey && stepRoutes[target.routeKey]) router.push(stepRoutes[target.routeKey] as never);
      setStepIndex(index);
    },
    [stepRoutes, pathname],
  );

  const start = useCallback(
    (who: TourAudience) => {
      const list = stepsFor(who);
      setSteps(list);
      setAudience(who);
      goToStep(list, 0);
      setActive(true);
    },
    [goToStep],
  );

  // The steps only for someone with no trip (the trip quiz's: the trip they pick would replace one they have). A
  // guest has none; someone signed in has none once their trips are known (addFlow is null while the list loads)
  // and empty. Read as the tour goes, so it is decided when the tour reaches the step. One already reached stays:
  // a trip that turns up then doesn't take the card from under them.
  const { itineraries, addFlow } = useItineraries();
  const noTrip = audience === "guest" || (addFlow !== null && itineraries.length === 0);
  const shown = useMemo(
    () => (noTrip ? steps : steps.filter((s, i) => !s.noTrip || i <= stepIndex)),
    [steps, noTrip, stepIndex],
  );

  const skip = useCallback(() => setActive(false), []);

  // Finished, from the last step's button or its quiet second one: logged with the button's words as an id
  // ("build_my_trip", "not_now"), or with none for an unnamed Done, as before the quiz's step. The screen the step
  // leads to is opened once the tour is down.
  const finish = useCallback((label?: string, opens?: string) => {
    if (label) logEvent("tour_finished", { button: label.toLowerCase().replace(/ /g, "_") });
    else logEvent("tour_finished");
    setActive(false);
    if (opens) router.push(opens as never);
  }, []);

  const next = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= shown.length) {
      const last = shown[stepIndex];
      finish(last?.nextLabel, last?.opens);
      return;
    }
    goToStep(shown, nextIndex);
  }, [shown, stepIndex, goToStep, finish]);

  const close = useCallback(() => finish(shown[stepIndex]?.closeLabel), [shown, stepIndex, finish]);

  const step = active ? shown[stepIndex] ?? null : null;
  const targetRect = step ? targets[step.id] ?? null : null;

  const value = useMemo<TourContextValue>(
    () => ({
      active,
      step,
      stepIndex,
      stepCount: shown.length,
      targetRect,
      start,
      next,
      skip,
      close,
      registerTarget,
      registerStepRoute,
    }),
    [active, step, stepIndex, shown.length, targetRect, start, next, skip, close, registerTarget, registerStepRoute],
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
