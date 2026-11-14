// The drive between two areas, drawn on the day timeline in the time it takes up. It is
// placed by the planner, never by the user, so it must not read as something to tap or
// drag: no button, and one plain sentence for a screen reader.
import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import { DriveBlock, driveDropSlot } from "@/components/itinerary/DriveBlock";
import { PLANNER } from "@/lib/constants/gameplay";

const { SLOT_HEIGHT } = PLANNER;

// The drive's gesture is the engine's (@blacksands/components), whose bundle loads moti and
// FlashList (not transformed under Jest) and the map (native). Nothing here uses them.
jest.mock("moti", () => ({ MotiView: require("react-native").View }));
jest.mock("@shopify/flash-list", () => ({ FlashList: require("react-native").View }));
jest.mock("react-native-maps", () => ({}));

describe("DriveBlock", () => {
  it("names the area being driven to, where from, and when and how long", async () => {
    const view = await render(<DriveBlock fromLabel="Christchurch" toLabel="Dunedin" startSlot={11} slots={9} />);

    expect(view.getByText("Drive to Dunedin")).toBeTruthy();
    expect(view.getByText("Christchurch to Dunedin")).toBeTruthy();
    expect(view.getByText("1:30 PM · About 4.5 hours")).toBeTruthy();
  });

  it("drops the middle line when it is only one slot tall", async () => {
    const view = await render(<DriveBlock fromLabel="Christchurch" toLabel="Dunedin" startSlot={4} slots={1} />);

    expect(view.getByText("Drive to Dunedin")).toBeTruthy();
    expect(view.queryByText("Christchurch to Dunedin")).toBeNull();
    expect(view.getByText("10:00 AM · About 30 min")).toBeTruthy();
  });

  it("sits on the timeline where the drive starts, as tall as it is long", async () => {
    const view = await render(<DriveBlock fromLabel="Christchurch" toLabel="Dunedin" startSlot={11} slots={9} />);

    expect(view.getByTestId("drive-block")).toHaveStyle({ height: 9 * SLOT_HEIGHT, transform: [{ translateY: 11 * SLOT_HEIGHT }] });
  });

  it("reads to a screen reader as one sentence", async () => {
    const view = await render(<DriveBlock fromLabel="Christchurch" toLabel="Dunedin" startSlot={11} slots={9} />);

    expect(view.getByLabelText("Drive from Christchurch to Dunedin, about 4.5 hours, leaving 1:30 PM")).toBeTruthy();
  });

  it("is not a button", async () => {
    const view = await render(<DriveBlock fromLabel="Christchurch" toLabel="Dunedin" startSlot={11} slots={9} />);

    expect(view.queryAllByRole("button")).toHaveLength(0);
  });

  it("sits where it is when it is shown, even when it can be moved", async () => {
    const view = await render(
      <DriveBlock fromLabel="Christchurch" toLabel="Dunedin" startSlot={6} slots={9} earliest={4} latest={11} onMove={jest.fn()} />,
    );

    expect(view.getByTestId("drive-block")).toHaveStyle({ height: 9 * SLOT_HEIGHT, transform: [{ translateY: 6 * SLOT_HEIGHT }] });
  });
});

// The user can move a drive, between the place before it and the one it leads to, so the
// spare time can be spent in the town they're driving to.
describe("moving a drive", () => {
  const movable = (over: Record<string, unknown> = {}) =>
    render(
      <DriveBlock
        fromLabel="Christchurch"
        toLabel="Dunedin"
        startSlot={6}
        slots={9}
        earliest={4}
        latest={11}
        onMove={jest.fn()}
        {...over}
      />,
    );

  it("lands a drag on the half hour it was dropped on", () => {
    expect(driveDropSlot(8, 4, 11)).toBe(8);
  });

  it("can't be dragged to start before the place before it ends, or end after the next one starts", () => {
    expect(driveDropSlot(1, 4, 11)).toBe(4);
    expect(driveDropSlot(15, 4, 11)).toBe(11);
  });

  // Hold to move (tester, 2026-11-14): a swipe over a drive scrolls the day; a hold then a
  // drag moves it. The rules are the engine's TimelineBlock's (its own tests); these check
  // the drive is wired to them. A touch as PanResponder reads it: one finger, from y to y.
  let t = 0;
  const touch = (from: number, to: number) => {
    t += 1;
    const finger = {
      touchActive: true,
      startPageX: 0,
      startPageY: 0,
      startTimeStamp: 0,
      currentPageX: 0,
      currentPageY: to,
      currentTimeStamp: t,
      previousPageX: 0,
      previousPageY: from,
      previousTimeStamp: t - 1,
    };
    return {
      touchHistory: { numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: t, touchBank: [finger] },
      nativeEvent: { touches: [], changedTouches: [] },
    };
  };

  describe("held", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("picks up after the hold, then a drag moves it", async () => {
      const onMove = jest.fn((slot: number) => slot);
      const onDragStart = jest.fn();
      const block = (await movable({ onMove, onDragStart, holdToDrag: 350 })).getByTestId("drive-block");

      await fireEvent(block, "responderGrant", touch(0, 0));
      expect(onDragStart).not.toHaveBeenCalled();
      await act(() => jest.advanceTimersByTime(350));
      expect(onDragStart).toHaveBeenCalledTimes(1);
      expect(block.props.onResponderTerminationRequest(touch(0, 0))).toBe(false);

      await fireEvent(block, "responderMove", touch(0, 2 * SLOT_HEIGHT));
      await fireEvent(block, "responderRelease", touch(2 * SLOT_HEIGHT, 2 * SLOT_HEIGHT));
      expect(onMove).toHaveBeenCalledWith(8);
    });

    it("lets a swipe go to the scroll, and doesn't move", async () => {
      const onMove = jest.fn();
      const onDragStart = jest.fn();
      const block = (await movable({ onMove, onDragStart, holdToDrag: 350 })).getByTestId("drive-block");

      await fireEvent(block, "responderGrant", touch(0, 0));
      expect(block.props.onResponderTerminationRequest(touch(0, 0))).toBe(true);
      await fireEvent(block, "responderMove", touch(0, 40));
      await act(() => jest.advanceTimersByTime(350));
      await fireEvent(block, "responderRelease", touch(40, 40));

      expect(onDragStart).not.toHaveBeenCalled();
      expect(onMove).not.toHaveBeenCalled();
    });
  });

  it("shows a grip when it can be moved, and none when it can't", async () => {
    expect((await movable()).queryByTestId("drive-grip")).toBeTruthy();
    expect(
      (await render(<DriveBlock fromLabel="Christchurch" toLabel="Dunedin" startSlot={6} slots={9} />)).queryByTestId(
        "drive-grip",
      ),
    ).toBeNull();
  });

  // VoiceOver: swipe up or down on it, a half hour at a time.
  it("can be moved a half hour at a time with a screen reader", async () => {
    const onMove = jest.fn();
    const view = await movable({ onMove });
    const block = view.getByTestId("drive-block");

    expect(block.props.accessibilityRole).toBe("adjustable");
    await fireEvent(block, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    await fireEvent(block, "accessibilityAction", { nativeEvent: { actionName: "increment" } });

    expect(onMove.mock.calls).toEqual([[5], [7]]);
  });

  it("goes no further than it can with a screen reader either", async () => {
    const onMove = jest.fn();
    const view = await movable({ onMove, startSlot: 11 });

    await fireEvent(view.getByTestId("drive-block"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });

    expect(onMove).not.toHaveBeenCalled();
  });
});
