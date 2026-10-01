import { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, TextInput, Linking, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Bookmark, Search, X } from "lucide-react-native";

import { Screen, LoadingState, ErrorCard, CardShell, Stack, Row, AppText, AppIconButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { hooksBag } from "@/lib/hooksBag";
import { useSession } from "@/lib/providers/SessionProvider";
import { ListView } from "@/components/sites/list/ListView";
import { SITE_CATEGORIES, SITE_CATEGORY_LABELS, type SiteCategory } from "@/lib/models";

// ponytail: the generator's GAP list, resolved for this app.
// - saved-places shortcut: DONE, routes to app/(app)/saved-sites.tsx
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
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((l) => l.name.toLowerCase().includes(q));
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

  const header = (
    <Stack gap="md" style={styles.headerStack}>
      <View style={styles.paddedSection}>
        <Row justify="space-between" align="flex-end">
          <View>
            <AppText variant="label" status="hint" style={styles.eyebrow}>
              Explore
            </AppText>
            <AppText variant="h1">Locations</AppText>
          </View>
          <Row gap="xs">
            <AppIconButton
              icon={searchOpen ? X : Search}
              onPress={() => {
                setSearchOpen((open) => !open);
                if (searchOpen) setSearchQuery("");
              }}
              accessibilityLabel="Search Locations"
            />
            <AppIconButton
              icon={Bookmark}
              onPress={() => router.push("/(app)/saved-sites")}
              accessibilityLabel="Saved places"
            />
          </Row>
        </Row>
      </View>

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabContent}
        >
          {[null, ...categoriesWithPlaces].map((cat) => {
            const active = category === cat;
            return (
              <TouchableOpacity
                key={cat ?? "all"}
                style={styles.categoryTab}
                onPress={() => setCategory(cat)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <AppText style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>
                  {cat ? SITE_CATEGORY_LABELS[cat] : "All"}
                </AppText>
                {active && <View style={styles.categoryTabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {locStatus === "denied" && (
        <View style={styles.paddedSection}>
          <ErrorCard
            status="warning"
            title="Location Disabled"
            message="Enable location to see distances to nearby Locations."
            action={{ label: "Open Settings", onPress: handleRefreshGPS }}
          />
        </View>
      )}

      {isGuest ? (
        <View style={styles.paddedSection}>
          <CardShell status="surf" onPress={() => router.push("/(auth)/login")}>
            <Stack gap="xs">
              <AppText variant="sectionTitle">Sign In for More</AppText>
              <AppText variant="label" status="hint">
                Sign in to save Locations and leave reviews.
              </AppText>
            </Stack>
          </CardShell>
        </View>
      ) : null}

      {activeLocations.length > 0 && rows.length === 0 && (
        <View style={styles.paddedSection}>
          <AppText variant="body" status="hint" style={styles.centerText}>
            {searchQuery.trim()
              ? "No Locations match your search."
              : `No ${category ? SITE_CATEGORY_LABELS[category] : "Locations"} to show.`}
          </AppText>
        </View>
      )}
    </Stack>
  );

  return (
    <Screen padded={false}>
      <ListView
        rows={rows}
        header={header}
        onPressItem={(id) => router.push(`/(app)/(tabs)/sites/${id}`)}
        ListEmptyComponent={
          activeLocations.length === 0 ? (
            <View style={styles.paddedSection}>
              <CardShell style={styles.emptyCard}>
                <Stack gap="sm" align="center">
                  <AppText variant="h3">No Locations Found</AppText>
                  <AppText variant="body" status="hint" style={styles.centerText}>
                    Check back soon.
                  </AppText>
                </Stack>
              </CardShell>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  categoryTabContent: { gap: 20, paddingHorizontal: tokens.space.md },
  categoryTab: { paddingVertical: 8, alignItems: "center" },
  categoryTabText: { fontSize: 14, fontWeight: "600", color: tokens.colors.text2 },
  // accent, not rotorua-guide's surf: accent is this app's selection colour
  // everywhere else (map marker selection, primary buttons).
  categoryTabTextActive: { color: tokens.colors.accent, fontWeight: "700" },
  categoryTabIndicator: {
    marginTop: 6,
    height: 2,
    width: "100%",
    backgroundColor: tokens.colors.accent,
    borderRadius: 1,
  },
  headerStack: { paddingTop: 12, paddingBottom: 8, width: "100%" },
  paddedSection: { paddingHorizontal: 16 },
  eyebrow: { letterSpacing: 2, marginBottom: 2 },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: tokens.colors.bgElevated,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.sm,
    height: 44,
  },
  searchInput: { flex: 1, color: tokens.colors.text, fontSize: 15 },
  emptyCard: { marginTop: 20, paddingVertical: 40 },
  centerText: { textAlign: "center" },
});
