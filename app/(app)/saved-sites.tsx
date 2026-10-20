import { useMemo, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Swipeable } from "react-native-gesture-handler";
import { router } from "expo-router";
import { Heart, Trash2 } from "lucide-react-native";

import { AppText, LoadingState, ErrorCard, Screen } from "@/lib/uiKit";
import { TopBar, TopBarBack } from "@/components/layout/TopBar";
import { TopBarTabs } from "@/components/layout/TopBarTabs";
import { tokens } from "@/lib/ui/tokens";
import { areaName } from "@/lib/areas";
import { hooksBag, useAllLocations } from "@/lib/hooksBag";
import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { SITE_CATEGORIES, SITE_CATEGORY_LABELS, type SiteCategory } from "@/lib/models";
import { ListItem } from "@/components/sites/list/ListItem";
import type { SortedRow } from "@blacksands/hooks";
import type { Site } from "@/lib/models";

type SiteRow = SortedRow<Site>;

function SwipeableRow({
  item,
  index,
  showArea,
  onUnsave,
}: {
  item: SiteRow;
  index: number;
  showArea: boolean;
  onUnsave: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);

  return (
    <Swipeable
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
        imageUrl={item.location.imageThumbnailUrl ?? item.location.imageUrl}
        category={item.location.category[0]}
        area={showArea && item.location.area ? areaName(item.location.area) : null}
        onPress={(id) => router.push(`/(app)/(tabs)/sites/${id}`)}
        index={index}
      />
    </Swipeable>
  );
}

export default function SavedSitesPage() {
  const { savedSiteIds, toggleSavedSite } = useSavedSites();
  const { locations, loading, err } = useAllLocations();
  const { loc } = hooksBag.useUserLocation();

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

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Loading saved places..." />
      </Screen>
    );
  }

  // Only block on err when there's no cached data — a background refetch
  // failing offline shouldn't hide locations we already have.
  if (err && locations.length === 0) {
    return (
      <Screen>
        <ErrorCard title="Connection Issue" message={err} />
      </Screen>
    );
  }

  // Fixed above the list: the list scrolls under it, and the category tabs stay
  // in reach however far down someone is. The tab strip, when there is one,
  // forms the bar's bottom edge.
  const topBar = (
    <TopBar
      title="Saved Places"
      leading={<TopBarBack onPress={() => router.back()} label="Back" />}
      flushBottom={categoriesWithPlaces.length > 1}
      actions={
        rows.length > 0 ? (
          <View style={styles.countBadge}>
            <AppText style={styles.countText}>{rows.length}</AppText>
          </View>
        ) : undefined
      }
    >
      {categoriesWithPlaces.length > 1 && (
        <TopBarTabs<SiteCategory | null>
          tabs={[
            { key: null, label: "All" },
            ...categoriesWithPlaces.map((c) => ({ key: c, label: SITE_CATEGORY_LABELS[c] })),
          ]}
          selected={category}
          onSelect={setCategory}
        />
      )}
    </TopBar>
  );

  return (
    // paddingTop 0 hands the status-bar inset to the top bar, same as the
    // main sites list.
    <Screen padded={false} style={styles.screen}>
      {topBar}
      <FlashList
        data={rows}
        keyExtractor={(item) => item.location.id}
        renderItem={({ item, index }: { item: SiteRow; index: number }) => (
          <View style={styles.itemWrap}>
            <SwipeableRow
              item={item}
              index={index}
              showArea={showArea}
              onUnsave={() => toggleSavedSite({ siteId: item.location.id, isSaving: false })}
            />
          </View>
        )}
        contentContainerStyle={styles.listContent}
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
                : "Tap the heart on any place to save it here."}
            </AppText>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  countText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  listContent: { paddingHorizontal: tokens.space.md, paddingBottom: 32 },
  itemWrap: { marginBottom: tokens.space.md },
  deleteAction: {
    backgroundColor: tokens.colors.danger,
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