// components/sites/detail/Hero.tsx
import { View, Text, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ImageOff } from "lucide-react-native";

import { tokens } from "@/lib/ui/tokens";
import { siteImage } from "@/lib/categoryImages";
import type { SiteCategory } from "@/lib/models";

export const HERO_HEIGHT = 360;

type HeroProps = {
  imageUrl?: string | null;
  imageThumbnailUrl?: string | null;
  /** Primary category — its default image is shown when there's no photo. */
  category?: SiteCategory | null;
  /** The place's id, for its type's default image (lib/placeImageTypes.ts) ahead of the category's. */
  siteId?: string | null;
  /** The photographer the photo's licence asks to be named. Not shown over a default photo. */
  imageCredit?: string | null;
  /** The photo's height; the phone's is HERO_HEIGHT. */
  height?: number;
  /** The open Duo: a dark fade under the status bar, and the credit on the 20 pt margin. */
  wide?: boolean;
  /** How far the sheet laps over the photo's foot, so the credit sits clear of it. */
  lap?: number;
  /** The place pane's photo: a rounded card with the credit inside its corner. */
  card?: boolean;
};

export function Hero({ imageUrl, imageThumbnailUrl, category, siteId, imageCredit, height = HERO_HEIGHT, wide, lap = 32, card }: HeroProps) {
  const ownPhoto = imageUrl ?? imageThumbnailUrl;
  const source = siteImage(ownPhoto, category, "full", siteId);
  const credit = ownPhoto ? imageCredit?.trim() : undefined;
  return (
    <View testID="place-photo" style={[styles.container, { height }, card && styles.card]}>
      {source ? (
        <Image source={source} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <ImageOff size={40} color="rgba(255,255,255,0.7)" />
        </View>
      )}
      {/* A soft fade over the lower third only, where the white sheet meets the
          photo. It used to be a brown wash over the whole image. */}
      <LinearGradient
        colors={["transparent", "transparent", `${tokens.colors.scrim}66`]}
        locations={[0, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* 55% to clear over 120 pt, so the clock reads on a bright sky. A null slot on the
          phone, so the tree is the same on every width. */}
      {wide ? (
        <LinearGradient
          colors={[`${tokens.colors.scrim}8C`, `${tokens.colors.scrim}00`]}
          style={styles.topFade}
          pointerEvents="none"
        />
      ) : null}
      {credit ? (
        <Text
          style={[styles.credit, { bottom: card ? tokens.space.sm : lap + tokens.space.xs }, wide && { right: tokens.space.lg }]}
          numberOfLines={1}
        >
          {`Photo: ${credit}`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HERO_HEIGHT,
    width: "100%",
    backgroundColor: tokens.colors.accent,
  },
  card: { borderRadius: 20, overflow: "hidden" },
  topFade: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  // Bottom right, clear of the 32pt the white sheet laps over the photo
  // (app/(app)/(tabs)/sites/[siteId]/index.tsx), and on the darker end of the fade. The
  // shadow keeps it readable over a bright sky or snow.
  credit: {
    position: "absolute",
    right: tokens.space.sm,
    maxWidth: "70%",
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
