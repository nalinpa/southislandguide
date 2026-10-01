// ponytail: stub. v1 ships no in-app purchase, so nothing here talks to
// StoreKit and requestBuy is a no-op. Deliberately mirrors rotorua-guide's
// PurchaseContextValue so the ported itinerary/site screens compile unchanged
// — their purchase branches are unreachable while useEntitlementGate reports
// everyone as entitled.
//
// To switch commerce on: install expo-iap, replace this file and
// lib/hooks/useEntitlementGate.ts with rotorua-guide's real versions, mount
// PurchaseProvider in lib/providers/AppProviders.tsx, and set
// storefront.appleAppStore on the app's registry doc.

type PurchaseContextValue = {
  connected: boolean;
  requestBuy: (productId: string) => void;
  purchasingProductId: string | null;
  pendingProductId: string | null;
  error: { productId: string; message: string } | null;
  restore: () => Promise<{ restored: number; mismatch: boolean; failed: number }>;
};

const STUB: PurchaseContextValue = {
  connected: false,
  requestBuy: () => {},
  purchasingProductId: null,
  pendingProductId: null,
  error: null,
  restore: async () => ({ restored: 0, mismatch: false, failed: 0 }),
};

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function usePurchaseContext(): PurchaseContextValue {
  return STUB;
}
