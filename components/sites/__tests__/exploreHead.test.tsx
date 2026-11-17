jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
let mockInset = 0;
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: mockInset, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/lib/tour/useTourTarget", () => ({
  useTourTarget: (id: string) => ({ ref: { current: null }, onLayout: () => {}, testID: "tour-target-" + id }),
}));

import React from "react";
import { fireEvent, render, within } from "@testing-library/react-native";

import { ExploreHead, EXPLORE_LIST } from "@/components/sites/ExploreHead";
import { tokens } from "@/lib/ui/tokens";

const base = {
  town: "Christchurch",
  onPickTown: jest.fn(),
  onGuide: jest.fn(),
  onSearch: jest.fn(),
  onSaved: jest.fn(),
  category: null,
  onOpenCategories: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockInset = 0;
});

describe("ExploreHead", () => {
  it("gives the list's widths for the tour", () => {
    expect(EXPLORE_LIST).toEqual({ upright: 268, sideways: 347 });
  });

  it("starts at the status bar's inset plus 16, or 32 with no inset", async () => {
    mockInset = 37;
    const upright = await render(<ExploreHead {...base} />);
    expect(upright.getByTestId("explore-head")).toHaveStyle({ paddingTop: 53, paddingHorizontal: 20, paddingBottom: 16 });
    mockInset = 0;
    const sideways = await render(<ExploreHead {...base} />);
    expect(sideways.getAllByTestId("explore-head").pop()).toHaveStyle({ paddingTop: 32 });
  });

  it("shows All with a chevron in a 40 tall pill when nothing is filtered", async () => {
    const view = await render(<ExploreHead {...base} />);

    const pill = view.getByLabelText("All, choose a category");
    expect(pill).toHaveStyle({ height: 40, borderRadius: 12, paddingLeft: 14, paddingRight: 12, borderWidth: 1.5 });
    expect(pill).toHaveStyle({ backgroundColor: "rgba(9,92,101,0.12)", borderColor: "#095C65" });
    expect(within(pill).getByText("All")).toHaveStyle({ fontSize: 17, fontWeight: "600" });
  });

  it("shows the category's icon and not its name, and names the category to VoiceOver", async () => {
    const view = await render(<ExploreHead {...base} category="Food" />);

    const pill = view.getByLabelText("Food & Drink, choose a category");
    expect(within(pill).queryByText("All")).toBeNull();
    expect(within(pill).queryByText("Food & Drink")).toBeNull();
  });

  it("opens the categories from the pill, and carries the browse target", async () => {
    const view = await render(<ExploreHead {...base} />);

    await fireEvent.press(view.getByLabelText("All, choose a category"));

    expect(base.onOpenCategories).toHaveBeenCalledTimes(1);
    expect(within(view.getByTestId("tour-target-browse")).getByLabelText("All, choose a category")).toBeTruthy();
  });

  it("has no pill when there is nothing to pick", async () => {
    const view = await render(<ExploreHead {...base} onOpenCategories={undefined} />);

    expect(view.queryByLabelText(/choose a category/)).toBeNull();
    expect(view.queryByTestId("tour-target-browse")).toBeNull();
  });

  it("has the guide, search and saved buttons, 44 taps, and the search as a close while open", async () => {
    const view = await render(<ExploreHead {...base} />);
    await fireEvent.press(view.getByLabelText("Travel guide"));
    await fireEvent.press(view.getByLabelText("Search places"));
    await fireEvent.press(view.getByLabelText("Saved places"));

    expect(base.onGuide).toHaveBeenCalled();
    expect(base.onSearch).toHaveBeenCalled();
    expect(base.onSaved).toHaveBeenCalled();
    expect(view.getByLabelText("Saved places")).toHaveStyle({ width: 44, height: 44 });
    expect(within(view.getByTestId("tour-target-guide")).getByLabelText("Travel guide")).toBeTruthy();

    const open = await render(<ExploreHead {...base} searchOpen />);
    expect(open.getByLabelText("Close search")).toBeTruthy();
  });

  it("names the town 26 bold in the town ink with the picker chevron, and targets it", async () => {
    const view = await render(<ExploreHead {...base} />);

    const town = view.getByText("Christchurch");
    expect(town).toHaveStyle({ fontSize: 26, fontWeight: "800", color: tokens.colors.townInk });
    expect(within(town).getByTestId("town-chevron")).toBeTruthy();
    expect(within(view.getByTestId("tour-target-town")).getByText("Christchurch")).toBeTruthy();
    await fireEvent.press(view.getByLabelText("Christchurch, choose a town"));
    expect(base.onPickTown).toHaveBeenCalled();
  });

  it("is a plain header with no chevron when there is no other town", async () => {
    const view = await render(<ExploreHead {...base} onPickTown={undefined} />);

    expect(view.getByRole("header")).toBeTruthy();
    expect(view.queryByTestId("town-chevron")).toBeNull();
  });
});
