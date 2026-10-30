// The tour's dim, cut-out and card. The SVG and the animation library are stood in for:
// what is checked is the card, its buttons, where it sits, and what a screen reader gets.
jest.mock("expo-router", () => ({ router: { navigate: jest.fn(), push: jest.fn() } }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  const Stub = ({ children }: any) => require("react").createElement(View, null, children);
  return { __esModule: true, default: Stub, Defs: Stub, Mask: Stub, Rect: Stub };
});
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: any) => c },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedProps: (f: () => object) => f(),
    withTiming: (v: number) => v,
    FadeIn: { duration: () => undefined },
  };
});
jest.mock("@/lib/tour/TourTripPreview", () => ({
  TourTripPreview: () => require("react").createElement(require("react-native").Text, null, "trip preview"),
}));

import React from "react";
import { AccessibilityInfo, Dimensions, StyleSheet } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { TourProvider, useTour } from "@/lib/tour/TourContext";
import { SpotlightOverlay } from "@/lib/tour/SpotlightOverlay";

let tour: ReturnType<typeof useTour>;
function Grab() {
  tour = useTour();
  return null;
}

async function show() {
  await render(
    <TourProvider>
      <Grab />
      <SpotlightOverlay />
    </TourProvider>,
  );
}

const cardTop = () => StyleSheet.flatten(screen.getByTestId("tour-card").props.style).top;
const layoutCard = (height: number) =>
  fireEvent(screen.getByTestId("tour-card"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 300, height } } });

describe("SpotlightOverlay", () => {
  it("shows nothing while the tour isn't running", async () => {
    await show();
    expect(screen.toJSON()).toBeNull();
  });

  it("opens on a card that says it's a tour, with Start Tour and Skip", async () => {
    await show();
    await act(async () => tour.start("paid"));

    expect(screen.getByText("Welcome to Kiwi Guide")).toBeTruthy();
    expect(screen.getByText("Here's a quick tour of how it works. It takes a minute, and you can skip it any time.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start Tour" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Skip tour" })).toBeTruthy();
  });

  it("shows the step's title and words", async () => {
    await show();
    await act(async () => tour.start("paid"));
    await fireEvent.press(screen.getByRole("button", { name: "Start Tour" }));

    expect(screen.getByText("Pick a Town")).toBeTruthy();
    expect(screen.getByText("You start in the nearest town. Tap here to see another.")).toBeTruthy();
  });

  it("moves on with Next and ends with Skip", async () => {
    await show();
    await act(async () => tour.start("paid"));
    await act(async () => tour.next());

    await fireEvent.press(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Before You Go")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Skip tour" }));
    expect(screen.toJSON()).toBeNull();
  });

  it("says Done on the last step, with no Skip", async () => {
    await show();
    await act(async () => tour.start("guest"));
    for (let i = 0; i < 6; i++) await act(async () => tour.next());

    expect(screen.getByText("See It on the Map")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Skip tour" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Done" }));
    expect(screen.toJSON()).toBeNull();
  });

  it("keeps a screen reader on the card, and reads each step out", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    await show();
    await act(async () => tour.start("paid"));

    expect(screen.getByTestId("tour-layer").props.accessibilityViewIsModal).toBe(true);
    expect(screen.getByRole("header", { name: "Welcome to Kiwi Guide" })).toBeTruthy();
    expect(announce).toHaveBeenLastCalledWith("Welcome to Kiwi Guide. Here's a quick tour of how it works. It takes a minute, and you can skip it any time.");

    await act(async () => tour.next());
    expect(screen.getByRole("header", { name: "Pick a Town" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Skip tour" })).toBeTruthy();
    expect(announce).toHaveBeenLastCalledWith("Pick a Town. You start in the nearest town. Tap here to see another.");
    announce.mockRestore();
  });

  it("centres the card when its target hasn't registered", async () => {
    await show();
    await act(async () => tour.start("paid"));
    await layoutCard(200);

    expect(cardTop()).toBe((Dimensions.get("window").height - 200) / 2);
  });

  it("puts the card under a target near the top", async () => {
    await show();
    await act(async () => tour.start("paid"));
    await act(async () => tour.next());
    await act(async () => tour.registerTarget("town", { x: 16, y: 60, width: 180, height: 40 }));
    await layoutCard(200);

    expect(cardTop()).toBe(60 + 40 + 20);
  });

  it("puts the card over a target near the bottom", async () => {
    const height = Dimensions.get("window").height;
    await show();
    await act(async () => tour.start("paid"));
    await act(async () => tour.next());
    await act(async () => tour.registerTarget("town", { x: 16, y: height - 100, width: 180, height: 60 }));
    await layoutCard(200);

    expect(cardTop()).toBe(height - 100 - 200 - 20);
  });

  it("shows the trip preview on the trip step only", async () => {
    await show();
    await act(async () => tour.start("guest"));
    expect(screen.queryByText("trip preview")).toBeNull();

    for (let i = 0; i < 5; i++) await act(async () => tour.next());
    expect(screen.getByText("Your Trip, Day by Day")).toBeTruthy();
    expect(screen.getByText("trip preview")).toBeTruthy();
  });

  it("moves Skip Tour to the bottom on the guide step, off the guide button", async () => {
    await show();
    await act(async () => tour.start("paid"));
    const skipStyle = () => StyleSheet.flatten(screen.getByRole("button", { name: "Skip tour" }).props.style);
    expect(skipStyle().top).toBeDefined();

    await act(async () => tour.next());
    await act(async () => tour.next());
    expect(screen.getByText("Before You Go")).toBeTruthy();
    expect(skipStyle().top).toBeUndefined();
    expect(skipStyle().bottom).toBeDefined();

    await act(async () => tour.next());
    expect(skipStyle().top).toBeDefined();
  });

  it("keeps the card's buttons at least 44pt tall", async () => {
    await show();
    await act(async () => tour.start("paid"));

    for (const name of ["Start Tour", "Skip tour"]) {
      expect(StyleSheet.flatten(screen.getByRole("button", { name }).props.style).minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});
