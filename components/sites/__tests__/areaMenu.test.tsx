// The menu behind Explore's title: the towns that have places, each with how many.
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { AreaMenu } from "@/components/sites/AreaMenu";

const options = [
  { id: "christchurch", label: "Christchurch", count: 46 },
  { id: "dunedin", label: "Dunedin", count: 35 },
  { id: "timaru", label: "Timaru", count: 1 },
];

const open = (over: Record<string, unknown> = {}) =>
  render(<AreaMenu visible options={options} selected="dunedin" onSelect={jest.fn()} onClose={jest.fn()} {...over} />);

describe("AreaMenu", () => {
  it("lists each town with its count, in the order given", async () => {
    const view = await open();

    expect(view.getAllByRole("button").map((b: any) => b.props.accessibilityLabel)).toEqual([
      "Christchurch, 46 places",
      "Dunedin, 35 places",
      "Timaru, 1 place",
    ]);
    expect(view.getByText("35")).toBeTruthy();
  });

  it("marks the town being shown, and only that one", async () => {
    const view = await open();

    expect(view.getByLabelText("Dunedin, 35 places").props.accessibilityState).toEqual({ selected: true });
    expect(view.getByLabelText("Timaru, 1 place").props.accessibilityState).toEqual({ selected: false });
  });

  it("hands back the town that was tapped", async () => {
    const onSelect = jest.fn();
    const view = await open({ onSelect });

    await fireEvent.press(view.getByLabelText("Timaru, 1 place"));

    expect(onSelect).toHaveBeenCalledWith("timaru");
  });

  it("closes when the user taps away from it", async () => {
    const onClose = jest.fn();
    const view = await open({ onClose });

    await fireEvent.press(view.getByTestId("area-menu-backdrop"));

    expect(onClose).toHaveBeenCalled();
  });

  it("shows nothing while closed", async () => {
    const view = await open({ visible: false });

    expect(view.queryByText("Dunedin")).toBeNull();
  });
});
