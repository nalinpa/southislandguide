import { REGIONS_WITH_CONTENT } from "@/lib/guideContent";
import { FIRST_REGION } from "@/lib/areas";

// The regions with sections written, the default town's first (Queenstown & Wānaka), as in
// Explore's town list; the rest in the guide's order. The phone's tab strip and the Duo's
// region picker both list them in this order.
export const REGION_TABS = [
  ...REGIONS_WITH_CONTENT.filter((r) => r.id === FIRST_REGION),
  ...REGIONS_WITH_CONTENT.filter((r) => r.id !== FIRST_REGION),
];
