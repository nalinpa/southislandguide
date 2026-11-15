// components/account/DangerZoneCard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Trash2, AlertTriangle } from "lucide-react-native";

import { useSession } from "@/lib/providers/SessionProvider";
import { auth } from "@/lib/firebase";
import { userService } from "@/lib/services/userService";
import { tokens } from "@/lib/ui/tokens";
import { useWideSheet } from "@/lib/ui/useWideSheet";

// Deletion runs server-side via userService.deleteAccount(): the api deletes
// the user's trips, saved places and reviews, revokes the Sign in with Apple
// grant, then deletes the account (App Store guideline 5.1.1(v)). The
// currentUser check below just stops a signed-out tap from calling the api.

export function DangerZoneCard() {
  const { disableGuest } = useSession();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const wide = useWideSheet("dialog");
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setIsDeleting(true);
    setError(null);

    try {
      await userService.deleteAccount();
      await disableGuest();
      router.replace("/(auth)/login");
    } catch {
      setError("Couldn't delete your account. Please try again.");
      setShowConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>

        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Trash2 size={18} color={tokens.colors.danger} strokeWidth={2} />
          </View>

          <View style={styles.textWrap}>
            <Text style={styles.title}>Delete Account</Text>
            <Text style={styles.description}>
              Permanently delete your account, trips, saved places and reviews. This cannot be undone.
            </Text>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.deleteBtn, isDeleting && styles.deleteBtnDisabled]}
              onPress={() => setShowConfirm(true)}
              disabled={isDeleting}
              activeOpacity={0.6}
            >
              <Text style={styles.deleteBtnText}>{isDeleting ? "Deleting…" : "Delete Account"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={showConfirm} transparent animationType={wide?.animation ?? "fade"}>
        <SafeAreaView edges={["left", "right"]} style={[styles.modalOverlay, wide?.overlay]}>
          <View style={[styles.modalCard, wide?.card]}>
            <View style={styles.modalIconWrap}>
              <AlertTriangle size={28} color={tokens.colors.danger} strokeWidth={2} />
            </View>

            <Text style={styles.modalTitle}>Are you absolutely sure?</Text>
            <Text style={styles.modalBody}>Your trips, saved places and reviews will be permanently deleted.</Text>

            <TouchableOpacity
              style={[styles.confirmBtn, isDeleting && styles.deleteBtnDisabled]}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmBtnText}>{isDeleting ? "Deleting…" : "Delete Everything"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowConfirm(false)}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Wait, keep my account</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: tokens.space.md, paddingTop: 14, paddingBottom: 16 },
  // A section's name: small and grey, as written, a step under the rows it heads, with the
  // same gap under it in every group (design sweep, Profile round 3).
  sectionLabel: { fontSize: 13, fontWeight: "600", color: tokens.colors.textMuted, marginBottom: 12 },
  row: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: tokens.colors.dangerDim,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 16, fontWeight: "500", color: tokens.colors.text, marginBottom: 2 },
  description: { fontSize: 14, color: tokens.colors.text2, lineHeight: 20, marginBottom: 12 },
  errorText: { fontSize: 13, color: tokens.colors.danger, marginBottom: 10, lineHeight: 18 },
  // The only red on the screen: red means "this deletes things".
  deleteBtn: {
    alignSelf: "flex-start",
    height: 44,
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: tokens.colors.danger,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  deleteBtnDisabled: { opacity: 0.4 },
  deleteBtnText: { fontSize: 15, fontWeight: "600", color: tokens.colors.danger },
  modalOverlay: { flex: 1, backgroundColor: tokens.colors.dim, justifyContent: "center", padding: tokens.space.lg },
  modalCard: { backgroundColor: tokens.colors.page, borderRadius: 20, padding: 24, alignItems: "center" },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.dangerDim,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: tokens.colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: "center",
  },
  modalBody: { fontSize: 14, color: tokens.colors.text2, lineHeight: 22, textAlign: "center", marginBottom: 28 },
  confirmBtn: {
    width: "100%",
    backgroundColor: tokens.colors.dangerFill,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.1 },
  cancelBtn: { width: "100%", paddingVertical: 13, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "500", color: tokens.colors.text2 },
});
