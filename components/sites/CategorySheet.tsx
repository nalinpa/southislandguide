import { LayoutGrid } from "lucide-react-native";

import { PickSheet } from "@/components/layout/PickSheet";
import { CATEGORY_CONFIG } from "@/components/map/SiteMarker";
import { lifted, tokens } from "@/lib/ui/tokens";
import type { SiteCategory } from "@/lib/models";

type CategorySheetProps = {
  visible: boolean;
  /** All (key null) first, then the town's categories. */
  categories: { key: SiteCategory | null; label: string }[];
  selected: SiteCategory | null;
  onSelect: (category: SiteCategory | null) => void;
  onClose: () => void;
};

// Explore's category picker on the open Duo, where the phone's tab strip becomes a pop-up:
// each row has its map pin's icon and colour, All the grid in the secondary text colour.
export function CategorySheet({ categories, ...rest }: CategorySheetProps) {
  const rows = categories.map((c) => {
    const pin = c.key ? CATEGORY_CONFIG[c.key] : null;
    return {
      ...c,
      icon: pin ? (
        <pin.Icon size={20} color={lifted(pin.color)} strokeWidth={2} />
      ) : (
        <LayoutGrid size={20} color={tokens.colors.text2} strokeWidth={2} />
      ),
    };
  });
  return <PickSheet testID="category-sheet" rows={rows} {...rest} />;
}
