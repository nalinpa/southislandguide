// The trip step's picture: the real trip view, with a fixed two-day sample. A new user has
// no trip to point at, so this shows what they'll get, and needs nothing from the network.
jest.mock("@/lib/api", () => {
  throw new Error("the preview must not reach the network");
});

import React from "react";
import { render, screen } from "@testing-library/react-native";

import { TourTripPreview } from "@/lib/tour/TourTripPreview";

describe("TourTripPreview", () => {
  it("shows a Christchurch day, then a Dunedin day that opens with the drive", async () => {
    await render(<TourTripPreview />);

    expect(screen.getByText("Day 1 · Sat 14 Feb")).toBeTruthy();
    expect(screen.getByText("Christchurch")).toBeTruthy();
    expect(screen.getByText("4 places")).toBeTruthy();
    expect(screen.getByText("Day 2 · Sun 15 Feb")).toBeTruthy();
    expect(screen.getByText("Dunedin")).toBeTruthy();
    expect(screen.getAllByText("Starts with the drive from Christchurch")).toHaveLength(1);
  });
});
