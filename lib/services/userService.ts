import { client } from "@/lib/api";
import { auth } from "@/lib/firebase";

export const userService = {
  // Deletes server-side (DELETE /v1/southislandguide/account), not with
  // firebase/auth's deleteUser from the phone: only the server can revoke the
  // user's Sign in with Apple grant, which App Store guideline 5.1.1(v)
  // requires of any app offering Apple sign-in. The server revokes the stored
  // Apple refresh token (if any), then deletes the Firebase user.
  // Same as rotorua-guide/lib/services/userService.ts.
  async deleteAccount(): Promise<void> {
    await client.auth.deleteAccount();
    // Server-side delete doesn't touch the local SDK session, so sign out
    // explicitly or the user stays "authed" client-side until token refresh.
    await auth.signOut();
  },
};
