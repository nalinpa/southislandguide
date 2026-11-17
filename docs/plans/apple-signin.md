# Apple sign-in for the next build

Written 2026-11-15. Goal: Apple sign-in (and Google with it) in Kiwi Guide 1.3.

## Where it stands

- Apple's server still answers `invalid_client` for `app.blacksands.southislandguide` (checked 2026-11-15). Rotorua gets the normal `invalid_request`. Reported 2026-10-10 (FB25131402, forum thread 837986), no fix from Apple yet.
- Everything on our side is already built and in the 1.2 build: the Sign in with Apple capability, `expo-apple-authentication`, Google sign-in, the buttons (`components/auth/SocialSignInButtons.tsx`), and account deletion that cancels the Apple sign-in. The login screen just doesn't show the buttons (`app/(auth)/login.tsx`).
- Kiwi Guide's Sign in with Apple is grouped under Rotorua's App ID. That's the one thing not tried yet: give Kiwi Guide its own.

## The catch

The api (`enginev1/api`) signs its Apple calls with one key for every app (`APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`). That key belongs to Rotorua's App ID. Once Kiwi Guide is ungrouped, the key no longer covers it, so:

- at sign-in, storing the Apple token fails (the sign-in itself still works), and
- at account deletion, the Apple sign-in can't be cancelled, which Apple requires (guideline 5.1.1(v)).

So Kiwi Guide needs its own key, and the api needs to pick the key per app. Rotorua keeps the current one.

## Steps

### 1. Ungroup (you, Apple Developer site, 5 minutes)

1. On your phone, check Rotorua's Apple sign-in works, so there's a before.
2. developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → `app.blacksands.southislandguide`.
3. Sign In with Apple → Edit → **Enable as a primary App ID** → Save. If Apple's warning mentions Rotorua or existing users, stop and send me a screenshot.
4. Tell me it's done.

Apple may mark the app's provisioning profiles invalid after this. EAS makes new ones at the next build. Copies already on phones keep working.

### 2. Check (me, seconds)

Re-run the server check.

- **`invalid_request`:** fixed. Go on to step 3.
- **Still `invalid_client`:** ungrouping didn't help, and we wait for Apple. Steps 3 to 6 stay on hold. Leaving Kiwi Guide ungrouped does no harm.

Either way, check Rotorua's sign-in again on your phone.

### 3. Kiwi Guide's own key (you, 5 minutes)

1. Keys → + → name it "Kiwi Guide Sign in with Apple" → tick Sign in with Apple → Configure → primary App ID `app.blacksands.southislandguide` → Save → Register.
2. Download the `.p8` file (Apple lets you download it once). Keep it out of the repo and out of chat.
3. Send me the Key ID only (10 characters, shown on the key's page).

### 4. Api: a key per app (me, on your go)

- In `enginev1/api`: an app's `appleSignIn` config can name its own `keyId`. The api then signs with that key's secret, `APPLE_PRIVATE_KEY_<keyId>`. Apps without a `keyId` (Rotorua) keep using the current key. Tests for both.
- You add the secret yourself, pasting the `.p8` contents when asked: `npx wrangler secret put APPLE_PRIVATE_KEY_<keyId>` (from `enginev1/api`, PowerShell).
- Deploy the api, add the `keyId` to Kiwi Guide's app config, and clear the cached config list.

### 5. Show the buttons and test (me, then you)

1. On branch `1.3`: put `<SocialSignInButtons>` back on the login screen, above the email button (`login.tsx` says where). Apple's and Google's button colours follow their own rules, light and dark. Tests and typecheck.
2. Publish to the `development` update branch only. Check the runtime is 1.2's `236bed82`.
3. On your phone (1.2 dev build):
   - a fresh Apple sign-up, then sign out and sign in again
   - delete that account: the api log should show `POST …/auth/apple/link - Ok`, then `DELETE …/account - Ok`, and no "apple revoke skipped"
   - Google sign-in
   - Rotorua's Apple sign-in still works

### 6. Ship in 1.3 (on your go)

- Privacy labels in App Store Connect: add what Apple and Google sign-in share (name and email, linked to the account).
- Review notes: say the app now offers Apple and Google sign-in.
- One line in What's New.

## If ungrouping doesn't work

- **Wait for Apple** (recommended). Reports in the forum thread got fixed after anything from days to 8+ weeks, with no app change.
- **Sign in through a web page instead.** This uses a separate Apple sign-in ID (a Services ID), which goes around the broken App ID. It's more work, the sign-in opens a browser sheet instead of Apple's own pop-up, and it still needs step 4. Only worth it if the wait drags on.

## Your calls

1. OK to ungroup? It doesn't touch Rotorua's App ID or key, but they share the group today, so Rotorua gets checked before and after.
2. Ship in the 1.3 store build (recommended, what the launch plan said) or over the air to 1.2 once tested? Over the air works technically, since 1.2 has everything native.
3. Google together with Apple? Recommended. Google can't go out without Apple (guideline 4.8), and both are already built.
