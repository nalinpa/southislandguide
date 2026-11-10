import { Alert, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Calendar from "expo-calendar";
import * as Sentry from "@sentry/react-native";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import { areaName } from "@/lib/areas";
import { dayLegs, dayStartSiteId } from "@/lib/utils/itineraryPhysics";
import type { ItineraryDay } from "@/lib/models";
import type { PlaceLookup } from "@/lib/utils/transitMatrix";

dayjs.extend(utc);
dayjs.extend(timezone);

// A trip into the phone's calendar (tester, 2026-11-09: "all my meetings are in Google").
// iOS can't write to Google Calendar without Google sign-in, but the phone's calendar can:
// a Google account added on the iPhone shows its calendars in the picker.

// Trips are planned in New Zealand time, so the events are too: someone planning from
// abroad sees them at the right hour in their own time.
const NZ = "Pacific/Auckland";

export type TripEvent = {
  kind: "stop" | "drive";
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes: string;
};

// Slot 0 is 8:00 AM and each slot half an hour (slotIndexToTimeLabel). A slot past
// midnight lands on the next morning, as on the timeline.
const at = (date: string, slot: number) => dayjs.tz(`${date} 08:00`, NZ).add(slot * 30, "minute").toDate();

// One event per place and one per drive between towns, as the day timeline shows them.
// Short in-town hops aren't drives there either.
export function tripCalendarEvents(tripTitle: string, days: ItineraryDay[], places: PlaceLookup): TripEvent[] {
  const events: TripEvent[] = [];
  days.forEach((day, i) => {
    const notes = `Day ${i + 1} of ${tripTitle} · Kiwi Guide`;
    for (const leg of dayLegs(day.items, places, dayStartSiteId(days, i))) {
      if (!leg.drive) continue;
      events.push({
        kind: "drive",
        title: `Drive to ${areaName(leg.drive.toArea)}`,
        startDate: at(day.date, leg.startSlot),
        endDate: at(day.date, leg.startSlot + leg.slots),
        notes,
      });
    }
    for (const item of day.items) {
      const start = item.slotIndex ?? 0;
      const area = places(item.siteId)?.area;
      events.push({
        kind: "stop",
        title: item.siteName,
        startDate: at(day.date, start),
        endDate: at(day.date, start + item.durationSlots),
        location: area ? `${item.siteName}, ${areaName(area)}` : item.siteName,
        notes: item.note ? `${item.note}\n\n${notes}` : notes,
      });
    }
  });
  return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

// The ids of the events last added for a trip, so adding it again replaces them instead
// of making a second set. On this phone only: another phone adds its own.
const storeKey = (tripId: string) => `kiwiguide.calendarEvents.${tripId}`;

async function removeEarlierEvents(tripId: string) {
  let ids: string[] = [];
  try {
    ids = JSON.parse((await AsyncStorage.getItem(storeKey(tripId))) ?? "[]");
  } catch {
    // An unreadable list: nothing to remove.
  }
  for (const id of ids) {
    try {
      await (await Calendar.ExpoCalendarEvent.get(id)).delete();
    } catch {
      // Already deleted in the Calendar app.
    }
  }
}

const looksLikeGoogle = (calendar: Calendar.ExpoCalendar) => /google|gmail/i.test(calendar.source?.name ?? "");

export async function addTripToCalendar(trip: { id: string; title: string }, days: ItineraryDay[], places: PlaceLookup) {
  const { granted } = await Calendar.requestCalendarPermissions();
  if (!granted) {
    Alert.alert("Calendar Access Needed", "Allow Kiwi Guide to use your calendars in Settings, then try again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Open Settings", onPress: () => void Linking.openSettings() },
    ]);
    return;
  }

  // The system's own calendar list, writable calendars only.
  const calendar = await Calendar.presentPicker();
  if (!calendar) return;

  const title = trip.title || "My Trip";
  const events = tripCalendarEvents(title, days, places);
  const ids: string[] = [];
  try {
    await removeEarlierEvents(trip.id);
    for (const e of events) {
      const created = await calendar.createEvent({
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        location: e.location,
        notes: e.notes,
        timeZone: NZ,
      });
      ids.push(created.id);
    }
  } catch (e) {
    Sentry.captureException(e);
    Alert.alert("Couldn't Add the Trip", "Please try again.");
    return;
  } finally {
    // Kept even after a failure, so the next try removes what this one added.
    await AsyncStorage.setItem(storeKey(trip.id), JSON.stringify(ids)).catch(() => {});
  }

  const stops = events.filter((e) => e.kind === "stop").length;
  const drives = events.length - stops;
  const added = `${stops} ${stops === 1 ? "place" : "places"}${drives ? ` and ${drives} ${drives === 1 ? "drive" : "drives"}` : ""}`;
  Alert.alert(
    "Added to Your Calendar",
    `${added} from ${title} are in ${calendar.title}.` +
      (looksLikeGoogle(calendar)
        ? ""
        : "\n\nTo see them in Google Calendar, add your Google account in the iPhone's Settings, under Calendar, then add the trip again."),
  );
}
