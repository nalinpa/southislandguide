import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Bookmark, BookOpen, ChevronDown, Search, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CATEGORY_CONFIG } from "@/components/map/SiteMarker";
import { SITE_CATEGORY_LABELS, type SiteCategory } from "@/lib/models";
import { tokens } from "@/lib/ui/tokens";
import { wideTop } from "@/lib/ui/wideTop";
import { useTourTarget } from "@/lib/tour/useTourTarget";

/** The list's width on the open Duo, upright and sideways; the tour card sits beside it. */
export const EXPLORE_LIST = { upright: 268, sideways: 347 };

const TOWN_MAX = 26;
const TOWN_MIN = 18;
// A name with a slash is broken after it and runs wide, so it never goes below 20 (owner).
const TOWN_MIN_SLASH = 20;

/** The town's name with its picker chevron, and the tour's `town` target. The chevron is a
 *  child of the name's own Text, so it follows the last word as the name wraps or shrinks. */
export function TownTitle({ town, onPickTown }: { town: string; onPickTown?: () => void }) {
  const townTarget = useTourTarget("town");
  const ink = tokens.colors.townInk;

  // iOS splits a single long word across two lines rather than shrink it, because two broken
  // lines "fit". So measure the lines and step the size down, 1 pt at a time, until the name
  // is whole words on at most two lines with the chevron on the last of them.
  const [size, setSize] = useState(TOWN_MAX);
  useEffect(() => setSize(TOWN_MAX), [town]);
  const onTextLayout = (e: { nativeEvent: { lines: { text: string }[] } }) => {
    const lines = e.nativeEvent.lines.map((l) => l.text.replace(/￼/g, "").trim());
    const whole = lines.join(" ") === town.trim() && lines.every(Boolean);
    if ((!whole || lines.length > 2) && size > (town.includes(" / ") ? TOWN_MIN_SLASH : TOWN_MIN)) setSize(size - 1);
  };

  // A name with a slash ("Aoraki / Mount Cook") breaks after it, and may run to 8 from the
  // edge instead of 20.
  const name = (
    // No numberOfLines: iOS cuts a name that won't fit with "…" and draws the inline chevron
    // over its first letter (owner, 2026-11-16). The step-down above is the only limit, so
    // the chevron always follows the last word.
    <Text
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

  return onPickTown ? (
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
    <View {...townTarget}>{name}</View>
  );
}

type ExploreHeadProps = {
  town: string;
  onPickTown?: () => void;
  onGuide: () => void;
  onSearch: () => void;
  onSaved: () => void;
  /** Shows the search button as a close button while the field is open. */
  searchOpen?: boolean;
  /** The category the list is filtered to, or null for All. */
  category: SiteCategory | null;
  /** Opens the category pop-up. Left out when the town has one category: no pill then. */
  onOpenCategories?: () => void;
};

// Explore's head on the open Duo (docs/plans/duo-131.md, "Explore with the place"): the town,
// then the category pill with the guide, search and saved buttons. It replaces the phone's
// teal bar and tab strip.
export function ExploreHead({
  town,
  onPickTown,
  onGuide,
  onSearch,
  onSaved,
  searchOpen,
  category,
  onOpenCategories,
}: ExploreHeadProps) {
  const guideTarget = useTourTarget("guide");
  const browseTarget = useTourTarget("browse");
  const insets = useSafeAreaInsets();
  const ink = tokens.colors.townInk;
  const Icon = category ? CATEGORY_CONFIG[category].Icon : null;

  return (
    // The status bar's inset above, as the phone's bar takes it; the head runs up under the clock.
    <View testID="explore-head" style={[styles.head, { paddingTop: wideTop(insets.top, insets.top + 16) }]}>
      <TownTitle town={town} onPickTown={onPickTown} />

      <View style={styles.line}>
        {onOpenCategories ? (
          <View {...browseTarget}>
            <TouchableOpacity
              onPress={onOpenCategories}
              accessibilityRole="button"
              accessibilityLabel={`${category ? SITE_CATEGORY_LABELS[category] : "All"}, choose a category`}
              style={styles.pill}
            >
              {Icon ? <Icon size={20} color={tokens.colors.selected} strokeWidth={2} /> : <Text style={styles.pillText}>All</Text>}
              <ChevronDown size={18} color={tokens.colors.selected} strokeWidth={2.5} style={styles.pillChevron} />
            </TouchableOpacity>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.icons}>
          <View {...guideTarget}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Rows start 16 under the second line.
  head: { paddingHorizontal: 20, paddingBottom: 16 },
  town: { fontSize: 26, fontWeight: "800", color: tokens.colors.townInk, flexShrink: 1 },
  townSlash: { marginRight: -12 },
  chevron: { marginLeft: 2, marginBottom: -3 },
  line: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  pill: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 12,
    borderWidth: 1.5,
    backgroundColor: tokens.colors.catPillFill,
    borderColor: tokens.colors.catPillEdge,
  },
  pillText: { fontSize: 17, fontWeight: "600", color: tokens.colors.selected },
  pillChevron: { marginLeft: 8 },
  // The last glyph's edge on the 20 margin: it is centred in a 44 tap, so 11 sits out.
  icons: { flexDirection: "row", gap: 4, marginRight: -11 },
  tap: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
