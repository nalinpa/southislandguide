import type { ReactNode } from "react";
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, X } from "lucide-react-native";
import { useWide } from "@blacksands/ui";

import { tokens } from "@/lib/ui/tokens";
import { useWideSheet } from "@/lib/ui/useWideSheet";

export type PickRow<K> = {
  key: K;
  label: string;
  /** Drawn in a 22 pt slot before the name; its presence also sets the row at 17 pt. */
  icon?: ReactNode;
};

type PickSheetProps<K> = {
  visible: boolean;
  rows: PickRow<K>[];
  selected: K;
  onSelect: (key: K) => void;
  onClose: () => void;
  /** Names the card; the backdrop is `${testID}-backdrop`. */
  testID: string;
};

// The open Duo's picker pop-up, shared by the guide's regions and Explore's categories: the
// sheets' centred card, a close chip, no title, rows with a tick on the chosen one.
// Wide only: a phone has tabs, so folding closes it.
export function PickSheet<K extends string | null>({ visible, rows, selected, onSelect, onClose, testID }: PickSheetProps<K>) {
  const wide = useWideSheet("list");
  const isWide = useWide();
  return (
    <Modal visible={visible && isWide} transparent animationType={wide?.animation ?? "fade"} onRequestClose={onClose}>
      <SafeAreaView edges={["left", "right"]} style={[styles.overlay, wide?.overlay]}>
        <TouchableOpacity testID={`${testID}-backdrop`} style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View testID={testID} style={[styles.sheet, wide?.card]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeChip}
            >
              <X color={tokens.colors.text} size={16} strokeWidth={2.25} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {rows.map((row, i) => {
              const active = row.key === selected;
              return (
                <TouchableOpacity
                  key={row.key ?? "all"}
                  style={[styles.row, row.icon ? styles.rowIcon : null, i > 0 && styles.rowLine]}
                  activeOpacity={0.6}
                  onPress={() => {
                    onSelect(row.key);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={row.label}
                >
                  {row.icon ? <View style={styles.slot}>{row.icon}</View> : null}
                  <Text style={[styles.label, row.icon ? styles.labelIcon : null, active && styles.labelActive]}>{row.label}</Text>
                  <Check size={18} strokeWidth={2.5} color={active ? tokens.colors.highlight : "transparent"} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// AreaSheet's look: the × in a pale disc, rows with a hairline, the chosen one semibold
// in the highlight with a tick. Long names wrap to two lines.
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: tokens.colors.dim },
  sheet: { backgroundColor: tokens.colors.page, paddingTop: tokens.space.md },
  header: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: tokens.space.md, marginBottom: tokens.space.sm },
  closeChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingVertical: 8 },
  // Category rows: the icon's slot is 22 wide with 14 before the name.
  rowIcon: { gap: 14 },
  slot: { width: 22, alignItems: "center", justifyContent: "center" },
  rowLine: { borderTopWidth: 1, borderTopColor: tokens.colors.line },
  label: { flex: 1, fontSize: 16, fontWeight: "500", color: tokens.colors.text },
  labelIcon: { fontSize: 17 },
  labelActive: { fontWeight: "600", color: tokens.colors.highlight },
});
