// components/sites/FeaturedCard.tsx
import { StyleSheet, TouchableOpacity, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AppText } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { siteImage } from "@/lib/categoryImages";
import type { Site } from "@/lib/models";

type FeaturedCardProps = {
  site: Site;
  onPress: (id: string) => void;
};

// The big photo at the top of Explore's list, for the place the town (or the category
// tab) features most: ported from rotorua-guide's (app/(app)/(tabs)/sites/index.tsx). Edge
// to edge, past the list's side padding, and with no "Featured" label: the photo and the
// name say enough (owner, 2026-10-25). The full-size photo, since it's the width of the
// screen, or the category's default when the place has none.
export function FeaturedCard({ site, onPress }: FeaturedCardProps) {
  const source = siteImage(site.imageUrl, site.category[0], "full", site.id);
  return (
    <TouchableOpacity
      testID="featured-card"
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onPress(site.id)}
      accessibilityRole="button"
      accessibilityLabel={site.name}
    >
      {source && <Image testID="featured-photo" source={source} style={styles.photo} resizeMode="cover" />}
      <LinearGradient colors={["transparent", `${tokens.colors.scrim}E6`]} locations={[0.3, 1]} style={styles.overlay}>
        <AppText style={styles.title}>{site.name}</AppText>
        {site.description ? (
          <AppText style={styles.description} numberOfLines={2}>
            {site.description}
          </AppText>
        ) : null}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // The list pads its content by tokens.space.md (components/sites/list/ListView.tsx).
  card: {
    height: 240,
    marginHorizontal: -tokens.space.md,
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: tokens.colors.accent,
  },
  // The size, not just the edges: React Native gives a bundled image (a default photo) its
  // file's own size, 1200x800pt, which wins over left/right/top/bottom alone. The card then
  // showed only the photo's top-left corner, about three times too big (owner, 2026-10-31).
  photo: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  overlay: { flex: 1, justifyContent: "flex-end", padding: tokens.space.md },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginBottom: 4 },
  description: { color: "rgba(255,255,255,0.88)", fontSize: 14, lineHeight: 20 },
});
