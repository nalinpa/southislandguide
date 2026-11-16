jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
jest.mock("moti", () => ({ MotiView: require("react-native").View }));
jest.mock("@blacksands/hooks", () => ({ formatDistanceMeters: (m: number) => m + " m" }));
jest.mock("@shopify/flash-list", () => {
  const { View } = require("react-native");
  return { FlashList: (p: any) => require("react").createElement(
      View,
      { testID: "flash", numColumns: p.numColumns, contentContainerStyle: p.contentContainerStyle },
      require("react").createElement(p.ItemSeparatorComponent),
      p.renderItem({ item: p.data[0], index: 0 }),
    ),
  };
});

import React from "react";
import { render } from "@testing-library/react-native";

import { ListItem } from "@/components/sites/list/ListItem";
import { ListView } from "@/components/sites/list/ListView";

const wide = (size?: { width: number; height: number }) => require("@blacksands/ui").__setWide(true, size);
const props = { id: "a", name: "Sumner Beach", onPress: () => {}, index: 0 };
const photo = (view: any) => view.getByTestId("list-photo");

describe("ListItem on the Duo", () => {
  it("is 160 high on a phone, and the featured one 204", async () => {
    expect(photo(await render(<ListItem {...props} />))).toHaveStyle({ height: 160 });
    expect(photo(await render(<ListItem {...props} featured />))).toHaveStyle({ height: 204 });
  });

  it("has a 190 photo upright, 130 sideways, the featured card the same", async () => {
    wide({ width: 669, height: 951 });
    expect(photo(await render(<ListItem {...props} wide />))).toHaveStyle({ height: 190 });
    expect(photo(await render(<ListItem {...props} wide featured />))).toHaveStyle({ height: 190 });
    wide({ width: 951, height: 669 });
    expect(photo(await render(<ListItem {...props} wide featured />))).toHaveStyle({ height: 130 });
  });

  it("names a place 18 bold up to two lines", async () => {
    wide();
    const view = await render(<ListItem {...props} wide />);
    const name = view.getByText("Sumner Beach");
    expect(name.props.numberOfLines).toBe(2);
    expect(name).toHaveStyle({ fontSize: 18, fontWeight: "700" });
  });
});

describe("ListView on the Duo", () => {
  const rows = [1, 2].map((n) => ({
    location: { id: "p" + n, name: "P" + n, category: ["Food"] },
    distanceMeters: null,
  })) as any;

  it("is one column upright, two sideways, one on a phone", async () => {
    const cols = async () => (await render(<ListView rows={rows} onPressItem={() => {}} />)).getByTestId("flash").props.numColumns;
    expect(await cols()).toBe(1);
    wide({ width: 669, height: 951 });
    expect(await cols()).toBe(1);
    wide({ width: 951, height: 669 });
    expect(await cols()).toBe(2);
  });

  it("spaces rows 32 apart and columns 24 on the Duo, the edges staying 20; a phone keeps 24", async () => {
    const view = async () => render(<ListView rows={rows} onPressItem={() => {}} />);
    expect((await view()).getByTestId("list-separator")).toHaveStyle({ height: 24 });
    wide({ width: 669, height: 951 });
    expect((await view()).getByTestId("list-separator")).toHaveStyle({ height: 32 });
    wide({ width: 951, height: 669 });
    const two = await view();
    expect(two.getByTestId("list-separator")).toHaveStyle({ height: 32 });
    expect(two.getByTestId("list-gutter")).toHaveStyle({ paddingHorizontal: 12 });
    expect(two.getByTestId("flash").props.contentContainerStyle).toMatchObject({ paddingHorizontal: 8 });
  });
});
