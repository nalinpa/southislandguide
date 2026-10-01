// The off-screen card that gets rasterised into the share image. It has no interaction —
// what matters is that the text baked into the picture is right, that its overlay follows
// the palette, and that it reports when the photo has loaded (the screen won't capture
// before that). south-island's card says "South Island" / "South Island Guide" and derives
// the gradient from tokens.colors.text rather than rotorua-guide's hard-coded brown.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

const mockGradients: string[][] = [];
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LinearGradient: ({ children, style, colors }: any) => {
      mockGradients.push(colors);
      return React.createElement(View, { style }, children);
    },
  };
});

import React from "react";
import { render } from "@testing-library/react-native";

import { CaptureCanvas } from "@/components/share/CaptureCanvas";
import { tokens } from "@/lib/ui/tokens";

// The photo is a plain react-native Image with no label or testID, so the only way to reach
// it is to find the one element carrying an onLoad.
const findOnLoad = (node: any): ((...args: any[]) => void) | null => {
  if (!node || typeof node === "string") return null;
  if (node.props?.onLoad) return node.props.onLoad;
  for (const child of node.children ?? []) {
    const found = findOnLoad(child);
    if (found) return found;
  }
  return null;
};

const payload = { siteId: "site-1", siteName: "Sumner Beach", dateLabel: "Sep 2026" };

beforeEach(() => {
  mockGradients.length = 0;
});

it("bakes the place, the region and the date into the card", async () => {
  const view = await render(<CaptureCanvas payload={payload} photoUri="file:///photo.jpg" />);

  expect(view.getByText("Sumner Beach")).toBeTruthy();
  expect(view.getByText("South Island")).toBeTruthy();
  expect(view.getByText("Sep 2026")).toBeTruthy();
  expect(view.getByText("South Island Guide")).toBeTruthy();
});

it("never carries rotorua-guide's branding", async () => {
  const view = await render(<CaptureCanvas payload={payload} photoUri="file:///photo.jpg" />);

  expect(view.queryByText(/Rotorua/)).toBeNull();
});

it("fades the top overlay from the palette's text colour to transparent", async () => {
  await render(<CaptureCanvas payload={payload} photoUri="file:///photo.jpg" />);

  const hex = tokens.colors.text;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  expect(mockGradients).toContainEqual([`rgba(${r},${g},${b},0.92)`, `rgba(${r},${g},${b},0.6)`, "transparent"]);
});

it("still renders its frame with no photo yet", async () => {
  const onImageLoad = jest.fn();
  const view = await render(<CaptureCanvas payload={payload} photoUri={null} onImageLoad={onImageLoad} />);

  expect(view.getByText("Sumner Beach")).toBeTruthy();
  // No photo, so there is no image to report a load — the screen is never told to capture
  // an empty frame.
  expect(findOnLoad(view.root)).toBeNull();
  expect(onImageLoad).not.toHaveBeenCalled();
});

it("reports the photo loading, which is what unblocks the capture", async () => {
  const onImageLoad = jest.fn();
  const view = await render(
    <CaptureCanvas payload={payload} photoUri="file:///photo.jpg" onImageLoad={onImageLoad} />,
  );

  findOnLoad(view.root)!();

  expect(onImageLoad).toHaveBeenCalledTimes(1);
});
