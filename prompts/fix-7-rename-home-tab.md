# Fix: Rename "Home" tab to "Profile"

## File to change

`app/(app)/(tabs)/_layout.tsx`

## Problem

Line 19 labels the account tab as `"Home"`:
```tsx
{ key: "account", title: "Home", icon: "home-outline", activeIcon: "home" },
```

But the screen at `app/(app)/(tabs)/account.tsx` is an account/profile screen — it shows sign out, trip stats, saved places, and a delete account option. Users expect "Home" to be the app's main landing (which is the Explore tab with the sites list). The icon should change too.

## Current code (for reference)

Lines 10–20:
```tsx
const ALL_TABS: Array<{
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "sites", title: "Explore", icon: "compass-outline", activeIcon: "compass" },
  { key: "itinerary", title: "Plans", icon: "calendar-outline", activeIcon: "calendar" },
  { key: "map", title: "Map", icon: "map-outline", activeIcon: "map" },
  { key: "account", title: "Home", icon: "home-outline", activeIcon: "home" },
];
```

## What to do

Change line 19 from:
```tsx
{ key: "account", title: "Home", icon: "home-outline", activeIcon: "home" },
```
To:
```tsx
{ key: "account", title: "Profile", icon: "person-outline", activeIcon: "person" },
```

This is a one-line change. The route key (`"account"`) stays the same — only the visible label and icon change.

## Test impact

The test file `app/(app)/(tabs)/__tests__/tabBar.test.tsx` uses the tab label text to find tabs. Line 40 checks:
```tsx
expect(view.getByText("Explore")).toHaveStyle({ color: tokens.colors.highlight });
```
This still passes (Explore is unchanged).

Line 48 checks the Map tab:
```tsx
expect(view.getByText("Map")).toHaveStyle({ color: tokens.colors.highlight });
```
This still passes.

No test currently asserts on the text "Home", so no test needs updating.

## Files that reference "Home" in comments

Several files mention "Home" in code comments referring to this tab:
- `app/(app)/(tabs)/guide/index.tsx:36` — `onPress` comment says "Back to Home"
- `app/(app)/(tabs)/guide/__tests__/guide.test.tsx:5-6` — comment says "Back from the index goes to the Home (account) tab"

Update the comment in `guide/index.tsx:36` from `"Back to Home"` to `"Back to Profile"`. Update `guide.test.tsx:5` from "Home (account)" to "Profile". The `accessibilityLabel` string in `guide/index.tsx:38` should change from `"Back to Home"` to `"Back to Profile"`, and the test assertion in `guide.test.tsx:138` from `getByLabelText("Back to Home")` to `getByLabelText("Back to Profile")`.

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — all tests pass (update any assertion that matches the old label).
- Do not touch any file other than those listed.