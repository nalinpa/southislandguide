// components/sites/list/ListView.tsx
import { useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, type RefreshControlProps } from "react-native";
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

const ItemSeparator = () => <View style={styles.separator} />;

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
        />
      );
      return index === 0 && firstRowTarget ? <View {...firstRowTarget}>{row}</View> : row;
    },
    [onPressItem, firstRowTarget],
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
      contentContainerStyle={styles.listContent}
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
  separator: { height: 24 },
});
