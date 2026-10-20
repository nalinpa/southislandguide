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

export function SavedItemsCard() {
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
            {recentSaved.map((id) => (
              <TouchableOpacity
                key={id}
                style={styles.row}
                onPress={() => router.push(`/(app)/(tabs)/sites/${id}`)}
                activeOpacity={0.6}
              >
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {nameMap.get(id) ?? id}
                </Text>
                <ChevronRight size={14} color={tokens.colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            ))}
          </View>
          {savedSiteIds.size > 3 && (
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => router.push(`/(app)/saved-sites`)}
              activeOpacity={0.6}
            >
              <Text style={styles.viewAllText}>View All Saved Places</Text>
              <ChevronRight size={14} color={tokens.colors.accent} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: tokens.space.md, paddingVertical: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  // Letter spacing 1.5, down from 3: at 3 the label read as separate letters.
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: tokens.colors.text2,
  },
  // A count is a live fact about the user, so it takes the highlight.
  countBadge: {
    backgroundColor: tokens.colors.highlight,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  emptyText: { fontSize: 14, fontWeight: "400", color: tokens.colors.textMuted, marginBottom: 16 },
  list: { marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: tokens.colors.text, letterSpacing: -0.1, marginRight: 8 },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 4,
  },
  viewAllText: { fontSize: 13, fontWeight: "700", color: tokens.colors.accent, letterSpacing: 0.2 },
});
