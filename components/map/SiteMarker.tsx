import React from "react";
import { View, StyleSheet } from "react-native";
import {
  Utensils,
  Camera,
  Landmark,
  Footprints,
  Waves,
  MountainSnow,
  Bird,
  Zap,
  BedDouble,
  MapPin,
  Check,
} from "lucide-react-native";
import { tokens } from "@/lib/ui/tokens";
import type { SiteCategory } from "@/lib/models";

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

// Keyed by category **id**, never the display label — rotorua-guide keyed it by
// label once and every marker for a renamed category silently fell back to
// `other`. The Record type forces an entry for every SiteCategory, so adding a
// category to lib/models.ts is a compile error here until it has a marker.
//
// Seven colours and icons come from the design palette. Attractions and
// Culture weren't in it and were chosen by measurement. All 11 colours (these
// ten plus the accent teal #095C65, which marks selection) were checked:
//   - icon on the white marker circle: lowest is Nature at 3.84:1, clearing the
//     3:1 needed for a small graphic
//   - pairwise CIE76 dE: weakest pair is Stay vs other at 20.2, still distinct
// Stay is darkened from the palette's #8A6448: that one had the same lightness
// as `other` and was the least separable pair. Re-run the check if you change
// any of these rather than eyeballing it.
export const CATEGORY_CONFIG: Record<SiteCategory | "other", { Icon: IconComponent; color: string }> = {
  Food: { Icon: Utensils, color: "#D23A2E" },
  Attractions: { Icon: Camera, color: "#A0369A" },
  Culture: { Icon: Landmark, color: "#7C2D12" },
  Walks: { Icon: Footprints, color: "#2F8A3C" },
  Water: { Icon: Waves, color: "#2466D6" },
  Scenic: { Icon: MountainSnow, color: "#8A5CE6" },
  Nature: { Icon: Bird, color: "#B57412" },
  Adventure: { Icon: Zap, color: "#CC2F86" },
  Stay: { Icon: BedDouble, color: "#5E4331" },
  other: { Icon: MapPin, color: "#6E6A64" },
};

const CANVAS_SIZE = 40;
const CIRCLE_SIZE = 34;

export const SiteMarker = React.memo(function SiteMarker({
  selected,
  completed = false,
  category = "other",
}: {
  selected: boolean;
  completed?: boolean;
  category?: SiteCategory | "other";
}) {
  const { Icon, color } = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other;

  return (
    <View style={styles.container}>
      <View style={[styles.circle, { borderColor: color }, selected && styles.selected]}>
        <Icon size={17} color={color} strokeWidth={2} />
      </View>
      {completed && (
        <View style={styles.badge}>
          <Check size={10} color="#FFFFFF" strokeWidth={3} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    alignItems: "center",
    justifyContent: "center",
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  selected: {
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 6,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: tokens.colors.success,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
