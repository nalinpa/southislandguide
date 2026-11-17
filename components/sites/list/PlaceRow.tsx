// components/sites/list/PlaceRow.tsx
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image as ImageIcon } from "lucide-react-native";
import { formatDistanceMeters } from "@blacksands/hooks";

import { tokens } from "@/lib/ui/tokens";
import { siteImage } from "@/lib/categoryImages";
import { SITE_CATEGORY_LABELS, type SiteCategory } from "@/lib/models";

type PlaceRowProps = {
  id: string;
  name: string;
  /** The place's photo; the thumbnail is preferred, the row's photo is 48 square. */
  imageUrl?: string | null;
  category?: SiteCategory | null;
  distanceMeters?: number | null;
  /** The place shown beside the list. */
  selected?: boolean;
  onPress: (id: string) => void;
};

// A place as a compact row, in Explore's list beside the place on the open Duo
// (docs/plans/duo-131.md, "Row" and "Chosen row").
export function PlaceRow({ id, name, imageUrl, category, distanceMeters, selected, onPress }: PlaceRowProps) {
  const source = siteImage(imageUrl, category, "thumb", id);
  const label = category ? SITE_CATEGORY_LABELS[category] : null;
  const distance = distanceMeters != null ? formatDistanceMeters(distanceMeters) : null;
  const meta = [label, distance].filter(Boolean).join(" · ");

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(id)}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={styles.row}
    >
      {/* The fill reaches 12 into the list's margins: the list pads 8, the row's box starts there. */}
      {selected ? (
        <>
          <View testID="row-fill" style={styles.fill} />
          <View testID="row-bar" style={styles.bar} />
        </>
      ) : null}
      <View testID="row-photo" style={styles.photo}>
        {source ? (
          <Image testID="row-image" source={source} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <ImageIcon size={20} color={tokens.colors.borderStrong} />
          </View>
        )}
      </View>
      <View style={styles.words}>
        <Text numberOfLines={2} style={[styles.name, selected && styles.nameOn]}>
          {name}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 14,
    paddingRight: 6,
  },
  fill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 12,
    backgroundColor: tokens.colors.selFill,
    borderWidth: 1,
    borderColor: tokens.colors.selEdgeDark,
  },
  bar: {
    position: "absolute",
    top: 8,
    bottom: 8,
    left: 4,
    width: 4,
    borderRadius: 2,
    backgroundColor: tokens.colors.selected,
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: tokens.colors.photoEdge,
    backgroundColor: tokens.colors.bgElevated,
  },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  words: { flex: 1, marginLeft: 8 },
  name: { fontSize: 16, lineHeight: 21, fontWeight: "600", color: tokens.colors.text },
  nameOn: { color: tokens.colors.selected },
  meta: { fontSize: 15, lineHeight: 20, color: tokens.colors.text2 },
});
