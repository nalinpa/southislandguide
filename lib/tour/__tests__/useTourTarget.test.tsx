// A tour step's cut-out follows its target until the target stops moving (tester,
// 2026-11-11: the Add to Trip cut-out missed the button). The place screen slides in, and
// the button's home-bar inset can land after the first layout, so one reading isn't enough.
const mockTour: any = { active: true, step: { id: "placeAdd" }, registerTarget: jest.fn() };
jest.mock("@/lib/tour/TourContext", () => ({ useTourIfAny: () => mockTour }));

import React from "react";
import { Text } from "react-native";
import { act, render } from "@testing-library/react-native";

import { useTourTarget } from "@/lib/tour/useTourTarget";

let target: ReturnType<typeof useTourTarget>;
function Target() {
  target = useTourTarget("placeAdd");
  return <Text>Add to Trip</Text>;
}

// Each reading takes the next y from the list, then keeps the last one.
function readingsAt(...ys: number[]) {
  let i = 0;
  const measureInWindow = jest.fn((cb: (x: number, y: number, w: number, h: number) => void) => {
    cb(16, ys[Math.min(i, ys.length - 1)], 358, 54);
    i += 1;
  });
  (target.ref as any).current = { measureInWindow };
  return measureInWindow;
}

const advance = (ms: number) => act(() => jest.advanceTimersByTime(ms));

beforeEach(() => {
  jest.useFakeTimers();
  mockTour.active = true;
  mockTour.step = { id: "placeAdd" };
  mockTour.registerTarget = jest.fn();
});
afterEach(() => jest.useRealTimers());

it("measures again until the target stops moving", async () => {
  await render(<Target />);
  const measure = readingsAt(700, 666, 666);

  await advance(2000);

  expect(measure).toHaveBeenCalledTimes(3);
  expect(mockTour.registerTarget).toHaveBeenLastCalledWith("placeAdd", { x: 16, y: 666, width: 358, height: 54 });
});

it("gives up after 1.5 s if the target keeps moving", async () => {
  await render(<Target />);
  const measure = readingsAt(...Array.from({ length: 40 }, (_, i) => 700 - i));

  await advance(5000);

  expect(measure).toHaveBeenCalledTimes(15);
});

it("stops when the step changes", async () => {
  const view = await render(<Target />);
  const measure = readingsAt(...Array.from({ length: 40 }, (_, i) => 700 - i));
  await advance(50);
  const before = measure.mock.calls.length;

  mockTour.step = { id: "trip" };
  await view.rerender(<Target />);
  await advance(2000);

  expect(before).toBeGreaterThan(0);
  expect(measure).toHaveBeenCalledTimes(before);
});

it("does nothing for a step that isn't its own", async () => {
  mockTour.step = { id: "browse" };
  await render(<Target />);
  const measure = readingsAt(700);

  await advance(2000);

  expect(measure).not.toHaveBeenCalled();
});
