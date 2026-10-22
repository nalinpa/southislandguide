// components/account/UserInfoCard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { LogIn, LogOut } from "lucide-react-native";

import { AppButton, AppText, Row } from "@/lib/uiKit";
import { useSession } from "@/lib/providers/SessionProvider";
import { auth } from "@/lib/firebase";
import { tokens } from "@/lib/ui/tokens";

export function UserInfoCard() {
  const { session, disableGuest } = useSession();
  const isAuthed = session.status === "authed";
  const isGuest = session.status === "guest";

  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await disableGuest();
      await auth.signOut();
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
        {email ? (
          <Text style={styles.signedInAs} numberOfLines={1}>
            Signed in as <Text style={styles.signedInEmail}>{email}</Text>
          </Text>
        ) : null}
        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.6}>
          <LogOut size={14} color={tokens.colors.text2} strokeWidth={2} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
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
  section: {
    paddingHorizontal: tokens.space.md,
    paddingVertical: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: tokens.colors.text2,
    marginBottom: 12,
  },
  signedInAs: { fontSize: 14, color: tokens.colors.text2, marginBottom: 10 },
  signedInEmail: { fontWeight: "600", color: tokens.colors.text },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 4,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "500",
    color: tokens.colors.text2,
    letterSpacing: 0.3,
  },
  errorText: {
    marginTop: 8,
  },
  guestBody: {
    fontSize: 15,
    fontWeight: "400",
    color: tokens.colors.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  signInText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
