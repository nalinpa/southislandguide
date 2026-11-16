import { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWide } from "@blacksands/ui";
import { ChevronDown, ChevronLeft } from "lucide-react-native";

import { AppText } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { wideTop } from "@/lib/ui/wideTop";
import { TopBar, TopBarBack } from "@/components/layout/TopBar";
import { TopBarTabs } from "@/components/layout/TopBarTabs";
import { GuideArticle } from "@/components/guide/GuideArticle";
import { GuideList } from "@/components/guide/GuideList";
import { RegionSheet } from "@/components/guide/RegionSheet";
import {
  GUIDE_CATEGORIES,
  ISLAND_CATEGORIES,
  REGIONS_WITH_CONTENT,
  type RegionId,
} from "@/lib/guideContent";
import { REGION_TABS } from "@/lib/guideRegions";

// The guide's list. On a phone the list is a page and a tap opens the section's own page; on
// the open Duo the list sits beside the section (a tap shows it on the right) and the region is
// a picker in place of the tab strip. One tree on both: the list and the article keep their
// place in it, so folding mid-screen keeps the chosen section. `initialSlug` is a deep link;
// with `articleMode` (the /guide/[slug] route) a phone shows only the article under its back
// row, the list pane an empty slot, so folding only toggles the list and the article stays put.
export function GuideBrowser({ initialSlug, articleMode }: { initialSlug?: string; articleMode?: boolean }) {
  const wide = useWide();
  const phoneArticle = !!articleMode && !wide;
  const insets = useSafeAreaInsets();
  const deepLinked = GUIDE_CATEGORIES.find((c) => c.slug === initialSlug);

  // null = island-wide. A region id filters to that region's sections.
  const [region, setRegion] = useState<RegionId | null>(deepLinked?.region ?? null);
  // The section on show beside the list (wide only); the region's first until one is tapped.
  const [slug, setSlug] = useState<string | undefined>(deepLinked?.slug);
  const [picking, setPicking] = useState(false);

  // A region handed over by Explore's guide button: the region of the town it shows. Taken
  // once, then cleared, as Explore takes a town: this tab screen keeps its params, and the
  // same region sent again later must still count as new. One with no sections written
  // opens the island-wide ones.
  const { region: regionParam } = useLocalSearchParams<{ region?: string }>();
  useEffect(() => {
    if (!regionParam) return;
    const known = REGIONS_WITH_CONTENT.find((r) => r.id === regionParam);
    setRegion(known ? known.id : null);
    router.setParams({ region: undefined });
  }, [regionParam]);
  const visible = region
    ? GUIDE_CATEGORIES.filter((c) => c.region === region)
    : ISLAND_CATEGORIES;
  const chosen = visible.find((c) => c.slug === slug) ?? visible[0];

  const hasRegions = REGIONS_WITH_CONTENT.length > 0;
  // The tab it was opened from: Explore's book button or Profile's Open Guide.
  // Opened cold, Profile, where its hero is.
  const back = () => (router.canGoBack() ? router.back() : router.navigate("/(app)/(tabs)/account"));
  // The article page's back: pops to the list it was opened from; opened cold, the list.
  const backToGuideList = () =>
    router.canGoBack() ? router.back() : router.navigate("/(app)/(tabs)/guide");
  const regionLabel = REGION_TABS.find((r) => r.id === region)?.label ?? "South Island";

  return (
    <View style={[styles.container, phoneArticle && { paddingTop: insets.top }]}>
      {wide || phoneArticle ? null : <TopBar title="Guide" leading={<TopBarBack onPress={back} label="Back" />} />}
      {/* The scopes are a tab strip on the white page under the bar, the same as
          Explore's categories: "South Island" plus each region with sections written. */}
      {!wide && !phoneArticle && hasRegions ? (
        <TopBarTabs<RegionId | null>
          tone="page"
          tabs={[
            { key: null, label: "South Island" },
            ...REGION_TABS.map((r) => ({ key: r.id, label: r.label })),
          ]}
          selected={region}
          onSelect={setRegion}
        />
      ) : null}

      <View style={styles.row}>
        {phoneArticle ? null : (
        <View testID="guide-list-pane" style={wide ? [styles.side, { paddingTop: wideTop(insets.top, insets.top) }] : styles.flex1}>
          {wide ? (
            <View style={styles.head}>
              <View style={styles.backRow}>
                <Pressable
                  onPress={back}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  hitSlop={12}
                  style={({ pressed }) => [styles.back, pressed && styles.pressed]}
                >
                  <ChevronLeft size={26} color={tokens.colors.text} strokeWidth={2.25} />
                </Pressable>
                <AppText style={styles.heading} accessibilityRole="header">
                  Guide
                </AppText>
              </View>
              {hasRegions ? (
                <TouchableOpacity
                  testID="region-pill"
                  style={styles.pill}
                  activeOpacity={0.7}
                  onPress={() => setPicking(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Region, ${regionLabel}`}
                >
                  <AppText style={styles.pillText} numberOfLines={2}>
                    {regionLabel}
                  </AppText>
                  <ChevronDown size={18} color={tokens.colors.pillInk} strokeWidth={2.25} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          <GuideList
            categories={visible}
            selectedSlug={wide ? chosen?.slug : undefined}
            onSelect={(s) => (wide ? setSlug(s) : router.push(`/(app)/(tabs)/guide/${s}`))}
            wide={wide}
          />
        </View>
        )}
        {wide || phoneArticle ? (
          <View testID="guide-article-pane" style={phoneArticle ? styles.flex1 : styles.article}>
            {phoneArticle ? (
              <View style={styles.bar}>
                <Pressable
                  onPress={backToGuideList}
                  accessibilityRole="button"
                  accessibilityLabel="Back to the guide"
                  hitSlop={12}
                  style={({ pressed }) => [styles.back, pressed && styles.pressed]}
                >
                  <ChevronLeft size={26} color={tokens.colors.text} strokeWidth={2.25} />
                </Pressable>
              </View>
            ) : null}
            {chosen ? <GuideArticle key={chosen.slug} category={chosen} titleTop={wide ? wideTop(insets.top, insets.top + 6) : undefined} /> : null}
          </View>
        ) : null}
      </View>
      <RegionSheet visible={picking} selected={region} onSelect={setRegion} onClose={() => setPicking(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  // The white page of the design sweep's look, as the guide articles and the place page.
  container: { flex: 1, backgroundColor: tokens.colors.page },
  row: { flex: 1, flexDirection: "row" },
  flex1: { flex: 1 },
  // The trip's band, 2:3 with the section in both orientations (268/401 upright, 347/520 sideways).
  side: { flex: 2, backgroundColor: tokens.colors.band },
  article: { flex: 3 },
  head: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.md },
  bar: { height: 44, justifyContent: "center", paddingHorizontal: tokens.space.md },
  backRow: { height: 44, flexDirection: "row", alignItems: "center" },
  // The chevron's own blank edge is pulled back, so its stroke sits on the 20 pt edge.
  back: { width: 44, height: 44, justifyContent: "center", marginLeft: -8 },
  pressed: { opacity: 0.6 },
  heading: { fontSize: 22, fontWeight: "700", color: tokens.colors.text, letterSpacing: -0.3 },
  pill: {
    marginTop: 8,
    alignSelf: "flex-start",
    maxWidth: "100%",
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.pillEdge,
    backgroundColor: tokens.colors.pillFill,
  },
  pillText: { flexShrink: 1, fontSize: 17, fontWeight: "600", color: tokens.colors.pillInk },
});
