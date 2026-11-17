// A place in the Explore list, in the design sweep's look (docs/plans/design-sweep.md):
// the photo first with the words under it, no card and no shadow. The distance is a fact,
// so it is plain text: colour is kept for what's selected and what to tap. The description
// is set in strong secondary text rather than hint grey, and ends where a sentence does.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("moti", () => {
  const { View } = require("react-native");
  return { MotiView: View };
});

jest.mock("@blacksands/hooks", () => ({
  formatDistanceMeters: (m: number) => (m / 1000).toFixed(1) + " km",
}));

jest.mock("@/lib/categoryImages", () => ({ siteImage: () => null }));

import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render, within } from "@testing-library/react-native";

import { ListItem } from "@/components/sites/list/ListItem";
import { tokens } from "@/lib/ui/tokens";

const renderItem = (over: Record<string, unknown> = {}) => {
  const onPress = jest.fn();
  const view = render(
    <ListItem
      id="s1"
      name="Sumner Beach"
      description="A long, open surf beach."
      distanceMeters={1200}
      onPress={onPress}
      index={0}
      {...over}
    />,
  );
  return { view, onPress };
};

describe("ListItem", () => {
  it("shows the distance in plain text, not the highlight colour", async () => {
    const { view } = renderItem();
    expect((await view).getByText("1.2 km")).toHaveStyle({ color: tokens.colors.text });
  });

  it("leaves the distance out when it isn't known", async () => {
    const { view } = renderItem({ distanceMeters: null });
    expect((await view).queryByText(/km$/)).toBeNull();
  });

  // For a list that spans towns (saved places). The town is where the place is, not a
  // live fact about the user, so it stays out of the highlight.
  it("names the town before the distance when it is given one", async () => {
    const { view } = renderItem({ area: "Dunedin" });

    expect((await view).getByText("Dunedin")).toHaveStyle({ color: tokens.colors.text2 });
    expect((await view).getByText("1.2 km")).toBeTruthy();
  });

  it("names the town with no distance beside it when the distance isn't known", async () => {
    const { view } = renderItem({ area: "Dunedin", distanceMeters: null });

    expect((await view).getByText("Dunedin")).toBeTruthy();
    expect((await view).queryByText(/km$/)).toBeNull();
  });

  it("sets the description in strong secondary text", async () => {
    const { view } = renderItem();
    expect((await view).getByText("A long, open surf beach.")).toHaveStyle({ color: tokens.colors.text2 });
  });

  it("ends the description where its first sentence does", async () => {
    const { view } = renderItem({ description: "A long, open surf beach. Good for beginners at low tide." });

    expect((await view).getByText("A long, open surf beach.")).toBeTruthy();
  });

  // Words on the page, not on a card: no shadow. The row keeps the page's own colour so
  // Saved Places can swipe it aside over its Remove button.
  it("sits on the page with no shadow", async () => {
    const { view } = renderItem();
    const card = StyleSheet.flatten((await view).getByRole("button").props.style);

    expect(card.shadowOpacity).toBeUndefined();
    expect(card.backgroundColor).toBe(tokens.colors.page);
  });

  // The featured card at the top of Explore is this card with a taller photo, announced
  // by the place's name as it always was.
  it("is the same card when featured, named for a screen reader", async () => {
    const { view } = renderItem({ featured: true });

    expect((await view).getByTestId("featured-card").props.accessibilityLabel).toBe("Sumner Beach");
    expect((await view).getByText("1.2 km")).toBeTruthy();
  });

  it("opens the place when tapped", async () => {
    const { view, onPress } = renderItem();
    await fireEvent.press((await view).getByText("Sumner Beach"));
    expect(onPress).toHaveBeenCalledWith("s1");
  });

  it("marks a place in the trip with a badge on the photo's top-left corner", async () => {
    const { view } = renderItem({ inTrip: true });
    const badge = (await view).getByTestId("in-trip-badge");

    expect(within((await view).getByTestId("list-photo")).getByText("In trip")).toHaveStyle({ fontSize: 12, fontWeight: "600", color: "#FFFFFF" });
    expect(badge).toHaveStyle({ position: "absolute", top: 8, left: 8, backgroundColor: tokens.colors.success, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 });
  });

  it("has no badge when the place is not in the trip", async () => {
    const { view } = renderItem();
    expect((await view).queryByText("In trip")).toBeNull();
  });
});
