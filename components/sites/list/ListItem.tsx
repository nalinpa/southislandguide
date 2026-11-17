// components/sites/list/ListItem.tsx
import { View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { ChevronRight, Image as ImageIcon, Navigation } from "lucide-react-native";
import { MotiView } from "moti";
import { formatDistanceMeters } from "@blacksands/hooks";
import { useHalves } from "@blacksands/ui";

import { AppText, Row } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { siteImage } from "@/lib/categoryImages";
import { firstSentence } from "@/lib/utils/firstSentence";
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
  /** The place's full-size photo: the card's photo is the width of the screen. */
  imageUrl?: string | null;
  /** Primary category — its default image is shown when imageUrl is empty. */
  category?: SiteCategory | null;
  /** The town's name, for a list that spans towns. Explore names its one town in the bar. */
  area?: string | null;
  /** The card at the top of Explore: the same card with a taller photo, nothing else (owner, 2026-11-13). */
  featured?: boolean;
  /** The open Duo (Explore, design-sweep.md "Explore, picked: round 6"): a 190 photo upright,
   *  130 in two columns sideways, the name one step up, and the featured card like the rest. */
  wide?: boolean;
  onPress: (id: string) => void;
  index: number;
};

// A place in a list, in the design sweep's look (docs/plans/design-sweep.md): the photo
// first, with the words under it on the page. No card behind them, no shadow.
export function ListItem({
  id,
  name,
  description,
  distanceMeters,
  imageUrl,
  category,
  area,
  featured,
  wide,
  onPress,
  index,
}: ListItemProps) {
  const { upright } = useHalves();
  const source = siteImage(imageUrl, category, "full", id);
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      // ponytail: cast. Moti 0.30's transition type can't be met under Reanimated 4.7 /
      // RN 0.88 types (an index signature swallows `type`); it runs the same. Drop the cast
      // when Moti's types catch up.
      transition={{ type: "timing", duration: 250, delay: Math.min(index * 50, 300) } as never}
    >
      <TouchableOpacity
        testID={featured ? "featured-card" : undefined}
        activeOpacity={0.7}
        onPress={() => onPress(id)}
        accessibilityRole="button"
        // As the featured card always announced itself: by the place's name.
        accessibilityLabel={featured ? name : undefined}
        style={styles.card}
      >
        <View
          testID="list-photo"
          style={[styles.photo, featured && styles.photoFeatured, wide && { height: upright ? 190 : 130 }]}
        >
          {source ? (
            <Image testID={featured ? "featured-photo" : undefined} source={source} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <ImageIcon size={28} color={tokens.colors.borderStrong} />
            </View>
          )}
        </View>

        <AppText variant="h3" numberOfLines={2} style={[styles.name, wide && styles.nameWide]}>
          {name}
        </AppText>
        {description ? (
          <AppText variant="body" numberOfLines={3} style={styles.description}>
            {firstSentence(description)}
          </AppText>
        ) : null}
        {/* Facts, so plain text: colour is for what's selected and what to tap. */}
        <View style={styles.footerRow}>
          <Row gap="xxs" align="center">
            {area ? <AppText style={styles.area}>{area}</AppText> : null}
            {area && distanceMeters != null ? <AppText style={styles.area}> · </AppText> : null}
            {distanceMeters != null && (
              <>
                <Navigation size={12} color={tokens.colors.text} fill={tokens.colors.text} />
                <AppText style={styles.distance}>{formatDistanceMeters(distanceMeters)}</AppText>
              </>
            )}
          </Row>
          {/* Says the card opens: the whole card is the button, this is its sign, in the
              highlight as what to tap is (owner, 2026-11-13). */}
          <View style={styles.details}>
            <AppText style={styles.detailsText}>Details</AppText>
            <ChevronRight size={16} color={tokens.colors.highlight} strokeWidth={2.5} />
          </View>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  // The page's own colour, not see-through: Saved Places swipes this row aside over its
  // Remove button.
  card: { backgroundColor: tokens.colors.page },
  // The hairline keeps a pale sky from melting into the white page.
  photo: {
    height: 160,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.photoEdge,
  },
  photoFeatured: { height: 204 },
  // The size, not just the edges: React Native gives a bundled image (a default photo) its
  // file's own size, which wins over the edges alone and showed only the photo's top-left
  // corner (owner, 2026-10-31).
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  name: { marginTop: 10, color: tokens.colors.text },
  nameWide: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
  description: { marginTop: 3, color: tokens.colors.text2 },
  footerRow: { marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  details: { flexDirection: "row", alignItems: "center", gap: 1 },
  detailsText: { fontSize: 15, fontWeight: "600", color: tokens.colors.highlight },
  distance: { fontSize: 15, fontWeight: "600", color: tokens.colors.text, marginLeft: 4 },
  area: { fontSize: 15, fontWeight: "600", color: tokens.colors.text2 },
});
