# Fix: Map search matches what Explore's search matches

Finding #30 from the 2026-10-20 UX sweep. Fix-12 widened Explore's search to descriptions and category labels; the map's search was left on names only.

## Files to change

1. `lib/models.ts`: one shared search rule
2. `app/(app)/(tabs)/sites/index.tsx`: Explore uses it
3. `app/(app)/(tabs)/map/index.tsx`: the map uses it
4. `app/(app)/(tabs)/map/__tests__/map.test.tsx`

## Problem

Explore (`sites/index.tsx:123-133`):

```tsx
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          !!l.description?.toLowerCase().includes(q) ||
          l.category.some((cat) => SITE_CATEGORY_LABELS[cat]?.toLowerCase().includes(q)),
      );
    }
```

Map (`map/index.tsx:105-107`):

```tsx
    const q = debouncedSearchQuery.trim().toLowerCase();
    return visibleSites
      .filter((s) => (!q || s.name.toLowerCase().includes(q)) && (!categoryFilter || s.category.includes(categoryFilter)))
```

"beach" or "food" finds places on Explore but nothing on the map.

## What to do

### 1. `lib/models.ts`: the rule, once

Next to `canAddToItinerary` (the other per-place rule both screens share):

```ts
// Whether a place answers a search: its name, its description, or one of its categories'
// labels as shown on the tabs ("food" finds "Food & Drink"). Explore and the map both
// search with this. A blank query matches everything.
export function matchesSearch(site: Pick<Site, "name" | "description" | "category">, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    site.name.toLowerCase().includes(q) ||
    !!site.description?.toLowerCase().includes(q) ||
    site.category.some((cat) => SITE_CATEGORY_LABELS[cat]?.toLowerCase().includes(q))
  );
}
```

### 2. Explore

Replace the comment and block at lines 123–133 with:

```tsx
    list = list.filter((l) => matchesSearch(l, searchQuery));
```

Add `matchesSearch` to the `@/lib/models` import on line 16. `SITE_CATEGORY_LABELS` is still used there for the tabs.

### 3. Map

Lines 105–107 become:

```tsx
    return visibleSites
      .filter((s) => matchesSearch(s, debouncedSearchQuery) && (!categoryFilter || s.category.includes(categoryFilter)))
```

Add `matchesSearch` to the `@/lib/models` import (line 20). The single-match auto-select effect (lines 117–121) is unchanged.

## Test impact

- Explore's search tests (`sitesList.test.tsx`, around lines 288–341 and 594–605) cover name, description and category matches, and must pass unchanged.
- `map.test.tsx`: add one test next to the existing search tests (lines 312–321). Type a word that appears only in a place's description, and expect that place's marker to remain while a non-matching place's marker goes. Assert the same way the "RIC" / "sumner" tests do.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass.
- Do not touch any file other than the four listed.
