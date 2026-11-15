import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, X } from "lucide-react-native";
import { useWide } from "@blacksands/ui";

import { tokens } from "@/lib/ui/tokens";
import { useWideSheet } from "@/lib/ui/useWideSheet";
import type { RegionId } from "@/lib/guideContent";
import { REGION_TABS } from "@/lib/guideRegions";

type RegionSheetProps = {
  visible: boolean;
  /** null = island-wide ("South Island"). */
  selected: RegionId | null;
  onSelect: (region: RegionId | null) => void;
  onClose: () => void;
};

// The guide's region picker on the open Duo, where the phone's tab strip becomes a pop-up:
// the sheets' centred card, with South Island first and each region that has sections.
// Wide only: a phone has the tabs, so folding closes it.
export function RegionSheet({ visible, selected, onSelect, onClose }: RegionSheetProps) {
  const wide = useWideSheet("list");
  const isWide = useWide();
  const rows: { id: RegionId | null; label: string }[] = [
    { id: null, label: "South Island" },
    ...REGION_TABS.map((r) => ({ id: r.id, label: r.label })),
  ];
  return (
    <Modal visible={visible && isWide} transparent animationType={wide?.animation ?? "fade"} onRequestClose={onClose}>
      <SafeAreaView edges={["left", "right"]} style={[styles.overlay, wide?.overlay]}>
        <TouchableOpacity testID="region-sheet-backdrop" style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View testID="region-sheet" style={[styles.sheet, wide?.card]}>
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
              const active = row.id === selected;
              return (
                <TouchableOpacity
                  key={row.id ?? "all"}
                  style={[styles.row, i > 0 && styles.rowLine]}
                  activeOpacity={0.6}
                  onPress={() => {
                    onSelect(row.id);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={row.label}
                >
                  <Text style={[styles.label, active && styles.labelActive]}>{row.label}</Text>
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
  rowLine: { borderTopWidth: 1, borderTopColor: tokens.colors.line },
  label: { flex: 1, fontSize: 16, fontWeight: "500", color: tokens.colors.text },
  labelActive: { fontWeight: "600", color: tokens.colors.highlight },
});
