# Fix: Expand search to match descriptions and categories

## File to change

`app/(app)/(tabs)/sites/index.tsx`

## Problem

The search filter on lines 52–55 only matches place names:
```tsx
if (searchQuery.trim()) {
  const q = searchQuery.trim().toLowerCase();
  list = list.filter((l) => l.name.toLowerCase().includes(q));
}
```

A user searching "beach", "hike", or "restaurant" finds nothing unless the place name contains that exact word. The `Site` model has `description` and `category` fields that should also be searched.

## Current code (for reference)

Lines 49–57:
```tsx
const filteredLocations = useMemo(() => {
  let list = activeLocations;
  if (category) list = list.filter((l) => l.category.includes(category));
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter((l) => l.name.toLowerCase().includes(q));
  }
  return list;
}, [activeLocations, category, searchQuery]);
```

The `Site` model has:
- `name: string`
- `description?: string | null`
- `category: SiteCategory[]`

And `SITE_CATEGORY_LABELS` maps category IDs to display labels (e.g. `"Food"` → `"Food & Drink"`).

## What to do

Expand the search filter to also match against description text and category labels.

Replace the search block (lines 52–55) with:
```tsx
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter((l) => {
      if (l.name.toLowerCase().includes(q)) return true;
      if (l.description?.toLowerCase().includes(q)) return true;
      // Match category labels: "food" matches "Food & Drink", "walk" matches "Walks"
      return l.category.some((cat) =>
        SITE_CATEGORY_LABELS[cat].toLowerCase().includes(q)
      );
    });
  }
```

### Why this approach

- **Name first** — cheapest check, most common match.
- **Description second** — catches "beach", "waterfall", "hiking trail" etc.
- **Category labels last** — catches "food", "walk", "adventure" etc. Using the display labels (not raw IDs) means users can type what they see on the category tabs.
- **`some()`** for categories — a place can have multiple categories; matching any one is enough.

## Test impact

If the sites list test has assertions like "searching 'xyz' returns N results", those may now return more results because descriptions and categories are also matched. Review the test fixtures and update expected counts if needed.

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — all tests pass.
- Do not touch any file other than `app/(app)/(tabs)/sites/index.tsx` (and its test if needed).