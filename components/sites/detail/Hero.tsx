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
  /** The photographer the photo's licence asks to be named. Not shown over a category's photo. */
  imageCredit?: string | null;
};

export function Hero({ imageUrl, imageThumbnailUrl, category, imageCredit }: HeroProps) {
  const ownPhoto = imageUrl ?? imageThumbnailUrl;
  const source = siteImage(ownPhoto, category, "full");
  const credit = ownPhoto ? imageCredit?.trim() : undefined;
  return (
    <View style={styles.container}>
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
      {credit ? (
        <Text style={styles.credit} numberOfLines={1}>
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
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  // Bottom right, clear of the 32pt the white sheet laps over the photo
  // (app/(app)/(tabs)/sites/[siteId]/index.tsx), and on the darker end of the fade. The
  // shadow keeps it readable over a bright sky or snow.
  credit: {
    position: "absolute",
    right: tokens.space.sm,
    bottom: 32 + tokens.space.xs,
    maxWidth: "70%",
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
