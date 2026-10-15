// The sheet behind Explore's title: the towns that have places, each with how many,
// grouped under the region they are in, so thirty towns stay easy to scan.

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 34, left: 0, right: 0 }),
}));

import React from "react";
import { fireEvent, render, within } from "@testing-library/react-native";

import { AreaSheet } from "@/components/sites/AreaSheet";

const options = [
  { id: "christchurch", label: "Christchurch", count: 46, region: "canterbury" },
  { id: "timaru", label: "Timaru", count: 1, region: "canterbury" },
  { id: "dunedin", label: "Dunedin", count: 35, region: "dunedin-otago" },
  { id: "kaikoura", label: "Kaikōura", count: 12, region: "kaikoura" },
  { id: "nowhere", label: "Nowhere", count: 2 },
  { id: "", label: "Other", count: 3 },
];

const open = (over: Record<string, unknown> = {}) =>
  render(<AreaSheet visible options={options} selected="dunedin" onSelect={jest.fn()} onClose={jest.fn()} {...over} />);

const rowLabels = (view: any): string[] =>
  view.getAllByLabelText(/, \d+ places?$/).map((b: any) => b.props.accessibilityLabel);

describe("AreaSheet", () => {
  it("groups the towns under their region, in the guide's region order", async () => {
    const view = await open();

    const headings = view.getAllByRole("header").map((h: any) => h.props.children);
    expect(headings).toEqual(["Canterbury & Christchurch", "Kaikōura", "Dunedin & Otago Coast", "Elsewhere"]);
    expect(rowLabels(view)).toEqual([
      "Christchurch, 46 places",
      "Timaru, 1 place",
      "Kaikōura, 12 places",
      "Dunedin, 35 places",
      "Nowhere, 2 places",
      "Other, 3 places",
    ]);
  });

  it("puts a town under its region's heading", async () => {
    const view = await open();

    const canterbury = view.getByText("Canterbury & Christchurch").parent!;
    expect(within(canterbury).getByText("Timaru")).toBeTruthy();
    expect(within(canterbury).queryByText("Dunedin")).toBeNull();
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

  it("closes from its close button or a tap above it", async () => {
    const onClose = jest.fn();
    const view = await open({ onClose });

    await fireEvent.press(view.getByLabelText("Close"));
    await fireEvent.press(view.getByTestId("area-sheet-backdrop"));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("shows nothing while closed", async () => {
    const view = await open({ visible: false });

    expect(view.queryByText("Dunedin")).toBeNull();
  });
});
