import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { AppText, ErrorCard } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { GUIDE_CATEGORIES } from "@/lib/guideContent";
import { TopBar, TopBarBack } from "@/components/layout/TopBar";

// Back goes to the guide list explicitly. This is a tab screen, and the Tabs
// navigator's default back behaviour returns to the FIRST tab (Explore), not to
// the screen you came from.
const backToGuideList = () => router.navigate("/(app)/(tabs)/guide");

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
    <View style={styles.container}>
      {/* The same brand bar and round back arrow as the guide list. The header
          used to take each section's own colour (13 of them), carry the
          section icon, and collapse on scroll down to a white "Guide" pill;
          the section colour now lives on its icon in the guide list only. */}
      <TopBar
        title={category.title}
        compactTitle
        leading={<TopBarBack onPress={backToGuideList} label="Back to the guide" />}
      />

      <ScrollView
        style={styles.readingArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // White bgCard rather than the tinted page colour: long-form reading is
  // easier on white. Same choice as the place detail page.
  container: { flex: 1, backgroundColor: tokens.colors.bgCard },
  readingArea: { flex: 1, backgroundColor: tokens.colors.bgCard },
  notFound: { flex: 1, justifyContent: "center", padding: tokens.space.md },
  content: { paddingHorizontal: tokens.space.md, paddingTop: 24, paddingBottom: 40, gap: 16 },
  // 16/25 to match the place description.
  paragraph: { fontSize: 16, lineHeight: 25, color: tokens.colors.text },
  // Extra space above each subheading (on top of the 16px gap) so sections
  // read as separate blocks instead of running on from the previous paragraph.
  // In the highlight colour, so the article's structure shows at a glance.
  subheading: { marginTop: tokens.space.sm, color: tokens.colors.highlight },
});
