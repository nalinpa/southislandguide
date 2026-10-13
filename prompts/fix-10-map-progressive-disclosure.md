# Fix: Reduce map screen overload with progressive disclosure

## File to change

`app/(app)/(tabs)/map/index.tsx`

## Problem

The map screen packs too much UI at once: search bar, filter button, category chips (always visible), floating map controls (layers + crosshair), premium banner, a 3-snap-point bottom sheet with selected site details, nearby sites list, AND today's itinerary carousel. The category chips are always visible even when no filter is active, taking up valuable map real estate.

## Current code (for reference)

The category chips are always rendered (lines 386–408 in the return JSX):
```tsx
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipRow}
              contentContainerStyle={{ gap: 8 }}
            >
              <TouchableOpacity
                style={[styles.chip, categoryFilter === null && styles.chipActive]}
                onPress={() => setCategoryFilter(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, categoryFilter === null && styles.chipTextActive]}>All</Text>
              </TouchableOpacity>
              {SITE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, categoryFilter === cat && styles.chipActive]}
                  onPress={() => setCategoryFilter(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, categoryFilter === cat && styles.chipTextActive]}>
                    {SITE_CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
```

The `showFilters` state (line 66) already exists:
```tsx
const [showFilters, setShowFilters] = useState(false);
```

And the filter button already toggles it (line 375):
```tsx
<TouchableOpacity
  style={[styles.filterBtn, (categoryFilter || showFilters) && styles.filterBtnActive]}
  onPress={() => setShowFilters((v) => !v)}
  ...
>
```

But `showFilters` only controls the filter button's highlight colour — the chip row renders unconditionally.

## What to do

Wrap the category chip `ScrollView` in a conditional on `showFilters`:

### Find the chip row

Locate the `<ScrollView horizontal ... style={styles.chipRow}>` block that renders the "All" chip and the `SITE_CATEGORIES.map(...)` chips.

### Wrap it in a conditional

Change from:
```tsx
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipRow}
              contentContainerStyle={{ gap: 8 }}
            >
              ...chips...
            </ScrollView>
```

To:
```tsx
            {showFilters && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipRow}
                contentContainerStyle={{ gap: 8 }}
              >
                ...chips...
              </ScrollView>
            )}
```

### Also: keep chips visible when a filter is active

The filter button already highlights when a filter is on (`categoryFilter || showFilters`). But if the user selects a filter and then the chips hide, they can't see what's selected or change it. So when a filter is active, keep the chips visible too:

```tsx
            {(showFilters || categoryFilter) && (
              <ScrollView ...>
                ...chips...
              </ScrollView>
            )}
```

### Behaviour summary

| State | Filter button | Chips visible |
|-------|--------------|---------------|
| No filter, filters closed | Teal (default) | Hidden |
| No filter, filters open | Orange (active) | Visible |
| Filter selected, filters closed | Orange (active) | Visible (shows selected chip) |
| Filter selected, filters open | Orange (active) | Visible |

## Test impact

The map test file `app/(app)/(tabs)/map/__tests__/map.test.tsx` has a `describe("search and filter")` block (around line 228) that tests filtering. It uses a helper to open the filter chips:
```tsx
const openFilters = async (view: RenderAPI) => {
  await fireEvent.press(view.getByLabelText("Filter by category"));
};
```

The tests already tap the filter button before interacting with chips, so they should continue to pass. If any test asserts that chips are visible on initial render without tapping the filter button, update it to tap the filter button first.

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — all tests pass.
- Do not touch any file other than `app/(app)/(tabs)/map/index.tsx` (and its test if needed).