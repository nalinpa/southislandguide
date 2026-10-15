// components/itinerary/ItineraryDetailView.tsx
//
// Extracted from app/(app)/(tabs)/itinerary/[itineraryId].tsx so it can be
// rendered two ways: as the routed detail screen (tripId from the URL), or
// rendered directly inline by itinerary/index.tsx for a non-premium user's
// single trip — no cross-route navigation, so the Tabs navigator never loses
// track of which tab it's on. See TASKS.md for the bug this fixed: the old
// router.push/replace-based auto-redirect could leave the tab stuck showing
// a permanent loading state after navigating away and back.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, AppState, Alert, Modal, PanResponder } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { randomUUID } from "expo-crypto";
import { Plus, MoreHorizontal, X } from "lucide-react-native";
import * as Sentry from "@sentry/react-native";

import { Screen, LoadingState, ErrorCard, AppText, AppIconButton, components } from "@/lib/uiKit";
import { TopBar } from "@/components/layout/TopBar";
import { EditItemModal } from "@/components/itinerary/EditItemModal";
import { PremiumFeatureModal } from "@/components/itinerary/PremiumFeatureModal";
import { DeleteTripModal } from "@/components/itinerary/DeleteTripModal";
import { NoteCard } from "@/components/itinerary/NoteCard";
import { DriveBlock } from "@/components/itinerary/DriveBlock";
import { TripOverview } from "@/components/itinerary/TripOverview";
import { TripViewSwitch, type TripView } from "@/components/itinerary/TripViewSwitch";
import { daySwipeHandlers } from "@/components/itinerary/daySwipe";
import { tokens } from "@/lib/ui/tokens";
import { useSession } from "@/lib/providers/SessionProvider";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { useEntitlementGate } from "@/lib/hooks/useEntitlementGate";
import { usePlaceLookup } from "@/lib/hooks/usePlaceLookup";
import { usePurchaseContext } from "@/lib/iap/PurchaseProvider";
import {
  dayLegs,
  dayStartSiteId,
  moveItemToDay,
  packTrip,
  slotsToDurationLabel,
  timelineOffsetForMinutes,
  tryEdit,
  type DayLeg,
} from "@/lib/utils/itineraryPhysics";
import { areaName } from "@/lib/areas";
import { areaImage } from "@/lib/areaImages";
import { PLANNER } from "@/lib/constants/gameplay";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import type { Itinerary, ItineraryDay, ItineraryItem } from "@/lib/models";

const { SLOT_HEIGHT, MAX_GRID_SLOTS } = PLANNER;

const generateTimeSlots = () => {
  const slots = [];
  for (let i = 0; i <= MAX_GRID_SLOTS; i++) {
    const totalMinutes = 8 * 60 + i * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    slots.push({
      id: `${hours}:${minutes.toString().padStart(2, "0")}`,
      label: minutes === 0 ? `${displayHour}:00 ${ampm}` : "",
    });
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

function localIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

const bySlot = (a: ItineraryItem, b: ItineraryItem) => (a.slotIndex || 0) - (b.slotIndex || 0);

export type ItineraryDetailViewProps = {
  tripId: string;
  jumpToDay?: string;
  jumpToSlot?: string;
};

export function ItineraryDetailView({ tripId, jumpToDay, jumpToSlot }: ItineraryDetailViewProps) {
  const { itineraries, loading, error, refetch, saveItinerary, deleteItinerary } = useItineraries();
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const {
    entitledProductIds,
    loading: entitlementsLoading,
    unknown: entitlementsUnknown,
    recheck: recheckEntitlements,
  } = useEntitlementGate(uid);
  const isEntitled = entitledProductIds.has(FULL_GUIDE_PRODUCT_ID);
  const { requestBuy } = usePurchaseContext();
  // The planner needs each place's area to know the drive between two of them. Nothing
  // below packs, draws or edits a day until the list is in (placesReady): against an
  // empty one every drive would be the flat half hour.
  const {
    places,
    list: placeList,
    ready: placesReady,
    count: placeCount,
    err: placesErr,
    refresh: refreshPlaces,
  } = usePlaceLookup();
  const imageForArea = useCallback((areaId: string) => areaImage(areaId, placeList), [placeList]);
  const sourceTrip = itineraries.find((i) => i.id === tripId) ?? null;

  const [localTrip, setLocalTrip] = useState<Itinerary | null>(sourceTrip);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const activeDay = localTrip?.days.find((d) => d.id === activeDayId) || localTrip?.days[0];
  // A trip opens on its trip view (every day on one page); the day timeline is the other
  // half of the switch. Opened to show a particular day (after adding a place), it starts
  // on that day. Kept apart from the open day on purpose: saving is keyed on the open
  // day through the refs below, so a day stays open while the trip view is up.
  const [view, setView] = useState<TripView>(jumpToDay ? "days" : "trip");

  // The "now" line: only on today's day, and only between 8 AM and 10 PM.
  // Re-read once a minute while the screen is open.
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setNowMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);
  const isToday = activeDay?.date === localIsoDate(new Date());
  const nowTop = isToday ? timelineOffsetForMinutes(nowMinutes) : null;

  // Opening today's day, start with "now" in the upper part of the screen
  // rather than at 8 AM. Keyed on the day and the view only (the timeline is drawn
  // afresh each time it is swapped to): it must not re-scroll each minute as the line moves.
  const timelineScrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (nowTop != null) timelineScrollRef.current?.scrollTo({ y: Math.max(0, nowTop - 120), animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, activeDay?.id, view]);
  const [localItems, setLocalItems] = useState<ItineraryItem[]>([]);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [viewingNote, setViewingNote] = useState<ItineraryItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPremiumMove, setShowPremiumMove] = useState(false);

  // The paywall modals stay up through the purchase so it has somewhere to report progress
  // and failure. Nothing else dismisses this one, so retire it once the unlock lands.
  // (EditItemModal needs no equivalent: its unlock card turns into the day buttons.)
  useEffect(() => {
    if (isEntitled) setShowPremiumMove(false);
  }, [isEntitled]);

  // The travel on the open day: the hop or drive into each place, and the drive the day
  // opens with when the day before ended in another area. Drawn below, and kept clear
  // of the free-gap cards, from this one list, so a card can never sit on a drive.
  const legs = useMemo(() => {
    if (!localTrip) return [];
    const dayIndex = localTrip.days.findIndex((d) => d.id === activeDay?.id);
    return dayLegs(localItems, places, dayStartSiteId(localTrip.days, dayIndex));
  }, [localItems, localTrip, activeDay?.id, places]);
  const legAfter = useMemo(() => new Map(legs.map((leg) => [leg.key, leg])), [legs]);

  const freeGaps = useMemo(() => {
    const occupied = new Set<number>();
    for (const item of localItems) {
      const start = item.slotIndex ?? 0;
      for (let s = start; s < start + (item.durationSlots ?? 2); s++) occupied.add(s);
    }
    for (const leg of legs) {
      for (let s = Math.max(0, leg.startSlot); s < leg.startSlot + leg.slots; s++) occupied.add(s);
    }
    const gaps: { start: number; end: number }[] = [];
    let gs = -1;
    for (let s = 0; s < MAX_GRID_SLOTS; s++) {
      if (!occupied.has(s)) {
        if (gs === -1) gs = s;
      } else if (gs !== -1) {
        gaps.push({ start: gs, end: s });
        gs = -1;
      }
    }
    if (gs !== -1) gaps.push({ start: gs, end: MAX_GRID_SLOTS });
    return gaps.filter((g) => g.end - g.start >= 5);
  }, [localItems, legs]);

  const latestItemsRef = useRef(localItems);
  const tripRef = useRef(localTrip);
  const activeDayIdRef = useRef(activeDay?.id);
  const hasUnsavedChanges = useRef(false);
  const saveItineraryRef = useRef(saveItinerary);
  const jumpAppliedRef = useRef<string | null>(null);
  const correctedTripIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasUnsavedChanges.current) setLocalTrip(sourceTrip);
  }, [sourceTrip]);
  useEffect(() => {
    if (!loading && !entitlementsLoading && !error && !localTrip) {
      router.replace("/(app)/(tabs)/itinerary");
    }
  }, [loading, entitlementsLoading, error, localTrip]);
  useEffect(() => {
    saveItineraryRef.current = saveItinerary;
  }, [saveItinerary]);

  // Every save on this screen goes through here. Offline the mutation pauses and
  // resolves on reconnect, so this only fires on a real failure — which used to
  // reject unhandled, leaving the edit on screen looking saved and reaching Sentry
  // as a stack with no app frames. Keep the change dirty so the next save attempt
  // (leaving the screen, backgrounding, switching day) retries it.
  const saveFailedRef = useRef(false);
  const saveTrip = useCallback(async (data: Partial<Itinerary>) => {
    try {
      await saveItineraryRef.current(data);
      saveFailedRef.current = false;
      return true;
    } catch (e) {
      hasUnsavedChanges.current = true;
      Sentry.captureException(e);
      // One alert at a time: a retry that fails again shouldn't stack another.
      if (!saveFailedRef.current) {
        saveFailedRef.current = true;
        Alert.alert(
          "Couldn't Save Changes",
          "Your changes are still here and we'll try again when you leave this screen. Check your connection if this keeps happening.",
        );
      }
      return false;
    }
  }, []);
  useEffect(() => {
    latestItemsRef.current = localItems;
  }, [localItems]);
  useEffect(() => {
    tripRef.current = localTrip;
  }, [localTrip]);
  useEffect(() => {
    activeDayIdRef.current = activeDay?.id;
  }, [activeDay?.id]);
  // The day Days opens on: today's, when the trip is under way (a trip can run three
  // weeks or more, and on the road today is the one that matters), otherwise the first.
  useEffect(() => {
    if (!localTrip?.days[0]?.id || activeDayId) return;
    const today = localIsoDate(new Date());
    setActiveDayId((localTrip.days.find((d) => d.date === today) ?? localTrip.days[0]).id);
  }, [localTrip, activeDayId]);

  // The day strip keeps the open day's tab in the middle, wherever it is along the strip:
  // a long trip has far more days than fit across the screen. Positions come from layout,
  // so a tab that hasn't been laid out yet is scrolled to when it is.
  const dayStripRef = useRef<ScrollView>(null);
  const dayStripWidth = useRef(0);
  const dayTabFrames = useRef<Record<string, { x: number; width: number }>>({});
  const scrollStripTo = (dayId: string | undefined, animated: boolean) => {
    const tab = dayId ? dayTabFrames.current[dayId] : undefined;
    if (!tab || !dayStripWidth.current) return;
    dayStripRef.current?.scrollTo({ x: Math.max(0, tab.x + tab.width / 2 - dayStripWidth.current / 2), animated });
  };
  useEffect(() => {
    if (view === "days") scrollStripTo(activeDay?.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDay?.id, view]);

  // On trip load, run physics across every day and save once if any overlaps were found.
  // Once per trip and per place list (placeCount): a trip stored before a place's drive
  // was known is re-timed the first time it opens with the list in.
  // ponytail: a stored day with more in it than fits (saved before drive times, or before
  // a time in lib/areas.ts was raised) comes back ending past 10 PM and is saved that way,
  // with nothing on screen to say so. Add a notice on the day if times change after release.
  useEffect(() => {
    if (!localTrip || !placesReady || hasUnsavedChanges.current) return;
    const key = `${localTrip.id}|${placeCount}`;
    if (correctedTripIdRef.current === key) return;
    correctedTripIdRef.current = key;

    const sortedDays = localTrip.days.map((day) => ({ ...day, items: [...(day.items ?? [])].sort(bySlot) }));
    const packedDays = packTrip(sortedDays, places);
    const anyFixed = packedDays.some((day, d) =>
      day.items.some((item, i) => item.slotIndex !== sortedDays[d].items[i].slotIndex),
    );

    if (anyFixed) {
      const fixedTrip = { ...localTrip, days: packedDays };
      setLocalTrip(fixedTrip);
      saveTrip({ id: fixedTrip.id, days: fixedTrip.days });
    }
  }, [localTrip?.id, placesReady, placeCount]);

  useEffect(() => {
    if (localTrip && activeDay?.items && placesReady && !hasUnsavedChanges.current) {
      const sorted = [...activeDay.items].sort(bySlot);
      const dayIndex = localTrip.days.findIndex((d) => d.id === activeDay.id);
      const packed = packTrip(
        localTrip.days.map((d) => (d.id === activeDay.id ? { ...d, items: sorted } : d)),
        places,
      )[dayIndex].items;
      const needsCorrection = sorted.some((item, i) => item.slotIndex !== packed[i].slotIndex);
      setLocalItems(packed);
      latestItemsRef.current = packed;
      if (needsCorrection) hasUnsavedChanges.current = true;
    }
  }, [activeDay?.id, activeDay?.items, placesReady, placeCount]);

  const flushSave = useCallback(() => {
    if (hasUnsavedChanges.current && tripRef.current && activeDayIdRef.current) {
      const currentTrip = tripRef.current;
      const updatedDays = currentTrip.days.map((day) =>
        day.id === activeDayIdRef.current ? { ...day, items: latestItemsRef.current } : day,
      );
      saveTrip({ id: currentTrip.id, days: updatedDays });
      hasUnsavedChanges.current = false;
    }
  }, []);

  useFocusEffect(useCallback(() => () => flushSave(), [flushSave]));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") flushSave();
    });
    return () => subscription.remove();
  }, [flushSave]);

  useEffect(() => {
    // Each jump once, not the first jump only: this screen stays mounted between visits,
    // so the second place added to the trip arrives here as new params.
    // ponytail: a jump to the same day and slot as the last one is taken for the same jump.
    const jump = `${jumpToDay}|${jumpToSlot ?? ""}`;
    if (!jumpToDay || jumpAppliedRef.current === jump || !localTrip) return;
    jumpAppliedRef.current = jump;
    setView("days");
    const dayExists = localTrip.days.some((d) => d.id === jumpToDay);
    if (dayExists && jumpToDay !== activeDayId) {
      flushSave();
      hasUnsavedChanges.current = false;
      setActiveDayId(jumpToDay);
    }
  }, [jumpToDay, jumpToSlot, localTrip, activeDayId, flushSave]);

  // The trip as it stands on screen: the stored days, with the open day's items as
  // edited. From the refs, not state: handlers called back to back in one tick (see
  // handleMoveDay) must each see what the one before did.
  const currentDays = (): ItineraryDay[] =>
    (tripRef.current?.days ?? []).map((d) =>
      d.id === activeDayIdRef.current ? { ...d, items: latestItemsRef.current } : d,
    );
  const withOpenDayItems = (items: ItineraryItem[]): ItineraryDay[] =>
    currentDays().map((d) => (d.id === activeDayIdRef.current ? { ...d, items } : d));

  // Every edit goes through here, and so through the planner's gate (tryEdit): given
  // the trip as the edit would leave it, hands back every day packed, or null after
  // telling the user why it can't be done. The whole trip, because changing one day's
  // last place changes the drive the next day opens with.
  const applyEdit = (nextDays: ItineraryDay[], editedDayId: string): ItineraryDay[] | null => {
    const result = tryEdit(currentDays(), nextDays, editedDayId, places);
    if (result.ok) return result.days;
    Alert.alert("Not Enough Time", result.reason);
    return null;
  };

  // Puts an applied edit on screen and marks it for saving. All the days, not just the
  // open one: the edit may have re-timed the day after, and flushSave sends the lot.
  const showDays = (days: ItineraryDay[]) => {
    const trip = tripRef.current;
    if (!trip) return;
    const nextTrip = { ...trip, days };
    const items = days.find((d) => d.id === activeDayIdRef.current)?.items ?? [];
    hasUnsavedChanges.current = true;
    tripRef.current = nextTrip;
    latestItemsRef.current = items;
    setLocalTrip(nextTrip);
    setLocalItems(items);
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTripMenu, setShowTripMenu] = useState(false);

  const handleConfirmDeleteItinerary = async () => {
    if (!localTrip) return;
    setShowDeleteConfirm(false);
    hasUnsavedChanges.current = false;
    await deleteItinerary(localTrip.id);
    router.replace("/(app)/(tabs)/itinerary");
  };

  const handleDeleteDay = (dayId: string) => {
    Alert.alert("Delete Day", "Remove this day? Any items on it will be lost.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (!localTrip) return;
          // Without this day, the one after it follows a different place, and may now
          // open with a drive it has no room for.
          const remainingDays = applyEdit(
            currentDays().filter((d) => d.id !== dayId),
            dayId,
          );
          if (!remainingDays) return;

          // Re-date sequentially from startDate so the trip's date range never
          // has a gap where a deleted middle day used to be — a 3-day trip
          // loses a day and becomes a 2-day trip, it doesn't keep spanning 3
          // calendar days with only 2 day entries.
          const start = new Date(localTrip.startDate + "T00:00:00");
          const updatedDays = remainingDays.map((d, i) => {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            return { ...d, date: localIsoDate(date) };
          });
          const newEndDate = updatedDays[updatedDays.length - 1]?.date ?? localTrip.startDate;
          const nextTrip = { ...localTrip, days: updatedDays, endDate: newEndDate };
          setLocalTrip(nextTrip);
          if (dayId === activeDayId) setActiveDayId(updatedDays[0]?.id ?? null);
          hasUnsavedChanges.current = false;
          saveTrip({ id: nextTrip.id, days: nextTrip.days, endDate: nextTrip.endDate });
        },
      },
    ]);
  };

  const handleSwitchDay = (dayId: string) => {
    if (dayId === activeDayId) return;
    flushSave();
    hasUnsavedChanges.current = false;
    setActiveDayId(dayId);
  };

  // A sideways swipe on the timeline: the next day or the one before, nothing past either
  // end. Made once; it reads the day it's on through this ref.
  const swipeDayRef = useRef<(step: 1 | -1) => void>(() => {});
  swipeDayRef.current = (step) => {
    const days = tripRef.current?.days ?? [];
    const next = days[days.findIndex((d) => d.id === activeDayIdRef.current) + step];
    if (next) handleSwitchDay(next.id);
  };
  const daySwipe = useRef(PanResponder.create(daySwipeHandlers((step) => swipeDayRef.current(step)))).current;

  // Swapping to the trip view saves first, as switching day does, so the trip view never
  // sits over an edit that hasn't been sent.
  const handleChangeView = (next: TripView) => {
    if (next === "trip") flushSave();
    setView(next);
  };

  // A row on the trip view. The view is set before the day: handleSwitchDay does nothing
  // for the day that is already open, and that day's row still has to open its timeline.
  const handleOpenDay = (dayId: string) => {
    setView("days");
    handleSwitchDay(dayId);
  };

  const handleAddDay = async () => {
    if (!localTrip) return;

    const validDates = localTrip.days.map((d) => d.date).filter((date) => !!date).sort();
    let nextDate = localIsoDate(new Date());
    if (validDates.length > 0) {
      const last = new Date(validDates[validDates.length - 1] + "T00:00:00");
      last.setDate(last.getDate() + 1);
      nextDate = localIsoDate(last);
    }

    // Creating a trip already checks for date overlap against other trips
    // (CreateItineraryModal) — extending one via Add Day grows its endDate
    // the same way and needs the same check, or it can silently grow into
    // another trip's dates.
    const conflict = itineraries.find(
      (itin) => itin.id !== localTrip.id && localTrip.startDate <= itin.endDate && nextDate >= itin.startDate,
    );
    if (conflict) {
      Alert.alert(
        "Dates overlap",
        `Adding this day would overlap with "${conflict.title}". Shorten that trip first, or pick different dates.`,
      );
      return;
    }

    flushSave();

    const newDayId = `day_${randomUUID()}`;
    const newDay = { id: newDayId, date: nextDate, items: [] };
    const updatedDays = [...localTrip.days, newDay];
    const nextTrip = { ...localTrip, days: updatedDays, endDate: nextDate };

    setLocalTrip(nextTrip);
    setActiveDayId(newDayId);
    await saveTrip({ id: nextTrip.id, days: nextTrip.days, endDate: nextTrip.endDate });
  };

  const handleDrop = (itemId: string, requestedSlotIndex: number): number => {
    if (!localTrip || !activeDay) return requestedSlotIndex;

    const otherItems = localItems.filter((item) => item.id !== itemId);
    const movedItem = localItems.find((item) => item.id === itemId);
    if (!movedItem) return requestedSlotIndex;

    if (!isEntitled) {
      setShowPremiumMove(true);
      return movedItem.slotIndex;
    }

    const itemSize = movedItem.durationSlots || 2;
    const targetSlot = Math.max(0, Math.min(requestedSlotIndex, MAX_GRID_SLOTS - itemSize));

    const getCenter = (item: ItineraryItem, isMovedItem: boolean) => {
      const start = isMovedItem ? targetSlot : item.slotIndex || 0;
      const duration = item.durationSlots || 2;
      return start + duration / 2;
    };

    const updatedItems = [...otherItems, { ...movedItem, slotIndex: targetSlot }];
    updatedItems.sort((a, b) => getCenter(a, a.id === itemId) - getCenter(b, b.id === itemId));

    // Refused (a new order can add a drive the day has no room for): the block springs
    // back to where it was, as it does for a user who can't reorder.
    const days = applyEdit(withOpenDayItems(updatedItems), activeDay.id);
    if (!days) return movedItem.slotIndex;
    showDays(days);

    const finalizedMovedItem = latestItemsRef.current.find((item) => item.id === itemId);
    return finalizedMovedItem?.slotIndex ?? targetSlot;
  };

  // A drive moved within its gap: where it now starts is kept on the place it leads to.
  // It changes no time a place starts, so nothing can stop fitting and the gate has
  // nothing to check. Moving is for an entitled user, as reordering places is.
  const handleMoveDrive = (intoId: string, startSlot: number): number => {
    const was = legs.find((leg) => leg.move?.intoId === intoId)?.startSlot ?? startSlot;
    if (!isEntitled) {
      setShowPremiumMove(true);
      return was;
    }
    showDays(
      withOpenDayItems(
        latestItemsRef.current.map((item) => (item.id === intoId ? { ...item, driveStartSlot: startSlot } : item)),
      ),
    );
    return startSlot;
  };

  const handleSaveEdit = (itemId: string, newDurationSlots: number, note: string) => {
    const dayId = activeDayIdRef.current;
    const current = latestItemsRef.current.find((item) => item.id === itemId);
    if (!dayId || !current) return;

    const withDuration = (durationSlots: number) =>
      withOpenDayItems(
        latestItemsRef.current.map((item) =>
          item.id === itemId
            ? { ...item, durationSlots, durationLabel: slotsToDurationLabel(durationSlots), note: note || undefined }
            : item,
        ),
      );
    // A longer visit the day has no room for is refused, but the note that came with
    // it is kept, at the length the visit already had.
    const days = applyEdit(withDuration(newDurationSlots), dayId) ?? packTrip(withDuration(current.durationSlots || 2), places);
    showDays(days);
    setEditingItem(null);
  };

  const handleRemoveItem = (itemId: string) => {
    const dayId = activeDayIdRef.current;
    if (!dayId) return;
    // Taking away a day's last place can leave the next day opening with a drive it
    // has no room for. Refused then, and the editor stays up.
    const days = applyEdit(withOpenDayItems(latestItemsRef.current.filter((item) => item.id !== itemId)), dayId);
    if (!days) return;
    showDays(days);
    setEditingItem(null);
  };

  const handleMoveDay = async (itemId: string, newDayId: string) => {
    const currentTrip = tripRef.current;
    const currentActiveDayId = activeDayIdRef.current;
    if (!currentTrip || !currentActiveDayId) return;

    // Read from the ref, not the `localItems` state: EditItemModal's handleMove calls
    // handleSaveEdit (which updates this ref synchronously) immediately before onMoveDay,
    // in the same event-handler tick. React batches the setLocalItems from that save, so
    // `localItems` here would still be the pre-save value; the ref is not batched.
    if (!latestItemsRef.current.some((i) => i.id === itemId)) return;

    // The same move the editor's day list was built from (moveItemToDay), so a day
    // that was offered is one this fits on.
    const updatedDays = applyEdit(moveItemToDay(currentDays(), itemId, newDayId), newDayId);
    setEditingItem(null);
    if (!updatedDays) return;

    const nextTrip = { ...currentTrip, days: updatedDays };
    const newDayItems = updatedDays.find((d) => d.id === newDayId)?.items ?? [];

    // The refs too, now rather than after the next render: a save in between would
    // otherwise write the new day's places into the old day.
    tripRef.current = nextTrip;
    activeDayIdRef.current = newDayId;
    setLocalTrip(nextTrip);
    setActiveDayId(newDayId);
    setLocalItems(newDayItems);
    latestItemsRef.current = newDayItems;

    hasUnsavedChanges.current = true;
    // Only clear the flag if it actually saved — saveTrip leaves it set on failure
    // so the retry on leaving the screen still has the move to send.
    const saved = await saveTrip({ id: nextTrip.id, days: nextTrip.days });
    if (saved) hasUnsavedChanges.current = false;
  };

  if (loading || entitlementsLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState label="Loading your trip..." />
      </SafeAreaView>
    );
  }

  if (error && !localTrip) {
    return (
      <Screen>
        <ErrorCard title="Couldn't load your trip" message={error} action={{ label: "Try Again", onPress: () => refetch() }} />
      </Screen>
    );
  }

  if (!localTrip) {
    // Deleting this trip invalidates the shared itineraries query, so this
    // screen briefly re-renders with the trip already gone from the list
    // before router.replace in handleConfirmDeleteItinerary swaps it out —
    // a loading state here instead of a blank screen covers that gap.
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState label="Loading your trip..." />
      </SafeAreaView>
    );
  }

  if (!placesReady) {
    return placesErr ? (
      <Screen>
        <ErrorCard
          title="Couldn't load your trip"
          message="We couldn't load the places on it. Check your connection and try again."
          action={{ label: "Try Again", onPress: () => void refreshPlaces() }}
        />
      </Screen>
    ) : (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState label="Loading your trip..." />
      </SafeAreaView>
    );
  }

  const renderLeg = (leg: DayLeg) =>
    leg.drive ? (
      <DriveBlock
        key={`drive_${leg.key}`}
        fromLabel={areaName(leg.drive.fromArea)}
        toLabel={areaName(leg.drive.toArea)}
        startSlot={leg.startSlot}
        slots={leg.slots}
        earliest={leg.move?.earliest}
        latest={leg.move?.latest}
        onMove={leg.move ? (slot) => handleMoveDrive(leg.move!.intoId, slot) : undefined}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
      />
    ) : (
      <components.TransitBlock
        key={`transit_${leg.key}`}
        transitSize={leg.slots}
        top={leg.startSlot * SLOT_HEIGHT}
        height={leg.slots * SLOT_HEIGHT}
      />
    );

  // For the stop editor's "move to" list: a day is offered only if this very move
  // (moveItemToDay, the one handleMoveDay makes) passes the gate.
  const daysNow = editingItem ? currentDays() : [];
  const cannotMoveTo = (dayId: string) =>
    !!editingItem && !tryEdit(daysNow, moveItemToDay(daysNow, editingItem.id, dayId), dayId, places).ok;

  return (
    <View style={styles.safeArea}>
      {/* The brand bar: the Trip | Days switch, and under Days the day tabs as the
          bar's bottom edge. They aren't the shared TopBarTabs: each has a date under
          it and, when open, a delete X, and the strip ends in Add Day. Colours match
          TopBarTabs. */}
      {/* No title row: on a phone the timeline needs the room. The trip's name heads the
          trip view instead (TripOverview), and the menu sits beside the switch. */}
      <TopBar flushBottom={view === "days"}>
        <View style={styles.switchRow}>
          <TripViewSwitch view={view} onChange={handleChangeView} style={styles.switch} />
          <AppIconButton
            icon={MoreHorizontal}
            variant="control"
            onPress={() => setShowTripMenu(true)}
            accessibilityLabel="Trip options"
          />
        </View>
        {view === "days" && (
          <ScrollView
            ref={dayStripRef}
            testID="day-strip"
            onLayout={(e) => {
              dayStripWidth.current = e.nativeEvent.layout.width;
              scrollStripTo(activeDay?.id, false);
            }}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabStrip}
            contentContainerStyle={styles.tabScroll}
          >
            {localTrip.days.map((day, index) => {
              const isActive = day.id === activeDayId;
              const canDelete = isActive && index > 0;
              return (
                <TouchableOpacity
                  key={day.id}
                  testID={`day-tab-${day.id}`}
                  onPress={() => handleSwitchDay(day.id)}
                  onLayout={(e) => {
                    dayTabFrames.current[day.id] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
                    if (isActive) scrollStripTo(day.id, false);
                  }}
                  style={styles.dayTab}
                >
                  <View style={styles.dayTabContent}>
                    <View>
                      <AppText style={[styles.dayTabText, isActive && styles.dayTabTextActive]}>Day {index + 1}</AppText>
                      <AppText style={[styles.dayTabDate, isActive && styles.dayTabDateActive]}>
                        {formatDayDate(day.date)}
                      </AppText>
                    </View>
                    {canDelete && (
                      <TouchableOpacity
                        onPress={() => handleDeleteDay(day.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.dayDeleteBtn}
                      >
                        <X size={14} color="#FFFFFF" strokeWidth={2.5} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={[styles.dayTabIndicator, isActive && styles.dayTabIndicatorActive]} />
                </TouchableOpacity>
              );
            })}
            {isEntitled && localTrip.days.length < PLANNER.MAX_TRIP_DAYS && (
              <TouchableOpacity onPress={handleAddDay} style={styles.addDayBtn}>
                <Plus color="#FFFFFF" size={16} strokeWidth={2.5} />
                <AppText style={styles.addDayText}>Add Day</AppText>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </TopBar>

      {view === "trip" ? (
        <TripOverview
          title={localTrip.title || "My Trip"}
          days={localTrip.days}
          places={places}
          imageFor={imageForArea}
          onOpenDay={handleOpenDay}
        />
      ) : (
        <ScrollView
          ref={timelineScrollRef}
          showsVerticalScrollIndicator={false}
          style={styles.timelineScroll}
          scrollEnabled={!isDragging}
        >
          <View testID="timeline" style={styles.timelineContainer} {...daySwipe.panHandlers}>
            {/* tokens.space.md is the container's paddingTop, above the 8 AM row. */}
            {nowTop != null && (
              <View
                testID="now-line"
                pointerEvents="none"
                style={[styles.nowLine, { top: nowTop + tokens.space.md }]}
              />
            )}
            {TIME_SLOTS.map((slot) => {
              const isHour = slot.label !== "";
              return (
                <View key={slot.id} style={styles.gridRow}>
                  <View style={styles.timeLabelContainer}>
                    {isHour ? <AppText style={styles.timeLabel}>{slot.label}</AppText> : null}
                  </View>
                  <View style={isHour ? styles.hourDivider : styles.halfHourDivider} />
                </View>
              );
            })}

            {/* In the order of the day (the opening drive, then each place and the leg
                that leaves it), so a screen reader reads it top to bottom. */}
            {legAfter.has("opening") ? renderLeg(legAfter.get("opening")!) : null}

            {localItems.map((item) => (
              <Fragment key={item.id}>
                <components.TimelineBlock
                  item={item}
                  maxSlots={TIME_SLOTS.length}
                  slotHeight={SLOT_HEIGHT}
                  onDrop={handleDrop}
                  onDragStart={() => {
                    hasUnsavedChanges.current = true;
                    setIsDragging(true);
                  }}
                  onDragEnd={() => setIsDragging(false)}
                  onEdit={(item) => setEditingItem(item as ItineraryItem)}
                  onNotePress={(item) => setViewingNote(item as ItineraryItem)}
                />
                {legAfter.has(item.id) ? renderLeg(legAfter.get(item.id)!) : null}
              </Fragment>
            ))}

            {localItems.length === 0 ? (
              // Matches AKL's plans.tsx: three copies spread across the grid
              // (top/middle/bottom thirds) instead of one card appended after
              // all 28 slot rows, so it reads as sitting on the timeline
              // rather than as a footer below it.
              ([0, 1, 2] as const).map((i) => {
                const sectionSlots = Math.floor(MAX_GRID_SLOTS / 3);
                return (
                  <View
                    key={`empty_${i}`}
                    style={[styles.gapContainer, { top: i * sectionSlots * SLOT_HEIGHT, height: sectionSlots * SLOT_HEIGHT }]}
                  >
                    <TouchableOpacity
                      style={styles.emptyDayCard}
                      onPress={() => router.push("/(app)/(tabs)/sites")}
                      activeOpacity={0.7}
                    >
                      <AppText variant="body" style={styles.emptyDayTitle}>
                        Nothing here yet
                      </AppText>
                      <AppText variant="label" status="hint" style={styles.emptyDayBody}>
                        Browse places and tap "+ Add to Itinerary" to build this day.
                      </AppText>
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              freeGaps.map((gap) => (
                <View
                  key={`gap_${gap.start}`}
                  testID="free-gap"
                  style={[styles.gapContainer, { top: gap.start * SLOT_HEIGHT, height: (gap.end - gap.start) * SLOT_HEIGHT }]}
                >
                  <TouchableOpacity style={styles.gapCard} onPress={() => router.push("/(app)/(tabs)/sites")} activeOpacity={0.7}>
                    <AppText style={styles.gapCardText}>+ Find more things to do</AppText>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <EditItemModal
        item={editingItem}
        currentDayId={activeDayId || ""}
        availableDays={localTrip.days.map((d, idx) => ({
          id: d.id,
          label: `Day ${idx + 1}`,
          full: d.id !== activeDay?.id && cannotMoveTo(d.id),
        }))}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
        onRemove={handleRemoveItem}
        onMoveDay={handleMoveDay}
        moveLocked={!isEntitled}
        moveUnverified={entitlementsUnknown}
        onRecheck={recheckEntitlements}
        onUnlock={() => requestBuy(FULL_GUIDE_PRODUCT_ID)}
      />

      <PremiumFeatureModal
        visible={showPremiumMove}
        onClose={() => setShowPremiumMove(false)}
        unverified={entitlementsUnknown}
        onRetry={recheckEntitlements}
        onBuy={() => requestBuy(FULL_GUIDE_PRODUCT_ID)}
      />

      <NoteCard item={viewingNote} onClose={() => setViewingNote(null)} />

      <DeleteTripModal
        visible={showDeleteConfirm}
        tripTitle={localTrip.title || "My Trip"}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => void handleConfirmDeleteItinerary()}
      />

      <Modal visible={showTripMenu} transparent animationType="fade" onRequestClose={() => setShowTripMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowTripMenu(false)}>
          <SafeAreaView edges={["top"]} style={styles.menuSafeArea} pointerEvents="box-none">
            <View style={styles.menuCard}>
              {itineraries.length > 1 && (
                <TouchableOpacity
                  style={[styles.menuRow, styles.menuRowDivider]}
                  activeOpacity={0.6}
                  onPress={() => {
                    setShowTripMenu(false);
                    router.push("/(app)/(tabs)/itinerary");
                  }}
                >
                  <Text style={styles.menuRowText}>Switch Trip</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.6}
                onPress={() => {
                  setShowTripMenu(false);
                  setShowDeleteConfirm(true);
                }}
              >
                <Text style={[styles.menuRowText, styles.menuRowDanger]}>Delete Trip</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.colors.bgBase },
  menuOverlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.3)" },
  // paddingTop approximates the top bar's title row (8 + 44, see TopBar) so the
  // menu lands directly under the "..." button rather than needing a measured anchor.
  menuSafeArea: { alignItems: "flex-end", paddingTop: 60, paddingRight: tokens.space.md },
  menuCard: {
    minWidth: 170,
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingVertical: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  menuRow: { paddingVertical: 12, paddingHorizontal: 16 },
  menuRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.colors.border },
  menuRowText: { fontSize: 15, fontWeight: "600", color: tokens.colors.text },
  menuRowDanger: { color: tokens.colors.danger },
  switchRow: { flexDirection: "row", alignItems: "center", gap: tokens.space.sm, paddingHorizontal: tokens.space.md },
  switch: { flex: 1 },
  // flexGrow 0: a horizontal ScrollView otherwise stretches to fill the bar.
  tabStrip: { flexGrow: 0 },
  tabScroll: { paddingHorizontal: tokens.space.xs, alignItems: "stretch" },
  dayTab: { paddingHorizontal: 14, paddingVertical: 10, position: "relative", alignItems: "center" },
  dayTabContent: { flexDirection: "row", alignItems: "center", gap: 6 },
  dayDeleteBtn: { padding: 5, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.16)" },
  // On the dark bar, same as TopBarTabs: white, with the highlight's lighter
  // twin for the open day, and every tab underlined (faintly when it isn't
  // the open one) so they read as tabs.
  dayTabText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  dayTabTextActive: { color: tokens.colors.highlightOnDark, fontWeight: "700" },
  dayTabDate: { fontSize: 11, fontWeight: "500", color: tokens.colors.onDarkMuted, marginTop: 1, textAlign: "center" },
  dayTabDateActive: { color: tokens.colors.highlightOnDark },
  dayTabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  dayTabIndicatorActive: { backgroundColor: tokens.colors.highlightOnDark },
  addDayBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  addDayText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  timelineScroll: { flex: 1 },
  timelineContainer: { position: "relative", paddingTop: tokens.space.md, paddingBottom: 100 },
  gridRow: { flexDirection: "row", height: SLOT_HEIGHT, alignItems: "flex-start" },
  // From the time column's right edge (70, see timeLabelContainer) across the
  // grid, in the highlight: this app's "you are here" colour.
  nowLine: {
    position: "absolute",
    left: 70,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: tokens.colors.highlight,
    zIndex: 5,
  },
  timeLabelContainer: { width: 70, alignItems: "flex-end", paddingRight: tokens.space.sm },
  timeLabel: { position: "absolute", top: -8, fontSize: 11, fontWeight: "700", color: tokens.colors.text2 },
  hourDivider: { flex: 1, borderTopWidth: 1, borderTopColor: tokens.colors.border },
  halfHourDivider: { flex: 1, borderTopWidth: 1, borderTopColor: tokens.colors.borderSubtle },
  gapContainer: { position: "absolute", left: 82, right: tokens.space.md, alignItems: "center", justifyContent: "center" },
  gapCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  gapCardText: { fontSize: 14, fontWeight: "600", color: tokens.colors.text2 },
  emptyDayCard: {
    maxWidth: 280,
    backgroundColor: tokens.colors.bgCard,
    borderWidth: 1.5,
    borderColor: tokens.colors.border,
    borderStyle: "dashed",
    borderRadius: tokens.radius.lg,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyDayTitle: { fontWeight: "700", color: tokens.colors.text },
  emptyDayBody: { textAlign: "center" },
});
