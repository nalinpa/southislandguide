import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { ErrorCard } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { GUIDE_CATEGORIES } from "@/lib/guideContent";
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
  // The browser draws the article page on a phone and the split on the open Duo, in one
  // tree, so folding keeps the article's scroll. A slug that is gone is the not-found page.
  if (GUIDE_CATEGORIES.some((c) => c.slug === slug)) {
    return <GuideBrowser key={String(slug)} initialSlug={String(slug)} articleMode />;
  }
  return <GuideNotFound key={String(slug)} />;
}

function GuideNotFound() {
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.page },
  notFound: { flex: 1, justifyContent: "center", padding: tokens.space.md },
});
