// components/account/OfflineMapCard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ActivityIndicator } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { CheckCircle2 } from "lucide-react-native";

import { AppButton } from "@/lib/uiKit";
import { useOfflineMap } from "@/lib/hooks/useOfflineMap";
import { OFFLINE_MAP_ABOUT_MB } from "@/lib/offlineMap";
import { tokens } from "@/lib/ui/tokens";

// The map saved for no signal (docs/plans/offline-map.md): LINZ topo maps on the phone, which
// the map tab draws when there's no signal. The credit is here and over the map while it
// shows, as CC BY 4.0 asks.
export function OfflineMapCard() {
  const { saved, progress, error, save, stop, remove } = useOfflineMap();
  const netInfo = useNetInfo();
  // A card over the screen while it saves (owner, 2026-11-11: the row's percentage alone
  // wasn't clear). Closing it doesn't stop the save; the row keeps the count.
  const [showing, setShowing] = useState(false);
  const pct = progress?.total ? Math.floor((progress.done / progress.total) * 100) : 0;

  const begin = () => {
    setShowing(true);
    void save();
  };

  // On mobile data, ask first: it's a big download for someone's data plan.
  const startSave = () => {
    if (netInfo.type !== "cellular") return begin();
    Alert.alert("Not on Wi-Fi", `Saving the map uses about ${OFFLINE_MAP_ABOUT_MB} MB of data.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Save anyway", onPress: begin },
    ]);
  };

  const askRemove = () =>
    Alert.alert("Remove the saved map?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void remove() },
    ]);

  const [title, line, button, onPress]: [string, string, string, () => void] = saved
    ? ["Map saved for no signal", "Shows on the map when there's no signal. Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence.", "Remove", askRemove]
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

  const close = () => setShowing(false);

  return (
    <>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.line}>{line}</Text>
        <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.6} accessibilityRole="button">
          <Text style={styles.buttonText}>{button}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showing} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            {saved ? (
              <>
                <CheckCircle2 size={40} color={tokens.colors.accent} strokeWidth={2} />
                <Text style={styles.cardTitle}>Map saved</Text>
                <Text style={styles.cardLine}>It shows on the map when there's no signal.</Text>
                <AppButton variant="primary" fullWidth onPress={close}>
                  Done
                </AppButton>
              </>
            ) : error === "no-signal" ? (
              <>
                <Text style={styles.cardTitle}>Needs signal to save</Text>
                <Text style={styles.cardLine}>Try again when you have Wi-Fi.</Text>
                <AppButton variant="primary" fullWidth onPress={close}>
                  Close
                </AppButton>
              </>
            ) : error === "stopped" ? (
              <>
                <Text style={styles.cardTitle}>Map partly saved ({pct}%)</Text>
                <Text style={styles.cardLine}>Carry on when you have Wi-Fi.</Text>
                <AppButton variant="primary" fullWidth onPress={startSave}>
                  Carry on
                </AppButton>
                <AppButton variant="ghost" fullWidth onPress={close}>
                  Close
                </AppButton>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color={tokens.colors.accent} />
                <Text style={styles.cardTitle}>Saving the map… {pct}%</Text>
                <View
                  style={styles.track}
                  accessible
                  accessibilityLabel="Saving the map"
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: 100, now: pct }}
                >
                  <View style={[styles.fill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.cardLine}>Keep the app open until it's done. It keeps saving if you close this.</Text>
                <AppButton variant="secondary" fullWidth onPress={close}>
                  Close
                </AppButton>
                <AppButton variant="ghost" fullWidth onPress={stop}>
                  Stop
                </AppButton>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

// As the Account tab's other rows (Show me around), with the button under the words: the
// button's words are too long to sit beside them on a small phone. The card is
// DeleteTripModal's.
const styles = StyleSheet.create({
  row: { paddingHorizontal: tokens.space.md, paddingTop: 14, gap: 4 },
  title: { fontSize: 15, fontWeight: "600", color: tokens.colors.text, letterSpacing: -0.1 },
  line: { fontSize: 13, color: tokens.colors.textMuted, lineHeight: 18 },
  // Its own 44pt of height, so it's an easy tap without a box drawn round it.
  button: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  buttonText: { fontSize: 14, fontWeight: "700", color: tokens.colors.accent, letterSpacing: 0.2 },
  overlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.60)", justifyContent: "center", padding: tokens.space.lg },
  card: { backgroundColor: tokens.colors.bgCard, borderRadius: tokens.radius.lg, padding: 28, alignItems: "center", gap: 12 },
  cardTitle: { fontSize: 20, fontWeight: "700", color: tokens.colors.text, letterSpacing: -0.3, textAlign: "center" },
  cardLine: { fontSize: 14, color: tokens.colors.text2, lineHeight: 21, textAlign: "center", marginBottom: 8 },
  track: { alignSelf: "stretch", height: 8, borderRadius: 4, backgroundColor: tokens.colors.border, overflow: "hidden" },
  fill: { height: 8, backgroundColor: tokens.colors.accent },
});
