// The sheet behind Explore's title: the towns that have places, each with how many,
// grouped under the region they are in, so thirty towns stay easy to scan.

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 34, left: 0, right: 0 }),
  // A plain View named after its edges (safe-left-right).
  SafeAreaView: ({ edges, ...props }: any) =>
    require("react").createElement(require("react-native").View, { ...props, testID: `safe-${(edges ?? []).join("-")}` }),
}));

import React from "react";
import { StyleSheet } from "react-native";
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

  // Queenstown is the town Explore opens on (lib/areas.ts DEFAULT_AREA), so its region
  // heads the list wherever the guide puts it (owner, 2026-10-24).
  it("lists Queenstown's region first, then the rest in the guide's order", async () => {
    const view = await open({
      options: [...options, { id: "queenstown", label: "Queenstown", count: 25, region: "queenstown-wanaka" }],
    });

    const headings = view.getAllByRole("header").map((h: any) => h.props.children);
    expect(headings).toEqual([
      "Queenstown & Wānaka",
      "Canterbury & Christchurch",
      "Kaikōura",
      "Dunedin & Otago Coast",
      "Elsewhere",
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

  // A Modal draws outside the app's root view, so the sheet keeps clear of a Duo's rail
  // itself; the dim behind it still covers the whole window.
  it("keeps clear of the sides", async () => {
    const view = await open();
    expect(view.getByTestId("safe-left-right")).toBeTruthy();
  });

  it("shows nothing while closed", async () => {
    const view = await open({ visible: false });

    expect(view.queryByText("Dunedin")).toBeNull();
  });
});

describe("AreaSheet on the Duo", () => {
  it("wide: a centred 520 card that ends on a part row under the fade", async () => {
    require("@blacksands/ui").__setWide(true, { width: 669, height: 951 });
    const view = await open();

    const card = StyleSheet.flatten(view.getByTestId("area-sheet").props.style);
    expect(card.width).toBe(520);
    expect(card.maxHeight).toBe(760);
    expect(card.borderTopLeftRadius).toBe(20);
    expect(card.borderBottomLeftRadius).toBe(20);
    expect(view.getByTestId("area-sheet-fade")).toBeTruthy();
  });

  it("phone: the bottom sheet, no fade", async () => {
    const view = await open();
    expect(StyleSheet.flatten(view.getByTestId("area-sheet").props.style).width).toBeUndefined();
    expect(view.queryByTestId("area-sheet-fade")).toBeNull();
  });
});
