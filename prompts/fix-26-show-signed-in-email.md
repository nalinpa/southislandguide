# Fix: Profile shows which account is signed in

Finding #26 from the 2026-10-20 UX sweep.

## File to change

`components/account/UserInfoCard.tsx`

## Problem

Signed in, the Profile tab shows trip and saved counts and a small "Sign Out" link (lines 35–48), but never *who* is signed in. Someone with two email accounts can't tell which one their trips are on, and has no check before signing out or deleting the account.

The session holds only the uid (`lib/providers/SessionProvider.tsx:9`, `{ status: "authed"; uid: string }`). The email is on the Firebase user, and this file already imports `auth` from `@/lib/firebase` (line 9).

## What to do

In the `isAuthed` branch, show the email above Sign Out:

```tsx
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
```

(the rest of the branch is unchanged). Styles:

```tsx
  signedInAs: { fontSize: 14, color: tokens.colors.text2, marginBottom: 10 },
  signedInEmail: { fontWeight: "600", color: tokens.colors.text },
```

## Test impact

No test renders `UserInfoCard` (the account screen's test stubs it). Nothing to update. It is a display-only line, so no new test is needed.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass.
- Do not touch any file other than `components/account/UserInfoCard.tsx`.
