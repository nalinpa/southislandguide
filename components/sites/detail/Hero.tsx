// components/sites/detail/Hero.tsx
import { View, StyleSheet, Image } from "react-native";
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
};

export function Hero({ imageUrl, imageThumbnailUrl, category }: HeroProps) {
  const source = siteImage(imageUrl ?? imageThumbnailUrl, category, "full");
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
});
