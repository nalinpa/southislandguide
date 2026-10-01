// app/(app)/(tabs)/account.tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/lib/providers/SessionProvider";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { LoadingState } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { UserInfoCard } from "@/components/account/UserInfoCard";
import { ItinerariesCard } from "@/components/account/ItinerariesCard";
import { SavedItemsCard } from "@/components/account/SavedItemsCard";
import { DangerZoneCard } from "@/components/account/DangerZoneCard";

export default function AccountScreen() {
  const { session } = useSession();
  const insets = useSafeAreaInsets();
  const { itineraries } = useItineraries();
  const { savedSiteIds } = useSavedSites();

  if (session.status === "loading") {
    return (
      <View style={styles.loadingContainer}>
        <LoadingState label="Loading session..." />
      </View>
    );
  }

  const isAuthed = session.status === "authed";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.heroSection, { paddingTop: insets.top + 16 }]}>
          {/* Guide is static, in-bundle content — no auth needed, so it sits
              in the hero above the isAuthed block, reachable by a guest. */}
          <View style={styles.promoCard}>
            <Text style={styles.promoHeadline}>{"Your guide to the\nSouth Island"}</Text>
            <TouchableOpacity
              style={styles.promoBtn}
              onPress={() => router.push("/(app)/(tabs)/guide")}
              activeOpacity={0.85}
            >
              <Text style={styles.promoBtnText}>Open Guide</Text>
              <ArrowRight size={16} color={tokens.colors.surf} strokeWidth={2.75} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          {isAuthed && (
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statNum}>{itineraries.length}</Text>
                <Text style={styles.statLabel}>{itineraries.length === 1 ? "Trip" : "Trips"}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statChip}>
                <Text style={styles.statNum}>{savedSiteIds.size}</Text>
                <Text style={styles.statLabel}>Saved</Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />
          <UserInfoCard />

          {isAuthed && (
            <>
              <View style={styles.divider} />
              <ItinerariesCard />
              <View style={styles.divider} />
              <SavedItemsCard />
              <View style={styles.divider} />
              <DangerZoneCard />
            </>
          )}

          {/* Was insets.bottom + 80 (~114pt on a Face ID iPhone), sized for a tab
              bar floating over the content. This tab bar sits below it, so that
              was pure gap; a normal bottom margin is enough. */}
          <View style={{ height: tokens.space.xl }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.surf },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: tokens.colors.bgBase },
  scrollContent: { flexGrow: 1 },
  heroSection: { backgroundColor: tokens.colors.surf, paddingHorizontal: tokens.space.md, paddingBottom: 24 },
  promoCard: {
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.lg,
    padding: 24,
    gap: 8,
    shadowColor: tokens.colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  promoHeadline: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.6, lineHeight: 34 },
  promoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 99,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  promoBtnText: { fontSize: 16, fontWeight: "800", color: tokens.colors.surf, letterSpacing: 0.1 },
  // flexGrow: fills down to the tab bar. Without it, short content (e.g. a
  // guest's single "Access" card) left the dark `surf` container showing as a
  // band between the sheet and the tab bar.
  sheet: { backgroundColor: tokens.colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -12, minHeight: 400, flexGrow: 1 },
  dragHandle: { width: 32, height: 4, borderRadius: 2, backgroundColor: tokens.colors.border, alignSelf: "center", marginTop: 14, marginBottom: 4 },
  statsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: tokens.space.md, paddingVertical: 20 },
  statChip: { flex: 1, alignItems: "center", gap: 3 },
  statNum: { fontSize: 28, fontWeight: "900", color: tokens.colors.text, letterSpacing: -1, lineHeight: 32 },
  statLabel: { fontSize: 10, fontWeight: "700", color: tokens.colors.text2, letterSpacing: 1, textTransform: "uppercase" },
  statDivider: { width: 1, height: 36, backgroundColor: tokens.colors.border },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: tokens.colors.border, marginHorizontal: tokens.space.md },
});
