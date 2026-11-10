// A trip into the phone's calendar: one event per place and per drive, in New Zealand time,
// and adding the trip again replaces its events.
const mockCreated: any[] = [];
const mockDeleted: string[] = [];
const mockCalendar = {
  title: "Home",
  source: { name: "iCloud", type: "caldav" },
  createEvent: jest.fn(async (details: any) => {
    mockCreated.push(details);
    return { id: "ev" + mockCreated.length };
  }),
};
const mockPermission = { granted: true };
const mockPicker = jest.fn(async (): Promise<any> => mockCalendar);
jest.mock("expo-calendar", () => ({
  requestCalendarPermissions: jest.fn(async () => mockPermission),
  presentPicker: () => mockPicker(),
  ExpoCalendarEvent: {
    get: jest.fn(async (id: string) => ({ delete: async () => void mockDeleted.push(id) })),
  },
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { Alert, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { addTripToCalendar, tripCalendarEvents } from "@/lib/tripCalendar";
import { packTrip } from "@/lib/utils/itineraryPhysics";
import type { ItineraryDay, ItineraryItem } from "@/lib/models";

// Christchurch to Dunedin is 9 slots (4.5 hours) in the test drive times.
const AREA: Record<string, string> = { "chc-a": "christchurch", "chc-b": "christchurch", "dun-a": "dunedin" };
const places = (id: string) => (id in AREA ? { area: AREA[id] } : undefined);

const at = (id: string, siteId: string, slotIndex: number, durationSlots = 2, over: Partial<ItineraryItem> = {}): ItineraryItem => ({
  id,
  siteId,
  siteName: "Place " + id,
  slotIndex,
  durationSlots,
  timeLabel: "",
  durationLabel: "",
  ...over,
});
const days = (...list: [string, ItineraryItem[]][]): ItineraryDay[] =>
  packTrip(list.map(([date, items], i) => ({ id: "day_" + (i + 1), date, items })), places);

let alertSpy: jest.SpyInstance;
beforeEach(async () => {
  mockCreated.length = 0;
  mockDeleted.length = 0;
  mockPermission.granted = true;
  mockPicker.mockClear().mockImplementation(async () => mockCalendar);
  await AsyncStorage.clear();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(() => alertSpy.mockRestore());

describe("tripCalendarEvents", () => {
  it("puts each place at its time in New Zealand, from 8 AM in half hours", () => {
    const [stop] = tripCalendarEvents("Summer", days(["2026-12-01", [at("a", "chc-a", 2, 3)]]), places);

    // 9:00 to 10:30 AM NZDT (UTC+13).
    expect(stop.startDate.toISOString()).toBe("2026-11-30T20:00:00.000Z");
    expect(stop.endDate.toISOString()).toBe("2026-11-30T21:30:00.000Z");
    expect(stop).toMatchObject({ kind: "stop", title: "Place a", location: "Place a, Christchurch", notes: "Day 1 of Summer · Kiwi Guide" });
  });

  it("follows New Zealand's clocks across the end of daylight saving (4 April 2027)", () => {
    const events = tripCalendarEvents(
      "Autumn",
      days(["2027-04-03", [at("a", "chc-a", 0)]], ["2027-04-04", [at("b", "chc-b", 0)]]),
      places,
    );

    expect(events.map((e) => e.startDate.toISOString())).toEqual([
      "2027-04-02T19:00:00.000Z", // 8 AM NZDT, UTC+13
      "2027-04-03T20:00:00.000Z", // 8 AM NZST, UTC+12
    ]);
  });

  it("adds the drive between towns as its own event, but not a hop within a town", () => {
    const events = tripCalendarEvents(
      "Road Trip",
      days(["2026-12-01", [at("a", "chc-a", 0), at("b", "chc-b", 3), at("c", "dun-a", 20)]]),
      places,
    );

    const drives = events.filter((e) => e.kind === "drive");
    expect(drives).toHaveLength(1);
    expect(drives[0].title).toBe("Drive to Dunedin");
    expect((drives[0].endDate.getTime() - drives[0].startDate.getTime()) / 60000).toBe(270);
    expect(events.map((e) => e.title)).toEqual(["Place a", "Place b", "Drive to Dunedin", "Place c"]);
  });

  it("keeps a place's own note above the trip's", () => {
    const [stop] = tripCalendarEvents("Summer", days(["2026-12-01", [at("a", "chc-a", 0, 2, { note: "Book ahead" })]]), places);
    expect(stop.notes).toBe("Book ahead\n\nDay 1 of Summer · Kiwi Guide");
  });
});

describe("addTripToCalendar", () => {
  const trip = { id: "t1", title: "Summer" };
  const tripDays = () => days(["2026-12-01", [at("a", "chc-a", 0), at("b", "dun-a", 14)]]);

  it("adds every event to the picked calendar, in New Zealand time", async () => {
    await addTripToCalendar(trip, tripDays(), places);

    expect(mockCreated.map((e) => e.title)).toEqual(["Place a", "Drive to Dunedin", "Place b"]);
    expect(mockCreated.every((e) => e.timeZone === "Pacific/Auckland")).toBe(true);
    expect(alertSpy).toHaveBeenCalledWith("Added to Your Calendar", expect.stringContaining("2 places and 1 drive from Summer are in Home."));
  });

  it("replaces the trip's earlier events when it's added again", async () => {
    await addTripToCalendar(trip, tripDays(), places);
    await addTripToCalendar(trip, tripDays(), places);

    expect(mockDeleted).toEqual(["ev1", "ev2", "ev3"]);
    expect(JSON.parse((await AsyncStorage.getItem("kiwiguide.calendarEvents.t1"))!)).toEqual(["ev4", "ev5", "ev6"]);
  });

  it("says how to reach Google Calendar unless a Google one was picked", async () => {
    await addTripToCalendar(trip, tripDays(), places);
    expect(alertSpy.mock.calls[0][1]).toContain("add your Google account");

    mockPicker.mockImplementation(async () => ({ ...mockCalendar, title: "Work", source: { name: "Gmail", type: "caldav" } }));
    await addTripToCalendar(trip, tripDays(), places);
    expect(alertSpy.mock.calls[1][1]).not.toContain("Google account");
  });

  it("does nothing when the picker is cancelled", async () => {
    mockPicker.mockImplementation(async () => null);
    await addTripToCalendar(trip, tripDays(), places);

    expect(mockCreated).toHaveLength(0);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("offers Settings when calendar access is refused", async () => {
    mockPermission.granted = false;
    const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue();
    await addTripToCalendar(trip, tripDays(), places);

    expect(mockPicker).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith("Calendar Access Needed", expect.any(String), expect.any(Array));
    alertSpy.mock.calls[0][2][1].onPress();
    expect(openSettings).toHaveBeenCalled();
    openSettings.mockRestore();
  });
});
