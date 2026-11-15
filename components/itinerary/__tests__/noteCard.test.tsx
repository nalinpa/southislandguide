// A read-only note popover. The one non-obvious behaviour is that it keeps rendering the
// last note while the modal fades out, instead of blanking mid-animation.

import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { NoteCard } from "@/components/itinerary/NoteCard";
import type { ItineraryItem } from "@/lib/models";

// The first ancestor of a node whose flattened style sets `key`.
const styleUp = (node: any, key: string) => {
  for (let n = node; n; n = n.parent) {
    const v = (StyleSheet.flatten(n.props?.style) as any)?.[key];
    if (v !== undefined) return v;
  }
  return undefined;
};
const wide = (size = { width: 669, height: 951 }) => require("@blacksands/ui").__setWide(true, size);

const item = {
  id: "item-1",
  siteId: "site-1",
  siteName: "Wai-O-Tapu",
  slotIndex: 4,
  durationSlots: 2,
  note: "Buy tickets before 10:15 for the geyser.",
} as ItineraryItem;

const onClose = jest.fn();

beforeEach(() => jest.clearAllMocks());

it("shows the note and the site it belongs to", async () => {
  const view = await render(<NoteCard item={item} onClose={onClose} />);

  expect(view.getByText("Wai-O-Tapu")).toBeTruthy();
  expect(view.getByText("Buy tickets before 10:15 for the geyser.")).toBeTruthy();
  expect(view.getByText("Tap anywhere to close")).toBeTruthy();
});

it("closes on a tap anywhere on the overlay", async () => {
  const view = await render(<NoteCard item={item} onClose={onClose} />);

  await fireEvent.press(view.getByLabelText("Close note"));

  expect(onClose).toHaveBeenCalledTimes(1);
});

// React Native's Modal unmounts its children as soon as `visible` goes false under jest,
// so the retained-while-fading behaviour (the `shown` ref) has nothing to assert against
// here — it only shows up in a real fade-out animation.
test.todo("keeps the note on screen while the modal fades out");

it("wide: a 400 dialog", async () => {
  wide();
  const view = await render(<NoteCard item={item} onClose={jest.fn()} />);
  expect(styleUp(view.getByText("Tap anywhere to close"), "width")).toBe(400);
});
