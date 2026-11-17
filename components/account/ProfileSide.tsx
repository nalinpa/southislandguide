// components/account/ProfileSide.tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { ArrowRight, X } from "lucide-react-native";
import { useHalves } from "@blacksands/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SignInForm } from "@/components/auth/SignInForm";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { SavedPlacesList } from "@/components/account/SavedPlacesList";
import { PhotoCreditsList } from "@/components/account/PhotoCreditsList";
import { profileTop } from "@/lib/ui/wideTop";
import { CARD_SIDES, cardLift, photoWash, tokens } from "@/lib/ui/tokens";

const GUIDE_PHOTO = require("../../assets/guide-road.webp");
const LOGIN_PHOTO = require("../../assets/login.webp");

// The open Duo's right pane: a photo card with the guide link on it, or for a guest the
// sign-in form. Saved Places or Photo credits (`picked`) take the pane over, with a title row
// whose × brings the photo card back.
export function ProfileSide({
  authed,
  picked,
  onClose,
}: {
  authed: boolean;
  picked: "saved" | "credits" | null;
  onClose: () => void;
}) {
  const { upright } = useHalves();
  const insets = useSafeAreaInsets();
  if (picked) {
    return (
      <View testID="profile-right" style={[styles.pane, styles.picked]}>
        <View style={[styles.titleRow, { marginTop: profileTop(upright, insets.top) }]}>
          <Text style={styles.paneTitle}>{picked === "saved" ? "Saved Places" : "Photo Credits"}</Text>
          {picked === "saved" ? <SavedCount /> : null}
          <View style={styles.flex1} />
          <TouchableOpacity style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <X size={22} color={tokens.colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={picked === "credits" ? styles.credits : styles.flex1}>
          {picked === "saved" ? <SavedPlacesList pane /> : <PhotoCreditsList pane />}
        </View>
      </View>
    );
  }
  return (
    <View testID="profile-right" style={styles.pane}>
      <View style={[styles.photoCard, { marginTop: profileTop(upright, insets.top) }]}>
        <Image
          testID="profile-photo"
          source={authed ? GUIDE_PHOTO : LOGIN_PHOTO}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <View testID="profile-wash" style={[StyleSheet.absoluteFill, { backgroundColor: photoWash }]} />
        <View style={styles.center}>{authed ? <GuideCard /> : <GuestCard />}</View>
      </View>
    </View>
  );
}

// How many are saved, all categories: the number the Profile's Saved Places group shows.
function SavedCount() {
  const { savedSiteIds } = useSavedSites();
  return savedSiteIds.size > 0 ? <Text style={styles.count}>{savedSiteIds.size}</Text> : null;
}

function GuideCard() {
  return (
    <View testID="profile-card" style={[styles.card, styles.guideCard]}>
      <Text style={styles.headline}>{"Your guide to the\nSouth Island"}</Text>
      <TouchableOpacity
        style={styles.openBtn}
        onPress={() => router.push("/(app)/(tabs)/guide")}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={styles.openText}>Open Guide</Text>
        <ArrowRight size={16} color={CARD_SIDES.light} strokeWidth={2.75} />
      </TouchableOpacity>
    </View>
  );
}

// No "Continue as guest" here (owner, 2026-11-17): they are one already.
function GuestCard() {
  const form = useAuthForm("login");
  return (
    <View testID="profile-card" style={[styles.card, styles.guestCard]}>
      {/* Create-account mode adds fields, so the card can outgrow the photo: it scrolls inside
          itself, and the fields stay reachable with the keyboard up. */}
      <ScrollView
        testID="profile-card-scroll"
        style={styles.cardScroll}
        contentContainerStyle={styles.cardContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Sign In for More</Text>
        <Text style={styles.line}>Sign in to save places, plan trips and leave reviews.</Text>
        <SignInForm form={form} wide />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pane: { flex: 60, minWidth: 0 },
  picked: { backgroundColor: tokens.colors.page },
  flex1: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 10 },
  paneTitle: { fontSize: 26, lineHeight: 31, fontWeight: "700", color: tokens.colors.text },
  count: { fontSize: 15, fontWeight: "600", color: tokens.colors.textMuted },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  // The credits scroll pads 16; 4 more puts them on the title's 20.
  credits: { flex: 1, paddingHorizontal: 4 },
  photoCard: { flex: 1, marginHorizontal: 20, marginBottom: 20, borderRadius: 20, overflow: "hidden" },
  // The card's width is the smaller of its own and the photo's less 40: 20 each side.
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  card: {
    width: "100%",
    maxHeight: "100%",
    borderRadius: 20,
    ...cardLift,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 32,
    shadowOpacity: 0.28,
  },
  guideCard: { maxWidth: 350, padding: 24, gap: tokens.space.md, backgroundColor: tokens.colors.accentWarm },
  guestCard: { maxWidth: 380, backgroundColor: tokens.colors.page },
  // The scroll clips to the card's corners; the card itself can't (a shadow and a clip don't mix on iOS).
  cardScroll: { flexGrow: 0, borderRadius: 20 },
  cardContent: { padding: 24, gap: tokens.space.xs },
  headline: { fontSize: 28, lineHeight: 33, fontWeight: "800", color: CARD_SIDES.light, letterSpacing: -0.6 },
  openBtn: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 99,
    backgroundColor: tokens.button.primary.bg,
  },
  openText: { fontSize: 16, fontWeight: "800", color: tokens.button.primary.text, letterSpacing: 0.1 },
  title: { fontSize: 22, lineHeight: 27, fontWeight: "700", color: tokens.colors.text },
  line: { fontSize: 16, lineHeight: 22, color: tokens.colors.text2, marginBottom: tokens.space.xs },
});
