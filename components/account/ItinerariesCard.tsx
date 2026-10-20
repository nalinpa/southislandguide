// components/account/ItinerariesCard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Plus } from "lucide-react-native";

import { AppText } from "@/lib/uiKit";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { tokens } from "@/lib/ui/tokens";
import { PLANNER } from "@/lib/constants/gameplay";
import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";
import { formatTripDates } from "@/lib/utils/formatDates";

export function ItinerariesCard() {
  const { itineraries, error } = useItineraries();
  const [isCreating, setIsCreating] = useState(false);
  const atLimit = itineraries.length >= PLANNER.MAX_ITINERARIES;

  return (
    <>
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>My Trips</Text>
        {itineraries.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{itineraries.length}</Text>
          </View>
        )}
      </View>

      {itineraries.length === 0 ? (
        <Text style={styles.emptyText}>No trips yet.</Text>
      ) : (
        <View style={styles.list}>
          {itineraries.map((itinerary, index) => (
            <TouchableOpacity
              key={itinerary.id}
              style={styles.row}
              onPress={() => router.push(`/(app)/(tabs)/itinerary/${itinerary.id}`)}
              activeOpacity={0.6}
            >
              <Text style={styles.index}>{String(index + 1).padStart(2, "0")}</Text>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {itinerary.title}
                </Text>
                <Text style={styles.rowDate}>{formatTripDates(itinerary.startDate, itinerary.endDate)}</Text>
              </View>
              <ChevronRight size={14} color={tokens.colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && (
        <AppText variant="label" style={[styles.errorText, { color: tokens.colors.danger }]}>
          {error}
        </AppText>
      )}

      {atLimit ? (
        <Text style={styles.limitText}>Up to {PLANNER.MAX_ITINERARIES} trips at a time.</Text>
      ) : (
        <TouchableOpacity style={styles.createBtn} onPress={() => setIsCreating(true)} activeOpacity={0.6}>
          <Plus size={13} color={tokens.colors.accent} strokeWidth={2.5} />
          <Text style={styles.createBtnText}>New Trip</Text>
        </TouchableOpacity>
      )}
    </View>
    <CreateItineraryModal
      visible={isCreating}
      onClose={() => setIsCreating(false)}
      onCreated={(id) => {
        setIsCreating(false);
        if (id) router.push(`/(app)/(tabs)/itinerary/${id}`);
      }}
      showTemplateOption
    />
    </>
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
  list: { marginBottom: 16, gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  index: { fontSize: 11, fontWeight: "700", color: tokens.colors.textMuted, letterSpacing: 1, width: 20 },
  rowContent: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: tokens.colors.text, letterSpacing: -0.1 },
  rowDate: { fontSize: 12, fontWeight: "400", color: tokens.colors.text2, letterSpacing: 0.2 },
  errorText: { marginBottom: 12 },
  limitText: { fontSize: 12, fontWeight: "400", color: tokens.colors.textMuted, letterSpacing: 0.2 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
  createBtnText: { fontSize: 13, fontWeight: "600", color: tokens.colors.accent, letterSpacing: 0.2 },
});
