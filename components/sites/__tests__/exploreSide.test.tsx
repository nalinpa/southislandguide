jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/lib/tour/useTourTarget", () => ({
  useTourTarget: (id: string) => ({ ref: { current: null }, onLayout: () => {}, testID: "tour-target-" + id }),
}));

import React from "react";
import { act, fireEvent, render, within } from "@testing-library/react-native";

import { ExploreSide, EXPLORE_SIDE } from "@/components/sites/ExploreSide";

const cats = [
  { key: null, label: "All" },
  { key: "Food", label: "Food & Drink" },
];
const base = {
  town: "Christchurch",
  onPickTown: jest.fn(),
  onGuide: jest.fn(),
  onSearch: jest.fn(),
  onSaved: jest.fn(),
  categories: cats,
  selected: null,
  onSelect: jest.fn(),
};

describe("ExploreSide", () => {
  it("is 200 wide and holds the town, three buttons and the categories", async () => {
    const view = await render(<ExploreSide {...base} />);

    expect(EXPLORE_SIDE).toBe(200);
    expect(view.getByTestId("explore-side")).toHaveStyle({ width: 200 });
    for (const l of ["Travel guide", "Search places", "Saved places"]) expect(view.getByLabelText(l)).toBeTruthy();
    expect(view.getByText("Food & Drink")).toBeTruthy();
  });

  it("shrinks a long town to two lines with the chevron inside the town's text, after the name", async () => {
    const view = await render(<ExploreSide {...base} town="Aoraki / Mount Cook" />);

    const town = view.getByText("Aoraki / Mount Cook");
    expect(town.props.numberOfLines).toBe(2);
    expect(town).toHaveStyle({ fontSize: 26 });
    expect(within(town).getByTestId("town-chevron")).toBeTruthy();
    expect(town.children[0]).toBe("Aoraki / Mount Cook");
    expect((town.children[town.children.length - 1] as any).props.testID).toBe("town-chevron");
  });

  const lay = (view: any, town: string, lines: string[]) =>
    act(() => view.getByText(town).props.onTextLayout({ nativeEvent: { lines: lines.map((text) => ({ text })) } }));

  it("steps a word that would split down until it is whole on one line", async () => {
    const view = await render(<ExploreSide {...base} town="Queenstown" />);

    await lay(view, "Queenstown", ["Queenstow", "n ￼"]);
    expect(view.getByText("Queenstown")).toHaveStyle({ fontSize: 25 });
    await lay(view, "Queenstown", ["Queenstown ￼"]);
    expect(view.getByText("Queenstown")).toHaveStyle({ fontSize: 25 });
  });

  it("keeps Aoraki / Mount Cook on two whole-word lines, and steps the longest single word", async () => {
    const view = await render(<ExploreSide {...base} town="Aoraki / Mount Cook" />);
    await lay(view, "Aoraki / Mount Cook", ["Aoraki / Mount", "Cook ￼"]);
    expect(view.getByText("Aoraki / Mount Cook")).toHaveStyle({ fontSize: 26 });

    const long = await render(<ExploreSide {...base} town="Christchurch" />);
    await lay(long, "Christchurch", ["Christchurc", "h ￼"]);
    await lay(long, "Christchurch", ["Christchurch", "￼"]); // chevron alone on a line
    expect(long.getByText("Christchurch")).toHaveStyle({ fontSize: 24 });
  });

  it("stops at 18", async () => {
    const view = await render(<ExploreSide {...base} town="Christchurch" />);
    for (let i = 0; i < 12; i++) await lay(view, "Christchurch", ["Christchurc", "h"]);
    expect(view.getByText("Christchurch")).toHaveStyle({ fontSize: 18 });
  });

  it("has no chevron when there is only one town to show", async () => {
    const view = await render(<ExploreSide {...base} onPickTown={undefined} />);

    expect(view.queryByTestId("town-chevron")).toBeNull();
  });

  it("selects a category, marked in the selected colour", async () => {
    const view = await render(<ExploreSide {...base} selected="Food" />);

    expect(view.getByText("Food & Drink")).toHaveStyle({ fontWeight: "600" });
    await fireEvent.press(view.getByText("All"));
    expect(base.onSelect).toHaveBeenCalledWith(null);
  });

  it("registers the tour targets town, guide and browse", async () => {
    const view = await render(<ExploreSide {...base} />);

    expect(within(view.getByTestId("tour-target-town")).getByText("Christchurch")).toBeTruthy();
    expect(within(view.getByTestId("tour-target-guide")).getByLabelText("Travel guide")).toBeTruthy();
    expect(within(view.getByTestId("tour-target-browse")).getByText("All")).toBeTruthy();
  });
});
