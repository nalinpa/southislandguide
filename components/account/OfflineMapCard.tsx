// components/account/OfflineMapCard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";

import { useOfflineMap } from "@/lib/hooks/useOfflineMap";
import { OFFLINE_MAP_ABOUT_MB } from "@/lib/offlineMap";
import { tokens } from "@/lib/ui/tokens";

// The map saved for no signal (docs/plans/offline-map.md): LINZ topo maps on the phone, which
// the map tab draws when there's no signal. The credit is here and over the map while it
// shows, as CC BY 4.0 asks.
export function OfflineMapCard() {
  const { saved, progress, error, save, stop, remove } = useOfflineMap();
  const netInfo = useNetInfo();
  const pct = progress?.total ? Math.floor((progress.done / progress.total) * 100) : 0;

  // On mobile data, ask first: it's a big download for someone's data plan.
  const startSave = () => {
    if (netInfo.type !== "cellular") {
      void save();
      return;
    }
    Alert.alert("Not on Wi-Fi", `Saving the map uses about ${OFFLINE_MAP_ABOUT_MB} MB of data.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Save anyway", onPress: () => void save() },
    ]);
  };

  const askRemove = () =>
    Alert.alert("Remove the saved map?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void remove() },
    ]);

  const [title, line, button, onPress]: [string, string, string, () => void] = saved
    ? ["Map saved for no signal", "Shows on the map when there's no signal. Map: LINZ, CC BY 4.0.", "Remove", askRemove]
    : error === "no-signal"
      ? ["Map for no signal", "Needs signal to save.", "Save map for no signal", startSave]
      : error === "stopped"
        ? [`Map partly saved (${pct}%)`, "Carry on when you have Wi-Fi.", "Carry on", startSave]
        : progress
          ? [`Saving the map… ${pct}%`, "Keep the app open until it's done.", "Stop", stop]
          : [
              "Map for no signal",
              `About ${OFFLINE_MAP_ABOUT_MB} MB. Roads, towns and tracks across New Zealand, for when there's no signal.`,
              "Save map for no signal",
              startSave,
            ];

  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.line}>{line}</Text>
      <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.6} accessibilityRole="button">
        <Text style={styles.buttonText}>{button}</Text>
      </TouchableOpacity>
    </View>
  );
}

// As the Account tab's other rows (Show me around), with the button under the words: the
// button's words are too long to sit beside them on a small phone.
const styles = StyleSheet.create({
  row: { paddingHorizontal: tokens.space.md, paddingTop: 14, gap: 4 },
  title: { fontSize: 15, fontWeight: "600", color: tokens.colors.text, letterSpacing: -0.1 },
  line: { fontSize: 13, color: tokens.colors.textMuted, lineHeight: 18 },
  // Its own 44pt of height, so it's an easy tap without a box drawn round it.
  button: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  buttonText: { fontSize: 14, fontWeight: "700", color: tokens.colors.accent, letterSpacing: 0.2 },
});
