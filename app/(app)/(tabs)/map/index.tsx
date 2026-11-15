import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, useColorScheme, Text, TextInput, TouchableOpacity, ScrollView, Keyboard, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useHalves, useWide } from "@blacksands/ui";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import BottomSheet from "@gorhom/bottom-sheet";
import { useNetInfo } from "@react-native-community/netinfo";
import { Search, SlidersHorizontal, Crosshair, Layers, AlertCircle, Lock, ChevronRight, X, CalendarDays } from "lucide-react-native";
import type { MapType } from "react-native-maps";

import { LoadingState, ErrorCard, components } from "@/lib/uiKit";
import { CARD_SIDES, darkEdge, pair, tokens, SWEEP_COLORS } from "@/lib/ui/tokens";
import { hooksBag } from "@/lib/hooksBag";
import { useEntitlementGate } from "@/lib/hooks/useEntitlementGate";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { useOfflineMap } from "@/lib/hooks/useOfflineMap";
import { offlineMapDir } from "@/lib/offlineMap";
import { useSession } from "@/lib/providers/SessionProvider";
import { usePurchaseContext } from "@/lib/iap/PurchaseProvider";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import { SITE_CATEGORIES, SITE_CATEGORY_LABELS, canAddToItinerary, matchesSearch, type SiteCategory } from "@/lib/models";
import { distanceMeters, nearestSite, NEAR_PLACES_METERS } from "@/lib/utils/geoDistance";
import { isInNZ } from "@/lib/utils/directions";
import { SitesMapView, initialRegionFrom } from "@/components/map/SitesMapView";
import type { SitesMapViewHandle } from "@/components/map/SitesMapView";
import { MapOverlayCard } from "@/components/map/MapOverlay";
import type { NearbySite, ActiveItineraryItem } from "@/components/map/MapOverlay";
import { PANEL_PAD, PANEL_WIDTH, SEARCH_HEIGHT, searchTop } from "@/components/map/MapPanel";
import { AddToTripModal } from "@/components/itinerary/AddToTripModal";
import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";
import { PremiumFeatureModal } from "@/components/itinerary/PremiumFeatureModal";

import { nearestArea } from "@/components/map/MapRegion";
import { DEFAULT_AREA } from "@/lib/areas";

export default function MapScreen() {
  const wide = useWide();
  const { upright } = useHalves();
  const searchAt = searchTop(upright);
  const card = CARD_SIDES[useColorScheme() === "dark" ? "dark" : "light"];
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;

  const {
    entitledProductIds,
    loading: entitlementsLoading,
    unknown: entitlementsUnknown,
    recheck: recheckEntitlements,
    isSiteLocked,
  } = useEntitlementGate(uid);
  const { requestBuy } = usePurchaseContext();

  const { locations, loading, err } = hooksBag.useLocations();
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const { level: offlineMapLevel } = useOfflineMap();
  // The map saved on the Account tab, drawn only with no signal: online, Apple Maps
  // is clearer and has names.
  // ponytail: only when fully offline. One bar of signal that can't load Apple's tiles
  // still shows a blank grid; a "Saved" map type beside satellite is the upgrade if
  // testers hit it.
  const offlineTilesDir = isOffline && offlineMapLevel ? offlineMapDir().uri : null;
  const { loc, err: locErr, status: locStatus } = hooksBag.useUserLocation({ autoRequest: true });
  // "You're not in New Zealand yet", for 3 s after the my-location button is tapped overseas.
  const [abroad, setAbroad] = useState(false);
  const abroadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showAbroad = () => {
    clearTimeout(abroadTimer.current);
    setAbroad(true);
    abroadTimer.current = setTimeout(() => setAbroad(false), 3000);
  };
  useEffect(() => () => clearTimeout(abroadTimer.current), []);
  const { selectedLocationId: selectedSiteId, setSelectedLocationId: setSelectedSiteId } = hooksBag.useMapStore();
  const { itineraries, addFlow } = useItineraries();

  const [searchQuery, setSearchQuery] = useState("");
  // Debounced: mapSites rebuilds every marker on the map, which is expensive
  // enough (combined with active pinch-zoom/region-change gestures on
  // react-native-maps) to crash the app if it reruns on every keystroke.
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  // A category, or "trip": only the places in the person's trip (tester, 2026-11-11).
  const [mapFilter, setMapFilter] = useState<SiteCategory | "trip" | null>(null);
  const tripSiteIds = useMemo(
    () => new Set(itineraries.flatMap((t) => t.days.flatMap((d) => d.items.map((i) => i.siteId)))),
    [itineraries],
  );
  const tripOn = mapFilter === "trip";
  // Off once the trip has no places (its last one removed, or signed out): the button goes,
  // and the map would otherwise stay empty with nothing to turn it off.
  useEffect(() => {
    if (tripOn && tripSiteIds.size === 0) setMapFilter(null);
  }, [tripOn, tripSiteIds]);
  // The chips and the filter button are for categories; My Trip has its own button.
  const categoryOn = !!mapFilter && !tripOn;
  const [showFilters, setShowFilters] = useState(false);
  const [mapType, setMapType] = useState<MapType>("standard");

  const mapViewRef = useRef<SitesMapViewHandle>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [isAddingToTrip, setIsAddingToTrip] = useState(false);
  const [isCreatingItinerary, setIsCreatingItinerary] = useState(false);
  const [showTripChoice, setShowTripChoice] = useState(false);
  const [pendingItineraryId, setPendingItineraryId] = useState<string | null>(null);
  const [showPremiumAdd, setShowPremiumAdd] = useState(false);

  // The paywall stays up through the purchase so it has somewhere to report progress and
  // failure. Nothing else dismisses this one, so retire it once the unlock lands.
  useEffect(() => {
    if (entitledProductIds.has(FULL_GUIDE_PRODUCT_ID)) setShowPremiumAdd(false);
  }, [entitledProductIds]);

  const visibleSites = useMemo(
    () => locations.filter((l) => l.active !== false && !isSiteLocked(l)),
    [locations, isSiteLocked],
  );

  const lockedSites = useMemo(
    () => locations.filter((l) => l.active !== false && isSiteLocked(l)),
    [locations, isSiteLocked],
  );

  const handleAddToItinerary = useCallback(() => {
    // A guest is asked to sign in, as on the place screen.
    if (session.status !== "authed") {
      Alert.alert("Sign In Required", "Sign in to plan your trip.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }
    if (!entitledProductIds.has(FULL_GUIDE_PRODUCT_ID)) {
      setShowPremiumAdd(true);
      return;
    }
    // Null until the trips are known (useItineraries): a tap before then does nothing.
    if (addFlow === "create") setIsCreatingItinerary(true);
    else if (addFlow === "choose") setShowTripChoice(true);
    else if (addFlow === "pick") setIsAddingToTrip(true);
  }, [addFlow, entitledProductIds, session.status]);

  const mapSites = useMemo(() => {
    // The same search as Explore's: name, description or category.
    return visibleSites
      .filter(
        (s) =>
          matchesSearch(s, debouncedSearchQuery) &&
          (!mapFilter || (mapFilter === "trip" ? tripSiteIds.has(s.id) : s.category.includes(mapFilter))),
      )
      .map((s) => ({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        category: s.category[0],
      }));
  }, [visibleSites, debouncedSearchQuery, mapFilter, tripSiteIds]);

  useEffect(() => {
    if (debouncedSearchQuery.trim() && mapSites.length === 1) {
      setSelectedSiteId(mapSites[0].id);
    }
  }, [debouncedSearchQuery, mapSites, setSelectedSiteId]);

  // The place nearest the user, when one is close enough for them to count as "here"
  // (somewhere the app has places). Decides both what opens selected and whether the
  // map opens on the user or on the places.
  const nearHere = useMemo(() => {
    if (!loc) return null;
    const nearest = nearestSite(loc.coords.latitude, loc.coords.longitude, visibleSites);
    return nearest && nearest.meters <= NEAR_PLACES_METERS ? nearest.site : null;
  }, [loc, visibleSites]);

  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (hasAutoSelected.current || loading || !visibleSites.length || selectedSiteId) return;
    if (!loc && locStatus !== "denied" && !locErr) return;
    hasAutoSelected.current = true;

    // Here: the nearest place. Between towns: the nearest town's favourite, not the
    // nearest place, which can be a camping area an hour up the road. Off the island or
    // with no position: the default town's favourite (the town Explore opens on for them
    // too), one fixed start for someone planning at home; the favourite of all if it has none.
    if (nearHere) {
      setSelectedSiteId(nearHere.id);
      return;
    }
    const town = nearestArea(loc?.coords.latitude, loc?.coords.longitude, visibleSites) ?? DEFAULT_AREA;
    const inTown = town ? visibleSites.filter((s) => s.area === town) : [];
    const featured = [...(inTown.length ? inTown : visibleSites)].sort((a, b) => (b.featured ?? 0) - (a.featured ?? 0))[0];
    if (featured) setSelectedSiteId(featured.id);
  }, [loading, visibleSites, selectedSiteId, loc, locStatus, locErr, nearHere, setSelectedSiteId]);

  const selectedSite = useMemo(
    () => visibleSites.find((s) => s.id === selectedSiteId) ?? null,
    [visibleSites, selectedSiteId],
  );

  const initialRegion = useMemo(() => {
    if (loading) return null;
    return initialRegionFrom(
      nearHere && loc ? loc.coords.latitude : null,
      nearHere && loc ? loc.coords.longitude : null,
      mapSites,
    );
  }, [loading, loc, nearHere, mapSites]);

  const todayItems = useMemo<ActiveItineraryItem[] | null>(() => {
    if (!itineraries.length) return null;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let todayDay = null;
    for (const itin of itineraries) {
      const day = itin.days?.find((day) => day.date === today);
      if (day?.items?.length) {
        todayDay = day;
        break;
      }
    }
    if (!todayDay?.items?.length) return null;
    const result = todayDay.items
      .filter((item) => !!item.siteId && visibleSites.some((s) => s.id === item.siteId))
      .map((item) => {
        const siteData = visibleSites.find((s) => s.id === item.siteId)!;
        return {
          id: item.id,
          siteId: item.siteId,
          siteName: item.siteName,
          timeLabel: item.timeLabel,
          category: siteData.category[0],
          // Thumb first, then the full image — a place with only an admin-uploaded
          // full photo used to show no image here at all.
          imageUrl: siteData.imageThumbnailUrl ?? siteData.imageUrl ?? null,
        };
      });
    return result.length > 0 ? result : null;
  }, [itineraries, visibleSites]);

  const hasSnappedForItinerary = useRef(false);
  useEffect(() => {
    if (hasSnappedForItinerary.current || !todayItems?.length) return;
    hasSnappedForItinerary.current = true;
    bottomSheetRef.current?.snapToIndex(2);
  }, [todayItems]);

  const nearbySites = useMemo<NearbySite[]>(() => {
    if (!selectedSite) return [];
    return [...visibleSites]
      .filter((s) => s.id !== selectedSite.id)
      .map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category[0],
        distanceMeters: distanceMeters({ lat: selectedSite.lat, lng: selectedSite.lng }, { lat: s.lat, lng: s.lng }),
      }))
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
      .slice(0, wide ? 10 : 3);
  }, [visibleSites, selectedSite, wide]);

  const overlayDistance = useMemo(() => {
    if (!selectedSite || !loc) return 0;
    return distanceMeters(
      { lat: loc.coords.latitude, lng: loc.coords.longitude },
      { lat: selectedSite.lat, lng: selectedSite.lng },
    );
  }, [selectedSite, loc]);

  const handleSitePress = useCallback(
    (id: string) => {
      Haptics.selectionAsync();
      setSelectedSiteId(id);
      setSearchQuery("");
      Keyboard.dismiss();
      bottomSheetRef.current?.snapToIndex(1);
    },
    [setSelectedSiteId],
  );

  if (loading || entitlementsLoading) {
    return (
      <View style={styles.container}>
        <LoadingState label="Loading map..." />
      </View>
    );
  }
  // Only block on err when there's no cached data to fall back to — a
  // background refetch failing offline shouldn't hide sites we already have.
  if (err && locations.length === 0) {
    return (
      <View style={styles.container}>
        <ErrorCard title="Map Error" message={err} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SitesMapView
        ref={mapViewRef}
        sites={mapSites}
        initialRegion={initialRegion!}
        selectedSiteId={selectedSiteId}
        mapType={mapType}
        onPressSite={handleSitePress}
        offlineTilesDir={offlineTilesDir}
        offlineLevel={offlineMapLevel}
      />

      {/* box-none: only the things in the stack take touches. The stack itself is
          full width, and without this the strip beside the map controls would
          swallow drags meant for the map. */}
      {/* The status bar's own end of the map, upright only: sideways the bar is in the rail. */}
      {wide && upright ? (
        <LinearGradient
          testID="map-top-fade"
          colors={[`${card}D9`, `${card}00`]}
          style={styles.topFade}
          pointerEvents="none"
        />
      ) : null}

      {/* Wide: measured from the window's top, so no status-bar inset on top of the 60 / 16. */}
      <SafeAreaView
        style={styles.safeArea}
        edges={wide ? [] : undefined}
        pointerEvents="box-none"
        testID="map-top-stack"
      >
        <View testID="map-search-row" style={[styles.searchContainer, wide && { paddingTop: searchAt }]}>
          <View testID="map-search-card" style={[styles.searchBox, wide && styles.searchBoxWide]}>
            <Search color={ON_MAP.icon} size={18} strokeWidth={1.75} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search places..."
              placeholderTextColor={ON_MAP.placeholder}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text) setMapFilter(null);
              }}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  Keyboard.dismiss();
                }}
                hitSlop={8}
              >
                <X color={ON_MAP.icon} size={18} strokeWidth={1.75} />
              </TouchableOpacity>
            )}
            <View style={styles.divider} />
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync();
                setShowFilters((p) => !p);
              }}
              accessibilityRole="button"
              accessibilityLabel="Filter by category"
              style={[styles.filterBtn, wide && styles.filterBtnWide, (categoryOn || showFilters) && styles.filterBtnActive]}
            >
              <SlidersHorizontal color={categoryOn || showFilters ? "#FFFFFF" : tokens.colors.text} size={18} strokeWidth={2.25} />
            </TouchableOpacity>
            <View pointerEvents="none" style={[darkEdge, styles.floatEdge, wide && styles.searchBoxWide]} />
          </View>
        </View>

        {lockedSites.length > 0 && (
          <View style={[styles.premiumBannerContainer, wide && styles.openMapLeft]}>
            <TouchableOpacity
              style={styles.premiumBanner}
              activeOpacity={0.88}
              onPress={() => router.push(`/(app)/(tabs)/sites/${lockedSites[0].id}`)}
            >
              <View style={styles.premiumBannerIconWrap}>
                <Lock size={18} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <View style={styles.premiumBannerTextWrap}>
                <Text style={styles.premiumBannerTitle}>
                  {lockedSites.length} Premium {lockedSites.length === 1 ? "Place" : "Places"} Nearby
                </Text>
                <Text style={styles.premiumBannerSubtitle}>Unlock the full guide to explore</Text>
              </View>
              <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}

        {/* Hidden until asked for, to leave the map clear. They stay up while a
            category is chosen even if the button is tapped shut: otherwise
            nothing would say which filter is on, or offer a way to change it. */}
        {(showFilters || categoryOn) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipRow, wide && styles.openMapLeft]}>
            {([{ label: "All", value: null }, ...SITE_CATEGORIES.map((c) => ({ label: SITE_CATEGORY_LABELS[c], value: c }))] as {
              label: string;
              value: SiteCategory | null;
            }[]).map((cat) => {
              const active = mapFilter === cat.value;
              return (
                <TouchableOpacity
                  key={String(cat.value)}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMapFilter(cat.value);
                  }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {(locErr || abroad) && (
          <View style={[styles.errorPill, wide && styles.errorPillWide]}>
            <AlertCircle size={12} color="rgba(255,200,200,1)" strokeWidth={2} />
            <Text style={styles.errorText}>{abroad ? "You're not in New Zealand yet" : "Location unavailable"}</Text>
          </View>
        )}

        {/* Last in the top stack, so they sit under the search bar (and under
            the filter chips when those are open). They used to be pinned 40%
            down the screen, where the bottom sheet grows up over them and they
            covered its distance and Directions button. */}
        <View testID="map-controls-row" style={[styles.controlsRow, wide && { position: "absolute", top: searchAt, left: 0, right: 0 }]} pointerEvents="box-none">
          <View style={[styles.leftStack, wide && styles.leftStackWide]} pointerEvents="box-none">
          {/* Out on the map, not behind the filter button (owner, 2026-11-11), once the
              trip has places. A tap shows only them; another shows everything again. */}
          {tripSiteIds.size > 0 && (
            <TouchableOpacity
              style={[styles.chip, styles.tripChip, tripOn && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: tripOn }}
              onPress={() => {
                Haptics.selectionAsync();
                setMapFilter(tripOn ? null : "trip");
              }}
            >
              <CalendarDays size={14} color={tripOn ? "#FFFFFF" : tokens.colors.text2} strokeWidth={2.25} />
              <Text style={[styles.chipText, tripOn && styles.chipTextActive]}>My Trip</Text>
            </TouchableOpacity>
          )}
          {/* CC BY 4.0 asks for credit wherever the LINZ map shows, and a link to the
              licence. Up here, not at the map's foot: the bottom sheet covered it there
              (owner, 2026-11-11). LINZ's own wording, "Sourced from the LINZ Data Service
              and licensed for reuse under the CC BY 4.0 licence", is on the Account row. */}
          {offlineTilesDir ? (
            <TouchableOpacity
              style={styles.credit}
              onPress={() => void Linking.openURL("https://creativecommons.org/licenses/by/4.0/")}
              accessibilityRole="link"
              hitSlop={8}
            >
              <Text style={styles.creditText}>Map: LINZ Data Service, CC BY 4.0</Text>
            </TouchableOpacity>
          ) : null}
          </View>
          <View style={[styles.mapControls, wide && styles.mapControlsWide]}>
          <TouchableOpacity
            style={[styles.controlBtn, wide && styles.controlBtnWide]}
            accessibilityRole="button"
            accessibilityLabel="Centre on my location"
            onPress={() => {
              Haptics.impactAsync();
              if (!loc) return;
              const { latitude, longitude } = loc.coords;
              // Overseas the map can't zoom out far enough to find the island from the phone
              // (tester, 2026-11-14, in the US), so it shows the island and says why.
              if (isInNZ(latitude, longitude)) return mapViewRef.current?.recenter(latitude, longitude);
              mapViewRef.current?.showIsland();
              showAbroad();
            }}
          >
            <Crosshair color={tokens.colors.text} size={20} strokeWidth={1.75} />
          </TouchableOpacity>
          <View style={styles.controlDivider} />
          <TouchableOpacity
            style={[styles.controlBtn, wide && styles.controlBtnWide]}
            accessibilityRole="button"
            accessibilityLabel="Switch map type"
            onPress={() => {
              Haptics.impactAsync();
              setMapType((t) => (t === "satellite" ? "standard" : "satellite"));
            }}
          >
            <Layers
              color={mapType === "satellite" ? tokens.colors.selected : tokens.colors.text}
              size={20}
              strokeWidth={1.75}
            />
          </TouchableOpacity>
          <View pointerEvents="none" style={[darkEdge, styles.floatEdge]} />
          </View>
        </View>
      </SafeAreaView>

      <MapOverlayCard
        site={selectedSite}
        distanceMeters={overlayDistance}
        onOpen={() => selectedSite && router.push(`/(app)/(tabs)/sites/${selectedSite.id}`)}
        onSelectSite={handleSitePress}
        onFocusSite={() => {
          if (!selectedSite) return;
          Haptics.impactAsync();
          mapViewRef.current?.focusOn(selectedSite.lat, selectedSite.lng);
        }}
        onAddToItinerary={
          selectedSite && canAddToItinerary(selectedSite)
            ? handleAddToItinerary
            : undefined
        }
        isOffline={isOffline}
        nearbySites={nearbySites}
        todayItems={todayItems}
        locStatus={locStatus}
        hasLoc={!!loc}
        locError={!!locErr}
        bottomSheetRef={bottomSheetRef}
      />

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
        onCreated={(id) => {
          setIsCreatingItinerary(false);
          setPendingItineraryId(id);
          setIsAddingToTrip(true);
        }}
      />

      <AddToTripModal
        site={
          isAddingToTrip && selectedSite
            ? {
                id: selectedSite.id,
                name: selectedSite.name,
                imageUrl: selectedSite.imageThumbnailUrl ?? selectedSite.imageUrl ?? undefined,
                category: selectedSite.category[0],
              }
            : null
        }
        initialItineraryId={pendingItineraryId}
        onClose={() => {
          setIsAddingToTrip(false);
          setPendingItineraryId(null);
        }}
      />

      <PremiumFeatureModal
        visible={showPremiumAdd}
        onClose={() => setShowPremiumAdd(false)}
        title="Planning trips is a Premium feature"
        message="Unlock the full guide to add places and plan your trip."
        unverified={entitlementsUnknown}
        onRetry={recheckEntitlements}
        onBuy={() => requestBuy(FULL_GUIDE_PRODUCT_ID)}
      />
    </View>
  );
}

// Over the map, which follows the phone into dark. The light sides are the colours these
// had before dark mode; the dark sides are the page's own: a dark card at the same
// see-through-ness, the line colour, and the muted text and placeholder greys.
const ON_MAP = {
  icon: pair("rgba(36,26,18,0.45)", "#9DB5AF"),
  placeholder: pair("rgba(36,26,18,0.38)", "#7F9690"),
  chip: pair("rgba(255,255,255,0.95)", "rgba(14,42,46,0.95)"),
  credit: pair("rgba(255,255,255,0.88)", "rgba(14,42,46,0.88)"),
  divider: pair("rgba(36,26,18,0.18)", "#2F5257"),
  chipEdge: pair("rgba(36,26,18,0.14)", "#2F5257"),
  controlDivider: pair("rgba(36,26,18,0.12)", "#2F5257"),
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.page },
  safeArea: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 },
  searchContainer: { paddingHorizontal: 16, paddingTop: 12 },
  searchBox: {
    // bgCard, white as the page is in light; in dark a step lighter than the page, with a
    // hairline (floatEdge), since the shadow shows nothing on a dark map.
    flexDirection: "row", alignItems: "center", backgroundColor: tokens.colors.bgCard,
    height: 48, borderRadius: 12, paddingLeft: 16, paddingRight: 6, gap: 10,
    shadowColor: "#241A12", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.13, shadowRadius: 20, elevation: 8,
  },
  // The Duo's card: 360 x 56, corner 16; its filter button 40 square, corner 10.
  searchBoxWide: { width: PANEL_WIDTH, height: SEARCH_HEIGHT, borderRadius: 16 },
  filterBtnWide: { width: 40, height: 40, borderRadius: 10 },
  searchInput: { flex: 1, fontSize: 16, color: tokens.colors.text },
  divider: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: ON_MAP.divider },
  // A pale box with a dark icon. With a filter on it is solid teal, as the chosen chip is:
  // that's a state ("selected"), and orange is kept for what to tap
  // (docs/plans/design-sweep.md). It's the only sign that some places are hidden.
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
  },
  filterBtnActive: { backgroundColor: tokens.colors.accent },
  // Past the panel, in the open part of the map.
  openMapLeft: { paddingLeft: PANEL_PAD },
  chipRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: "row" },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: ON_MAP.chip,
    borderWidth: 1, borderColor: ON_MAP.chipEdge,
    shadowColor: "#241A12", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  chipActive: { backgroundColor: tokens.colors.accent, borderColor: tokens.colors.accent },
  chipText: { fontSize: 13, fontWeight: "600", color: tokens.colors.text2 },
  chipTextActive: { color: "#FFFFFF" },
  // My Trip and the saved map's credit at the left, the map controls at the right.
  controlsRow: { flexDirection: "row", alignItems: "flex-start" },
  leftStack: { marginLeft: 16, marginTop: 10, gap: 8, alignItems: "flex-start" },
  tripChip: { flexDirection: "row", alignItems: "center", gap: 6 },
  credit: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: ON_MAP.credit,
  },
  creditText: { fontSize: 11, color: tokens.colors.text2 },
  mapControls: {
    // In the top stack's flow, at its right edge. No overflow: "hidden": on iOS
    // that clips the view's own shadow, and nothing here needs clipping.
    marginLeft: "auto", marginRight: 14, marginTop: 10, backgroundColor: tokens.colors.bgCard,
    borderRadius: 12, shadowColor: "#241A12", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1,
    shadowRadius: 16, elevation: 6,
  },
  controlBtn: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  controlBtnWide: { width: 52, height: 52 },
  leftStackWide: { marginLeft: PANEL_PAD, marginTop: 0, flexDirection: "row", alignItems: "center" },
  mapControlsWide: { width: 52, marginTop: 0, marginRight: 16 },
  errorPillWide: { alignSelf: "flex-start", marginLeft: PANEL_PAD },
  topFade: { position: "absolute", top: 0, left: 0, right: 0, height: 96, zIndex: 10 },
  floatEdge: { borderRadius: 12 },
  controlDivider: { height: StyleSheet.hairlineWidth, backgroundColor: ON_MAP.controlDivider },
  errorPill: {
    flexDirection: "row", alignItems: "center", alignSelf: "center", backgroundColor: "rgba(36,26,18,0.82)",
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginTop: 10, gap: 6,
  },
  errorText: { fontSize: 11, fontWeight: "600", color: "rgba(255,200,200,1)", letterSpacing: 0.3 },
  premiumBannerContainer: { paddingHorizontal: 16, paddingTop: 12 },
  premiumBanner: {
    flexDirection: "row", alignItems: "center", backgroundColor: tokens.colors.accent,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, gap: 12,
    shadowColor: tokens.colors.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  premiumBannerIconWrap: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  premiumBannerTextWrap: { flex: 1, gap: 2 },
  premiumBannerTitle: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.1 },
  premiumBannerSubtitle: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.82)" },
});
