// Explore's category picker on the open Duo: All, then the town's categories with their pins.

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 34, left: 0, right: 0 }),
  SafeAreaView: ({ edges, ...props }: any) =>
    require("react").createElement(require("react-native").View, { ...props, testID: "safe" }),
}));

// Each icon as a marker carrying its name and colour, so the rows' icons can be told apart.
jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  return new Proxy(
    {},
    {
      get: (_t, name: string) => (props: any) => React.createElement(View, { testID: "icon-" + name, color: props.color }),
    },
  );
});

import React from "react";
import { fireEvent, render, within } from "@testing-library/react-native";

import { CategorySheet } from "@/components/sites/CategorySheet";
import { CATEGORY_CONFIG } from "@/components/map/SiteMarker";
import { SITE_CATEGORY_LABELS } from "@/lib/models";
import { tokens } from "@/lib/ui/tokens";

const categories = [
  { key: null, label: "All" },
  { key: "Food" as const, label: SITE_CATEGORY_LABELS.Food },
  { key: "Walks" as const, label: SITE_CATEGORY_LABELS.Walks },
];

const open = async (over: Record<string, unknown> = {}) => {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  const view = await render(
    <CategorySheet visible categories={categories} selected={null} onSelect={onSelect} onClose={onClose} {...over} />,
  );
  return { view, onSelect, onClose };
};

describe("CategorySheet", () => {
  beforeEach(() => require("@blacksands/ui").__setWide(true, { width: 669, height: 951 }));

  it("lists All and the categories with their icons, the chosen one ticked", async () => {
    const { view } = await open({ selected: "Walks" });

    const rows = view.getAllByRole("button").filter((b: any) => b.props.accessibilityLabel !== "Close");
    expect(rows.map((b: any) => b.props.accessibilityLabel)).toEqual(categories.map((c) => c.label));
    expect(rows.map((b: any) => b.props.accessibilityState.selected)).toEqual([false, false, true]);
    // The pin's colour for a category, the secondary text colour for All.
    expect(within(rows[0]).getByTestId("icon-LayoutGrid").props.color).toBe(tokens.colors.text2);
    expect(within(rows[1]).getByTestId("icon-Utensils").props.color).toBe(CATEGORY_CONFIG.Food.color);
    expect(within(rows[2]).getByText(SITE_CATEGORY_LABELS.Walks)).toHaveStyle({ fontWeight: "600", color: tokens.colors.highlight });
  });

  it("selects and closes on a tap", async () => {
    const { view, onSelect, onClose } = await open();

    await fireEvent.press(view.getByLabelText(SITE_CATEGORY_LABELS.Food));
    expect(onSelect).toHaveBeenCalledWith("Food");
    expect(onClose).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByLabelText("All"));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("is not shown on the phone, even when visible", async () => {
    require("@blacksands/ui").__setWide(false);
    const { view } = await open();
    expect(view.queryByLabelText("All")).toBeNull();
  });
});
