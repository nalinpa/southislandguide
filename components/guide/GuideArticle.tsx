import { Fragment } from "react";
import { ScrollView, StyleSheet, Linking } from "react-native";

import { AppText } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import type { GuideCategory } from "@/lib/guideContent";

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

type GuideArticleProps = {
  category: GuideCategory;
  /** Space above the title: 6 under the phone's back row; on the Duo it also clears the status bar. */
  titleTop?: number;
};

// A section's title and words, scrolling together: the phone's article page, and the Duo's
// right side.
export function GuideArticle({ category, titleTop = 6 }: GuideArticleProps) {
  return (
    <ScrollView
      style={styles.readingArea}
      contentContainerStyle={[styles.content, { paddingTop: titleTop }]}
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
  );
}

const styles = StyleSheet.create({
  readingArea: { flex: 1, backgroundColor: tokens.colors.page },
  content: { paddingHorizontal: tokens.space.md, paddingBottom: 40, gap: 16 },
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
