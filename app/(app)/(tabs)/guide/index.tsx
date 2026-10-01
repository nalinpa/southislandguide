import { useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { AppText, AppIconButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import {
  GUIDE_CATEGORIES,
  ISLAND_CATEGORIES,
  REGIONS_WITH_CONTENT,
  type RegionId,
} from "@/lib/guideContent";

function ScopePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <AppText style={[styles.pillText, active && styles.pillTextActive]}>{label}</AppText>
    </TouchableOpacity>
  );
}

export default function GuideIndexPage() {
  // null = island-wide. A region id filters to that region's sections.
  const [region, setRegion] = useState<RegionId | null>(null);
  const visible = region
    ? GUIDE_CATEGORIES.filter((c) => c.region === region)
    : ISLAND_CATEGORIES;

  return (
    // Top edge only: this screen now sits under (tabs), and the tab bar below
    // already handles the bottom inset.
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <AppIconButton
          icon={ChevronLeft}
          // Explicit target, not router.back(): the Tabs navigator's default back
          // behaviour returns to the first tab (Explore), not the Home tab this
          // screen is opened from.
          onPress={() => router.navigate("/(app)/(tabs)/account")}
          accessibilityLabel="Back to Home"
          variant="control"
          style={styles.backBtn}
        />
        <AppText variant="h1" style={styles.title}>
          Guide
        </AppText>
      </View>

      {REGIONS_WITH_CONTENT.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scopeRow}
        >
          <ScopePill label="South Island" active={region === null} onPress={() => setRegion(null)} />
          {REGIONS_WITH_CONTENT.map((r) => (
            <ScopePill
              key={r.id}
              label={r.label}
              active={region === r.id}
              onPress={() => setRegion(r.id)}
            />
          ))}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {visible.map((category) => {
          const Icon = category.icon;
          return (
            <TouchableOpacity
              key={category.slug}
              style={styles.row}
              onPress={() => router.push(`/(app)/(tabs)/guide/${category.slug}`)}
              activeOpacity={0.6}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${category.color}1F` }]}>
                <Icon size={20} color={category.color} strokeWidth={2} />
              </View>
              <AppText style={styles.rowTitle}>{category.title}</AppText>
              <ChevronRight size={16} color={tokens.colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Near-white, matching the guide articles and the place detail page.
  safeArea: { flex: 1, backgroundColor: tokens.colors.bgCard },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.md,
  },
  title: { fontSize: 28 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // Solid accent with a white chevron (AppIconButton variant="control"): an
    // outlined circle on this white page was hard to spot. Accent is the app's
    // "tap me" colour; the white chevron on it is 7.69:1.
    backgroundColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.xl },
  scopeRow: {
    flexDirection: "row",
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.sm,
  },
  pill: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 6,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.bgCard,
  },
  pillActive: { backgroundColor: tokens.colors.accent, borderColor: tokens.colors.accent },
  pillText: { fontSize: 13, fontWeight: "600", color: tokens.colors.text2 },
  pillTextActive: { color: "#FFFFFF" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: tokens.colors.text, letterSpacing: -0.1 },
});
