// components/sites/list/ListView.tsx
import { useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, type RefreshControlProps } from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";

import { ListItem } from "@/components/sites/list/ListItem";
import { PlaceRow } from "@/components/sites/list/PlaceRow";
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

const ItemSeparator = () => <View testID="list-separator" style={styles.separator} />;

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
   *  scrolled list has moved off the screen (owner, 2026-11-13). Again when the rows change
   *  shape while it is true: unfolding the Duo mid-tour kept the phone list's offset, so
   *  the first compact row was off the top and the step had no cut-out (owner, 2026-11-18). */
  atTop?: boolean;
  /** Jumps to the top when it changes after the first render (Explore opened from a trip day). */
  jumpKey?: string | number;
  /** Explore beside the place on the open Duo: compact rows, one column, no gap between. */
  compact?: boolean;
  /** The compact row that is chosen. */
  selectedId?: string;
  /** The places in the person's trip, to mark. */
  tripIds?: ReadonlySet<string>;
};

export function ListView({ rows, header, onPressItem, ListEmptyComponent, refreshControl, firstRowTarget, atTop, jumpKey, compact, selectedId, tripIds }: ListViewProps) {
  const list = useRef<FlashListRef<ListRow>>(null);
  useEffect(() => {
    if (atTop) list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [atTop, compact]);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) list.current?.scrollToOffset({ offset: 0, animated: false });
    mounted.current = true;
  }, [jumpKey]);

  const renderItem = useCallback(
    ({ item, index }: { item: ListRow; index: number }) => {
      const row = compact ? (
        <PlaceRow
          id={item.location.id}
          name={item.location.name}
          // The thumbnail: the row's photo is 48 square.
          imageUrl={item.location.imageThumbnailUrl ?? item.location.imageUrl}
          category={item.location.category[0]}
          distanceMeters={item.distanceMeters}
          selected={item.location.id === selectedId}
          inTrip={tripIds?.has(item.location.id)}
          onPress={onPressItem}
        />
      ) : (
        <ListItem
          id={item.location.id}
          name={item.location.name}
          description={item.location.description}
          // The full-size photo: the card's photo is the width of the screen, and the
          // thumbnail (400px) was made for a 96pt square.
          imageUrl={item.location.imageUrl ?? item.location.imageThumbnailUrl}
          category={item.location.category[0]}
          distanceMeters={item.distanceMeters}
          inTrip={tripIds?.has(item.location.id)}
          onPress={onPressItem}
          index={index}
        />
      );
      return index === 0 && firstRowTarget ? <View {...firstRowTarget}>{row}</View> : row;
    },
    [onPressItem, firstRowTarget, compact, selectedId, tripIds],
  );

  return (
    <FlashList
      // Off here only (owner, 2026-11-18; Saved Places and reviews keep it): on an unfold it undid the tour's
      // jump to the top (the featured place joins the rows, so the list moved down one to "keep its place").
      maintainVisibleContentPosition={{ disabled: true }}
      ref={list}
      data={rows}
      keyExtractor={(item) => item.location.id}
      renderItem={renderItem}
      ItemSeparatorComponent={compact ? undefined : ItemSeparator}
      extraData={[selectedId, tripIds]}
      ListHeaderComponent={header ?? null}
      ListEmptyComponent={ListEmptyComponent ?? null}
      refreshControl={refreshControl}
      numColumns={1}
      contentContainerStyle={compact ? styles.contentCompact : styles.listContent}
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
  // 8 each side: the chosen row's fill starts there, 12 into the 20 margin.
  contentCompact: { paddingHorizontal: 8, paddingTop: 0, paddingBottom: 100 },
  separator: { height: 24 },
});
