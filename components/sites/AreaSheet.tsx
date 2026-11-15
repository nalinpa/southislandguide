import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, useColorScheme } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { tokens } from "@/lib/ui/tokens";
import { useWideSheet } from "@/lib/ui/useWideSheet";
import { REGIONS, REGION_LABELS, type RegionId } from "@/lib/guideContent";
import { FIRST_REGION } from "@/lib/areas";

/** A town Explore can show: its area id ("" for places with none), name, how many places, and its region. */
export type AreaOption = { id: string; label: string; count: number; region?: string };

type AreaSheetProps = {
  visible: boolean;
  options: AreaOption[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

// The guide's order, with the default town's region moved to the top: the town Explore
// opens on is then the first one listed.
const REGION_ORDER: string[] = [FIRST_REGION, ...REGIONS.map((r) => r.id).filter((id) => id !== FIRST_REGION)];

function regionTitle(region: string | undefined): string {
  if (region === undefined) return "Elsewhere";
  return REGION_LABELS[region as RegionId] ?? region.replace(/-/g, " ").replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

// Towns under their region, in REGION_ORDER (the guide's, lib/guideContent.ts), then any
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
  const wide = useWideSheet("list");
  // The page colour as a plain string: a gradient can't take a pair().
  const page = useColorScheme() === "dark" ? "#06191B" : "#FFFFFF";
  return (
    <Modal visible={visible} transparent animationType={wide?.animation ?? "slide"} onRequestClose={onClose}>
      <SafeAreaView edges={["left", "right"]} style={[styles.overlay, wide?.overlay]}>
        <TouchableOpacity testID="area-sheet-backdrop" style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View testID="area-sheet" style={[styles.sheet, { paddingBottom: insets.bottom + tokens.space.sm }, wide?.card]}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose a town</Text>
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
          <ScrollView showsVerticalScrollIndicator={false}>
            {sections(options).map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  {section.title}
                </Text>
                {section.towns.map((town, i) => {
                  const active = town.id === selected;
                  return (
                    <TouchableOpacity
                      key={town.id}
                      style={[styles.row, i > 0 && styles.rowLine]}
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
          {/* Wide only: the list is cut through a row, so a fade at the foot says it scrolls. */}
          {wide ? (
            <LinearGradient
              testID="area-sheet-fade"
              pointerEvents="none"
              colors={[page + "00", page]}
              style={styles.fade}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// In the design sweep's look for a sheet (docs/plans/design-sweep.md): the white page,
// 20pt top corners, the teal dim behind, the close button an x in a pale circle.
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: tokens.colors.dim, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "80%",
    backgroundColor: tokens.colors.page,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: tokens.space.md,
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.space.md,
    marginBottom: tokens.space.sm,
  },
  title: { fontSize: 20, fontWeight: "700", letterSpacing: -0.2, color: tokens.colors.text },
  closeChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { paddingHorizontal: tokens.space.md },
  // A band across the sheet, so a region reads as a heading over its towns and not one
  // more town to tap (owner, 2026-10-30). The pale band and small grey name of a group on
  // Profile, as written: it was a mint band with the name in teal capitals.
  sectionTitle: {
    marginHorizontal: -tokens.space.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 7,
    backgroundColor: tokens.colors.band,
    fontSize: 13,
    fontWeight: "600",
    color: tokens.colors.textMuted,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  // A hairline between towns in a region, none after the last: the next region's band follows.
  rowLine: { borderTopWidth: 1, borderTopColor: tokens.colors.line },
  label: { flex: 1, fontSize: 16, fontWeight: "500", color: tokens.colors.text },
  // The chosen town is the highlight, with a tick to match: teal, as a chosen tab is,
  // was tried and was less clear in a long list (owner, 2026-11-13).
  labelActive: { fontWeight: "600", color: tokens.colors.highlight },
  count: { fontSize: 15, color: tokens.colors.textMuted },
});
