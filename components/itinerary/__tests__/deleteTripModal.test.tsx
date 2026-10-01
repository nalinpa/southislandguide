// The destructive confirm that replaced Alert.alert for trip deletion. Its whole job is
// not deleting until the user says so, and naming what they are about to lose.

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { DeleteTripModal } from "@/components/itinerary/DeleteTripModal";

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
