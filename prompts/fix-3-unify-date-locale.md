# Fix: Unify the date formatting locale (en-US → en-NZ)

## Files to change

1. `lib/utils/formatDates.ts` — new shared utility
2. `components/account/ItinerariesCard.tsx` — remove local function, import shared
3. `app/(app)/(tabs)/itinerary/index.tsx` — remove local function, import shared

## Problem

`formatTripDates` is duplicated in two files with **different locales**:
- `ItinerariesCard.tsx` line 14 uses `"en-US"` → produces "Oct 1" (American format)
- `itinerary/index.tsx` line 19 uses `"en-NZ"` → produces "1 Oct" (NZ format)

This is a New Zealand travel app. The dates should use `"en-NZ"` everywhere, and the function should be defined once.

## Current code (for reference)

`components/account/ItinerariesCard.tsx` lines 12–17:
```tsx
function formatTripDates(startDate: string, endDate: string): string {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short" });
  if (!endDate || endDate === startDate) return fmt(startDate);
  return `${fmt(startDate)} — ${fmt(endDate)}`;
}
```

`app/(app)/(tabs)/itinerary/index.tsx` lines 17–22:
```tsx
function formatTripDates(startDate: string, endDate: string): string {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
  if (!endDate || endDate === startDate) return fmt(startDate);
  return `${fmt(startDate)} — ${fmt(endDate)}`;
}
```

## What to do

### 1. Create `lib/utils/formatDates.ts`

```tsx
export function formatTripDates(startDate: string, endDate: string): string {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
  if (!endDate || endDate === startDate) return fmt(startDate);
  return `${fmt(startDate)} — ${fmt(endDate)}`;
}
```

### 2. In `components/account/ItinerariesCard.tsx`

- Delete lines 12–17 (the local `formatTripDates` function).
- Add an import: `import { formatTripDates } from "@/lib/utils/formatDates";`
- The call site on line 50 (`{formatTripDates(itinerary.startDate, itinerary.endDate)}`) stays the same.
- This changes the locale from `"en-US"` to `"en-NZ"`, so dates will now read "1 Oct" instead of "Oct 1".

### 3. In `app/(app)/(tabs)/itinerary/index.tsx`

- Delete lines 17–22 (the local `formatTripDates` function).
- Add an import: `import { formatTripDates } from "@/lib/utils/formatDates";`
- The call site on line 128 (`{formatTripDates(itin.startDate, itin.endDate)}`) stays the same.
- This file already used `"en-NZ"`, so the output is unchanged.

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — all tests pass. The itinerary list test at `itineraryList.test.tsx:184` checks `1 Oct — 3 Oct · 3 days`, which already matches `"en-NZ"` output and will continue to pass.
- Check if any other file duplicates this function — if so, consolidate those too.
- Do not touch any file other than these three.