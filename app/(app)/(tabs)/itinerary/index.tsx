import { useCallback, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert } from "react-native";
import { router } from "expo-router";
import { Calendar, ChevronRight, Lock, Plus } from "lucide-react-native";

import { Screen, LoadingState, ErrorCard, AppText, AppButton, components } from "@/lib/uiKit";
import { tokens, SWEEP_COLORS, SWEEP_BUTTON } from "@/lib/ui/tokens";
import { TopBar } from "@/components/layout/TopBar";
import { useSession } from "@/lib/providers/SessionProvider";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { useEntitlementGate } from "@/lib/hooks/useEntitlementGate";
import { PLANNER } from "@/lib/constants/gameplay";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";
import { ItineraryDetailView } from "@/components/itinerary/ItineraryDetailView";
import { formatTripDates } from "@/lib/utils/formatDates";
import { TripOverview } from "@/components/itinerary/TripOverview";
import { usePlaceLookup } from "@/lib/hooks/usePlaceLookup";
import { areaImage } from "@/lib/areaImages";
import { ITINERARY_TEMPLATES } from "@/lib/itineraryTemplates";
import { slotIndexToTimeLabel, slotsToDurationLabel } from "@/lib/utils/itineraryPhysics";
import type { ItineraryDay } from "@/lib/models";

// What a guest sees: a real suggested trip, drawn by the real trip view, locked (owner,
// 2026-11-10, mockup B), with the way to sign in in a row under it. Dated in the past so no
// row is ever "today"; the locked view shows no dates anyway.
const SAMPLE = ITINERARY_TEMPLATES.find((t) => t.key === "south-island-in-7-days-from-christchurch");
const SAMPLE_DAYS: ItineraryDay[] = (SAMPLE?.days ?? []).map((day, i) => ({
  id: `sample_day_${i + 1}`,
  date: `2026-02-${String(i + 1).padStart(2, "0")}`,
  items: day.items.map((item, j) => ({
    ...item,
    id: `sample_${i + 1}_${j}`,
    timeLabel: slotIndexToTimeLabel(item.slotIndex),
    durationLabel: slotsToDurationLabel(item.durationSlots),
  })),
}));

const askToSignIn = () =>
  Alert.alert("Sign In Required", "Sign in to plan your trip.", [
    { text: "Cancel", style: "cancel" },
    { text: "Sign In", onPress: () => router.push("/(auth)/login") },
  ]);

function GuestTrips() {
  const { places, list } = usePlaceLookup();
  const imageFor = useCallback((areaId: string) => areaImage(areaId, list), [list]);

  // The trip comes first and the way to sign in sits in a row fixed above the tab bar
  // (design sweep, round 2 of the Trips tab; docs/plans/design-sweep.md). It was a card at
  // the top, which every critic read before the trip it was hiding. The button is the
  // screen's main action, so it's the one orange thing here.
  const signInRow = (
    <View style={styles.signInRow}>
      <View style={styles.signInText}>
        <View style={styles.signInHead}>
          <Lock size={15} color={tokens.colors.text} strokeWidth={2.25} />
          <AppText style={styles.signInTitle}>Sign In to Plan a Trip</AppText>
        </View>
        <AppText style={styles.signInHint}>Make this trip yours, or build your own. We work out the drives.</AppText>
      </View>
      <AppButton style={styles.signInButton} shape={{ height: 46 }} onPress={() => router.push("/(auth)/login")}>
        Sign In
      </AppButton>
    </View>
  );

  return (
    <Screen padded={false} style={styles.screen}>
      <TopBar title="Trips" />
      {SAMPLE ? (
        <TripOverview
          title={SAMPLE.label}
          days={SAMPLE_DAYS}
          places={places}
          imageFor={imageFor}
          onOpenDay={askToSignIn}
          locked
          header={<AppText style={styles.sampleLabel}>A suggested trip</AppText>}
        />
      ) : (
        <View style={styles.flex1} />
      )}
      {signInRow}
    </Screen>
  );
}

export default function ItineraryListPage() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const { entitledProductIds, loading: entitlementsLoading } = useEntitlementGate(uid);
  const isEntitled = entitledProductIds.has(FULL_GUIDE_PRODUCT_ID);
  const { itineraries, loading, error, sessionExpired, refetch } = useItineraries();

  // Pull to refresh. Its own flag rather than `loading`, which swaps the whole
  // screen for the loading state.
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };
  const [isCreating, setIsCreating] = useState(false);

  if (session.status === "guest") return <GuestTrips />;

  if (session.status === "loading" || loading || entitlementsLoading) {
    return (
      <Screen>
        <LoadingState label="Loading your trips..." />
      </Screen>
    );
  }

  // One trip (the cap, PLANNER.MAX_ITINERARIES), so a list of one would be a
  // pointless extra tap — render the trip directly instead of navigating to a
  // different route for it. This used to be a router.push/replace redirect, but that
  // meant this screen (or the pushed one) could be discarded from the tab's
  // nested stack, leaving nothing for the tab bar to land back on after
  // navigating elsewhere and back. Rendering inline sidesteps that class of
  // bug entirely — there's no cross-screen navigation to desync.
  if (itineraries.length === 1) {
    return <ItineraryDetailView tripId={itineraries[0].id} />;
  }

  if (error && itineraries.length === 0) {
    return (
      <Screen>
        <ErrorCard
          title="Couldn't load your trips"
          message={error}
          action={{ label: "Try Again", onPress: () => refetch() }}
          secondaryAction={sessionExpired ? { label: "Sign In", onPress: () => router.push("/(auth)/login") } : undefined}
        />
      </Screen>
    );
  }

  if (itineraries.length === 0) {
    return (
      <View style={styles.container}>
        <TopBar title="Trips" />
        <components.EmptyItineraryState
          onCreateNew={() => setIsCreating(true)}
          onBrowse={() => router.push("/(app)/(tabs)/sites")}
          description="Create a trip and start adding the places you want to see."
          createLabel="Create a Trip"
          browseLabel="Explore Places to Visit"
          // The design sweep's look: flat on the white page, the orange main button and
          // a teal outlined second one.
          variant="flat"
          colors={SWEEP_COLORS}
          createButton={{ shape: SWEEP_BUTTON }}
          browseButton={{
            shape: { ...SWEEP_BUTTON, borderWidth: 1.5 },
            colors: { bg: tokens.colors.page, border: tokens.colors.selected, text: tokens.colors.selected },
          }}
        />
        <CreateItineraryModal
          visible={isCreating}
          locked={!isEntitled}
          onClose={() => setIsCreating(false)}
          onCreated={(id) => {
            setIsCreating(false);
            router.replace(`/(app)/(tabs)/itinerary/${id}`);
          }}
          showTemplateOption
        />
      </View>
    );
  }

  // One trip renders inline above, so this is someone with more (from before the
  // cap was 1).
  return (
    <View style={styles.container}>
      <TopBar title="Trips" />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={tokens.colors.accent}
            colors={[tokens.colors.accent]}
          />
        }
      >
        {itineraries.map((itin) => (
          <TouchableOpacity
            key={itin.id}
            style={styles.tripCard}
            onPress={() => router.push(`/(app)/(tabs)/itinerary/${itin.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.tripCardIcon}>
              <Calendar size={22} color={tokens.colors.accent} />
            </View>
            <View style={styles.tripCardInner}>
              <AppText style={styles.tripCardTitle} numberOfLines={1}>
                {itin.title}
              </AppText>
              <AppText style={styles.tripCardMeta}>
                {formatTripDates(itin.startDate, itin.endDate)}
                {itin.days?.length ? ` · ${itin.days.length} ${itin.days.length === 1 ? "day" : "days"}` : ""}
              </AppText>
            </View>
            <ChevronRight size={20} color={tokens.colors.textMuted} />
          </TouchableOpacity>
        ))}

        {isEntitled && itineraries.length < PLANNER.MAX_ITINERARIES && (
          <TouchableOpacity style={styles.tripCardCreate} onPress={() => setIsCreating(true)} activeOpacity={0.7}>
            <Plus size={18} color={tokens.colors.highlight} strokeWidth={2.5} />
            <AppText style={styles.tripCardCreateText}>Create new trip</AppText>
          </TouchableOpacity>
        )}
      </ScrollView>

      <CreateItineraryModal
        visible={isCreating}
        locked={!isEntitled}
        onClose={() => setIsCreating(false)}
        onCreated={(id) => {
          setIsCreating(false);
          if (id) router.replace(`/(app)/(tabs)/itinerary/${id}`);
        }}
        showTemplateOption
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // paddingTop 0 hands the status-bar inset to the top bar. The white page of the design
  // sweep's look.
  screen: { paddingTop: 0, backgroundColor: tokens.colors.page },
  flex1: { flex: 1 },
  container: { flex: 1, backgroundColor: tokens.colors.page },
  body: { paddingHorizontal: tokens.space.md, paddingBottom: 40 },
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 12,
    backgroundColor: tokens.colors.page,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.line,
  },
  signInText: { flex: 1 },
  signInHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  signInTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: tokens.colors.text },
  signInHint: { fontSize: 13, lineHeight: 18, color: tokens.colors.text2, marginTop: 2 },
  signInButton: { width: 104, paddingHorizontal: 0 },
  // Sentence case, small and grey: the spaced capitals it was read as a form label.
  sampleLabel: { fontSize: 14, color: tokens.colors.textMuted, marginBottom: 2 },
  // A row on the page with a line under it, as a day row is (components/itinerary/TripOverview.tsx).
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  tripCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: tokens.colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  tripCardInner: { flex: 1, gap: 3 },
  tripCardTitle: { fontSize: 17, fontWeight: "700", color: tokens.colors.text },
  tripCardMeta: { fontSize: 14, color: tokens.colors.textMuted },
  tripCardCreate: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    // Something to tap, so it takes the highlight.
    borderColor: tokens.colors.highlight,
    marginTop: tokens.space.md,
  },
  tripCardCreateText: { fontSize: 15, fontWeight: "700", color: tokens.colors.highlight },
});
