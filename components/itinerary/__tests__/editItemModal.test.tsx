// Editing one stop: duration, note, move-to-another-day, remove. The premium-unlock path
// out of this same modal is covered in premiumUnlockFromModal.test.tsx and is not repeated
// here.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { Image: (props: any) => React.createElement(View, props) };
});

const mockIap = { error: null as { productId: string; message: string } | null };
jest.mock("@/lib/iap/PurchaseProvider", () => ({ usePurchaseContext: () => mockIap }));

jest.mock("@/lib/hooksBag", () => ({
  hooksBag: { useLocation: () => ({ location: null }) },
}));

const mockRouter = { push: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

import React from "react";
import { Alert, InteractionManager } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { EditItemModal } from "@/components/itinerary/EditItemModal";
import { PLANNER } from "@/lib/constants/gameplay";
import type { ItineraryItem } from "@/lib/models";

const item = {
  id: "item-1",
  siteId: "site-1",
  siteName: "Wai-O-Tapu",
  slotIndex: 4,
  durationSlots: 2,
} as ItineraryItem;

const handlers = { onClose: jest.fn(), onSave: jest.fn(), onRemove: jest.fn(), onMoveDay: jest.fn() };

const days = [
  { id: "day-1", label: "Day 1" },
  { id: "day-2", label: "Day 2" },
  { id: "day-3", label: "Day 3", full: true },
];

const open = (over: Record<string, unknown> = {}) =>
  render(<EditItemModal item={item} currentDayId="day-1" availableDays={days} {...handlers} {...(over as any)} />);

let alertSpy: jest.SpyInstance;
let interactionSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockIap.error = null;
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  // Runs the queued navigation straight away instead of waiting for a real frame.
  interactionSpy = jest
    .spyOn(InteractionManager, "runAfterInteractions")
    .mockImplementation(((cb: any) => {
      cb();
      return { then: () => {}, done: () => {}, cancel: () => {} };
    }) as never);
});

afterEach(() => {
  alertSpy.mockRestore();
  interactionSpy.mockRestore();
});

describe("what it shows", () => {
  it("renders nothing without an item", async () => {
    const view = await render(<EditItemModal item={null} currentDayId="day-1" availableDays={days} {...handlers} />);
    expect(view.queryByText("Save Changes")).toBeNull();
  });

  it("opens on the stop's own name and current duration", async () => {
    const view = await open();
    expect(view.getByText("Wai-O-Tapu")).toBeTruthy();
    expect(view.getByText("1 Hour")).toBeTruthy();
  });

  it("starts from the note already on the stop", async () => {
    const view = await open({ item: { ...item, note: "Tickets before 10:15" } });
    expect(view.getByDisplayValue("Tickets before 10:15")).toBeTruthy();
  });
});

// The +/- steppers are icon-only with no accessibilityLabel, so there is no accessible
// name to query them by. They are the two taps either side of the duration readout, so
// that readout is what anchors the query.
const stepper = (view: any, label: string) => {
  const row = view.getByText(label).parent;
  const kids = row.children.filter((c: any) => typeof c !== "string");
  return { minus: kids[0], plus: kids[kids.length - 1] };
};

describe("duration", () => {
  it("saves a lengthened visit", async () => {
    const view = await open();

    await fireEvent.press(stepper(view, "1 Hour").plus);
    await fireEvent.press(view.getByText("Save Changes"));

    expect(handlers.onSave).toHaveBeenCalledWith("item-1", 3, "");
  });

  it("won't go below half an hour", async () => {
    const view = await open({ item: { ...item, durationSlots: 1 } });

    // The minus button, pressed twice, must not take it under one slot.
    await fireEvent.press(stepper(view, "0.5 Hours").minus);
    await fireEvent.press(stepper(view, "0.5 Hours").minus);
    await fireEvent.press(view.getByText("Save Changes"));

    expect(handlers.onSave).toHaveBeenCalledWith("item-1", 1, "");
  });

  it("won't exceed the day's grid", async () => {
    const view = await open({ item: { ...item, durationSlots: PLANNER.MAX_GRID_SLOTS } });

    await fireEvent.press(stepper(view, PLANNER.MAX_GRID_SLOTS / 2 + " Hours").plus);
    await fireEvent.press(view.getByText("Save Changes"));

    expect(handlers.onSave).toHaveBeenCalledWith("item-1", PLANNER.MAX_GRID_SLOTS, "");
  });
});

describe("note", () => {
  it("saves a trimmed note alongside the duration", async () => {
    const view = await open();

    await fireEvent.changeText(view.getByPlaceholderText("Add a note for this stop (optional)"), "  Park early  ");
    await fireEvent.press(view.getByText("Save Changes"));

    expect(handlers.onSave).toHaveBeenCalledWith("item-1", 2, "Park early");
  });

  it("caps the note rather than letting it grow unbounded", async () => {
    const view = await open();
    const input = view.getByPlaceholderText("Add a note for this stop (optional)");

    await fireEvent.changeText(input, "x".repeat(400));
    await fireEvent.press(view.getByText("Save Changes"));

    expect(handlers.onSave.mock.calls[0][2]).toHaveLength(280);
  });
});

describe("moving to another day", () => {
  it("offers the other days, but not the current one", async () => {
    const view = await open();
    expect(view.getByText("Day 2")).toBeTruthy();
    expect(view.queryByText("Day 1")).toBeNull();
  });

  it("leaves out a day with no room in it", async () => {
    const view = await open();
    expect(view.queryByText("Day 3")).toBeNull();
  });

  it("hides the whole section when there is nowhere else to go", async () => {
    const view = await open({ availableDays: [{ id: "day-1", label: "Day 1" }] });
    expect(view.queryByText("Move to another day?")).toBeNull();
  });

  it("saves the pending edits before moving, so they aren't lost with the move", async () => {
    const view = await open();

    await fireEvent.changeText(view.getByPlaceholderText("Add a note for this stop (optional)"), "Moved note");
    await fireEvent.press(view.getByText("Day 2"));

    expect(handlers.onSave).toHaveBeenCalledWith("item-1", 2, "Moved note");
    expect(handlers.onMoveDay).toHaveBeenCalledWith("item-1", "day-2");
  });

  it("ignores a second tap, so one stop can't be moved twice", async () => {
    const view = await open();

    await fireEvent.press(view.getByText("Day 2"));
    await fireEvent.press(view.getByText("Day 2"));

    expect(handlers.onMoveDay).toHaveBeenCalledTimes(1);
  });
});

describe("removing", () => {
  it("confirms before removing anything", async () => {
    const view = await open();

    await fireEvent.press(view.getByText("Remove from Trip"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Remove from Trip",
      "Remove Wai-O-Tapu from your itinerary?",
      expect.any(Array),
    );
    expect(handlers.onRemove).not.toHaveBeenCalled();
  });

  it("removes once the confirm is taken", async () => {
    const view = await open();
    await fireEvent.press(view.getByText("Remove from Trip"));

    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === "Remove")?.onPress?.();

    expect(handlers.onRemove).toHaveBeenCalledWith("item-1");
  });
});

describe("details link", () => {
  it("closes first, then opens the site — a push during dismissal is dropped on iOS", async () => {
    const view = await open();

    await fireEvent.press(view.getByText("Details"));

    expect(handlers.onClose).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/sites/site-1");
  });

  it("trims a padded site id rather than routing to a 404", async () => {
    const view = await open({ item: { ...item, siteId: " site-1 " } });

    await fireEvent.press(view.getByText("Details"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/sites/site-1");
  });
});
