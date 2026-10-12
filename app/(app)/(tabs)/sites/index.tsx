import { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, TextInput, Linking, Pressable, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Bookmark, BookOpen, ChevronRight, Search, X } from "lucide-react-native";

import { Screen, LoadingState, ErrorCard, CardShell, Stack, AppText, AppIconButton } from "@/lib/uiKit";
import { TopBar } from "@/components/layout/TopBar";
import { TopBarTabs } from "@/components/layout/TopBarTabs";
import { tokens } from "@/lib/ui/tokens";
import { hooksBag, useRefreshLocations } from "@/lib/hooksBag";
import { useSession } from "@/lib/providers/SessionProvider";
import { ListView } from "@/components/sites/list/ListView";
import { SITE_CATEGORIES, SITE_CATEGORY_LABELS, type SiteCategory } from "@/lib/models";

// ponytail: the generator's GAP list, resolved for this app.
// - saved-places shortcut: DONE, routes to app/(app)/saved-sites.tsx
// - guide shortcut: DONE, routes to app/(app)/(tabs)/guide from the top bar.
//   The guide was otherwise only reachable from the Profile tab.
// - category-filter tabs: DONE. Only categories with places get a tab, and
//   the row hides entirely when there's just one.
// - "Featured" hero card: deferred until any doc sets `featured`.

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

  // Only categories that actually have places get a tab — rotorua-guide shows
  // every category unconditionally, which would leave empty tabs once regions
  // with a different mix of categories are added.
  const categoriesWithPlaces = useMemo(
    () => SITE_CATEGORIES.filter((c) => activeLocations.some((l) => l.category.includes(c))),
    [activeLocations],
  );

  const filteredLocations = useMemo(() => {
    let list = activeLocations;
    if (category) list = list.filter((l) => l.category.includes(category));
    // Name, description, or a category's label as shown on the tabs: someone
    // typing "beach" or "food" should find places whose names don't say so.
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          !!l.description?.toLowerCase().includes(q) ||
          l.category.some((cat) => SITE_CATEGORY_LABELS[cat]?.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [activeLocations, category, searchQuery]);

  // radiusMeters is optional on Site (no admin field sets it) but required by
  // @blacksands/hooks' CheckpointEntity. Default it here rather than lying in
  // the type — check-in is off, so the value is never read.
  const sortableLocations = useMemo(
    () => filteredLocations.map((l) => ({ ...l, radiusMeters: l.radiusMeters ?? 0 })),
    [filteredLocations],
  );

  const rows = hooksBag.useSortedRows(sortableLocations, lockedLoc);

  if (entitiesLoading || session.status === "loading") {
    return (
      <Screen>
        <LoadingState label="Finding Locations..." />
      </Screen>
    );
  }

  if (entitiesErr) {
    return (
      <Screen>
        <ErrorCard title="Connection Issue" message={entitiesErr} />
      </Screen>
    );
  }

  // Fixed above the list: the list scrolls under it, and the category tabs stay
  // in reach however far down someone is. The tab strip, when there is one,
  // forms the bar's bottom edge.
  const topBar = (
    <TopBar
      title="Locations"
      flushBottom={categoriesWithPlaces.length > 1}
      actions={
        <>
          <AppIconButton
            icon={BookOpen}
            variant="control"
            onPress={() => router.push("/(app)/(tabs)/guide")}
            accessibilityLabel="Travel guide"
          />
          <AppIconButton
            icon={searchOpen ? X : Search}
            variant="control"
            onPress={() => {
              setSearchOpen((open) => !open);
              if (searchOpen) setSearchQuery("");
            }}
            accessibilityLabel="Search Locations"
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
              placeholder="Search Locations"
              placeholderTextColor={tokens.colors.textMuted}
              style={styles.searchInput}
              autoFocus
            />
          </View>
        </View>
      )}

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

  // Scrolls away with the rows. No side padding of its own: the list already
  // pads its content, so these line up with the cards' edges.
  const header = (
    <Stack gap="md" style={styles.headerStack}>
      {locStatus === "denied" && (
        <ErrorCard
          status="warning"
          title="Location Disabled"
          message="Enable location to see distances to nearby Locations."
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
              Sign in to save Locations and leave reviews.
            </AppText>
          </View>
          <ChevronRight size={22} color={tokens.colors.highlight} strokeWidth={2.5} />
        </Pressable>
      ) : null}

      {activeLocations.length > 0 && rows.length === 0 && (
        <AppText variant="body" status="hint" style={styles.centerText}>
          {searchQuery.trim()
            ? "No Locations match your search."
            : `No ${category ? SITE_CATEGORY_LABELS[category] : "Locations"} to show.`}
        </AppText>
      )}
    </Stack>
  );

  return (
    // paddingTop 0 hands the status-bar inset to the top bar, so the teal runs
    // up under the clock (same as the login screen).
    <Screen padded={false} style={styles.screen}>
      {topBar}
      <ListView
        rows={rows}
        header={header}
        onPressItem={(id) => router.push(`/(app)/(tabs)/sites/${id}`)}
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
                <AppText variant="h3">No Locations Found</AppText>
                <AppText variant="body" status="hint" style={styles.centerText}>
                  Check back soon.
                </AppText>
              </Stack>
            </CardShell>
          ) : null
        }
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
