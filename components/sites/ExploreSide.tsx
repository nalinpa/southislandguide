import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Bookmark, BookOpen, ChevronDown, Search, X } from "lucide-react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/lib/ui/tokens";
import { useTourTarget } from "@/lib/tour/useTourTarget";
import { wideTop } from "@/lib/ui/wideTop";

/** The band's width on the open Duo; the tour card is placed beside it. */
export const EXPLORE_SIDE = 200;
const TOWN_MAX = 26;
const TOWN_MIN = 18;

type ExploreSideProps = {
  town: string;
  onPickTown?: () => void;
  onGuide: () => void;
  onSearch: () => void;
  onSaved: () => void;
  /** Shows the search button as a close button while the field is open. */
  searchOpen?: boolean;
  categories: { key: string | null; label: string }[];
  selected: string | null;
  onSelect: (key: string | null) => void;
};

// Explore's left side on the open Duo (docs/plans/design-sweep.md, "Explore, picked: round
// 6"): the town and its picker, the guide, search and saved buttons, and the categories.
// It replaces the phone's teal bar and tab strip.
export function ExploreSide({
  town,
  onPickTown,
  onGuide,
  onSearch,
  onSaved,
  searchOpen,
  categories,
  selected,
  onSelect,
}: ExploreSideProps) {
  const townTarget = useTourTarget("town");
  const guideTarget = useTourTarget("guide");
  const browseTarget = useTourTarget("browse");
  const insets = useSafeAreaInsets();
  const ink = tokens.colors.townInk;

  // iOS splits a single long word across two lines rather than shrink it, because two broken
  // lines "fit". So measure the lines and step the size down, 1 pt at a time, until the name
  // is whole words on at most two lines with the chevron on the last of them.
  const [size, setSize] = useState(TOWN_MAX);
  useEffect(() => setSize(TOWN_MAX), [town]);
  const onTextLayout = (e: { nativeEvent: { lines: { text: string }[] } }) => {
    const lines = e.nativeEvent.lines.map((l) => l.text.replace(/￼/g, "").trim());
    const whole = lines.join(" ") === town.trim() && lines.every(Boolean);
    if ((!whole || lines.length > 2) && size > TOWN_MIN) setSize(size - 1);
  };

  // The chevron is a child of the name's own Text, so it follows the last word as the
  // name wraps or shrinks.
  // A name with a slash ("Aoraki / Mount Cook") breaks after it, and may run to 8 from the
  // strip's edge instead of 20.
  const name = (
    <Text
      numberOfLines={2}
      onTextLayout={onTextLayout}
      style={[styles.town, { fontSize: size }, town.includes(" / ") && styles.townSlash]}
      accessibilityRole={onPickTown ? undefined : "header"}
    >
      {town.replace(" / ", " /\n")}
      {onPickTown ? (
        <View testID="town-chevron" style={styles.chevron}>
          <ChevronDown size={22} color={ink} strokeWidth={2.5} />
        </View>
      ) : null}
    </Text>
  );

  return (
    // The status bar's inset above, as the phone's bar takes it; the band runs up under the clock.
    <View testID="explore-side" style={[styles.side, { paddingTop: wideTop(insets.top, 16 + insets.top) }]}>
      {onPickTown ? (
        <TouchableOpacity
          {...townTarget}
          activeOpacity={0.7}
          onPress={onPickTown}
          accessibilityRole="button"
          accessibilityLabel={`${town}, choose a town`}
          
        >
          {name}
        </TouchableOpacity>
      ) : (
        <View {...townTarget}>
          {name}
        </View>
      )}

      <View style={styles.icons}>
        <View {...guideTarget} style={styles.icon}>
          <TouchableOpacity onPress={onGuide} accessibilityRole="button" accessibilityLabel="Travel guide" style={styles.tap}>
            <BookOpen size={22} color={ink} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={onSearch}
          accessibilityRole="button"
          accessibilityLabel={searchOpen ? "Close search" : "Search places"}
          style={styles.tap}
        >
          {searchOpen ? <X size={22} color={ink} /> : <Search size={22} color={ink} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={onSaved} accessibilityRole="button" accessibilityLabel="Saved places" style={styles.tap}>
          <Bookmark size={22} color={ink} />
        </TouchableOpacity>
      </View>

      {categories.length > 1 && (
        <View {...browseTarget} style={styles.categories}>
          {categories.map((c) => {
            const on = c.key === selected;
            return (
              <TouchableOpacity
                key={String(c.key)}
                onPress={() => onSelect(c.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={styles.category}
              >
                {/* The fill reaches 12 into the margin, so the label keeps the town's edge. */}
                <View style={[styles.fill, on && styles.fillOn]} />
                <Text style={[styles.label, on && styles.labelOn]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  side: { width: EXPLORE_SIDE, backgroundColor: tokens.colors.band, paddingHorizontal: 20, paddingTop: 16 },
  town: { fontSize: 26, fontWeight: "800", color: tokens.colors.townInk, flexShrink: 1 },
  townSlash: { marginRight: -12 },
  chevron: { marginLeft: 2, marginBottom: -3 },
  // The first icon's edge on the town's: the glyph is centred in a 44 tap, so 11 sits out.
  icons: { flexDirection: "row", gap: 4, marginTop: 8, marginLeft: -11 },
  icon: {},
  tap: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  categories: { marginTop: 16 },
  category: { height: 40, justifyContent: "center" },
  fill: { position: "absolute", top: 0, bottom: 0, left: -12, right: -12, borderRadius: 10 },
  fillOn: { backgroundColor: tokens.colors.selFillSoft },
  label: { fontSize: 16, fontWeight: "500", color: tokens.colors.text2 },
  labelOn: { fontWeight: "600", color: tokens.colors.selected },
});
