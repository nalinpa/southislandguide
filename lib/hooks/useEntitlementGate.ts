import { useCallback } from "react";

import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import type { Site } from "@/lib/models";

// ponytail: stub. v1 has no paid unlock, so every caller is treated as entitled
// and no commerce request is made. Deliberately mirrors rotorua-guide's real
// hook signature — the itinerary and site screens are ported from there
// unmodified, and their locked branches simply never execute.
//
// To switch commerce on: set storefront.appleAppStore on the app's registry doc,
// then replace this file with rotorua-guide/lib/hooks/useEntitlementGate.ts.
// Nothing else should need to change.
export function useEntitlementGate(_uid: string | null) {
  const entitledProductIds = new Set<string>([FULL_GUIDE_PRODUCT_ID]);

  const isSiteLocked = useCallback((_site: Site) => false, []);
  const recheck = useCallback(() => {}, []);

  return { entitledProductIds, loading: false, unknown: false, recheck, isSiteLocked };
}
