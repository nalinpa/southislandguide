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

  // With no trip, exactly one of three, never together: the trips are loaded and none ("Plan
  // your trip"; "pick" is one trip, the limit), not known yet (the greyed row; addFlow is null
  // until they are, and while paused offline), or failed (the error only: an empty list before
  // they load, or after a failed load, would offer a trip to someone who already has one).
  const planRow = !!addFlow && addFlow !== "pick";
  const unknown = !addFlow && !error;

  return (
    <>
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>My Trip</Text>
      </View>

      {itineraries.length === 0 ? (
        planRow ? (
          <TouchableOpacity
            style={styles.row}
            onPress={() => setIsCreating(true)}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel="Plan your trip"
          >
            <View style={styles.tile}>
              <Plus size={20} color={tokens.colors.selected} strokeWidth={2.25} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                Plan your trip
              </Text>
              <Text style={styles.rowDate} numberOfLines={2}>
                Pick a suggested trip or start your own
              </Text>
            </View>
            <ChevronRight size={18} color={tokens.colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        ) : unknown ? (
          <View style={styles.row} accessible accessibilityLabel="Loading your trip">
            <View style={[styles.tile, styles.grey]} />
            <View style={styles.rowContent}>
              <View style={[styles.bar, styles.grey, { width: "60%" }]} />
              <View style={[styles.bar, styles.grey, { width: "80%" }]} />
            </View>
          </View>
        ) : null
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
  // The empty row is a trip row with a tile on the left, so nothing jumps when a trip arrives.
  tile: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: tokens.colors.selFill },
  grey: { backgroundColor: tokens.colors.line },
  bar: { height: 12, borderRadius: 6, marginVertical: 3 },
  list: {},
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 14 },
  // A hairline between rows in the group, none after the last: a band follows it.
  rowLine: { borderTopWidth: 1, borderTopColor: tokens.colors.line },
  rowContent: { flex: 1, gap: 1 },
  rowTitle: { fontSize: 16, fontWeight: "500", color: tokens.colors.text },
  rowDate: { fontSize: 14, color: tokens.colors.textMuted },
  errorText: { marginBottom: 12 },
});
