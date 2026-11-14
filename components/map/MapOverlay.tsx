// components/map/MapOverlay.tsx
import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  ActivityIndicator,
  Pressable,
  View,
  Text,
  ImageBackground,
  useWindowDimensions,
  Linking,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Navigation, ChevronRight, CalendarPlus } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDistanceMeters } from "@blacksands/hooks";
import { CATEGORY_CONFIG } from "@/components/map/SiteMarker";
import { darkEdge, lifted, tokens } from "@/lib/ui/tokens";
import { siteImage } from "@/lib/categoryImages";
import { SITE_CATEGORY_LABELS, type Site, type SiteCategory } from "@/lib/models";
import { areaName } from "@/lib/areas";

export type NearbySite = {
  id: string;
  name: string;
  category: SiteCategory;
  distanceMeters: number | null;
};

export type ActiveItineraryItem = {
  id: string;
  siteId: string;
  siteName: string;
  timeLabel: string;
  category: SiteCategory;
  imageUrl?: string | null;
};

interface MapOverlayProps {
  site: Site | null;
  distanceMeters: number;
  onOpen: () => void;
  onSelectSite: (id: string) => void;
  onFocusSite: () => void;
  onAddToItinerary?: () => void;
  isOffline?: boolean;
  nearbySites: NearbySite[];
  todayItems: ActiveItineraryItem[] | null;
  locStatus: "unknown" | "granted" | "denied";
  hasLoc: boolean;
  locError?: boolean;
  refreshingGPS?: boolean;
  bottomSheetRef: React.RefObject<BottomSheet | null>;
}

const SNAP_DEFAULT = ["12%", "22%", "40%"];

// The white page of the design sweep's look, with dark text (docs/plans/design-sweep.md).
// It was the brand's deep teal with white text, the one dark sheet in the app.
const SheetBackground = ({ style }: { style?: any }) => <View style={[style, styles.sheetBg]} />;

// ponytail: lib/utils/navigation.ts (and its getDirections export) doesn't exist in this
// repo — the brief's premise about sites/[siteId]/index.tsx having a handleDirections to
// port from doesn't hold either (no directions handler exists anywhere in this codebase).
// Universal Google Maps directions URL works cross-platform (opens the Maps app if
// installed, else browser) — no Platform branching needed.
function getDirections(lat: number, lng: number, _label: string) {
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
}

function timeLabelToMinutes(label: string): number {
  const match = label.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function MapOverlayCard({
  site,
  onOpen,
  onSelectSite,
  onFocusSite,
  onAddToItinerary,
  isOffline = false,
  nearbySites,
  todayItems,
  locStatus,
  hasLoc,
  locError = false,
  distanceMeters,
  refreshingGPS = false,
  bottomSheetRef,
}: MapOverlayProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const carouselRef = useRef<any>(null);
  const hasAutoScrolled = useRef(false);

  useEffect(() => {
    if (hasAutoScrolled.current || !todayItems?.length) return;
    hasAutoScrolled.current = true;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let nearestIndex = 0;
    let minDiff = Infinity;
    todayItems.forEach((item, i) => {
      const diff = Math.abs(timeLabelToMinutes(item.timeLabel) - currentMinutes);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIndex = i;
      }
    });

    const cardCenterX = tokens.space.md + nearestIndex * (128 + 10) + 64;
    const scrollX = Math.max(0, cardCenterX - windowWidth / 2);

    setTimeout(() => {
      carouselRef.current?.scrollTo({ x: scrollX, animated: true });
    }, 400);
  }, [todayItems, windowWidth]);

  const isDenied = locStatus === "denied";
  const isRequesting = !isDenied && !locError && !hasLoc;

  const renderCard = () => {
    if (!site) return null;

    if (isRequesting || refreshingGPS) {
      return (
        <>
          <View style={styles.header}>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={tokens.colors.textMuted} size="small" />
              <Text style={styles.loadingLabel}>CALIBRATING GPS</Text>
            </View>
            <Pressable onPress={onFocusSite} accessibilityRole="button" accessibilityLabel={`Show ${site.name} on the map`}>
              <Text style={styles.siteName} numberOfLines={2}>
                {site.name}
              </Text>
            </Pressable>
          </View>
          <View style={styles.actions}>
            <Pressable onPress={onOpen} style={styles.btnDetails} accessibilityRole="button">
              <Text style={styles.btnDetailsText}>View Details</Text>
            </Pressable>
          </View>
        </>
      );
    }

    // The category's label (as on Explore's tabs) and the town, by name. They used to be
    // the raw ids: "FOOD · WEST-COAST".
    const category = site.category[0];
    const metaLine = [category && (SITE_CATEGORY_LABELS[category] ?? category), site.area && areaName(site.area)]
      .filter(Boolean)
      .join(" · ");
    const distanceLabel = formatDistanceMeters(distanceMeters);

    return (
      <>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.headerLeft}
              onPress={onFocusSite}
              accessibilityRole="button"
              accessibilityLabel={`Show ${site.name} on the map`}
            >
              <Text style={styles.siteName} numberOfLines={2}>
                {site.name}
              </Text>
              {/* One line of facts in plain text: the category, the town, how far. The
                  distance was in an amber pill; colour is kept for what to tap. */}
              {metaLine || hasLoc ? (
                <Text style={styles.siteMeta}>
                  {metaLine}
                  {metaLine && hasLoc ? " · " : ""}
                  {hasLoc ? <Text style={styles.siteDistance}>{distanceLabel}</Text> : null}
                </Text>
              ) : null}
            </Pressable>
          </View>
        </View>
        {/* Add to Trip and Details on the first row, which shows at the sheet's opening
            height (22%), and Directions on its own row under them (owner, 2026-11-11).
            Before 2026-11-10 Add to Trip had that second row, below the fold. */}
        <View style={styles.actions}>
          {onAddToItinerary && (
            <Pressable
              onPress={onAddToItinerary}
              disabled={isOffline}
              accessibilityRole="button"
              style={[styles.btnAddToTrip, isOffline && styles.btnAddToTripDisabled]}
            >
              <CalendarPlus size={17} color="#FFFFFF" strokeWidth={2.25} />
              <Text style={styles.btnAddToTripText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {isOffline ? "Offline" : "Add to Trip"}
              </Text>
            </Pressable>
          )}
          <Pressable onPress={onOpen} style={styles.btnDetails} accessibilityRole="button">
            <Text style={styles.btnDetailsText} numberOfLines={1}>Details</Text>
          </Pressable>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={() => getDirections(site.lat, site.lng, site.name)}
            style={styles.btnDirections}
            accessibilityRole="button"
          >
            <Navigation size={16} color={tokens.colors.text} strokeWidth={2.25} />
            <Text style={styles.btnDirectionsText} numberOfLines={1}>
              Get Directions
            </Text>
          </Pressable>
        </View>
      </>
    );
  };

  const isBaseState = !!site && !isRequesting && !refreshingGPS;
  const showItinerary = isBaseState && !!todayItems?.length;
  const showNearby = isBaseState && !showItinerary && nearbySites.length > 0;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={SNAP_DEFAULT}
      enablePanDownToClose={false}
      backgroundComponent={SheetBackground}
      backgroundStyle={styles.sheetBgStyle}
      handleIndicatorStyle={styles.handle}
      style={styles.sheetLift}
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        {renderCard()}

        {showItinerary && todayItems && (
          <View style={styles.nearbySection}>
            <View style={styles.nearbySep} />
            <Text style={styles.nearbySectionTitle}>Today's Trip</Text>
            <ScrollView
              ref={carouselRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
            >
              {todayItems.map((item) => {
                const dotColor = (CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other).color;
                const cardImage = siteImage(item.imageUrl, item.category, "thumb", item.siteId);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => onSelectSite(item.siteId)}
                    style={styles.carouselCard}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.timeLabel}, ${item.siteName}`}
                  >
                    {cardImage ? (
                      <ImageBackground
                        source={cardImage}
                        style={styles.cardImageBg}
                        imageStyle={styles.cardImage}
                      >
                        <LinearGradient
                          colors={["transparent", "rgba(4,32,36,0.85)"]}
                          locations={[0.35, 1]}
                          style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.cardTime}>{item.timeLabel}</Text>
                        <View style={styles.cardBottom}>
                          <Text style={styles.cardName} numberOfLines={2}>
                            {item.siteName}
                          </Text>
                          <View style={[styles.cardDot, { backgroundColor: dotColor }]} />
                        </View>
                      </ImageBackground>
                    ) : (
                      <View style={[styles.cardImageBg, styles.cardFallback, { borderLeftColor: dotColor }]}>
                        <Text style={styles.cardTime}>{item.timeLabel}</Text>
                        <View style={styles.cardBottom}>
                          <Text style={styles.cardName} numberOfLines={2}>
                            {item.siteName}
                          </Text>
                          <View style={[styles.cardDot, { backgroundColor: dotColor }]} />
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {showNearby && (
          <View style={styles.nearbySection}>
            <View style={styles.nearbySep} />
            <Text style={styles.nearbySectionTitle}>Nearby</Text>
            {nearbySites.map((nearby) => (
              <Pressable
                key={nearby.id}
                onPress={() => onSelectSite(nearby.id)}
                style={styles.nearbyRow}
                accessibilityRole="button"
                accessibilityLabel={`${nearby.name}, ${formatDistanceMeters(nearby.distanceMeters)}`}
              >
                <View
                  style={[
                    styles.nearbyDot,
                    { backgroundColor: lifted((CATEGORY_CONFIG[nearby.category] ?? CATEGORY_CONFIG.other).color) },
                  ]}
                />
                <Text style={styles.nearbyName} numberOfLines={1}>
                  {nearby.name}
                </Text>
                <Text style={styles.nearbyDist}>
                  {formatDistanceMeters(nearby.distanceMeters)}
                </Text>
                <ChevronRight size={16} color={tokens.colors.textMuted} strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBgStyle: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  // bgCard: white in light as the page is; in dark a step lighter than the page, with a
  // hairline, since the shadow shows nothing on a dark map. The sheet's background is laid
  // behind its content, so the line takes no room.
  sheetBg: { backgroundColor: tokens.colors.bgCard, borderWidth: 1, borderColor: darkEdge.borderColor },
  // A white sheet over a pale map needs an edge: a soft shadow upwards.
  sheetLift: {
    shadowColor: "#0A1F1B",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: { backgroundColor: tokens.colors.border, width: 36, height: 4 },
  scrollContent: {},
  header: { paddingHorizontal: tokens.space.md, paddingTop: 4, paddingBottom: 14, gap: 6 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  headerLeft: { flex: 1, gap: 3 },
  siteName: { fontSize: 20, fontWeight: "700", color: tokens.colors.text, letterSpacing: -0.2, lineHeight: 25 },
  siteMeta: { fontSize: 15, color: tokens.colors.text2 },
  siteDistance: { fontSize: 15, color: tokens.colors.text2 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 4 },
  loadingLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 2, color: tokens.colors.textMuted },
  actions: { flexDirection: "row", gap: 8, paddingHorizontal: tokens.space.md, paddingBottom: 8 },
  // The second buttons: a pale box with dark words, so the orange one is the main action.
  btnDetails: {
    flex: 1, height: 50, borderRadius: 12,
    backgroundColor: tokens.colors.bgSurface, alignItems: "center", justifyContent: "center",
  },
  btnDetailsText: { fontSize: 16, fontWeight: "600", color: tokens.colors.text },
  // Pale, like Details: a trip planner's main action is Add to Trip, above it
  // (tester, 2026-11-09: "why is Directions the highlighted button?").
  btnDirections: {
    flex: 1, flexDirection: "row", gap: 6, height: 50, paddingHorizontal: 6, borderRadius: 12,
    backgroundColor: tokens.colors.bgSurface, alignItems: "center", justifyContent: "center",
  },
  btnDirectionsText: { flexShrink: 1, fontSize: 16, fontWeight: "600", color: tokens.colors.text },
  // The sheet's main action: the highlight with a white label (5.2:1), like every other
  // orange button.
  btnAddToTrip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    height: 50, paddingHorizontal: 6, borderRadius: 12, backgroundColor: tokens.button.primary.bg,
  },
  btnAddToTripDisabled: { opacity: 0.5 },
  btnAddToTripText: { flexShrink: 1, fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  nearbySection: { paddingTop: 4 },
  nearbySep: { height: 1, backgroundColor: tokens.colors.line, marginHorizontal: tokens.space.md, marginBottom: 14, marginTop: 8 },
  // A section name as on Profile and the sheets: small, grey, as written.
  nearbySectionTitle: {
    fontSize: 14, fontWeight: "600", color: tokens.colors.text2,
    paddingHorizontal: tokens.space.md, marginBottom: 6,
  },
  // Rows on the page with a line under each, not tinted boxes.
  nearbyRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14,
    marginHorizontal: tokens.space.md, borderBottomWidth: 1, borderBottomColor: tokens.colors.line,
  },
  nearbyDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  nearbyName: { flex: 1, fontSize: 16, fontWeight: "500", color: tokens.colors.text },
  nearbyDist: { fontSize: 15, color: tokens.colors.textMuted },
  carouselContent: { paddingLeft: tokens.space.md, paddingRight: 12, gap: 10, paddingBottom: 4 },
  carouselCard: { width: 128, height: 168, borderRadius: 14, overflow: "hidden" },
  cardImageBg: { width: 128, height: 168, justifyContent: "space-between", padding: 10 },
  cardImage: { borderRadius: 14 },
  // No photo: the deep teal, so the white words on the card still read.
  cardFallback: { backgroundColor: tokens.colors.accentWarm, borderLeftWidth: 3 },
  cardTime: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, color: "rgba(255,255,255,0.65)", textTransform: "uppercase" },
  cardBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  cardName: { flex: 1, fontSize: 13, fontWeight: "700", color: "#FFFFFF", letterSpacing: -0.1, lineHeight: 17, marginRight: 6 },
  cardDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0, marginBottom: 2 },
});
