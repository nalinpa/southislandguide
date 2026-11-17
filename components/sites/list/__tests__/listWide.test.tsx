jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
jest.mock("moti", () => ({ MotiView: require("react-native").View }));
jest.mock("@blacksands/hooks", () => ({ formatDistanceMeters: (m: number) => m + " m" }));

import React from "react";
import { render } from "@testing-library/react-native";

import { ListItem } from "@/components/sites/list/ListItem";

const wide = (size?: { width: number; height: number }) => require("@blacksands/ui").__setWide(true, size);
const props = { id: "a", name: "Sumner Beach", onPress: () => {}, index: 0 };
const photo = (view: any) => view.getByTestId("list-photo");

describe("ListItem on the Duo", () => {
  it("is 160 high on a phone, and the featured one 204", async () => {
    expect(photo(await render(<ListItem {...props} />))).toHaveStyle({ height: 160 });
    expect(photo(await render(<ListItem {...props} featured />))).toHaveStyle({ height: 204 });
  });

  it("has a 190 photo upright, 130 sideways", async () => {
    wide({ width: 669, height: 951 });
    expect(photo(await render(<ListItem {...props} wide />))).toHaveStyle({ height: 190 });
    wide({ width: 951, height: 669 });
    expect(photo(await render(<ListItem {...props} wide />))).toHaveStyle({ height: 130 });
  });

  it("names a place 18 bold up to two lines", async () => {
    wide();
    const view = await render(<ListItem {...props} wide />);
    const name = view.getByText("Sumner Beach");
    expect(name.props.numberOfLines).toBe(2);
    expect(name).toHaveStyle({ fontSize: 18, fontWeight: "700" });
  });
});
