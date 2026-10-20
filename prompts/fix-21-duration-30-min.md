# Fix: "30 min" everywhere, not "0.5 Hours"

Finding #21 from the 2026-10-20 UX sweep. Fix-6 fixed the Add to Trip modal's stepper inline, but the shared helper and its other callers still say "0.5 Hours".

## Files to change

1. `lib/utils/itineraryPhysics.ts`: the shared label helper
2. `components/itinerary/AddToTripModal.tsx`
3. `components/itinerary/EditItemModal.tsx`
4. `components/itinerary/ItineraryDetailView.tsx`
5. `lib/utils/__tests__/itineraryPhysics.test.ts`
6. `components/itinerary/__tests__/driveBlock.test.tsx`
7. `components/itinerary/__tests__/editItemModal.test.tsx`

## Problem

`slotsToDurationLabel` (`itineraryPhysics.ts:9-12`) turns one 30-minute slot into "0.5 Hours". It is the label for:

- a drive on the day timeline: `DriveBlock.tsx:43`, "About 0.5 Hours"
- the trip overview's driving total: `TripOverview.tsx:71`, "0.5 hours driving"
- a stop's stored `durationLabel`, written when a stop is edited (`ItineraryDetailView.tsx:556`) or made from a template (`CreateItineraryModal.tsx:120`)

Separately:

- The stop editor's own stepper builds the label inline and shows **"0.5 Hour"** (`EditItemModal.tsx:157-159`). That is the exact bug fix-6 fixed in the Add to Trip modal.
- The Add to Trip modal fixed its stepper inline (`AddToTripModal.tsx:194-198`) instead of in the helper. It also stores `durationLabel: ""` on every stop it adds (line 72).

The timeline block shows the **stored** label (`[item.timeLabel, item.durationLabel].join(" · ")` in the kit's TimelineBlock). So a stop added from a place shows no duration at all until it's edited, an edited one shows "1 Hour", and older trips still carry "0.5 Hours".

## What to do

### 1. The helper

```ts
export function slotsToDurationLabel(durationSlots: number): string {
  if (durationSlots === 1) return "30 min";
  const hours = durationSlots / 2;
  return `${hours} Hour${hours !== 1 ? "s" : ""}`;
}
```

Gives "30 min", "1 Hour", "1.5 Hours", "2 Hours". TripOverview lower-cases it: "30 min driving", "1.5 hours driving".

### 2. Both steppers use it

- `AddToTripModal.tsx` lines 193–199: the `Text` content becomes `{slotsToDurationLabel(durationSlots)}`. Import it from `@/lib/utils/itineraryPhysics` (the file already imports `tryEdit` from there). Also line 72: `durationLabel: slotsToDurationLabel(durationSlots),`
- `EditItemModal.tsx` lines 157–159: `{slotsToDurationLabel(draftDuration)}`, with the import added.

### 3. The timeline shows a label worked out from the stop's length

So stored labels, old or empty, no longer matter. In `ItineraryDetailView.tsx` (line 805), the `TimelineBlock` gets:

```tsx
                <components.TimelineBlock
                  // The label from the stop's length, not the one stored on it: stops added
                  // from a place store none, and older trips stored "0.5 Hours".
                  item={{ ...item, durationLabel: slotsToDurationLabel(item.durationSlots || 2) }}
```

`slotsToDurationLabel` is already imported there (line 39). `onEdit` hands that same object back to `setEditingItem`. It's the same stop with only the label changed, so the editor is unaffected.

## Test impact

- `itineraryPhysics.test.ts`: the "handles half-hour durations" case expects `"0.5 Hours"`. Change it to `"30 min"`, and add `slotsToDurationLabel(3)` → `"1.5 Hours"`.
- `driveBlock.test.tsx:26`: `"10:00 AM · About 0.5 Hours"` → `"10:00 AM · About 30 min"`.
- `editItemModal.test.tsx:116`: `stepper(view, "0.5 Hours")` → `stepper(view, "30 min")`. Read the test around it: if it steps down from "1 Hour" and looks for the half-hour label, the new label is "30 min".
- `addToTripModal.test.tsx` checks `"1 Hour"`, which is unchanged.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass.
- Do not touch any file other than the seven listed.
