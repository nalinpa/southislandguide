// A row in the Explore list. What matters visually: the distance is the row's one piece
// of live, personal information, so it carries the highlight colour, and the description
// is set in strong secondary text rather than hint grey.

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
import { fireEvent, render } from "@testing-library/react-native";

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
  it("shows the distance in the highlight colour", async () => {
    const { view } = renderItem();
    expect((await view).getByText("1.2 km")).toHaveStyle({ color: tokens.colors.highlight });
  });

  it("leaves the distance out when it isn't known", async () => {
    const { view } = renderItem({ distanceMeters: null });
    expect((await view).queryByText(/km$/)).toBeNull();
  });

  it("sets the description in strong secondary text", async () => {
    const { view } = renderItem();
    expect((await view).getByText("A long, open surf beach.")).toHaveStyle({ color: tokens.colors.text2 });
  });

  // iOS clips a view's shadow when the same view has overflow: "hidden", which is how the
  // cards ended up flat against the page.
  it("lifts the card off the page with a shadow it doesn't clip", async () => {
    const { view } = renderItem();
    const card = (await view).getByRole("button");

    expect(StyleSheet.flatten(card.props.style).shadowOpacity).toBeGreaterThanOrEqual(0.1);
    expect(card).not.toHaveStyle({ overflow: "hidden" });
  });

  it("opens the place when tapped", async () => {
    const { view, onPress } = renderItem();
    await fireEvent.press((await view).getByText("Sumner Beach"));
    expect(onPress).toHaveBeenCalledWith("s1");
  });
});
