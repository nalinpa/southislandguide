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
    try {
      await client.auth.deleteAccount();
    } catch (e) {
      // A delete that timed out after the server finished leaves the account gone. Retrying
      // can't succeed (the api's own Auth delete then fails with a 500 while the old token is
      // still valid), so ask Firebase whether the account still exists and finish if not.
      if (!(await accountIsGone())) throw e;
    }
    // The account is gone from here on, so nothing below may fail the delete.
    // Server-side delete doesn't touch the local SDK session, so sign out
    // explicitly or the user stays "authed" client-side until token refresh.
    // Before the clearing below: signed out, no screen refetches the deleted account's data.
    try {
      await auth.signOut();
    } catch (e) {
      Sentry.captureException(e);
    }
    clearLocalUserData(uid);
  },
};

// True when Firebase no longer has the signed-in account. reload() looks it up with the
// user's token: a deleted account answers user-not-found, or user-token-expired once the
// old token can't be refreshed. Any other failure (offline, say) proves nothing.
async function accountIsGone(): Promise<boolean> {
  try {
    await auth.currentUser?.reload();
    return false;
  } catch (e) {
    const code = (e as { code?: string }).code;
    return code === "auth/user-not-found" || code === "auth/user-token-expired";
  }
}

// What an account leaves on the phone, cleared when it signs out or is deleted. Its trips,
// saved places and reviews were saved with the cache (every key holds the uid), and trip
// writes may be waiting for signal: left queued, they'd send with the next account's token
// and land in that account. The saved copy follows the cache. Unsent review drafts are kept
// by place, not by user, so the next account to sign in here would find them.
// Call it after auth.signOut(): before, a screen still signed in could refetch the data
// straight back into the cache.
export function clearLocalUserData(uid: string | undefined) {
  if (uid) queryClient.removeQueries({ predicate: (q) => q.queryKey.includes(uid) });
  queryClient.getMutationCache().clear();
  hooksBag.useDraftsStore.setState({ drafts: {} });
}
