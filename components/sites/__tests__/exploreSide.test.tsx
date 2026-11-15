jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/lib/tour/useTourTarget", () => ({
  useTourTarget: (id: string) => ({ ref: { current: null }, onLayout: () => {}, testID: "tour-target-" + id }),
}));

import React from "react";
import { fireEvent, render, within } from "@testing-library/react-native";

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
    expect(town.props.adjustsFontSizeToFit).toBe(true);
    expect(town.props.minimumFontScale).toBeCloseTo(22 / 26);
    expect(within(town).getByTestId("town-chevron")).toBeTruthy();
    expect(town.children[0]).toBe("Aoraki / Mount Cook");
    expect((town.children[town.children.length - 1] as any).props.testID).toBe("town-chevron");
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
