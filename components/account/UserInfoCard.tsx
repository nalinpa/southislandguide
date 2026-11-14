// components/account/UserInfoCard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { LogIn } from "lucide-react-native";

import { AppButton, AppText, Row } from "@/lib/uiKit";
import { useSession } from "@/lib/providers/SessionProvider";
import { auth } from "@/lib/firebase";
import { clearLocalUserData } from "@/lib/services/userService";
import { tokens } from "@/lib/ui/tokens";

export function UserInfoCard() {
  const { session, disableGuest } = useSession();
  const isAuthed = session.status === "authed";
  const isGuest = session.status === "guest";

  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      const uid = auth.currentUser?.uid;
      await disableGuest();
      await auth.signOut();
      clearLocalUserData(uid);
      router.replace("/(auth)/login");
    } catch {
      setLogoutError("Failed to log out. Please try again.");
    }
  };

  const handleSignIn = async () => {
    await disableGuest();
    router.replace("/(auth)/login");
  };

  if (isAuthed) {
    // Which account this is: the session carries only the uid. Sign-in is email-only
    // for 1.0, so there's always an address.
    const email = auth.currentUser?.email;
    return (
      <View style={styles.section}>
        {/* Who you are is the first and largest thing on the sheet; Sign Out sits beside
            it in teal, so red is left to mean "this deletes things". */}
        <View style={styles.who}>
          <View style={styles.whoText}>
            {email ? (
              <>
                <Text style={styles.signedInAs}>Signed in as</Text>
                <Text style={styles.signedInEmail} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {email}
                </Text>
              </>
            ) : null}
          </View>
          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.6} hitSlop={10}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        {logoutError && (
          <AppText variant="label" style={[styles.errorText, { color: tokens.colors.danger }]}>
            {logoutError}
          </AppText>
        )}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Access</Text>
      <Text style={styles.guestBody}>
        {isGuest
          ? "You're browsing as a guest. Sign in to save places and plan trips."
          : "Sign in to access your account."}
      </Text>
      <AppButton variant="primary" onPress={handleSignIn}>
        <Row gap="xs" align="center">
          <LogIn size={16} color="#fff" />
          {/* Not the label variant: that sets it in small, widely spaced capitals. */}
          <AppText style={styles.signInText}>Sign In / Create Account</AppText>
        </Row>
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: tokens.space.md, paddingVertical: 14 },
  // A section's name: small and grey, as written, a step under the rows it heads, with the
  // same gap under it in every group (design sweep, Profile round 3).
  sectionLabel: { fontSize: 13, fontWeight: "600", color: tokens.colors.textMuted },
  who: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  whoText: { flex: 1 },
  signedInAs: { fontSize: 14, color: tokens.colors.textMuted },
  signedInEmail: { fontSize: 20, lineHeight: 25, fontWeight: "700", letterSpacing: -0.2, color: tokens.colors.text },
  logoutRow: { paddingVertical: 4 },
  logoutText: { fontSize: 15, fontWeight: "600", color: tokens.colors.selected },
  errorText: { marginTop: 8 },
  guestBody: { fontSize: 15, color: tokens.colors.text2, lineHeight: 21, marginTop: 6, marginBottom: 14 },
  signInText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
