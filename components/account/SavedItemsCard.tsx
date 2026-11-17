// components/account/SavedItemsCard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";

import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { hooksBag } from "@/lib/hooksBag";
import { tokens } from "@/lib/ui/tokens";

// The card shows the 3 most recently saved Locations as a preview; the
// "View All Saved Places" link below takes users to the full list at
// /(app)/saved-sites. No count in the link: the badge beside the heading has it.

export function SavedItemsCard({
  onViewAll,
  viewAllSelected,
}: {
  /** The open Duo: the link opens Saved Places in the Profile's right pane instead of going to its screen. */
  onViewAll?: () => void;
  /** That pane is open. */
  viewAllSelected?: boolean;
} = {}) {
  const { savedSiteIds } = useSavedSites();
  const { locations } = hooksBag.useLocations();
  const nameMap = React.useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);
  const recentSaved = Array.from(savedSiteIds).slice(-3).reverse();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Saved Places</Text>
        {savedSiteIds.size > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{savedSiteIds.size}</Text>
          </View>
        )}
      </View>

      {recentSaved.length === 0 ? (
        <Text style={styles.emptyText}>No saved places yet.</Text>
      ) : (
        <>
          <View style={styles.list}>
            {recentSaved.map((id, i) => (
              <TouchableOpacity
                key={id}
                style={[styles.row, i > 0 && styles.rowLine]}
                onPress={() => router.push(`/(app)/(tabs)/sites/${id}`)}
                activeOpacity={0.6}
              >
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {nameMap.get(id) ?? id}
                </Text>
                <ChevronRight size={18} color={tokens.colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            ))}
          </View>
          {savedSiteIds.size > 3 && (
            <TouchableOpacity
              style={[styles.viewAllBtn, viewAllSelected && styles.viewAllOn]}
              onPress={() => (onViewAll ? onViewAll() : router.push(`/(app)/saved-sites`))}
              activeOpacity={0.6}
              accessibilityRole="button"
              {...(onViewAll && { accessibilityState: { selected: !!viewAllSelected } })}
            >
              <Text style={styles.viewAllText}>View All Saved Places</Text>
              <ChevronRight size={16} color={tokens.colors.selected} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: tokens.space.md, paddingTop: 14, paddingBottom: 6 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 2 },
  // A section's name: small and grey, as written, a step under the rows it heads, with the
  // same gap under it in every group (design sweep, Profile round 3).
  sectionLabel: { fontSize: 13, fontWeight: "600", color: tokens.colors.textMuted },
  // How many are saved: a fact, so plain grey at the row's right edge. It was a count in
  // an orange disc; orange is kept for what to tap.
  countBadge: {},
  countText: { fontSize: 13, fontWeight: "600", color: tokens.colors.textMuted },
  emptyText: { fontSize: 15, color: tokens.colors.textMuted, paddingVertical: 10 },
  list: {},
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, paddingVertical: 10 },
  // A hairline between rows in the group, none after the last: a band follows it.
  rowLine: { borderTopWidth: 1, borderTopColor: tokens.colors.line },
  rowTitle: { flex: 1, fontSize: 16, fontWeight: "500", color: tokens.colors.text, marginRight: 8 },
  viewAllBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 44 },
  // The picked row: the fill reaches 12 into the card's margins (-12 out, 12 back in), so the
  // words stay where they were.
  viewAllOn: { alignSelf: "stretch", marginHorizontal: -12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: tokens.colors.selFill },
  viewAllText: { fontSize: 15, fontWeight: "600", color: tokens.colors.selected },
});
