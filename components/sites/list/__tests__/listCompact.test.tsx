// The Explore list's compact rows beside the place on the open Duo.
jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
jest.mock("moti", () => ({ MotiView: require("react-native").View }));
jest.mock("@blacksands/hooks", () => ({ formatDistanceMeters: (m: number) => (m / 1000).toFixed(1) + " km" }));
jest.mock("@shopify/flash-list", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    FlashList: (p: any) =>
      React.createElement(
        View,
        { testID: "flash", numColumns: p.numColumns, contentContainerStyle: p.contentContainerStyle },
        p.data.map((item: any, index: number) =>
          React.createElement(
            React.Fragment,
            { key: p.keyExtractor(item) },
            index > 0 && p.ItemSeparatorComponent ? React.createElement(p.ItemSeparatorComponent) : null,
            p.renderItem({ item, index }),
          ),
        ),
      ),
  };
});

import React from "react";
import { fireEvent, render, within } from "@testing-library/react-native";

import { ListView } from "@/components/sites/list/ListView";

const wide = (size?: { width: number; height: number }) => require("@blacksands/ui").__setWide(true, size);
const row = (id: string, name: string, over: Record<string, unknown> = {}) =>
  ({ location: { id, name, category: ["Water"], ...over }, distanceMeters: 1500 }) as any;
const rows = [row("a", "Sumner Beach", { imageThumbnailUrl: "https://img/a-thumb.webp", imageUrl: "https://img/a.webp" }), row("b", "Riccarton Bush")];

describe("ListView compact", () => {
  it("renders PlaceRows: the name, 'category · distance' and the thumbnail", async () => {
    wide({ width: 669, height: 951 });
    const view = await render(<ListView compact rows={rows} onPressItem={jest.fn()} />);

    expect(view.getByText("Sumner Beach")).toBeTruthy();
    expect(view.getAllByText("Water · 1.5 km")).toHaveLength(2);
    expect(view.getAllByTestId("row-image")[0]).toHaveProp("source", { uri: "https://img/a-thumb.webp" });
    expect(view.queryByText("Details")).toBeNull();
  });

  it("is one column with no gap between rows, sideways too", async () => {
    wide({ width: 951, height: 669 });
    const view = await render(<ListView compact rows={rows} onPressItem={jest.fn()} />);

    expect(view.getByTestId("flash").props.numColumns).toBe(1);
    expect(view.queryByTestId("list-separator")).toBeNull();
    expect(view.queryByTestId("list-gutter")).toBeNull();
    expect(view.getByTestId("flash").props.contentContainerStyle).toMatchObject({ paddingHorizontal: 8, paddingTop: 0 });
  });

  it("marks the chosen row and passes taps back by id", async () => {
    wide({ width: 669, height: 951 });
    const onPressItem = jest.fn();
    const view = await render(<ListView compact selectedId="b" rows={rows} onPressItem={onPressItem} />);

    const buttons = view.getAllByRole("button");
    expect(buttons[0]).toHaveProp("accessibilityState", { selected: false });
    expect(buttons[1]).toHaveProp("accessibilityState", { selected: true });
    expect(within(buttons[1]).getByTestId("row-bar")).toBeTruthy();
    await fireEvent.press(buttons[0]);
    expect(onPressItem).toHaveBeenCalledWith("a");
  });

  it("hands the tour's target to the first row only", async () => {
    wide();
    const target = { ref: React.createRef<any>(), onLayout: jest.fn(), testID: "first-row" } as any;
    const view = await render(<ListView compact rows={rows} onPressItem={jest.fn()} firstRowTarget={target} />);

    expect(view.getAllByTestId("first-row")).toHaveLength(1);
    expect(within(view.getByTestId("first-row")).getByText("Sumner Beach")).toBeTruthy();
  });
});
