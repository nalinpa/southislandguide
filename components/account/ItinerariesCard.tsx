// components/account/ItinerariesCard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Plus } from "lucide-react-native";

import { AppText } from "@/lib/uiKit";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { tokens } from "@/lib/ui/tokens";
import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";
import { formatTripDates } from "@/lib/utils/formatDates";

export function ItinerariesCard() {
  const { itineraries, error, addFlow } = useItineraries();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <>
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>My Trip</Text>
      </View>

      {itineraries.length === 0 ? (
        <Text style={styles.emptyText}>No trip yet.</Text>
      ) : (
        <View style={styles.list}>
          {itineraries.map((itinerary, i) => (
            <TouchableOpacity
              key={itinerary.id}
              style={[styles.row, i > 0 && styles.rowLine]}
              onPress={() => router.push(`/(app)/(tabs)/itinerary/${itinerary.id}`)}
              activeOpacity={0.6}
            >
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {itinerary.title}
                </Text>
                <Text style={styles.rowDate}>{formatTripDates(itinerary.startDate, itinerary.endDate)}</Text>
              </View>
              <ChevronRight size={18} color={tokens.colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && (
        <AppText variant="label" style={[styles.errorText, { color: tokens.colors.danger }]}>
          {error}
        </AppText>
      )}

      {/* Only with no trip ("pick" is one trip, the limit; owner, 2026-11-11: no limit line
          and no count). Nothing until the trips are known: an empty list before they load,
          or after a failed load, showed "New Trip" to someone who already had one. */}
      {addFlow && addFlow !== "pick" ? (
        <TouchableOpacity style={styles.createBtn} onPress={() => setIsCreating(true)} activeOpacity={0.6}>
          <Plus size={15} color={tokens.colors.selected} strokeWidth={2.5} />
          <Text style={styles.createBtnText}>New Trip</Text>
        </TouchableOpacity>
      ) : null}
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
  section: { paddingHorizontal: tokens.space.md, paddingTop: 14, paddingBottom: 6 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  // A section's name: small and grey, as written, a step under the rows it heads, with the
  // same gap under it in every group (design sweep, Profile round 3).
  sectionLabel: { fontSize: 13, fontWeight: "600", color: tokens.colors.textMuted },
  emptyText: { fontSize: 15, color: tokens.colors.textMuted, paddingVertical: 10 },
  list: {},
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 14 },
  // A hairline between rows in the group, none after the last: a band follows it.
  rowLine: { borderTopWidth: 1, borderTopColor: tokens.colors.line },
  rowContent: { flex: 1, gap: 1 },
  rowTitle: { fontSize: 16, fontWeight: "500", color: tokens.colors.text },
  rowDate: { fontSize: 14, color: tokens.colors.textMuted },
  errorText: { marginBottom: 12 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 44 },
  createBtnText: { fontSize: 15, fontWeight: "600", color: tokens.colors.selected },
});
