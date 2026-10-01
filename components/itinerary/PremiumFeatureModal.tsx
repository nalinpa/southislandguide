import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { X, Sparkles } from "lucide-react-native";

import { CardShell, AppButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { PURCHASE_CHECK_MESSAGE, PURCHASE_CHECK_TITLE } from "@/lib/constants/commerce";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import { usePurchaseContext } from "@/lib/iap/PurchaseProvider";
import { PurchasePendingBanner } from "@/components/purchase/PurchasePendingBanner";

type PremiumFeatureModalProps = {
  visible: boolean;
  onClose: () => void;
  onBuy: () => void;
  title?: string;
  message?: string;
  // Entitlements are `unknown`: this user may already own the unlock, so ask for a re-check
  // instead of a second purchase.
  unverified?: boolean;
  onRetry?: () => void;
};

export function PremiumFeatureModal({
  visible,
  onClose,
  onBuy,
  title = "Rearranging is a Premium feature",
  message = "Unlock the full guide to drag and reorder your day exactly how you want it.",
  unverified = false,
  onRetry,
}: PremiumFeatureModalProps) {
  // The Unlock button used to close this modal and then buy. Two things hid every outcome:
// StoreKit shows no sheet at all when the Apple ID already owns the product — it just
// redelivers the existing transaction — and the register call for a transaction bound to
// another app account comes back 403, whose message only sites/[siteId] ever rendered.
// So the modal closed and nothing else was ever seen. It now stays up and shows the
// purchase state itself; the owner retires it when the entitlement lands.
  // Read the purchase state here rather than making every caller plumb it through.
  const { purchasingProductId, pendingProductId, error: purchaseError } = usePurchaseContext();
  const busy = purchasingProductId === FULL_GUIDE_PRODUCT_ID || pendingProductId === FULL_GUIDE_PRODUCT_ID;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.wrapper}>
          <CardShell status="basic" style={styles.card}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color={tokens.colors.text2} size={22} />
            </TouchableOpacity>
            <Sparkles color={tokens.colors.accent} size={28} style={styles.icon} />
            <Text style={styles.title}>{unverified ? PURCHASE_CHECK_TITLE : title}</Text>
            <Text style={styles.message}>{unverified ? PURCHASE_CHECK_MESSAGE : message}</Text>
            {purchaseError?.productId === FULL_GUIDE_PRODUCT_ID && (
              <Text style={styles.error}>{purchaseError.message}</Text>
            )}
            {busy ? (
              <PurchasePendingBanner />
            ) : (
              <AppButton variant="primary" onPress={unverified ? onRetry : onBuy} fullWidth>
                {unverified ? "Try Again" : "Unlock Trip Planning"}
              </AppButton>
            )}
          </CardShell>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.75)", justifyContent: "flex-end" },
  wrapper: { margin: tokens.space.md, marginBottom: 40 },
  card: { alignItems: "center", padding: tokens.space.lg, paddingTop: tokens.space.xl },
  closeButton: { position: "absolute", top: 12, right: 12, padding: 6 },
  icon: { marginBottom: tokens.space.sm },
  title: { fontSize: 18, fontWeight: "800", color: tokens.colors.text, textAlign: "center", marginBottom: tokens.space.xs },
  error: { fontSize: 13, color: tokens.colors.danger, textAlign: "center", marginBottom: tokens.space.md },
  message: { fontSize: 14, color: tokens.colors.text2, textAlign: "center", marginBottom: tokens.space.lg },
});
