# Fix: Make the Guide more discoverable

## Files to change

1. `app/(app)/(tabs)/sites/index.tsx` — add a Guide shortcut in the TopBar
2. `app/(app)/(tabs)/sites/__tests__/sitesList.test.tsx` — update test if it asserts on TopBar actions

## Problem

The Guide has 13 well-written articles (206–461 words each) but it's only reachable from the Home/Profile tab's "Open Guide" hero button. This is one of the app's richest features, yet most users will browse the Explore tab and never discover it.

## Current code (for reference)

`sites/index.tsx` lines 85–139 builds the TopBar with a search icon and saved-places icon as actions. The Guide is not mentioned anywhere on this screen.

The current TopBar actions (lines 118–131):
```tsx
      actions={
        <>
          <AppIconButton
            icon={Bookmark}
            variant="control"
            onPress={() => router.push("/(app)/saved-sites")}
            accessibilityLabel="Saved Places"
          />
          <AppIconButton
            icon={searchOpen ? X : Search}
            variant="control"
            onPress={() => {
              setSearchOpen((o) => !o);
              if (searchOpen) setSearchQuery("");
            }}
            accessibilityLabel={searchOpen ? "Close search" : "Search places"}
          />
        </>
      }
```

## What to do

Add a `BookOpen` icon button (from `lucide-react-native`) to the TopBar actions that navigates to the Guide. Place it before the Bookmark icon so the order reads: Guide → Saved → Search (left to right, least to most used).

### 1. Update the import on line 4

Add `BookOpen` to the lucide-react-native import:
```tsx
import { Bookmark, BookOpen, ChevronRight, Search, X } from "lucide-react-native";
```

### 2. Add the Guide button to the TopBar actions

Insert a new `AppIconButton` before the Bookmark button:
```tsx
          <AppIconButton
            icon={BookOpen}
            variant="control"
            onPress={() => router.push("/(app)/(tabs)/guide")}
            accessibilityLabel="Travel Guide"
          />
```

### 3. Update the comment on line 15

The comment at line 15–18 says:
```
// ponytail: the generator's GAP list, resolved for this app.
// - saved-places shortcut: DONE, routes to app/(app)/saved-sites.tsx
// - category-filter tabs: DONE...
```

Add a line after "saved-places shortcut":
```
// - guide shortcut: DONE, routes to app/(app)/(tabs)/guide from the TopBar.
```

## Why BookOpen?

`lucide-react-native` has `BookOpen` (an open book icon) which visually communicates "reading material" without overlapping with the bookmark icon already used for saved places.

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — all tests pass. If the sites list test asserts on the exact number of TopBar buttons, update the count.
- Do not touch any file other than `app/(app)/(tabs)/sites/index.tsx` (and its test if needed).