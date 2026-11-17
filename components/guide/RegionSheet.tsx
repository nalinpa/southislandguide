import { PickSheet } from "@/components/layout/PickSheet";
import type { RegionId } from "@/lib/guideContent";
import { REGION_TABS } from "@/lib/guideRegions";

type RegionSheetProps = {
  visible: boolean;
  /** null = island-wide ("South Island"). */
  selected: RegionId | null;
  onSelect: (region: RegionId | null) => void;
  onClose: () => void;
};

const ROWS = [
  { key: null, label: "South Island" },
  ...REGION_TABS.map((r) => ({ key: r.id as RegionId | null, label: r.label })),
];

// The guide's region picker on the open Duo, where the phone's tab strip becomes a pop-up:
// South Island first, then each region that has sections.
export function RegionSheet({ visible, selected, onSelect, onClose }: RegionSheetProps) {
  return <PickSheet testID="region-sheet" visible={visible} rows={ROWS} selected={selected} onSelect={onSelect} onClose={onClose} />;
}
