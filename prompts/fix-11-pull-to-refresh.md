# Fix: Add pull-to-refresh to list screens

## Files to change

1. `components/sites/list/ListView.tsx` — Explore tab sites list
2. `app/(app)/(tabs)/itinerary/index.tsx` — Plans tab trip list

## Problem

No list screen in the app implements pull-to-refresh. Users expect to pull down on a list to refresh data, especially in a travel app where new places or updated info may be available. `RefreshControl` from `react-native` is not used anywhere in the codebase (confirmed by codebase search).

## What to do

### 1. `components/sites/list/ListView.tsx`

This component uses `FlashList` from `@shopify/flash-list`, which supports `refreshControl` as a prop.

**Add a new prop** to the component:
```tsx
type ListViewProps = {
  rows: ListRow[];
  header?: React.ReactElement | null;
  onPressItem: (id: string) => void;
  ListEmptyComponent?: React.ReactElement | null;
  /** Pull-to-refresh handler. Pass undefined to disable. */
  refreshControl?: React.ReactElement | null;
};
```

**Thread it through** to FlashList. Add after `ListEmptyComponent` in the FlashList props:
```tsx
refreshControl={refreshControl ?? undefined}
```

**In the caller** (`app/(app)/(tabs)/sites/index.tsx`), pass a `RefreshControl` to `ListView`. The `useLocations` hook from `hooksBag` returns `{ locations, loading, err, refetch }`. Check if `refetch` is available — if so:

```tsx
import { RefreshControl } from "react-native";

// Inside the component, where ListView is rendered:
<ListView
  rows={rows}
  header={header}
  onPressItem={(id) => router.push(`/(app)/(tabs)/sites/${id}`)}
  refreshControl={
    <RefreshControl
      refreshing={false}
      onRefresh={() => hooksBag.useLocations.refetch?.()}
      tintColor={tokens.colors.accent}
      colors={[tokens.colors.accent]}
    />
  }
/>
```

**Important:** Check what `hooksBag.useLocations()` actually returns. If it doesn't expose a `refetch`, you'll need to look at how locations are loaded and wire the refresh accordingly. The hook may use `@tanstack/react-query` which provides `refetch` automatically.

### 2. `app/(app)/(tabs)/itinerary/index.tsx`

This screen uses a `ScrollView` for the trip list (line 112). `ScrollView` accepts a `refreshControl` prop directly.

The `useItineraries()` hook returns `{ itineraries, loading, error, refetch }`. Add:

```tsx
import { RefreshControl } from "react-native";
```

And on the ScrollView:
```tsx
<ScrollView
  style={styles.body}
  contentContainerStyle={styles.scrollContent}
  showsVerticalScrollIndicator={false}
  refreshControl={
    <RefreshControl
      refreshing={loading}
      onRefresh={refetch}
      tintColor={tokens.colors.accent}
      colors={[tokens.colors.accent]}
    />
  }
>
```

### Styling notes

- `tintColor` (iOS) and `colors` (Android) use `tokens.colors.accent` (the teal `#095C65`), which is the app's brand colour for non-action elements.
- `refreshing` should be `false` for the sites list (FlashList handles its own spinner), or `loading` for the itinerary list (the ScrollView doesn't).

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — all tests pass.
- Do not touch any file other than those listed above.