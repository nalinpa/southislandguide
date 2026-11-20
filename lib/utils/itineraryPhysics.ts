import { getLeg, type Leg, type PlaceLookup } from "./transitMatrix";
import { areaName } from "@/lib/areas";
import { PLANNER } from "@/lib/constants/gameplay";
import type { ItineraryDay, ItineraryItem } from "@/lib/models";

import { slotIndexToTimeLabel, slotsToDurationLabel } from "./slotLabels";

export { slotsToDurationLabel, slotIndexToTimeLabel } from "./slotLabels";

const { MAX_GRID_SLOTS } = PLANNER;

// How far down the timeline grid a time of day sits, in pixels from the first
// (8:00 AM) row, or null when it falls outside the grid (before 8 AM or after
// 10 PM). Used for the "now" line on today's plan.
export function timelineOffsetForMinutes(minutesSinceMidnight: number): number | null {
  const fromStart = minutesSinceMidnight - 8 * 60;
  if (fromStart < 0 || fromStart > PLANNER.MAX_GRID_SLOTS * 30) return null;
  return (fromStart / 30) * PLANNER.SLOT_HEIGHT;
}

// "11:30 AM – 12:30 PM", or "1:00 – 2:00 PM" when both ends are in the same half of the
// day: when a place starts and when it ends, for its block on the Days view.
export function slotRangeLabel(slotIndex: number, slots: number): string {
  const start = slotIndexToTimeLabel(slotIndex);
  const end = slotIndexToTimeLabel(slotIndex + slots);
  const [startClock, startPeriod] = start.split(" ");
  return `${startPeriod === end.split(" ")[1] ? startClock : start} – ${end}`;
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
    // The length's label too, so nothing stored can disagree with it: stops added from a
    // place used to store none, and older trips stored "0.5 Hours".
    durationLabel: slotsToDurationLabel(item.durationSlots || 2),
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

// The stop a new place at `slot` of a day would follow: that day's last item starting
// before it, else where the traveller was before the day.
export function stopBefore(days: ItineraryDay[], dayId: string, slot: number): string | undefined {
  const dayIndex = days.findIndex((d) => d.id === dayId);
  if (dayIndex < 0) return undefined;
  const before = (days[dayIndex].items ?? []).filter((i) => (i.slotIndex || 0) < slot);
  return before.length ? before[before.length - 1].siteId : dayStartSiteId(days, dayIndex);
}

export function packTrip(days: ItineraryDay[], places: PlaceLookup): ItineraryDay[] {
  return days.map((day, i) => ({ ...day, items: runPhysicsEngine(day.items ?? [], places, dayStartSiteId(days, i)) }));
}

// `move` is set on a drive only: the place it leads to (where a moved start is kept, as
// driveStartSlot) and the earliest and latest it can start.
export type DayLeg = Leg & {
  key: string;
  startSlot: number;
  move?: { intoId: string; earliest: number; latest: number };
};

// A drive starts where the user put it, kept between the end of the place before it (or
// 8 AM) and the start of the place it leads to. Not moved, it ends where that place
// starts, so spare time stays in the town being left.
function driveLeg(leg: Leg, key: string, into: ItineraryItem, earliest: number): DayLeg {
  const latest = Math.max(earliest, (into.slotIndex || 0) - leg.slots);
  const startSlot = Math.min(latest, Math.max(earliest, into.driveStartSlot ?? latest));
  return { ...leg, key, startSlot, move: { intoId: into.id, earliest, latest } };
}

// The travel on a packed day: one leg into each place after the first, and before
// them the opening drive when the day starts in a new area. A hop inside a town ends
// where the place it leads to starts; a drive starts where the user moved it, if they
// did (driveLeg). The day view draws these and keeps its free-gap cards out of them,
// from this one list.
export function dayLegs(items: ItineraryItem[], places: PlaceLookup, startFromSiteId?: string): DayLeg[] {
  const legs: DayLeg[] = [];
  if (startFromSiteId && items.length > 0) {
    const opening = getLeg(startFromSiteId, items[0].siteId, places);
    if (opening.drive) legs.push(driveLeg(opening, "opening", items[0], 0));
  }
  for (let i = 0; i < items.length - 1; i++) {
    const leg = getLeg(items[i].siteId, items[i + 1].siteId, places);
    if (leg.drive) legs.push(driveLeg(leg, items[i].id, items[i + 1], endSlot([items[i]])));
    else if (leg.slots > 0) legs.push({ ...leg, key: items[i].id, startSlot: (items[i + 1].slotIndex || 0) - leg.slots });
  }
  return legs;
}

export type DaySummary = {
  dayId: string;
  placeCount: number;
  // Area ids in visit order, the same one twice in a row once. A place with no known
  // area (not in the place list, or listed without one) is counted but names no town.
  // An empty day is in the town the day before ended in, as the planner takes it.
  areas: string[];
  openingDrive: { fromArea: string; slots: number } | null;
  // Every drive in the day, the opening one included, and any hop inside a town of an hour or more.
  driveSlots: number;
  overflows: boolean;
};

// One line per day for the trip view. `days` are packed, as the day timeline holds them.
// No rule about travel lives here: what is a drive, how long it is and where a day
// starts all come from dayLegs, so the trip view and the timeline can't disagree.
export function tripSummary(days: ItineraryDay[], places: PlaceLookup): DaySummary[] {
  return days.map((day, i) => {
    const items = day.items ?? [];
    const startFrom = dayStartSiteId(days, i);
    const legs = dayLegs(items, places, startFrom);
    const opening = legs.find((leg) => leg.key === "opening");
    const areas: string[] = [];
    // Nothing planned: the traveller is still where they were, which is also where the
    // next day's drive is counted from.
    const stayingIn = items.length === 0 && startFrom ? places(startFrom)?.area : undefined;
    if (stayingIn) areas.push(stayingIn);
    for (const item of items) {
      const area = places(item.siteId)?.area;
      if (area && areas[areas.length - 1] !== area) areas.push(area);
    }
    return {
      dayId: day.id,
      placeCount: items.length,
      areas,
      openingDrive: opening?.drive ? { fromArea: opening.drive.fromArea, slots: opening.slots } : null,
      driveSlots: legs.reduce((sum, leg) => sum + (leg.drive || leg.slots >= 2 ? leg.slots : 0), 0),
      overflows: dayOverflows(items),
    };
  });
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

// A trip's days re-dated from a new start and cut or padded to `count`: each day keeps
// its places and moves with the start; days past `count` are dropped, and new ones are
// empty. Dates only label the days; how a day is timed doesn't depend on them, so
// nothing needs re-packing.
export function redateTrip(
  days: ItineraryDay[],
  startDate: string,
  count: number,
  newDayId: () => string,
): ItineraryDay[] {
  const start = new Date(startDate + "T00:00:00");
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return days[i] ? { ...days[i], date: iso } : { id: newDayId(), date: iso, items: [] };
  });
}

export type EditResult = { ok: true; days: ItineraryDay[] } | { ok: false; reason: string };

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
