import { useRef } from "react";
import { View, Pressable, StyleSheet, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { AppText, ErrorCard } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { GUIDE_CATEGORIES } from "@/lib/guideContent";

// Back goes to the guide list explicitly. This is a tab screen, and the Tabs
// navigator's default back behaviour returns to the FIRST tab (Explore), not to
// the screen you came from.
const backToGuideList = () => router.navigate("/(app)/(tabs)/guide");

// This route lives under (tabs) so the tab bar shows, which makes it a TAB
// screen: React Navigation keeps one instance and only swaps the `slug` param.
// Keyed by slug so each article gets a fresh instance — otherwise the previous
// article's scroll position and collapsed-header state (`scrollY`) carry over,
// the same bug fixed on the place detail page.
export default function GuideCategoryRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <GuideCategoryPage key={String(slug)} slug={String(slug)} />;
}

function GuideCategoryPage({ slug }: { slug: string }) {
  const category = GUIDE_CATEGORIES.find((c) => c.slug === slug);

  // Hooks before the not-found early return, so they run the same way on every
  // render (they used to sit after it — a rules-of-hooks violation that the key
  // above also happens to make harmless).
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroContentOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const heroContentHeight = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [48, 0],
    extrapolate: "clamp",
  });
  const heroContentMarginBottom = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [tokens.space.sm, 0],
    extrapolate: "clamp",
  });
  const heroPaddingBottom = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [tokens.space.lg, tokens.space.sm],
    extrapolate: "clamp",
  });

  if (!category) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
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

  const Icon = category.icon;

  return (
    // The safe area takes the hero's colour so the strip under the status bar
    // continues the coloured header instead of showing as a band above it; the
    // reading area gets its own white background on the ScrollView below.
    <SafeAreaView style={[styles.safeArea, { backgroundColor: category.color }]} edges={["top"]}>
      <Animated.View
        style={[
          styles.hero,
          { backgroundColor: category.color, paddingBottom: heroPaddingBottom },
        ]}
      >
        <Animated.View
          style={[
            styles.heroContent,
            { opacity: heroContentOpacity, height: heroContentHeight, marginBottom: heroContentMarginBottom },
          ]}
        >
          {Icon && (
            <View style={styles.heroIconWrap}>
              <Icon size={28} color="#FFFFFF" strokeWidth={2} />
            </View>
          )}
          <AppText variant="h1" style={styles.title} numberOfLines={2}>
            {category.title}
          </AppText>
        </Animated.View>

        <Pressable
          onPress={backToGuideList}
          accessibilityRole="button"
          accessibilityLabel="Back to the guide"
          style={styles.backBtn}
          hitSlop={6}
        >
          <ChevronLeft size={18} color={tokens.colors.text} strokeWidth={2.5} />
          <AppText style={styles.backBtnText}>Guide</AppText>
        </Pressable>
      </Animated.View>

      <Animated.ScrollView
        style={styles.readingArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
      >
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
              {paragraph}
            </AppText>
          );
        })}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Near-white bgCard rather than the mint bgBase: long-form reading is easier
  // on a near-white ground (text 15.60:1 here vs 13.18:1 on bgBase). Same
  // choice as the place detail page.
  safeArea: { flex: 1, backgroundColor: tokens.colors.bgCard },
  readingArea: { flex: 1, backgroundColor: tokens.colors.bgCard },
  notFound: { flex: 1, justifyContent: "center", padding: tokens.space.md },
  hero: {
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.lg,
  },
  heroContent: { flexDirection: "row", alignItems: "center", gap: tokens.space.sm, overflow: "hidden" },
  // Solid white pill with a dark label. Was a full-width strip of 16% white
  // with only a white chevron, which barely read as a button on the coloured
  // header. Label in the dark text colour rather than the section colour: one
  // section colour (#8A5CE6) is below 4.5:1 as small text on white.
  backBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 99,
    backgroundColor: "#FFFFFF",
  },
  backBtnText: { fontSize: 14, fontWeight: "700", color: tokens.colors.text },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  title: { flex: 1, fontSize: 26, color: "#FFFFFF" },
  content: { paddingHorizontal: tokens.space.md, paddingTop: 24, paddingBottom: 40, gap: 16 },
  // 16/25 to match the place description.
  paragraph: { fontSize: 16, lineHeight: 25, color: tokens.colors.text },
  // Extra space above each subheading (on top of the 16px gap) so sections
  // read as separate blocks instead of running on from the previous paragraph.
  subheading: { marginTop: tokens.space.sm },
});
