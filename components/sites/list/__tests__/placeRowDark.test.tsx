// The chosen row in dark. Tests read a paired colour as its light side (test/lightColors.js);
// here the dark side is read instead, before the colours are first loaded.
jest.mock("@blacksands/hooks", () => ({ formatDistanceMeters: (m: number) => m + " m" }));

import React from "react";
import { render } from "@testing-library/react-native";

describe("PlaceRow in dark", () => {
  it("is chosen with the dark fill, its 1 pt edge and the light teal bar", async () => {
    Object.defineProperty(require("react-native"), "DynamicColorIOS", {
      configurable: true,
      value: ({ dark }: { dark: string }) => dark,
    });
    const { PlaceRow } = require("@/components/sites/list/PlaceRow");

    const view = await render(<PlaceRow id="a" name="Sumner Beach" onPress={jest.fn()} selected />);

    expect(view.getByTestId("row-fill")).toHaveStyle({
      backgroundColor: "rgba(127,208,214,0.30)",
      borderWidth: 1,
      borderColor: "rgba(127,208,214,0.55)",
    });
    expect(view.getByTestId("row-bar")).toHaveStyle({ backgroundColor: "#7FD0D6" });
    expect(view.getByText("Sumner Beach")).toHaveStyle({ color: "#7FD0D6" });
  });
});
