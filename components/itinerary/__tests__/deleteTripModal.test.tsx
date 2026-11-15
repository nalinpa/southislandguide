// The destructive confirm that replaced Alert.alert for trip deletion. Its whole job is
// not deleting until the user says so, and naming what they are about to lose.

import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { DeleteTripModal } from "@/components/itinerary/DeleteTripModal";

// The first ancestor of a node whose flattened style sets `key`.
const styleUp = (node: any, key: string) => {
  for (let n = node; n; n = n.parent) {
    const v = (StyleSheet.flatten(n.props?.style) as any)?.[key];
    if (v !== undefined) return v;
  }
  return undefined;
};
const wide = (size = { width: 669, height: 951 }) => require("@blacksands/ui").__setWide(true, size);

const props = { tripTitle: "Hot Pools Weekend", onCancel: jest.fn(), onConfirm: jest.fn() };

beforeEach(() => jest.clearAllMocks());

it("stays out of the way until it is asked for", async () => {
  const view = await render(<DeleteTripModal visible={false} {...props} />);
  expect(view.queryByText("Delete Hot Pools Weekend?")).toBeNull();
});

it("names the trip and warns that this can't be undone", async () => {
  const view = await render(<DeleteTripModal visible {...props} />);

  expect(view.getByText("Delete Hot Pools Weekend?")).toBeTruthy();
  expect(view.getByText(/cannot be undone/)).toBeTruthy();
});

it("deletes only when the destructive button is the one pressed", async () => {
  const view = await render(<DeleteTripModal visible {...props} />);

  await fireEvent.press(view.getByText("Delete Trip"));

  expect(props.onConfirm).toHaveBeenCalledTimes(1);
  expect(props.onCancel).not.toHaveBeenCalled();
});

it("backs out without deleting", async () => {
  const view = await render(<DeleteTripModal visible {...props} />);

  await fireEvent.press(view.getByText("Cancel"));

  expect(props.onCancel).toHaveBeenCalledTimes(1);
  expect(props.onConfirm).not.toHaveBeenCalled();
});

it("wide: a 400 dialog with its foot above the fold", async () => {
  wide();
  const view = await render(<DeleteTripModal visible {...props} />);
  const title = view.getByText("Delete Hot Pools Weekend?");
  expect(styleUp(title, "width")).toBe(400);
  expect(styleUp(title, "paddingBottom")).toBe(951 - 475.5 + 24);
});
