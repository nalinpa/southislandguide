# Fix: Screen-reader roles and labels

Finding #31 from the 2026-10-20 UX sweep. iOS only (Android isn't a target), so VoiceOver is the reader to check with.

## Files to change

1. `app/(app)/(tabs)/_layout.tsx`: tab bar
2. `app/(app)/(tabs)/sites/index.tsx`: search toggle
3. `app/(app)/(tabs)/sites/[siteId]/index.tsx`: back button
4. `components/itinerary/AddToTripModal.tsx`
5. `components/itinerary/CreateItineraryModal.tsx`
6. `components/itinerary/EditItemModal.tsx`
7. `components/itinerary/ItineraryDetailView.tsx`: day tabs and trip menu
8. `components/map/MapOverlay.tsx`
9. `app/(app)/(tabs)/__tests__/tabBar.test.tsx`
10. `app/(app)/(tabs)/sites/__tests__/sitesList.test.tsx`

## Problem

VoiceOver reads several controls as bare text or as an unnamed "button". It can't tell which tab is current, and a few icon-only buttons have no name at all. Every change below is a prop on an existing element: no layout, style or behaviour changes.

## What to do

### Tab bar: `_layout.tsx`

- The bar's `View` (line 48): `accessibilityRole="tablist"`.
- Each tab's `Pressable` (line 65):
  ```tsx
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={t.title}
  ```

### Explore's search toggle: `sites/index.tsx`, lines 197–205

The button turns into an X while search is open, but its label stays "Search Locations". Make it:

```tsx
            accessibilityLabel={searchOpen ? "Close search" : "Search Locations"}
```

Keep "Search Locations" for the closed state; the place/Location wording is finding #24, decided separately.

### Place screen back button: `sites/[siteId]/index.tsx`, line 246

The `Pressable` has neither role nor label. Add `accessibilityRole="button"` and `accessibilityLabel="Back"`.

### Modals

| File | Element | Add |
|---|---|---|
| `AddToTripModal.tsx:116` | close X | `accessibilityRole="button" accessibilityLabel="Close"` |
| `AddToTripModal.tsx:189` / `:201` | duration − / + | `accessibilityRole="button"`, labels `"Shorter"` / `"Longer"` |
| `CreateItineraryModal.tsx:150` | close X | `accessibilityRole="button" accessibilityLabel="Close"` |
| `EditItemModal.tsx:134` | close X | `accessibilityRole="button" accessibilityLabel="Close"` |
| `EditItemModal.tsx:144` | "Details" link | `accessibilityRole="button" accessibilityLabel="View place details"` |
| `EditItemModal.tsx:154` / `:160` | duration − / + | `accessibilityRole="button"`, labels `"Shorter"` / `"Longer"` |

`CreateItineraryModal` already labels its day stepper "Fewer days" / "More days" (lines 363–378). Follow that pattern.

### Trip screen: `ItineraryDetailView.tsx`

- Day tab `TouchableOpacity` (line 722):
  ```tsx
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Day ${index + 1}, ${formatDayDate(day.date)}`}
  ```
- Its delete X (line 740): `accessibilityRole="button" accessibilityLabel={`Delete Day ${index + 1}`}`
- Add Day (line 754): `accessibilityRole="button"` (its text is the label).
- Trip menu rows "Switch Trip" (line 906) and "Delete Trip" (line 917): `accessibilityRole="button"`.

### Map sheet: `MapOverlay.tsx`

- The place-name `Pressable`s that focus the map (lines 153 and 178): `accessibilityRole="button"` and `accessibilityLabel={`Show ${site.name} on the map`}`.
- "View Details" (line 160): `accessibilityRole="button"`. The other Details button already has one.
- Today's plan cards (line 264): `accessibilityRole="button"`, `accessibilityLabel={`${item.timeLabel}, ${item.siteName}`}`.
- Nearby rows (line 311): `accessibilityRole="button"`, `accessibilityLabel={`${nearby.name}, ${formatDistanceMeters(nearby.distanceMeters)}`}`.

### Skipped, on purpose

The Saved Places list removes a place only by swiping (`saved-sites.tsx:36-53`), which VoiceOver can't do. A VoiceOver user can still unsave from the place's heart. A custom accessibility action on each row would need a pass-through prop on `ListItem`; add that only if someone asks.

## Test impact

- `sitesList.test.tsx:339` presses `getByLabelText("Search Locations")` to *close* search. It is now `getByLabelText("Close search")`. Check the other search tests: a second press of the toggle while open becomes `"Close search"`, and a first press stays `"Search Locations"`.
- `tabBar.test.tsx`: add one test asserting `getByRole("tab", { name: "Explore", selected: true })` exists with index 0, and that `getByRole("tab", { name: "Map" })` is not selected.
- Map, trip and modal tests query by text and testID, so labels on parents don't break them. Run the suite to confirm.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass.
- Device: VoiceOver on, swipe across the tab bar ("Explore, tab, selected, 1 of 4"), the place screen's back button ("Back, button"), and a trip's day tabs.
- Do not touch any file other than the ten listed.
