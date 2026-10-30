// The trip step's picture: the real trip view, with a fixed two-day sample. A new user has
// no trip to point at, so this shows what they'll get. It fetches nothing of its own: the
// towns' pictures come from the place list Explore has already loaded.
jest.mock("@/lib/api", () => {
  throw new Error("the preview must not reach the network");
});
let mockLocations: object[] = [];
jest.mock("@/lib/hooksBag", () => ({ useAllLocations: () => ({ locations: mockLocations }) }));

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

  it("gives each day its town's picture, from the loaded place list", async () => {
    mockLocations = [
      { id: "a", area: "christchurch", featured: 5, imageThumbnailUrl: "https://img/botanic.webp" },
      { id: "b", area: "dunedin", featured: 5, imageThumbnailUrl: "https://img/st-clair.webp" },
    ];
    await render(<TourTripPreview />);

    expect(screen.getAllByTestId("day-image").map((i) => i.props.source.uri)).toEqual([
      "https://img/botanic.webp",
      "https://img/st-clair.webp",
    ]);
    expect(screen.queryByTestId("day-image-placeholder")).toBeNull();
  });

  it("keeps the empty picture until the list is in", async () => {
    mockLocations = [];
    await render(<TourTripPreview />);
    expect(screen.getAllByTestId("day-image-placeholder")).toHaveLength(2);
  });
});
