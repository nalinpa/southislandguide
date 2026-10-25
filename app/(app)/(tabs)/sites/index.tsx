import { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, TextInput, Linking, Pressable, RefreshControl } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Bookmark, BookOpen, ChevronRight, Search, X } from "lucide-react-native";

import { Screen, LoadingState, ErrorCard, CardShell, Stack, AppText, AppIconButton } from "@/lib/uiKit";
import { TopBar } from "@/components/layout/TopBar";
import { TopBarTabs } from "@/components/layout/TopBarTabs";
import { tokens } from "@/lib/ui/tokens";
import { hooksBag, useRefreshLocations } from "@/lib/hooksBag";
import { useSession } from "@/lib/providers/SessionProvider";
import { ListView } from "@/components/sites/list/ListView";
import { AreaSheet, type AreaOption } from "@/components/sites/AreaSheet";
import { FeaturedCard } from "@/components/sites/FeaturedCard";
import { nearestArea } from "@/components/map/MapRegion";
import { AREAS, AREA_GUIDE_REGIONS, AREA_REGIONS, DEFAULT_AREA, areaName } from "@/lib/areas";
import { SITE_CATEGORIES, SITE_CATEGORY_LABELS, matchesSearch, type SiteCategory } from "@/lib/models";
import { useTourTarget } from "@/lib/tour/useTourTarget";
import { useTourStepRoute } from "@/lib/tour/useTourStepRoute";

// ponytail: the generator's GAP list, resolved for this app.
// - saved-places shortcut: DONE, routes to app/(app)/saved-sites.tsx
// - guide shortcut: DONE, routes to app/(app)/(tabs)/guide from the top bar, open on the
//   region of the town shown.
//   The guide was otherwise only reachable from the Profile tab.
// - category-filter tabs: DONE. Only categories with places get a tab, and
//   the row hides entirely when there's just one.
// - one town at a time: DONE. The bar's title names the town and is the
//   dropdown that changes it.
// - "Featured" hero card: DONE, for the town's highest-ranked place.

export default function SiteListPage() {
  const { session } = useSession();
  const isGuest = session.status === "guest";

  const { locations, loading: entitiesLoading, err: entitiesErr } = hooksBag.useLocations();

  const { loc: liveLoc, status: locStatus } = hooksBag.useUserLocation({ autoRequest: true });
  const [lockedLoc, setLockedLoc] = useState(() => hooksBag.useLocationStore.getState().location);
  useEffect(() => {
    if (!lockedLoc && liveLoc) setLockedLoc(liveLoc);
  }, [liveLoc, lockedLoc]);

  const handleRefreshGPS = () => Linking.openSettings();

  // Pull to refresh. The spinner is ours to hold: the shared hook's `loading`
  // is only true on the first load, not on a refetch.
  const refreshLocations = useRefreshLocations();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshLocations();
    } finally {
      setRefreshing(false);
    }
  };

  const [category, setCategory] = useState<SiteCategory | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeLocations = useMemo(() => locations.filter((l) => l.active !== false), [locations]);

  // The towns the list can show: each area with at least one place, in the app's order,
  // then any the app has no label for yet (added in the admin panel since), then "Other"
  // for places with no area at all, so that none can drop out of sight. "" is its id.
  // A town's region, for the sheet's headings, is its own (AREA_REGIONS), or for a town
  // the app doesn't know yet, the one most of its places are in.
  const areaOptions = useMemo<AreaOption[]>(() => {
    const counts = new Map<string, number>();
    const regions = new Map<string, Map<string, number>>();
    for (const l of activeLocations) {
      const id = l.area ?? "";
      counts.set(id, (counts.get(id) ?? 0) + 1);
      if (id && l.region) {
        const r = regions.get(id) ?? new Map<string, number>();
        r.set(l.region, (r.get(l.region) ?? 0) + 1);
        regions.set(id, r);
      }
    }
    const regionOf = (id: string) =>
      AREA_REGIONS[id] ?? [...(regions.get(id) ?? new Map()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const known: string[] = AREAS.map((a) => a.id).filter((id) => counts.has(id));
    const unlabelled = [...counts.keys()].filter((id) => id && !known.includes(id)).sort();
    return [...known, ...unlabelled, ...(counts.has("") ? [""] : [])].map((id) => ({
      id,
      label: id ? areaName(id) : "Other",
      count: counts.get(id) ?? 0,
      region: regionOf(id),
    }));
  }, [activeLocations]);

  // The town being shown: the one the user chose; until they choose, the town nearest
  // them (the same one the map opens on); off the island or with no position, the
  // default. Worked out here, not copied into state when a position arrives, so a choice
  // always wins and nothing has to be kept in step. lockedLoc is the first position of
  // the session: driving on to the next town doesn't change the list under the user.
  const [chosenArea, setChosenArea] = useState<string | null>(null);
  const [areaMenuOpen, setAreaMenuOpen] = useState(false);
  const hereArea = useMemo(
    () => nearestArea(lockedLoc?.coords.latitude, lockedLoc?.coords.longitude, activeLocations),
    [lockedLoc, activeLocations],
  );
  const area =
    [chosenArea, hereArea, DEFAULT_AREA].find((id) => id != null && areaOptions.some((o) => o.id === id)) ??
    areaOptions[0]?.id ??
    "";
  const areaLabel = areaOptions.find((o) => o.id === area)?.label;
  // The guide opens on the town's region (owner, 2026-10-25); with no town, island-wide.
  const guideRegion = AREA_GUIDE_REGIONS[area] ?? areaOptions.find((o) => o.id === area)?.region;

  const areaLocations = useMemo(() => activeLocations.filter((l) => (l.area ?? "") === area), [activeLocations, area]);

  // A place is listed under its main (first) category only, the one its marker and
  // default photo use, so it doesn't turn up under several tabs. Only categories that are
  // some place's main one in this town get a tab — rotorua-guide shows every category
  // unconditionally, which would leave empty tabs for a town with a different mix.
  const categoriesWithPlaces = useMemo(
    () => SITE_CATEGORIES.filter((c) => areaLocations.some((l) => l.category[0] === c)),
    [areaLocations],
  );
  // A category chosen in one town that the town now shown has nothing in: back to All.
  const activeCategory = category && categoriesWithPlaces.includes(category) ? category : null;

  const filteredLocations = useMemo(() => {
    let list = areaLocations;
    if (activeCategory) list = list.filter((l) => l.category[0] === activeCategory);
    // Someone typing "beach" or "food" should find places whose names don't say so.
    list = list.filter((l) => matchesSearch(l, searchQuery));
    return list;
  }, [areaLocations, activeCategory, searchQuery]);

  // radiusMeters is optional on Site (no admin field sets it) but required by
  // @blacksands/hooks' CheckpointEntity. Default it here rather than lying in
  // the type — check-in is off, so the value is never read.
  const sortableLocations = useMemo(
    () => filteredLocations.map((l) => ({ ...l, radiusMeters: l.radiusMeters ?? 0 })),
    [filteredLocations],
  );

  const rows = hooksBag.useSortedRows(sortableLocations, lockedLoc);

  // The card at the top, as in rotorua-guide and aklguide: the place with the highest
  // `featured` value (higher is more featured; none set counts as 0) among those shown, so
  // the chosen category's own when a tab is picked, and not again in the rows under it. A
  // tie goes to the place listed first (owner, 2026-10-25). Off while searching, when the
  // matches are all that's wanted.
  const featured = useMemo(() => {
    if (searchQuery.trim() || !rows.length) return null;
    return rows.reduce((best, r) => ((r.location.featured ?? 0) > (best.location.featured ?? 0) ? r : best));
  }, [rows, searchQuery]);
  const listRows = useMemo(
    () => (featured ? rows.filter((r) => r.location.id !== featured.location.id) : rows),
    [rows, featured],
  );

  // The opening tour's steps on this screen (lib/tour/tourSteps.ts), and the place its
  // next steps open: the featured one, or else the first one listed.
  const townTarget = useTourTarget("town");
  const guideTarget = useTourTarget("guide");
  const browseTarget = useTourTarget("browse");
  const placeTarget = useTourTarget("place");
  const firstId = (featured ?? rows[0])?.location.id;
  useTourStepRoute("place", firstId ? `/(app)/(tabs)/sites/${firstId}` : undefined);

  // A town chosen in the sheet, or handed over by a trip's "Find more things to do". A
  // category chosen in one town isn't carried to a town that has nothing in it, to come
  // back unasked when the user returns.
  const chooseArea = (id: string) => {
    setChosenArea(id);
    if (!activeLocations.some((l) => (l.area ?? "") === id && category && l.category[0] === category)) {
      setCategory(null);
    }
  };

  // Handed over by another screen: taken once, then cleared. This tab screen keeps its
  // params, and the same town sent again later must still count as new. It opens on the
  // town's whole list: a category or search left on from before is cleared.
  const { area: areaParam } = useLocalSearchParams<{ area?: string }>();
  useEffect(() => {
    if (!areaParam) return;
    setChosenArea(areaParam);
    setCategory(null);
    setSearchQuery("");
    setSearchOpen(false);
    router.setParams({ area: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaParam]);

  if (entitiesLoading || session.status === "loading") {
    return (
      <Screen>
        <LoadingState label="Finding places..." />
      </Screen>
    );
  }

  // Only when there's nothing to show: a refresh that fails keeps the places already here,
  // as the map and Saved Places do.
  if (entitiesErr && locations.length === 0) {
    return (
      <Screen>
        <ErrorCard
          title="Connection Issue"
          message={entitiesErr}
          action={{ label: "Try Again", onPress: handleRefresh }}
        />
      </Screen>
    );
  }

  // Fixed above the list: the list scrolls under it, and the category tabs stay
  // in reach however far down someone is. The tab strip, when there is one,
  // forms the bar's bottom edge.
  const topBar = (
    <TopBar
      // The town being shown, and the way to change it when there is another to change to.
      title={areaLabel ?? "Places"}
      onTitlePress={areaOptions.length > 1 ? () => setAreaMenuOpen(true) : undefined}
      titleLabel={`${areaLabel}, choose a town`}
      titleTarget={townTarget}
      // The smaller title size, on the buttons' row, so the bar stays short. Beside the
      // three buttons an iPhone SE leaves it about 150pt: "Christchurch" shrinks a little.
      compactTitle
      flushBottom={categoriesWithPlaces.length > 1}
      actions={
        <>
          {/* The kit's button takes no ref, so the tour measures this instead. */}
          <View {...guideTarget}>
            <AppIconButton
              icon={BookOpen}
              variant="control"
              onPress={() =>
                router.push(
                  guideRegion ? { pathname: "/(app)/(tabs)/guide", params: { region: guideRegion } } : "/(app)/(tabs)/guide",
                )
              }
              accessibilityLabel="Travel guide"
            />
          </View>
          <AppIconButton
            icon={searchOpen ? X : Search}
            variant="control"
            onPress={() => {
              setSearchOpen((open) => !open);
              if (searchOpen) setSearchQuery("");
            }}
            accessibilityLabel={searchOpen ? "Close search" : "Search places"}
          />
          <AppIconButton
            icon={Bookmark}
            variant="control"
            onPress={() => router.push("/(app)/saved-sites")}
            accessibilityLabel="Saved places"
          />
        </>
      }
    >
      {searchOpen && (
        <View style={styles.paddedSection}>
          <View style={styles.searchInputWrap}>
            <Search size={16} color={tokens.colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search places"
              placeholderTextColor={tokens.colors.textMuted}
              style={styles.searchInput}
              autoFocus
            />
          </View>
        </View>
      )}

      {categoriesWithPlaces.length > 1 && (
        <View {...browseTarget}>
          <TopBarTabs<SiteCategory | null>
            tabs={[
              { key: null, label: "All" },
              ...categoriesWithPlaces.map((c) => ({ key: c, label: SITE_CATEGORY_LABELS[c] })),
            ]}
            selected={activeCategory}
            onSelect={setCategory}
          />
        </View>
      )}
    </TopBar>
  );

  // Scrolls away with the rows. No side padding of its own: the list already
  // pads its content, so these line up with the cards' edges.
  // The featured card first, its top edge against the bottom of the teal bar (owner,
  // 2026-10-25); the notices go under it.
  const header = (
    <View testID="explore-header">
      {featured && (
        <View {...placeTarget}>
          <FeaturedCard site={featured.location} onPress={(id) => router.push(`/(app)/(tabs)/sites/${id}`)} />
        </View>
      )}
      <Stack gap="md" style={styles.headerStack}>
        {locStatus === "denied" && (
          <ErrorCard
            status="warning"
            title="Location Disabled"
            message="Enable location to see distances to nearby places."
            action={{ label: "Open Settings", onPress: handleRefreshGPS }}
          />
        )}
  
        {isGuest ? (
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            accessibilityRole="button"
            style={styles.signInBanner}
          >
            <View style={styles.signInText}>
              <AppText variant="sectionTitle">Sign In for More</AppText>
              <AppText variant="body" style={styles.signInHint}>
                Sign in to save places and leave reviews.
              </AppText>
            </View>
            <ChevronRight size={22} color={tokens.colors.highlight} strokeWidth={2.5} />
          </Pressable>
        ) : null}
  
        {activeLocations.length > 0 && rows.length === 0 && (
          <AppText variant="body" status="hint" style={styles.centerText}>
            {searchQuery.trim()
              ? `No places${areaLabel ? ` in ${areaLabel}` : ""} match your search.`
              : `No ${activeCategory ? SITE_CATEGORY_LABELS[activeCategory] : "places"} to show.`}
          </AppText>
        )}
      </Stack>
    </View>
  );

  return (
    // paddingTop 0 hands the status-bar inset to the top bar, so the teal runs
    // up under the clock (same as the login screen).
    <Screen padded={false} style={styles.screen}>
      {topBar}
      <ListView
        rows={listRows}
        header={header}
        onPressItem={(id) => router.push(`/(app)/(tabs)/sites/${id}`)}
        firstRowTarget={featured ? undefined : placeTarget}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={tokens.colors.accent}
            colors={[tokens.colors.accent]}
          />
        }
        ListEmptyComponent={
          activeLocations.length === 0 ? (
            <CardShell style={styles.emptyCard}>
              <Stack gap="sm" align="center">
                <AppText variant="h3">No Places Found</AppText>
                <AppText variant="body" status="hint" style={styles.centerText}>
                  Check back soon.
                </AppText>
              </Stack>
            </CardShell>
          ) : null
        }
      />
      <AreaSheet
        visible={areaMenuOpen}
        options={areaOptions}
        selected={area}
        onSelect={(id) => {
          chooseArea(id);
          setAreaMenuOpen(false);
        }}
        onClose={() => setAreaMenuOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  // A tinted panel rather than a bordered card: the old dark-outlined box was
  // the heaviest thing on the screen for what is an optional prompt.
  signInBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    backgroundColor: tokens.colors.highlightDim,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
  },
  signInText: { flex: 1, gap: 2 },
  signInHint: { color: tokens.colors.text2 },
  headerStack: { paddingTop: tokens.space.md, paddingBottom: 8, width: "100%" },
  paddedSection: { paddingHorizontal: 16 },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.sm,
    height: 44,
  },
  searchInput: { flex: 1, color: tokens.colors.text, fontSize: 15 },
  emptyCard: { marginTop: 20, paddingVertical: 40 },
  centerText: { textAlign: "center" },
});
