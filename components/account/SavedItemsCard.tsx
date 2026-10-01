// components/account/SavedItemsCard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";

import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { hooksBag } from "@/lib/hooksBag";
import { tokens } from "@/lib/ui/tokens";

// GAP: RTR's original also links out to a full "Saved Places" list screen
// (`/(app)/saved-sites`) -- that screen isn't templated by this package.
// This card shows the 3 most recently saved Locations only; add
// your own full-list screen and route if you want a "View All" link.

export function SavedItemsCard() {
  const { savedSiteIds } = useSavedSites();
  const { locations } = hooksBag.useLocations();
  const nameMap = React.useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);
  const recentSaved = Array.from(savedSiteIds).slice(-3).reverse();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Saved Locations</Text>
        {savedSiteIds.size > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{savedSiteIds.size}</Text>
          </View>
        )}
      </View>

      {recentSaved.length === 0 ? (
        <Text style={styles.emptyText}>No saved Locations yet.</Text>
      ) : (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: tokens.space.md, paddingVertical: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: tokens.colors.text2,
  },
  countBadge: {
    backgroundColor: tokens.colors.surf,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
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
});
