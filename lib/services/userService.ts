import { client } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { hooksBag } from "@/lib/hooksBag";
import { queryClient } from "@/lib/providers/AppProviders";
import * as Sentry from "@sentry/react-native";

export const userService = {
  // Deletes server-side (DELETE /v1/southislandguide/account), not with
  // firebase/auth's deleteUser from the phone: only the server can revoke the
  // user's Sign in with Apple grant, which App Store guideline 5.1.1(v)
  // requires of any app offering Apple sign-in. The server deletes the user's
  // trips, saved places and reviews, revokes the stored Apple refresh token
  // (if any), then deletes the Firebase user.
  // Same as rotorua-guide/lib/services/userService.ts.
  async deleteAccount(): Promise<void> {
    const uid = auth.currentUser?.uid;
    await client.auth.deleteAccount();
    // The account is gone from here on, so nothing below may fail the delete.
    // Server-side delete doesn't touch the local SDK session, so sign out
    // explicitly or the user stays "authed" client-side until token refresh.
    // Before the clearing below: signed out, no screen refetches the deleted account's data.
    try {
      await auth.signOut();
    } catch (e) {
      Sentry.captureException(e);
    }
    // What the account left on the phone. Its trips, saved places and reviews were saved with
    // the cache (every key holds the uid), and trip writes may be waiting for signal: the saved
    // copy follows the cache. Unsent review drafts are kept by place, not by user, so the next
    // account to sign in here would find them.
    if (uid) queryClient.removeQueries({ predicate: (q) => q.queryKey.includes(uid) });
    queryClient.getMutationCache().clear();
    hooksBag.useDraftsStore.setState({ drafts: {} });
  },
};
