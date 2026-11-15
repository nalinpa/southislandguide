// app/(app)/(tabs)/account.tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Switch } from "react-native";
import { router } from "expo-router";
import { ArrowRight, ChevronRight } from "lucide-react-native";
import { useHalves, useWide } from "@blacksands/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/lib/providers/SessionProvider";
import { useEmailOptIn } from "@/lib/hooks/useEmailOptIn";
import { LoadingState } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { LightStatusBar } from "@/components/layout/LightStatusBar";
import { UserInfoCard } from "@/components/account/UserInfoCard";
import { ItinerariesCard } from "@/components/account/ItinerariesCard";
import { SavedItemsCard } from "@/components/account/SavedItemsCard";
import { DangerZoneCard } from "@/components/account/DangerZoneCard";
import { OfflineMapCard } from "@/components/account/OfflineMapCard";
import { useTour } from "@/lib/tour/TourContext";
import { useTourAudience } from "@/lib/tour/TourAutoStart";

// App Review asks for a privacy policy (5.1.1(i)) and a way to reach the developer (1.2)
// inside the app. The page may move with the Kiwi Guide rename: change it here.
const PRIVACY_URL = "https://blacksands.app/kiwi-guide#privacy";
const TERMS_URL = "https://blacksands.app/kiwi-guide#terms";
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
  const { optedIn, loading: optInLoading, setOptedIn } = useEmailOptIn();
  const { start: startTour } = useTour();
  const tourAudience = useTourAudience();

  if (session.status === "loading") {
    return (
      <View style={styles.loadingContainer}>
        <LoadingState label="Loading session..." />
      </View>
    );
  }

  const isAuthed = session.status === "authed";

  // Duo (600 pt or more): two columns, the guide card leading on the left. The groups are
  // the phone's, keyed, so they stay mounted (dialogs open, downloads running) as the
  // window folds; only the guide banner (no state) moves between the fixed hero and the card.
  const wide = useWide();
  const { upright } = useHalves();

  const guide = (
    <View
      style={
        wide
          ? [styles.guideCard, { marginTop: upright ? 56 : 16 }]
          : [styles.heroSection, { paddingTop: insets.top + tokens.space.lg }]
      }
    >
      <Text style={[styles.promoHeadline, wide && styles.promoHeadlineWide]}>{"Your guide to the\nSouth Island"}</Text>
      <TouchableOpacity
        style={[styles.promoBtn, wide && styles.promoBtnWide]}
        onPress={() => router.push("/(app)/(tabs)/guide")}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={styles.promoBtnText}>Open Guide</Text>
        <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.75} />
      </TouchableOpacity>
    </View>
  );

  const tour = tourAudience && (
    <TouchableOpacity
      style={styles.linkRow}
      onPress={() => startTour(tourAudience)}
      activeOpacity={0.6}
      accessibilityRole="button"
    >
      <Text style={styles.linkRowText}>Show me around</Text>
      <ChevronRight size={18} color={tokens.colors.textMuted} strokeWidth={2} />
    </TouchableOpacity>
  );

  const credits = (
    <>
      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => router.push("/(app)/photo-credits")}
        activeOpacity={0.6}
        accessibilityRole="button"
      >
        <Text style={styles.linkRowText}>Photo credits</Text>
        <ChevronRight size={18} color={tokens.colors.textMuted} strokeWidth={2} />
      </TouchableOpacity>
      {/* Guests too: App Review checks these without signing in. */}
      {LEGAL_ROWS.map(({ label, open }) => (
        <React.Fragment key={label}>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.linkRow} onPress={open} activeOpacity={0.6} accessibilityRole="button">
            <Text style={styles.linkRowText}>{label}</Text>
            <ChevronRight size={18} color={tokens.colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </>
  );

  // The phone runs left then right, top to bottom. Wide moves My Trip up under who you are;
  // keys keep each group mounted through the move.
  type Group = [key: string, node: React.ReactNode];
  const trip: Group | false = isAuthed && ["trip", <ItinerariesCard />];
  const leftGroups = [
    ["who", <UserInfoCard />],
    ...(wide && trip ? [trip] : []),
    ...(tour ? [["tour", tour] as Group] : []),
    ["map", <OfflineMapCard />],
    ...(!wide && trip ? [trip] : []),
  ] as Group[];
  const rightGroups = [
    ...(isAuthed
      ? ([
          ["saved", <SavedItemsCard />],
          [
            "email",
            // The answer given at sign-up (the box under the password), changeable here.
            // Signed in only: a guest has no email to send to.
            <View style={styles.linkRow}>
              <Text style={styles.switchText}>Email me about feedback and news</Text>
              <Switch
                value={optedIn}
                onValueChange={setOptedIn}
                disabled={optInLoading}
                trackColor={{ true: tokens.colors.accent }}
                accessibilityLabel="Email me about feedback and news"
              />
            </View>,
          ],
          ["danger", <DangerZoneCard />],
        ] as Group[])
      : []),
    ["credits", credits],
  ] as Group[];

  // A pale band before each group. On the phone the right column's first follows the left's
  // last; on wide each column opens clean (the guide card's own margin sets the left's gap).
  const column = (groups: Group[], firstBand: boolean) =>
    groups.map(([key, node], i) => (
      <React.Fragment key={key}>
        {(i > 0 || firstBand) && <View style={styles.band} />}
        {node}
      </React.Fragment>
    ));

  return (
    <View style={[styles.container, wide && styles.containerWide, wide && { paddingTop: insets.top }]}>
      {!wide && <LightStatusBar />}
      {/* Guide is static, in-bundle content — no auth needed, so it sits in the
          hero above the isAuthed block, reachable by a guest. The hero is the
          same deep teal as the other tabs' top bars; it used to be a teal card
          on a forest-green ground, two dark greens fighting each other.
          It is fixed, like those bars. It used to scroll with the page, which
          slid the Open Guide button up behind the clock. On wide it is the card
          that leads the left column, white page and dark status bar. */}
      {!wide && guide}

      <View style={[styles.sheet, wide && styles.sheetWide]}>
        <ScrollView testID="home-scroll" showsVerticalScrollIndicator={false}>
          <View style={wide && styles.columns}>
            <View testID="profile-left" style={wide && styles.left}>
              {wide && guide}
              {column(leftGroups, false)}
            </View>
            <View testID="profile-hairline" style={wide ? styles.hairline : styles.none} />
            {/* Saved Places' name sits level with the card's top: its group pads 14 above it. */}
            <View testID="profile-right" style={wide && [styles.right, { paddingTop: upright ? 42 : 2 }]}>
              {column(rightGroups, !wide)}
            </View>
          </View>

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
  // Duo: white from the clock down (the dark status bar), two columns 40/60 with a hairline.
  containerWide: { backgroundColor: tokens.colors.page },
  sheetWide: { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: 0, paddingTop: 0 },
  columns: { flexDirection: "row" },
  left: { flex: 40 },
  right: { flex: 60 },
  hairline: { width: 1, backgroundColor: tokens.colors.line },
  none: { display: "none" },
  guideCard: {
    backgroundColor: tokens.colors.accentWarm,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 20,
    gap: tokens.space.md,
  },
  promoHeadlineWide: { fontSize: 28, lineHeight: 33 },
  promoBtnWide: { height: 52, paddingVertical: 0 },
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
    backgroundColor: tokens.button.primary.bg,
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
    backgroundColor: tokens.colors.page,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -12,
    paddingTop: tokens.space.xs,
    overflow: "hidden",
  },
  // Groups are set apart by a pale band; rows inside a group by a hairline (design sweep,
  // Profile: docs/plans/design-sweep.md). It was a hairline everywhere, so the page read as
  // one flat list.
  band: { height: 8, backgroundColor: tokens.colors.band },
  divider: { height: 1, backgroundColor: tokens.colors.line, marginHorizontal: tokens.space.md },
  // Show me around and Photo credits: as a row in the cards (SavedItemsCard), at the
  // cards' side padding. One weight for every row that can be tapped.
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 12,
  },
  linkRowText: { fontSize: 16, fontWeight: "500", color: tokens.colors.text },
  // flex: the words wrap before they push the switch off an iPhone SE's edge.
  switchText: { flex: 1, marginRight: tokens.space.md, fontSize: 16, fontWeight: "500", color: tokens.colors.text },
});
