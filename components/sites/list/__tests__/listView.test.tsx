// The Explore list. Pinned here: the opening tour's "Tap a Place" step points at the first
// row, and only that one (lib/tour).

// Not transformed for jest; a plain map over the rows does for what is checked here.
jest.mock("@shopify/flash-list", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    FlashList: ({ data, renderItem, keyExtractor }: any) =>
      React.createElement(
        View,
        null,
        data.map((item: any, index: number) =>
          React.createElement(React.Fragment, { key: keyExtractor(item) }, renderItem({ item, index })),
        ),
      ),
  };
});

jest.mock("@/components/sites/list/ListItem", () => {
  const { Text } = require("react-native");
  return { ListItem: ({ name }: any) => require("react").createElement(Text, null, "Row " + name) };
});

import React from "react";
import { render, within } from "@testing-library/react-native";

import { ListView } from "@/components/sites/list/ListView";

const row = (id: string, name: string) => ({ location: { id, name, category: ["Walks"] }, distanceMeters: null }) as any;

describe("ListView", () => {
  it("hands the tour's target to the first row only", async () => {
    const target = { ref: React.createRef<any>(), onLayout: jest.fn(), testID: "first-row" } as any;
    const view = await render(
      <ListView rows={[row("a", "Sumner Beach"), row("b", "Riccarton Bush")]} onPressItem={jest.fn()} firstRowTarget={target} />,
    );

    expect(view.getAllByTestId("first-row")).toHaveLength(1);
    expect(within(view.getByTestId("first-row")).getByText("Row Sumner Beach")).toBeTruthy();
    expect(within(view.getByTestId("first-row")).queryByText("Row Riccarton Bush")).toBeNull();
  });
});
