import { useCallback, useRef, useState } from "react";
import { Alert, Animated, ScrollView, View, StyleSheet, Pressable, useColorScheme } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useHalves, useWide } from "@blacksands/ui";
import { useNetInfo } from "@react-native-community/netinfo";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack as ExpoStack, router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { ArrowLeft, Check, ExternalLink, Star } from "lucide-react-native";

import { LoadingState, ErrorCard, Stack, AppText, AppButton, ReviewModal, components } from "@/lib/uiKit";
import { cardLift, darkEdge, lifted, PAGE_SIDES, tokens, SWEEP_COLORS, SWEEP_BUTTON, REVIEW_COLORS, READING_MAX } from "@/lib/ui/tokens";
import { wideTop } from "@/lib/ui/wideTop";
import { hooksBag } from "@/lib/hooksBag";
import { openDirections } from "@/lib/utils/directions";
import { useSession } from "@/lib/providers/SessionProvider";
import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { useTripPlaces } from "@/lib/hooks/useTripPlaces";
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

// Height of the back button's row: the 44pt disc with 8pt above and below. The
// bar that fades in on scroll is this tall under the status bar.
const SCROLLED_BAR_ROW = 60;

// The newest review not written by someone this user has blocked. The date is the API's
// text ("2026-11-03T…"); one with no date sorts last.
export function latestReview<T extends { userId: string; reviewCreatedAt?: string | null }>(
  reviews: T[],
  blockedUids: string[],
): T | undefined {
  const when = (r: T) => Date.parse(r.reviewCreatedAt ?? "") || 0;
  return reviews.filter((r) => !blockedUids.includes(r.userId)).sort((x, y) => when(y) - when(x))[0];
}

// `pane`: the place beside Explore's list on the open Duo (docs/plans/duo-131.md, "Place pane").
// It takes its width from its parent, scrolls on its own, pins Add to Trip to its own foot,
// and leaves the route's chrome (back button, status bar, scrolled bar) and the tour's
// targets to the full place screen, which can be mounted at the same time.
export function SiteDetail({ id, pane = false }: { id: string; pane?: boolean }) {
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

  // The latest review, for the box under the rating. The same cached read the count above
  // comes from, so it costs nothing more; the block list is one call per five minutes for
  // someone signed in. Never one by an author this user has blocked, as on the reviews screen.
  const { reviews } = hooksBag.usePublicReviews(id);
  const { data: blockedUids = [] } = hooksBag.useBlockedUsers(uid);
  const latest = latestReview(reviews, blockedUids);

  const { savedSiteIds, toggleSavedSite } = useSavedSites();
  const isSaved = savedSiteIds.has(id);

  const [reviewOpen, setReviewOpen] = useState(false);
  // Why the last review save failed, shown in the review modal. Cleared on each open.
  const [reviewError, setReviewError] = useState<string | null>(null);
  // The pane's own size (onLayout), never the window's.
  const [paneSize, setPaneSize] = useState({ width: 0, height: 0 });

  // The opening tour's step on this screen (lib/tour/tourSteps.ts): the add button for
  // someone with the unlock, the heart for someone without.
  const addTarget = useTourTarget("placeAdd");
  const saveTarget = useTourTarget("placeSave");

  // Add-to-itinerary flow, as rotorua-guide's detail screen does it. useItineraries
  // decides which step it opens on (addFlow); each step hands off to the next modal.
  const { addFlow } = useItineraries();
  // Where the place is in the trip, if it is: the line under the title, and the main button.
  const inTrip = useTripPlaces().dayOf(id);
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

  const handleDirections = useCallback(() => void openDirections(site?.lat, site?.lng), [site?.lat, site?.lng]);

  // The open Duo (docs/plans/design-sweep.md, "The place, picked: round 3 A"). One tree on
  // every width: only styles change and a slot fills or empties, so folding keeps the
  // scroll position and an open sheet.
  const wide = useWide();
  const { height, foldX, upright } = useHalves();
  const sideways = wide && !upright && !pane;
  const twoColumns = wide && upright && !pane;
  const insets = useSafeAreaInsets();
  // The pane's photo: the Duo's picked height, or 40% of the pane (to 480) once the pane is a
  // tablet's, 600 pt wide or more. The Duo's panes (401, 520) never reach that.
  const paneBase = upright ? 240 : 140;
  const paneHeight =
    paneSize.width >= 600 ? Math.min(480, Math.max(paneBase, Math.round(paneSize.height * 0.4))) : paneBase;
  const page = PAGE_SIDES[useColorScheme() === "dark" ? "dark" : "light"];
  // Upright: the photo is a third of the height and the sheet laps it from 300. Sideways:
  // the photo is the left page, full height, and the sheet is the right page.
  const photoHeight = sideways ? height : wide ? height / 3 : HERO_HEIGHT;
  const spacerHeight = sideways ? 0 : wide ? Math.max(300, Math.round(height / 3) - 17) : HERO_HEIGHT - 32;
  // The right page ends at the rail, which iOS reports as the right safe-area inset.
  const rightPage = sideways ? { left: foldX, right: insets.right } : null;
  // ponytail: the right column is whatever is left of the window, which is 244 on the Duo.
  const LEFT_COLUMN = 361;
  const GUTTER = 24;

  const scrollY = useRef(new Animated.Value(0)).current;
  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [0, sideways ? 0 : -(photoHeight / 2)],
    extrapolate: "clamp",
  });

  // Once the white sheet scrolls up to the top, two things went wrong: the
  // status bar's white text (white for the photo) had nothing to sit on, and
  // the floating back button sat on top of the page's text. So a teal bar fades
  // in over the last 40pt before the sheet gets there, covering the clock and
  // the back button's row and naming the place. (The sheet starts
  // HERO_HEIGHT - 32 down the scroll content.)
  const sheetAtBar = spacerHeight - (insets.top + SCROLLED_BAR_ROW);
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

  // A guest's button stays live so the tap can ask them to sign in.
  const addDisabled = session.status === "authed" && (isOffline || !addFlow);

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
          action={pane ? undefined : { label: "Go Back", onPress: () => router.replace("/(app)/(tabs)/sites") }}
        />
      </View>
    );
  }

  // Every description ends in a "Local tip:" line (house style). Pulled out
  // into its own callout so it isn't buried at the end of the last paragraph.
  // A description without one renders exactly as before.
  const [body, tip] = splitLocalTip(site.description);

  const blocks = (
    <>
            <View style={[styles.titleBlock, twoColumns && { width: LEFT_COLUMN }]}>
              <AppText variant="h1" style={styles.title}>
                {site.name}
              </AppText>
              <FactsLine site={site} avgRating={avgRating} ratingCount={ratingCount} />
              {inTrip ? (
                <View style={styles.inTripLine}>
                  <Check size={16} color={tokens.colors.surf} strokeWidth={2.5} />
                  <AppText accessibilityRole="text" style={styles.inTripText}>{`In your trip · Day ${inTrip.dayNumber}`}</AppText>
                </View>
              ) : null}
            </View>

            {/* Upright on the Duo these are two columns, the right one level with the buttons;
                everywhere else one column in the phone's order. */}
            <View
              testID="place-columns"
              style={[styles.column, twoColumns && { flexDirection: "row", columnGap: GUTTER }]}
            >
            <View testID="place-left" style={[styles.column, twoColumns && { width: LEFT_COLUMN }]}>
            <QuickActions
              onDirections={handleDirections}
              onOpenReview={openReview}
              hasReview={!!myRating}
              onShare={() =>
                router.push({ pathname: "/share-frame", params: { entityId: id, entityName: site.name } })
              }
              isSaved={isSaved}
              onToggleSave={handleToggleSave}
              saveTarget={pane ? undefined : saveTarget}
            />

            {/* Primary text colour, not status="hint": this is the page's main
                content, and hint is the de-emphasised caption style. The
                template shipped with hint; rotorua-guide fixed the same thing
                on 2026-09-04. */}
            <AppText style={styles.description}>{body}</AppText>
            </View>

            <View testID="place-right" style={[styles.column, twoColumns && { flex: 1 }]}>
            {site.hoursNote ? <GoodToKnow note={site.hoursNote} last={twoColumns} /> : null}

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
              // The picked drawing (docs/plans/design-sweep.md): the rating as the
              // heading, the latest review in a box, two links under it.
              variant="open"
              colors={REVIEW_COLORS}
              isOffline={isOffline}
              latestReview={
                latest && {
                  authorName: latest.userName,
                  rating: latest.rating,
                  text: latest.text,
                  createdAt: latest.reviewCreatedAt,
                }
              }
            />
            </View>
            </View>
    </>
  );

  return (
    <View
      testID={pane ? "place-pane" : undefined}
      style={pane ? styles.pane : styles.container}
      onLayout={pane ? (e) => setPaneSize(e.nativeEvent.layout) : undefined}
    >
      {pane ? (
        <ScrollView
          testID="place-scroll"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.paneScroll}
        >
          {/* The photo is a card, the first thing in the scroll. */}
          <View testID="place-pane-photo" style={styles.paneSide}>
            <Hero
              card
              height={paneHeight}
              imageUrl={site.imageUrl}
              imageThumbnailUrl={site.imageThumbnailUrl}
              category={site.category[0]}
              siteId={site.id}
              imageCredit={site.imageCredit}
            />
          </View>
          <View testID="place-pane-body" style={[styles.paneSide, { paddingTop: upright ? 22 : 16 }]}>
            <Stack gap="lg">{blocks}</Stack>
          </View>
        </ScrollView>
      ) : (
      <>
      <ExpoStack.Screen options={{ headerShown: false }} />
      {/* The clock sits over the photo, then over the teal band. */}
      <LightStatusBar />

      <Animated.View
        testID="place-hero"
        style={[
          styles.heroWrap,
          sideways && { right: undefined, width: foldX },
          { transform: [{ translateY: imageTranslateY }] },
        ]}
      >
        <Hero
          height={photoHeight}
          wide={wide}
          lap={sideways ? 12 : wide ? 20 : 32}
          imageUrl={site.imageUrl}
          imageThumbnailUrl={site.imageThumbnailUrl}
          category={site.category[0]}
          siteId={site.id}
          imageCredit={site.imageCredit}
        />
      </Animated.View>

      <Animated.ScrollView
        testID="place-scroll"
        style={[StyleSheet.absoluteFill, rightPage]}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        showsVerticalScrollIndicator={false}
      >
        <View testID="place-spacer" style={{ height: spacerHeight }} />
        <View style={[styles.sheet, sideways && { borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
          <Stack
            gap="lg"
            style={[styles.content, wide && { paddingHorizontal: tokens.space.lg }]}
          >
            {blocks}
          </Stack>
        </View>
      </Animated.ScrollView>
      </>
      )}

      {pane ? null : (
      <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.scrolledBar,
          { height: insets.top + SCROLLED_BAR_ROW, paddingTop: insets.top, opacity: scrolledBarOpacity },
          // Sideways the sheet is already at the top, so there is nothing to cover.
          sideways && { display: "none" },
        ]}
      >
        <AppText style={styles.scrolledBarTitle} numberOfLines={1}>
          {site.name}
        </AppText>
      </Animated.View>

      <SafeAreaView style={styles.backButtonWrap} pointerEvents="box-none">
        <Pressable
          // Sideways the status bar is in the rail (inset 0): 32 from the top, not 8.
          style={[styles.backButton, wide && { marginHorizontal: tokens.space.lg, marginTop: wideTop(insets.top, 8) }]}
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
      </>
      )}

      {/* A guest sees it too and is asked to sign in, as for Save and Review: it's
          the app's main action, and everyone now starts as a guest. Hidden for Stay
          via canAddToItinerary() — the same rule the map uses, so the two can't drift.
          ponytail: no premium gate here — v1 has no paid unlock (see the stub
          in lib/hooks/useEntitlementGate.ts). rotorua-guide's version opens
          PremiumFeatureModal first; add that back when commerce lands. */}
      {(session.status === "authed" || session.status === "guest") && canAddToItinerary(site) && (
        <View
          testID="place-add"
          style={[
            styles.itineraryFloatingWrap,
            // The bottom gap is JS layout, not the native SafeAreaView's padding, which lands
            // after the tour's measurement and left its cut-out ~inset pt below the button.
            { paddingBottom: pane ? 0 : insets.bottom },
            rightPage,
            // Pinned to the pane's foot: 12 above and below, 20 at the sides, no line.
            pane && styles.paneAdd,
            // Upright on the Duo a fade above the row replaces the line, so no text looks cut.
            twoColumns && { borderTopWidth: 0, paddingHorizontal: tokens.space.lg },
            sideways && { paddingHorizontal: tokens.space.lg },
          ]}
          pointerEvents="box-none"
        >
          {twoColumns || pane ? (
            <LinearGradient
              testID="place-add-fade"
              colors={[`${page}00`, page]}
              style={styles.addFade}
              pointerEvents="none"
            />
          ) : null}
          {/* The tour lights this up; the View is what it measures. */}
          <View {...(pane ? null : addTarget)} style={[styles.itineraryButton, pane && { marginBottom: tokens.space.sm }]}>
            <AppButton
              fullWidth
              shape={{ labelSize: 17 }}
              disabled={inTrip ? false : addDisabled}
              onPress={() =>
                inTrip
                  ? router.push({
                      pathname: "/(app)/(tabs)/itinerary/[itineraryId]",
                      params: { itineraryId: inTrip.tripId, jumpToDay: inTrip.dayId },
                    })
                  : signedIn("Sign in to plan your trip.") && startAddToItinerary()
              }
            >
              {inTrip ? "View in Trip" : isOffline ? "Reconnect to Add to Trip" : "+ Add to Trip"}
            </AppButton>
            {inTrip ? (
              <Pressable
                accessibilityRole="link"
                disabled={addDisabled}
                onPress={startAddToItinerary}
                hitSlop={8}
                style={styles.addAgain}
              >
                <AppText style={[styles.addAgainText, addDisabled && { opacity: 0.4 }]}>Add Again</AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}

      <components.TripChoiceSheet
        visible={showTripChoice}
        // The kit's defaults say "itinerary"; this app says "trip".
        title="Add to Trip"
        variant="sheet"
        wide={wide}
        colors={{ ...SWEEP_COLORS, edge: darkEdge.borderColor }}
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
            ? {
                id: site.id,
                name: site.name,
                imageUrl: site.imageThumbnailUrl ?? site.imageUrl ?? undefined,
                category: site.category[0],
              }
            : null
        }
        initialItineraryId={pendingItineraryId}
        onClose={() => {
          setIsAddingToTrip(false);
          setPendingItineraryId(null);
        }}
      />

      <ReviewModal
        // The picked drawing: a sheet with no Cancel (the close mark is the way out) and
        // no line under the title.
        variant="openSheet"
        title="Share Your Experience"
        subtitle=""
        wide={wide}
        colors={{ ...REVIEW_COLORS, edge: darkEdge.borderColor }}
        saveButton={{ shape: { ...SWEEP_BUTTON, labelSize: 17 } }}
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
// - Website is the one tappable item, and one to push, so it's in the highlight
//   (orange is for what to tap: docs/plans/design-sweep.md). The URL is
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
        <cat.Icon size={14} color={lifted(cat.color)} strokeWidth={2.25} />
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
        <ExternalLink size={13} color={tokens.colors.highlight} strokeWidth={2.25} />
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
function GoodToKnow({ note, last }: { note: string; last?: boolean }) {
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
        <View
          key={i}
          style={[styles.goodToKnowRow, last && i === lines.length - 1 && { borderBottomWidth: 0 }]}
        >
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
  description: { fontSize: 16, lineHeight: 26, color: tokens.colors.text, maxWidth: READING_MAX },
  // The page's two groups of blocks, spaced as the Stack above them (lg).
  column: { gap: tokens.space.lg },
  addFade: { position: "absolute", top: -36, left: 0, right: 0, height: 36 },
  titleBlock: { gap: tokens.space.sm },
  // 26pt bold since the design sweep (it was 28 at 800, and the h1 variant is 34 at 900):
  // big enough to lead the page, without shouting over the quiet facts line under it.
  title: { fontSize: 26, lineHeight: 31, fontWeight: "700", letterSpacing: -0.4 },
  inTripLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  inTripText: { fontSize: 15, fontWeight: "600", color: tokens.colors.surf },
  addAgain: { alignSelf: "center", paddingTop: 12, paddingBottom: 4 },
  addAgainText: { fontSize: 15, fontWeight: "600", color: tokens.colors.highlight },
  factsLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", rowGap: 6 },
  fact: { flexDirection: "row", alignItems: "center", gap: 5 },
  // A fact with the dot that separates it from the one before. No gap of its
  // own, so the dot's margins are the only space and it sits dead centre.
  factWithDot: { flexDirection: "row", alignItems: "center" },
  factDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: tokens.colors.textMuted, marginHorizontal: 9 },
  factText: { fontSize: 14, fontWeight: "500", color: tokens.colors.text2 },
  factStrong: { fontSize: 14, fontWeight: "700", color: tokens.colors.text },
  factMuted: { fontSize: 14, fontWeight: "500", color: tokens.colors.textMuted },
  factLink: { fontSize: 14, fontWeight: "700", color: tokens.colors.highlight },
  // The heading for a section inside the page. Sentence case and a plain
  // weight: the small spaced capitals it replaces looked like form labels.
  sectionHeading: { fontSize: 17, fontWeight: "700", color: tokens.colors.text, marginBottom: 4 },
  goodToKnowRow: {
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.line,
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
  container: { flex: 1, backgroundColor: tokens.colors.page },
  // The pane fills the parent Explore gives it; its width is the parent's, never the window's.
  pane: { flex: 1, backgroundColor: tokens.colors.page },
  paneScroll: { paddingBottom: 96 },
  paneSide: { paddingHorizontal: tokens.space.lg },
  paneAdd: { borderTopWidth: 0, paddingHorizontal: tokens.space.lg },
  heroWrap: { position: "absolute", top: 0, left: 0, right: 0 },
  // The reading surface is the white page of the design sweep's look, with the sheets'
  // 20pt top corners (docs/plans/design-sweep.md).
  sheet: {
    backgroundColor: tokens.colors.page,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 120,
    minHeight: 600,
  },
  // The page's 16pt side margins, and no drag handle above: the sheet scrolls, it doesn't
  // drag, and the handle said otherwise.
  content: { paddingHorizontal: tokens.space.md, paddingTop: 22 },
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
    // A row of its own at the foot of the screen, where the tab bar would be (it is
    // hidden on this screen: app/(app)/(tabs)/_layout.tsx). The page's colour with a line
    // above, so the text scrolls under an edge and not under a floating button.
    backgroundColor: tokens.colors.page,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.line,
    paddingHorizontal: tokens.space.md,
    paddingTop: 12,
  },
  // The page's main action: the kit's button, in the highlight.
  itineraryButton: { marginBottom: tokens.space.sm },
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
    backgroundColor: tokens.colors.bgCard,
    ...cardLift,
    // A fixed 44pt disc, so the line takes no room: see-through in light, the outline in dark.
    borderWidth: 1,
    borderColor: darkEdge.borderColor,
    alignItems: "center",
    justifyContent: "center",
  },
});
