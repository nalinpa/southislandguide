// components/sites/list/ListView.tsx
import { useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, type RefreshControlProps } from "react-native";
import { useHalves, useWide } from "@blacksands/ui";
import { FlashList, type FlashListRef } from "@shopify/flash-list";

import { ListItem } from "@/components/sites/list/ListItem";
import { tokens } from "@/lib/ui/tokens";
import type { SortedRow } from "@blacksands/hooks";
import type { SiteCategory } from "@/lib/models";
import type { TourTarget } from "@/lib/tour/useTourTarget";

type ListRow = SortedRow<{
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  imageThumbnailUrl?: string | null;
  category: SiteCategory[];
}>;

// 24 between rows on a phone, 32 on the Duo (owner, 2026-11-16).
const ItemSeparator = () => <View testID="list-separator" style={[styles.separator, useWide() && styles.separatorWide]} />;

type ListViewProps = {
  rows: ListRow[];
  header?: React.ReactElement | null;
  onPressItem: (id: string) => void;
  ListEmptyComponent?: React.ReactElement | null;
  /** A RefreshControl for pull to refresh. Leave out to disable. */
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** The opening tour's target (useTourTarget), on the first row only. */
  firstRowTarget?: TourTarget;
  /** Jumps to the top when it turns true: the tour points at the first place, which a
   *  scrolled list has moved off the screen (owner, 2026-11-13). */
  atTop?: boolean;
};

export function ListView({ rows, header, onPressItem, ListEmptyComponent, refreshControl, firstRowTarget, atTop }: ListViewProps) {
  const list = useRef<FlashListRef<ListRow>>(null);
  useEffect(() => {
    if (atTop) list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [atTop]);

  // The open Duo: one column upright, two sideways with a 24 gutter, 20 on the sides.
  const wide = useWide();
  const { upright } = useHalves();
  const columns = wide && !upright ? 2 : 1;

  const renderItem = useCallback(
    ({ item, index }: { item: ListRow; index: number }) => {
      const row = (
        <ListItem
          id={item.location.id}
          name={item.location.name}
          description={item.location.description}
          // The full-size photo: the card's photo is the width of the screen, and the
          // thumbnail (400px) was made for a 96pt square.
          imageUrl={item.location.imageUrl ?? item.location.imageThumbnailUrl}
          category={item.location.category[0]}
          distanceMeters={item.distanceMeters}
          onPress={onPressItem}
          index={index}
          wide={wide}
        />
      );
      const target = index === 0 && firstRowTarget ? <View {...firstRowTarget}>{row}</View> : row;
      return columns === 2 ? <View testID="list-gutter" style={styles.gutter}>{target}</View> : target;
    },
    [onPressItem, firstRowTarget, wide, columns],
  );

  return (
    <FlashList
      ref={list}
      data={rows}
      keyExtractor={(item) => item.location.id}
      renderItem={renderItem}
      ItemSeparatorComponent={ItemSeparator}
      ListHeaderComponent={header ?? null}
      ListEmptyComponent={ListEmptyComponent ?? null}
      refreshControl={refreshControl}
      numColumns={columns}
      contentContainerStyle={wide ? (columns === 2 ? styles.contentTwo : styles.contentOne) : styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.md,
    paddingBottom: 100,
  },
  // 12 each side of a card in a column, so the gutter is 24 and the edges stay 20.
  gutter: { paddingHorizontal: 12 },
  contentOne: { paddingHorizontal: 20, paddingTop: tokens.space.md, paddingBottom: 100 },
  contentTwo: { paddingHorizontal: 8, paddingTop: tokens.space.md, paddingBottom: 100 },
  separator: { height: 24 },
  separatorWide: { height: 32 },
});
