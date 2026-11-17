import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { AppText } from "@/lib/uiKit";
import { lifted, pair, tokens, towardWhite } from "@/lib/ui/tokens";
import type { GuideCategory } from "@/lib/guideContent";

/** The wide guide's edge: the head's, and where the list's tiles sit. */
export const GUIDE_EDGE = 28;
/** The list pane's own pad; the row's pad makes up the rest of GUIDE_EDGE. */
export const GUIDE_LIST_PAD = 16;

type GuideListProps = {
  categories: GuideCategory[];
  /** The section on show beside the list (wide only). */
  selectedSlug?: string;
  onSelect: (slug: string) => void;
  /** The open Duo's rows: no chevrons or lines, the chosen one filled. The same tree as the phone's. */
  wide: boolean;
};

export function GuideList({ categories, selectedSlug, onSelect, wide }: GuideListProps) {
  return (
    <ScrollView contentContainerStyle={wide ? styles.listWide : styles.list}>
      {categories.map((category) => {
        const Icon = category.icon;
        const chosen = wide && category.slug === selectedSlug;
        return (
          <TouchableOpacity
            key={category.slug}
            style={[styles.row, wide && styles.rowWide, chosen && styles.rowChosen]}
            onPress={() => onSelect(category.slug)}
            activeOpacity={0.6}
            accessibilityState={wide ? { selected: chosen } : undefined}
          >
            {/* In dark, the category's colour lifted toward white, and its tint a touch stronger. */}
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: chosen ? tokens.colors.tileOnSel : pair(`${category.color}1F`, `${towardWhite(category.color)}29`) },
              ]}
            >
              <Icon size={20} color={lifted(category.color)} strokeWidth={2} />
            </View>
            <AppText style={[styles.rowTitle, chosen && styles.rowTitleChosen]} numberOfLines={wide ? 2 : undefined}>
              {category.title}
            </AppText>
            {wide ? null : <ChevronRight size={18} color={tokens.colors.textMuted} strokeWidth={2} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.xl },
  // GUIDE_LIST_PAD in, and the rows' own pad puts the tiles on GUIDE_EDGE (the head's) while the chosen fill reaches into the margin.
  listWide: { paddingHorizontal: GUIDE_LIST_PAD, paddingBottom: tokens.space.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  rowWide: {
    paddingVertical: 8,
    paddingHorizontal: GUIDE_EDGE - GUIDE_LIST_PAD,
    gap: 12,
    borderBottomWidth: 0,
    borderRadius: 12,
    marginBottom: 2,
  },
  rowChosen: { backgroundColor: tokens.colors.selFillSoft },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  rowTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: tokens.colors.text, letterSpacing: -0.1 },
  rowTitleChosen: { color: tokens.colors.selected },
});
