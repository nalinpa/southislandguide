import { View, Text, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";

import { tokens } from "@/lib/ui/tokens";

export type TripView = "trip" | "days";

const LABELS: Record<TripView, string> = { trip: "Trip", days: "Days" };

// The swap between a trip's two views: every day on one page (Trip), or one day's
// timeline (Days). It is the brand bar's top row, beside the trip menu, in both views.
//
// A filled pill, not the underlined tabs the bar uses elsewhere: the day tabs sit right
// under it in Days, and the two rows have to read as different kinds of control. The
// chosen half takes the highlight's on-dark twin, this app's "you are here" on the teal.
export function TripViewSwitch({
  view,
  onChange,
  style,
}: {
  view: TripView;
  onChange: (view: TripView) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.track, style]}>
      {(["trip", "days"] as const).map((key) => {
        const active = key === view;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.half, active && styles.halfActive]}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{LABELS[key]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  half: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 9 },
  halfActive: { backgroundColor: tokens.colors.highlightOnDark },
  label: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  labelActive: { color: tokens.colors.text },
});
