import { Fragment } from "react";
import { View, ScrollView, StyleSheet, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { AppText, ErrorCard } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { GUIDE_CATEGORIES } from "@/lib/guideContent";

// Back pops the tab history (app/(app)/(tabs)/_layout.tsx) to the guide list this was
// opened from. Not router.navigate to the list: that would move the list after this
// article in the history, and the list's own back button would come back here.
// Opened cold, from a link, the list.
const backToGuideList = () =>
  router.canGoBack() ? router.back() : router.navigate("/(app)/(tabs)/guide");

// A web address written in the guide's text ("journeys.nzta.govt.nz"), found by its ending.
// Written bare, with no https://, so that is added when it is opened.
const WEB_ADDRESS = /\b(?:[a-z0-9-]+\.)+(?:govt\.nz|org\.nz|co\.nz|nz|com)(?:\/[A-Za-z0-9/_-]*)?/g;

// A paragraph with its web addresses as links, in the highlight: they are something to tap
// (owner, 2026-11-13). Everything else is the paragraph's own text.
export function withLinks(text: string) {
  const parts: (string | { address: string })[] = [];
  let from = 0;
  for (const m of text.matchAll(WEB_ADDRESS)) {
    parts.push(text.slice(from, m.index), { address: m[0] });
    from = m.index + m[0].length;
  }
  parts.push(text.slice(from));
  return parts.map((part, i) =>
    typeof part === "string" ? (
      <Fragment key={i}>{part}</Fragment>
    ) : (
      <AppText
        key={i}
        style={styles.link}
        accessibilityRole="link"
        onPress={() => void Linking.openURL(`https://${part.address}`).catch(() => {})}
      >
        {part.address}
      </AppText>
    ),
  );
}

// This route lives under (tabs) so the tab bar shows, which makes it a TAB
// screen: React Navigation keeps one instance and only swaps the `slug` param.
// Keyed by slug so each article gets a fresh instance — otherwise the previous
// article's scroll position carries over, the same bug fixed on the place
// detail page.
export default function GuideCategoryRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
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

      <ScrollView
        style={styles.readingArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="h1" style={styles.title} accessibilityRole="header">
          {category.title}
        </AppText>
        {category.body.split("\n\n").map((paragraph, index) => {
          // A standalone line with no sentence-ending punctuation (unlike every
          // real paragraph here) is a subheading, e.g. "Renting a car", "Parking".
          const isHeading = !/[.!?]$/.test(paragraph.trim());
          return (
            <AppText
              key={index}
              variant={isHeading ? "sectionTitle" : "body"}
              style={isHeading ? styles.subheading : styles.paragraph}
            >
              {isHeading ? paragraph : withLinks(paragraph)}
            </AppText>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.page },
  readingArea: { flex: 1, backgroundColor: tokens.colors.page },
  notFound: { flex: 1, justifyContent: "center", padding: tokens.space.md },
  bar: { height: 44, justifyContent: "center", paddingHorizontal: tokens.space.md },
  // The chevron's own blank edge is pulled back, so its stroke sits on the text's left edge.
  back: { width: 44, height: 44, justifyContent: "center", marginLeft: -8 },
  pressed: { opacity: 0.6 },
  content: { paddingHorizontal: tokens.space.md, paddingTop: 6, paddingBottom: 40, gap: 16 },
  title: { fontSize: 26, lineHeight: 31, fontWeight: "700", letterSpacing: -0.4, color: tokens.colors.text, marginBottom: 4 },
  // 16/25 to match the place description.
  paragraph: { fontSize: 16, lineHeight: 25, color: tokens.colors.text },
  link: { fontSize: 16, lineHeight: 25, fontWeight: "500", color: tokens.colors.highlight },
  // Space above each subheading (on top of the 16 gap) so sections read as separate
  // blocks, and less under it, so it belongs to the words it heads. Dark, not the
  // highlight it was: orange is kept for what to tap.
  subheading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: tokens.colors.text,
    marginTop: 20,
    marginBottom: -8,
  },
});
