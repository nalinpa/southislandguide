// The drive between two areas, drawn on the day timeline in the time it takes up. It is
// placed by the planner, never by the user, so it must not read as something to tap or
// drag: no button, and one plain sentence for a screen reader.
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { DriveBlock, driveDropSlot } from "@/components/itinerary/DriveBlock";
import { PLANNER } from "@/lib/constants/gameplay";

const { SLOT_HEIGHT } = PLANNER;

describe("DriveBlock", () => {
  it("names the area being driven to, where from, and when and how long", async () => {
    const view = await render(<DriveBlock fromLabel="Christchurch" toLabel="Dunedin" startSlot={11} slots={9} />);

    expect(view.getByText("Drive to Dunedin")).toBeTruthy();
    expect(view.getByText("Christchurch to Dunedin")).toBeTruthy();
    expect(view.getByText("1:30 PM · About 4.5 Hours")).toBeTruthy();
  });

  it("drops the middle line when it is only one slot tall", async () => {
    const view = await render(<DriveBlock fromLabel="Christchurch" toLabel="Dunedin" startSlot={4} slots={1} />);

    expect(view.getByText("Drive to Dunedin")).toBeTruthy();
    expect(view.queryByText("Christchurch to Dunedin")).toBeNull();
    expect(view.getByText("10:00 AM · About 0.5 Hours")).toBeTruthy();
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

  it("lands a drag on the nearest half hour", () => {
    expect(driveDropSlot(6, -1.6 * SLOT_HEIGHT, SLOT_HEIGHT, 4, 11)).toBe(4);
    expect(driveDropSlot(6, 2.4 * SLOT_HEIGHT, SLOT_HEIGHT, 4, 11)).toBe(8);
  });

  it("can't be dragged to start before the place before it ends, or end after the next one starts", () => {
    expect(driveDropSlot(6, -5 * SLOT_HEIGHT, SLOT_HEIGHT, 4, 11)).toBe(4);
    expect(driveDropSlot(6, 9 * SLOT_HEIGHT, SLOT_HEIGHT, 4, 11)).toBe(11);
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
