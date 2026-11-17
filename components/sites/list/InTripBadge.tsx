import { StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";

import { tokens } from "@/lib/ui/tokens";

// "In trip": white on the success fill (9.81:1 light, 5.05:1 dark). On a card's photo
// (ListItem) and on a compact row's meta line (PlaceRow).
export function InTripBadge({ style }: { style?: object }) {
  return (
    <View testID="in-trip-badge" style={[styles.box, style]}>
      <Check size={12} color="#FFFFFF" strokeWidth={3} />
      <Text style={styles.text}>In trip</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-start",
    backgroundColor: tokens.colors.success,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  text: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
});
