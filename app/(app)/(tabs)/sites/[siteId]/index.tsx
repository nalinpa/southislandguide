import { useCallback, useRef, useState } from "react";
import { Alert, Animated, View, StyleSheet, Pressable } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack as ExpoStack, router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { ArrowLeft, ExternalLink, Star } from "lucide-react-native";

import { LoadingState, ErrorCard, Stack, AppText, ReviewModal, components } from "@/lib/uiKit";
import { cardLift, tokens } from "@/lib/ui/tokens";
import { hooksBag } from "@/lib/hooksBag";
import { useSession } from "@/lib/providers/SessionProvider";
import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { canAddToItinerary, SITE_CATEGORY_LABELS, type Site } from "@/lib/models";
import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";
import { AddToTripModal } from "@/components/itinerary/AddToTripModal";
import { Hero, HERO_HEIGHT } from "@/components/sites/detail/Hero";
import { LightStatusBar } from "@/components/layout/LightStatusBar";
// ActionsBar is intentionally not rendered: it duplicated QuickActions' review,
// save and share controls. ReviewsSummaryCard covers the review summary.
import { QuickActions } from "@/components/sites/detail/ActionsBar";
import { CATEGORY_CONFIG } from "@/components/map/SiteMarker";
import { useTourTarget } from "@/lib/tour/useTourTarget";

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
// Height of the back button's row: the 44pt disc with 8pt above and below. The
// bar that fades in on scroll is this tall under the status bar.
const SCROLLED_BAR_ROW = 60;

export default function SiteDetailRoute() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const id = String(siteId);
  return <SiteDetail key={id} id={id} />;
}

function SiteDetail({ id }: { id: string }) {

  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;

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
  // Why the last review save failed, shown in the review modal. Cleared on each open.
  const [reviewError, setReviewError] = useState<string | null>(null);

  // The opening tour's step on this screen (lib/tour/tourSteps.ts): the add button for
  // someone with the unlock, the heart for someone without.
  const addTarget = useTourTarget("placeAdd");
  const saveTarget = useTourTarget("placeSave");

  // Add-to-itinerary flow, as rotorua-guide's detail screen does it. useItineraries
  // decides which step it opens on (addFlow); each step hands off to the next modal.
  const { addFlow } = useItineraries();
  const isOffline = useNetInfo().isConnected === false;
  const [showTripChoice, setShowTripChoice] = useState(false);
  const [isCreatingItinerary, setIsCreatingItinerary] = useState(false);
  const [isAddingToTrip, setIsAddingToTrip] = useState(false);
  const [pendingItineraryId, setPendingItineraryId] = useState<string | null>(null);

  const startAddToItinerary = () => {
    if (addFlow === "create") setIsCreatingItinerary(true);
    else if (addFlow === "choose") setShowTripChoice(true);
    else if (addFlow === "pick") setIsAddingToTrip(true);
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

  // Once the white sheet scrolls up to the top, two things went wrong: the
  // status bar's white text (white for the photo) had nothing to sit on, and
  // the floating back button sat on top of the page's text. So a teal bar fades
  // in over the last 40pt before the sheet gets there, covering the clock and
  // the back button's row and naming the place. (The sheet starts
  // HERO_HEIGHT - 32 down the scroll content.)
  const insets = useSafeAreaInsets();
  const sheetAtBar = HERO_HEIGHT - 32 - (insets.top + SCROLLED_BAR_ROW);
  const scrolledBarOpacity = scrollY.interpolate({
    inputRange: [sheetAtBar - 40, sheetAtBar],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // A guest has no account to save or review with, so they're asked to sign in — the same
  // prompt as reporting or blocking on the reviews screen. (useSavedSites and the review
  // hook also refuse the write itself.)
  const signedIn = (message: string) => {
    if (session.status === "authed") return true;
    Alert.alert("Sign In Required", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Sign In", onPress: () => router.push("/(auth)/login") },
    ]);
    return false;
  };

  const handleToggleSave = () => {
    if (!signedIn("Sign in to save places.")) return;
    toggleSavedSite({ siteId: id, isSaving: !isSaved });
  };

  const openReview = () => {
    if (!signedIn("Sign in to leave a review.")) return;
    setReviewError(null);
    setReviewOpen(true);
  };

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
          title="Place Not Found"
          message={entityErr || "Couldn't find this place."}
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
      {/* The clock sits over the photo, then over the teal band. */}
      <LightStatusBar />

      <Animated.View style={[styles.heroWrap, { transform: [{ translateY: imageTranslateY }] }]}>
        <Hero
          imageUrl={site.imageUrl}
          imageThumbnailUrl={site.imageThumbnailUrl}
          category={site.category[0]}
          imageCredit={site.imageCredit}
        />
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
          <Stack gap="lg" style={styles.content}>
            <View style={styles.titleBlock}>
              <AppText variant="h1" style={styles.title}>
                {site.name}
              </AppText>
              <FactsLine site={site} avgRating={avgRating} ratingCount={ratingCount} />
            </View>

            <QuickActions
              onDirections={handleDirections}
              onOpenReview={openReview}
              hasReview={!!myRating}
              onShare={() =>
                router.push({ pathname: "/share-frame", params: { entityId: id, entityName: site.name } })
              }
              isSaved={isSaved}
              onToggleSave={handleToggleSave}
              saveTarget={saveTarget}
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
              onAddReview={openReview}
            />
          </Stack>
        </View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.scrolledBar,
          { height: insets.top + SCROLLED_BAR_ROW, paddingTop: insets.top, opacity: scrolledBarOpacity },
        ]}
      >
        <AppText style={styles.scrolledBarTitle} numberOfLines={1}>
          {site.name}
        </AppText>
      </Animated.View>

      <SafeAreaView style={styles.backButtonWrap} pointerEvents="box-none">
        <Pressable
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
          // The screen it was opened from (tab history, app/(app)/(tabs)/_layout.tsx). A
          // place opened cold, from a link, has nowhere to go back to: the list then.
          onPress={() => (router.canGoBack() ? router.back() : router.navigate("/(app)/(tabs)/sites"))}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft color={tokens.colors.text} size={22} strokeWidth={2.25} />
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
            {...addTarget}
            style={[styles.itineraryButton, (isOffline || !addFlow) && styles.itineraryButtonDisabled]}
            disabled={isOffline || !addFlow}
            onPress={startAddToItinerary}
            accessibilityRole="button"
          >
            <AppText style={styles.itineraryButtonText}>
              {isOffline ? "Reconnect to Add to Trip" : "+ Add to Trip"}
            </AppText>
          </Pressable>
        </SafeAreaView>
      )}

      <components.TripChoiceSheet
        visible={showTripChoice}
        // The kit's defaults say "itinerary"; this app says "trip".
        title="Add to Trip"
        addExistingSublabel="Choose a day in one of your trips"
        createNewSublabel="Pick dates and add this place"
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

      <ReviewModal
        visible={reviewOpen}
        saving={reviewsSaving}
        draftRating={currentDraft.rating}
        draftText={currentDraft.text}
        error={reviewError}
        onChangeRating={(val) => setDraft(id, val, currentDraft.text)}
        onChangeText={(text) => setDraft(id, currentDraft.rating, text)}
        onClose={() => {
          setReviewError(null);
          setReviewOpen(false);
        }}
        onSave={async () => {
          setReviewError(null);
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
            // Not res.err: the hook hands back the transport's own words ("Network request
            // failed"). A guest can't get this far (openReview), and the modal itself asks
            // for a missing rating, so what's left is a failed save.
            setReviewError("Couldn't save your review. Check your connection and try again.");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        }}
      />
    </View>
  );
}

// The quiet line under the title: rating, category, price, website. Plain text
// with small dots between, where there used to be three differently coloured
// pills competing with the title.
// - Rating only when the place has reviews; the star is the highlight.
// - Category is the primary one, the same one that sets the map marker, with
//   the marker's own icon and colour so the two can't drift.
// - Website is the one tappable item, so it's in accent. The URL is
//   admin-entered, so only an http(s) URL renders as a link; anything else (a
//   typo, a bare domain) is hidden rather than handed to openURL.
function FactsLine({
  site,
  avgRating,
  ratingCount,
}: {
  site: Site;
  avgRating: number | null;
  ratingCount: number;
}) {
  const category = site.category[0];
  const cat = category ? CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other : null;
  const website = site.website && /^https?:\/\//i.test(site.website) ? site.website : null;

  const facts = [
    ratingCount > 0 && avgRating != null ? (
      <View key="rating" style={styles.fact}>
        <Star size={14} color={tokens.colors.highlight} fill={tokens.colors.highlight} />
        <AppText style={styles.factStrong}>{avgRating.toFixed(1)}</AppText>
        <AppText style={styles.factMuted}>({ratingCount})</AppText>
      </View>
    ) : null,
    cat && category ? (
      <View key="category" style={styles.fact}>
        <cat.Icon size={14} color={cat.color} strokeWidth={2.25} />
        <AppText style={styles.factText}>{SITE_CATEGORY_LABELS[category] ?? category}</AppText>
      </View>
    ) : null,
    site.price ? (
      <AppText key="price" style={styles.factText}>
        {site.price}
      </AppText>
    ) : null,
    website ? (
      <Pressable
        key="website"
        style={styles.fact}
        onPress={() => {
          Linking.openURL(website).catch(() => {});
        }}
        accessibilityRole="link"
        accessibilityLabel="Open website"
        hitSlop={8}
      >
        <AppText style={styles.factLink}>Website</AppText>
        <ExternalLink size={13} color={tokens.colors.accent} strokeWidth={2.25} />
      </Pressable>
    ) : null,
  ].filter(Boolean);

  if (!facts.length) return null;
  return (
    <View style={styles.factsLine}>
      {facts.map((fact, i) => (
        <View key={i} style={styles.factWithDot}>
          {i > 0 ? <View style={styles.factDot} /> : null}
          {fact}
        </View>
      ))}
    </View>
  );
}

// hoursNote holds opening times AND access/safety/amenity notes (44 of 53 lead
// with opening times, but "rockfall zone, do not linger" sits in the same
// field) — hence "Good to know" rather than "Hours". The data is consistently
// semicolon-separated clauses, so each gets its own line; as one run-on line
// the safety clauses got buried mid-sentence. A plain list ruled with
// hairlines: it's reference information, and a tinted box with a side bar made
// it look like a second tip.
function GoodToKnow({ note }: { note: string }) {
  const lines = note
    .split(";")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.charAt(0).toUpperCase() + l.slice(1));
  if (!lines.length) return null;
  return (
    <View>
      <AppText style={styles.sectionHeading}>Good to know</AppText>
      {lines.map((line, i) => (
        <View key={i} style={styles.goodToKnowRow}>
          <AppText style={styles.goodToKnowLine}>{line}</AppText>
        </View>
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
  // 16/26 rather than the body variant's 15 with no line height, which left
  // multi-paragraph descriptions cramped at React Native's default spacing.
  description: { fontSize: 16, lineHeight: 26, color: tokens.colors.text },
  titleBlock: { gap: tokens.space.sm },
  // 28pt at weight 800, down from the h1 variant's 34 at 900: big enough to
  // lead the page, without shouting over the quiet facts line under it.
  title: { fontSize: 28, lineHeight: 33, fontWeight: "800", letterSpacing: -0.6 },
  factsLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", rowGap: 6 },
  fact: { flexDirection: "row", alignItems: "center", gap: 5 },
  // A fact with the dot that separates it from the one before. No gap of its
  // own, so the dot's margins are the only space and it sits dead centre.
  factWithDot: { flexDirection: "row", alignItems: "center" },
  factDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: tokens.colors.textMuted, marginHorizontal: 9 },
  factText: { fontSize: 14, fontWeight: "500", color: tokens.colors.text2 },
  factStrong: { fontSize: 14, fontWeight: "700", color: tokens.colors.text },
  factMuted: { fontSize: 14, fontWeight: "500", color: tokens.colors.textMuted },
  factLink: { fontSize: 14, fontWeight: "700", color: tokens.colors.accent },
  // The heading for a section inside the page. Sentence case and a plain
  // weight: the small spaced capitals it replaces looked like form labels.
  sectionHeading: { fontSize: 17, fontWeight: "700", color: tokens.colors.text, marginBottom: 4 },
  goodToKnowRow: {
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  goodToKnowLine: { fontSize: 15, lineHeight: 22, color: tokens.colors.text },
  // The one tinted block on the page: the tip is its best line, and the only
  // thing here that isn't a plain fact about the place. No side bar or
  // capitals; the colour is enough.
  tipCard: {
    backgroundColor: tokens.colors.highlightDim,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: 4,
  },
  tipLabel: { fontSize: 13, fontWeight: "700", color: tokens.colors.highlight },
  tipText: { fontSize: 15, lineHeight: 23, color: tokens.colors.text },
  container: { flex: 1, backgroundColor: tokens.colors.bgBase },
  heroWrap: { position: "absolute", top: 0, left: 0, right: 0 },
  // The reading surface is white (bgCard), not the tinted page colour: long
  // text on a tinted ground is more tiring to read.
  sheet: {
    backgroundColor: tokens.colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 120,
    minHeight: 600,
  },
  // 20pt side margins, and no drag handle above: the sheet scrolls, it doesn't
  // drag, and the handle said otherwise.
  content: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.xl },
  // The title starts clear of the back button (16 + 44 + 12).
  scrolledBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: tokens.colors.accentWarm,
    justifyContent: "center",
    paddingLeft: 72,
    paddingRight: tokens.space.md,
  },
  scrolledBarTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  backButtonWrap: { position: "absolute", top: 0, left: 0, right: 0 },
  itineraryFloatingWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: tokens.space.lg,
    paddingTop: 12,
  },
  itineraryButton: {
    borderRadius: tokens.radius.lg,
    // The page's main action, so it takes the highlight (white text is 5.2:1).
    backgroundColor: tokens.colors.highlight,
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
  // A white disc with a dark arrow and a soft shadow: it reads on any photo,
  // and the shadow keeps it visible on the white sheet once the page has
  // scrolled under it.
  // 8 above and below: with the 44pt disc that is SCROLLED_BAR_ROW.
  backButton: {
    marginVertical: 8,
    marginHorizontal: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    ...cardLift,
    alignItems: "center",
    justifyContent: "center",
  },
});
