import { useCallback, useRef, useState } from "react";
import { Animated, View, StyleSheet, Pressable } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack as ExpoStack, router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { ArrowLeft, Clock, DollarSign, ExternalLink } from "lucide-react-native";

import { LoadingState, ErrorCard, Stack, AppText, components } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { hooksBag } from "@/lib/hooksBag";
import { useSession } from "@/lib/providers/SessionProvider";
import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { PLANNER } from "@/lib/constants/gameplay";
import { canAddToItinerary, SITE_CATEGORY_LABELS, type Site } from "@/lib/models";
import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";
import { AddToTripModal } from "@/components/itinerary/AddToTripModal";
import { Hero, HERO_HEIGHT } from "@/components/sites/detail/Hero";
// ActionsBar is intentionally not rendered: it duplicated QuickActions' review,
// save and share controls. ReviewsSummaryCard covers the review summary.
import { QuickActions } from "@/components/sites/detail/ActionsBar";
import { CATEGORY_CONFIG } from "@/components/map/SiteMarker";

// This route is a TAB screen, not a stack screen: app/(app)/(tabs) has the only
// layout, so sites/[siteId] is registered straight on the Tabs navigator. React
// Navigation keeps one instance of a tab screen mounted and only swaps its
// params — so opening a second place reused the first place's component, and
// with it the ScrollView's offset and the hero's parallax `scrollY`. Opening a
// cached place kept the old offset (page opened scrolled down); opening an
// uncached one showed the loading state, which remounted the ScrollView at the
// top while `scrollY` kept its old value, sliding the hero up and leaving a gap
// above the title. Keying the body by id gives each place a fresh instance.
// rotorua-guide has the same structure and presumably the same latent bug.
export default function SiteDetailRoute() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const id = String(siteId);
  return <SiteDetail key={id} id={id} />;
}

function SiteDetail({ id }: { id: string }) {

  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;

  const { sharedLocationIds } = hooksBag.useMyCompletions(uid);
  const hasShareBonus = sharedLocationIds.has(id);

  const { location: site, loading: entityLoading, err: entityErr } = hooksBag.useLocation(id);

  const {
    avgRating,
    ratingCount,
    myRating,
    myText: myReviewText,
    saving: reviewsSaving,
    saveReview: saveReviewToDb,
  } = hooksBag.useLocationReviewsSummary(uid, id, { extraLoading: session.status === "loading" });

  const { savedSiteIds, toggleSavedSite } = useSavedSites();
  const isSaved = savedSiteIds.has(id);

  const [reviewOpen, setReviewOpen] = useState(false);

  // Add-to-itinerary flow, as rotorua-guide's detail screen does it: no trips
  // yet -> create one; under the trip limit -> ask existing or new; at the
  // limit -> pick an existing trip. Each step hands off to the next modal.
  const { itineraries } = useItineraries();
  const isOffline = useNetInfo().isConnected === false;
  const [showTripChoice, setShowTripChoice] = useState(false);
  const [isCreatingItinerary, setIsCreatingItinerary] = useState(false);
  const [isAddingToTrip, setIsAddingToTrip] = useState(false);
  const [pendingItineraryId, setPendingItineraryId] = useState<string | null>(null);

  const startAddToItinerary = () => {
    if (itineraries.length === 0) setIsCreatingItinerary(true);
    else if (itineraries.length < PLANNER.MAX_ITINERARIES) setShowTripChoice(true);
    else setIsAddingToTrip(true);
  };
  const { drafts, setDraft, clearDraft } = hooksBag.useDraftsStore();
  const currentDraft = drafts[id] || { rating: null, text: "" };

  const handleDirections = useCallback(() => {
    const lat = site?.lat;
    const lng = site?.lng;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  }, [site?.lat, site?.lng]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [0, -(HERO_HEIGHT / 2)],
    extrapolate: "clamp",
  });

  // GAP: no premium/entitlement lock here -- RTR's original alerts before
  // letting guests save past a limit (see useEntitlementGate +
  // FULL_GUIDE_PRODUCT_ID in rotorua-guide's [siteId]/index.tsx). Add your
  // own gate here if your app sells tiered access.
  const handleToggleSave = () => toggleSavedSite({ siteId: id, isSaving: !isSaved });

  if (entityLoading || session.status === "loading") {
    return (
      <View style={styles.container}>
        <LoadingState label="Loading..." />
      </View>
    );
  }

  if (entityErr || !site) {
    return (
      <View style={styles.container}>
        <ErrorCard
          title="Location Not Found"
          message={entityErr || "Could not find this Location."}
          action={{ label: "Go Back", onPress: () => router.replace("/(app)/(tabs)/sites") }}
        />
      </View>
    );
  }

  // Every description ends in a "Local tip:" line (house style). Pulled out
  // into its own callout so it isn't buried at the end of the last paragraph.
  // A description without one renders exactly as before.
  const [body, tip] = splitLocalTip(site.description);

  return (
    <View style={styles.container}>
      <ExpoStack.Screen options={{ headerShown: false }} />

      <Animated.View style={[styles.heroWrap, { transform: [{ translateY: imageTranslateY }] }]}>
        <Hero imageUrl={site.imageUrl} imageThumbnailUrl={site.imageThumbnailUrl} category={site.category[0]} />
      </Animated.View>

      <Animated.ScrollView
        style={StyleSheet.absoluteFill}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: HERO_HEIGHT - 32 }} />
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          <Stack gap="md" style={styles.content}>
            <View style={styles.titleBlock}>
              <AppText variant="h1">{site.name}</AppText>
              <View style={styles.badgeRow}>
                <CategoryBadge category={site.category[0]} />
                {site.price ? <PriceBadge price={site.price} /> : null}
                {site.website ? <WebsiteBadge url={site.website} /> : null}
              </View>
            </View>

            <QuickActions
              onDirections={handleDirections}
              onOpenReview={() => setReviewOpen(true)}
              hasReview={!!myRating}
              shareBonus={hasShareBonus}
              onShareBonus={() =>
                router.push({ pathname: "/share-frame", params: { entityId: id, entityName: site.name } })
              }
              isSaved={isSaved}
              onToggleSave={handleToggleSave}
            />

            {/* Primary text colour, not status="hint": this is the page's main
                content, and hint is the de-emphasised caption style. The
                template shipped with hint; rotorua-guide fixed the same thing
                on 2026-09-04. */}
            <AppText style={styles.description}>{body}</AppText>

            {site.hoursNote ? <GoodToKnow note={site.hoursNote} /> : null}

            {tip ? (
              <View style={styles.tipCard}>
                <AppText style={styles.tipLabel}>Local tip</AppText>
                <AppText style={styles.tipText}>{tip}</AppText>
              </View>
            ) : null}

            <components.ReviewsSummaryCard
              ratingCount={ratingCount}
              avgRating={avgRating}
              onViewAll={() => router.push(`/(app)/(tabs)/sites/${id}/reviews`)}
              isCompleted={true}
              hasUserReviewed={!!myRating}
              onAddReview={() => setReviewOpen(true)}
            />
          </Stack>
        </View>
      </Animated.ScrollView>

      <SafeAreaView style={styles.backButtonWrap} pointerEvents="box-none">
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft color="#FFFFFF" size={22} />
        </Pressable>
      </SafeAreaView>

      {/* Signed-in only, matching the map overlay: a guest has nowhere to save
          a trip. Hidden for Stay via canAddToItinerary() — the same rule the
          map uses, so the two can't drift.
          ponytail: no premium gate here — v1 has no paid unlock (see the stub
          in lib/hooks/useEntitlementGate.ts). rotorua-guide's version opens
          PremiumFeatureModal first; add that back when commerce lands. */}
      {session.status === "authed" && canAddToItinerary(site) && (
        <SafeAreaView edges={["bottom"]} style={styles.itineraryFloatingWrap} pointerEvents="box-none">
          <Pressable
            style={[styles.itineraryButton, isOffline && styles.itineraryButtonDisabled]}
            disabled={isOffline}
            onPress={startAddToItinerary}
            accessibilityRole="button"
          >
            <AppText style={styles.itineraryButtonText}>
              {isOffline ? "Reconnect to Add to Itinerary" : "+ Add to Itinerary"}
            </AppText>
          </Pressable>
        </SafeAreaView>
      )}

      <components.TripChoiceSheet
        visible={showTripChoice}
        onClose={() => setShowTripChoice(false)}
        onAddToExisting={() => {
          setShowTripChoice(false);
          setIsAddingToTrip(true);
        }}
        onCreateNew={() => {
          setShowTripChoice(false);
          setIsCreatingItinerary(true);
        }}
      />

      <CreateItineraryModal
        visible={isCreatingItinerary}
        onClose={() => setIsCreatingItinerary(false)}
        onCreated={(newId) => {
          setIsCreatingItinerary(false);
          setPendingItineraryId(newId);
          setIsAddingToTrip(true);
        }}
      />

      <AddToTripModal
        site={
          isAddingToTrip
            ? { id: site.id, name: site.name, imageUrl: site.imageThumbnailUrl ?? site.imageUrl ?? undefined }
            : null
        }
        initialItineraryId={pendingItineraryId}
        onClose={() => {
          setIsAddingToTrip(false);
          setPendingItineraryId(null);
        }}
      />

      <components.ReviewModal
        visible={reviewOpen}
        saving={reviewsSaving}
        draftRating={currentDraft.rating}
        draftText={currentDraft.text}
        onChangeRating={(val) => setDraft(id, val, currentDraft.text)}
        onChangeText={(text) => setDraft(id, currentDraft.rating, text)}
        onClose={() => setReviewOpen(false)}
        onSave={async () => {
          const res = await saveReviewToDb({
            locationId: id,
            reviewRating: currentDraft.rating!,
            reviewText: currentDraft.text,
          });
          if (res.ok) {
            clearDraft(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setReviewOpen(false);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        }}
      />
    </View>
  );
}

// Primary category only — the same one that sets the map marker, and drawn
// from the marker's own config so the two can't drift. Icon in the category
// colour, label in the dark text colour: six of the nine category colours fall
// below 4.5:1 as small text on their own tint (Nature is 3.20), but every one
// clears 3:1 as an icon, and the dark label is 12.7:1 or better on all of them.
function CategoryBadge({ category }: { category: Site["category"][number] | undefined }) {
  if (!category) return null;
  const { Icon, color } = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other;
  return (
    <View style={[styles.categoryBadge, { backgroundColor: `${color}1F` }]}>
      <Icon size={14} color={color} strokeWidth={2.25} />
      <AppText style={styles.categoryBadgeText}>{SITE_CATEGORY_LABELS[category] ?? category}</AppText>
    </View>
  );
}

// Same shape as the category badge, but deliberately neutral: colour on this
// page means "category", so a second coloured badge would compete with it.
// Dark label on a faint tint of the text colour — reads as a quiet fact.
function PriceBadge({ price }: { price: string }) {
  return (
    <View style={[styles.categoryBadge, styles.priceBadge]}>
      <DollarSign size={14} color={tokens.colors.text2} strokeWidth={2.25} />
      <AppText style={styles.categoryBadgeText}>{price}</AppText>
    </View>
  );
}

// The one tappable badge, so it's drawn in accent — this app's "you can tap
// this" colour — to set it apart from the category and price badges, which are
// facts. Accent text on its own tint is 6.08:1.
// The URL is admin-entered, so only an http(s) URL renders as a link; anything
// else (a typo, a bare domain) is hidden rather than handed to openURL.
function WebsiteBadge({ url }: { url: string }) {
  if (!/^https?:\/\//i.test(url)) return null;
  return (
    <Pressable
      style={[styles.categoryBadge, styles.websiteBadge]}
      onPress={() => {
        Linking.openURL(url).catch(() => {});
      }}
      accessibilityRole="link"
      accessibilityLabel="Open website"
      hitSlop={6}
    >
      <ExternalLink size={14} color={tokens.colors.accent} strokeWidth={2.25} />
      <AppText style={[styles.categoryBadgeText, styles.websiteBadgeText]}>Website</AppText>
    </Pressable>
  );
}

// hoursNote holds opening times AND access/safety/amenity notes (44 of 53 lead
// with opening times, but "rockfall zone, do not linger" sits in the same
// field) — hence "Good to know" rather than "Hours". The data is consistently
// semicolon-separated clauses, so each gets its own line; as one run-on line
// the safety clauses got buried mid-sentence. Boxed like the Local tip, which
// follows it, but neutral (grey tint, dark bar) rather than accent, so the two
// read as a set without looking like two tips.
function GoodToKnow({ note }: { note: string }) {
  const lines = note
    .split(";")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.charAt(0).toUpperCase() + l.slice(1));
  if (!lines.length) return null;
  return (
    <View style={styles.goodToKnow}>
      <View style={styles.goodToKnowHeader}>
        <Clock size={14} color={tokens.colors.text2} strokeWidth={2.25} />
        <AppText style={styles.goodToKnowLabel}>Good to know</AppText>
      </View>
      {lines.map((line, i) => (
        <AppText key={i} style={styles.goodToKnowLine}>
          {line}
        </AppText>
      ))}
    </View>
  );
}

function splitLocalTip(description: string): [string, string | null] {
  const match = description.match(/\n?\s*Local tip:\s*/i);
  if (!match || match.index === undefined) return [description.trim(), null];
  return [
    description.slice(0, match.index).trim(),
    description.slice(match.index + match[0].length).trim() || null,
  ];
}

const styles = StyleSheet.create({
  // 16/25 rather than the body variant's 15 with no line height, which left
  // multi-paragraph descriptions cramped at React Native's default spacing.
  description: { fontSize: 16, lineHeight: 25, color: tokens.colors.text },
  titleBlock: { gap: tokens.space.xs },
  goodToKnow: {
    marginTop: tokens.space.xs,
    backgroundColor: `${tokens.colors.text}0F`,
    borderLeftWidth: 3,
    borderLeftColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    gap: 4,
  },
  goodToKnowHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  goodToKnowLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: tokens.colors.text2,
  },
  goodToKnowLine: { fontSize: 15, lineHeight: 22, color: tokens.colors.text },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: tokens.space.xs },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 99,
  },
  websiteBadge: { backgroundColor: tokens.colors.accentDim },
  websiteBadgeText: { color: tokens.colors.accent },
  priceBadge: { backgroundColor: `${tokens.colors.text}1F` }, // same 12% tint as the category badges
  categoryBadgeText: { fontSize: 13, fontWeight: "700", color: tokens.colors.text },
  tipCard: {
    // On top of the Stack's md gap, so the tip reads as its own block rather
    // than the tail of the description.
    marginTop: tokens.space.xs,
    backgroundColor: tokens.colors.accentDim,
    borderLeftWidth: 3,
    borderLeftColor: tokens.colors.accent,
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    gap: 4,
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: tokens.colors.accent,
  },
  tipText: { fontSize: 15, lineHeight: 23, color: tokens.colors.text },
  container: { flex: 1, backgroundColor: tokens.colors.bgBase },
  heroWrap: { position: "absolute", top: 0, left: 0, right: 0 },
  // The reading surface is near-white (bgCard), not the mint bgBase used
  // everywhere else: long text on a tinted ground is more tiring to read.
  // Text contrast 15.60:1 here vs 13.18:1 on bgBase.
  sheet: {
    backgroundColor: tokens.colors.bgCard,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingBottom: 120,
    minHeight: 600,
  },
  dragHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.colors.borderStrong,
    opacity: 0.5,
    alignSelf: "center",
    marginTop: 14,
    marginBottom: 6,
  },
  content: { paddingHorizontal: tokens.space.md, paddingTop: tokens.space.sm },
  backButtonWrap: { position: "absolute", top: 0, left: 0, right: 0 },
  itineraryFloatingWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: tokens.space.md,
    paddingTop: 12,
  },
  itineraryButton: {
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.accent,
    paddingVertical: 20,
    marginBottom: tokens.space.sm,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  itineraryButtonDisabled: { opacity: 0.5 },
  itineraryButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  backButton: {
    margin: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(36,26,18,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
});
