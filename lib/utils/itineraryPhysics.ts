import { getLeg, type Leg, type PlaceLookup } from "./transitMatrix";
import { areaLabel } from "@/lib/areas";
import { PLANNER } from "@/lib/constants/gameplay";
import type { ItineraryDay, ItineraryItem } from "@/lib/models";

const { MAX_GRID_SLOTS } = PLANNER;

// Grid starts at 8:00 AM; each slot is 30 minutes
export function slotsToDurationLabel(durationSlots: number): string {
  const hours = durationSlots / 2;
  return `${hours} Hour${hours !== 1 ? "s" : ""}`;
}

// How far down the timeline grid a time of day sits, in pixels from the first
// (8:00 AM) row, or null when it falls outside the grid (before 8 AM or after
// 10 PM). Used for the "now" line on today's plan.
export function timelineOffsetForMinutes(minutesSinceMidnight: number): number | null {
  const fromStart = minutesSinceMidnight - 8 * 60;
  if (fromStart < 0 || fromStart > PLANNER.MAX_GRID_SLOTS * 30) return null;
  return (fromStart / 30) * PLANNER.SLOT_HEIGHT;
}

export function slotIndexToTimeLabel(slotIndex: number): string {
  const totalMinutes = 8 * 60 + slotIndex * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function forwardCascade(packed: ItineraryItem[], places: PlaceLookup, startFromSiteId?: string): ItineraryItem[] {
  // A day that starts in a different area from where the one before ended opens
  // with the drive, counted from 8:00 AM. A night in the same area adds nothing.
  if (startFromSiteId && packed.length > 0) {
    const opening = getLeg(startFromSiteId, packed[0].siteId, places);
    if (opening.drive && (packed[0].slotIndex || 0) < opening.slots) {
      packed[0] = { ...packed[0], slotIndex: opening.slots };
    }
  }

  for (let i = 1; i < packed.length; i++) {
    const prev = packed[i - 1];
    const curr = packed[i];
    const transitRequired = getLeg(prev.siteId, curr.siteId, places).slots;
    const prevEnd = (prev.slotIndex || 0) + (prev.durationSlots || 2) + transitRequired;
    if ((curr.slotIndex || 0) < prevEnd) {
      packed[i] = { ...curr, slotIndex: prevEnd };
    }
  }
  return packed;
}

// Packs one day. `items` are in visit order and stay in it. `startFromSiteId` is the
// place the traveller was at before this day, if any. App code packs through packTrip
// or tryEdit, which work that out, so no caller can forget the day before.
export function runPhysicsEngine(items: ItineraryItem[], places: PlaceLookup, startFromSiteId?: string): ItineraryItem[] {
  if (items.length === 0) return items;
  let packed = [...items];

  // Forward cascade: push items right when they collide
  packed = forwardCascade(packed, places, startFromSiteId);

  // Reverse cascade: bounce back from the 10 PM hard limit
  const lastIdx = packed.length - 1;
  const lastItemEnd = (packed[lastIdx].slotIndex || 0) + (packed[lastIdx].durationSlots || 2);

  if (lastItemEnd > MAX_GRID_SLOTS) {
    packed[lastIdx] = {
      ...packed[lastIdx],
      slotIndex: MAX_GRID_SLOTS - (packed[lastIdx].durationSlots || 2),
    };

    for (let i = lastIdx - 1; i >= 0; i--) {
      const curr = packed[i];
      const next = packed[i + 1];
      const transitRequired = getLeg(curr.siteId, next.siteId, places).slots;
      const latestAllowedStart = (next.slotIndex || 0) - transitRequired - (curr.durationSlots || 2);

      if ((curr.slotIndex || 0) > latestAllowedStart) {
        packed[i] = { ...curr, slotIndex: Math.max(0, latestAllowedStart) };
      }
    }

    // Re-run forward cascade to resolve any overlaps created by clamping to slot 0
    // (and to put the first place back behind the opening drive)
    packed = forwardCascade(packed, places, startFromSiteId);
  }

  // Normalise timeLabel for every item so it always reflects the current slotIndex
  return packed.map((item) => ({
    ...item,
    timeLabel: slotIndexToTimeLabel(item.slotIndex || 0),
  }));
}

function endSlot(items: ItineraryItem[]): number {
  const last = items[items.length - 1];
  return last ? (last.slotIndex || 0) + (last.durationSlots || 2) : 0;
}

// The engine never drops or shortens a place, so a day with more in it than fits
// comes back ending past 10 PM. This is the check on that.
export function dayOverflows(items: ItineraryItem[]): boolean {
  return endSlot(items) > MAX_GRID_SLOTS;
}

// Where the traveller was before a day: the last place of the nearest earlier day
// that has any. The app doesn't know where they sleep, so a change of area overnight
// is always driven on the morning of the later day.
export function dayStartSiteId(days: ItineraryDay[], dayIndex: number): string | undefined {
  for (let i = dayIndex - 1; i >= 0; i--) {
    const items = days[i].items ?? [];
    if (items.length > 0) return items[items.length - 1].siteId;
  }
  return undefined;
}

export function packTrip(days: ItineraryDay[], places: PlaceLookup): ItineraryDay[] {
  return days.map((day, i) => ({ ...day, items: runPhysicsEngine(day.items ?? [], places, dayStartSiteId(days, i)) }));
}

export type DayLeg = Leg & { key: string; startSlot: number };

// The travel on a packed day: one leg into each place after the first, and before
// them the opening drive when the day starts in a new area. A leg ends where the
// place it leads to starts, so spare time stays in the town being left. The day view
// draws these and keeps its free-gap cards out of them, from this one list.
export function dayLegs(items: ItineraryItem[], places: PlaceLookup, startFromSiteId?: string): DayLeg[] {
  const legs: DayLeg[] = [];
  if (startFromSiteId && items.length > 0) {
    const opening = getLeg(startFromSiteId, items[0].siteId, places);
    if (opening.drive) {
      legs.push({ ...opening, key: "opening", startSlot: Math.max(0, (items[0].slotIndex || 0) - opening.slots) });
    }
  }
  for (let i = 0; i < items.length - 1; i++) {
    const leg = getLeg(items[i].siteId, items[i + 1].siteId, places);
    if (leg.slots > 0) legs.push({ ...leg, key: items[i].id, startSlot: (items[i + 1].slotIndex || 0) - leg.slots });
  }
  return legs;
}

// The one way a place changes day: out of the day it is in, into the other by its
// time. Deciding which days to offer and making the move both go through here, so
// a day that is offered is a day the move fits.
export function moveItemToDay(days: ItineraryDay[], itemId: string, toDayId: string): ItineraryDay[] {
  const item = days.flatMap((d) => d.items ?? []).find((i) => i.id === itemId);
  if (!item) return days;
  return days.map((day) => {
    const rest = (day.items ?? []).filter((i) => i.id !== itemId);
    if (day.id !== toDayId) return { ...day, items: rest };
    return { ...day, items: [...rest, item].sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0)) };
  });
}

export type EditResult = { ok: true; days: ItineraryDay[] } | { ok: false; reason: string };

const areaName = (id: string) => areaLabel(id) ?? id;

// The gate every edit goes through. `current` is the trip as it stands, `next` as the
// edit would leave it (each day in visit order), `editedDayId` the day the user is
// working on. Comes back packed, or refused with the reason in words.
//
// Refused when any day would end past 10 PM later than it does now. The whole trip
// is checked because changing a day's last place changes the drive the next day opens
// with. "Later than it does now", so a trip already running late (saved before drive
// times, or before a time was raised) can still be edited back into shape.
export function tryEdit(current: ItineraryDay[], next: ItineraryDay[], editedDayId: string, places: PlaceLookup): EditResult {
  const before = packTrip(current, places);
  const days = packTrip(next, places);
  const bad = days.findIndex((day) => {
    const was = before.find((d) => d.id === day.id);
    return dayOverflows(day.items) && endSlot(day.items) > endSlot(was?.items ?? []);
  });
  if (bad === -1) return { ok: true, days };

  const day = days[bad];
  const legs = dayLegs(day.items, places, dayStartSiteId(days, bad));

  if (day.id !== editedDayId) {
    const n = current.findIndex((d) => d.id === day.id) + 1;
    const opening = legs.find((l) => l.key === "opening")?.drive;
    const why = opening ? ` after the drive from ${areaName(opening.fromArea)}` : "";
    return { ok: false, reason: `Day ${n} would no longer fit${why}. Make room on Day ${n} first.` };
  }

  const drive = legs.find((l) => l.drive)?.drive;
  return {
    ok: false,
    reason: drive
      ? `There isn't time for the drive to ${areaName(drive.toArea)} on this day. Try a different day or a shorter visit.`
      : "This day is full. Try a different day or shorten the visit.",
  };
}
