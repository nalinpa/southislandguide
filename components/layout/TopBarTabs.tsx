import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, type ScrollViewInstance } from "react-native";

import { AppText } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";

type TopBarTabsProps<K extends string | null> = {
  tabs: { key: K; label: string }[];
  selected: K;
  onSelect: (key: K) => void;
  /**
   * "page" for a strip on the white page under the bar (the design sweep's look): idle in
   * one grey, the selected one teal with a line under the word. Left out, the strip is for
   * the bottom of the dark bar, as it always was.
   */
  tone?: "bar" | "page";
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
export function TopBarTabs<K extends string | null>({ tabs, selected, onSelect, tone = "bar" }: TopBarTabsProps<K>) {
  const onPage = tone === "page";
  const scroller = useRef<ScrollViewInstance>(null);
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
      style={[styles.strip, onPage && styles.stripPage]}
      contentContainerStyle={[styles.content, onPage && styles.contentPage]}
      onLayout={(e) => setStripWidth(e.nativeEvent.layout.width)}
      onContentSizeChange={(width) => setContentWidth(width)}
    >
      {tabs.map((tab) => {
        const active = tab.key === selected;
        return (
          <TouchableOpacity
            key={String(tab.key)}
            style={onPage ? styles.tabPage : styles.tab}
            onPress={() => onSelect(tab.key)}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              spans.current.set(String(tab.key), { x, width });
              if (active) setLaidOut((n) => n + 1);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <AppText
              style={
                onPage ? [styles.textPage, active && styles.textPageActive] : [styles.text, active && styles.textActive]
              }
            >
              {tab.label}
            </AppText>
            <View
              style={
                onPage
                  ? [styles.indicatorPage, active && styles.indicatorPageActive]
                  : [styles.indicator, active && styles.indicatorActive]
              }
            />
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
  // On the page. The line sits just under the word, not on the strip's bottom edge, and
  // only the selected tab has one: the same mark as the tab bar at the foot of the screen.
  stripPage: {
    backgroundColor: tokens.colors.page,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  contentPage: { gap: 22 },
  // 46pt tall, so the words keep a tap target near the 48pt minimum.
  tabPage: { height: 46, justifyContent: "center", alignItems: "center" },
  textPage: { fontSize: 15, fontWeight: "500", color: tokens.colors.textMuted },
  textPageActive: { color: tokens.colors.selected, fontWeight: "600" },
  indicatorPage: { marginTop: 3, height: 2, width: "100%", backgroundColor: "transparent" },
  indicatorPageActive: { backgroundColor: tokens.colors.selected },
});
