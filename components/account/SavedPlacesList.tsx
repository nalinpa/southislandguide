import { useMemo, useRef, useState, type ReactNode } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useHalves, useWide } from "@blacksands/ui";
import { FlashList } from "@shopify/flash-list";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { router } from "expo-router";
import { Heart, Trash2 } from "lucide-react-native";

import { AppButton, AppText, LoadingState, ErrorCard, Screen } from "@/lib/uiKit";
import { TopBarTabs } from "@/components/layout/TopBarTabs";
import { tokens } from "@/lib/ui/tokens";
import { areaName } from "@/lib/areas";
import { hooksBag, useAllLocations } from "@/lib/hooksBag";
import { useTripPlaces } from "@/lib/hooks/useTripPlaces";
import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { useSession } from "@/lib/providers/SessionProvider";
import { SITE_CATEGORIES, SITE_CATEGORY_LABELS, type SiteCategory } from "@/lib/models";
import { ListItem } from "@/components/sites/list/ListItem";
import type { SortedRow } from "@blacksands/hooks";
import type { Site } from "@/lib/models";

type SiteRow = SortedRow<Site>;

function SwipeableRow({
  item,
  index,
  showArea,
  pane,
  inTrip,
  onUnsave,
}: {
  item: SiteRow;
  index: number;
  showArea: boolean;
  pane?: boolean;
  inTrip: boolean;
  onUnsave: () => void;
}) {
  const swipeRef = useRef<SwipeableMethods>(null);

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      renderRightActions={() => (
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => {
            swipeRef.current?.close();
            onUnsave();
          }}
          activeOpacity={0.85}
        >
          <Trash2 color="#FFFFFF" size={22} />
          <AppText style={styles.deleteActionText}>Remove</AppText>
        </TouchableOpacity>
      )}
      rightThreshold={60}
      overshootRight={false}
    >
      <ListItem
        id={item.location.id}
        name={item.location.name}
        description={item.location.description}
        distanceMeters={item.distanceMeters}
        imageUrl={item.location.imageUrl ?? item.location.imageThumbnailUrl}
        category={item.location.category[0]}
        area={showArea && item.location.area ? areaName(item.location.area) : null}
        onPress={(id) => router.push(`/(app)/(tabs)/sites/${id}`)}
        index={index}
        wide={pane}
        inTrip={inTrip}
      />
    </ReanimatedSwipeable>
  );
}

export function SavedPlacesList({
  pane,
  top,
}: {
  /** In the Profile's right pane: no top bar, its columns from the pane's width. */
  pane?: boolean;
  /** The route's top bar, given how many places are listed; it sits above the category strip. */
  top?: (count: number) => ReactNode;
}) {
  const { savedSiteIds, toggleSavedSite } = useSavedSites();
  const { ids: tripIds } = useTripPlaces();
  // A guest's heart asks them to sign in, so telling them to tap it sends them in a circle.
  const isGuest = useSession().session.status === "guest";
  const { locations, loading, err } = useAllLocations();
  const { loc } = hooksBag.useUserLocation();
  // The open Duo: a grid of two columns, upright and sideways. The same list on every width;
  // only numColumns and the margins change.
  const wide = useWide();
  // In the pane the columns come from the pane's width, not the window's: 400 upright is one
  // column, 519 sideways two.
  const { upright, width } = useHalves();
  // Wide: as many 320 columns as fit, two to four. The Duo (669, 951) is two.
  const columns = pane ? (upright ? 1 : 2) : wide ? Math.min(4, Math.max(2, Math.floor((width - 32) / 320))) : 1;
  const grid = pane || wide;

  const [category, setCategory] = useState<SiteCategory | null>(null);

  const savedLocations = useMemo(
    () => locations.filter((l) => savedSiteIds.has(l.id)),
    [locations, savedSiteIds],
  );

  // Saved places come from every town, so a row names its town, but only when there is
  // more than one town to tell apart.
  const showArea = useMemo(() => new Set(savedLocations.map((l) => l.area ?? "")).size > 1, [savedLocations]);

  // Only categories that actually have saved places get a tab, same rule as
  // the main list — empty tabs would be confusing here too.
  const categoriesWithPlaces = useMemo(
    () => SITE_CATEGORIES.filter((c) => savedLocations.some((l) => l.category.includes(c))),
    [savedLocations],
  );

  const filteredLocations = useMemo(
    () => (category ? savedLocations.filter((l) => l.category.includes(category)) : savedLocations),
    [savedLocations, category],
  );

  // radiusMeters is optional on Site (no admin field sets it) but required by
  // @blacksands/hooks' CheckpointEntity — same coercion as the sites list.
  const sortableLocations = useMemo(
    () => filteredLocations.map((l) => ({ ...l, radiusMeters: l.radiusMeters ?? 0 })),
    [filteredLocations],
  );
  const rows = hooksBag.useSortedRows(sortableLocations, loc);

  // On the route a state fills the screen as it always has, with no top bar.
  const alone = (node: ReactNode) => (pane ? node : <Screen>{node}</Screen>);

  if (loading) return alone(<LoadingState label="Loading saved places..." />);

  // Only block on err when there's no cached data — a background refetch
  // failing offline shouldn't hide locations we already have.
  if (err && locations.length === 0) {
    return alone(<ErrorCard title="Connection Issue" message={err} />);
  }

  // Fixed above the list: the list scrolls under it, and the category tabs stay
  // in reach however far down someone is. The tab strip, when there is one, is on the
  // white page under the bar, as on Explore (docs/plans/design-sweep.md).
  const categoryTabs = categoriesWithPlaces.length > 1 && (
    <TopBarTabs<SiteCategory | null>
      tone="page"
      tabs={[
        { key: null, label: "All" },
        ...categoriesWithPlaces.map((c) => ({ key: c, label: SITE_CATEGORY_LABELS[c] })),
      ]}
      selected={category}
      onSelect={setCategory}
    />
  );

  const content = (
    <>
      {top?.(rows.length)}
      {categoryTabs}
      <FlashList
        // Off, as on every list in the app (owner, 2026-11-18): rows are never added live.
        maintainVisibleContentPosition={{ disabled: true }}
        data={rows}
        keyExtractor={(item) => item.location.id}
        renderItem={({ item, index }: { item: SiteRow; index: number }) => (
          <View testID="saved-cell" style={[styles.itemWrap, grid && styles.itemWrapWide]}>
            <SwipeableRow
              item={item}
              index={index}
              showArea={showArea}
              pane={pane}
              inTrip={tripIds.has(item.location.id)}
              onUnsave={() => toggleSavedSite({ siteId: item.location.id, isSaving: false })}
            />
          </View>
        )}
        // A new count remounts the list. 1 and 2 share a key, so the Duo folding doesn't.
        key={Math.max(columns, 2)}
        numColumns={columns}
        contentContainerStyle={pane ? styles.listContentPane : wide ? styles.listContentWide : styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Heart color={tokens.colors.borderStrong} size={48} />
            <AppText variant="h3" style={styles.centerText}>
              {savedLocations.length > 0 && category
                ? `No saved ${SITE_CATEGORY_LABELS[category]} places`
                : "No saved places yet"}
            </AppText>
            <AppText variant="body" status="hint" style={styles.centerText}>
              {savedLocations.length > 0 && category
                ? "Try a different category."
                : isGuest
                  ? "Sign in to save places."
                  : "Tap the heart on any place to save it here."}
            </AppText>
            {isGuest && (
              <AppButton variant="hero" size="lg" onPress={() => router.push("/(auth)/login")}>
                Sign In
              </AppButton>
            )}
          </View>
        }
      />
    </>
  );

  // paddingTop 0 hands the status-bar inset to the top bar, same as the main sites list.
  return pane ? content : (
    <Screen padded={false} style={styles.screen}>
      {content}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The white page of the design sweep's look, as on Explore.
  screen: { paddingTop: 0, backgroundColor: tokens.colors.page },
  listContent: { paddingHorizontal: tokens.space.md, paddingTop: tokens.space.md, paddingBottom: 32 },
  // Wide: 24 at the sides (16 here and 8 in each cell), 16 between the columns and the rows.
  listContentWide: { paddingHorizontal: 16, paddingTop: tokens.space.md, paddingBottom: 32 },
  // The pane: 20 at the sides (12 here and 8 in each cell).
  listContentPane: { paddingHorizontal: 12, paddingTop: tokens.space.md, paddingBottom: 32 },
  itemWrap: { marginBottom: 24 },
  itemWrapWide: { marginBottom: 16, paddingHorizontal: 8 },
  deleteAction: {
    backgroundColor: tokens.colors.dangerFill,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: tokens.radius.lg,
    marginLeft: 8,
    gap: 4,
  },
  deleteActionText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: tokens.space.md,
    gap: 12,
  },
  centerText: { textAlign: "center" },
});