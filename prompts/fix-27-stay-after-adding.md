# Fix: Adding a place to a trip keeps you where you were

Finding #27 from the 2026-10-20 UX sweep. Owner's choice (2026-10-20): stay on the place or map, and show "Added" with a way to open the trip.

## Files to change

1. `components/itinerary/AddToTripModal.tsx`
2. `components/itinerary/__tests__/addToTripModal.test.tsx`

Callers (`sites/[siteId]/index.tsx:300`, `map/index.tsx:449`) need no change: they already reset their own state in `onClose`.

## Problem

1. **Every add jumps to the trip.** After saving, the modal closes and pushes the trip screen on that day (`AddToTripModal.tsx:102-106`). Someone working through a town's list, adding five places, is sent to Trips five times and has to find their way back to Explore or the map each time.
2. **Days are just "Day 1", "Day 2"…** in the day picker (line 167), with no date or town. On a two-week trip it's hard to tell which day is Te Anau.

## What to do

### 1. A done state inside the modal

The modal is its own confirmation: no toast library, no new screen. After a successful save it shows what happened and two buttons.

- State: `const [added, setAdded] = useState<{ tripId: string; dayId: string; slot: number; dayLabel: string } | null>(null);`
- **Reset `added` only when a new site is handed in**, in its own effect: `useEffect(() => setAdded(null), [site]);`. Don't add it to the existing effect at lines 41–50. That one also re-runs whenever `itineraries` changes, and the save's own refetch changes it, which would wipe the done state the moment it appeared.
- In `handleAdd`, replace lines 102–106 (`onClose()` and the `router.push`) with:

```tsx
    const dayIndex = selectedTrip.days.findIndex((d) => d.id === dayId);
    setAdded({
      tripId: selectedTrip.id,
      dayId,
      slot: placedItem.slotIndex ?? 0,
      dayLabel: `Day ${dayIndex + 1} · ${dayDate(day.date)}`,
    });
```

- When `added` is set, render this in place of the form (inside the same `CardShell`, under the header):

```tsx
            {added ? (
              <View style={styles.done}>
                <Text style={styles.doneTitle}>Added</Text>
                <Text style={styles.doneBody}>
                  {site.name} is on {added.dayLabel}
                  {itineraries.length > 1 && selectedTrip ? ` of ${selectedTrip.title}` : ""}.
                </Text>
                <AppButton variant="primary" fullWidth onPress={onClose}>
                  Done
                </AppButton>
                <TouchableOpacity
                  style={styles.viewTrip}
                  accessibilityRole="button"
                  onPress={() => {
                    onClose();
                    router.push({
                      pathname: "/(app)/(tabs)/itinerary/[itineraryId]",
                      params: { itineraryId: added.tripId, jumpToDay: added.dayId, jumpToSlot: String(added.slot) },
                    });
                  }}
                >
                  <Text style={styles.viewTripText}>View Trip</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* the existing ScrollView with the form, unchanged */
            )}
```

  "Done" is the main action (staying is the point). "View Trip" is the quieter link, and it does exactly what the old jump did.

- Header title while done: keep "Add to Trip". The close X still closes.

### 2. Dates and towns on the day buttons

Each day button gets a second line: its date and, when it has places, the towns it covers. `tripSummary` already works out a day's towns (`lib/utils/itineraryPhysics.ts:175`), and `usePlaceLookup` (already used here) supplies `places`.

```tsx
  // Each day's towns, as the trip overview shows them, so a day can be told apart by more
  // than its number.
  const summary = useMemo(
    () => (selectedTrip && placesReady ? tripSummary(selectedTrip.days, places) : []),
    [selectedTrip, placesReady, places],
  );
```

Add `useMemo` to the React import. Import `tripSummary` from `@/lib/utils/itineraryPhysics` and `areaName` from `@/lib/areas`. The hook must sit above the `if (!site) return null` line, like the others.

A short date helper at the top of the file:

```tsx
const dayDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });
```

In the day pill (lines 161–169), under the existing `Day {idx + 1}` text, add:

```tsx
                        <Text style={[styles.pillSub, dayId === day.id && styles.pillTextActive]} numberOfLines={1}>
                          {dayDate(day.date)}
                          {summary[idx]?.areas.length ? ` · ${summary[idx].areas.map(areaName).join(" → ")}` : ""}
                        </Text>
```

`pillSub: { fontSize: 11, fontWeight: "500", color: tokens.colors.text2, marginTop: 2 }`.

Leave the `Day {idx + 1}` text as its own `Text`; tests find it by that exact string.

### Styles

```tsx
  done: { gap: tokens.space.sm, paddingTop: tokens.space.xs },
  doneTitle: { fontSize: 18, fontWeight: "800", color: tokens.colors.text },
  doneBody: { fontSize: 15, lineHeight: 22, color: tokens.colors.text2, marginBottom: tokens.space.sm },
  viewTrip: { alignSelf: "center", paddingVertical: 12, paddingHorizontal: tokens.space.md },
  viewTripText: { fontSize: 15, fontWeight: "700", color: tokens.colors.accent },
```

## Test impact

`addToTripModal.test.tsx`:

- **"opens the trip at the slot the stop actually landed in"** (lines 168–179) expects `router.push` and `onClose` right after "Add to Trip". It now becomes: press "Add to Trip", expect "Added", expect `router.push` **not** called; then press "View Trip" and expect the same `router.push` arguments as before, plus `onClose`.
- **"starts a day in a new area after the drive…"** (line 153) reads the landed slot from the `router.push` call (line 163). Press "View Trip" before that assertion, or read the slot from the saved days in the `saveItinerary` mock instead.
- **Add:** "stays put after adding": press "Add to Trip", expect "Added" and the day label (e.g. `getByText(/is on Day 1/)`), and expect `onClose` not to have been called. Then press "Done" and expect `onClose`.
- **Add:** "dates each day": `getByText` on the first day's date line (format it with the same `toLocaleDateString` call in the test to avoid hard-coding the weekday).
- "refuses a day with no room left…" (line 183) expects `onClose` not called. That's unchanged.

## Order

Do this before fix-24, which renames this modal's title. If fix-24 is already in, the header reads "Add to Trip" either way.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass.
- Device: on Explore, open a place, then "+ Add to Itinerary" (or "+ Add to Trip" after fix-24) → Add → "Added… Day 2 · Wed 14 Oct" → Done. You are still on the place. Repeat from the map's sheet. Use "View Trip" once and check it opens that day.
- Do not touch any file other than the two listed.
