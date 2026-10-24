// components/sites/FeaturedCard.tsx
import { View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AppText } from "@/lib/uiKit";
import { cardLift, tokens } from "@/lib/ui/tokens";
import { siteImage } from "@/lib/categoryImages";
import type { Site } from "@/lib/models";

type FeaturedCardProps = {
  site: Site;
  onPress: (id: string) => void;
};

// The big photo card at the top of Explore's list, for the town's featured place: ported
// from rotorua-guide's (app/(app)/(tabs)/sites/index.tsx). The full-size photo, since the
// card is the width of the screen, or the category's default when the place has none.
export function FeaturedCard({ site, onPress }: FeaturedCardProps) {
  const source = siteImage(site.imageUrl, site.category[0], "full");
  return (
    // The shadow sits on a view of its own: with overflow "hidden" beside it, iOS clips it.
    <View style={styles.shadow}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => onPress(site.id)}
        accessibilityRole="button"
        accessibilityLabel={`Featured: ${site.name}`}
      >
        {source && <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />}
        <LinearGradient colors={["transparent", `${tokens.colors.scrim}E6`]} locations={[0.3, 1]} style={styles.overlay}>
          <AppText style={styles.badge}>Featured</AppText>
          <AppText style={styles.title}>{site.name}</AppText>
          {site.description ? (
            <AppText style={styles.description} numberOfLines={2}>
              {site.description}
            </AppText>
          ) : null}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { ...cardLift, borderRadius: tokens.radius.lg },
  card: {
    height: 220,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
    backgroundColor: tokens.colors.accent,
  },
  overlay: { flex: 1, justifyContent: "flex-end", padding: tokens.space.md },
  // The one warm colour, for the one thing on the screen picked out.
  badge: {
    alignSelf: "flex-start",
    backgroundColor: tokens.colors.highlight,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: tokens.space.xs,
  },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginBottom: 4 },
  description: { color: "rgba(255,255,255,0.88)", fontSize: 14, lineHeight: 20 },
});
