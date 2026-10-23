# Fix: times after midnight read as AM, not "13:00 PM"

Finding 8 from the 2026-10-23 code review.

## Problem

`slotIndexToTimeLabel` (`lib/utils/itineraryPhysics.ts:24-31`) assumes the hour is under 24. The grid runs 8 AM to 10 PM (`MAX_GRID_SLOTS` 28). But the planner never drops a place, so a day that is already too full can run past slot 32. That happens with a trip saved before drive times, or before a time was raised. See the `ponytail:` note in `ItineraryDetailView.tsx:272-274`. Slot 32 then reads "12:00 PM", and slot 34 reads "13:00 PM". The labels appear on places and drive blocks (`DriveBlock.tsx:42`), and in the stored time labels of a trip made from a suggested trip (`CreateItineraryModal.tsx:196`).

## What to do

```ts
export function slotIndexToTimeLabel(slotIndex: number): string {
  const totalMinutes = 8 * 60 + slotIndex * 30;
  // Past midnight on a day that runs over: the next morning's hours.
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}
```

## Tests

`lib/utils/__tests__/itineraryPhysics.test.ts`, in `describe("slotIndexToTimeLabel")` (line 32): add one test. Slot 32 is "12:00 AM", and slot 34 is "1:00 AM". The three existing tests must pass unchanged.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all pass.
- Touch only those two files.
