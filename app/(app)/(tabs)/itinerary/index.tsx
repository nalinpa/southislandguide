import { useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Calendar, ChevronRight, Plus } from "lucide-react-native";

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

export default function ItineraryListPage() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const { entitledProductIds, loading: entitlementsLoading } = useEntitlementGate(uid);
  const isEntitled = entitledProductIds.has(FULL_GUIDE_PRODUCT_ID);
  const { itineraries, loading, error, refetch } = useItineraries();

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

  if (session.status === "guest") {
    return (
      <Screen padded={false} style={styles.screen}>
        <TopBar title="Plans" />
        <View style={styles.body}>
          {/* A white card with one job. The heading is h2: the page title is in
              the bar, and a second h1 here used to shout over it. The button is
              the screen's main action, so it's the hero (highlight) variant. */}
          <View style={styles.signInCard}>
            <AppText variant="h2">Sign In to Plan a Trip</AppText>
            <AppText variant="body" style={styles.signInHint}>
              Create an account to build and save an itinerary.
            </AppText>
            <AppButton variant="hero" size="lg" fullWidth onPress={() => router.push("/(auth)/login")}>
              Sign In
            </AppButton>
          </View>
        </View>
      </Screen>
    );
  }

  if (session.status === "loading" || loading || entitlementsLoading) {
    return (
      <Screen>
        <LoadingState label="Loading your trips..." />
      </Screen>
    );
  }

  // Non-premium users are hard-capped at 1 trip (PLANNER.MAX_ITINERARIES),
  // so the "My Trips" picker would be a pointless extra tap for them —
  // render their one trip directly instead of navigating to a different
  // route for it. This used to be a router.push/replace redirect, but that
  // meant this screen (or the pushed one) could be discarded from the tab's
  // nested stack, leaving nothing for the tab bar to land back on after
  // navigating elsewhere and back. Rendering inline sidesteps that class of
  // bug entirely — there's no cross-screen navigation to desync.
  if (itineraries.length === 1 && !isEntitled) {
    return <ItineraryDetailView tripId={itineraries[0].id} />;
  }

  if (error && itineraries.length === 0) {
    return (
      <Screen>
        <ErrorCard title="Couldn't load your trips" message={error} action={{ label: "Try Again", onPress: () => refetch() }} />
      </Screen>
    );
  }

  if (itineraries.length === 0) {
    return (
      <View style={styles.container}>
        <TopBar title="Plans" />
        <components.EmptyItineraryState
          onCreateNew={() => setIsCreating(true)}
          onBrowse={() => router.push("/(app)/(tabs)/sites")}
          description="Create a trip and start adding places to build your perfect itinerary."
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

  // Non-premium + exactly 1 trip renders inline above. Premium users land
  // here even with just 1 trip, so "+ New Itinerary" stays reachable.
  return (
    <View style={styles.container}>
      <TopBar title="My Trips" />
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
  signInHint: { color: tokens.colors.text2, marginBottom: tokens.space.xs },
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