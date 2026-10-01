// v1 ships with no paid unlock. These exist so the ported itinerary screens
// compile unchanged against rotorua-guide's shape — when commerce lands,
// replace the stub in lib/hooks/useEntitlementGate.ts with the real hook and
// these become live.
export const FULL_GUIDE_PRODUCT_ID = "full_guide_unlock";

export const PURCHASE_CHECK_TITLE = "Can't check your purchases";
export const PURCHASE_CHECK_MESSAGE =
  "We couldn't reach the store. If you already own the full guide, it unlocks as soon as we can check again.";
export const PURCHASE_CHECK_MESSAGE_SHORT = "Can't check your purchases right now";
