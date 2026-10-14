import { View, Text, StyleSheet } from "react-native";
import { Car } from "lucide-react-native";

import { tokens } from "@/lib/ui/tokens";
import { PLANNER } from "@/lib/constants/gameplay";
import { slotIndexToTimeLabel, slotsToDurationLabel } from "@/lib/utils/itineraryPhysics";

type DriveBlockProps = {
  fromLabel: string;
  toLabel: string;
  startSlot: number;
  slots: number;
};

// The drive between two areas, drawn on the day timeline in the time it takes up.
// The planner places it; the user can't add, move or edit it. So it is flat and
// neutral where a place is a raised teal card with a grip, it has no handlers, and
// its edge is solid: a dashed edge on this screen means "tap to add".
//
// Sits at the same left and right as the shared TimelineBlock, with no zIndex, so a
// place being dragged (zIndex 10) passes over it.
export function DriveBlock({ fromLabel, toLabel, startSlot, slots }: DriveBlockProps) {
  const time = slotIndexToTimeLabel(startSlot);
  const duration = slotsToDurationLabel(slots);

  return (
    <View
      testID="drive-block"
      accessible
      accessibilityLabel={`Drive from ${fromLabel} to ${toLabel}, about ${duration.toLowerCase()}, leaving ${time}`}
      style={[styles.container, { top: startSlot * PLANNER.SLOT_HEIGHT, height: slots * PLANNER.SLOT_HEIGHT }]}
    >
      <View style={styles.inner}>
        <Car color={tokens.colors.textMuted} size={18} />
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            Drive to {toLabel}
          </Text>
          {slots > 1 ? (
            <Text style={styles.detail} numberOfLines={1}>
              {fromLabel} to {toLabel}
            </Text>
          ) : null}
          <Text style={styles.detail} numberOfLines={1}>
            {time} · About {duration}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", left: 82, right: tokens.space.md, paddingVertical: 2 },
  // Text sits at the top, beside the time the drive starts: a long drive is taller
  // than the screen, and centred text would be off it.
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurface,
    overflow: "hidden",
  },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", color: tokens.colors.text },
  detail: { fontSize: 12, fontWeight: "600", color: tokens.colors.text2, marginTop: 2 },
});
