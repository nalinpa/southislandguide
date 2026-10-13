# Fix: Send guests to Explore instead of Map

## File to change

`app/(auth)/login.tsx`

## Problem

Line 55 sends guests to the Map tab:
```tsx
router.replace("/(app)/(tabs)/map");
```

But signed-in users go to the Explore tab (line 32):
```tsx
router.replace("/(app)/(tabs)/sites");
```

This creates two different first impressions. Guests land on a map with dots and a bottom sheet; signed-in users land on a curated list of places. The Explore tab (sites list) is the app's primary value proposition — it shows place names, descriptions, photos, and distances at a glance. That's a better first experience for everyone.

## Current code (for reference)

Lines 52–56:
```tsx
const handleGuestEntry = async () => {
  if (session.status !== "loggedOut" && session.status !== "guest") return;
  await enableGuest();
  router.replace("/(app)/(tabs)/map");
};
```

## What to do

Change line 55 from:
```tsx
    router.replace("/(app)/(tabs)/map");
```
To:
```tsx
    router.replace("/(app)/(tabs)/sites");
```

## Test impact

The test file `app/(auth)/__tests__/login.test.tsx` line 223 asserts:
```tsx
await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)/map"));
```

Change this to:
```tsx
await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)/sites"));
```

Update the test description on line 214 from:
```tsx
it("makes a first-time visitor a guest and, once they are one, drops them onto the map", async () => {
```
To:
```tsx
it("makes a first-time visitor a guest and, once they are one, drops them onto the Explore tab", async () => {
```

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — the updated login test passes; all other tests pass.
- Do not touch any file other than `app/(auth)/login.tsx` and `app/(auth)/__tests__/login.test.tsx`.