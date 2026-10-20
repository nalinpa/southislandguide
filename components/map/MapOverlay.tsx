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
import { tokens } from "@/lib/ui/tokens";
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

// The brand's deep teal, like every other screen's top bar. It was the near-
// black text colour, with a serif title: the one place in the app that looked
// like a different product.
// Dark all the way down: the sheet's text is white, and the nearby rows sit at
// the bottom. It used to fade to the page colour, which was fine when that was
// a mid mint but left white text at 1.1:1 once the page went near-white. It
// now only eases from the deep teal to the slightly lighter brand teal.
export const SHEET_GRADIENT = [tokens.colors.accentWarm, tokens.colors.accentWarm, tokens.colors.accent] as const;

const SheetBackground = ({ style }: { style?: any }) => (
  <LinearGradient colors={SHEET_GRADIENT} locations={[0, 0.32, 1]} style={style as any} />
);

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

    const cardCenterX = 20 + nearestIndex * (128 + 10) + 64;
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
              <ActivityIndicator color="rgba(255,255,255,0.7)" size="small" />
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
      .join(" · ")
      .toUpperCase();
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
              {metaLine ? <Text style={styles.siteMeta}>{metaLine}</Text> : null}
            </Pressable>
            {hasLoc && (
              <View style={styles.distancePill}>
                <Navigation
                  size={10}
                  color={tokens.colors.highlightOnDark}
                  fill={tokens.colors.highlightOnDark}
                  strokeWidth={2}
                />
                <Text style={styles.distancePillText}>{distanceLabel}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={onOpen} style={styles.btnDetails} accessibilityRole="button">
            <Text style={styles.btnDetailsText}>Details</Text>
          </Pressable>
          <Pressable
            onPress={() => getDirections(site.lat, site.lng, site.name)}
            style={styles.btnDirections}
            accessibilityRole="button"
          >
            <Navigation size={14} color="#FFFFFF" strokeWidth={2.25} />
            <Text style={styles.btnDirectionsText}>Directions</Text>
          </Pressable>
        </View>
        {onAddToItinerary && (
          <View style={styles.actionsSecondary}>
            <Pressable
              onPress={onAddToItinerary}
              disabled={isOffline}
              accessibilityRole="button"
              style={[styles.btnAddToTrip, isOffline && styles.btnAddToTripDisabled]}
            >
              <CalendarPlus size={16} color={tokens.colors.accent} strokeWidth={2.25} />
              <Text style={styles.btnAddToTripText}>{isOffline ? "Reconnect to Add" : "Add to Trip"}</Text>
            </Pressable>
          </View>
        )}
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
            <Text style={styles.nearbySectionTitle}>TODAY'S PLAN</Text>
            <ScrollView
              ref={carouselRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
            >
              {todayItems.map((item) => {
                const dotColor = (CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other).color;
                const cardImage = siteImage(item.imageUrl, item.category, "thumb");
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
            <Text style={styles.nearbySectionTitle}>NEARBY</Text>
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
                    { backgroundColor: (CATEGORY_CONFIG[nearby.category] ?? CATEGORY_CONFIG.other).color },
                  ]}
                />
                <Text style={styles.nearbyName} numberOfLines={1}>
                  {nearby.name}
                </Text>
                <Text style={styles.nearbyDist}>
                  {formatDistanceMeters(nearby.distanceMeters)}
                </Text>
                <ChevronRight size={14} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBgStyle: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { backgroundColor: "rgba(255,255,255,0.28)", width: 40, height: 4 },
  scrollContent: {},
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 6 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  headerLeft: { flex: 1, gap: 3 },
  siteName: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.4, lineHeight: 30 },
  siteMeta: { fontSize: 11, fontWeight: "700", color: tokens.colors.onDarkMuted, letterSpacing: 1.5 },
  // The distance is the live fact, so it takes the highlight, as on the list.
  distancePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, marginTop: 2,
  },
  distancePillText: { fontSize: 13, fontWeight: "700", color: tokens.colors.highlightOnDark },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 4 },
  loadingLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 2, color: "rgba(255,255,255,0.5)" },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingBottom: 8 },
  btnDetails: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center",
  },
  btnDetailsText: { fontSize: 14, fontWeight: "600", color: tokens.colors.text, letterSpacing: 0.1 },
  // The sheet's main action: the full-strength highlight with a white label
  // (5.2:1), like every other orange button. Teal on the teal sheet would
  // vanish, and white on the lighter on-dark orange is only 1.7:1.
  btnDirections: {
    flex: 1, flexDirection: "row", gap: 6, paddingVertical: 14, borderRadius: 10,
    backgroundColor: tokens.colors.highlight, alignItems: "center", justifyContent: "center",
  },
  btnDirectionsText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.1 },
  actionsSecondary: { paddingHorizontal: 20, paddingBottom: 8, marginTop: 4 },
  // Solid white with a dark label: the brightest thing on the teal sheet after
  // the orange Directions button. As a thin white outline it was the faintest,
  // for the one action that builds a trip.
  btnAddToTrip: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 15, borderRadius: 10, backgroundColor: "#FFFFFF",
  },
  btnAddToTripDisabled: { opacity: 0.5 },
  btnAddToTripText: { fontSize: 15, fontWeight: "700", color: tokens.colors.text, letterSpacing: 0.1 },
  nearbySection: { paddingTop: 4 },
  nearbySep: {
    height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 20, marginBottom: 20, marginTop: 8,
  },
  nearbySectionTitle: {
    fontSize: 11, fontWeight: "700", letterSpacing: 2, color: tokens.colors.onDarkMuted,
    paddingHorizontal: 20, marginBottom: 8,
  },
  nearbyRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 13,
    marginHorizontal: 12, marginBottom: 6, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)",
  },
  // A white ring so a dark category colour (Stay's brown, Culture's maroon)
  // still shows on the teal.
  nearbyDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0, borderWidth: 1.5, borderColor: "#FFFFFF" },
  nearbyName: { flex: 1, fontSize: 15, fontWeight: "600", color: "#FFFFFF", letterSpacing: -0.1 },
  nearbyDist: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  carouselContent: { paddingLeft: 20, paddingRight: 12, gap: 10, paddingBottom: 4 },
  carouselCard: { width: 128, height: 168, borderRadius: 14, overflow: "hidden" },
  cardImageBg: { width: 128, height: 168, justifyContent: "space-between", padding: 10 },
  cardImage: { borderRadius: 14 },
  cardFallback: { backgroundColor: "rgba(255,255,255,0.1)", borderLeftWidth: 3 },
  cardTime: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, color: "rgba(255,255,255,0.65)", textTransform: "uppercase" },
  cardBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  cardName: { flex: 1, fontSize: 13, fontWeight: "700", color: "#FFFFFF", letterSpacing: -0.1, lineHeight: 17, marginRight: 6 },
  cardDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0, marginBottom: 2 },
});
