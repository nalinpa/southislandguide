import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
import { X, Minus, Plus, Image as ImageIcon } from "lucide-react-native";

import { CardShell, AppButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { usePlaceLookup } from "@/lib/hooks/usePlaceLookup";
import { slotsToDurationLabel, tripSummary, tryEdit } from "@/lib/utils/itineraryPhysics";
import { areaName } from "@/lib/areas";
import { PLANNER } from "@/lib/constants/gameplay";
import { siteImage } from "@/lib/categoryImages";
import type { ItineraryItem, SiteCategory } from "@/lib/models";

const TIME_OF_DAY = [
  { key: "morning", label: "Morning", startSlot: 1 },
  { key: "midday", label: "Midday", startSlot: 6 },
  { key: "afternoon", label: "Afternoon", startSlot: 12 },
  { key: "evening", label: "Evening", startSlot: 18 },
] as const;

const dayDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });

// What was just added, for the done state. Its own copy: the form's trip and day are reset
// whenever the trip list changes, and the save itself changes it.
type Added = { tripId: string; tripTitle: string; dayId: string; dayLabel: string; slot: number };

type AddToTripModalProps = {
  /** `category` is the place's first, for its default image when it has no photo. */
  site: { id: string; name: string; imageUrl?: string; category?: SiteCategory } | null;
  onClose: () => void;
  initialItineraryId?: string | null;
};

export function AddToTripModal({ site, onClose, initialItineraryId }: AddToTripModalProps) {
  const { itineraries, saveItinerary, isSaving } = useItineraries();
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const { places, ready: placesReady } = usePlaceLookup();

  const [itineraryId, setItineraryId] = useState<string | null>(null);
  const [dayId, setDayId] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<(typeof TIME_OF_DAY)[number]["key"]>("morning");
  const [durationSlots, setDurationSlots] = useState(2);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Set once the place is saved: the modal then says so, and the user stays where they
  // were (Done) or opens the trip (View Trip). It used to jump to the trip every time.
  const [added, setAdded] = useState<Added | null>(null);
  // By the place's id, not the object: both callers build `site` afresh on every render,
  // and the save itself makes them re-render, which wiped the confirmation (and the form)
  // a moment after it appeared.
  useEffect(() => setAdded(null), [site?.id]);

  useEffect(() => {
    if (!site) return;
    const preselected = initialItineraryId ?? (itineraries.length === 1 ? itineraries[0].id : null);
    setItineraryId(preselected);
    const trip = itineraries.find((i) => i.id === preselected);
    setDayId(trip?.days[0]?.id ?? null);
    setTimeOfDay("morning");
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

  if (!site) return null;

  const siteThumb = siteImage(site.imageUrl, site.category, "thumb", site.id);

  const handleAdd = async () => {
    setErrorMsg(null);
    if (!selectedTrip || !dayId) {
      setErrorMsg("Choose a trip and a day.");
      return;
    }
    const day = selectedTrip.days.find((d) => d.id === dayId);
    if (!day) return;

    const startSlot = TIME_OF_DAY.find((t) => t.key === timeOfDay)!.startSlot;
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

    const items = [...day.items, newItem];
    items.sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));

    // The whole trip, not just this day: a place in another area brings a drive with
    // it, and as the day's last place it changes the drive the next day opens with.
    const result = tryEdit(
      selectedTrip.days,
      selectedTrip.days.map((d) => (d.id === dayId ? { ...d, items } : d)),
      dayId,
      places,
    );
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
    const dayIndex = selectedTrip.days.findIndex((d) => d.id === dayId);
    setAdded({
      tripId: selectedTrip.id,
      tripTitle: selectedTrip.title,
      dayId,
      dayLabel: `Day ${dayIndex + 1} · ${dayDate(day.date)}`,
      slot: placedItem.slotIndex ?? 0,
    });
  };

  const viewTrip = (done: Added) => {
    onClose();
    router.push({
      pathname: "/(app)/(tabs)/itinerary/[itineraryId]",
      params: { itineraryId: done.tripId, jumpToDay: done.dayId, jumpToSlot: String(done.slot) },
    });
  };

  return (
    <Modal visible={!!site} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.wrapper}>
          <CardShell status="basic" style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Add to Trip</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X color={tokens.colors.text2} size={24} />
              </TouchableOpacity>
            </View>

            {added ? (
              <View style={styles.done}>
                <Text style={styles.doneTitle}>Added</Text>
                <Text style={styles.doneBody}>
                  {site.name} is on {added.dayLabel}
                  {itineraries.length > 1 ? ` of ${added.tripTitle}` : ""}.
                </Text>
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
                  <Text style={styles.label}>Trip</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {itineraries.map((trip) => (
                      <TouchableOpacity
                        key={trip.id}
                        style={[styles.pill, itineraryId === trip.id && styles.pillActive]}
                        onPress={() => {
                          setItineraryId(trip.id);
                          setDayId(trip.days[0]?.id ?? null);
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
                  <Text style={styles.label}>Day</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {selectedTrip.days.map((day, idx) => (
                      <TouchableOpacity
                        key={day.id}
                        style={[styles.pill, dayId === day.id && styles.pillActive]}
                        onPress={() => setDayId(day.id)}
                      >
                        <Text style={[styles.pillText, dayId === day.id && styles.pillTextActive]}>Day {idx + 1}</Text>
                        <Text style={[styles.pillSub, dayId === day.id && styles.pillTextActive]} numberOfLines={1}>
                          {dayDate(day.date)}
                          {summary[idx]?.areas.length ? ` · ${summary[idx].areas.map(areaName).join(" → ")}` : ""}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={styles.label}>Time of Day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {TIME_OF_DAY.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.pill, timeOfDay === t.key && styles.pillActive]}
                    onPress={() => setTimeOfDay(t.key)}
                  >
                    <Text style={[styles.pillText, timeOfDay === t.key && styles.pillTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Duration</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setDurationSlots((n) => Math.max(1, n - 1))}
                  accessibilityRole="button"
                  accessibilityLabel="Shorter"
                >
                  <Minus color={tokens.colors.accent} size={20} />
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
                  <Plus color={tokens.colors.accent} size={20} />
                </TouchableOpacity>
              </View>

              {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

              {/* Saves queue while offline, so without this the button would just spin until reconnect.
                  And nothing is added before the place list is in: without it the drive to
                  this place can't be worked out, so the fit check would pass anything. */}
              <View style={styles.submit}>
                <AppButton
                  variant="primary"
                  onPress={handleAdd}
                  loading={isSaving}
                  loadingLabel="Adding..."
                  disabled={isOffline || !placesReady}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.6)", justifyContent: "flex-end" },
  wrapper: { margin: tokens.space.md, marginBottom: 40, maxHeight: "90%" },
  card: { borderRadius: tokens.radius.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.sm },
  title: { fontSize: 20, fontWeight: "800", color: tokens.colors.text },
  siteRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: tokens.space.sm },
  siteImage: { width: 48, height: 48, borderRadius: tokens.radius.md },
  siteImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  siteName: { flex: 1, fontSize: 16, fontWeight: "700", color: tokens.colors.text },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: tokens.colors.text2, marginTop: tokens.space.md, marginBottom: tokens.space.sm },
  pillRow: { gap: 8, paddingBottom: 4 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.bgCard,
  },
  pillActive: { backgroundColor: tokens.colors.accent, borderColor: tokens.colors.accent },
  pillText: { fontSize: 13, fontWeight: "600", color: tokens.colors.text2 },
  pillTextActive: { color: "#FFFFFF" },
  pillSub: { fontSize: 11, fontWeight: "500", color: tokens.colors.text2, marginTop: 2 },
  done: { gap: tokens.space.sm, paddingTop: tokens.space.xs },
  doneTitle: { fontSize: 18, fontWeight: "800", color: tokens.colors.text },
  doneBody: { fontSize: 15, lineHeight: 22, color: tokens.colors.text2, marginBottom: tokens.space.sm },
  viewTrip: { alignSelf: "center", paddingVertical: 12, paddingHorizontal: tokens.space.md },
  viewTripText: { fontSize: 15, fontWeight: "700", color: tokens.colors.accent },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.xs,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  stepBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: tokens.colors.bgElevated, borderRadius: tokens.radius.md },
  stepCenter: { flex: 1, alignItems: "center" },
  durationText: { fontSize: 18, fontWeight: "800", color: tokens.colors.accent },
  errorText: { fontSize: 12, color: tokens.colors.danger, marginTop: tokens.space.sm },
  // The button used to sit hard against the duration stepper above it.
  submit: { marginTop: tokens.space.md },
});