import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, useColorScheme, type ScrollViewInstance } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
import { X, Minus, Plus, Image as ImageIcon } from "lucide-react-native";

import { CardShell, AppButton } from "@/lib/uiKit";
import { CARD_SIDES, tokens } from "@/lib/ui/tokens";
import { useWideSheet, WIDE_CORNERS } from "@/lib/ui/useWideSheet";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { usePlaceLookup } from "@/lib/hooks/usePlaceLookup";
import { slotIndexToTimeLabel, slotsToDurationLabel, tripSummary, tryEdit } from "@/lib/utils/itineraryPhysics";
import type { EditResult } from "@/lib/utils/itineraryPhysics";
import type { PlaceLookup } from "@/lib/utils/transitMatrix";
import { clearPendingSlot, peekPendingSlot, setPendingSlot } from "@/lib/pendingSlot";
import { nearestPlaces } from "@/lib/utils/nearby";
import { formatDistanceMeters } from "@blacksands/hooks";
import { areaName } from "@/lib/areas";
import { PLANNER } from "@/lib/constants/gameplay";
import { siteImage } from "@/lib/categoryImages";
import type { ItineraryDay, ItineraryItem, SiteCategory } from "@/lib/models";

const TIME_OF_DAY: { key: string; label: string; startSlot: number }[] = [
  { key: "morning", label: "Morning", startSlot: 1 },
  { key: "midday", label: "Midday", startSlot: 6 },
  { key: "afternoon", label: "Afternoon", startSlot: 12 },
  { key: "evening", label: "Evening", startSlot: 18 },
];

type Site = { id: string; name: string; imageUrl?: string; category?: SiteCategory };

// The trip as adding the place to a day at a time would leave it, through the gate every
// edit goes through. Used to add it, and beforehand to say which days and times have room.
function candidateEdit(days: ItineraryDay[], dayId: string, site: Site, startSlot: number, durationSlots: number, places: PlaceLookup) {
  const newItem: ItineraryItem = {
    id: `item_${Date.now()}`,
    siteId: site.id,
    siteName: site.name,
    slotIndex: startSlot,
    // Both labels are filled in when the day is packed (runPhysicsEngine).
    timeLabel: "",
    durationLabel: "",
    durationSlots,
    imageUrl: site.imageUrl,
  };
  const items = [...(days.find((d) => d.id === dayId)?.items ?? []), newItem];
  items.sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
  // The whole trip, not just this day: a place in another area brings a drive with
  // it, and as the day's last place it changes the drive the next day opens with.
  const result = tryEdit(
    days,
    days.map((d) => (d.id === dayId ? { ...d, items } : d)),
    dayId,
    places,
  );
  return { newItem, result };
}

const dayDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });

// What was just added, for the done state. Its own copy: the form's trip and day are reset
// whenever the trip list changes, and the save itself changes it.
type Added = { tripId: string; tripTitle: string; dayId: string; dayLabel: string; slot: number;
  /** Where the place ends, so a place picked from `near` can follow it. */
  endSlot: number;
  /** The closest places not in the trip, worked out once, with the trip as it now is. */
  near: { id: string; name: string; meters: number }[];
};

type AddToTripModalProps = {
  /** `category` is the place's first, for its default image when it has no photo. */
  site: Site | null;
  onClose: () => void;
  initialItineraryId?: string | null;
};

export function AddToTripModal({ site, onClose, initialItineraryId }: AddToTripModalProps) {
  const { itineraries, saveItinerary, isSaving } = useItineraries();
  const netInfo = useNetInfo();
  const wide = useWideSheet("sheet");
  // The sheet is the card colour (CardShell basic), so the fades end in it, not the page's.
  const page = CARD_SIDES[useColorScheme() === "dark" ? "dark" : "light"];
  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const { places, list: allPlaces, ready: placesReady } = usePlaceLookup();

  const [itineraryId, setItineraryId] = useState<string | null>(null);
  // Null until the user picks: the sheet then opens on the first day and time with room
  // (tester, 2026-11-11: "couldn't find a day that would take a place"). It used to open
  // on Day 1, Morning, and say why not only once Add was tapped, a day at a time.
  const [dayId, setDayId] = useState<string | null>(null);
  const [startSlot, setStartSlot] = useState<number | null>(null);
  const [durationSlots, setDurationSlots] = useState(2);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Set once the place is saved: the modal then says so, and the user stays where they
  // were (Done) or opens the trip (View Trip). It used to jump to the trip every time.
  const [added, setAdded] = useState<Added | null>(null);
  // By the place's id, not the object: both callers build `site` afresh on every render,
  // and the save itself makes them re-render, which wiped the confirmation (and the form)
  // a moment after it appeared.
  useEffect(() => setAdded(null), [site?.id]);

  // The Day row opens with the chosen day in view (owner, 2026-11-17: day 9 chosen, row at
  // Day 1). Wanted on open, on a trip change and when the form comes back after "Added";
  // also when the chosen day changes by itself (below), not when the user taps a pill.
  // It runs once the chosen pill's x is known: that layout can land before or after the want.
  const dayRow = useRef<ScrollViewInstance>(null);
  const pillX = useRef<Record<string, number>>({});
  const wantScroll = useRef(true);
  const chosenDay = useRef<string | undefined>(undefined);
  const scrollToChosen = () => {
    const x = chosenDay.current ? pillX.current[chosenDay.current] : undefined;
    if (!wantScroll.current || x === undefined) return;
    wantScroll.current = false;
    // The 24 leaves a sliver of the pill before it, so the earlier days are hinted.
    dayRow.current?.scrollTo({ x: Math.max(0, x - 24), animated: false });
  };
  useEffect(() => {
    if (!added) {
      wantScroll.current = true;
      // Only a fresh layout of the chosen pill may trigger the scroll: the row is a new one
      // by now (see its key), and a stored x from the last one may not match it.
      pillX.current = {};
    }
  }, [added, site?.id, itineraryId]);
  useEffect(scrollToChosen);

  useEffect(() => {
    if (!site) return;
    const preselected = initialItineraryId ?? (itineraries.length === 1 ? itineraries[0].id : null);
    setItineraryId(preselected);
    setDayId(null);
    setStartSlot(null);
    setDurationSlots(2);
    setErrorMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site?.id, initialItineraryId, itineraries]);

  const selectedTrip = itineraries.find((i) => i.id === itineraryId);
  // Each day's towns, as the trip overview shows them, so a day can be told apart by more
  // than its number.
  const summary = useMemo(
    () => (selectedTrip && placesReady ? tripSummary(selectedTrip.days, places) : []),
    [selectedTrip, placesReady, places],
  );

  // The gap "Find more things to do" was opened from, if its day is still there. Its time
  // gets its own pill unless it's one of the four: exact, not rounded, since the packer
  // takes the time as the earliest start and Midday could land before the stop it follows.
  const waiting = selectedTrip ? peekPendingSlot(selectedTrip.id) : null;
  const pending = waiting && selectedTrip?.days.some((d) => d.id === waiting.dayId) ? waiting : null;
  const exactSlot = pending && !TIME_OF_DAY.some((t) => t.startSlot === pending.slot) ? pending.slot : null;
  const times = useMemo(
    () => (exactSlot === null ? TIME_OF_DAY : [{ key: "exact", label: slotIndexToTimeLabel(exactSlot), startSlot: exactSlot }, ...TIME_OF_DAY]),
    [exactSlot],
  );

  // Whether the place fits, for every day at every time pill. Empty until the place list
  // is in: without it the fit check would pass anything.
  // ponytail: days × pills whole-trip packs, about 200 for a 21-day trip, on each change
  // of duration. Check only the days near the picked one if it drags on a phone.
  const fits = useMemo(() => {
    const map = new Map<string, EditResult>();
    if (!site || !selectedTrip || !placesReady) return map;
    for (const d of selectedTrip.days) {
      times.forEach((t, i) => {
        const { newItem, result } = candidateEdit(selectedTrip.days, d.id, site, t.startSlot, durationSlots, places);
        // The packer moves a place later until it fits, so asking for Morning on a day
        // with a busy morning "fits", in the afternoon. That part of the day is full all
        // the same (owner, 2026-11-11): full when the place would land in a later part.
        const next = t.key === "exact" ? undefined : times[i + 1];
        const landed = result.ok ? (result.days.find((x) => x.id === d.id)?.items.find((x) => x.id === newItem.id)?.slotIndex ?? 0) : 0;
        map.set(
          `${d.id}:${t.startSlot}`,
          result.ok && next && landed >= next.startSlot
            ? { ok: false, reason: `${t.label} has no room on this day. Try another time or day.` }
            : result,
        );
      });
    }
    return map;
    // By the place's id: callers build `site` afresh on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site?.id, selectedTrip, placesReady, places, durationSlots, times]);

  if (!site) return null;

  const fitsAt = (d: string, slot: number) => fits.get(`${d}:${slot}`)?.ok ?? true;
  const dayFits = (d: string) => times.some((t) => fitsAt(d, t.startSlot));
  const days = selectedTrip?.days ?? [];
  // The user's pick, else the gap's day if it has room, else the first day that has.
  const day =
    days.find((d) => d.id === dayId) ??
    days.find((d) => d.id === pending?.dayId && dayFits(d.id)) ??
    days.find((d) => dayFits(d.id)) ??
    days[0];
  // Ref writes in render, but idempotent: a changed day not from a tap wants the scroll.
  if (chosenDay.current !== day?.id) {
    chosenDay.current = day?.id;
    wantScroll.current = true;
  }
  const slot =
    startSlot ??
    (day && pending?.dayId === day.id && fitsAt(day.id, pending.slot) ? pending.slot : undefined) ??
    (day ? times.find((t) => fitsAt(day.id, t.startSlot))?.startSlot : undefined) ??
    times[0].startSlot;
  const chosen = day ? fits.get(`${day.id}:${slot}`) : undefined;
  const refusal =
    days.length > 0 && !days.some((d) => dayFits(d.id))
      ? `No day has room for a visit of ${slotsToDurationLabel(durationSlots).toLowerCase()}. Try a shorter visit, or make room on a day.`
      : chosen && !chosen.ok
        ? chosen.reason
        : null;

  const siteThumb = siteImage(site.imageUrl, site.category, "thumb", site.id);

  const handleAdd = async () => {
    setErrorMsg(null);
    if (!selectedTrip || !day) {
      setErrorMsg("Choose a trip and a day.");
      return;
    }
    const dayId = day.id;
    const { newItem, result } = candidateEdit(selectedTrip.days, dayId, site, slot, durationSlots, places);
    if (!result.ok) {
      setErrorMsg(result.reason);
      return;
    }

    const updatedDays = result.days;
    const placedItem = updatedDays.find((d) => d.id === dayId)!.items.find((i) => i.id === newItem.id)!;

    try {
      await saveItinerary({ id: selectedTrip.id, days: updatedDays });
    } catch {
      setErrorMsg("Couldn't add to your trip. Try again.");
      return;
    }
    clearPendingSlot();
    // ponytail: every place is open to everyone (isSiteLocked is always false), so "active" is the whole filter.
    const origin = allPlaces.find((p) => p.id === site.id);
    const inTrip = new Set([site.id, ...updatedDays.flatMap((d) => d.items.map((i) => i.siteId))]);
    const near =
      origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)
        ? nearestPlaces(origin, allPlaces.filter((p) => p.active !== false), { exclude: inTrip, addableOnly: true, limit: 3 }).map(
            (n) => ({ id: n.site.id, name: n.site.name, meters: n.meters }),
          )
        : [];
    const dayIndex = selectedTrip.days.findIndex((d) => d.id === dayId);
    setAdded({
      tripId: selectedTrip.id,
      tripTitle: selectedTrip.title,
      dayId,
      dayLabel: `Day ${dayIndex + 1} · ${dayDate(day.date)}`,
      slot: placedItem.slotIndex ?? 0,
      endSlot: (placedItem.slotIndex ?? 0) + (placedItem.durationSlots ?? durationSlots),
      near,
    });
  };

  const viewTrip = (done: Added) => {
    onClose();
    router.push({
      pathname: "/(app)/(tabs)/itinerary/[itineraryId]",
      params: { itineraryId: done.tripId, jumpToDay: done.dayId, jumpToSlot: String(done.slot) },
    });
  };

  // The next place goes in right after this one, on the same day.
  const openNear = (done: Added, id: string) => {
    setPendingSlot({ tripId: done.tripId, dayId: done.dayId, slot: done.endSlot });
    onClose();
    router.push(`/(app)/(tabs)/sites/${id}`);
  };

  return (
    <Modal visible={!!site} transparent animationType={wide?.animation ?? "slide"}>
      <SafeAreaView edges={["left", "right"]} style={[styles.overlay, wide?.overlay]}>
        <View style={[styles.wrapper, wide?.card]}>
          <CardShell status="basic" shrink style={[styles.card, wide && styles.wideCard]}>
            <View style={styles.header}>
              <Text style={styles.title}>Add to Trip</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.closeChip}
              >
                <X color={tokens.colors.text} size={16} strokeWidth={2.25} />
              </TouchableOpacity>
            </View>

            {added ? (
              <View style={styles.done}>
                <Text style={styles.doneTitle}>Added</Text>
                <Text style={styles.doneBody}>
                  {site.name} is on {added.dayLabel}
                  {itineraries.length > 1 ? ` of ${added.tripTitle}` : ""}.
                </Text>
                {added.near.length > 0 && (
                  <View style={styles.near}>
                    <Text style={styles.nearTitle}>Near {site.name}</Text>
                    {added.near.map((n) => {
                      const distance = formatDistanceMeters(n.meters);
                      return (
                        <TouchableOpacity
                          key={n.id}
                          style={styles.nearRow}
                          accessibilityRole="button"
                          accessibilityLabel={`${n.name}, ${distance}`}
                          onPress={() => openNear(added, n.id)}
                        >
                          <Text style={styles.nearName} numberOfLines={1}>
                            {n.name}
                          </Text>
                          <Text style={styles.nearDist}>{distance}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                <AppButton variant="primary" fullWidth onPress={onClose}>
                  Done
                </AppButton>
                <TouchableOpacity style={styles.viewTrip} accessibilityRole="button" onPress={() => viewTrip(added)}>
                  <Text style={styles.viewTripText}>View Trip</Text>
                </TouchableOpacity>
              </View>
            ) : (
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.siteRow}>
                {siteThumb ? (
                  <Image source={siteThumb} style={styles.siteImage} />
                ) : (
                  <View style={styles.siteImagePlaceholder}>
                    <ImageIcon color={tokens.colors.borderStrong} size={22} />
                  </View>
                )}
                <Text style={styles.siteName} numberOfLines={2}>
                  {site.name}
                </Text>
              </View>

              {itineraries.length > 1 && (
                <>
                  <Text style={[styles.label, wide && styles.wideLabel]}>Trip</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {itineraries.map((trip) => (
                      <TouchableOpacity
                        key={trip.id}
                        style={[styles.pill, itineraryId === trip.id && styles.pillActive]}
                        onPress={() => {
                          setItineraryId(trip.id);
                          setDayId(null);
                          setStartSlot(null);
                        }}
                      >
                        <Text style={[styles.pillText, itineraryId === trip.id && styles.pillTextActive]} numberOfLines={1}>
                          {trip.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {selectedTrip && (
                <>
                  <Text testID="add-day-label" style={[styles.label, wide && styles.wideLabel]}>Day</Text>
                  <View>
                  <ScrollView key={`${selectedTrip.id}:${site.id}`} ref={dayRow} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {days.map((d, idx) => {
                      const active = day?.id === d.id;
                      // A day with no room can't be picked (owner, 2026-11-11).
                      const room = dayFits(d.id);
                      return (
                        <TouchableOpacity
                          key={d.id}
                          style={[styles.pill, active && styles.pillActive, !room && styles.pillDim]}
                          disabled={!room}
                          accessibilityState={{ selected: active, disabled: !room }}
                          onLayout={(e) => {
                            pillX.current[d.id] = e.nativeEvent.layout.x;
                            scrollToChosen();
                          }}
                          onPress={() => {
                            // Already on screen: the row stays put.
                            chosenDay.current = d.id;
                            wantScroll.current = false;
                            setDayId(d.id);
                          }}
                        >
                          <Text style={[styles.pillText, active && styles.pillTextActive]}>Day {idx + 1}</Text>
                          <Text style={[styles.pillSub, active && styles.pillTextActive]} numberOfLines={1}>
                            {dayDate(d.date)}
                            {!room ? " · No room" : summary[idx]?.areas.length ? ` · ${summary[idx].areas.map(areaName).join(" → ")}` : ""}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {/* Wide only: the row fades out at the 24 pt margin it is cut at. */}
                  {wide ? (
                    <LinearGradient
                      testID="add-day-fade"
                      pointerEvents="none"
                      colors={[page + "00", page]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.dayFade}
                    />
                  ) : null}
                  </View>
                </>
              )}

              <Text style={[styles.label, wide && styles.wideLabel]}>Time of Day</Text>
              <View style={styles.timeRow}>
                {times.map((t) => {
                  const active = slot === t.startSlot;
                  const full = !!day && !fitsAt(day.id, t.startSlot);
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.pill, styles.timePill, active && styles.pillActive, full && styles.pillDim]}
                      disabled={full}
                      accessibilityState={{ selected: active, disabled: full }}
                      onPress={() => setStartSlot(t.startSlot)}
                    >
                      <Text
                        style={[styles.pillText, active && styles.pillTextActive]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                      >
                        {t.label}
                      </Text>
                      {full && <Text style={[styles.pillSub, active && styles.pillTextActive]}>Full</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, wide && styles.wideLabel]}>Duration</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setDurationSlots((n) => Math.max(1, n - 1))}
                  accessibilityRole="button"
                  accessibilityLabel="Shorter"
                >
                  <Minus color={tokens.colors.text} size={20} />
                </TouchableOpacity>
                <View style={styles.stepCenter}>
                  <Text style={styles.durationText}>{slotsToDurationLabel(durationSlots)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setDurationSlots((n) => Math.min(PLANNER.MAX_GRID_SLOTS, n + 1))}
                  accessibilityRole="button"
                  accessibilityLabel="Longer"
                >
                  <Plus color={tokens.colors.text} size={20} />
                </TouchableOpacity>
              </View>

              {(errorMsg ?? refusal) && <Text style={styles.errorText}>{errorMsg ?? refusal}</Text>}

              {/* Saves queue while offline, so without this the button would just spin until reconnect.
                  And nothing is added before the place list is in: without it the drive to
                  this place can't be worked out, so the fit check would pass anything. */}
              <View testID="add-submit" style={[styles.submit, wide && styles.wideSubmit]}>
                <AppButton
                  variant="primary"
                  onPress={handleAdd}
                  loading={isSaving}
                  loadingLabel="Adding..."
                  disabled={isOffline || !placesReady || !!refusal}
                  fullWidth
                >
                  {/* "Add", not "Add to Trip": that's the sheet's title, just above. */}
                  {isOffline ? "Reconnect to Add" : placesReady ? "Add" : "Loading Places..."}
                </AppButton>
              </View>
            </ScrollView>
            )}
          </CardShell>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: tokens.colors.dim, justifyContent: "flex-end" },
  // A sheet on the bottom edge with 20pt top corners, not a floating card (the design
  // sweep's look: docs/plans/design-sweep.md). No grab handle: it doesn't drag.
  // ponytail: 34 is the home indicator's space on a Face ID iPhone, as a fixed number. On
  // a phone with none (an SE) it is spare padding. Read the real inset if that matters.
  wrapper: { maxHeight: "90%" },
  card: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 34,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.sm },
  title: { fontSize: 20, fontWeight: "700", letterSpacing: -0.2, color: tokens.colors.text },
  // The close button: an x in a pale circle, the same on every sheet.
  closeChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  siteRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: tokens.space.xs },
  siteImage: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: tokens.colors.photoEdge },
  siteImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: tokens.colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  siteName: { flex: 1, fontSize: 16, fontWeight: "600", color: tokens.colors.text },
  // Sentence case: the small spaced capitals it was read as form furniture.
  label: { fontSize: 14, fontWeight: "600", color: tokens.colors.text2, marginTop: 18, marginBottom: tokens.space.xs },
  pillRow: { gap: 8, paddingBottom: 4 },
  timeRow: { flexDirection: "row", gap: 8 },
  pill: {
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.page,
  },
  // Four (or five) equal boxes across the sheet.
  timePill: { flex: 1, minWidth: 0, paddingHorizontal: 4, alignItems: "center" },
  // The chosen one is solid teal: an outline alone was too quiet to find.
  pillActive: { backgroundColor: tokens.colors.accent, borderColor: tokens.colors.accent },
  pillText: { fontSize: 15, fontWeight: "500", color: tokens.colors.text },
  pillTextActive: { color: "#FFFFFF", fontWeight: "600" },
  // Dimmed, but still readable: at 0.45 "Full" couldn't be read.
  pillDim: { opacity: 0.6 },
  pillSub: { fontSize: 13, color: tokens.colors.textMuted, marginTop: 1 },
  done: { gap: tokens.space.sm, paddingTop: tokens.space.xs },
  doneTitle: { fontSize: 18, fontWeight: "700", color: tokens.colors.text },
  doneBody: { fontSize: 15, lineHeight: 22, color: tokens.colors.text2, marginBottom: tokens.space.sm },
  near: { marginBottom: tokens.space.sm },
  nearTitle: { fontSize: 14, fontWeight: "600", color: tokens.colors.text2, marginBottom: 2 },
  nearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  nearName: { flex: 1, fontSize: 16, fontWeight: "500", color: tokens.colors.text },
  nearDist: { fontSize: 15, color: tokens.colors.textMuted },
  viewTrip: { alignSelf: "center", paddingVertical: 12, paddingHorizontal: tokens.space.md },
  viewTripText: { fontSize: 15, fontWeight: "600", color: tokens.colors.selected },
  // Minus and plus are round and sit close either side of the value: as squares at the
  // far ends of a box they read as two more choices (design sweep, sheets round 2).
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: tokens.space.md },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.page,
  },
  stepCenter: { minWidth: 104, alignItems: "center" },
  durationText: { fontSize: 17, fontWeight: "600", color: tokens.colors.text },
  errorText: { fontSize: 13, color: tokens.colors.danger, marginTop: tokens.space.sm },
  // The button used to sit hard against the duration stepper above it.
  submit: { marginTop: tokens.space.md },
  // Duo: every corner round; the 24 pt margin the Day row stops at (it cuts there, as on the
  // phone); labels 22 above and 10 under; 32 above Add, as between the groups.
  wideCard: { ...WIDE_CORNERS, paddingHorizontal: 24, paddingBottom: 24 },
  wideLabel: { marginTop: 22, marginBottom: 10 },
  wideSubmit: { marginTop: 32 },
  dayFade: { position: "absolute", top: 0, right: 0, bottom: 0, width: 24 },
});