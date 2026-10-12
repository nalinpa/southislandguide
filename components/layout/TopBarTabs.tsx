import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { AppText } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";

type TopBarTabsProps<K extends string | null> = {
  tabs: { key: K; label: string }[];
  selected: K;
  onSelect: (key: K) => void;
};

// A tab strip for the bottom of a TopBar (pass the bar flushBottom). The
// selected tab takes the highlight, which in this app marks "you are here";
// on the dark bar that means its lighter twin.
export function TopBarTabs<K extends string | null>({ tabs, selected, onSelect }: TopBarTabsProps<K>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.content}
    >
      {tabs.map((tab) => {
        const active = tab.key === selected;
        return (
          <TouchableOpacity
            key={String(tab.key)}
            style={styles.tab}
            onPress={() => onSelect(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <AppText style={[styles.text, active && styles.textActive]}>{tab.label}</AppText>
            <View style={[styles.indicator, active && styles.indicatorActive]} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // flexGrow 0: a horizontal ScrollView otherwise stretches to fill its parent
  // (which is how the guide's scope pills once ended up 160pt tall).
  strip: { flexGrow: 0 },
  content: { gap: 20, paddingHorizontal: tokens.space.md },
  tab: { paddingTop: 8, alignItems: "center" },
  // Full white when unselected, not the muted off-white it had: these are the
  // screen's main way around, and muted they were hard to read on the teal.
  text: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  textActive: { color: tokens.colors.highlightOnDark, fontWeight: "700" },
  // Every tab is underlined, faintly when unselected, so the words read as
  // tabs rather than a row of plain text. Flush with the bar's bottom edge
  // like a real tab strip.
  indicator: {
    marginTop: 8,
    height: 3,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.4)",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  indicatorActive: { backgroundColor: tokens.colors.highlightOnDark },
});
