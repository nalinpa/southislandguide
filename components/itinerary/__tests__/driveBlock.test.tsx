// The drive between two areas, drawn on the day timeline in the time it takes up. It is
// placed by the planner, never by the user, so it must not read as something to tap or
// drag: no button, and one plain sentence for a screen reader.
import React from "react";
import { render } from "@testing-library/react-native";

import { DriveBlock } from "@/components/itinerary/DriveBlock";
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

    expect(view.getByTestId("drive-block")).toHaveStyle({ top: 11 * SLOT_HEIGHT, height: 9 * SLOT_HEIGHT });
  });

  it("reads to a screen reader as one sentence", async () => {
    const view = await render(<DriveBlock fromLabel="Christchurch" toLabel="Dunedin" startSlot={11} slots={9} />);

    expect(view.getByLabelText("Drive from Christchurch to Dunedin, about 4.5 hours, leaving 1:30 PM")).toBeTruthy();
  });

  it("is not a button", async () => {
    const view = await render(<DriveBlock fromLabel="Christchurch" toLabel="Dunedin" startSlot={11} slots={9} />);

    expect(view.queryAllByRole("button")).toHaveLength(0);
  });
});
