import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";

import { tokens } from "@/lib/ui/tokens";

export type AreaOption = { id: string; label: string; count: number };

type AreaMenuProps = {
  visible: boolean;
  options: AreaOption[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

// The menu behind Explore's title: the towns that have places, each with how many, the
// one being shown ticked. Built like the trip screen's "..." menu (a card under the bar,
// closed by tapping anywhere else), on the left because the title is.
export function AreaMenu({ visible, options, selected, onSelect, onClose }: AreaMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity testID="area-menu-backdrop" style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <SafeAreaView edges={["top"]} style={styles.safeArea} pointerEvents="box-none">
          <View style={styles.card}>
            {options.map((option, index) => {
              const active = option.id === selected;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.row, index > 0 && styles.rowDivider]}
                  activeOpacity={0.6}
                  onPress={() => onSelect(option.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${option.label}, ${option.count} ${option.count === 1 ? "place" : "places"}`}
                >
                  <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
                  <Text style={styles.count}>{option.count}</Text>
                  {/* Always there, so the counts line up; only the chosen town's shows. */}
                  <Check size={18} strokeWidth={2.5} color={active ? tokens.colors.highlight : "transparent"} />
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.3)" },
  // paddingTop approximates the top bar's title row (8 + 44, see TopBar), so the menu
  // lands directly under the title rather than needing a measured anchor.
  safeArea: { alignItems: "flex-start", paddingTop: 60, paddingLeft: tokens.space.md },
  card: {
    minWidth: 240,
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingVertical: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.colors.border },
  label: { flex: 1, fontSize: 16, fontWeight: "600", color: tokens.colors.text },
  // "You are here", so the chosen town takes the highlight.
  labelActive: { fontWeight: "700", color: tokens.colors.highlight },
  count: { fontSize: 14, fontWeight: "600", color: tokens.colors.text2 },
});
