import { View, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useWide } from "@blacksands/ui";
import { ChevronLeft } from "lucide-react-native";

import { ErrorCard } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { GUIDE_CATEGORIES } from "@/lib/guideContent";
import { GuideArticle } from "@/components/guide/GuideArticle";
import { GuideBrowser } from "@/components/guide/GuideBrowser";

// Back pops the tab history (app/(app)/(tabs)/_layout.tsx) to the guide list this was
// opened from. Not router.navigate to the list: that would move the list after this
// article in the history, and the list's own back button would come back here.
// Opened cold, from a link, the list.
const backToGuideList = () =>
  router.canGoBack() ? router.back() : router.navigate("/(app)/(tabs)/guide");

// This route lives under (tabs) so the tab bar shows, which makes it a TAB
// screen: React Navigation keeps one instance and only swaps the `slug` param.
// Keyed by slug so each article gets a fresh instance — otherwise the previous
// article's scroll position carries over, the same bug fixed on the place
// detail page.
export default function GuideCategoryRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  // The open Duo shows the guide's split with this section chosen (a deep link). A slug that
  // is gone keeps the phone's not-found page.
  const wide = useWide();
  if (wide && GUIDE_CATEGORIES.some((c) => c.slug === slug)) {
    return <GuideBrowser key={String(slug)} initialSlug={String(slug)} />;
  }
  return <GuideCategoryPage key={String(slug)} slug={String(slug)} />;
}

function GuideCategoryPage({ slug }: { slug: string }) {
  const category = GUIDE_CATEGORIES.find((c) => c.slug === slug);

  if (!category) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.notFound}>
          <ErrorCard
            title="Guide Not Found"
            message="This guide page doesn't exist anymore."
            action={{ label: "Go Back", onPress: backToGuideList }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    // A page for reading, in the design sweep's look (docs/plans/design-sweep.md): white
    // from the clock down, a bare back arrow on the text's left edge, and the title in the
    // page, scrolling with the words. It had the teal brand bar with the title in it. No
    // TopBar means no LightStatusBar, so the clock is dark on the white.
    <SafeAreaView style={styles.container} edges={["top"]}>
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

      <GuideArticle category={category} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.page },
  notFound: { flex: 1, justifyContent: "center", padding: tokens.space.md },
  bar: { height: 44, justifyContent: "center", paddingHorizontal: tokens.space.md },
  // The chevron's own blank edge is pulled back, so its stroke sits on the text's left edge.
  back: { width: 44, height: 44, justifyContent: "center", marginLeft: -8 },
  pressed: { opacity: 0.6 },
});
