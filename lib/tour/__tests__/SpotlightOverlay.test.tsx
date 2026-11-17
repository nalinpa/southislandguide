// The tour's dim, cut-out and card. The SVG and the animation library are stood in for:
// what is checked is the card, its buttons, where it sits, and what a screen reader gets.
jest.mock("expo-router", () => ({ router: { navigate: jest.fn(), push: jest.fn() }, usePathname: () => mockPathname() }));
const mockPathname = jest.fn(() => "/");
// Mutable, so one test can stand in for a Duo's rail.
const mockInsets = { top: 20, bottom: 0, left: 0, right: 0 };
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => mockInsets,
}));
jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  const Stub = ({ children }: any) => require("react").createElement(View, null, children);
  // Rect keeps its props, so the cut-out's ring can be read.
  const Rect = (props: any) => require("react").createElement(View, props);
  return { __esModule: true, default: Stub, Defs: Stub, Mask: Stub, Rect };
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
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";

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

    expect(cardTop()).toBe(60 + 40 + 22);
    // The pointer is on the card's top edge, aimed up at the target.
    expect(StyleSheet.flatten(screen.getByTestId("tour-pointer").props.style).top).toBeLessThan(0);
  });

  // A Duo's rail on the left (84pt), which app/_layout.tsx keeps every screen clear of: the
  // card, over the whole window, moves in by it, and its pointer still aims at the target.
  it("keeps the card clear of a side inset", async () => {
    mockInsets.left = 84;
    try {
      await show();
      await act(async () => tour.start("paid"));
      await act(async () => tour.next());
      await act(async () => tour.registerTarget("town", { x: 116, y: 60, width: 180, height: 40 }));
      await layoutCard(200);

      const card = StyleSheet.flatten(screen.getByTestId("tour-card").props.style);
      expect(card.left).toBe(12 + 84);
      expect(card.right).toBe(12);
      // The target's middle (116 + 90) from the card's left edge (96), less half the 14pt pointer.
      expect(StyleSheet.flatten(screen.getByTestId("tour-pointer").props.style).left).toBe(206 - 96 - 7);
    } finally {
      mockInsets.left = 0;
    }
  });

  it("puts the card over a target near the bottom", async () => {
    const height = Dimensions.get("window").height;
    await show();
    await act(async () => tour.start("paid"));
    await act(async () => tour.next());
    await act(async () => tour.registerTarget("town", { x: 16, y: height - 100, width: 180, height: 60 }));
    await layoutCard(200);

    expect(cardTop()).toBe(height - 100 - 200 - 22);
    // And on its bottom edge, aimed down, when the card sits over the target.
    expect(StyleSheet.flatten(screen.getByTestId("tour-pointer").props.style).bottom).toBeLessThan(0);
  });

  it("shows the trip preview on the trip step only", async () => {
    await show();
    await act(async () => tour.start("guest"));
    expect(screen.queryByText("trip preview")).toBeNull();

    for (let i = 0; i < 5; i++) await act(async () => tour.next());
    expect(screen.getByText("Your Trip, Day by Day")).toBeTruthy();
    expect(screen.getByText("trip preview")).toBeTruthy();
  });

  // It was a pill in the screen's top corner, moved to the bottom on the guide step to
  // keep it off the guide button. Since the design sweep it is a link inside the card, on
  // every step, so it can't sit on anything (docs/plans/design-sweep.md).
  it("keeps Skip Tour inside the card on every step, the guide step too", async () => {
    await show();
    await act(async () => tour.start("paid"));
    const inCard = () => within(screen.getByTestId("tour-card")).getByRole("button", { name: "Skip tour" });
    const skipStyle = () => StyleSheet.flatten(inCard().props.style);
    expect(skipStyle().position).toBeUndefined();

    await act(async () => tour.next());
    await act(async () => tour.next());
    expect(screen.getByText("Before You Go")).toBeTruthy();
    expect(skipStyle().position).toBeUndefined();
    expect(skipStyle().bottom).toBeUndefined();
  });

  describe("on a Duo", () => {
    const ui = () => require("@blacksands/ui");
    const cardStyle = () => StyleSheet.flatten(screen.getByTestId("tour-card").props.style);
    const pointerStyle = () => StyleSheet.flatten(screen.getByTestId("tour-pointer").props.style);
    const toTown = async () => {
      await act(async () => tour.start("paid"));
      await act(async () => tour.next());
    };

    it("wide: the card is 360 wide", async () => {
      ui().__setWide(true, { width: 669, height: 951 });
      await show();
      await toTown();
      await act(async () => tour.registerTarget("town", { x: 300, y: 60, width: 180, height: 40 }));

      expect(cardStyle().width).toBe(360);
      expect(cardStyle().right).toBeUndefined();
    });

    it("wide: a target in the left band puts the card to its right, at the place column's left and the target's top, pointer on its left edge", async () => {
      ui().__setWide(true, { width: 669, height: 951 });
      await show();
      await toTown();
      await act(async () => tour.registerTarget("town", { x: 16, y: 120, width: 120, height: 20 }));
      await layoutCard(200);

      // EXPLORE_LIST.upright (268) + the column's 20 pt side.
      expect(cardStyle().left).toBe(288);
      // The card starts a corner (20) and half a pointer (7) above the target's middle (130),
      // so the pointer's centre meets it.
      expect(cardStyle().top).toBe(130 - 27);
      const pointer = pointerStyle();
      expect(pointer.left).toBe(-7);
      expect(cardStyle().top + pointer.top + 7).toBe(130);
    });

    it("wide: a low band target keeps the card on screen, the pointer still at the target's middle", async () => {
      ui().__setWide(true, { width: 669, height: 951 });
      await show();
      await toTown();
      await act(async () => tour.registerTarget("town", { x: 16, y: 880, width: 120, height: 30 }));
      await layoutCard(200);

      const top = cardStyle().top;
      expect(top).toBeLessThan(880);
      expect(top + 200).toBeLessThanOrEqual(951 - 16);
      // The target's middle (895) is below the card, so the pointer sits as near as the card
      // allows: on its left edge, clear of the 20 pt corners.
      const pointerTop = pointerStyle().top;
      expect(pointerTop).toBeGreaterThanOrEqual(20);
      expect(pointerTop + 14).toBeLessThanOrEqual(200 - 20);
    });

    it("wide: any other target puts the card below it, pointer over its middle", async () => {
      ui().__setWide(true, { width: 669, height: 951 });
      await show();
      await toTown();
      await act(async () => tour.registerTarget("town", { x: 300, y: 100, width: 100, height: 40 }));
      await layoutCard(200);

      expect(cardStyle().top).toBe(100 + 40 + 22);
      // Card centred on the target's middle (350): left 170, pointer at 180 - 7.
      expect(cardStyle().left).toBe(170);
      expect(pointerStyle().left).toBe(350 - 170 - 7);
    });

    it("wide: a full-width target from x 20 (the place page's Add to Trip row) gets the phone placement, not the band's", async () => {
      ui().__setWide(true, { width: 669, height: 951 });
      await show();
      await toTown();
      await act(async () => tour.registerTarget("town", { x: 20, y: 860, width: 629, height: 50 }));
      await layoutCard(200);

      // Above the target (no room below), pointer down at its middle (334.5).
      expect(cardStyle().top).toBe(860 - 200 - 22);
      expect(cardStyle().left).toBe(Math.min(334.5 - 180, 669 - 16 - 360));
      expect(pointerStyle().bottom).toBeLessThan(0);
      expect(pointerStyle().left).toBe(334.5 - cardStyle().left - 7);
    });

    it("wide: a full-width target at the foot (Add to Trip upright) gets the card entirely above it, pointer down at its middle", async () => {
      ui().__setWide(true, { width: 669, height: 951 });
      mockInsets.top = 0;
      try {
        await show();
        await toTown();
        const target = { x: 20, y: 880, width: 629, height: 52 };
        await act(async () => tour.registerTarget("town", target));
        // Taller than the 190 estimate: placing must use what the card measured.
        await layoutCard(262);

        expect(cardStyle().top + 262).toBeLessThanOrEqual(target.y - 22);
        expect(pointerStyle().bottom).toBeLessThan(0);
        expect(pointerStyle().left).toBe(334.5 - cardStyle().left - 7);
      } finally {
        mockInsets.top = 20;
      }
    });

    it("wide: the cut-out has a 2 pt selected ring", async () => {
      ui().__setWide(true, { width: 669, height: 951 });
      await show();
      await toTown();

      const ring = screen.getByTestId("tour-ring");
      expect(ring.props.strokeWidth).toBe(2);
      expect(ring.props.stroke).toBe(require("@/lib/ui/tokens").tokens.colors.selected);
      expect(ring.props.rx).toBe(12);
    });

    it("wide: welcome sits centred with its foot 24 above the fold", async () => {
      ui().__setWide(true, { width: 669, height: 951 });
      await show();
      await act(async () => tour.start("paid"));
      await layoutCard(200);

      expect(cardStyle().top).toBe(951 / 2 - 24 - 200);
      expect(cardStyle().left).toBe((669 - 360) / 2);
    });

    it("wide sideways: welcome is centred", async () => {
      ui().__setWide(true, { width: 951, height: 669 });
      await show();
      await act(async () => tour.start("paid"));
      await layoutCard(200);

      expect(cardStyle().top).toBe((669 - 200) / 2);
      expect(cardStyle().left).toBe((951 - 360) / 2);
    });

    it("phone: unchanged, no ring, the width less 12 a side", async () => {
      await show();
      await toTown();

      expect(screen.queryByTestId("tour-ring")).toBeNull();
      expect(cardStyle().width).toBeUndefined();
      expect(cardStyle().left).toBe(12);
      expect(cardStyle().right).toBe(12);
    });
  });

  it("keeps the card's buttons at least 44pt tall", async () => {
    await show();
    await act(async () => tour.start("paid"));

    for (const name of ["Start Tour", "Skip tour"]) {
      expect(StyleSheet.flatten(screen.getByRole("button", { name }).props.style).minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});
