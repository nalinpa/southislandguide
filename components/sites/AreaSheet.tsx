import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, X } from "lucide-react-native";

import { tokens } from "@/lib/ui/tokens";
import { REGIONS, REGION_LABELS, type RegionId } from "@/lib/guideContent";

/** A town Explore can show: its area id ("" for places with none), name, how many places, and its region. */
export type AreaOption = { id: string; label: string; count: number; region?: string };

type AreaSheetProps = {
  visible: boolean;
  options: AreaOption[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

const REGION_ORDER: string[] = REGIONS.map((r) => r.id);

function regionTitle(region: string | undefined): string {
  if (region === undefined) return "Elsewhere";
  return REGION_LABELS[region as RegionId] ?? region.replace(/-/g, " ").replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

// Towns under their region, in the guide's region order (lib/guideContent.ts), then any
// region the guide doesn't list, then the towns with no region ("Elsewhere"). Towns keep
// the order they were given in.
function sections(options: AreaOption[]) {
  const rank = (region: string | undefined) =>
    region === undefined ? Infinity : REGION_ORDER.includes(region) ? REGION_ORDER.indexOf(region) : REGION_ORDER.length;
  const groups = new Map<string | undefined, AreaOption[]>();
  for (const option of options) groups.set(option.region, [...(groups.get(option.region) ?? []), option]);
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || regionTitle(a).localeCompare(regionTitle(b)))
    .map(([region, towns]) => ({ title: regionTitle(region), towns }));
}

// The sheet behind Explore's title: every town that has places, with how many, grouped
// under its region so a whole island of towns stays easy to scan. It slides up from the
// bottom, like Add to Trip, within thumb reach and with room to scroll on a small phone.
export function AreaSheet({ visible, options, selected, onSelect, onClose }: AreaSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity testID="area-sheet-backdrop" style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + tokens.space.sm }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose a town</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X color={tokens.colors.text2} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {sections(options).map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  {section.title}
                </Text>
                {section.towns.map((town) => {
                  const active = town.id === selected;
                  return (
                    <TouchableOpacity
                      key={town.id}
                      style={styles.row}
                      activeOpacity={0.6}
                      onPress={() => onSelect(town.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${town.label}, ${town.count} ${town.count === 1 ? "place" : "places"}`}
                    >
                      <Text style={[styles.label, active && styles.labelActive]}>{town.label}</Text>
                      <Text style={styles.count}>{town.count}</Text>
                      {/* Always there, so the counts line up; only the chosen town's shows. */}
                      <Check size={18} strokeWidth={2.5} color={active ? tokens.colors.highlight : "transparent"} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.6)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "80%",
    backgroundColor: tokens.colors.bgCard,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingTop: tokens.space.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.space.md,
    marginBottom: tokens.space.xs,
  },
  title: { fontSize: 20, fontWeight: "800", color: tokens.colors.text },
  section: { paddingHorizontal: tokens.space.md, paddingTop: tokens.space.sm },
  // As the field labels in Add to Trip.
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: tokens.colors.text2,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  label: { flex: 1, fontSize: 16, fontWeight: "600", color: tokens.colors.text },
  // "You are here", so the chosen town takes the highlight.
  labelActive: { fontWeight: "700", color: tokens.colors.highlight },
  count: { fontSize: 14, fontWeight: "600", color: tokens.colors.text2 },
});
