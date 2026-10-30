// app/(app)/(tabs)/account.tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from "react-native";
import { router } from "expo-router";
import { ArrowRight, ChevronRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/lib/providers/SessionProvider";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { LoadingState } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { LightStatusBar } from "@/components/layout/LightStatusBar";
import { UserInfoCard } from "@/components/account/UserInfoCard";
import { ItinerariesCard } from "@/components/account/ItinerariesCard";
import { SavedItemsCard } from "@/components/account/SavedItemsCard";
import { DangerZoneCard } from "@/components/account/DangerZoneCard";
import { useTour } from "@/lib/tour/TourContext";
import { useTourAudience } from "@/lib/tour/TourAutoStart";

// App Review asks for a privacy policy (5.1.1(i)) and a way to reach the developer (1.2)
// inside the app. The page may move with the Kiwi Guide rename: change it here.
const PRIVACY_URL = "https://blacksands.app/south-island-guide#privacy";
const TERMS_URL = "https://blacksands.app/south-island-guide#terms";
const SUPPORT_EMAIL = "info@blacksandsdigital.nz";

// Out of the app, to the browser or Mail. That can fail (no mail account set up on the
// phone), so say where to go instead.
const openOut = (url: string, instead: string) =>
  Linking.openURL(url).catch(() => Alert.alert("Couldn't Open", instead));

const LEGAL_ROWS = [
  { label: "Privacy policy", open: () => openOut(PRIVACY_URL, `Visit ${PRIVACY_URL}`) },
  { label: "Terms of use", open: () => openOut(TERMS_URL, `Visit ${TERMS_URL}`) },
  {
    label: "Contact us",
    open: () => openOut(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Kiwi Guide")}`, `Email us at ${SUPPORT_EMAIL}`),
  },
];

export default function AccountScreen() {
  const { session } = useSession();
  const insets = useSafeAreaInsets();
  const { itineraries, loading: itinerariesLoading } = useItineraries();
  const { savedSiteIds, loading: savedLoading } = useSavedSites();
  const { start: startTour } = useTour();
  const tourAudience = useTourAudience();

  const statsLoading = itinerariesLoading || savedLoading;

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
      <LightStatusBar />
      {/* Guide is static, in-bundle content — no auth needed, so it sits in the
          hero above the isAuthed block, reachable by a guest. The hero is the
          same deep teal as the other tabs' top bars; it used to be a teal card
          on a forest-green ground, two dark greens fighting each other.
          It is fixed, like those bars. It used to scroll with the page, which
          slid the Open Guide button up behind the clock. */}
      <View style={[styles.heroSection, { paddingTop: insets.top + tokens.space.lg }]}>
        <Text style={styles.promoHeadline}>{"Your guide to the\nSouth Island"}</Text>
        <TouchableOpacity
          style={styles.promoBtn}
          onPress={() => router.push("/(app)/(tabs)/guide")}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.promoBtnText}>Open Guide</Text>
          <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.75} />
        </TouchableOpacity>
      </View>

      <View style={styles.sheet}>
        <ScrollView testID="home-scroll" showsVerticalScrollIndicator={false}>
          {isAuthed && (
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statNum}>{statsLoading ? "–" : itineraries.length}</Text>
                <Text style={styles.statLabel}>
                  {statsLoading ? "Trips" : itineraries.length === 1 ? "Trip" : "Trips"}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statChip}>
                <Text style={styles.statNum}>{statsLoading ? "–" : savedSiteIds.size}</Text>
                <Text style={styles.statLabel}>Saved</Text>
              </View>
            </View>
          )}

          {/* Under the stats only: a guest has none, and the line would sit
              alone at the top of the sheet. */}
          {isAuthed && <View style={styles.divider} />}
          <UserInfoCard />

          {/* The opening tour again, from its first step (lib/tour). Guests too: they get
              it on first open like everyone else. */}
          {tourAudience && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => startTour(tourAudience)}
                activeOpacity={0.6}
                accessibilityRole="button"
              >
                <Text style={styles.linkRowText}>Show me around</Text>
                <ChevronRight size={16} color={tokens.colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </>
          )}

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

          {/* The photographers the image licences require to be named. Guests too: the
              photos are the same for everyone. */}
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push("/(app)/photo-credits")}
            activeOpacity={0.6}
            accessibilityRole="button"
          >
            <Text style={styles.linkRowText}>Photo credits</Text>
            <ChevronRight size={16} color={tokens.colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>

          {/* Guests too: App Review checks these without signing in. */}
          {LEGAL_ROWS.map(({ label, open }) => (
            <React.Fragment key={label}>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.linkRow} onPress={open} activeOpacity={0.6} accessibilityRole="button">
                <Text style={styles.linkRowText}>{label}</Text>
                <ChevronRight size={16} color={tokens.colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </React.Fragment>
          ))}

          {/* Was insets.bottom + 80 (~114pt on a Face ID iPhone), sized for a tab
              bar floating over the content. This tab bar sits below it, so that
              was pure gap; a normal bottom margin is enough. */}
          <View style={{ height: tokens.space.xl }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.accentWarm },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: tokens.colors.bgBase },
  // paddingBottom leaves room for the sheet's 12pt overlap.
  heroSection: {
    backgroundColor: tokens.colors.accentWarm,
    paddingHorizontal: tokens.space.lg,
    paddingBottom: 36,
    gap: tokens.space.md,
  },
  promoHeadline: { fontSize: 32, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.6, lineHeight: 38 },
  // The screen's main action: the full-strength highlight with a white label
  // (5.2:1). Not the lighter on-dark orange: white on that is only 1.7:1.
  promoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: tokens.colors.highlight,
    paddingVertical: 16,
    borderRadius: 99,
  },
  promoBtnText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.1 },
  // flex 1: fills down to the tab bar whatever the content's height, so the
  // dark container never shows as a band under a short page (a guest's single
  // "Access" card). overflow hidden clips the scrolling content to the rounded
  // top corners. No drag handle: the sheet doesn't drag.
  sheet: {
    flex: 1,
    backgroundColor: tokens.colors.bgCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -12,
    paddingTop: tokens.space.xs,
    overflow: "hidden",
  },
  statsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: tokens.space.md, paddingVertical: 20 },
  statChip: { flex: 1, alignItems: "center", gap: 3 },
  statNum: { fontSize: 28, fontWeight: "900", color: tokens.colors.highlight, letterSpacing: -1, lineHeight: 32 },
  statLabel: { fontSize: 10, fontWeight: "700", color: tokens.colors.text2, letterSpacing: 1, textTransform: "uppercase" },
  statDivider: { width: 1, height: 36, backgroundColor: tokens.colors.border },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: tokens.colors.border, marginHorizontal: tokens.space.md },
  // Show me around and Photo credits: as a row in the cards (SavedItemsCard), at the
  // cards' side padding.
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 14,
  },
  linkRowText: { fontSize: 15, fontWeight: "600", color: tokens.colors.text, letterSpacing: -0.1 },
});
