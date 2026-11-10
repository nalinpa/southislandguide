import { useCallback, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert } from "react-native";
import { router } from "expo-router";
import { Calendar, ChevronRight, Lock, Plus } from "lucide-react-native";

import { Screen, LoadingState, ErrorCard, AppText, AppButton, components } from "@/lib/uiKit";
import { cardLift, tokens } from "@/lib/ui/tokens";
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

// What a guest sees behind the sign-in card: a real suggested trip, drawn by the real trip
// view, locked (owner, 2026-11-10, mockup B). Dated in the past so no row is ever "today";
// the locked view shows no dates anyway.
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

  // A white card with one job. The heading is h2: the page title is in the bar, and a
  // second h1 here used to shout over it. The button is the screen's main action, so it's
  // the hero (highlight) variant.
  const card = (
    <View style={styles.signInCard}>
      <View style={styles.signInHead}>
        <View style={styles.lockBadge}>
          <Lock size={20} color={tokens.colors.highlight} strokeWidth={2.25} />
        </View>
        <AppText variant="h2" style={styles.signInTitle}>
          Sign In to Plan a Trip
        </AppText>
      </View>
      <AppText variant="body" style={styles.signInHint}>
        Make this trip yours, or build your own. We work out the drives.
      </AppText>
      <AppButton variant="hero" size="lg" fullWidth onPress={() => router.push("/(auth)/login")}>
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
          header={
            <View style={styles.guestHeader}>
              {card}
              <AppText style={styles.sampleLabel}>A suggested trip</AppText>
            </View>
          }
        />
      ) : (
        <View style={styles.body}>{card}</View>
      )}
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
            <ChevronRight size={20} color={tokens.colors.text2} />
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
  // paddingTop 0 hands the status-bar inset to the top bar.
  screen: { paddingTop: 0 },
  container: { flex: 1, backgroundColor: tokens.colors.bgBase },
  body: { padding: tokens.space.md, gap: 14, paddingBottom: 40 },
  signInCard: {
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: tokens.space.lg,
    gap: tokens.space.sm,
    ...cardLift,
  },
  signInHead: { flexDirection: "row", alignItems: "center", gap: tokens.space.sm },
  lockBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.highlightDim,
    alignItems: "center",
    justifyContent: "center",
  },
  signInTitle: { flex: 1 },
  signInHint: { color: tokens.colors.text2, marginBottom: tokens.space.xs },
  guestHeader: { gap: tokens.space.md, paddingBottom: tokens.space.xs },
  sampleLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: tokens.colors.textMuted,
    paddingHorizontal: 4,
  },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    ...cardLift,
  },
  tripCardIcon: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  tripCardInner: { flex: 1, gap: 5 },
  tripCardTitle: { fontSize: 18, fontWeight: "700", color: tokens.colors.text },
  tripCardMeta: { fontSize: 14, color: tokens.colors.text2 },
  tripCardCreate: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    // The screen's main action, so it takes the highlight.
    borderColor: tokens.colors.highlight,
    marginTop: 6,
  },
  tripCardCreateText: { fontSize: 15, fontWeight: "700", color: tokens.colors.highlight },
});