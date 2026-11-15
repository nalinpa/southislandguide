// The guide's region picker on the open Duo: South Island, then each region with sections.

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 34, left: 0, right: 0 }),
  SafeAreaView: ({ edges, ...props }: any) =>
    require("react").createElement(require("react-native").View, { ...props, testID: "safe" }),
}));

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { RegionSheet } from "@/components/guide/RegionSheet";
import { REGIONS_WITH_CONTENT } from "@/lib/guideContent";

const open = async (over: Record<string, unknown> = {}) => {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  const view = await render(<RegionSheet visible selected={null} onSelect={onSelect} onClose={onClose} {...over} />);
  return { view, onSelect, onClose };
};

describe("RegionSheet", () => {
  it("lists South Island first, then each region with sections, the current one ticked; a tap selects and closes", async () => {
    require("@blacksands/ui").__setWide(true, { width: 669, height: 951 });
    const region = REGIONS_WITH_CONTENT[0];
    const { view, onSelect, onClose } = await open({ selected: region.id });

    const rows = view.getAllByRole("button").filter((b: any) => b.props.accessibilityLabel !== "Close");
    expect(rows.map((b: any) => b.props.accessibilityLabel)).toEqual([
      "South Island",
      ...REGIONS_WITH_CONTENT.map((r) => r.label),
    ]);
    expect(rows.map((b: any) => b.props.accessibilityState.selected)).toEqual([
      false,
      ...REGIONS_WITH_CONTENT.map((r) => r.id === region.id),
    ]);

    await fireEvent.press(view.getByLabelText(region.label));
    expect(onSelect).toHaveBeenCalledWith(region.id);
    expect(onClose).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByLabelText("South Island"));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("is not shown on the phone, even when visible", async () => {
    const { view } = await open();
    expect(view.queryByLabelText("South Island")).toBeNull();
  });
});
