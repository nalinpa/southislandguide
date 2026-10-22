// Creating a trip. The matrix rows this pins down: a locked user defaults to a free
// template and cannot submit Blank, the day stepper is theirs only when unlocked, and a
// date range overlapping an existing trip is refused — both before the request (local
// check) and after it (the api's 409).

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

// The date picker is a third-party calendar with its own timezone quirks; the screen's
// own Day override is what reads a tap, and none of that is what these tests assert.
jest.mock("react-native-ui-datepicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { __esModule: true, default: () => React.createElement(View, null) };
});

jest.mock("expo-crypto", () => ({ randomUUID: () => "uuid-fixed" }));

const mockNet = { isConnected: true as boolean | null, isInternetReachable: true as boolean | null };
jest.mock("@react-native-community/netinfo", () => ({ useNetInfo: () => mockNet }));

const mockTrips = {
  itineraries: [] as any[],
  saveItinerary: jest.fn(),
  isSaving: false,
};
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));

import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ApiError } from "@blacksands/client";

import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";
import { ITINERARY_TEMPLATES, defaultTemplateKey } from "@/lib/itineraryTemplates";
import { areaName } from "@/lib/areas";

// Every template is free at launch, so the rotorua-guide cases that need a
// PREMIUM template stay parked until paid templates exist (release 1.4).
const freeTemplate = ITINERARY_TEMPLATES.find((t) => t.free)!;
const PREMIUM_1_4 = "(release 1.4: needs a premium template)";

const props = { onClose: jest.fn(), onCreated: jest.fn() };

const openModal = (over: Record<string, unknown> = {}) =>
  render(<CreateItineraryModal visible {...props} {...(over as any)} />);

beforeEach(() => {
  jest.clearAllMocks();
  mockNet.isConnected = true;
  mockNet.isInternetReachable = true;
  mockTrips.itineraries = [];
  mockTrips.isSaving = false;
  mockTrips.saveItinerary = jest.fn().mockResolvedValue("trip-new");
});

describe("what a locked user is offered", () => {
  it("says up front that customizing is premium", async () => {
    const view = await openModal({ locked: true, showTemplateOption: true });
    expect(view.getByText("Premium — unlock to customize your trip")).toBeTruthy();
  });

  it("preselects a free template rather than Blank", async () => {
    const view = await openModal({ locked: true, showTemplateOption: true });
    expect(view.getByText(freeTemplate.label)).toBeTruthy();
    expect(defaultTemplateKey(true)).toBe(freeTemplate.key);
  });

  it("leaves an unlocked user on Blank", async () => {
    const view = await openModal({ showTemplateOption: true });
    expect(view.getByText("Blank")).toBeTruthy();
    expect(defaultTemplateKey(false)).toBeNull();
  });

  it.todo("marks the premium templates and Blank as premium in the picker " + PREMIUM_1_4);
  it.todo("refuses to select a premium template " + PREMIUM_1_4);

  it("blocks a blank trip with an explanation instead of creating one", async () => {
    const view = await openModal({ locked: true, showTemplateOption: false });

    await fireEvent.press(view.getByText("Create Trip"));

    await waitFor(() => expect(view.getByText("Premium — unlock to start a blank trip.")).toBeTruthy());
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
  });

  it("hides the day stepper while a template is selected", async () => {
    const view = await openModal({ locked: true, showTemplateOption: true });
    expect(view.queryByText("1 day")).toBeNull();
    expect(view.queryByText("3 days")).toBeNull();
  });
});

describe("creating a blank trip", () => {
  it("defaults to three days and a fallback title", async () => {
    const view = await openModal();
    expect(view.getByText("3 days")).toBeTruthy();

    await fireEvent.press(view.getByText("Create Trip"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const payload = mockTrips.saveItinerary.mock.calls[0][0];
    expect(payload.title).toBe("South Island Trip");
    expect(payload.days).toHaveLength(3);
  });

  // A South Island trip can run weeks. 60 days is what the api takes.
  it("lets a trip run up to 60 days, and no further", async () => {
    const view = await openModal();

    for (let i = 0; i < 60; i++) await fireEvent.press(view.getByLabelText("More days"));

    expect(view.getByText("60 days")).toBeTruthy();
  });

  it("goes down to one day, and no further", async () => {
    const view = await openModal();

    for (let i = 0; i < 3; i++) await fireEvent.press(view.getByLabelText("Fewer days"));

    expect(view.getByText("1 day")).toBeTruthy();
  });

  it("uses the name that was typed", async () => {
    const view = await openModal();

    await fireEvent.changeText(view.getByPlaceholderText("Optional — defaults to South Island Trip"), "  Hot Pools Weekend  ");
    await fireEvent.press(view.getByText("Create Trip"));

    await waitFor(() => expect(mockTrips.saveItinerary.mock.calls[0][0].title).toBe("Hot Pools Weekend"));
  });

  it("spans the trip's end date across the chosen number of days", async () => {
    const view = await openModal();

    await fireEvent.press(view.getByText("Create Trip"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const { startDate, endDate, days } = mockTrips.saveItinerary.mock.calls[0][0];
    expect(days[0].date).toBe(startDate);
    expect(days[days.length - 1].date).toBe(endDate);
  });

  it("hands the new trip's id back and closes", async () => {
    const view = await openModal();

    await fireEvent.press(view.getByText("Create Trip"));

    await waitFor(() => expect(props.onCreated).toHaveBeenCalledWith("trip-new"));
    expect(props.onClose).toHaveBeenCalled();
  });
});

describe("creating from a template", () => {
  it.each(ITINERARY_TEMPLATES.map((t) => [t.label, t] as const))(
    "%s: takes its length and its stops from the template, not the stepper",
    async (label, template) => {
      const view = await openModal({ showTemplateOption: true });

      await fireEvent.press(view.getByText(areaName(template.start)));
      await fireEvent.press(view.getByText("Blank"));
      await fireEvent.press(view.getByText(label));
      await fireEvent.press(view.getByText("Create Trip"));

      await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
      const payload = mockTrips.saveItinerary.mock.calls[0][0];
      expect(payload.days).toHaveLength(template.days.length);
      payload.days.forEach((day: any, i: number) => {
        expect(day.items.map((item: any) => item.siteName)).toEqual(template.days[i].items.map((item) => item.siteName));
      });
    },
  );

  // The first step picks the town; the list then holds only that town's trips.
  it("lists only the trips from the chosen town", async () => {
    const view = await openModal({ showTemplateOption: true });

    await fireEvent.press(view.getByText("Picton"));
    await fireEvent.press(view.getByText("Blank"));

    for (const t of ITINERARY_TEMPLATES) {
      if (t.start === "picton") expect(view.getByText(t.label)).toBeTruthy();
      else expect(view.queryByText(t.label)).toBeNull();
    }
  });

  it("goes back to Blank when the town changes", async () => {
    const view = await openModal({ showTemplateOption: true });

    await fireEvent.press(view.getByText("Blank"));
    await fireEvent.press(view.getByText(freeTemplate.label));
    await fireEvent.press(view.getByText("Queenstown"));

    expect(view.getByText("Blank")).toBeTruthy();
    expect(view.queryByText(freeTemplate.label)).toBeNull();
  });

  it("shows the chosen trip's description under the picker", async () => {
    const view = await openModal({ showTemplateOption: true });

    await fireEvent.press(view.getByText("Blank"));
    await fireEvent.press(view.getByText(freeTemplate.label));

    expect(view.getByText(freeTemplate.description)).toBeTruthy();
  });

  it("gives every copied stop a time and duration label", async () => {
    const view = await openModal({ showTemplateOption: true });

    await fireEvent.press(view.getByText("Blank"));
    await fireEvent.press(view.getByText(freeTemplate.label));
    await fireEvent.press(view.getByText("Create Trip"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const item = mockTrips.saveItinerary.mock.calls[0][0].days[0].items[0];
    expect(item.timeLabel).toBe("9:00 AM");
    expect(item.durationLabel).toBe("2 Hours");
    expect(item.id).toContain("item_");
  });
});

describe("overlapping dates", () => {
  it("names the trip it would clash with, before asking the server", async () => {
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const wide = new Date(today);
    wide.setDate(wide.getDate() + 30);
    mockTrips.itineraries = [{ id: "t1", title: "Existing Trip", startDate: iso(today), endDate: iso(wide), days: [] }];
    const view = await openModal();

    await fireEvent.press(view.getByText("Create Trip"));

    await waitFor(() =>
      expect(view.getByText('Dates overlap with "Existing Trip". Choose different dates.')).toBeTruthy(),
    );
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
  });

  it("explains the server's own overlap rejection", async () => {
    mockTrips.saveItinerary = jest.fn().mockRejectedValue(new ApiError(409, "overlap"));
    const view = await openModal();

    await fireEvent.press(view.getByText("Create Trip"));

    await waitFor(() =>
      expect(view.getByText("Those dates overlap an existing trip. Pick a different range.")).toBeTruthy(),
    );
    expect(props.onCreated).not.toHaveBeenCalled();
  });

  it("falls back to a plain failure for any other error", async () => {
    mockTrips.saveItinerary = jest.fn().mockRejectedValue(new ApiError(500, "boom"));
    const view = await openModal();

    await fireEvent.press(view.getByText("Create Trip"));

    await waitFor(() => expect(view.getByText("Failed to create trip. Try again.")).toBeTruthy());
  });
});

describe("offline", () => {
  it("says why the button can't be used rather than spinning until reconnect", async () => {
    mockNet.isConnected = false;
    const view = await openModal();

    expect(view.getByText("Reconnect to Create Trip")).toBeTruthy();
    await fireEvent.press(view.getByText("Reconnect to Create Trip"));
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
  });
});

// Editing a trip (the trip menu's Edit Trip): the same sheet, opened on the trip as it is.
describe("editing a trip", () => {
  const stop = (id: string) => ({ id, siteId: "s", siteName: "S", slotIndex: 2, durationSlots: 2, timeLabel: "", durationLabel: "" });
  const trip = {
    id: "trip-1",
    title: "Coast Trip",
    startDate: "2027-03-01",
    endDate: "2027-03-03",
    days: [
      { id: "d1", date: "2027-03-01", items: [stop("a")] },
      { id: "d2", date: "2027-03-02", items: [stop("b"), stop("c")] },
      { id: "d3", date: "2027-03-03", items: [stop("d")] },
    ],
  };
  const openEdit = () => openModal({ trip, showTemplateOption: true });

  beforeEach(() => {
    mockTrips.itineraries = [trip];
  });

  it("opens on the trip as it is, with no template picker", async () => {
    const view = await openEdit();

    expect(view.getByText("Edit Trip")).toBeTruthy();
    expect(view.getByDisplayValue("Coast Trip")).toBeTruthy();
    expect(view.getByText("3 days")).toBeTruthy();
    expect(view.queryByText("Suggested Trip")).toBeNull();
    expect(view.getByText("Save Changes")).toBeTruthy();
  });

  it("saves the same trip, its days keeping their ids and places", async () => {
    const view = await openEdit();

    await fireEvent.press(view.getByLabelText("More days"));
    await fireEvent.press(view.getByText("Save Changes"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const payload = mockTrips.saveItinerary.mock.calls[0][0];
    expect(payload).toMatchObject({ id: "trip-1", title: "Coast Trip", startDate: "2027-03-01", endDate: "2027-03-04" });
    expect(payload.days.map((d: any) => d.id)).toEqual(["d1", "d2", "d3", "day_uuid-fixed"]);
    expect(payload.days[1].items).toHaveLength(2);
    expect(props.onCreated).toHaveBeenCalledWith("trip-1");
  });

  it("asks before shortening it past days that hold places, and saves only on yes", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const view = await openEdit();

    await fireEvent.press(view.getByLabelText("Fewer days"));
    await fireEvent.press(view.getByLabelText("Fewer days"));
    await fireEvent.press(view.getByText("Save Changes"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Shorten the Trip?",
      "Day 2 and Day 3 have 3 places. Shorten the trip and remove them?",
      expect.any(Array),
    );
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();

    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    await buttons.find((b) => b.text === "Remove Places")!.onPress!();

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    expect(mockTrips.saveItinerary.mock.calls[0][0].days.map((d: any) => d.id)).toEqual(["d1"]);
    alertSpy.mockRestore();
  });

  it("names only the dropped days that hold places", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const quiet = { ...trip, days: [trip.days[0], { ...trip.days[1], items: [] }, trip.days[2]] };
    mockTrips.itineraries = [quiet];
    const view = await openModal({ trip: quiet });

    await fireEvent.press(view.getByLabelText("Fewer days"));
    await fireEvent.press(view.getByLabelText("Fewer days"));
    await fireEvent.press(view.getByText("Save Changes"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Shorten the Trip?",
      "Day 3 has 1 place. Shorten the trip and remove it?",
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it("refuses dates that run into another trip, but not into itself", async () => {
    mockTrips.itineraries = [trip, { id: "trip-2", title: "Wine Weekend", startDate: "2027-03-04", endDate: "2027-03-05" }];
    const view = await openEdit();

    await fireEvent.press(view.getByLabelText("More days"));
    await fireEvent.press(view.getByText("Save Changes"));

    await waitFor(() => expect(view.getByText('Dates overlap with "Wine Weekend". Choose different dates.')).toBeTruthy());
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
  });
});
