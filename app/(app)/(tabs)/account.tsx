// app/(app)/(tabs)/account.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Switch, useColorScheme } from "react-native";
import { router } from "expo-router";
import { ArrowRight, ChevronRight } from "lucide-react-native";
import { useHalves, useWide } from "@blacksands/ui";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/lib/providers/SessionProvider";
import { onProductionChannel } from "@/lib/analytics";
import { useEmailOptIn } from "@/lib/hooks/useEmailOptIn";
import { LoadingState } from "@/lib/uiKit";
import { CARD_SIDES, LAKE_SIDES, PAGE_SIDES, tokens } from "@/lib/ui/tokens";
import { profileTop } from "@/lib/ui/wideTop";
import { LightStatusBar } from "@/components/layout/LightStatusBar";
import { UserInfoCard } from "@/components/account/UserInfoCard";
import { ItinerariesCard } from "@/components/account/ItinerariesCard";
import { SavedItemsCard } from "@/components/account/SavedItemsCard";
import { DangerZoneCard } from "@/components/account/DangerZoneCard";
import { OfflineMapCard } from "@/components/account/OfflineMapCard";
import { ProfileSide } from "@/components/account/ProfileSide";
import { useTour } from "@/lib/tour/TourContext";
import { useTourAudience } from "@/lib/tour/TourAutoStart";

// App Review asks for a privacy policy (5.1.1(i)) and a way to reach the developer (1.2)
// inside the app. The page may move with the Kiwi Guide rename: change it here.
const PRIVACY_URL = "https://blacksands.app/kiwi-guide#privacy";
const TERMS_URL = "https://blacksands.app/kiwi-guide#terms";
const SUPPORT_EMAIL = "info@blacksandsdigital.nz";
const RATE_URL = "https://apps.apple.com/app/id6818057796?action=write-review";

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
  {
    label: "Rate Kiwi Guide",
    open: () => openOut(RATE_URL, "Open Kiwi Guide in the App Store"),
  },
];

export default function AccountScreen() {
  const { session } = useSession();
  const insets = useSafeAreaInsets();
  const { optedIn, loading: optInLoading, setOptedIn } = useEmailOptIn();
  const { start: startTour } = useTour();
  const tourAudience = useTourAudience();
  // Hooks stay above the loading return: the count can't change when the session arrives.
  const wide = useWide();
  const { upright } = useHalves();
  const page = PAGE_SIDES[useColorScheme() === "dark" ? "dark" : "light"];
  // The open Duo: which of the two screens fills the right pane. Kept in memory when the
  // window folds; unfolding shows it again.
  const [picked, setPicked] = useState<"saved" | "credits" | null>(null);

  if (session.status === "loading") {
    return (
      <View style={styles.loadingContainer}>
        <LoadingState label="Loading session..." />
      </View>
    );
  }

  const isAuthed = session.status === "authed";
  // A guest has no Saved Places, even if it was open when they signed out.
  const open = picked === "saved" && !isAuthed ? null : picked;

  // Duo (600 pt or more): the rows in a left column that scrolls on its own, and a right pane
  // (ProfileSide) beside it. The groups are the phone's, keyed, so they stay mounted (dialogs
  // open, downloads running) as the window folds; only the guide banner (no state) moves
  // between the fixed hero and the guest's first row.
  const top = profileTop(upright, insets.top);

  const guide = (
    <View
      style={
        wide
          ? [styles.guideCard, { marginTop: top }]
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
        <Text style={[styles.promoBtnText, wide && styles.promoBtnTextWide]}>Open Guide</Text>
        <ArrowRight size={16} color={wide ? LAKE_SIDES.light : CARD_SIDES.light} strokeWidth={2.75} />
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

  // TEMP (stage 7 replaces this): the way in to the trip quiz while it is being built
  // (docs/plans/app-trip-builder.md). Guests too: anyone can take the quiz.
  // Never in the store build. By the channel, not __DEV__: the owner's test updates are
  // production bundles (on the development channel).
  const quiz = !onProductionChannel() && (
    <TouchableOpacity
      style={styles.linkRow}
      onPress={() => router.push("/build-trip")}
      activeOpacity={0.6}
      accessibilityRole="button"
    >
      <Text style={styles.linkRowText}>Build My Trip (test)</Text>
      <ChevronRight size={18} color={tokens.colors.textMuted} strokeWidth={2} />
    </TouchableOpacity>
  );

  const credits = (
    <>
      <TouchableOpacity
        style={[styles.linkRow, wide && open === "credits" && styles.linkRowOn]}
        onPress={() => (wide ? setPicked("credits") : router.push("/(app)/photo-credits"))}
        activeOpacity={0.6}
        accessibilityRole="button"
        {...(wide && { accessibilityState: { selected: open === "credits" } })}
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

  // One list, top to bottom, the phone's order. Wide puts Account (Delete Account) last, after
  // Photo credits, and gives a guest the guide card first; keys keep each group mounted
  // through the move.
  type Group = [key: string, node: React.ReactNode];
  const email: Group = [
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
  ];
  const danger: Group = ["danger", <DangerZoneCard />];
  const groups = [
    ...(wide && !isAuthed ? [["guide", guide] as Group] : []),
    // Not for a guest on a wide screen: the sign-in form is on the right already, so the
    // card's "Sign In / Create Account" button said the same thing twice (owner, 2026-11-18).
    ...(wide && !isAuthed ? [] : [["who", <UserInfoCard />] as Group]),
    ...(tour ? [["tour", tour] as Group] : []),
    ...(quiz ? [["quiz", quiz] as Group] : []),
    ["map", <OfflineMapCard />],
    ...(isAuthed ? [["trip", <ItinerariesCard />] as Group, [
            "saved",
            wide ? <SavedItemsCard onViewAll={() => setPicked("saved")} viewAllSelected={open === "saved"} /> : <SavedItemsCard />,
          ] as Group, email] : []),
    ...(isAuthed && !wide ? [danger] : []),
    ["credits", credits],
    ...(isAuthed && wide ? [danger] : []),
  ] as Group[];

  // A pale band between groups.
  const column = groups.map(([key, node], i) => (
    <React.Fragment key={key}>
      {i > 0 && <View style={styles.band} />}
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
          slid the Open Guide button up behind the clock. On wide it is the right
          pane (signed in) or the guest's first row, white page and dark status bar. */}
      {!wide && guide}

      <View style={[styles.sheet, wide && styles.sheetWide]}>
        <View style={wide ? styles.columns : styles.flex1}>
          <View testID="profile-left" style={wide ? styles.left : styles.flex1}>
            <ScrollView
              testID="home-scroll"
              showsVerticalScrollIndicator={false}
              // A guest's first row is the guide card, which has its own top margin.
              contentContainerStyle={wide && isAuthed ? { paddingTop: top } : undefined}
            >
              {column}

              {/* Was insets.bottom + 80 (~114pt on a Face ID iPhone), sized for a tab
                  bar floating over the content. This tab bar sits below it, so that
                  was pure gap; a normal bottom margin is enough. */}
              <View style={{ height: tokens.space.xl }} />
            </ScrollView>
            {wide ? (
              <LinearGradient
                testID="profile-fade"
                pointerEvents="none"
                colors={[`${page}00`, page]}
                style={styles.fade}
              />
            ) : null}
          </View>
          <View testID="profile-hairline" style={wide ? styles.hairline : styles.none} />
          {wide ? <ProfileSide authed={isAuthed} picked={open} onClose={() => setPicked(null)} /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.accentWarm },
  // Duo: white from the clock down (the dark status bar), two columns 40/60 with a hairline.
  containerWide: { backgroundColor: tokens.colors.page },
  sheetWide: { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: 0, paddingTop: 0 },
  flex1: { flex: 1 },
  columns: { flex: 1, flexDirection: "row" },
  left: { flex: 40, minWidth: 0 },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 40 },
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
  // The guest's card on the open Duo: a white button on the teal card; the phone keeps orange.
  promoBtnWide: { height: 52, paddingVertical: 0, backgroundColor: CARD_SIDES.light },
  promoBtnTextWide: { color: LAKE_SIDES.light },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: tokens.colors.bgBase },
  // paddingBottom leaves room for the sheet's 12pt overlap.
  heroSection: {
    backgroundColor: tokens.colors.accentWarm,
    paddingHorizontal: tokens.space.lg,
    paddingBottom: 36,
    gap: tokens.space.md,
  },
  promoHeadline: { fontSize: 32, fontWeight: "800", color: CARD_SIDES.light, letterSpacing: -0.6, lineHeight: 38 },
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
  promoBtnText: { fontSize: 16, fontWeight: "800", color: tokens.button.primary.text, letterSpacing: 0.1 },
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
  // The picked row on the open Duo: the fill reaches 12 into the margins (4 in from the
  // column's edge, the words at their 16).
  linkRowOn: { marginHorizontal: 4, paddingHorizontal: 12, borderRadius: 12, backgroundColor: tokens.colors.selFill },
  linkRowText: { fontSize: 16, fontWeight: "500", color: tokens.colors.text },
  // flex: the words wrap before they push the switch off an iPhone SE's edge.
  switchText: { flex: 1, marginRight: tokens.space.md, fontSize: 16, fontWeight: "500", color: tokens.colors.text },
});
