jest.mock("@blacksands/hooks", () => ({ formatDistanceMeters: (m: number) => (m / 1000).toFixed(1) + " km" }));

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { PlaceRow } from "@/components/sites/list/PlaceRow";
import { tokens } from "@/lib/ui/tokens";

const props = { id: "a", name: "Sumner Beach", category: "Water" as const, distanceMeters: 1200, onPress: jest.fn() };

describe("PlaceRow", () => {
  it("is a 48 photo, the name up to two lines, and 'category · distance' under it", async () => {
    const view = await render(<PlaceRow {...props} imageUrl="https://img/a.webp" />);

    const name = view.getByText("Sumner Beach");
    expect(name.props.numberOfLines).toBe(2);
    expect(name).toHaveStyle({ fontSize: 16, lineHeight: 21, fontWeight: "600", color: tokens.colors.text });
    expect(view.getByText("Water · 1.2 km")).toHaveStyle({ fontSize: 15, lineHeight: 20, color: tokens.colors.text2 });
    expect(view.getByTestId("row-image")).toHaveProp("source", { uri: "https://img/a.webp" });
    expect(view.getByTestId("row-photo")).toHaveStyle({ width: 48, height: 48, borderRadius: 10 });
    expect(view.getByRole("button")).toHaveStyle({ minHeight: 48, paddingTop: 8, paddingBottom: 8, paddingLeft: 14, paddingRight: 6 });
  });

  it("names the category alone when there is no distance, and the distance alone with no category", async () => {
    const a = await render(<PlaceRow {...props} distanceMeters={null} />);
    expect(a.getByText("Water")).toBeTruthy();
    const b = await render(<PlaceRow {...props} category={null} />);
    expect(b.getByText("1.2 km")).toBeTruthy();
  });

  it("shows a default photo when the place has none", async () => {
    const view = await render(<PlaceRow {...props} />);

    expect(view.getByTestId("row-image")).toBeTruthy();
  });

  it("is a button that says whether it is chosen, and passes its id", async () => {
    const onPress = jest.fn();
    const view = await render(<PlaceRow {...props} onPress={onPress} />);

    expect(view.getByRole("button")).toHaveProp("accessibilityState", { selected: false });
    await fireEvent.press(view.getByRole("button"));
    expect(onPress).toHaveBeenCalledWith("a");
  });

  it("has no fill or bar until chosen; chosen it has the fill, the 4 wide bar and the name in teal", async () => {
    const plain = await render(<PlaceRow {...props} />);
    expect(plain.queryByTestId("row-fill")).toBeNull();
    expect(plain.queryByTestId("row-bar")).toBeNull();

    const view = await render(<PlaceRow {...props} selected />);
    expect(view.getByRole("button")).toHaveProp("accessibilityState", { selected: true });
    expect(view.getByTestId("row-fill")).toHaveStyle({
      borderRadius: 12,
      backgroundColor: tokens.colors.selFill,
      borderColor: tokens.colors.selEdgeDark,
      borderWidth: 1,
    });
    expect(view.getByTestId("row-bar")).toHaveStyle({
      width: 4,
      borderRadius: 2,
      left: 4,
      top: 8,
      bottom: 8,
      backgroundColor: tokens.colors.selected,
    });
    expect(view.getByText("Sumner Beach")).toHaveStyle({ color: tokens.colors.selected });
  });

  it("marks a place in the trip with a badge beside the meta line, the name untouched", async () => {
    const view = await render(<PlaceRow {...props} inTrip />);

    expect(view.getByText("In trip")).toHaveStyle({ fontSize: 12, color: "#FFFFFF" });
    expect(view.getByTestId("in-trip-badge")).toHaveStyle({ backgroundColor: tokens.colors.success });
    expect(view.getByText("Sumner Beach").props.numberOfLines).toBe(2);
    const none = await render(<PlaceRow {...props} />);
    expect(none.queryByText("In trip")).toBeNull();
  });
});
