# Fix: Add press feedback to the tab bar

## File to change

`app/(app)/(tabs)/_layout.tsx`

## Problem

The tab bar's `Pressable` (line 65) has no visual feedback when the user presses it. There is no opacity change, scale animation, or any other indication that the tap was received — the icon and label only change after navigation completes. This makes the tab bar feel unresponsive.

## Current code (for reference)

Lines 64–83 (the Pressable inside the `.map`):
```tsx
          <Pressable
            key={t.key}
            onPress={() => onSelect(t.key)}
            // The highlight marks "you are here" on every screen.
            style={[styles.tab, isActive && { backgroundColor: tokens.colors.highlightDim }]}
          >
            <Ionicons
              name={isActive ? t.activeIcon : t.icon}
              size={24}
              color={isActive ? tokens.colors.highlight : tokens.colors.text2}
            />
            <AppText
              variant="label"
              style={[styles.tabLabel, { color: isActive ? tokens.colors.highlight : tokens.colors.text2 }]}
            >
              {t.title}
            </AppText>
          </Pressable>
```

Lines 100–119 (the StyleSheet):
```tsx
const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 14,
    marginHorizontal: 4,
  },
  tabLabel: {
    fontSize: 10,
  },
});
```

## What to do

This is a 4-line change.

### 1. Change the `style` prop to use the function form

React Native's `Pressable` passes a `{ pressed: boolean }` object to its `style` prop when it's a function. Change line 69 from:

```tsx
            style={[styles.tab, isActive && { backgroundColor: tokens.colors.highlightDim }]}
```

To:

```tsx
            style={({ pressed }) => [
              styles.tab,
              isActive && { backgroundColor: tokens.colors.highlightDim },
              pressed && styles.tabPressed,
            ]}
```

### 2. Add the `tabPressed` style

Add this entry to the `StyleSheet.create` block, after `tabLabel`:

```tsx
  tabPressed: {
    opacity: 0.6,
  },
```

That's it. `opacity: 0.6` matches the `activeOpacity={0.6}` used on every `TouchableOpacity` in the codebase (ListItem, itinerary cards, guide rows, saved sites).

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — all tests pass.
- Do not touch any file other than `app/(app)/(tabs)/_layout.tsx`.