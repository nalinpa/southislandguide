# Fix: "0.5 Hour" duration display in the Add to Trip modal

## File to change

`components/itinerary/AddToTripModal.tsx`

## Problem

The duration stepper on line 186 renders:

```tsx
{durationSlots / 2} {durationSlots === 2 ? "Hour" : "Hours"}
```

Each `durationSlot` represents 30 minutes. When `durationSlots` is `1` (the minimum, set by the minus button at line 181), this produces **"0.5 Hour"** — technically correct but unnatural. Users think in "30 min", not fractions of an hour.

The default value is `2` (set on line 36), which produces "1 Hour" — correct. The bug only shows when the user taps the minus button once.

## Current code (for reference)

Lines 180–192 (the stepper row):
```tsx
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setDurationSlots((n) => Math.max(1, n - 1))}>
                  <Minus color={tokens.colors.accent} size={20} />
                </TouchableOpacity>
                <View style={styles.stepCenter}>
                  <Text style={styles.durationText}>
                    {durationSlots / 2} {durationSlots === 2 ? "Hour" : "Hours"}
                  </Text>
                </View>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setDurationSlots((n) => Math.min(PLANNER.MAX_GRID_SLOTS, n + 1))}>
                  <Plus color={tokens.colors.accent} size={20} />
                </TouchableOpacity>
              </View>
```

## What to do

Replace lines 185–187 (the Text content inside `stepCenter`) with a ternary that handles all cases naturally:

```tsx
                  <Text style={styles.durationText}>
                    {durationSlots === 1
                      ? "30 min"
                      : durationSlots === 2
                        ? "1 Hour"
                        : `${durationSlots / 2} Hours`}
                  </Text>
```

This produces:
| `durationSlots` | Display |
|---|---|
| 1 | "30 min" |
| 2 | "1 Hour" |
| 3 | "1.5 Hours" |
| 4 | "2 Hours" |
| 5 | "2.5 Hours" |
| ... | ... |

## Test impact

The existing test in `components/itinerary/__tests__/addToTripModal.test.tsx` line 114 checks:
```tsx
expect(view.getByText("1 Hour")).toBeTruthy();
```
This still passes because the default `durationSlots` is `2`, which renders "1 Hour".

No new test is needed — the existing test pins the default case, and the other cases are pure display formatting with no side effects.

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — all tests pass (especially `addToTripModal.test.tsx`).
- Do not touch any file other than `components/itinerary/AddToTripModal.tsx`.