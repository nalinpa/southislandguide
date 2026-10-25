// The tab strip under a TopBar. When the selected tab is off to the side, as when the guide
// opens on a region from Explore, the strip scrolls to show it: centred, but never past
// either end of the strip.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { TopBarTabs, tabScrollX } from "@/components/layout/TopBarTabs";

describe("tabScrollX", () => {
  it("centres a tab in the middle of the strip", () => {
    expect(tabScrollX({ x: 400, width: 100 }, 300, 1000)).toBe(300);
  });

  it("doesn't scroll back past the start for a tab near it", () => {
    expect(tabScrollX({ x: 16, width: 80 }, 300, 1000)).toBe(0);
  });

  it("doesn't scroll past the end for a tab near it", () => {
    expect(tabScrollX({ x: 900, width: 90 }, 300, 1000)).toBe(700);
  });

  it("doesn't scroll a strip that fits on screen", () => {
    expect(tabScrollX({ x: 200, width: 80 }, 400, 350)).toBe(0);
  });
});

it("lays out and selects tabs as before", async () => {
  const onSelect = jest.fn();
  const view = await render(
    <TopBarTabs tabs={[{ key: null, label: "All" }, { key: "a", label: "Alpha" }]} selected="a" onSelect={onSelect} />,
  );

  await fireEvent(view.getByText("Alpha"), "layout", { nativeEvent: { layout: { x: 60, y: 0, width: 50, height: 20 } } });
  await fireEvent.press(view.getByText("All"));

  expect(onSelect).toHaveBeenCalledWith(null);
});
