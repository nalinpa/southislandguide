import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { AppText } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";

type TopBarTabsProps<K extends string | null> = {
  tabs: { key: K; label: string }[];
  selected: K;
  onSelect: (key: K) => void;
};

type Span = { x: number; width: number };

// Where to scroll the strip to show a tab: centred, but never back past the start or on
// past the end, so a strip that fits on screen doesn't move at all.
export function tabScrollX(tab: Span, stripWidth: number, contentWidth: number): number {
  const centred = tab.x + tab.width / 2 - stripWidth / 2;
  return Math.max(0, Math.min(centred, contentWidth - stripWidth));
}

// A tab strip for the bottom of a TopBar (pass the bar flushBottom). The
// selected tab takes the highlight, which in this app marks "you are here";
// on the dark bar that means its lighter twin.
//
// The strip scrolls to show the selected tab, so one chosen elsewhere (the guide opening on
// a town's region from Explore, owner 2026-10-25) is in view rather than off the edge. It
// waits for the tabs to be laid out: their positions only exist after the first render.
export function TopBarTabs<K extends string | null>({ tabs, selected, onSelect }: TopBarTabsProps<K>) {
  const scroller = useRef<ScrollView>(null);
  const spans = useRef(new Map<string, Span>());
  const [stripWidth, setStripWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [laidOut, setLaidOut] = useState(0);

  const selectedKey = String(selected);
  useEffect(() => {
    const span = spans.current.get(selectedKey);
    if (!span || !stripWidth) return;
    scroller.current?.scrollTo({ x: tabScrollX(span, stripWidth, contentWidth), animated: true });
  }, [selectedKey, stripWidth, contentWidth, laidOut]);

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.content}
      onLayout={(e) => setStripWidth(e.nativeEvent.layout.width)}
      onContentSizeChange={(width) => setContentWidth(width)}
    >
      {tabs.map((tab) => {
        const active = tab.key === selected;
        return (
          <TouchableOpacity
            key={String(tab.key)}
            style={styles.tab}
            onPress={() => onSelect(tab.key)}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              spans.current.set(String(tab.key), { x, width });
              if (active) setLaidOut((n) => n + 1);
            }}
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
