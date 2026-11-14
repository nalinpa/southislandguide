// components/sites/FeaturedCard.tsx
import { ListItem } from "@/components/sites/list/ListItem";
import type { Site } from "@/lib/models";

type FeaturedCardProps = {
  site: Site;
  distanceMeters?: number | null;
  onPress: (id: string) => void;
};

// The card at the top of Explore's list, for the place the town (or the category tab)
// features most. Since the design sweep it is the list's own card with a taller photo and
// nothing else different: one card shape per list (docs/plans/design-sweep.md; owner,
// 2026-11-13). No "Featured" label: the photo and the name say enough (owner, 2026-10-25).
export function FeaturedCard({ site, distanceMeters, onPress }: FeaturedCardProps) {
  return (
    <ListItem
      featured
      id={site.id}
      name={site.name}
      description={site.description}
      distanceMeters={distanceMeters}
      imageUrl={site.imageUrl}
      category={site.category[0]}
      onPress={onPress}
      index={0}
    />
  );
}
