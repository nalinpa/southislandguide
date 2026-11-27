// Adding a site to an existing trip. The interesting parts are the preselection (a single
// trip needs no picker), the day-full refusal, and where the user is sent afterwards —
// the deep link has to carry the slot the physics engine actually placed the stop in, not
// the slot that was asked for.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { LinearGradient: (p: any) => React.createElement(View, p) };
});

jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { Image: (props: any) => React.createElement(View, props) };
});

jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

// Icons render as a bare View carrying their name and colour, so a test can read the colour.
jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  return new Proxy({}, { get: (_t, name) => (props: any) => React.createElement(View, { testID: `icon-${String(name)}`, color: props.color }) });
});

const mockNet = { isConnected: true as boolean | null, isInternetReachable: true as boolean | null };
jest.mock("@react-native-community/netinfo", () => ({ useNetInfo: () => mockNet }));

const mockTrips = { itineraries: [] as any[], saveItinerary: jest.fn(), isSaving: false };
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));

// The area each known place is visited from. "site-1" and "other" aren't in the list, so
// their legs are the flat half hour, as every leg was before drive times.
const mockAreas: Record<string, string> = { "chc-a": "christchurch", "dun-a": "dunedin", "dun-b": "dunedin" };
const mockLookup = {
  places: (id: string) => (id in mockAreas ? { area: mockAreas[id] } : undefined),
  list: [] as any[],
  ready: true,
  count: 3,
  err: "",
};
jest.mock("@/lib/hooks/usePlaceLookup", () => ({ usePlaceLookup: () => mockLookup }));

jest.mock("@/lib/analytics", () => ({ logEvent: jest.fn() }));
// Where a trip that starts in Christchurch sets off (only a trip from the trip quiz says where it starts): the
// Botanic Gardens stand in for the town's hub.
jest.mock("@/assets/data/area-hubs.json", () => ({ christchurch: "chc-a" }));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AddToTripModal } from "@/components/itinerary/AddToTripModal";
import { tokens } from "@/lib/ui/tokens";
import { PLANNER } from "@/lib/constants/gameplay";
import { logEvent } from "@/lib/analytics";
import { clearPendingSlot, peekPendingSlot, setPendingSlot } from "@/lib/pendingSlot";

const site = { id: "site-1", name: "Wai-O-Tapu", imageUrl: "https://example.test/w.jpg" };
const onClose = jest.fn();

const makeTrip = (id: string, dayCount = 2) => ({
  id,
  title: "Trip " + id,
  startDate: "2026-10-01",
  endDate: "2026-10-02",
  days: Array.from({ length: dayCount }, (_, i) => ({ id: "day_" + (i + 1), date: "2026-10-0" + (i + 1), items: [] })),
});

beforeEach(() => {
  jest.clearAllMocks();
  clearPendingSlot();
  mockNet.isConnected = true;
  mockNet.isInternetReachable = true;
  mockTrips.isSaving = false;
  mockTrips.saveItinerary = jest.fn().mockResolvedValue("t1");
  mockTrips.itineraries = [makeTrip("t1")];
  mockLookup.ready = true;
  mockLookup.list = [];
});

const makeStop = (id: string, siteId: string, slotIndex: number, durationSlots = 2) => ({
  id,
  siteId,
  siteName: siteId,
  slotIndex,
  durationSlots,
  timeLabel: "",
  durationLabel: "",
});

const tripWithDays = (...days: ReturnType<typeof makeStop>[][]) => ({
  ...makeTrip("t1", days.length),
  days: days.map((items, i) => ({ id: "day_" + (i + 1), date: "2026-10-0" + (i + 1), items })),
});

const christchurchPlace = { id: "chc-a", name: "Botanic Gardens" };
const dunedinPlace = { id: "dun-a", name: "Otago Museum" };

// The day buttons' date line, made the way the modal makes it, so the weekday isn't hard-coded.
const dayLabel = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });

describe("what is shown", () => {
  it("renders nothing until a site is handed in", async () => {
    const view = await render(<AddToTripModal site={null} onClose={onClose} />);
    expect(view.queryByText("Add to Trip")).toBeNull();
  });

  it("names the site being added", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    expect(view.getByText("Add to Trip")).toBeTruthy();
    expect(view.getByText("Wai-O-Tapu")).toBeTruthy();
  });

  it("skips the trip picker when there is only one trip to add to", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    expect(view.queryByText("Trip t1")).toBeNull();
    expect(view.getByText("Day 1")).toBeTruthy();
  });

  it("offers a trip picker once there is more than one", async () => {
    mockTrips.itineraries = [makeTrip("t1"), makeTrip("t2")];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    expect(view.getByText("Trip t1")).toBeTruthy();
    expect(view.getByText("Trip t2")).toBeTruthy();
  });

  it("honours the trip the caller preselected", async () => {
    mockTrips.itineraries = [makeTrip("t1"), makeTrip("t2", 3)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} initialItineraryId="t2" />);
    // t2 has three days, so its day pills are what should be on screen.
    expect(view.getByText("Day 3")).toBeTruthy();
  });
});

describe("adding", () => {
  it("saves the stop onto the chosen day", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    await fireEvent.press(view.getByText("Day 2"));
    await fireEvent.press(view.getByText("Add"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const payload = mockTrips.saveItinerary.mock.calls[0][0];
    expect(payload.id).toBe("t1");
    const day2 = payload.days.find((d: any) => d.id === "day_2");
    expect(day2.items).toHaveLength(1);
    expect(day2.items[0].siteName).toBe("Wai-O-Tapu");
  });

  it("logs place_added_to_trip once per save, and nothing when the save fails", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    mockTrips.saveItinerary.mockRejectedValueOnce(new Error("x"));
    await fireEvent.press(view.getByText("Add"));
    await waitFor(() => expect(view.getByText("Couldn't add to your trip. Try again.")).toBeTruthy());
    expect(logEvent).not.toHaveBeenCalled();
    await fireEvent.press(view.getByText("Add"));
    await waitFor(() => expect(logEvent).toHaveBeenCalledTimes(1));
    expect(logEvent).toHaveBeenCalledWith("place_added_to_trip");
  });

  it("starts the visit in the chosen part of the day", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    await fireEvent.press(view.getByText("Evening"));
    await fireEvent.press(view.getByText("Add"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const item = mockTrips.saveItinerary.mock.calls[0][0].days[0].items[0];
    expect(item.slotIndex).toBe(18);
  });

  it("carries the visit length that was set", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    expect(view.getByText("1 Hour")).toBeTruthy();

    await fireEvent.press(view.getByText("Add"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    expect(mockTrips.saveItinerary.mock.calls[0][0].days[0].items[0].durationSlots).toBe(2);
  });

  // Day 1 ended in Christchurch, so a Dunedin morning can't start before the 4.5 hour drive.
  it("starts a day in a new area after the drive from where the day before ended", async () => {
    mockTrips.itineraries = [tripWithDays([makeStop("a", "chc-a", 2)], [])];
    const view = await render(<AddToTripModal site={dunedinPlace} onClose={onClose} />);

    await fireEvent.press(view.getByText("Day 2"));
    await fireEvent.press(view.getByText("Add"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const day2 = mockTrips.saveItinerary.mock.calls[0][0].days[1];
    expect(day2.items[0]).toMatchObject({ siteId: "dun-a", slotIndex: 9, timeLabel: "12:30 PM" });
    await fireEvent.press(await view.findByText("View Trip"));
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ jumpToDay: "day_2", jumpToSlot: "9" }) }),
    );
  });

  // Adding used to jump to the trip every time, which sent someone adding five places to
  // the trip screen five times.
  it("stays put once the place is added, and says where it went", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    await fireEvent.press(view.getByText("Add"));

    expect(await view.findByText(`Added to Day 1 · ${dayLabel("2026-10-01")}`)).toBeTruthy();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await fireEvent.press(view.getByText("Done"));
    expect(onClose).toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  // Both callers build `site` afresh on every render, and the save makes them re-render.
  it("keeps saying Added when the caller re-renders with the same place", async () => {
    const view = await render(<AddToTripModal site={{ ...site }} onClose={onClose} />);

    await fireEvent.press(view.getByText("Add"));
    expect(await view.findByText(/^Added to Day 1/)).toBeTruthy();

    await view.rerender(<AddToTripModal site={{ ...site }} onClose={onClose} />);

    expect(view.getByText(/^Added to Day 1/)).toBeTruthy();
    expect(view.queryByText("Add")).toBeNull();
  });

  it("opens the trip at the slot the stop actually landed in, from View Trip", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    await fireEvent.press(view.getByText("Add"));
    await fireEvent.press(await view.findByText("View Trip"));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/(app)/(tabs)/itinerary/[itineraryId]",
      params: { itineraryId: "t1", jumpToDay: "day_1", jumpToSlot: expect.any(String) },
    });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("the day buttons", () => {
  it("date each day, as well as numbering it", async () => {
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    expect(view.getByText("Day 1")).toBeTruthy();
    expect(view.getByText(dayLabel("2026-10-01"))).toBeTruthy();
  });
});

// Tester, 2026-11-11: "couldn't find a day that would take a place, and didn't know why".
describe("which days have room", () => {
  const fullDay = [makeStop("full", "other", 1, PLANNER.MAX_GRID_SLOTS - 1)];

  it("opens on the first day with room, and marks the full one", async () => {
    mockTrips.itineraries = [tripWithDays(fullDay, [])];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    expect(view.getByText(`${dayLabel("2026-10-01")} · No room`)).toBeTruthy();
    expect(view.getByText(dayLabel("2026-10-02"))).toBeTruthy();
    await fireEvent.press(view.getByText("Add"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const saved = mockTrips.saveItinerary.mock.calls[0][0].days;
    expect(saved[0].items).toHaveLength(1);
    expect(saved[1].items[0].siteName).toBe("Wai-O-Tapu");
  });

  // Owner, 2026-11-11: "the days show full but the time of day doesn't".
  it("marks a part of the day that's taken, and opens on the next one with room", async () => {
    // 8:30 to 11:00: the morning's gone, so the place would land at midday.
    mockTrips.itineraries = [tripWithDays([makeStop("m", "other", 1, 5)])];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    expect(view.getAllByText("Full")).toHaveLength(1);
    // Morning can't be picked, so the place goes in at midday.
    await fireEvent.press(view.getByText("Morning"));
    await fireEvent.press(view.getByText("Add"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const added = mockTrips.saveItinerary.mock.calls[0][0].days[0].items.find((i: any) => i.siteId === "site-1");
    expect(added.slotIndex).toBeGreaterThanOrEqual(6);
    expect(added.slotIndex).toBeLessThan(12);
  });

  it("marks every part of a full day", async () => {
    mockTrips.itineraries = [tripWithDays(fullDay)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    expect(view.getAllByText("Full")).toHaveLength(4);
  });

  it("doesn't let a day with no room be picked", async () => {
    mockTrips.itineraries = [tripWithDays(fullDay, [])];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    await fireEvent.press(view.getByText("Day 1"));
    await fireEvent.press(view.getByText("Add"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const saved = mockTrips.saveItinerary.mock.calls[0][0].days;
    expect(saved[0].items).toHaveLength(1);
    expect(saved[1].items).toHaveLength(1);
  });

  it("finds room again when the visit is made shorter", async () => {
    // Two half-hour slots left at the end of the day: not enough for an hour after the hop.
    mockTrips.itineraries = [tripWithDays([makeStop("most", "other", 0, PLANNER.MAX_GRID_SLOTS - 2)])];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    expect(view.getByText(/^No day has room for a visit of 1 hour\./)).toBeTruthy();

    await fireEvent.press(view.getByLabelText("Shorter"));

    expect(view.queryByText(/^No day has room/)).toBeNull();
  });
});

// Tester, 2026-11-11: "Find more things to do" forgot the gap it was opened from.
describe("the gap Find more things to do was opened from", () => {
  it("opens on that day and exact time, and is used up once the place is added", async () => {
    setPendingSlot({ tripId: "t1", dayId: "day_2", slot: 9 });
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    expect(view.getByText("12:30 PM")).toBeTruthy();
    await fireEvent.press(view.getByText("Add"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    expect(mockTrips.saveItinerary.mock.calls[0][0].days[1].items[0].slotIndex).toBe(9);
    expect(peekPendingSlot("t1")).toBeNull();
  });

  it("has no extra pill when the time is one of the four", async () => {
    setPendingSlot({ tripId: "t1", dayId: "day_2", slot: 1 });
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    expect(view.queryByText("8:30 AM")).toBeNull();
    await fireEvent.press(view.getByText("Add"));
    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    expect(mockTrips.saveItinerary.mock.calls[0][0].days[1].items).toHaveLength(1);
  });

  it("is ignored for another trip, and after half an hour", () => {
    setPendingSlot({ tripId: "t1", dayId: "day_2", slot: 9 });
    expect(peekPendingSlot("t2")).toBeNull();
    expect(peekPendingSlot("t1")).toEqual(expect.objectContaining({ dayId: "day_2", slot: 9 }));

    const now = Date.now();
    const clock = jest.spyOn(Date, "now").mockReturnValue(now + 31 * 60_000);
    expect(peekPendingSlot("t1")).toBeNull();
    clock.mockRestore();
  });
});

describe("refusals", () => {
  it("refuses a day with no room left, instead of silently dropping the stop", async () => {
    // Fill the grid: one stop long enough that nothing else fits after it.
    mockTrips.itineraries = [
      {
        ...makeTrip("t1", 1),
        days: [
          {
            id: "day_1",
            date: "2026-10-01",
            items: [
              {
                id: "item_full",
                siteId: "other",
                siteName: "All Day Somewhere",
                slotIndex: 1,
                durationSlots: PLANNER.MAX_GRID_SLOTS - 1,
                timeLabel: "",
                durationLabel: "",
              },
            ],
          },
        ],
      },
    ];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    // Said before Add is tapped, and Add does nothing.
    expect(view.getByText("No day has room for a visit of 1 hour. Try a shorter visit, or make room on a day.")).toBeTruthy();
    expect(view.getByText(`${dayLabel("2026-10-01")} · No room`)).toBeTruthy();
    await fireEvent.press(view.getByText("Add"));

    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("won't put a place on a day with no time for the drive to it", async () => {
    // Day 2 has room, so the sheet isn't in its "no day has room" state.
    mockTrips.itineraries = [tripWithDays([makeStop("a", "chc-a", 0, 18)], [])];
    const view = await render(<AddToTripModal site={dunedinPlace} onClose={onClose} />);

    // Day 1 says so up front and can't be picked. It used to take a tap on Add to find out.
    expect(view.getByText(`${dayLabel("2026-10-01")} · No room`)).toBeTruthy();
    await fireEvent.press(view.getByText("Day 1"));
    await fireEvent.press(view.getByText("Add"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    expect(mockTrips.saveItinerary.mock.calls[0][0].days[0].items).toHaveLength(1);
    expect(mockTrips.saveItinerary.mock.calls[0][0].days[1].items[0].siteId).toBe("dun-a");
  });

  // The new place becomes day 1's last, so day 2 now has to open with the drive back.
  it("won't put a place at a time that leaves the next day no room for the drive it then opens with", async () => {
    mockTrips.itineraries = [tripWithDays([makeStop("a", "dun-b", 2)], [makeStop("b", "dun-a", 0, 20)])];
    const view = await render(<AddToTripModal site={christchurchPlace} onClose={onClose} />);

    // Evening can't be picked. In the morning the place comes before Dunedin, which stays
    // the day's last, so Day 2 is unchanged.
    await fireEvent.press(view.getByText("Evening"));
    await fireEvent.press(view.getByText("Add"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    const day1 = mockTrips.saveItinerary.mock.calls[0][0].days[0].items;
    expect(day1.map((i: any) => i.siteId)).toEqual(["chc-a", "dun-b"]);
  });

  // Day 1 of a trip that says where it starts sets off from that town: a Dunedin place goes after the 4.5 hour drive
  // out of Christchurch, so Morning has no room and the sheet opens on Midday, landing at 12:30.
  it("puts a place on day 1 after the drive from the town a trip starts from", async () => {
    mockTrips.itineraries = [{ ...tripWithDays([], []), startArea: "christchurch" }];
    const view = await render(<AddToTripModal site={dunedinPlace} onClose={onClose} />);

    await fireEvent.press(view.getByText("Add"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    expect(mockTrips.saveItinerary.mock.calls[0][0].days[0].items[0]).toMatchObject({ siteId: "dun-a", slotIndex: 9 });
  });

  it("puts it in the morning on a trip that doesn't say where it starts", async () => {
    mockTrips.itineraries = [tripWithDays([], [])];
    const view = await render(<AddToTripModal site={dunedinPlace} onClose={onClose} />);

    await fireEvent.press(view.getByText("Add"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalled());
    expect(mockTrips.saveItinerary.mock.calls[0][0].days[0].items[0]).toMatchObject({ siteId: "dun-a", slotIndex: 1 });
  });

  it("waits for the place list, so nothing is added without the drive check", async () => {
    mockLookup.ready = false;
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    expect(view.queryByText("Add")).toBeNull();
    await fireEvent.press(view.getByText("Loading Places..."));

    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
  });

  it("asks for a trip and a day when there is nothing to add to", async () => {
    mockTrips.itineraries = [];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    await fireEvent.press(view.getByText("Add"));

    await waitFor(() => expect(view.getByText("Choose a trip and a day.")).toBeTruthy());
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
  });

  it("keeps the modal open and says so when the save fails", async () => {
    mockTrips.saveItinerary = jest.fn().mockRejectedValue(new Error("offline-ish"));
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    await fireEvent.press(view.getByText("Add"));

    await waitFor(() => expect(view.getByText("Couldn't add to your trip. Try again.")).toBeTruthy());
    expect(onClose).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

// Q7: after adding, the places close to it, to carry on from, each with a + of its own.
describe("places near the one just added", () => {
  const place = (id: string, name: string, lat: number, lng: number, category = ["Nature"], extra: any = {}) => ({
    id,
    name,
    lat,
    lng,
    category,
    active: true,
    ...extra,
  });
  // 0.01 degrees of latitude is about 1.1 km.
  const here = place("site-1", "Wai-O-Tapu", -38, 176);
  const addIt = async (view: any) => {
    await fireEvent.press(view.getByText("Add"));
    await view.findByText(/^Added to Day 1/);
  };
  const nearby = (n: number) => Array.from({ length: n }, (_, k) => place("p" + (k + 1), "Near " + (k + 1), -38 - 0.01 * (k + 1), 176));
  const savedDay1 = (call: number) => mockTrips.saveItinerary.mock.calls[call][0].days[0].items;

  it("says where it was added, and lists up to 6 nearby places with a photo, category and distance", async () => {
    mockLookup.list = [here, ...nearby(8)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);

    expect(view.getByText("Near Wai-O-Tapu")).toBeTruthy();
    expect(view.queryByText("Added")).toBeNull();
    for (let k = 1; k <= 6; k++) expect(view.getByLabelText(new RegExp(`^Near ${k}, `))).toBeTruthy();
    expect(view.queryByLabelText(/^Near 7, /)).toBeNull();
    expect(view.getByText("Nature · 1.1 km")).toBeTruthy();
    expect(view.getByTestId("near-photo-p1")).toBeTruthy();
  });

  // On a phone a flex: 1 list got no height through the card and the sheet collapsed, leaving
  // only the dim layer over the app (owner, 2026-11-18). The list's height is a number.
  it("caps the nearby list with a number, not flex, so the card can't collapse", async () => {
    mockLookup.list = [here, ...nearby(8)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);

    const list = StyleSheet.flatten(view.getByTestId("near-list").props.style);
    expect(list.flex).toBeUndefined();
    expect(list.flexGrow).toBe(0);
    expect(typeof list.maxHeight).toBe("number");
    expect(list.maxHeight).toBeGreaterThanOrEqual(140);
  });

  it("names the trip when there is more than one", async () => {
    mockTrips.itineraries = [makeTrip("t1"), makeTrip("t2")];
    const view = await render(<AddToTripModal site={site} onClose={onClose} initialItineraryId="t1" />);
    await fireEvent.press(view.getByText("Add"));
    expect(await view.findByText(`Added to Day 1 · ${dayLabel("2026-10-01")} of Trip t1`)).toBeTruthy();
  });

  it("+ adds the place to the same day right after the last one, without closing", async () => {
    mockLookup.list = [here, ...nearby(2)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);
    const first = savedDay1(0)[0];

    await fireEvent.press(view.getByLabelText("Add Near 1 to Day 1"));

    await waitFor(() => expect(mockTrips.saveItinerary).toHaveBeenCalledTimes(2));
    expect(mockTrips.saveItinerary.mock.calls[1][0].id).toBe("t1");
    expect(savedDay1(1)).toHaveLength(2);
    // At the end of the last place, or a little after it: the packer adds the leg between them.
    expect(savedDay1(1)[1].siteId).toBe("p1");
    expect(savedDay1(1)[1].slotIndex).toBeGreaterThanOrEqual(first.slotIndex + first.durationSlots);
    expect(await view.findByLabelText("Near 1 added")).toBeTruthy();
    expect(view.queryByLabelText("Add Near 1 to Day 1")).toBeNull();
    expect(view.getByLabelText(/^Near 1, /)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("a second + goes after the first", async () => {
    mockLookup.list = [here, ...nearby(2)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);

    await fireEvent.press(view.getByLabelText("Add Near 1 to Day 1"));
    await view.findByLabelText("Near 1 added");
    await fireEvent.press(view.getByLabelText("Add Near 2 to Day 1"));
    await view.findByLabelText("Near 2 added");

    expect(savedDay1(2).map((i: any) => i.siteId)).toEqual(["site-1", "p1", "p2"]);
    const [a, b, c] = savedDay1(2);
    expect(b.slotIndex).toBeGreaterThanOrEqual(a.slotIndex + a.durationSlots);
    expect(c.slotIndex).toBeGreaterThanOrEqual(b.slotIndex + b.durationSlots);
  });

  it("uses the place's own length", async () => {
    mockLookup.list = [here, place("p1", "Near 1", -38.01, 176, ["Nature"], { recommendedDurationSlots: 5 })];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);
    await fireEvent.press(view.getByLabelText("Add Near 1 to Day 1"));
    await view.findByLabelText("Near 1 added");
    expect(savedDay1(1)[1].durationSlots).toBe(5);
  });

  it("View Trip jumps to the place added last", async () => {
    mockLookup.list = [here, ...nearby(1)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);
    await fireEvent.press(view.getByLabelText("Add Near 1 to Day 1"));
    await view.findByLabelText("Near 1 added");

    await fireEvent.press(view.getByText("View Trip"));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/(app)/(tabs)/itinerary/[itineraryId]",
      params: { itineraryId: "t1", jumpToDay: "day_1", jumpToSlot: String(savedDay1(1)[1].slotIndex) },
    });
  });

  it("doesn't list a place that has no room on the day, and lists the next ones that do", async () => {
    // The closest asks for a whole day; the two after it fit.
    mockLookup.list = [
      here,
      place("big", "Whole Day", -38.001, 176, ["Nature"], { recommendedDurationSlots: PLANNER.MAX_GRID_SLOTS }),
      ...nearby(2),
    ];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);

    expect(view.queryByLabelText(/^Whole Day, /)).toBeNull();
    expect(view.getByText("Add the Next Stop")).toBeTruthy();
    expect(view.queryByText("Add to Trip")).toBeNull();
    expect(view.getByLabelText(/^Near 1, /)).toBeTruthy();
    expect(view.getByLabelText(/^Near 2, /)).toBeTruthy();
  });

  // Day 1 of a trip from Christchurch: the drive to Dunedin, the Museum from 12:30 to 1:30, half an hour on to the
  // next place. Eight and a half hours more runs past the day's end; it would fit if the day had no drive out of town.
  it("on a trip that starts in a town, lists only places with room after the drive out of it", async () => {
    mockTrips.itineraries = [{ ...tripWithDays([], []), startArea: "christchurch" }];
    mockLookup.list = [
      place("dun-a", "Otago Museum", -45.87, 170.5),
      place("p1", "Near 1", -45.871, 170.5, ["Nature"], { recommendedDurationSlots: 17 }),
      place("p2", "Near 2", -45.872, 170.5),
    ];
    const view = await render(<AddToTripModal site={dunedinPlace} onClose={onClose} />);
    await addIt(view);

    expect(savedDay1(0)[0]).toMatchObject({ siteId: "dun-a", slotIndex: 9 });
    expect(view.queryByLabelText(/^Near 1, /)).toBeNull();
    expect(view.getByLabelText(/^Near 2, /)).toBeTruthy();
  });

  it("shows no Near list when nothing nearby has room on the day", async () => {
    mockLookup.list = [here, place("big", "Whole Day", -38.001, 176, ["Nature"], { recommendedDurationSlots: PLANNER.MAX_GRID_SLOTS })];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);

    expect(view.queryByText("Near Wai-O-Tapu")).toBeNull();
    expect(view.getByText("Add to Trip")).toBeTruthy();
    expect(view.getByText("Done")).toBeTruthy();
  });

  it("the + on a nearby row logs place_added_to_trip once more", async () => {
    mockLookup.list = [here, ...nearby(1)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);
    expect(logEvent).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByLabelText("Add Near 1 to Day 1"));
    await waitFor(() => expect(logEvent).toHaveBeenCalledTimes(2));
    expect(logEvent).toHaveBeenLastCalledWith("place_added_to_trip");
  });

  it("says Couldn't add when the save fails, and the + comes back", async () => {
    mockLookup.list = [here, ...nearby(1)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);
    mockTrips.saveItinerary.mockRejectedValueOnce(new Error("offline-ish"));

    await fireEvent.press(view.getByLabelText("Add Near 1 to Day 1"));

    expect(await view.findByText("Couldn't add to your trip. Try again.")).toBeTruthy();
    expect(view.getByLabelText("Add Near 1 to Day 1")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("disables the other + while one saves", async () => {
    mockLookup.list = [here, ...nearby(2)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);
    let finish: (v: string) => void = () => {};
    mockTrips.saveItinerary.mockImplementationOnce(() => new Promise<string>((r) => (finish = r)));

    const pressed = fireEvent.press(view.getByLabelText("Add Near 1 to Day 1"));
    await waitFor(() => expect(view.queryByLabelText("Add Near 1 to Day 1")).toBeNull());

    expect(view.getByLabelText("Add Near 2 to Day 1").props.accessibilityState.disabled).toBe(true);
    expect(view.queryByLabelText("Add Near 1 to Day 1")).toBeNull();
    await act(async () => finish("t1"));
    await pressed;
    await view.findByLabelText("Near 1 added");
    expect(view.getByLabelText("Add Near 2 to Day 1").props.accessibilityState.disabled).toBe(false);
  });

  it("View Trip and the rows wait while a place is being added", async () => {
    mockLookup.list = [here, ...nearby(2)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);
    let finish: (v: string) => void = () => {};
    mockTrips.saveItinerary.mockImplementationOnce(() => new Promise<string>((r) => (finish = r)));

    const pressed = fireEvent.press(view.getByLabelText("Add Near 1 to Day 1"));
    await view.findByLabelText("Adding Near 1");
    await fireEvent.press(view.getByText("View Trip"));
    await fireEvent.press(view.getByLabelText(/^Near 2, /));
    expect(onClose).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();

    await act(async () => finish("t1"));
    await pressed;
    await view.findByLabelText("Near 1 added");
    await fireEvent.press(view.getByText("Done"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("the added ticks use the words-and-icons colour, not the fill colour", async () => {
    mockLookup.list = [here, ...nearby(1)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);
    await fireEvent.press(view.getByLabelText("Add Near 1 to Day 1"));
    const row = await view.findByLabelText("Near 1 added");

    expect(view.getAllByTestId("icon-Check").map((c) => c.props.color)).toEqual([tokens.colors.surf, tokens.colors.surf]);
    expect(row).toBeTruthy();
  });

  it("Done and close still work while a + is saving", async () => {
    mockLookup.list = [here, ...nearby(2)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);
    mockTrips.saveItinerary.mockImplementationOnce(() => new Promise<string>(() => {}));

    fireEvent.press(view.getByLabelText("Add Near 1 to Day 1"));
    await view.findByLabelText("Adding Near 1");
    await fireEvent.press(view.getByText("Done"));
    expect(onClose).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("offline, the nearby + buttons are disabled and say Reconnect to add more; nothing is saved on a tap", async () => {
    mockLookup.list = [here, ...nearby(2)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);
    mockTrips.saveItinerary.mockClear();
    mockNet.isConnected = false;
    await view.rerender(<AddToTripModal site={site} onClose={onClose} />);

    expect(view.getByText("Reconnect to add more.")).toBeTruthy();
    const plus = view.getByLabelText("Add Near 1 to Day 1");
    expect(plus.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(plus);
    expect(mockTrips.saveItinerary).not.toHaveBeenCalled();
    expect(view.getByText("Done")).toBeTruthy();
  });

  it("a save that finishes after the sheet moved to another place writes nothing into it", async () => {
    mockLookup.list = [here, ...nearby(2)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);
    let finish: (v: string) => void = () => {};
    mockTrips.saveItinerary.mockImplementationOnce(() => new Promise<string>((r) => (finish = r)));
    const pressed = fireEvent.press(view.getByLabelText("Add Near 1 to Day 1"));
    await view.findByLabelText("Adding Near 1");

    // Closed from outside, then opened for another place.
    await view.rerender(<AddToTripModal site={null} onClose={onClose} />);
    await view.rerender(<AddToTripModal site={{ ...site, id: "site-2", name: "Other Place" }} onClose={onClose} />);
    await act(async () => finish("t1"));
    await pressed;

    expect(view.getByText("Other Place")).toBeTruthy();
    expect(view.getByText("Add")).toBeTruthy();
    expect(view.queryByText(/^Added to Day/)).toBeNull();
    expect(view.queryByLabelText("Near 1 added")).toBeNull();
  });

  it("tapping the row still opens the place, with the pending slot after the last add", async () => {
    mockLookup.list = [here, ...nearby(2)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);
    await fireEvent.press(view.getByLabelText("Add Near 1 to Day 1"));
    await view.findByLabelText("Near 1 added");
    const added = savedDay1(1)[1];

    await fireEvent.press(view.getByLabelText(/^Near 2, /));

    expect(peekPendingSlot("t1")).toEqual(
      expect.objectContaining({ dayId: "day_1", slot: added.slotIndex + added.durationSlots }),
    );
    expect(onClose).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/sites/p2");
  });

  it("a tap opens that place with Add to Trip set to the same day, right after", async () => {
    mockLookup.list = [here, place("p1", "Near One", -38.01, 176)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);
    const end = savedDay1(0)[0];

    await fireEvent.press(view.getByLabelText(/^Near One, /));

    expect(peekPendingSlot("t1")).toEqual(
      expect.objectContaining({ dayId: "day_1", slot: end.slotIndex + end.durationSlots }),
    );
    expect(onClose).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/sites/p1");
  });

  it("offers no Stay and nothing already in the trip", async () => {
    mockTrips.itineraries = [tripWithDays([makeStop("a", "in-trip", 1)])];
    mockLookup.list = [
      here,
      place("in-trip", "Already There", -38.001, 176),
      place("stay", "Cosy Lodge", -38.002, 176, ["Stay"]),
      place("p1", "Near One", -38.01, 176),
    ];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);

    expect(view.getByText("Near One")).toBeTruthy();
    expect(view.queryByText("Already There")).toBeNull();
    expect(view.queryByText("Cosy Lodge")).toBeNull();
  });

  it("with nothing nearby, shows only the line and the buttons", async () => {
    mockLookup.list = [here];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(view);
    expect(view.queryByText("Near Wai-O-Tapu")).toBeNull();
    expect(view.getByText("Done")).toBeTruthy();
    expect(view.getByText("View Trip")).toBeTruthy();
  });

  it("shows no Near list when the place has no position", async () => {
    mockLookup.list = [{ ...here, lat: undefined, lng: undefined }, place("p1", "Near One", -38.01, 176)];
    const noPos = await render(<AddToTripModal site={site} onClose={onClose} />);
    await addIt(noPos);
    expect(noPos.queryByText("Near Wai-O-Tapu")).toBeNull();
  });
});

describe("on the Duo", () => {
  it("wide: Day row inside the margin, 32 above Add", async () => {
    require("@blacksands/ui").__setWide(true, { width: 669, height: 951 });
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    const label = StyleSheet.flatten(view.getByTestId("add-day-label").props.style);
    expect(label.marginTop).toBe(22);
    expect(label.marginBottom).toBe(10);
    expect(StyleSheet.flatten(view.getByTestId("add-submit").props.style).marginTop).toBe(32);
    let card: any;
    for (let n: any = view.getByTestId("add-day-label"); n && !card; n = n.parent) {
      const st = StyleSheet.flatten(n.props?.style) as any;
      if (st?.paddingHorizontal === 24) card = st;
    }
    expect(card.borderBottomLeftRadius).toBe(20);
  });

  it("wide, dark: the Day row fades into the card's colour, not the page's", async () => {
    require("@blacksands/ui").__setWide(true, { width: 669, height: 951 });
    const spy = jest.spyOn(require("react-native"), "useColorScheme").mockReturnValue("dark");
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    const fade = view.getByTestId("add-day-fade");
    expect(fade.props.colors).toEqual(["#0E2A2E00", "#0E2A2E"]);
    spy.mockRestore();
  });

  it("wide: the Day row fades at the margin; the phone has no fade", async () => {
    require("@blacksands/ui").__setWide(true, { width: 669, height: 951 });
    const wideView = await render(<AddToTripModal site={site} onClose={onClose} />);
    expect(wideView.getByTestId("add-day-fade")).toBeTruthy();
    await wideView.unmount();
    require("@blacksands/ui").__setWide(false);
    const phone = await render(<AddToTripModal site={site} onClose={onClose} />);
    expect(phone.queryByTestId("add-day-fade")).toBeNull();
  });
});

// Owner, 2026-11-17: adding to day 9, the Day row still started at Day 1 with the chosen
// pill off screen. The jest ScrollView mock keeps scrollTo as a shared jest.fn on the
// prototype (cleared by clearAllMocks), so that is what the row's calls are read from.
describe("the Day row follows the chosen day", () => {
  const scrollTo = () => (ScrollView.prototype as any).scrollTo as jest.Mock;
  // layout doesn't bubble: fire it on the pill itself, the nearest host with onLayout.
  const layOut = (view: any, text: string, x: number) => {
    let pill = view.getByText(text);
    while (pill && !pill.props.onLayout) pill = pill.parent;
    return fireEvent(pill, "layout", { nativeEvent: { layout: { x, y: 0, width: 110, height: 52 } } });
  };

  it("opens with the chosen day in view", async () => {
    mockTrips.itineraries = [makeTrip("t1", 10)];
    setPendingSlot({ tripId: "t1", dayId: "day_9", slot: 9 });
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    expect(scrollTo()).not.toHaveBeenCalled();

    await layOut(view, "Day 9", 880);

    expect(scrollTo()).toHaveBeenCalledTimes(1);
    expect(scrollTo()).toHaveBeenCalledWith({ x: 856, animated: false });
  });

  it("stays at the start when day 1 is chosen", async () => {
    mockTrips.itineraries = [makeTrip("t1", 10)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);

    await layOut(view, "Day 1", 0);

    for (const call of scrollTo().mock.calls) expect(call[0].x).toBe(0);
  });

  it("doesn't move the row when a pill is tapped", async () => {
    mockTrips.itineraries = [makeTrip("t1", 10)];
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await layOut(view, "Day 1", 0);
    scrollTo().mockClear();

    await fireEvent.press(view.getByText("Day 3"));
    await layOut(view, "Day 3", 220);

    expect(scrollTo()).not.toHaveBeenCalled();
  });

  it("a second open scrolls from the new layout, not the old one", async () => {
    mockTrips.itineraries = [makeTrip("t1", 10)];
    setPendingSlot({ tripId: "t1", dayId: "day_9", slot: 9 });
    const view = await render(<AddToTripModal site={site} onClose={onClose} />);
    await layOut(view, "Day 9", 880);
    expect(scrollTo()).toHaveBeenLastCalledWith({ x: 856, animated: false });
    scrollTo().mockClear();

    // Closed (site null) and opened for another place: the row is laid out afresh.
    await view.rerender(<AddToTripModal site={null} onClose={onClose} />);
    await view.rerender(<AddToTripModal site={{ ...site, id: "site-2" }} onClose={onClose} />);
    expect(scrollTo()).not.toHaveBeenCalled();

    await layOut(view, "Day 9", 900);
    expect(scrollTo()).toHaveBeenCalledTimes(1);
    expect(scrollTo()).toHaveBeenCalledWith({ x: 876, animated: false });
  });
});
