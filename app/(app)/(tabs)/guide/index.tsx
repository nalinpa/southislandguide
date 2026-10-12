import { useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";

import { AppText } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { TopBar, TopBarBack } from "@/components/layout/TopBar";
import { TopBarTabs } from "@/components/layout/TopBarTabs";
import {
  GUIDE_CATEGORIES,
  ISLAND_CATEGORIES,
  REGIONS_WITH_CONTENT,
  type RegionId,
} from "@/lib/guideContent";

export default function GuideIndexPage() {
  // null = island-wide. A region id filters to that region's sections.
  const [region, setRegion] = useState<RegionId | null>(null);
  const visible = region
    ? GUIDE_CATEGORIES.filter((c) => c.region === region)
    : ISLAND_CATEGORIES;

  const hasRegions = REGIONS_WITH_CONTENT.length > 0;

  return (
    <View style={styles.container}>
      <TopBar
        title="Guide"
        flushBottom={hasRegions}
        leading={
          <TopBarBack
            // Explicit target, not router.back(): the Tabs navigator's default back
            // behaviour returns to the first tab (Explore), not the Profile tab this
            // screen is opened from.
            onPress={() => router.navigate("/(app)/(tabs)/account")}
            label="Back to Profile"
          />
        }
      >
        {/* The scopes are a tab strip in the bar, the same as Explore's
            categories: "South Island" plus each region with sections written. */}
        {hasRegions && (
          <TopBarTabs<RegionId | null>
            tabs={[
              { key: null, label: "South Island" },
              ...REGIONS_WITH_CONTENT.map((r) => ({ key: r.id, label: r.label })),
            ]}
            selected={region}
            onSelect={setRegion}
          />
        )}
      </TopBar>

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
    </View>
  );
}

const styles = StyleSheet.create({
  // White, matching the guide articles and the place detail page.
  container: { flex: 1, backgroundColor: tokens.colors.bgCard },
  list: { paddingHorizontal: tokens.space.md, paddingTop: tokens.space.xs, paddingBottom: tokens.space.xl },
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
  rowTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: tokens.colors.text, letterSpacing: -0.1 },
});
