// components/sites/list/ListItem.tsx
import { View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Image as ImageIcon, Navigation } from "lucide-react-native";
import { MotiView } from "moti";
import { formatDistanceMeters } from "@blacksands/hooks";

import { AppText, Row, Stack } from "@/lib/uiKit";
import { cardLift, tokens } from "@/lib/ui/tokens";
import { siteImage } from "@/lib/categoryImages";
import type { SiteCategory } from "@/lib/models";

// GAP: no premium/locked-item indicator here -- RTR's original renders a
// "Premium" lock card in place of a locked location's row (see
// rotorua-guide's components/site/list/SiteListItem.tsx for the reference
// shape). Add your own locked-state branch here if your app sells tiered
// access.

type ListItemProps = {
  id: string;
  name: string;
  description?: string | null;
  distanceMeters?: number | null;
  imageUrl?: string | null;
  /** Primary category — its default image is shown when imageUrl is empty. */
  category?: SiteCategory | null;
  onPress: (id: string) => void;
  index: number;
};

export function ListItem({ id, name, description, distanceMeters, imageUrl, category, onPress, index }: ListItemProps) {
  const source = siteImage(imageUrl, category, "thumb");
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 250, delay: Math.min(index * 50, 300) }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(id)}
        accessibilityRole="button"
        style={styles.card}
      >
        <View style={styles.main}>
          <Stack gap="xs">
            <AppText variant="h3" numberOfLines={2}>
              {name}
            </AppText>
            {description ? (
              <AppText variant="body" numberOfLines={2} style={styles.description}>
                {description}
              </AppText>
            ) : null}
          </Stack>
          {/* The row's one live, personal fact, so it gets the highlight colour.
              Plain text and an icon rather than a Pill: a mint chip on every
              card read as decoration, and the Pill's label style is all caps. */}
          {distanceMeters != null && (
            <Row gap="xxs" align="center" style={styles.footer}>
              <Navigation size={13} color={tokens.colors.highlight} fill={tokens.colors.highlight} />
              <AppText style={styles.distance}>{formatDistanceMeters(distanceMeters)}</AppText>
            </Row>
          )}
        </View>

        <View style={styles.imageWrap}>
          {source ? (
            <Image source={source} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <ImageIcon size={28} color={tokens.colors.borderStrong} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    // No overflow: "hidden" here: on iOS it clips the view's own shadow, which
    // left the cards flat against the page. The image clips itself (imageWrap).
    ...cardLift,
  },
  main: {
    flex: 1,
    marginRight: tokens.space.sm,
    justifyContent: "space-between",
  },
  description: { color: tokens.colors.text2 },
  footer: {
    marginTop: tokens.space.sm,
  },
  distance: { fontSize: 14, fontWeight: "700", color: tokens.colors.highlight, marginLeft: 4 },
  imageWrap: {
    width: 96,
    height: 96,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    backgroundColor: tokens.colors.bgElevated,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
