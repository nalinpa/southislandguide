// components/sites/list/ListView.tsx
import { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";

import { ListItem } from "@/components/sites/list/ListItem";
import { tokens } from "@/lib/ui/tokens";
import type { SortedRow } from "@blacksands/hooks";
import type { SiteCategory } from "@/lib/models";

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
};

export function ListView({ rows, header, onPressItem, ListEmptyComponent }: ListViewProps) {
  const renderItem = useCallback(
    ({ item, index }: { item: ListRow; index: number }) => (
      <ListItem
        id={item.location.id}
        name={item.location.name}
        description={item.location.description}
        imageUrl={item.location.imageThumbnailUrl ?? item.location.imageUrl}
        category={item.location.category[0]}
        distanceMeters={item.distanceMeters}
        onPress={onPressItem}
        index={index}
      />
    ),
    [onPressItem],
  );

  return (
    <FlashList
      data={rows}
      keyExtractor={(item) => item.location.id}
      renderItem={renderItem}
      ItemSeparatorComponent={ItemSeparator}
      ListHeaderComponent={header ?? null}
      ListEmptyComponent={ListEmptyComponent ?? null}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: tokens.space.md,
    paddingBottom: 100,
  },
  separator: { height: tokens.space.md },
});
