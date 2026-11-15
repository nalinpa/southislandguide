// components/itinerary/NoteCard.tsx
import { useRef } from "react";
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StickyNote } from "lucide-react-native";

import { tokens } from "@/lib/ui/tokens";
import { useWideSheet } from "@/lib/ui/useWideSheet";
import type { ItineraryItem } from "@/lib/models";

type NoteCardProps = {
  item: ItineraryItem | null;
  onClose: () => void;
};

// Same card look as DeleteTripModal. Tap anywhere to close.
export function NoteCard({ item, onClose }: NoteCardProps) {
  // Keep showing the last item while the modal fades out, instead of blanking.
  const shown = useRef(item);
  if (item) shown.current = item;

  const wide = useWideSheet("dialog");
  return (
    <Modal visible={!!item} transparent animationType={wide?.animation ?? "fade"} onRequestClose={onClose}>
      {/* The dim covers the whole window; the card keeps clear of the sides (a Duo's rail). */}
      <SafeAreaView edges={["left", "right"]} style={styles.dim}>
        <Pressable
          style={[styles.overlay, wide?.overlay]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close note"
        >
          <View style={[styles.card, wide?.card]}>
            <View style={styles.iconWrap}>
              <StickyNote size={28} color={tokens.colors.selected} strokeWidth={2} />
            </View>
            <Text style={styles.title}>{shown.current?.siteName}</Text>
            <Text style={styles.body}>{shown.current?.note}</Text>
            <Text style={styles.hint}>Tap anywhere to close</Text>
          </View>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: tokens.colors.dim },
  overlay: { flex: 1, justifyContent: "center", padding: tokens.space.lg },
  card: { backgroundColor: tokens.colors.page, borderRadius: 20, padding: 24, alignItems: "center" },
  // The sweep's pale fill behind an icon, where the delete card has its pale red.
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.bgSurface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: tokens.colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: "center",
  },
  body: { fontSize: 16, color: tokens.colors.text, lineHeight: 24, textAlign: "center", marginBottom: 20 },
  hint: { fontSize: 13, fontWeight: "500", color: tokens.colors.textMuted },
});
